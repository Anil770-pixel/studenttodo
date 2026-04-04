import React, { useState } from 'react';
import { AlertTriangle, Sparkles, Loader2, Calendar, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const BacklogRescueModal = ({ isOpen, onClose, overdueCount }) => {
    const [step, setStep] = useState(1); // 1: Info, 2: Rescheduling, 3: Success

    const handleReschedule = () => {
        setStep(2);
        // Simulate AI rescheduling logic
        setTimeout(() => {
            setStep(3);
        }, 3000);
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="bg-slate-900 border border-red-500/30 rounded-2xl p-6 w-full max-w-lg shadow-2xl shadow-red-900/20 overflow-hidden relative"
                >
                    {/* Background glow */}
                    <div className="absolute top-[-20%] right-[-20%] w-[50%] h-[50%] bg-red-500/20 rounded-full blur-[80px] pointer-events-none" />

                    {step === 1 && (
                        <div className="space-y-6">
                            <div className="flex items-center gap-4">
                                <div className="p-4 bg-red-500/20 rounded-2xl text-red-500 animate-pulse">
                                    <AlertTriangle size={32} />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-white">Backlog Rescue Engine™</h2>
                                    <p className="text-slate-400 text-sm mt-1">Guilt-free recovery system.</p>
                                </div>
                            </div>
                            
                            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                                <p className="text-slate-300">
                                    You have <strong className="text-red-400">{overdueCount} overdue tasks</strong> dragging you down. 
                                    Falling behind happens to the best of us. Let's not panic.
                                </p>
                            </div>

                            <p className="text-sm text-slate-400">
                                StudentOS will use AI to analyze your upcoming week and smartly distribute these missed tasks starting from tomorrow, so your Today remains clear and actionable.
                            </p>

                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                                <button onClick={onClose} className="px-5 py-2.5 rounded-xl font-semibold text-slate-400 hover:bg-slate-800 transition-colors">
                                    Cancel
                                </button>
                                <button
                                    onClick={handleReschedule}
                                    className="px-5 py-2.5 rounded-xl font-bold bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-500 hover:to-orange-400 text-white shadow-lg shadow-red-500/20 flex items-center gap-2 transition-all active:scale-95"
                                >
                                    <Sparkles size={18} />
                                    Auto-Reschedule Now
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="flex flex-col items-center justify-center py-12 space-y-6">
                            <div className="relative">
                                <div className="w-20 h-20 border-4 border-slate-800 border-t-red-500 rounded-full animate-spin" />
                                <Sparkles size={24} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-orange-400 animate-pulse" />
                            </div>
                            <div className="text-center">
                                <h3 className="text-lg font-bold text-white">Calculating Rescue Plan...</h3>
                                <p className="text-slate-400 text-sm mt-2">Redistributing {overdueCount} tasks across next 7 days.</p>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-center">
                                <div className="p-4 bg-green-500/20 rounded-full text-green-500 mb-4 animate-in zoom-in duration-500">
                                    <CheckCircle2 size={48} />
                                </div>
                            </div>
                            <div className="text-center">
                                <h2 className="text-2xl font-black text-white">Schedule Restored!</h2>
                                <p className="text-slate-300 mt-2">
                                    Your backlog has been smoothly integrated into your upcoming week. Your plate for today is clean. Breathe.
                                </p>
                            </div>
                            <div className="bg-slate-800/50 rounded-xl p-4 border border-green-500/20 flex items-center gap-3">
                                <Calendar size={20} className="text-green-400" />
                                <span className="text-sm font-medium text-slate-300">Check your Schedule to see the updated plan.</span>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-colors"
                            >
                                Back to Dashboard
                            </button>
                        </div>
                    )}
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default BacklogRescueModal;
