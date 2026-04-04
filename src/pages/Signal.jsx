import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Radio, RefreshCw, ExternalLink, Loader2, Trophy,
    Briefcase, BookOpen, GraduationCap, Zap, Filter,
    TrendingUp, Clock, Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { fetchSignal, STATIC_FALLBACKS } from '../lib/signal';

// ─── Category tabs ─────────────────────────────────────────────────────────────
const TABS = [
    { id: 'all', label: 'All', icon: Sparkles },
    { id: 'hackathon', label: 'Hackathons', icon: Trophy },
    { id: 'internship', label: 'Internships', icon: Briefcase },
    { id: 'competition', label: 'Competitions', icon: TrendingUp },
    { id: 'research', label: 'Research', icon: BookOpen },
    { id: 'scholarship', label: 'Scholarships', icon: GraduationCap },
];

// ─── Colour palette per card ──────────────────────────────────────────────────
const COLOR_MAP = {
    blue: { border: 'border-blue-500/25', bg: 'bg-blue-500/8', badge: 'bg-blue-500/20 text-blue-300', dot: 'bg-blue-400' },
    purple: { border: 'border-purple-500/25', bg: 'bg-purple-500/8', badge: 'bg-purple-500/20 text-purple-300', dot: 'bg-purple-400' },
    green: { border: 'border-green-500/25', bg: 'bg-green-500/8', badge: 'bg-green-500/20 text-green-300', dot: 'bg-green-400' },
    orange: { border: 'border-orange-500/25', bg: 'bg-orange-500/8', badge: 'bg-orange-500/20 text-orange-300', dot: 'bg-orange-400' },
    yellow: { border: 'border-yellow-500/25', bg: 'bg-yellow-500/8', badge: 'bg-yellow-500/20 text-yellow-300', dot: 'bg-yellow-400' },
    indigo: { border: 'border-indigo-500/25', bg: 'bg-indigo-500/8', badge: 'bg-indigo-500/20 text-indigo-300', dot: 'bg-indigo-400' },
    teal: { border: 'border-teal-500/25', bg: 'bg-teal-500/8', badge: 'bg-teal-500/20 text-teal-300', dot: 'bg-teal-400' },
    red: { border: 'border-red-500/25', bg: 'bg-red-500/8', badge: 'bg-red-500/20 text-red-300', dot: 'bg-red-400' },
};

function getColors(color) {
    return COLOR_MAP[color] || COLOR_MAP.blue;
}

// ─── Relative time ─────────────────────────────────────────────────────────────
function relativeTime(date) {
    const mins = Math.floor((Date.now() - new Date(date)) / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days}d ago`;
    return `${Math.floor(days / 30)}mo ago`;
}

// ─── Skeleton loader ──────────────────────────────────────────────────────────
const Skeleton = () => (
    <div className="bg-slate-900/60 border border-white/8 rounded-2xl p-5 space-y-3 animate-pulse">
        <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/8" />
            <div className="h-3 w-24 rounded-full bg-white/8" />
        </div>
        <div className="h-4 w-3/4 rounded-full bg-white/8" />
        <div className="h-3 w-full rounded-full bg-white/8" />
        <div className="h-3 w-2/3 rounded-full bg-white/8" />
    </div>
);

// ─── Opportunity Card ─────────────────────────────────────────────────────────
const OpportunityCard = ({ item, index }) => {
    const c = getColors(item.color);

    return (
        <motion.a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04 }}
            whileHover={{ y: -3, scale: 1.01 }}
            className={`block bg-slate-900/60 border ${c.border} rounded-2xl p-5 hover:border-white/20 transition-all group cursor-pointer`}
        >
            <div className="flex items-start justify-between gap-3 mb-3">
                {/* Source badge */}
                <div className="flex items-center gap-2.5">
                    <div className={`w-9 h-9 rounded-xl ${c.bg} border ${c.border} flex items-center justify-center text-lg flex-shrink-0`}>
                        {item.emoji}
                    </div>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${c.badge}`}>
                        {item.source}
                    </span>
                </div>

                {/* Open link icon */}
                <ExternalLink
                    size={15}
                    className="text-slate-600 group-hover:text-slate-300 transition-colors flex-shrink-0 mt-1"
                />
            </div>

            {/* Title */}
            <h3 className="text-white font-semibold text-[15px] leading-snug mb-2 group-hover:text-blue-300 transition-colors line-clamp-2">
                {item.title}
            </h3>

            {/* Description */}
            {item.description && (
                <p className="text-slate-400 text-sm leading-relaxed line-clamp-2 mb-3">
                    {item.description}
                </p>
            )}

            {/* Tags + time */}
            <div className="flex items-center justify-between">
                <div className="flex gap-1.5 flex-wrap">
                    {item.tags.slice(0, 2).map(tag => (
                        <span key={tag} className="text-[11px] px-2 py-0.5 rounded-full bg-white/5 text-slate-500 capitalize">
                            {tag}
                        </span>
                    ))}
                </div>
                <div className="flex items-center gap-1 text-slate-600 text-xs">
                    <Clock size={11} />
                    {relativeTime(item.date)}
                </div>
            </div>
        </motion.a>
    );
};

