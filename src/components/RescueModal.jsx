import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, Zap, X, CheckCircle2, ChevronRight, LayoutList, History, ArrowRight, Trash2 } from 'lucide-react';
import { generateRescuePlan } from '../lib/groq';
import confetti from 'canvas-confetti';

const RescueModal = ({ overdueTasks, onClose, onAcceptPlan }) => {
    const [loading, setLoading] = useState(true);
    const [rescuePlan, setRescuePlan] = useState(null);
    const [error, setError] = useState(false);

    useEffect(() => {
        const fetchPlan = async () => {
            try {
                const plan = await generateRescuePlan(overdueTasks);
                setRescuePlan(plan);
            } catch (err) {
                console.error("Rescue plan generation failed inside modal:", err);
                setError(true);
            } finally {
                setLoading(false);
            }
        };
        fetchPlan();
    }, [overdueTasks]);

    const handleAccept = () => {
        if (!rescuePlan) return;
        confetti({
            particleCount: 150,
            spread: 80,
            origin: { y: 0.6 },
            colors: ['#4ade80', '#2dd4bf', '#818cf8']
        });
        onAcceptPlan(rescuePlan);
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="w-full max-w-2xl bg-[#0f172a] border border-emerald-500/20 rounded-3xl overflow-hidden shadow-2xl shadow-emerald-500/10 flex flex-col max-h-[90vh]"
                >
                    {/* Header */}
                    <div className="bg-gradient-to-r from-emerald-500/20 to-teal-500/10 p-6 border-b border-emerald-500/20 relative">
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-slate-900/50 transition-colors"
                        >
                            <X size={20} />
                        </button>
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-emerald-500/20 border border-emerald-500/30 rounded-2xl flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/20">
                                <ShieldAlert size={32} />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-white tracking-tight">Student Recovery Engine</h2>
                                <p className="text-emerald-400 font-medium flex items-center gap-2 text-sm mt-1">
                                    <Zap size={14} className="fill-current" /> Auto-rebuilding your schedule
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Content Body */}
                    <div className="p-6 overflow-y-auto custom-scrollbar flex-1 relative">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-20">
                                <div className="relative w-20 h-20">
                                    <div className="absolute inset-0 border-4 border-slate-800 rounded-full"></div>
                                    <div className="absolute inset-0 border-4 border-emerald-500 rounded-full border-t-transparent animate-spin"></div>
                                    <ShieldAlert size={28} className="absolute inset-0 m-auto text-emerald-500 animate-pulse" />
                                </div>
                                <h3 className="text-xl font-bold text-white mt-6">Analyzing {overdueTasks.length} overdue tasks</h3>
                                <p className="text-slate-400 mt-2 text-center max-w-sm">Generating a 5-day recovery plan to safely get you back on track without overwhelming you...</p>
                            </div>
                        ) : error ? (
                            <div className="py-12 text-center text-red-400">
                                <ShieldAlert size={48} className="mx-auto mb-4 opacity-50" />
                                <p className="text-lg">Oh no! The Rescue Engine encountered an error.</p>
                                <button onClick={onClose} className="mt-4 px-6 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700">Go Back</button>
                            </div>
                        ) : (
                            <div className="space-y-6 animate-in fade-in duration-700">
                                {/* Coaching Message */}
                                <div className="p-5 bg-gradient-to-br from-indigo-500/10 to-transparent border border-indigo-500/20 rounded-2xl relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-3xl rounded-full translate-x-10 -translate-y-10"></div>
                                    <p className="text-indigo-200 text-lg md:text-xl font-medium leading-relaxed italic relative z-10">
                                        "{rescuePlan?.coaching_message}"
                                    </p>
                                </div>

                                {/* Dropped Tasks */}
                                {rescuePlan?.can_drop_or_ignore?.length > 0 && (
                                    <div className="mb-6">
                                        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                                            <Trash2 size={16} /> Optional / Safe to Drop
                                        </h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {rescuePlan.can_drop_or_ignore.map(t => (
                                                <div key={t.id} className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between opacity-60">
                                                    <span className="text-slate-400 line-through text-sm truncate">{t.title}</span>
                                                    <span className="text-[10px] bg-slate-800 text-slate-500 px-2 py-0.5 rounded font-bold">DROPPED</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Rescue Plan Timeline */}
                                <div>
                                    <h3 className="text-sm font-bold text-emerald-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <LayoutList size={16} /> New 5-Day Timeline
                                    </h3>
                                    
                                    <div className="space-y-4">
                                        {rescuePlan?.rescue_plan?.map((task, index) => {
                                            const originalTask = overdueTasks.find(t => t.id === task.id);
                                            return (
                                                <div key={task.id} className="relative group">
                                                    {/* Connecting Line */}
                                                    {index !== rescuePlan.rescue_plan.length - 1 && (
                                                        <div className="absolute left-[23px] top-10 bottom-[-20px] w-0.5 bg-slate-800 group-hover:bg-emerald-500/20 transition-colors z-0"></div>
                                                    )}
                                                    
                                                    <div className="flex gap-4 relative z-10">
                                                        <div className="w-12 h-12 rounded-full bg-slate-900 border-2 border-emerald-500/20 flex flex-col items-center justify-center shrink-0 group-hover:border-emerald-500/50 transition-colors shadow-lg">
                                                            <span className="text-[10px] font-bold text-emerald-500 uppercase leading-none">Day</span>
                                                            <span className="text-white font-black leading-none mt-0.5">
                                                                {new Date(task.new_date).getDate()}
                                                            </span>
                                                        </div>
                                                        <div className="flex-1 bg-slate-900 border border-slate-800 hover:border-emerald-500/30 rounded-2xl p-4 transition-all">
                                                            <h4 className="text-white font-bold leading-tight">{task.title}</h4>
                                                            <div className="flex items-center gap-2 mt-2">
                                                                <span className="flex items-center gap-1 text-[10px] font-bold bg-slate-800 text-slate-400 px-2 py-1 rounded-md line-through opacity-70">
                                                                    <History size={10} /> {originalTask?.date || 'Missed'}
                                                                </span>
                                                                <ArrowRight size={12} className="text-emerald-500" />
                                                                <span className="flex items-center gap-1 text-[10px] font-bold bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded-md border border-emerald-500/20">
                                                                    {new Date(task.new_date).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
                                                                </span>
                                                            </div>
                                                            {task.rationale && (
                                                                <p className="mt-3 text-xs text-slate-500 bg-slate-950 p-2.5 rounded-xl border border-white/5 border-l-2 border-l-emerald-500/50">
                                                                    💡 {task.rationale}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer Actions */}
                    <div className="p-6 bg-slate-900/80 border-t border-slate-800 flex justify-end gap-4 backdrop-blur-xl">
                        <button
                            onClick={onClose}
                            className="px-6 py-3 font-medium text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleAccept}
                            disabled={loading || error || !rescuePlan}
                            className="flex items-center gap-2 px-8 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20 transition-all active:scale-95"
                        >
                            <CheckCircle2 size={18} />
                            Accept Rescue Plan
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default RescueModal;
