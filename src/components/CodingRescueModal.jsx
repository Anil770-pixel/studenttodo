import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, ShieldAlert, Zap, X, CheckCircle2, ChevronRight, Code2, AlertTriangle, ArrowRight } from 'lucide-react';
import { generateCodingRescueChallenge } from '../lib/groq';
import confetti from 'canvas-confetti';

const CodingRescueModal = ({ isOpen, onClose, onComplete }) => {
    const [loading, setLoading] = useState(true);
    const [challenge, setChallenge] = useState(null);
    const [completed, setCompleted] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchChallenge();
        }
    }, [isOpen]);

    const fetchChallenge = async () => {
        setLoading(true);
        try {
            const data = await generateCodingRescueChallenge();
            setChallenge(data);
        } catch (err) {
            console.error("Failed to fetch coding rescue challenge:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleComplete = () => {
        setCompleted(true);
        confetti({
            particleCount: 150,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#f97316', '#ef4444', '#ffffff']
        });
        setTimeout(() => {
            onComplete();
            onClose();
        }, 1500);
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[100] flex items-center justify-center p-4 overflow-y-auto"
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 30 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 30 }}
                    transition={{ duration: 0.4, ease: "backOut" }}
                    className="w-full max-w-2xl bg-[#0a0a0a] border border-white/10 rounded-[32px] overflow-hidden shadow-2xl shadow-red-500/10 flex flex-col relative"
                >
                    {/* Header Decorative */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 via-orange-500 to-red-600" />
                    
                    <div className="p-8 pb-4 flex justify-between items-start">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-red-600/20 border border-red-500/30 rounded-2xl flex items-center justify-center text-red-500 shadow-lg shadow-red-600/10">
                                <ShieldAlert size={32} className="animate-pulse" />
                            </div>
                            <div>
                                <h2 className="text-3xl font-black text-white tracking-tight">Code Rescue Mission</h2>
                                <p className="text-slate-400 font-medium flex items-center gap-2 text-sm mt-1">
                                    <Terminal size={14} className="text-red-500" /> Save your coding streak with a 5-min challenge
                                </p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 text-slate-500 hover:text-white rounded-xl bg-white/5 transition-all">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="p-8 pt-4 space-y-6">
                        {loading ? (
                            <div className="py-20 flex flex-col items-center justify-center text-center">
                                <div className="relative w-20 h-20 mb-6">
                                    <div className="absolute inset-0 border-4 border-slate-900 rounded-full"></div>
                                    <div className="absolute inset-0 border-4 border-red-500 rounded-full border-t-transparent animate-spin"></div>
                                    <Code2 size={28} className="absolute inset-0 m-auto text-red-500 animate-pulse" />
                                </div>
                                <h3 className="text-xl font-bold text-white">Synthesizing Challenge...</h3>
                                <p className="text-slate-500 mt-2">Checking your language preferences and skill level.</p>
                            </div>
                        ) : (
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                {/* Coaching Message */}
                                <div className="mb-6 p-4 bg-orange-500/10 border border-orange-500/20 rounded-2xl">
                                    <p className="text-orange-400 text-sm font-medium flex gap-2 italic">
                                        "{challenge?.coaching_message}"
                                    </p>
                                </div>

                                {/* Challenge Description */}
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                            <Zap size={18} className="text-red-500 fill-current" />
                                            {challenge?.title}
                                        </h3>
                                        <span className="text-[10px] font-black bg-slate-900 text-slate-400 px-3 py-1 rounded-full border border-white/5 uppercase tracking-widest">
                                            {challenge?.language}
                                        </span>
                                    </div>
                                    <p className="text-slate-400 leading-relaxed">
                                        {challenge?.description}
                                    </p>

                                    {/* Code Editor Mockup */}
                                    <div className="rounded-2xl border border-white/10 bg-[#121212] overflow-hidden">
                                        <div className="bg-[#1a1a1a] px-4 py-2 flex items-center gap-2 border-b border-white/5">
                                            <div className="flex gap-1.5">
                                                <div className="w-2.5 h-2.5 rounded-full bg-red-500/30" />
                                                <div className="w-2.5 h-2.5 rounded-full bg-orange-500/30" />
                                                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/30" />
                                            </div>
                                            <span className="text-[10px] text-slate-500 font-mono flex-1 text-center pr-10 overflow-hidden">rescue_mission.{challenge?.language === 'JavaScript' ? 'js' : 'code'}</span>
                                        </div>
                                        <div className="p-6 font-mono text-sm overflow-x-auto whitespace-pre leading-relaxed text-slate-300">
                                            <code>{challenge?.challenge_code}</code>
                                        </div>
                                    </div>

                                    {/* Hint Area */}
                                    <div className="flex items-start gap-3 p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl">
                                        <AlertTriangle size={16} className="text-blue-400 shrink-0 mt-0.5" />
                                        <p className="text-xs text-blue-300/80">
                                            <span className="font-bold text-blue-400 uppercase tracking-tighter mr-1">Hint:</span>
                                            {challenge?.solution_hint}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer Actions */}
                    <div className="p-8 pt-0 flex justify-end gap-4">
                        <button
                            onClick={onClose}
                            className="px-6 py-4 font-bold text-slate-500 hover:text-white transition-colors"
                        >
                            I'll accept my fate
                        </button>
                        <button
                            onClick={handleComplete}
                            disabled={loading || completed}
                            className="flex items-center gap-2 px-10 py-4 bg-gradient-to-r from-red-600 to-orange-600 hover:from-orange-600 hover:to-red-600 shadow-xl shadow-red-600/20 text-white font-black rounded-2xl transition-all disabled:opacity-50 disabled:scale-100 scale-100 hover:scale-[1.02] active:scale-95"
                        >
                            {completed ? (
                                <>
                                    <CheckCircle2 size={20} />
                                    Mission Complete!
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 size={20} />
                                    I solved it!
                                    <ArrowRight size={18} className="ml-1" />
                                </>
                            )}
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default CodingRescueModal;
