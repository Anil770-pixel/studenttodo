import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, CheckSquare, Trophy, Calendar, Bot, BarChart2, BookOpen, LogOut, ChevronUp, User, Zap, Radio, CalendarDays, Brain, Bell, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useTokens } from '../context/TokenContext';
import { useReminders } from '../context/ReminderContext';
import NotificationCenter from './NotificationCenter';

const Sidebar = () => {
    const { user, profile, logout } = useAuth();
    const { balance, loading: tokenLoading } = useTokens();
    const reminders = useReminders();
    const urgentCount = reminders?.urgentCount || 0;
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const [isNotificationOpen, setIsNotificationOpen] = useState(false);

    // Derive display data from Context (Profile > Auth > Fallback)
    const displayName = profile?.fullName || profile?.full_name || user?.name || user?.email?.split('@')[0] || 'Student';
    const email = profile?.email || user?.email || '';

    // Generate initials
    const initials = displayName
        .split(' ')
        .map(n => n[0] || '')
        .join('')
        .toUpperCase()
        .slice(0, 2);

    const navGroups = [
        {
            category: "Today",
            items: [
                { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
            ]
        },
        {
            category: "Plan",
            items: [
                { icon: CheckSquare, label: 'Tasks', path: '/todos' },
                { icon: Calendar, label: 'Schedule', path: '/calendar' },
                { icon: Shield, label: 'Assessment Shield', path: '/assessments' },
                { icon: Bot, label: 'AI Planner', path: '/ai-schedule' },
            ]
        },
        {
            category: "Learn",
            items: [
                { icon: Brain, label: 'Knowledge Tracker', path: '/knowledge' },
            ]
        },
        {
            category: "Grow",
            items: [
                { icon: Trophy, label: 'Opportunities', path: '/competitions' },
                { icon: Radio, label: 'The Signal', path: '/signal' },
                { icon: CalendarDays, label: 'Hack Month', path: '/hack-your-month' },
            ]
        },
        {
            category: "Review",
            items: [
                { icon: BarChart2, label: 'Analytics & Health', path: '/analytics' },
            ]
        }
    ];

    return (
        <aside className="fixed left-0 top-0 h-screen w-64 bg-slate-950/50 backdrop-blur-xl border-r border-white/5 flex flex-col z-50">
            <div className="flex flex-col pt-6 pb-4 border-b border-white/5 space-y-4 px-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/20 rounded-xl">
                        <BookOpen className="w-5 h-5 text-primary" />
                    </div>
                    <span className="font-bold text-[18px] tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary-light via-accent-purple to-accent-cyan">
                        StudentOS
                    </span>
                </div>
                
                {/* Notification Bell */}
                <button 
                    onClick={() => setIsNotificationOpen(true)}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-800 transition-all text-slate-300"
                >
                    <div className="flex items-center gap-2">
                        <Bell size={16} className={urgentCount > 0 ? "text-red-400" : ""} />
                        <span className="text-xs font-semibold">Action Center</span>
                    </div>
                    {urgentCount > 0 && (
                        <div className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-[10px] font-bold border border-red-500/20 animate-pulse">
                            {urgentCount}
                        </div>
                    )}
                </button>
            </div>

            <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-6 custom-scrollbar">
                {navGroups.map((group, idx) => (
                    <div key={idx} className="space-y-1">
                        <div className="px-4 mb-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                            {group.category}
                        </div>
                        {group.items.map((item) => (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                className={({ isActive }) =>
                                    `relative flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 group overflow-hidden ${isActive
                                        ? 'text-white bg-primary/10 border border-primary/20'
                                        : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                                    }`
                                }
                            >
                                {({ isActive }) => (
                                    <>
                                        <div className={`relative z-10 flex items-center gap-3 ${isActive ? 'text-primary-light' : ''}`}>
                                            <item.icon className={`w-[18px] h-[18px] transition-transform group-hover:scale-110 ${isActive ? 'text-primary' : ''}`} />
                                            <span>{item.label}</span>
                                        </div>
                                    </>
                                )}
                            </NavLink>
                        ))}
                    </div>
                ))}
            </nav>

            {/* Token balance chip */}
            <NavLink to="/tokens" className="mx-4 mb-2 flex items-center justify-between bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/20 rounded-xl px-4 py-2.5 transition-all group">
                <div className="flex items-center gap-2">
                    <Zap size={15} className="text-yellow-400" />
                    <span className="text-xs font-semibold text-yellow-300">Tokens</span>
                </div>
                <motion.span
                    key={balance}
                    initial={{ scale: 1.3, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className={`text-sm font-black ${tokenLoading ? 'text-slate-500' :
                        balance < 5 ? 'text-red-400 animate-pulse' :
                            'text-yellow-300'
                        }`}
                >
                    {tokenLoading ? '...' : balance}
                </motion.span>
            </NavLink>

            <div className="p-4 border-t border-white/5 relative">
                <AnimatePresence>
                    {showProfileMenu && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className="absolute bottom-20 left-4 right-4 bg-slate-900 border border-white/10 rounded-xl shadow-xl overflow-hidden z-50 mb-2"
                        >
                            <NavLink
                                to="/profile" // This links to Profile.jsx
                                onClick={() => setShowProfileMenu(false)}
                                className="w-full h-full flex items-center gap-3 px-4 py-3 text-slate-300 hover:bg-white/5 hover:text-white transition-colors text-sm font-medium"
                            >
                                <User className="w-4 h-4" /> {/* Changed icon to User for Profile */}
                                Edit Profile
                            </NavLink>
                            <div className="h-px bg-white/5 my-1" />
                            <button
                                onClick={() => {
                                    logout();
                                    setShowProfileMenu(false);
                                }}
                                className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-white/5 transition-colors text-sm font-medium z-50 cursor-pointer"
                            >
                                <LogOut className="w-4 h-4" />
                                Sign Out
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>

                <button
                    onClick={() => setShowProfileMenu(!showProfileMenu)}
                    className="w-full p-3 bg-slate-900/30 hover:bg-white/5 rounded-2xl transition-all border border-transparent hover:border-white/5 flex items-center justify-between group"
                >
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary to-accent-purple flex items-center justify-center text-sm font-bold text-white shadow-glow">
                                {initials}
                            </div>
                            {profile?.streak?.count > 0 && (
                                <div className="absolute -top-1 -right-1 bg-orange-500 text-white text-[8px] font-black px-1 py-0.5 rounded-full border border-slate-900 flex items-center gap-0.5">
                                    <Flame size={8} fill="currentColor" /> {profile.streak.count}
                                </div>
                            )}
                        </div>
                        <div className="text-left w-[110px]">
                            <p className="text-sm font-medium text-white group-hover:text-primary-light transition-colors truncate" title={displayName}>{displayName}</p>
                            <p className="text-xs text-slate-500 truncate" title={email}>{email}</p>
                        </div>
                    </div>
                    <ChevronUp className={`w-4 h-4 text-slate-500 transition-transform ${showProfileMenu ? 'rotate-180' : ''}`} />
                </button>
            </div>

            {/* Copyright Notice */}
            <div className="px-6 py-3 border-t border-white/5">
                <p className="text-[10px] text-slate-600 text-center leading-relaxed">
                    &copy; {new Date().getFullYear()} StudentOS. All rights reserved.<br />
                    <span className="text-slate-700">Built for student success.</span>
                </p>
            </div>

            <NotificationCenter isOpen={isNotificationOpen} onClose={() => setIsNotificationOpen(false)} />
        </aside>
    );
};

export default Sidebar;
