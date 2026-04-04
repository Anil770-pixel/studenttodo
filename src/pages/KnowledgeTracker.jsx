/**
 * ============================================================
 * KnowledgeTracker — Visual Skill Progression Dashboard
 * ============================================================
 * Students add skills (e.g. "React.js") and log study sessions.
 * Each logged session increments the skill's mastery %.
 * Data persists to Firestore under users/{uid}/skills.
 * ============================================================
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Brain, Plus, TrendingUp, Flame, Trash2, ChevronUp,
    ChevronDown, BookOpen, Loader2, Check, Target
} from 'lucide-react';
import {
    collection, query, onSnapshot, addDoc, updateDoc,
    deleteDoc, doc, serverTimestamp, orderBy, limit
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { safeCall, validateTaskInput, ERROR_CODES } from '../lib/errorHandler';

const getHealth = (pct) => {
    if (pct >= 80) return { label: 'Strong Health', color: 'text-emerald-400', bar: 'from-emerald-500 to-teal-400', badge: 'bg-emerald-500/10 border-emerald-500/20' };
    if (pct >= 40) return { label: 'Medium Health', color: 'text-yellow-400', bar: 'from-yellow-500 to-orange-400', badge: 'bg-yellow-500/10 border-yellow-500/20' };
    return { label: 'Weak (Priority)', color: 'text-red-400', bar: 'from-red-500 to-orange-500', badge: 'bg-red-500/10 border-red-500/20' };
};

// ─── Preset skill suggestions ──────────────────────────────────────────────────
const PRESET_SKILLS = [
    'Data Structures', 'Algorithms', 'React.js', 'Node.js', 'Python',
    'Machine Learning', 'System Design', 'SQL', 'Networking', 'OS Concepts',
    'Java', 'C++', 'Flutter', 'Cloud (AWS)', 'Computer Networks',
];

// ─── Single Skill Card ─────────────────────────────────────────────────────────
const SkillCard = ({ skill, onIncrement, onDecrement, onDelete }) => {
    const { label, color, bar, badge } = getHealth(skill.mastery);
    const [deleting, setDeleting] = useState(false);

    const handleDelete = async () => {
        setDeleting(true);
        await onDelete(skill.id);
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`group relative border rounded-2xl p-5 transition-all bg-slate-900/60 ${badge.replace('bg-', 'hover:bg-').replace('border-', 'hover:border-')}`}
        >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
                <div>
                    <h3 className="text-white font-bold text-base">{skill.name}</h3>
                    <div className={`inline-flex items-center mt-1 px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider ${color} ${badge}`}>
                        {label}
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    {/* Nudge buttons */}
                    <button
                        onClick={() => onDecrement(skill)}
                        disabled={skill.mastery <= 0}
                        className="p-1.5 text-slate-600 hover:text-white disabled:opacity-20 transition-colors rounded-lg hover:bg-white/5"
                        title="Decrease by 5%"
                    >
                        <ChevronDown size={15} />
                    </button>
                    <button
                        onClick={() => onIncrement(skill)}
                        disabled={skill.mastery >= 100}
                        className="p-1.5 text-slate-600 hover:text-emerald-400 disabled:opacity-20 transition-colors rounded-lg hover:bg-white/5"
                        title="Mark study session (+5%)"
                    >
                        <ChevronUp size={15} />
                    </button>
                    {/* Delete */}
                    <button
                        onClick={handleDelete}
                        disabled={deleting}
                        className="p-1.5 text-slate-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all rounded-lg hover:bg-white/5"
                        title="Remove skill"
                    >
                        {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    </button>
                </div>
            </div>

            {/* Mastery % */}
            <div className="flex items-end justify-between mb-2">
                <span className="text-3xl font-black text-white">{skill.mastery}%</span>
                {skill.sessions > 0 && (
                    <span className="flex items-center gap-1 text-xs text-slate-500 mb-1">
                        <Flame size={12} className="text-orange-400" />
                        {skill.sessions} session{skill.sessions !== 1 ? 's' : ''}
                    </span>
                )}
            </div>

            {/* Progress bar */}
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <motion.div
                    className={`h-full rounded-full bg-gradient-to-r ${bar}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${skill.mastery}%` }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                />
            </div>

            {/* Goal chip */}
            {skill.goal && (
                <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
                    <Target size={11} />
                    Goal: <span className="text-slate-300">{skill.goal}</span>
                </div>
            )}
        </motion.div>
    );
};

