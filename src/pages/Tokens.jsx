import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Zap, Gift, Users, Copy, Check,
    TrendingUp, Star, ChevronRight, Flame
} from 'lucide-react';
import { useTokens } from '../context/TokenContext';
import { useAuth } from '../context/AuthContext';
import { generateReferralLink } from '../lib/referral';

// ─── Animated Token Counter ───────────────────────────────────────────────────
const TokenCounter = ({ value }) => (
    <motion.div
        key={value}
        initial={{ scale: 1.4, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-400 to-amber-300"
    >
        {value}
    </motion.div>
);

// ─── Earn Card ────────────────────────────────────────────────────────────────
const EarnCard = ({ icon: Icon, title, description, badge, action, color }) => (
    <motion.div
        whileHover={{ scale: 1.02, y: -4 }}
        className="bg-slate-900/60 border border-white/10 rounded-2xl p-6 flex flex-col gap-4 hover:border-white/20 transition-all cursor-pointer"
        onClick={action}
    >
        <div className="flex items-start justify-between">
            <div className={`p-3 rounded-xl ${color}`}>
                <Icon size={22} className="text-white" />
            </div>
            <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${color} text-white`}>
                {badge}
            </span>
        </div>
        <div>
            <h3 className="text-white font-bold text-lg">{title}</h3>
            <p className="text-slate-400 text-sm mt-1">{description}</p>
        </div>
        <div className="flex items-center gap-1 text-blue-400 text-sm font-semibold">
            <span>Get started</span>
            <ChevronRight size={14} />
        </div>
    </motion.div>
);

// ─── Spend Row ────────────────────────────────────────────────────────────────
const SpendRow = ({ feature, cost }) => (
    <div className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
        <span className="text-slate-300 text-sm">{feature}</span>
        <span className="flex items-center gap-1 text-yellow-400 font-bold text-sm">
            <Zap size={13} />
            {cost} token{cost !== 1 ? 's' : ''}
        </span>
    </div>
);

// ─── Main Page ────────────────────────────────────────────────────────────────
const Tokens = () => {
    const { user } = useAuth();
    const { balance, totalEarned, loading, WELCOME_GRANT, REFERRAL_REWARD, TOKEN_COSTS } = useTokens();

    const [referralLink, setReferralLink] = useState('');
    const [copied, setCopied] = useState(false);
    const [toast, setToast] = useState(null);

    useEffect(() => {
        if (!user) return;
        generateReferralLink(user.uid).then(setReferralLink);
    }, [user]);

    const showToast = (msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    };

    const copyLink = () => {
        navigator.clipboard.writeText(referralLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
        showToast('Referral link copied! 🎉');
    };

    const spendItems = [
        { feature: '🤖 AI Planner message', cost: TOKEN_COSTS?.AI_SCHEDULE || 3 },
        { feature: '🔭 Interest Radar scan', cost: TOKEN_COSTS?.RADAR_SCAN || 2 },
        { feature: '📊 Analytics AI analysis', cost: TOKEN_COSTS?.ANALYZE || 4 },
        { feature: '🌱 Growth plan generation', cost: TOKEN_COSTS?.GROWTH_PLAN || 3 },
    ];

    return (
        <div className="space-y-8 pb-10 max-w-4xl mx-auto">

            {/* Toast */}
            <AnimatePresence>
                {toast && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-full text-white font-semibold shadow-2xl text-sm
                            ${toast.type === 'error' ? 'bg-red-500' : 'bg-emerald-500'}`}
                    >
                        {toast.msg}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Header */}
            <div>
                <h1 className="text-4xl font-bold text-white tracking-tight">
                    ⚡ <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-400">StudentOS Fuel</span>
                </h1>
                <p className="text-slate-400 mt-2 text-lg">New students ignite with <span className="text-yellow-400 font-bold">{WELCOME_GRANT} Fuel tokens</span>. Grow your stash by sharing StudentOS. Burn on AI power-ups.</p>
            </div>

            {/* Balance Hero */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative bg-gradient-to-br from-slate-900 to-slate-800 border border-yellow-500/20 rounded-3xl p-8 overflow-hidden"
            >
                <div className="absolute -top-16 -right-16 w-64 h-64 bg-yellow-400/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-orange-400/10 rounded-full blur-3xl pointer-events-none" />

                <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start justify-between gap-8">
                    <div className="text-center md:text-left">
                        <p className="text-slate-400 text-sm font-semibold uppercase tracking-widest mb-2">Current Balance</p>
                        {loading ? (
                            <div className="w-32 h-16 bg-white/5 rounded-2xl animate-pulse" />
                        ) : (
                            <TokenCounter value={balance} />
                        )}
                        <p className="text-slate-400 mt-2 text-sm">
                            <span className="text-yellow-400 font-bold">{totalEarned}</span> total earned all time
                        </p>
                    </div>

                    <div className="flex flex-col gap-3 min-w-[200px]">
                        <div className="bg-white/5 rounded-2xl p-4 flex items-center gap-3">
                            <div className="p-2 bg-yellow-500/20 rounded-xl">
                                <Flame size={18} className="text-yellow-400" />
                            </div>
                            <div>
                                <p className="text-xs text-slate-500">Ignition Grant</p>
                                <p className="text-white font-bold">+{WELCOME_GRANT} on launch</p>
                            </div>
                        </div>
                        <div className="bg-white/5 rounded-2xl p-4 flex items-center gap-3">
                            <div className="p-2 bg-green-500/20 rounded-xl">
                                <TrendingUp size={18} className="text-green-400" />
                            </div>
                            <div>
                                <p className="text-xs text-slate-500">Squad Bonus</p>
                                <p className="text-white font-bold">+{REFERRAL_REWARD} per squad recruit</p>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Earn Tokens */}
            <div>
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <Star size={20} className="text-yellow-400" /> Ways to Earn
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <EarnCard
                        icon={Flame}
                        title="Ignition Bonus"
                        description={`Every new StudentOS pilot gets ${WELCOME_GRANT} Fuel tokens on launch. Use them wisely to unlock AI superpowers!`}
                        badge={`+${WELCOME_GRANT} once`}
                        color="bg-orange-500/20"
                        action={() => showToast('Your Ignition Grant of 100 Fuel tokens is ready! ⚡')}
                    />
                    <EarnCard
                        icon={Users}
                        title="Recruit Your Squad"
                        description={`Drop your StudentOS link. Every recruit who activates earns you +${REFERRAL_REWARD} Fuel tokens — no cap.`}
                        badge={`+${REFERRAL_REWARD} per recruit`}
                        color="bg-purple-500/20"
                        action={copyLink}
                    />
                </div>
            </div>

            {/* Referral Link Box */}
            <div className="bg-slate-900/60 border border-purple-500/20 rounded-2xl p-6">
                <h3 className="text-white font-bold text-lg mb-1 flex items-center gap-2">
                    <Gift size={20} className="text-purple-400" /> Your StudentOS Referral Link
                </h3>
                <p className="text-slate-400 text-sm mb-4">Share it. When your recruit joins, you pocket <span className="text-green-400 font-semibold">+{REFERRAL_REWARD} Fuel tokens</span> instantly.</p>
                <div className="flex gap-3">
                    <input
                        readOnly
                        value={referralLink || 'Generating link...'}
                        className="flex-1 bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-slate-300 text-sm font-mono truncate"
                    />
                    <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={copyLink}
                        className="px-5 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold text-sm flex items-center gap-2 transition-colors"
                    >
                        {copied ? <><Check size={16} /> Copied!</> : <><Copy size={16} /> Copy</>}
                    </motion.button>
                </div>
            </div>

            {/* Spend Table */}
            <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-6">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <Zap size={20} className="text-yellow-400" /> Fuel Costs
                </h2>
                <p className="text-slate-400 text-sm mb-4">
                    StudentOS community-cached results are <span className="text-green-400 font-semibold">always free</span> — Fuel only burns on fresh AI engine calls.
                </p>
                <div>
                    {spendItems.map(item => (
                        <SpendRow key={item.feature} {...item} />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Tokens;