// ─── Main page ─────────────────────────────────────────────────────────────────
const Signal = () => {
    const { profile } = useAuth();

    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('all');
    const [lastRefresh, setLastRefresh] = useState(null);
    const [liveCount, setLiveCount] = useState(0);

    const branch = profile?.branch || profile?.department || '';
    const interests = profile?.interests || [];

    const loadFeed = useCallback(async (tab = activeTab) => {
        setLoading(true);
        try {
            const results = await fetchSignal({
                branch,
                interests,
                filterTag: tab === 'all' ? null : tab,
            });

            if (results.length > 0) {
                setItems(results);
                setLiveCount(results.length);
            } else {
                // All RSS feeds failed — show curated fallbacks
                const fallbacks = tab === 'all'
                    ? STATIC_FALLBACKS
                    : STATIC_FALLBACKS.filter(f => f.tags.includes(tab));
                setItems(fallbacks);
                setLiveCount(0);
            }
        } catch {
            setItems(STATIC_FALLBACKS);
            setLiveCount(0);
        } finally {
            setLoading(false);
            setLastRefresh(new Date());
        }
    }, [branch, interests, activeTab]);

    // Initial load
    useEffect(() => { loadFeed(); }, []);  // eslint-disable-line

    // Tab switch
    const handleTab = (tabId) => {
        setActiveTab(tabId);
        setItems([]);
        loadFeed(tabId);
    };

    return (
        <div className="space-y-6 pb-10 max-w-5xl mx-auto">

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-red-500/15 border border-red-500/25 rounded-xl">
                            <Radio size={20} className="text-red-400" />
                        </div>
                        <h1 className="text-4xl font-bold text-white tracking-tight">
                            The{' '}
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-400">
                                Signal
                            </span>
                        </h1>
                        {/* Live pulsing dot */}
                        <span className="flex items-center gap-1.5 text-xs font-bold text-red-400">
                            <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                            LIVE
                        </span>
                    </div>
                    <p className="text-slate-400 text-base">
                        StudentOS-curated opportunities — tuned for{' '}
                        <span className="text-white font-semibold">
                            {branch || 'your field'}
                        </span>
                        . Cut the noise. Catch your wave.
                    </p>
                </div>

                {/* Refresh button + last updated */}
                <div className="flex items-center gap-3">
                    {lastRefresh && (
                        <span className="text-xs text-slate-600">
                            Updated {relativeTime(lastRefresh)}
                        </span>
                    )}
                    <motion.button
                        whileTap={{ rotate: 360 }}
                        transition={{ duration: 0.5 }}
                        onClick={() => { setItems([]); loadFeed(activeTab); }}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-white/10 rounded-xl text-slate-300 text-sm font-semibold transition-colors disabled:opacity-50"
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                        Refresh
                    </motion.button>
                </div>
            </div>

            {/* Stats */}
            {!loading && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex gap-4 flex-wrap"
                >
                    <div className="flex items-center gap-2 bg-slate-900/60 border border-white/8 rounded-xl px-4 py-2.5">
                        <Zap size={14} className="text-yellow-400" />
                        <span className="text-white font-bold text-sm">{items.length}</span>
                        <span className="text-slate-500 text-sm">opportunities</span>
                    </div>
                    {liveCount > 0 ? (
                        <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-2.5">
                            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                            <span className="text-green-300 font-semibold text-sm">{liveCount} live pulls via StudentOS Signal</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 bg-slate-900/60 border border-white/8 rounded-xl px-4 py-2.5">
                            <span className="text-slate-500 text-sm">📌 Curated picks</span>
                        </div>
                    )}
                    {(branch || interests.length > 0) && (
                        <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-xl px-4 py-2.5">
                            <Filter size={13} className="text-blue-400" />
                            <span className="text-blue-300 text-sm font-medium">
                                Filtered for {branch || interests.join(', ')}
                            </span>
                        </div>
                    )}
                </motion.div>
            )}

            {/* Category tabs */}
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                {TABS.map(tab => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => handleTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all flex-shrink-0 ${activeTab === tab.id
                                    ? 'bg-white text-slate-900 shadow-lg'
                                    : 'bg-slate-900/60 border border-white/10 text-slate-400 hover:text-white hover:border-white/20'
                                }`}
                        >
                            <Icon size={14} />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Feed grid */}
            <AnimatePresence mode="wait">
                {loading ? (
                    <motion.div
                        key="skeleton"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="grid grid-cols-1 md:grid-cols-2 gap-4"
                    >
                        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} />)}
                    </motion.div>
                ) : items.length === 0 ? (
                    <motion.div
                        key="empty"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center py-20 text-slate-500"
                    >
                        <Radio size={48} className="mx-auto mb-4 opacity-30" />
                        <p className="text-lg font-semibold">📵 StudentOS Signal is tuning in…</p>
                        <p className="text-sm mt-1">Switch tabs or hit Refresh to scan for live opportunities.</p>
                    </motion.div>
                ) : (
                    <motion.div
                        key="feed"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="grid grid-cols-1 md:grid-cols-2 gap-4"
                    >
                        {items.map((item, i) => (
                            <OpportunityCard key={item.id} item={item} index={i} />
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Footer tip */}
            {!loading && items.length > 0 && (
                <p className="text-center text-slate-600 text-xs pt-2">
                    ⚡ Powered by StudentOS Signal · Personalized for your branch · Tap any card to dive in
                </p>
            )}
        </div>
    );
};

export default Signal;