// ─── Main KnowledgeTracker Component ──────────────────────────────────────────
const KnowledgeTracker = () => {
    const { user } = useAuth();
    const [skills, setSkills] = useState([]);
    const [loading, setLoading] = useState(true);
    const [adding, setAdding] = useState(false);

    // New skill form state
    const [newName, setNewName] = useState('');
    const [newMastery, setNewMastery] = useState(0);
    const [newGoal, setNewGoal] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [formError, setFormError] = useState('');

    // ─── Real-time Firestore listener ──────────────────────────────────────────
    useEffect(() => {
        if (!user) { setLoading(false); return; }

        const skillsRef = collection(db, 'users', user.uid, 'skills');
        const q = query(skillsRef, orderBy('createdAt', 'desc'), limit(30));

        const unsub = onSnapshot(q, (snap) => {
            setSkills(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            setLoading(false);
        }, (err) => {
            console.error('Skills listener error:', err);
            setLoading(false);
        });

        return () => unsub();
    }, [user]);

    // ─── Add skill ─────────────────────────────────────────────────────────────
    const handleAdd = async (e) => {
        e.preventDefault();
        setFormError('');

        // Validate
        const { error: validErr } = await safeCall(
            () => { validateTaskInput({ title: newName }); return true; },
            ERROR_CODES.BAD_INPUT
        );
        if (validErr) { setFormError(validErr.userMessage); return; }

        if (skills.some(s => s.name.toLowerCase() === newName.trim().toLowerCase())) {
            setFormError('You already have this skill tracked!');
            return;
        }

        setAdding(true);
        const { error } = await safeCall(async () => {
            const skillsRef = collection(db, 'users', user.uid, 'skills');
            await addDoc(skillsRef, {
                name: newName.trim(),
                mastery: Math.max(0, Math.min(100, Number(newMastery) || 0)),
                goal: newGoal.trim() || null,
                sessions: 0,
                createdAt: serverTimestamp(),
            });
        });

        if (error) { setFormError(error.userMessage); }
        else {
            setNewName(''); setNewMastery(0); setNewGoal('');
            setShowForm(false);
        }
        setAdding(false);
    };

    // ─── Increment mastery (+5%) after study session ────────────────────────────
    const handleIncrement = async (skill) => {
        if (!user || skill.mastery >= 100) return;
        const newMastery = Math.min(100, skill.mastery + 5);
        const ref = doc(db, 'users', user.uid, 'skills', skill.id);
        await safeCall(() => updateDoc(ref, {
            mastery: newMastery,
            sessions: (skill.sessions || 0) + 1
        }));
    };

    // ─── Decrement mastery (-5%) ───────────────────────────────────────────────
    const handleDecrement = async (skill) => {
        if (!user || skill.mastery <= 0) return;
        const newMastery = Math.max(0, skill.mastery - 5);
        const ref = doc(db, 'users', user.uid, 'skills', skill.id);
        await safeCall(() => updateDoc(ref, { mastery: newMastery }));
    };

    // ─── Delete skill ──────────────────────────────────────────────────────────
    const handleDelete = async (skillId) => {
        if (!user) return;
        const ref = doc(db, 'users', user.uid, 'skills', skillId);
        await safeCall(() => deleteDoc(ref));
    };

    // ─── Quick-add from preset ─────────────────────────────────────────────────
    const quickAdd = async (skillName) => {
        if (!user) return;
        if (skills.some(s => s.name.toLowerCase() === skillName.toLowerCase())) return;
        const skillsRef = collection(db, 'users', user.uid, 'skills');
        await safeCall(() => addDoc(skillsRef, {
            name: skillName,
            mastery: 0,
            goal: null,
            sessions: 0,
            createdAt: serverTimestamp(),
        }));
    };

    // ─── Stats ─────────────────────────────────────────────────────────────────
    const avgMastery = skills.length
        ? Math.round(skills.reduce((s, sk) => s + sk.mastery, 0) / skills.length)
        : 0;
    const expertCount = skills.filter(s => s.mastery >= 90).length;
    const totalSessions = skills.reduce((s, sk) => s + (sk.sessions || 0), 0);

    // ─── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="space-y-8 pb-10">

            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2.5 bg-emerald-500/15 border border-emerald-500/25 rounded-xl">
                            <Brain size={22} className="text-emerald-400" />
                        </div>
                        <h1 className="text-4xl font-bold text-white tracking-tight">
                            Knowledge <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">Tracker</span>
                        </h1>
                    </div>
                    <p className="text-slate-400 text-base">Track your skill mastery — log a session each time you study.</p>
                </div>

                <button
                    onClick={() => setShowForm(v => !v)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-white font-semibold text-sm transition-all shadow-lg shadow-emerald-500/20"
                >
                    <Plus size={16} />
                    Add Skill
                </button>
            </div>

            {/* Summary Stats */}
            {skills.length > 0 && (
                <div className="grid grid-cols-3 gap-4">
                    {[
                        { label: 'Avg Health', value: `${avgMastery}%`, icon: TrendingUp, color: 'text-emerald-400' },
                        { label: 'Strong Topics', value: skills.filter(s => s.mastery >= 80).length, icon: Check, color: 'text-blue-400' },
                        { label: 'Weak Topics', value: skills.filter(s => s.mastery < 40).length, icon: Flame, color: 'text-red-400' },
                    ].map(({ label, value, icon: Icon, color }) => (
                        <div key={label} className="bg-slate-900/60 border border-white/8 rounded-2xl p-4 text-center hover:border-white/20 transition-all">
                            <Icon size={20} className={`mx-auto mb-2 ${color}`} />
                            <p className="text-2xl font-black text-white">{value}</p>
                            <p className="text-slate-500 text-xs mt-1">{label}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* Add Skill Form */}
            <AnimatePresence>
                {showForm && (
                    <motion.form
                        initial={{ opacity: 0, y: -12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -12 }}
                        onSubmit={handleAdd}
                        className="bg-slate-900/70 border border-emerald-500/20 rounded-2xl p-6 space-y-4"
                    >
                        <h3 className="text-white font-bold text-base">Add New Skill</h3>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Skill name */}
                            <div className="md:col-span-2">
                                <label className="text-xs text-slate-400 font-medium mb-1.5 block">Skill Name *</label>
                                <input
                                    value={newName}
                                    onChange={e => setNewName(e.target.value)}
                                    placeholder="e.g. React.js, Data Structures..."
                                    required
                                    className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 transition-colors"
                                />
                            </div>

                            {/* Starting mastery */}
                            <div>
                                <label className="text-xs text-slate-400 font-medium mb-1.5 block">
                                    Starting Mastery: <span className="text-emerald-400 font-bold">{newMastery}%</span>
                                </label>
                                <input
                                    type="range" min={0} max={100} step={5}
                                    value={newMastery}
                                    onChange={e => setNewMastery(Number(e.target.value))}
                                    className="w-full accent-emerald-500"
                                />
                            </div>
                        </div>

                        {/* Goal */}
                        <div>
                            <label className="text-xs text-slate-400 font-medium mb-1.5 block">Goal (optional)</label>
                            <input
                                value={newGoal}
                                onChange={e => setNewGoal(e.target.value)}
                                placeholder="e.g. Get to intermediate by June"
                                className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 transition-colors"
                            />
                        </div>

                        {formError && (
                            <p className="text-red-400 text-xs font-medium">{formError}</p>
                        )}

                        <div className="flex gap-3">
                            <button
                                type="submit"
                                disabled={adding}
                                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-xl text-white text-sm font-semibold transition-all"
                            >
                                {adding ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                                Add Skill
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowForm(false)}
                                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 text-sm font-semibold transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </motion.form>
                )}
            </AnimatePresence>

            {/* Loading */}
            {loading && (
                <div className="flex justify-center py-16">
                    <Loader2 size={32} className="animate-spin text-emerald-400" />
                </div>
            )}

            {/* Skill Grid */}
            {!loading && skills.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    <AnimatePresence>
                        {skills.map(skill => (
                            <SkillCard
                                key={skill.id}
                                skill={skill}
                                onIncrement={handleIncrement}
                                onDecrement={handleDecrement}
                                onDelete={handleDelete}
                            />
                        ))}
                    </AnimatePresence>
                </div>
            )}

            {/* Empty State */}
            {!loading && skills.length === 0 && (
                <div className="text-center py-20">
                    <Brain size={56} className="mx-auto text-slate-700 mb-4" />
                    <h3 className="text-xl text-white font-bold mb-2">No skills tracked yet</h3>
                    <p className="text-slate-500 mb-6 max-w-sm mx-auto">
                        Add your first skill and log a session every time you study it to visually track your growth.
                    </p>

                    {/* Quick-add presets */}
                    <div className="flex flex-wrap justify-center gap-2 max-w-xl mx-auto">
                        <p className="w-full text-xs text-slate-600 mb-1">Quick add popular skills:</p>
                        {PRESET_SKILLS.map(s => (
                            <button
                                key={s}
                                onClick={() => quickAdd(s)}
                                className="flex items-center gap-1 text-xs px-3 py-1.5 bg-slate-800/60 hover:bg-emerald-500/10 hover:border-emerald-500/30 border border-slate-700 text-slate-400 hover:text-emerald-400 rounded-full transition-all"
                            >
                                <BookOpen size={10} />
                                {s}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default KnowledgeTracker;
