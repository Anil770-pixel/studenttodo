import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ChevronLeft, ChevronRight, CheckCircle2, Circle,
    Zap, Loader2, Lock, Sparkles, RefreshCw, Calendar
} from 'lucide-react';
import { db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { useTokens } from '../context/TokenContext';
import { generateHackMonth } from '../lib/groq';

// ─── Activity type styles ─────────────────────────────────────────────────────
const TYPES = {
    apply: { label: 'Apply', bg: 'bg-blue-500/20', border: 'border-blue-500/30', text: 'text-blue-300', dot: 'bg-blue-400' },
    learn: { label: 'Learn', bg: 'bg-purple-500/20', border: 'border-purple-500/30', text: 'text-purple-300', dot: 'bg-purple-400' },
    network: { label: 'Network', bg: 'bg-green-500/20', border: 'border-green-500/30', text: 'text-green-300', dot: 'bg-green-400' },
    create: { label: 'Create', bg: 'bg-orange-500/20', border: 'border-orange-500/30', text: 'text-orange-300', dot: 'bg-orange-400' },
    compete: { label: 'Compete', bg: 'bg-red-500/20', border: 'border-red-500/30', text: 'text-red-300', dot: 'bg-red-400' },
    reflect: { label: 'Reflect', bg: 'bg-teal-500/20', border: 'border-teal-500/30', text: 'text-teal-300', dot: 'bg-teal-400' },
    rest: { label: 'Rest', bg: 'bg-slate-500/15', border: 'border-slate-500/20', text: 'text-slate-400', dot: 'bg-slate-500' },
};

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function dateKey(y, m, d) {
    return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}
function getDaysInMonth(y, m) { return new Date(y, m + 1, 0).getDate(); }
function getFirstWeekday(y, m) { return new Date(y, m, 1).getDay(); }
function monthDocId(y, m) { return `${y}-${String(m + 1).padStart(2, '0')}`; }

// ─── Firestore helpers ────────────────────────────────────────────────────────
async function loadMonthFromFirestore(uid, y, m) {
    const ref = doc(db, 'users', uid, 'hackYourMonth', monthDocId(y, m));
    const snap = await getDoc(ref);
    return snap.exists() ? snap.data().challenges : null;
}
async function saveMonthToFirestore(uid, y, m, challenges) {
    const ref = doc(db, 'users', uid, 'hackYourMonth', monthDocId(y, m));
    await setDoc(ref, { challenges, generatedAt: new Date().toISOString() });
}

// ─── localStorage for completed days ─────────────────────────────────────────
const LS_KEY = 'studentos_hym_done';
function loadDone() { try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch { return []; } }
function saveDone(arr) { localStorage.setItem(LS_KEY, JSON.stringify(arr)); }

// ─── Single Day Card ──────────────────────────────────────────────────────────
const DayCard = ({ day, year, month, challenge, done, isToday, onToggle }) => {
    const key = dateKey(year, month, day);
    const t = challenge ? (TYPES[challenge.type] || TYPES.reflect) : null;

    return (
        <motion.div
            whileHover={challenge ? { scale: 1.05, zIndex: 20 } : {}}
            onClick={() => challenge && onToggle(key)}
            className={`relative rounded-xl border p-2 flex flex-col gap-1 min-h-[90px] transition-all
                ${challenge
                    ? done
                        ? 'bg-green-500/10 border-green-500/30 cursor-pointer'
                        : `${t.bg} ${t.border} cursor-pointer`
                    : 'bg-slate-900/20 border-white/4 opacity-30'
                }
                ${isToday ? 'ring-2 ring-white/40' : ''}
            `}
        >
            {/* Day number */}
            <div className="flex items-center justify-between">
                <span className={`text-xs font-black leading-none
                    ${isToday
                        ? 'text-white bg-blue-600 w-5 h-5 rounded-full flex items-center justify-center'
                        : 'text-slate-500'
                    }`}>
                    {day}
                </span>
                {challenge && (done
                    ? <CheckCircle2 size={12} className="text-green-400" />
                    : <Circle size={11} className="text-slate-600 opacity-50" />
                )}
            </div>

            {challenge && (
                <>
                    <span className="text-base leading-none">{challenge.emoji}</span>
                    <p className={`text-[10px] leading-tight font-medium
                        ${done ? 'text-green-300 line-through opacity-60' : t.text}`}>
                        {challenge.text}
                    </p>
                    <span className={`self-start mt-auto text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full
                        ${done ? 'bg-green-500/20 text-green-400' : `${t.bg} ${t.text}`}`}>
                        {done ? '✓ done' : challenge.type}
                    </span>
                </>
            )}
        </motion.div>
    );
};

// ─── Token Gate Screen ────────────────────────────────────────────────────────
const TokenGate = ({ month, year, onGenerate, generating, canAfford, balance, cost }) => (
    <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="min-h-[60vh] flex items-center justify-center"
    >
        <div className="max-w-sm w-full text-center space-y-6">
            {/* Lock icon */}
            <div className="relative mx-auto w-20 h-20">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-600/30 to-blue-600/20 rounded-full blur-xl animate-pulse" />
                <div className="w-20 h-20 bg-gradient-to-br from-purple-700 to-blue-700 rounded-2xl flex items-center justify-center relative">
                    <Lock size={32} className="text-white" />
                </div>
            </div>

            <div>
                <h2 className="text-2xl font-black text-white">
                    Hack Your{' '}
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-orange-300">
                        {MONTHS[month]}
                    </span>
                </h2>
                <p className="text-slate-400 text-sm mt-2">
                    Let AI build a personal daily challenge plan for you —<br />
                    one small action every day of the month.
                </p>
            </div>

            {/* Feature bullets */}
            <div className="bg-slate-800/60 border border-white/8 rounded-2xl p-5 text-left space-y-3">
                {[
                    ['🎯', 'Personalized to your branch & interests'],
                    ['📅', `${getDaysInMonth(year, month)} days, 1 challenge each`],
                    ['✅', 'Mark days done & track your streak'],
                    ['💾', 'Saved to your account permanently'],
                ].map(([e, t]) => (
                    <div key={t} className="flex items-start gap-3">
                        <span className="text-base flex-shrink-0">{e}</span>
                        <span className="text-slate-300 text-sm">{t}</span>
                    </div>
                ))}
            </div>

            {/* Token cost pill */}
            <div className="flex items-center justify-center gap-3">
                <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 px-4 py-2 rounded-full">
                    <Zap size={16} className="text-yellow-400" />
                    <span className="text-yellow-300 font-bold text-sm">{cost} tokens</span>
                </div>
                <span className="text-slate-600 text-sm">·</span>
                <span className="text-slate-500 text-sm">Balance: <span className="text-white font-semibold">{balance}</span></span>
            </div>

            {/* CTA */}
            <motion.button
                whileHover={canAfford ? { scale: 1.04 } : {}}
                whileTap={canAfford ? { scale: 0.97 } : {}}
                onClick={canAfford ? onGenerate : undefined}
                disabled={!canAfford || generating}
                className={`w-full py-4 rounded-2xl font-black text-base flex items-center justify-center gap-3 transition-all
                    ${canAfford
                        ? 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-lg shadow-purple-900/30'
                        : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                    }`}
            >
                {generating ? (
                    <><Loader2 size={20} className="animate-spin" /> AI is building your plan…</>
                ) : canAfford ? (
                    <><Sparkles size={20} /> Generate with AI  <span className="opacity-60 text-sm font-normal">−{cost} ⚡</span></>
                ) : (
                    <><Lock size={18} /> Not enough tokens (need {cost})</>
                )}
            </motion.button>

            {!canAfford && (
                <p className="text-slate-600 text-xs">
                    You earn {10} free tokens daily. Come back tomorrow!
                </p>
            )}
        </div>
    </motion.div>
);

// ─── Main Page ────────────────────────────────────────────────────────────────
const HackYourMonth = () => {
    const today = new Date();
    const { user, profile } = useAuth();
    const { balance, spendTokens, canAfford, TOKEN_COSTS, DAILY_GRANT } = useTokens();

    const [year, setYear] = useState(today.getFullYear());
    const [month, setMonth] = useState(today.getMonth());
    const [challenges, setChallenges] = useState(null);   // null = not generated yet
    const [generating, setGenerating] = useState(false);
    const [loading, setLoading] = useState(true);
    const [done, setDone] = useState(() => loadDone());

    const COST = TOKEN_COSTS?.HACK_YOUR_MONTH || 5;

    // Load saved challenges from Firestore when month changes
    useEffect(() => {
        if (!user) { setLoading(false); return; }
        setLoading(true);
        setChallenges(null);
        loadMonthFromFirestore(user.uid, year, month)
            .then(data => setChallenges(data || null))
            .catch(() => setChallenges(null))
            .finally(() => setLoading(false));
    }, [user, year, month]);

    const handleGenerate = useCallback(async () => {
        if (!user || generating) return;
        setGenerating(true);

        const ok = await spendTokens(COST, 'Hack Your Month');
        if (!ok) { setGenerating(false); return; }

        try {
            const branch = profile?.branch || profile?.major || 'Engineering';
            const interests = profile?.interests || [];
            const data = await generateHackMonth(month, year, branch, interests);

            if (Object.keys(data).length > 0) {
                await saveMonthToFirestore(user.uid, year, month, data);
                setChallenges(data);
            } else {
                alert('AI returned an empty plan. Your tokens have been refunded would require manual retry.');
            }
        } catch (err) {
            console.error('generateHackMonth error:', err);
            alert('Generation failed. Please try again.');
        } finally {
            setGenerating(false);
        }
    }, [user, profile, month, year, COST, generating, spendTokens]);

    const toggleDay = (key) => {
        const next = done.includes(key) ? done.filter(k => k !== key) : [...done, key];
        setDone(next);
        saveDone(next);
    };

    const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
    const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };

    const daysInMonth = getDaysInMonth(year, month);
    const firstWeekday = getFirstWeekday(year, month);
    const mk = `${year}-${String(month + 1).padStart(2, '0')}`;
    const doneThisMonth = done.filter(k => k.startsWith(mk)).length;
    const totalChallenges = challenges ? Object.keys(challenges).filter(k => k.startsWith(mk)).length : 0;

    const cells = [
        ...Array.from({ length: firstWeekday }, (_, i) => ({ type: 'empty', i })),
        ...Array.from({ length: daysInMonth }, (_, i) => ({ type: 'day', day: i + 1 })),
    ];

    return (
        <div className="max-w-5xl mx-auto pb-12 space-y-6">

            {/* ── Header Banner ── */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-700 via-purple-700 to-indigo-900 p-8">
                <div className="absolute -top-10 -right-10 w-56 h-56 bg-white/10 rounded-full blur-3xl" />
                <div className="absolute -bottom-8 -left-8 w-36 h-36 bg-blue-400/20 rounded-full blur-2xl" />

                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                                <Zap size={20} className="text-yellow-300" fill="currentColor" />
                            </div>
                            <span className="text-blue-200 text-xs font-black tracking-widest uppercase">StudentOS</span>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black text-white leading-tight">
                            Hack Your<br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-orange-400">
                                {MONTHS[month]}
                            </span>
                        </h1>
                        <p className="text-blue-200 text-sm mt-2">
                            AI-generated daily challenges, built for <span className="text-white font-semibold">you</span>.
                        </p>
                    </div>

                    {challenges && (
                        <div className="flex items-center gap-8">
                            <div className="text-center">
                                <p className="text-5xl font-black text-white">{doneThisMonth}</p>
                                <p className="text-blue-200 text-xs mt-1">completed</p>
                            </div>
                            <div className="text-center">
                                <p className="text-5xl font-black text-yellow-300">{totalChallenges}</p>
                                <p className="text-blue-200 text-xs mt-1">challenges</p>
                            </div>
                            <div className="hidden md:flex flex-col items-end gap-1">
                                <div className="w-28 h-2 bg-white/20 rounded-full overflow-hidden">
                                    <motion.div
                                        className="h-full bg-yellow-400 rounded-full"
                                        initial={{ width: 0 }}
                                        animate={{ width: totalChallenges ? `${Math.round(doneThisMonth / totalChallenges * 100)}%` : '0%' }}
                                        transition={{ duration: 0.8 }}
                                    />
                                </div>
                                <p className="text-blue-300 text-xs">
                                    {totalChallenges ? Math.round(doneThisMonth / totalChallenges * 100) : 0}% done
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Month Nav ── */}
            <div className="flex items-center justify-between">
                <button onClick={prevMonth} className="p-2.5 bg-slate-800 hover:bg-slate-700 border border-white/10 rounded-xl text-slate-300 transition-colors">
                    <ChevronLeft size={20} />
                </button>
                <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-black text-white">{MONTHS[month]} {year}</h2>
                    {challenges && (
                        <button
                            onClick={() => setChallenges(null)}
                            title="Regenerate (costs tokens)"
                            className="p-1.5 text-slate-600 hover:text-slate-300 rounded-lg transition-colors"
                        >
                            <RefreshCw size={15} />
                        </button>
                    )}
                </div>
                <button onClick={nextMonth} className="p-2.5 bg-slate-800 hover:bg-slate-700 border border-white/10 rounded-xl text-slate-300 transition-colors">
                    <ChevronRight size={20} />
                </button>
            </div>

            {/* ── Content ── */}
            {loading ? (
                <div className="flex items-center justify-center min-h-[300px] gap-3 text-slate-400">
                    <Loader2 className="animate-spin" size={22} />
                    <span>Loading your calendar…</span>
                </div>
            ) : !challenges ? (
                <TokenGate
                    month={month}
                    year={year}
                    onGenerate={handleGenerate}
                    generating={generating}
                    canAfford={canAfford(COST)}
                    balance={balance}
                    cost={COST}
                />
            ) : (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                >
                    {/* Legend */}
                    <div className="flex flex-wrap gap-2">
                        {Object.entries(TYPES).map(([k, v]) => (
                            <div key={k} className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-semibold ${v.bg} ${v.border} ${v.text}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${v.dot}`} />
                                {v.label}
                            </div>
                        ))}
                    </div>

                    {/* Calendar grid */}
                    <div className="overflow-x-auto">
                        <div className="min-w-[540px]">
                            {/* Week headers */}
                            <div className="grid grid-cols-7 gap-1.5 mb-1.5">
                                {DAYS.map(d => (
                                    <div key={d} className="text-center text-[10px] font-black text-slate-500 py-1 uppercase tracking-widest">
                                        {d}
                                    </div>
                                ))}
                            </div>

                            {/* Day cells */}
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={`${year}-${month}`}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    transition={{ duration: 0.2 }}
                                    className="grid grid-cols-7 gap-1.5"
                                >
                                    {cells.map((cell, idx) => {
                                        if (cell.type === 'empty') return <div key={`e${idx}`} className="min-h-[90px]" />;
                                        const key = dateKey(year, month, cell.day);
                                        const challenge = challenges?.[key] || null;
                                        const isToday = cell.day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
                                        return (
                                            <DayCard
                                                key={key}
                                                day={cell.day}
                                                year={year}
                                                month={month}
                                                challenge={challenge}
                                                done={done.includes(key)}
                                                isToday={isToday}
                                                onToggle={toggleDay}
                                            />
                                        );
                                    })}
                                </motion.div>
                            </AnimatePresence>
                        </div>
                    </div>

                    <p className="text-center text-slate-600 text-xs pt-2">
                        Tap any day to mark complete · Progress saves automatically · Use 🔄 to regenerate (costs {COST} tokens)
                    </p>
                </motion.div>
            )}
        </div>
    );
};

export default HackYourMonth;
