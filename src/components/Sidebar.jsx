import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, CheckSquare, Trophy, Calendar, Bot, BarChart2, BookOpen, LogOut, ChevronUp, User, Zap, Radio, CalendarDays, Brain, Bell, Shield, LayoutGrid, X } from 'lucide-react';
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
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
        <>
            {/* Desktop Sidebar */}
            <aside className="hidden md:flex fixed left-0 top-0 h-screen w-64 bg-slate-950/50 backdrop-blur-xl border-r border-white/5 flex flex-col z-50">
                <div className="flex flex-col pt-6 pb-4 border-b border-white/5 space-y-4 px-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/20 rounded-xl">
                            <BookOpen className="w-5 h-5 text-primary" />
                        </div>
                        <span className="font-bold text-[18px] tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary-light via-accent-purple to-accent-cyan">
                            StudentOS
                        </span>
                    </div>
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
                                        <div className={`relative z-10 flex items-center gap-3 ${isActive ? 'text-primary-light' : ''}`}>
                                            <item.icon className={`w-[18px] h-[18px] transition-transform group-hover:scale-110 ${isActive ? 'text-primary' : ''}`} />
                                            <span>{item.label}</span>
                                        </div>
                                    )}
                                </NavLink>
                            ))}
                        </div>
                    ))}
                </nav>

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
                    <button
                        onClick={() => setShowProfileMenu(!showProfileMenu)}
                        className="w-full p-3 bg-slate-900/30 hover:bg-white/5 rounded-2xl transition-all border border-transparent hover:border-white/5 flex items-center justify-between group"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary to-accent-purple flex items-center justify-center text-sm font-bold text-white shadow-glow">
                                {initials}
                            </div>
                            <div className="text-left w-[110px]">
                                <p className="text-sm font-medium text-white group-hover:text-primary-light transition-colors truncate">{displayName}</p>
                            </div>
                        </div>
                        <ChevronUp className={`w-4 h-4 text-slate-500 transition-transform ${showProfileMenu ? 'rotate-180' : ''}`} />
                    </button>
                    
                    <AnimatePresence>
                        {showProfileMenu && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 10 }}
                                className="absolute bottom-20 left-4 right-4 bg-slate-900 border border-white/10 rounded-xl shadow-xl overflow-hidden z-50 mb-2"
                            >
                                <NavLink
                                    to="/profile"
                                    className="w-full flex items-center gap-3 px-4 py-3 text-slate-300 hover:bg-white/5 hover:text-white transition-colors text-sm font-medium"
                                >
                                    <User className="w-4 h-4" />
                                    Profile
                                </NavLink>
                                <button
                                    onClick={logout}
                                    className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-white/5 transition-colors text-sm font-medium"
                                >
                                    <LogOut className="w-4 h-4" />
                                    Sign Out
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </aside>

            {/* Mobile Bottom Navigation */}
            <nav className="md:hidden fixed bottom-4 left-4 right-4 h-20 bg-slate-950/80 backdrop-blur-2xl border border-white/10 rounded-[28px] flex items-center justify-around px-2 z-[100] shadow-2xl safe-area-pb">
                {[
                    { icon: LayoutDashboard, label: 'Today', path: '/' },
                    { icon: CheckSquare, label: 'Tasks', path: '/todos' },
                    { icon: Bot, label: 'AI', path: '/ai-schedule' },
                    { icon: LayoutGrid, label: 'Apps', path: '#menu', isToggle: true }
                ].map((item) => (
                    item.isToggle ? (
                        <button
                            key={item.label}
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className={`flex flex-col items-center gap-1.5 px-4 py-2 rounded-2xl transition-all duration-300 ${
                                isMobileMenuOpen ? 'text-primary bg-primary/10' : 'text-slate-500'
                            }`}
                        >
                            <item.icon size={22} strokeWidth={isMobileMenuOpen ? 2.5 : 2} />
                            <span className="text-[10px] font-bold uppercase tracking-widest">{item.label}</span>
                        </button>
                    ) : (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className={({ isActive }) =>
                                `flex flex-col items-center gap-1.5 px-4 py-2 rounded-2xl transition-all duration-300 ${
                                    isActive 
                                        ? 'text-primary bg-primary/10 shadow-[0_0_20px_rgba(var(--color-primary),0.2)] scale-105' 
                                        : 'text-slate-500 hover:text-slate-300'
                                }`
                            }
                        >
                            {({ isActive }) => (
                                <>
                                    <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                                    <span className={`text-[10px] font-bold uppercase tracking-widest ${isActive ? 'opacity-100' : 'opacity-60'}`}>
                                        {item.label}
                                    </span>
                                </>
                            )}
                        </NavLink>
                    )
                ))}
            </nav>

            {/* Mobile Full Menu Overlay */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: "100%" }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="md:hidden fixed inset-0 bg-slate-950/95 backdrop-blur-3xl z-[150] overflow-y-auto px-6 py-20"
                    >
                        <div className="flex justify-between items-center mb-12">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary/20 rounded-xl">
                                    <BookOpen className="w-5 h-5 text-primary" />
                                </div>
                                <span className="font-black text-xl tracking-tight text-white">StudentOS Navigator</span>
                            </div>
                            <button 
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="p-3 bg-white/5 rounded-2xl text-slate-400 hover:text-white"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 gap-10 pb-32">
                            {navGroups.map((group, idx) => (
                                <div key={idx} className="space-y-4">
                                    <h3 className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] pl-2 border-l-2 border-primary/30">
                                        {group.category}
                                    </h3>
                                    <div className="grid grid-cols-2 gap-3">
                                        {group.items.map((item) => (
                                            <NavLink
                                                key={item.path}
                                                to={item.path}
                                                onClick={() => setIsMobileMenuOpen(false)}
                                                className={({ isActive }) =>
                                                    `flex flex-col items-center gap-3 p-5 rounded-3xl border transition-all duration-300 ${
                                                        isActive 
                                                            ? 'bg-primary/20 border-primary/30 text-white' 
                                                            : 'bg-white/5 border-white/5 text-slate-400'
                                                    }`
                                                }
                                            >
                                                <item.icon size={24} className="opacity-80" />
                                                <span className="text-xs font-bold text-center leading-tight">{item.label}</span>
                                            </NavLink>
                                        ))}
                                    </div>
                                </div>
                            ))}

                            {/* Additional Profile/Settings */}
                            <div className="space-y-4">
                                <h3 className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] pl-2 border-l-2 border-yellow-500/30">
                                    Profile & Account
                                </h3>
                                <div className="grid grid-cols-1 gap-3">
                                    <NavLink
                                        to="/profile"
                                        onClick={() => setIsMobileMenuOpen(false)}
                                        className="flex items-center gap-4 p-5 bg-white/5 border border-white/5 rounded-3xl text-slate-300"
                                    >
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary to-accent-purple flex items-center justify-center text-sm font-bold text-white">
                                            {initials}
                                        </div>
                                        <div className="flex-1 text-left">
                                            <p className="text-sm font-bold text-white">{displayName}</p>
                                            <p className="text-[10px] text-slate-500 font-medium">View Profile Settings</p>
                                        </div>
                                    </NavLink>
                                    <button
                                        onClick={() => { logout(); setIsMobileMenuOpen(false); }}
                                        className="flex items-center gap-4 p-5 bg-red-500/10 border border-red-500/10 rounded-3xl text-red-400 font-bold text-sm"
                                    >
                                        <LogOut size={20} />
                                        Sign Out from StudentOS
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default Sidebar;
