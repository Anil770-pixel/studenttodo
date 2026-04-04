/**
 * ============================================================
 * AiSuggestionBox — AI-powered "Next Best Action" Engine
 * ============================================================
 * Uses Groq LLM to analyze the student's tasks/calendar and
 * suggest a concrete 20-minute next step. Rate-limited to
 * prevent API abuse. Handles ERR_429_RATE_LIMIT and
 * ERR_500_AI_FAIL gracefully with friendly messages.
 * ============================================================
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Loader2, RefreshCw, Zap, Youtube, BookOpen, AlertCircle, Clock } from 'lucide-react';
import { getGroqCompletion, parseGroqJSON } from '../lib/groq';
import { safeCall, checkRateLimit, ERROR_CODES } from '../lib/errorHandler';
import { useAuth } from '../context/AuthContext';
import { collection, query, limit, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

// ─── Rate limit config: 15 seconds between suggestions ────────────────────────
const RATE_LIMIT_KEY = 'ai_suggestion_box';
const RATE_LIMIT_MS = 15000;

// ─── Suggestion type icons ─────────────────────────────────────────────────────
const typeIcons = {
    youtube: <Youtube size={16} className="text-red-400" />,
    study: <BookOpen size={16} className="text-blue-400" />,
    task: <Zap size={16} className="text-yellow-400" />,
};

const AiSuggestionBox = () => {
    const { user, profile } = useAuth();
    const [loading, setLoading] = useState(false);
    const [suggestion, setSuggestion] = useState(null);
    const [errorMsg, setErrorMsg] = useState(null);
    const [rateLimited, setRateLimited] = useState(false);

    // ─── Fetch suggestion from Groq ───────────────────────────────────────────
    const getSuggestion = useCallback(async () => {
        // 1. Check rate limit first
        if (!checkRateLimit(RATE_LIMIT_KEY, RATE_LIMIT_MS)) {
            setRateLimited(true);
            setErrorMsg('⏳ Wait a moment before asking again.');
            setTimeout(() => { setRateLimited(false); setErrorMsg(null); }, RATE_LIMIT_MS);
            return;
        }

        if (!user) return;
        setLoading(true);
        setErrorMsg(null);
        setSuggestion(null);

        // 2. Fetch recent tasks from Firestore for context
        const { data: tasks } = await safeCall(async () => {
            const tasksRef = collection(db, 'users', user.uid, 'tasks');
            const snap = await getDocs(query(tasksRef, limit(10)));
            return snap.docs.map(d => ({ ...d.data() }));
        });

        const pendingTasks = (tasks || [])
            .filter(t => !t.completed)
            .slice(0, 5)
            .map(t => t.title)
            .join(', ') || 'General studying';

        const branch = profile?.branch || 'Engineering';

        // 3. Build prompt
        const prompt = `
You are StudentOS's AI Suggestion Engine. A student (branch: ${branch}) has these pending tasks: ${pendingTasks}.

Analyze the tasks and respond with a SINGLE next best 20-minute action.

Output ONLY this JSON:
{
  "headline": "Short catchy action title (max 8 words)",
  "description": "One specific sentence explaining WHAT to do and WHY",
  "type": "youtube | study | task",
  "youtube_query": "exact YouTube search query if type is youtube, else null",
  "duration": "20 min",
  "topic": "Subject or skill name"
}
`;

        // 4. Call AI safely (handles ERR_500_AI_FAIL internally)
        const { data: completion, error } = await safeCall(
            () => getGroqCompletion(prompt),
            ERROR_CODES.AI_FAIL
        );

        if (error) {
            setErrorMsg(error.userMessage);
            setLoading(false);
            return;
        }

        // 5. Parse response
        try {
            const content = completion?.choices?.[0]?.message?.content || '{}';
            const parsed = parseGroqJSON(content);
            setSuggestion(parsed);
        } catch {
            setErrorMsg('🤖 AI is resting right now. Try again in a few seconds.');
        }

        setLoading(false);
    }, [user, profile]);

    // ─── Build YouTube link ────────────────────────────────────────────────────
    const youtubeLink = suggestion?.youtube_query
        ? `https://www.youtube.com/results?search_query=${encodeURIComponent(suggestion.youtube_query)}`
        : null;

    return (
        <div className="relative rounded-2xl overflow-hidden border border-indigo-500/20 bg-gradient-to-br from-indigo-950/60 to-slate-900/80 backdrop-blur-sm">
            {/* Glow effect */}
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="p-5">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-indigo-500/15 rounded-xl border border-indigo-500/20">
                            <Sparkles size={18} className="text-indigo-400" />
                        </div>
                        <div>
                            <h3 className="text-white font-bold text-sm">AI Suggestion Engine</h3>
                            <p className="text-slate-500 text-xs">Your next best 20-min action</p>
                        </div>
                    </div>

                    <button
                        onClick={getSuggestion}
                        disabled={loading || rateLimited || !user}
                        title={rateLimited ? 'Rate limited — wait a moment' : 'Get AI suggestion'}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-white text-xs font-semibold transition-all"
                    >
                        {loading
                            ? <Loader2 size={13} className="animate-spin" />
                            : <RefreshCw size={13} />
                        }
                        <span>{suggestion ? 'Refresh' : 'Suggest'}</span>
                    </button>
                </div>

                {/* States */}
                <AnimatePresence mode="wait">

                    {/* Error state */}
                    {errorMsg && !loading && (
                        <motion.div
                            key="error"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="flex items-center gap-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-300 text-sm"
                        >
                            <AlertCircle size={16} className="flex-shrink-0" />
                            <span>{errorMsg}</span>
                        </motion.div>
                    )}

                    {/* Loading state */}
                    {loading && (
                        <motion.div
                            key="loading"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex flex-col items-center justify-center py-6 gap-3"
                        >
                            <Loader2 size={28} className="text-indigo-400 animate-spin" />
                            <p className="text-slate-400 text-sm animate-pulse">Analyzing your tasks...</p>
                        </motion.div>
                    )}

                    {/* Empty / initial state */}
                    {!suggestion && !loading && !errorMsg && (
                        <motion.div
                            key="empty"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex flex-col items-center justify-center py-6 gap-2 text-center"
                        >
                            <Sparkles size={32} className="text-slate-700" />
                            <p className="text-slate-500 text-sm">Click <strong className="text-slate-400">Suggest</strong> to get your AI-powered next step</p>
                        </motion.div>
                    )}

                    {/* Suggestion result */}
                    {suggestion && !loading && (
                        <motion.div
                            key="suggestion"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-3"
                        >
                            {/* Headline */}
                            <div className="flex items-start gap-2">
                                {typeIcons[suggestion.type] || typeIcons.study}
                                <h4 className="text-white font-bold text-base leading-snug">{suggestion.headline}</h4>
                            </div>

                            {/* Description */}
                            <p className="text-slate-300 text-sm leading-relaxed">{suggestion.description}</p>

                            {/* Meta tags */}
                            <div className="flex items-center gap-2 flex-wrap">
                                {suggestion.topic && (
                                    <span className="text-xs px-2.5 py-1 bg-white/5 text-slate-400 rounded-full border border-white/8">
                                        {suggestion.topic}
                                    </span>
                                )}
                                <span className="flex items-center gap-1 text-xs px-2.5 py-1 bg-indigo-500/10 text-indigo-300 rounded-full border border-indigo-500/20">
                                    <Clock size={10} />
                                    {suggestion.duration || '20 min'}
                                </span>
                            </div>

                            {/* CTA button — YouTube or Start */}
                            {youtubeLink ? (
                                <a
                                    href={youtubeLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-center gap-2 w-full py-2.5 bg-red-600/20 hover:bg-red-600/30 border border-red-600/30 text-red-300 rounded-xl text-sm font-semibold transition-all"
                                >
                                    <Youtube size={15} />
                                    Open YouTube Roadmap
                                </a>
                            ) : (
                                <div className="flex items-center justify-center gap-2 w-full py-2.5 bg-indigo-600/20 border border-indigo-600/30 text-indigo-300 rounded-xl text-sm font-semibold">
                                    <Zap size={14} />
                                    Start 20-min Focus Session
                                </div>
                            )}
                        </motion.div>
                    )}

                </AnimatePresence>
            </div>
        </div>
    );
};

export default AiSuggestionBox;
