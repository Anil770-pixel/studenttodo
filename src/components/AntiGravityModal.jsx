import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Loader2, Zap, CheckCircle2, ArrowRight, X, Sparkles, Clock } from 'lucide-react';

// ─── Particle burst (CSS-only, no canvas dep) ─────────────────────────────────
const PARTICLES = Array.from({ length: 12 }, (_, i) => i);

// ─── Main Modal ────────────────────────────────────────────────────────────────
/**
 * Props:
 *   task          — the overwhelmed task object
 *   onAccept(microTasks) — user clicked "Break It Down"
 *   onDismiss()   — user closed the modal
 *   loading       — AI is currently generating micro-tasks
 *   microTasks    — string[] once AI has responded
 *   postponeCount — how many times it's been postponed
 */
const AntiGravityModal = ({
    task,
    onAccept,
    onDismiss,
    loading,
    microTasks,
    postponeCount = 3,
}) => {
    const [accepted, setAccepted] = useState(false);

    const handleAccept = () => {
        setAccepted(true);
        onAccept();
    };

    return (
        <AnimatePresence>
            {/* Backdrop */}
            <motion.div
                key="backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={!loading ? onDismiss : undefined}
                className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
            >
                {/* Card */}
                <motion.div
                    key="card"
                    initial={{ scale: 0.85, opacity: 0, y: 40 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                    onClick={e => e.stopPropagation()}
                    className="relative w-full max-w-lg bg-gradient-to-b from-slate-900 to-slate-950 border border-purple-500/30 rounded-3xl p-8 shadow-2xl shadow-purple-900/30 overflow-hidden"
                >
                    {/* Glow ring */}
                    <div className="absolute -top-16 -right-16 w-48 h-48 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />

                    {/* Close */}
                    <button
                        onClick={onDismiss}
                        className="absolute top-5 right-5 text-slate-500 hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>

                    {!microTasks ? (
                        /* ── Detection screen ── */
                        <>
                            {/* Icon */}
                            <div className="relative mx-auto w-16 h-16 mb-5 flex items-center justify-center">
                                <div className="absolute inset-0 bg-purple-500/20 rounded-full animate-ping" />
                                <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center">
                                    <Brain size={28} className="text-white" />
                                </div>
                            </div>

                            {/* Heading */}
                            <h2 className="text-center text-2xl font-black text-white mb-2">
                                You seem stuck.
                            </h2>
                            <p className="text-center text-slate-400 text-sm mb-6">
                                <span className="text-purple-300 font-semibold">&ldquo;{task?.title}&rdquo;</span>
                                {' '}has been postponed{' '}
                                <span className="text-white font-bold">{postponeCount} days</span> in a row.
                                <br />That's not laziness — it's overwhelm.
                            </p>

                            {/* Anti-Gravity pitch */}
                            <div className="bg-purple-500/10 border border-purple-500/20 rounded-2xl p-5 mb-6 text-sm text-slate-300 space-y-2">
                                <p className="flex items-start gap-2">
                                    <Sparkles size={16} className="text-purple-400 mt-0.5 flex-shrink-0" />
                                    We'll split this task into <strong className="text-white">4 tiny, 10-minute steps.</strong>
                                </p>
                                <p className="flex items-start gap-2">
                                    <Zap size={16} className="text-yellow-400 mt-0.5 flex-shrink-0" />
                                    So small you can't say no to the first one.
                                </p>
                                <p className="flex items-start gap-2">
                                    <CheckCircle2 size={16} className="text-green-400 mt-0.5 flex-shrink-0" />
                                    Each completion earns XP and builds momentum.
                                </p>
                            </div>

                            {/* CTA */}
                            <motion.button
                                whileHover={{ scale: 1.03 }}
                                whileTap={{ scale: 0.97 }}
                                onClick={handleAccept}
                                disabled={loading}
                                className="w-full py-4 rounded-2xl font-black text-base tracking-wide bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-lg shadow-purple-900/30 flex items-center justify-center gap-3 transition-all disabled:opacity-60"
                            >
                                {loading ? (
                                    <><Loader2 size={20} className="animate-spin" /> Generating micro-tasks...</>
                                ) : (
                                    <><Brain size={20} /> Enter Anti-Gravity Mode <ArrowRight size={18} /></>
                                )}
                            </motion.button>

                            <button
                                onClick={onDismiss}
                                className="w-full text-center text-slate-600 hover:text-slate-400 text-sm mt-4 transition-colors"
                            >
                                No thanks, I'll power through it
                            </button>
                        </>
                    ) : (
                        /* ── Micro-tasks revealed ── */
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="space-y-4"
                        >
                            {/* Success header */}
                            <div className="text-center mb-6">
                                <div className="inline-flex items-center justify-center w-14 h-14 bg-green-500/20 rounded-full mb-3">
                                    <CheckCircle2 size={28} className="text-green-400" />
                                </div>
                                <h2 className="text-xl font-black text-white">Anti-Gravity Activated!</h2>
                                <p className="text-slate-400 text-sm mt-1">
                                    Your task has been broken down. Start with Step 1 — just 10 minutes.
                                </p>
                            </div>

                            {/* Micro-task list */}
                            <div className="space-y-2">
                                {microTasks.map((title, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, x: -16 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.1 }}
                                        className="flex items-center gap-3 bg-slate-800/80 border border-white/8 rounded-xl px-4 py-3.5"
                                    >
                                        <span className="w-7 h-7 rounded-full bg-purple-600/30 text-purple-300 text-xs font-black flex items-center justify-center flex-shrink-0">
                                            {i + 1}
                                        </span>
                                        <div className="flex-1">
                                            <p className="text-white text-sm font-medium">{title}</p>
                                        </div>
                                        <div className="flex items-center gap-1 text-slate-500 text-xs flex-shrink-0">
                                            <Clock size={11} />
                                            10 min
                                        </div>
                                    </motion.div>
                                ))}
                            </div>

                            <p className="text-center text-slate-600 text-xs pt-2">
                                These 4 tasks have replaced the original in your list 🚀
                            </p>

                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                onClick={onDismiss}
                                className="w-full py-3.5 rounded-2xl font-bold text-sm bg-green-600 hover:bg-green-500 text-white transition-colors flex items-center justify-center gap-2"
                            >
                                <Zap size={16} /> Let's go — tackle Step 1!
                            </motion.button>
                        </motion.div>
                    )}
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default AntiGravityModal;
