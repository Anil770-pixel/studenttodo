/**
 * ============================================================
 * ReminderBanner — Smart Deadline Reminder System
 * ============================================================
 * Shows a dismissible banner at the top of any page when the
 * student has tasks/events due within 24 hours.
 * Auto-refreshes every 5 minutes for live awareness.
 * ============================================================
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, Clock, ChevronRight, Flame } from 'lucide-react';
import { collection, query, limit, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

// How many hours ahead to warn about
const WARNING_HOURS = 24;

const ReminderBanner = () => {
    const { user, profile } = useAuth();
    const navigate = useNavigate();
    const [upcoming, setUpcoming] = useState([]);    // { title, dueIn }
    const [streakAtRisk, setStreakAtRisk] = useState(false);
    const [dismissed, setDismissed] = useState(false);
    const [overdueCount, setOverdueCount] = useState(0);

    // ─── Fetch upcoming tasks due soon ────────────────────────────────────────
    useEffect(() => {
        if (!user) return;

        const checkStreak = () => {
            const missionStreaks = profile?.missionStreaks || (profile?.missionStreak ? [profile.missionStreak] : []);
            const generalStreak = profile?.streak;
            
            let overdueMissions = [];
            const now = new Date();

            missionStreaks.forEach(m => {
                const targetTime = m.targetTime || "21:00";
                const [targetH, targetM] = targetTime.split(":").map(Number);
                const targetToday = new Date(now);
                targetToday.setHours(targetH, targetM, 0, 0);

                const todayStr = now.toISOString().split('T')[0];
                const lastAction = m.lastActionDate ? (m.lastActionDate.toDate ? m.lastActionDate.toDate().toISOString().split('T')[0] : new Date(m.lastActionDate).toISOString().split('T')[0]) : null;
                const isDoneToday = lastAction === todayStr;

                if (m.status === 'risk' || (now > targetToday && !isDoneToday)) {
                    overdueMissions.push(m.goal || "Mission");
                }
            });

            if (overdueMissions.length > 0 || (generalStreak?.status === 'risk')) {
                setStreakAtRisk(true);
                setDismissed(false);
                setOverdueCount(overdueMissions.length);
            } else {
                setStreakAtRisk(false);
            }
        };

        const fetchUpcoming = async () => {
            try {
                const tasksRef = collection(db, 'users', user.uid, 'tasks');
                const snap = await getDocs(query(tasksRef, limit(50)));
                const now = new Date();
                const cutoff = new Date(now.getTime() + WARNING_HOURS * 60 * 60 * 1000);

                const dueSoon = snap.docs
                    .map(d => d.data())
                    .filter(t => {
                        if (t.completed) return false;
                        if (!t.date) return false;
                        const dueDate = new Date(t.date);
                        return dueDate >= now && dueDate <= cutoff;
                    })
                    .map(t => {
                        const dueDate = new Date(t.date);
                        const diffMs = dueDate - now;
                        const diffH = Math.floor(diffMs / 3600000);
                        const diffM = Math.floor((diffMs % 3600000) / 60000);
                        const dueIn = diffH > 0 ? `${diffH}h ${diffM}m` : `${diffM}m`;
                        return { title: t.title, dueIn, category: t.category };
                    })
                    .slice(0, 3); // Show max 3

                setUpcoming(dueSoon);
                if (dueSoon.length > 0) setDismissed(false); // Re-show if new items
            } catch (e) {
                console.warn('ReminderBanner: fetch failed', e);
            }
        };

        checkStreak();
        fetchUpcoming();
        // Refresh every 5 minutes
        const interval = setInterval(() => {
            checkStreak();
            fetchUpcoming();
        }, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, [user, profile]);

    // Don't render if no upcoming tasks/streak risks or dismissed
    if ((!upcoming.length && !streakAtRisk) || dismissed) return null;

    const categoryColor = (cat) => {
        if (cat === 'Exam') return 'text-red-400';
        if (cat === 'Competition') return 'text-purple-400';
        return 'text-cyan-400';
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="mb-4 relative flex items-start gap-3 px-4 py-3 bg-orange-500/10 border border-orange-500/25 rounded-2xl backdrop-blur-sm"
            >
                {/* Icon */}
                <div className="p-2 bg-orange-500/15 rounded-xl flex-shrink-0 mt-0.5">
                    <Bell size={16} className="text-orange-400" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    {streakAtRisk && (
                        <div className="mb-2 p-2.5 bg-red-500/20 border border-red-500/30 rounded-xl flex items-center justify-between gap-4 animate-in fade-in slide-in-from-left-4 duration-500 shadow-lg shadow-red-500/10">
                           <div className="flex items-center gap-3">
                                <Flame size={18} className="text-red-500 animate-pulse" />
                                <div className="min-w-0">
                                    <p className="text-red-400 font-black text-[10px] uppercase tracking-widest leading-none mb-1">Attention Required</p>
                                    <p className="text-white font-bold text-xs truncate max-w-[200px]">{overdueCount || 1} {overdueCount === 1 ? 'Mission' : 'Missions'} Overdue!</p>
                                </div>
                           </div>
                           <button onClick={() => navigate('/dashboard')} className="text-[10px] font-black bg-red-500 text-white px-4 py-2 rounded-lg uppercase transition-transform hover:scale-105 active:scale-95 whitespace-nowrap">Rescue All</button>
                        </div>
                    )}
                    
                    {upcoming.length > 0 && (
                        <>
                            <p className="text-orange-300 font-semibold text-sm mb-1.5 flex items-center gap-2">
                                ⚡ {upcoming.length} high-priority deadline{upcoming.length > 1 ? 's' : ''} approaching!
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {upcoming.map((item, i) => (
                                    <span key={i} className="flex items-center gap-1.5 text-xs bg-white/5 border border-white/8 rounded-lg px-2.5 py-1">
                                        <Clock size={10} className="text-orange-400" />
                                        <span className={`font-semibold ${categoryColor(item.category)}`}>{item.category}</span>
                                        <span className="text-slate-300 truncate max-w-[120px]">{item.title}</span>
                                        <span className="text-orange-400 font-bold">· {item.dueIn}</span>
                                    </span>
                                ))}
                            </div>
                        </>
                    )}
                </div>

                {/* Go to Tasks CTA */}
                <button
                    onClick={() => navigate('/todos')}
                    className="flex items-center gap-1 text-xs font-semibold text-orange-300 hover:text-orange-200 transition-colors flex-shrink-0 mt-1 self-start"
                >
                    View <ChevronRight size={13} />
                </button>

                {/* Dismiss */}
                <button
                    onClick={() => setDismissed(true)}
                    className="p-1 text-slate-600 hover:text-slate-400 transition-colors flex-shrink-0"
                    title="Dismiss reminders"
                >
                    <X size={14} />
                </button>
            </motion.div>
        </AnimatePresence>
    );
};

export default ReminderBanner;
