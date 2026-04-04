import React, { useState, useEffect, useRef } from 'react';
import { getGroqCompletion, parseGroqJSON, breakdownProject } from '../lib/groq';
import { withCache } from '../lib/communityCache';
import { useTokens } from '../context/TokenContext';
import {
    Bot, Send, Calendar as CalendarIcon, Loader2, Sparkles, User,
    CheckCircle, Trash2, Brain, ChevronDown, ChevronRight, Zap, Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useChat } from '../context/ChatContext';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, query, where, orderBy, limit, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';

const AIPlanner = () => {
    const { messages, setMessages, clearChat: resetContextChat } = useChat();
    const { user, profile } = useAuth();
    const { spendTokens, TOKEN_COSTS, balance } = useTokens();
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [userDomain, setUserDomain] = useState('General Studies');
    const [toast, setToast] = useState(null);
    const messagesEndRef = useRef(null);

    // ── Anti-Overwhelm Mode ───────────────────────────────────────────────────
    const [mode, setMode] = useState('chat');        // 'chat' | 'overwhelm'
    const [aoProject, setAoProject] = useState('');
    const [aoDeadline, setAoDeadline] = useState('');
    const [aoHours, setAoHours] = useState(2);
    const [aoLoading, setAoLoading] = useState(false);
    const [aoPlan, setAoPlan] = useState(null);          // breakdown result
    const [aoFromCache, setAoFromCache] = useState(false);
    const [aoExpandedDay, setAoExpandedDay] = useState(0);             // which day is open

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Set domain from profile
    useEffect(() => {
        if (profile?.branch) {
            setUserDomain(profile.branch);
        } else if (profile?.department) {
            setUserDomain(profile.department);
        }
    }, [profile]);

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const clearChat = () => {
        resetContextChat();
        showToast('Chat history cleared', 'success');
    };

    // ── Anti-Overwhelm breakdown handler ─────────────────────────────────────
    const handleBreakdown = async (e) => {
        e.preventDefault();
        if (!aoProject.trim() || !aoDeadline) return;
        setAoLoading(true);
        setAoPlan(null);

        const cacheKey = `breakdown:${aoProject.toLowerCase().trim()}:${aoDeadline}:${aoHours}h`;

        try {
            const { result, fromCache } = await withCache(
                cacheKey,
                () => breakdownProject(aoProject, aoDeadline, aoHours),
                { spendTokens, tokenCost: TOKEN_COSTS?.AI_SCHEDULE || 3 }
            );
            setAoPlan(result);
            setAoFromCache(fromCache);
            setAoExpandedDay(0);
            if (!fromCache) showToast(`Plan generated & cached for future students! ⚡`, 'success');
            else showToast(`Loaded from community cache — 0 tokens used! 🟢`, 'success');
        } catch (err) {
            if (err.message === 'INSUFFICIENT_TOKENS') {
                showToast(`Not enough tokens! You need ${TOKEN_COSTS?.AI_SCHEDULE || 3} tokens.`, 'error');
            } else {
                showToast('Something went wrong. Try again.', 'error');
                console.error(err);
            }
        } finally {
            setAoLoading(false);
        }
    };

    const handleSend = async () => {
        if (!input.trim() || !user) return;

        // ── Deduct tokens before calling AI ──────────────────────────────────
        const cost = TOKEN_COSTS?.AI_SCHEDULE || 3;
        const ok = await spendTokens(cost, 'AI Planner chat');
        if (!ok) {
            showToast(`⚡ Need ${cost} tokens to send a message! Refer friends to earn more.`, 'error');
            return;
        }

        const userMessage = input;
        setInput('');
        setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
        setLoading(true);

        try {
            // 1. Fetch current context from Firestore
            let contextData = { events: [], tasks: [] };

            try {
                // A. Fetch Upcoming Events
                const eventsRef = collection(db, "users", user.uid, "events");
                const qEvents = query(
                    eventsRef,
                    where('startTime', '>=', new Date().toISOString()),
                    orderBy('startTime', 'asc'),
                    limit(20)
                );
                const eventsSnap = await getDocs(qEvents);
                contextData.events = eventsSnap.docs.map(d => ({
                    id: d.id,
                    title: d.data().title,
                    start: d.data().startTime,
                    end: d.data().endTime,
                    type: d.data().type
                }));

                // B. Fetch Pending Tasks
                const tasksRef = collection(db, "users", user.uid, "tasks");
                const qTasks = query(
                    tasksRef,
                    where('completed', '==', false),
                    limit(20)
                );
                const tasksSnap = await getDocs(qTasks);
                contextData.tasks = tasksSnap.docs.map(d => ({
                    id: d.id,
                    title: d.data().title,
                    date: d.data().date,
                    category: d.data().category
                }));

            } catch (err) {
                console.warn("Failed to fetch context:", err);
            }

            // Switch to Groq
            const systemPrompt = `
System Prompt – StudentOS Scheduler & Task Manager
You are the Scheduling Engine inside StudentOS.
Your primary goal is to EXECUTE actions by returning JSON.

Inputs:
current_context: { events: [], tasks: [] }
user_request: natural language input.
Current Time: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}

CRITICAL INSTRUCTION:
If the user asks to "add", "schedule", "remind", "plan", or "save" anything, you MUST return a JSON object with an "actions" array. Do not just chat.

DECISION LOGIC:
1. **Events** (Specific time/day): "study math tomorrow 2-4pm", "hackathon on Friday"
   - Action: 'create_event'
   - Payload: title, start_time (ISO), end_time (ISO), type (study/event/comp)

2. **Tasks** (To-Do items): "buy books", "finish assignment", "add homework"
   - Action: 'create_task'
   - Payload: title, category (Study/Personal/Work), date (YYYY-MM-DD, default to today)

Output JSON Structure (MUST be valid JSON):
{
  "actions": [
    {
      "type": "create_event", // or "create_task"
      "payload": {
        "title": "Math Study",
        "start_time": "2024-02-20T14:00:00",
        "end_time": "2024-02-20T16:00:00",
        "type": "study"
      }
    }
  ],
  "ui_summary": "I've scheduled 'Math Study' for tomorrow.",
  "response": "I've added that to your calendar."
}
`;

            const fullPrompt = `${systemPrompt}

Current Context:
${JSON.stringify(contextData, null, 2)}

Chat History:
${messages.map(m => `${m.role}: ${m.text}`).join('\n')}

User Input: ${userMessage}`;

            const chatCompletion = await getGroqCompletion(fullPrompt);
            const content = chatCompletion.choices[0]?.message?.content || "{}";

            console.log("🤖 AI Raw Response:", content);

            let jsonResponse = {};
            try {
                jsonResponse = parseGroqJSON(content);
                console.log("📦 Parsed JSON:", jsonResponse);
            } catch (error) {
                console.error("❌ JSON Parse Error", error);
                jsonResponse = { response: content }; // Fallback
            }

            const displayMessage = jsonResponse.ui_summary || jsonResponse.response || "Done.";
            const actions = jsonResponse.actions || [];

            console.log("🎯 Actions to execute:", actions);
            console.log("📊 Number of actions:", actions.length);

            if (actions.length === 0) {
                console.warn("⚠️ WARNING: AI returned 0 actions! Check the AI response above.");
                console.warn("Full AI Response:", jsonResponse);
            }

            // Map actions to include the 'action' type for the UI renderer
            const eventsForUI = actions.map(a => ({
                ...a.payload,
                action: a.type.replace('_event', '').replace('_task', ''), // simplify 
                isTask: a.type.includes('task')
            }));

            setMessages(prev => [...prev, { role: 'model', text: displayMessage, events: eventsForUI }]);

            if (actions.length > 0) {
                console.log("🚀 Starting database operations for", actions.length, "actions...");
                // Execute Database Operations
                for (const actionItem of actions) {
                    const type = actionItem.type;
                    const item = actionItem.payload;

                    try {
                        const eventsRef = collection(db, "users", user.uid, "events");
                        const tasksRef = collection(db, "users", user.uid, "tasks");

                        // 1. CREATE EVENT
                        if (type === 'create_event' || type === 'create') {
                            const eventData = {
                                userId: user.uid,
                                title: item.title || "Untitled Event",
                                startTime: item.start_time || item.start || new Date().toISOString(),
                                endTime: item.end_time || item.end || new Date(Date.now() + 3600000).toISOString(),
                                type: item.event_type || item.type || 'study',
                                description: item.description || '',
                                isGhost: false,
                                createdAt: new Date().toISOString()
                            };

                            console.log("Attempting to save event:", eventData);
                            const docRef = await addDoc(eventsRef, eventData);
                            console.log("✅ Event saved successfully. ID:", docRef.id);
                        }
                        // 2. CREATE TASK
                        else if (type === 'create_task') {
                            const taskData = {
                                userId: user.uid,
                                title: item.title || item.text || "Untitled Task",
                                completed: false,
                                category: item.category || 'Study',
                                date: item.date || new Date().toISOString().split('T')[0],
                                createdAt: new Date().toISOString()
                            };

                            console.log("Attempting to save task:", taskData);
                            const docRef = await addDoc(tasksRef, taskData);
                            console.log("✅ Task saved successfully. ID:", docRef.id);
                        }
                        // 3. DELETE
                        else if (type === 'delete_event' || type === 'delete') {
                            if (item.id) {
                                const docRef = doc(db, "users", user.uid, "events", item.id);
                                await deleteDoc(docRef);
                                console.log("✅ Event deleted. ID:", item.id);
                            }
                        }
                        // 4. UPDATE
                        else if (type === 'update_event' || type === 'update') {
                            if (item.id) {
                                const docRef = doc(db, "users", user.uid, "events", item.id);
                                const updates = {};
                                if (item.title) updates.title = item.title;
                                if (item.start_time) updates.startTime = item.start_time;
                                if (item.end_time) updates.endTime = item.end_time;

                                await updateDoc(docRef, updates);
                                console.log("✅ Event updated. ID:", item.id);
                            }
                        }
                    } catch (err) {
                        console.error("❌ Database operation failed:", type, err);
                        console.error("Error code:", err.code);
                        console.error("Error message:", err.message);
                        console.error("Item that failed:", item);

                        // Show user-facing error
                        if (err.code === 'permission-denied') {
                            alert(`🔒 PERMISSION DENIED!\n\nFirestore security rules are blocking writes.\n\nPlease check the Firestore rules in Firebase Console.`);
                        } else {
                            alert(`❌ Save Failed!\n\nError: ${err.message}\n\nCheck the browser console (F12) for details.`);
                        }
                    }
                }

                showToast(`Attempting to save ${actions.length} item(s)...`, 'success');
            }

        } catch (error) {
            console.error("Groq/Firestore Error:", error);
            setMessages(prev => [...prev, {
                role: 'model',
                text: `Sorry, I encountered an error: ${error.message || error.toString()}.`
            }]);
        } finally {
            setLoading(false);
        }
    };


    return (
        <div className="h-[calc(100vh-140px)] flex flex-col relative max-w-5xl mx-auto">
            {/* Toast Notification */}
            <AnimatePresence>
                {toast && (
                    <motion.div
                        initial={{ opacity: 0, y: -20, x: '-50%' }}
                        animate={{ opacity: 1, y: 0, x: '-50%' }}
                        exit={{ opacity: 0, y: -20, x: '-50%' }}
                        className={`absolute top-4 left-1/2 -translate-x-1/2 z-50 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-2
                            ${toast.message?.includes('wrong') || toast.message?.includes('enough') ? 'bg-red-500' : 'bg-emerald-500'}`}
                    >
                        <CheckCircle size={20} />
                        <span className="font-medium">{toast.message}</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Header + Mode Tabs */}
            <div className="text-center mb-6 relative">
                <div className="absolute right-0 top-0 flex gap-2">
                    <button
                        onClick={clearChat}
                        className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                        title="Clear Chat History"
                    >
                        <Trash2 size={20} />
                    </button>
                </div>

                <div className="inline-flex items-center justify-center p-3 rounded-full bg-blue-500/10 border border-blue-500/20 mb-4">
                    <Sparkles size={20} className="text-blue-400 mr-2" />
                    <span className="text-sm font-semibold text-blue-300">AI Powered Planner</span>
                </div>
                <h1 className="text-3xl font-bold text-white mb-2">StudentOS Assistant</h1>
                <p className="text-gray-400 mb-5">Planning schedule for <span className="text-blue-400 font-medium">{userDomain}</span></p>

                {/* Mode toggle */}
                <div className="inline-flex bg-slate-900/60 border border-white/10 rounded-xl p-1 gap-1">
                    <button
                        onClick={() => setMode('chat')}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${mode === 'chat'
                            ? 'bg-blue-600 text-white shadow-lg'
                            : 'text-slate-400 hover:text-white'
                            }`}
                    >
                        <Bot size={16} /> Chat Planner
                    </button>
                    <button
                        onClick={() => setMode('overwhelm')}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${mode === 'overwhelm'
                            ? 'bg-purple-600 text-white shadow-lg'
                            : 'text-slate-400 hover:text-white'
                            }`}
                    >
                        <Brain size={16} /> Anti-Overwhelm
                    </button>
                </div>
            </div>

            {/* ── Anti-Overwhelm Panel ── */}
            <AnimatePresence mode="wait">
                {mode === 'overwhelm' && (
                    <motion.div
                        key="overwhelm"
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -16 }}
                        className="flex-1 overflow-y-auto space-y-6 pb-4 custom-scrollbar"
                    >
                        {/* Input form */}
                        <form onSubmit={handleBreakdown} className="bg-slate-900/60 border border-purple-500/20 rounded-2xl p-6 space-y-4">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-purple-500/20 rounded-xl"><Brain size={20} className="text-purple-400" /></div>
                                <div>
                                    <h2 className="text-white font-bold text-lg">Anti-Overwhelm Mode</h2>
                                    <p className="text-slate-400 text-sm">Break any big project into 30-minute daily chunks.</p>
                                </div>
                            </div>

                            <input
                                required
                                placeholder="What's the project? e.g. GATE 2026 preparation, ML mini project, OS assignment"
                                value={aoProject}
                                onChange={e => setAoProject(e.target.value)}
                                className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 text-sm outline-none focus:border-purple-500 transition-colors"
                            />

                            <div className="flex gap-3">
                                <div className="flex-1">
                                    <label className="text-xs text-slate-500 mb-1 block">Deadline</label>
                                    <input
                                        required
                                        type="date"
                                        min={new Date().toISOString().split('T')[0]}
                                        value={aoDeadline}
                                        onChange={e => setAoDeadline(e.target.value)}
                                        className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-purple-500 transition-colors"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-slate-500 mb-1 block">Hours/day</label>
                                    <select
                                        value={aoHours}
                                        onChange={e => setAoHours(Number(e.target.value))}
                                        className="bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-purple-500 h-full"
                                    >
                                        {[1, 2, 3, 4, 5, 6].map(h => <option key={h} value={h}>{h}h</option>)}
                                    </select>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={aoLoading || !aoProject.trim() || !aoDeadline}
                                className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                            >
                                {aoLoading
                                    ? <><Loader2 size={16} className="animate-spin" /> Generating plan...</>
                                    : <><Brain size={16} /> Break It Down — <Zap size={13} /> {TOKEN_COSTS?.AI_SCHEDULE || 3} tokens</>
                                }
                            </button>
                        </form>

                        {/* Results */}
                        {aoPlan && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">

                                {/* Summary bar */}
                                <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-5 flex flex-wrap gap-4 items-center justify-between">
                                    <div>
                                        <p className="text-white font-bold text-lg">{aoPlan.project}</p>
                                        <p className="text-slate-400 text-sm mt-1 italic">“{aoPlan.coaching_message}”</p>
                                    </div>
                                    <div className="flex gap-4 text-center">
                                        <div>
                                            <p className="text-2xl font-black text-purple-400">{aoPlan.total_sessions}</p>
                                            <p className="text-xs text-slate-500">sessions</p>
                                        </div>
                                        <div>
                                            <p className="text-2xl font-black text-blue-400">{aoPlan.total_days}</p>
                                            <p className="text-xs text-slate-500">days</p>
                                        </div>
                                        <div>
                                            <p className={`text-2xl font-black ${aoFromCache ? 'text-green-400' : 'text-yellow-400'}`}>
                                                {aoFromCache ? '0' : TOKEN_COSTS?.AI_SCHEDULE || 3}
                                            </p>
                                            <p className="text-xs text-slate-500">tokens</p>
                                        </div>
                                    </div>
                                    {aoFromCache && (
                                        <span className="text-xs px-3 py-1 rounded-full bg-green-500/20 text-green-400 font-semibold border border-green-500/30">
                                            🟢 Served from community cache
                                        </span>
                                    )}
                                </div>

                                {/* Day-by-day accordion */}
                                {aoPlan.daily_plan?.map((day, di) => (
                                    <motion.div
                                        key={di}
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: di * 0.04 }}
                                        className="bg-slate-900/60 border border-white/10 rounded-2xl overflow-hidden"
                                    >
                                        <button
                                            onClick={() => setAoExpandedDay(aoExpandedDay === di ? -1 : di)}
                                            className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/5 transition-colors"
                                        >
                                            <div className="flex items-center gap-3">
                                                <span className="w-7 h-7 rounded-full bg-purple-600/30 text-purple-300 text-xs font-bold flex items-center justify-center">
                                                    {day.day_number}
                                                </span>
                                                <span className="text-white font-semibold text-sm">{day.day_label}</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-xs text-slate-500">{day.sessions?.length} sessions</span>
                                                {aoExpandedDay === di
                                                    ? <ChevronDown size={16} className="text-slate-400" />
                                                    : <ChevronRight size={16} className="text-slate-400" />}
                                            </div>
                                        </button>

                                        <AnimatePresence>
                                            {aoExpandedDay === di && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    className="overflow-hidden"
                                                >
                                                    <div className="px-5 pb-4 space-y-2 border-t border-white/5 pt-3">
                                                        {day.sessions?.map((s, si) => {
                                                            const typeColor = s.type === 'practice'
                                                                ? 'bg-orange-500/15 border-orange-500/20 text-orange-300'
                                                                : s.type === 'review'
                                                                    ? 'bg-blue-500/15 border-blue-500/20 text-blue-300'
                                                                    : 'bg-purple-500/15 border-purple-500/20 text-purple-300';
                                                            return (
                                                                <div key={si} className={`flex items-center justify-between px-4 py-2.5 rounded-xl border ${typeColor}`}>
                                                                    <div className="flex items-center gap-3">
                                                                        <Clock size={13} className="opacity-60" />
                                                                        <span className="text-sm font-medium text-white">{s.title}</span>
                                                                    </div>
                                                                    <span className="text-xs opacity-70 flex-shrink-0 ml-2">{s.duration}</span>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </motion.div>
                                ))}
                            </motion.div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Chat Area – only visible in chat mode */}
            {mode === 'chat' && (<>
                <div className="flex-1 bg-slate-900/50 backdrop-blur-xl border border-white/10 rounded-2xl p-6 overflow-y-auto mb-6 custom-scrollbar flex flex-col gap-4 shadow-xl">
                    {messages.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-full text-gray-500 space-y-4">
                            <Bot size={48} className="opacity-50" />
                            <p>No messages yet. Start planning!</p>
                        </div>
                    )}

                    {messages.map((msg, idx) => (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            key={idx}
                            className={`flex items-start gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                        >
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-blue-600' : 'bg-purple-600'
                                }`}>
                                {msg.role === 'user' ? <User size={20} /> : <Bot size={20} />}
                            </div>

                            <div className={`p-4 rounded-2xl max-w-[80%] ${msg.role === 'user'
                                ? 'bg-blue-600/20 border border-blue-500/30 text-white rounded-tr-none'
                                : 'bg-slate-800 border border-white/10 text-gray-200 rounded-tl-none'
                                }`}>
                                <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>

                                {/* Render Event Cards if events are present */}
                                {msg.events && (
                                    <div className="mt-4 space-y-3">
                                        {msg.events.map((evt, i) => (
                                            <div key={i} className={`p-3 rounded-xl border ${evt.action === 'delete' ? 'bg-red-500/10 border-red-500/20' :
                                                evt.action === 'update' ? 'bg-blue-500/10 border-blue-500/20' :
                                                    evt.isTask ? 'bg-pink-500/10 border-pink-500/20' : 'bg-emerald-500/10 border-emerald-500/20'
                                                }`}>
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-2">
                                                        {evt.action === 'delete' ? (
                                                            <span className="text-xs px-2 py-0.5 rounded bg-red-500/20 text-red-400 font-medium">Removed</span>
                                                        ) : evt.action === 'update' ? (
                                                            <span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 font-medium">Updated</span>
                                                        ) : (
                                                            <span className={`text-xs px-2 py-0.5 rounded font-medium ${evt.isTask ? 'bg-pink-500/20 text-pink-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                                                                {evt.isTask ? 'New Task' : 'Added Event'}
                                                            </span>
                                                        )}
                                                        <span className="font-medium text-white">{evt.title || (evt.updates && evt.updates.title) || 'Event'}</span>
                                                    </div>
                                                    {evt.isTask ? <CheckCircle size={14} className="text-pink-400" /> : <CalendarIcon size={14} className="text-emerald-400" />}
                                                </div>
                                                {(evt.start_time || evt.start || (evt.updates && evt.updates.start)) && (
                                                    <div className="text-xs text-gray-400">
                                                        {new Date(evt.start_time || evt.start || evt.updates.start).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    ))}

                    {loading && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-start gap-4">
                            <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0">
                                <Bot size={20} />
                            </div>
                            <div className="bg-slate-800 border border-white/10 p-4 rounded-2xl rounded-tl-none flex items-center gap-3">
                                <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                                <span className="text-sm text-gray-400">Analyzing schedule...</span>
                            </div>
                        </motion.div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="relative">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="e.g. I have a Math exam on Friday and a Physics project due Wednesday..."
                        className="w-full bg-slate-800/80 backdrop-blur-md border border-white/10 rounded-xl py-4 pl-6 pr-14 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all shadow-lg"
                        disabled={loading}
                    />
                    <button
                        onClick={handleSend}
                        disabled={loading || !input.trim()}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Send size={20} />
                    </button>
                </div>
            </>)}
        </div>
    );
};

export default AIPlanner;
