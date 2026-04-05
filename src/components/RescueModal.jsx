import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, Zap, X, CheckCircle2, ChevronRight, LayoutList, History, ArrowRight, Trash2, ShieldCheck, Flame } from 'lucide-react';
import { generateRescuePlan, generateMicroTasks } from '../lib/groq';
import confetti from 'canvas-confetti';

const RescueModal = ({ overdueTasks, taskToRescue, onClose, onAcceptPlan }) => {
    const [loading, setLoading] = useState(true);
    const [rescuePlan, setRescuePlan] = useState(null);
    const [microTasks, setMicroTasks] = useState([]);
    const [error, setError] = useState(false);
    
    const isPanicMode = !!taskToRescue;

    useEffect(() => {
        const fetchData = async () => {
            try {
                if (isPanicMode) {
                    const tasks = await generateMicroTasks(taskToRescue.title);
                    setMicroTasks(tasks);
                } else {
                    const plan = await generateRescuePlan(overdueTasks);
                    setRescuePlan(plan);
                }
            } catch (err) {
                console.error("Rescue generation failed:", err);
                setError(true);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [overdueTasks, taskToRescue, isPanicMode]);

    const handleAccept = () => {
        confetti({
            particleCount: 150,
            spread: 80,
            origin: { y: 0.6 },
            colors: isPanicMode ? ['#ef4444', '#f87171', '#dc2626'] : ['#4ade80', '#2dd4bf', '#818cf8']
        });
        
        if (isPanicMode) {
            // Logic for panic mode acceptance: maybe create those 4 subtasks?
            // For now, closing is fine as the user has the plan.
            onClose();
        } else {
            onAcceptPlan(rescuePlan);
        }
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/90 backdrop-blur-md z-[100] flex items-center justify-center p-4"
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className={`w-full max-w-2xl border rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] ${isPanicMode ? 'bg-[#1a0505] border-red-500/40 shadow-red-500/20' : 'bg-[#0f172a] border-emerald-500/20 shadow-emerald-500/10'}`}
                >
                    {/* Header */}
                    <div className={`p-6 border-b relative ${isPanicMode ? 'bg-gradient-to-r from-red-600/20 to-orange-600/10 border-red-500/20' : 'bg-gradient-to-r from-emerald-500/20 to-teal-500/10 border-emerald-500/20'}`}>
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-black/20 transition-colors"
                        >
                            <X size={20} />
                        </button>
                        <div className="flex items-center gap-4">
                            <div className={`w-14 h-14 border rounded-2xl flex items-center justify-center shadow-lg ${isPanicMode ? 'bg-red-500/20 border-red-500/30 text-red-400 shadow-red-500/20' : 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400 shadow-emerald-500/20'}`}>
                                {isPanicMode ? <Flame size={32} /> : <ShieldAlert size={32} />}
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-white tracking-tight">
                                    {isPanicMode ? 'STRIKE 3: PANIC RESCUE' : 'Student Recovery Engine'}
                                </h2>
                                <p className={`font-medium flex items-center gap-2 text-sm mt-1 ${isPanicMode ? 'text-red-400' : 'text-emerald-400'}`}>
                                    <Zap size={14} className="fill-current" /> {isPanicMode ? `Breaking down "${taskToRescue.title}"` : 'Auto-rebuilding your schedule'}
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
                                    <div className={`absolute inset-0 border-4 rounded-full border-t-transparent animate-spin ${isPanicMode ? 'border-red-500' : 'border-emerald-500'}`}></div>
                                    <ShieldAlert size={28} className={`absolute inset-0 m-auto animate-pulse ${isPanicMode ? 'text-red-500' : 'text-emerald-500'}`} />
                                </div>
                                <h3 className="text-xl font-bold text-white mt-6">AI is extracting micro-tasks...</h3>
                                <p className="text-slate-400 mt-2 text-center max-w-sm italic">"The journey of a thousand miles begins with four simple steps."</p>
                            </div>
                        ) : error ? (
                            <div className="py-12 text-center text-red-400">
                                <ShieldAlert size={48} className="mx-auto mb-4 opacity-50" />
                                <p className="text-lg">Rescue Engine stalled. Try again later.</p>
                                <button onClick={onClose} className="mt-4 px-6 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700">Go Back</button>
                            </div>
                        ) : isPanicMode ? (
                            <div className="space-y-6 animate-in fade-in duration-700">
                                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl">
                                    <p className="text-red-300 text-sm italic text-center">
                                        "You have less than 6 hours. Do not look at the whole mountain. Just do these 4 things, one by one. You've got this."
                                    </p>
                                </div>

                                <div className="space-y-3">
                                    {microTasks.map((task, i) => (
                                        <motion.div 
                                            key={i}
                                            initial={{ x: -20, opacity: 0 }}
                                            animate={{ x: 0, opacity: 1 }}
                                            transition={{ delay: i * 0.1 }}
                                            className="p-4 bg-slate-900/50 border border-red-500/20 rounded-2xl flex items-center gap-4 group hover:bg-red-500/5 transition-all"
                                        >
                                            <div className="w-8 h-8 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center font-black text-sm border border-red-500/30 group-hover:scale-110 transition-transform">
                                                {i + 1}
                                            </div>
                                            <span className="text-white font-medium">{task}</span>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            // ... Standard Rescue Plan logic (unchanged visually) ...
                            <div className="space-y-6 animate-in fade-in duration-700">
                                {/* Coaching Message */}
                                <div className="p-5 bg-gradient-to-br from-indigo-500/10 to-transparent border border-indigo-500/20 rounded-2xl relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-3xl rounded-full translate-x-10 -translate-y-10"></div>
                                    <p className="text-indigo-200 text-lg md:text-xl font-medium leading-relaxed italic relative z-10">
                                        "{rescuePlan?.coaching_message}"
                                    </p>
                                </div>

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
                    <div className={`p-6 bg-slate-900/80 border-t border-slate-800 flex justify-end gap-4 backdrop-blur-xl`}>
                        <button
                            onClick={onClose}
                            className="px-6 py-3 font-medium text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleAccept}
                            disabled={loading || error}
                            className={`flex items-center gap-2 px-8 py-3 font-bold rounded-xl shadow-lg transition-all active:scale-95 disabled:bg-slate-800 disabled:text-slate-500 ${isPanicMode ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-600/20' : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'}`}
                        >
                            {isPanicMode ? <ShieldCheck size={18} /> : <CheckCircle2 size={18} />}
                            {isPanicMode ? 'Challenge Accepted' : 'Accept Rescue Plan'}
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default RescueModal;
