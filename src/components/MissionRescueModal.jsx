import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, ShieldAlert, Zap, X, CheckCircle2, ChevronRight, AlertTriangle, ArrowRight, Sparkles } from 'lucide-react';
import { generateMissionRescueChallenge } from '../lib/groq';
import confetti from 'canvas-confetti';

const MissionRescueModal = ({ isOpen, onClose, onComplete, missionGoal = "Daily Mission" }) => {
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
            const data = await generateMissionRescueChallenge(missionGoal);
            setChallenge(data);
        } catch (err) {
            console.error("Failed to fetch mission rescue challenge:", err);
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
                className="fixed inset-0 bg-black/95 backdrop-blur-2xl z-[100] flex items-center justify-center p-4 overflow-y-auto"
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 30 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 30 }}
                    transition={{ duration: 0.4, ease: "backOut" }}
                    className="w-full max-w-2xl bg-[#0a0a0a] border border-white/10 rounded-[40px] overflow-hidden shadow-2xl shadow-red-500/10 flex flex-col relative"
                >
                    {/* Header Decorative */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 via-orange-500 via-primary to-orange-500" />
                    
                    <div className="p-10 pb-4 flex justify-between items-start">
                        <div className="flex items-center gap-5">
                            <div className="w-16 h-16 bg-red-600/20 border border-red-500/30 rounded-3xl flex items-center justify-center text-red-500 shadow-lg shadow-red-600/10 relative">
                                <ShieldAlert size={36} className="animate-pulse" />
                                <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-600 animate-ping" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-black text-white tracking-tight">Rescue: {missionGoal}</h1>
                                <p className="text-slate-400 font-medium flex items-center gap-2 text-sm mt-1">
                                    <Sparkles size={14} className="text-yellow-500" /> Save your {missionGoal} streak with a 5-min mental win
                                </p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 text-slate-500 hover:text-white rounded-xl bg-white/5 transition-all">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="p-10 pt-4 space-y-8">
                        {loading ? (
                            <div className="py-24 flex flex-col items-center justify-center text-center">
                                <div className="relative w-24 h-24 mb-6">
                                    <div className="absolute inset-0 border-4 border-slate-900 rounded-full"></div>
                                    <div className="absolute inset-0 border-4 border-red-500 rounded-full border-t-transparent animate-spin"></div>
                                    <Target size={32} className="absolute inset-0 m-auto text-red-500 animate-pulse" />
                                </div>
                                <h3 className="text-2xl font-bold text-white">Synthesizing Challenge...</h3>
                                <p className="text-slate-500 mt-2 max-w-xs mx-auto">Tailoring a quick win to rebuild your productivity momentum.</p>
                            </div>
                        ) : (
                            <div className="animate-in fade-in slide-in-from-bottom-6 duration-700">
                                {/* Coaching Message */}
                                <div className="mb-8 p-5 bg-gradient-to-br from-orange-500/10 to-transparent border border-orange-500/20 rounded-3xl relative overflow-hidden">
                                    <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-orange-500/5 blur-3xl rounded-full" />
                                    <p className="text-orange-300 text-base font-medium flex gap-3 italic leading-relaxed">
                                        <span className="text-2xl text-orange-500/50 -mt-1">"</span>
                                        {challenge?.coaching_message}
                                        <span className="text-2xl text-orange-500/50">"</span>
                                    </p>
                                </div>

                                {/* Challenge Description */}
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-2xl font-black text-white flex items-center gap-2">
                                            <Zap size={22} className="text-red-500 fill-current" />
                                            {challenge?.title}
                                        </h3>
                                        <div className="flex items-center gap-1.5 bg-slate-900 text-[10px] font-black text-slate-400 px-4 py-1.5 rounded-full border border-white/5 uppercase tracking-widest">
                                            <Target size={12} className="text-primary" />
                                            {challenge?.category}
                                        </div>
                                    </div>
                                    
                                    <div className="bg-[#121212] border border-white/10 rounded-[32px] p-8 space-y-6 shadow-inner relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-[80px] rounded-full" />
                                        <p className="text-lg text-slate-300 leading-relaxed font-medium">
                                            {challenge?.description}
                                        </p>
                                        
                                        <div className="p-6 bg-slate-950/80 rounded-2xl border border-white/5 font-bold text-white text-xl text-center shadow-lg">
                                            {challenge?.challenge_content}
                                        </div>
                                    </div>

                                    {/* Hint Area */}
                                    <div className="flex items-start gap-4 p-5 bg-blue-500/10 border border-blue-500/20 rounded-2xl">
                                        <AlertTriangle size={20} className="text-blue-400 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-xs font-black text-blue-400 uppercase tracking-widest mb-1">PRO TIP</p>
                                            <p className="text-sm text-blue-300/80 leading-relaxed">
                                                {challenge?.solution_hint}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer Actions */}
                    <div className="p-10 pt-0 flex justify-end gap-5">
                        <button
                            onClick={onClose}
                            className="px-6 py-4 font-bold text-slate-500 hover:text-white transition-all hover:translate-x-[-4px]"
                        >
                            I'll accept my fate
                        </button>
                        <button
                            onClick={handleComplete}
                            disabled={loading || completed}
                            className="flex items-center gap-3 px-12 py-5 bg-gradient-to-r from-red-600 via-orange-600 to-red-600 hover:hue-rotate-15 bg-[length:200%] bg-left hover:bg-right shadow-2xl shadow-red-600/30 text-white font-black rounded-[24px] transition-all disabled:opacity-50 disabled:scale-100 scale-100 hover:scale-[1.05] active:scale-95 group/btn"
                        >
                            {completed ? (
                                <>
                                    <CheckCircle2 size={24} />
                                    Mission Complete!
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 size={24} />
                                    Mission Accomplished
                                    <ArrowRight size={22} className="ml-1 group-hover/btn:translate-x-2 transition-transform" />
                                </>
                            )}
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default MissionRescueModal;
