import React from 'react';
import { motion } from 'framer-motion';
import { Terminal, Code, Zap, Flame, ShieldAlert, HeartPulse, CheckCircle2, ChevronRight } from 'lucide-react';
import Card from './Card';

const CodingStreakCard = ({ data, onCommit, onRescue }) => {
    const { count = 0, status = 'lost', lastActionDate = null } = data || {};
    
    // Determine visual state based on streak engine status
    const isLive = status === 'live';
    const isRisk = status === 'risk';
    const isRecovery = status === 'recovery' || status === 'comeback';
    
    const statusConfig = {
        live: {
            color: 'text-orange-500',
            bgColor: 'bg-orange-500/10',
            borderColor: 'border-orange-500/20',
            icon: Flame,
            label: 'On Fire',
            desc: "You're building momentum! Keep coding."
        },
        risk: {
            color: 'text-red-500',
            bgColor: 'bg-red-500/10',
            borderColor: 'border-red-500/30',
            icon: ShieldAlert,
            label: 'At Risk',
            desc: "Missed yesterday. Commit now to save it!"
        },
        recovery: {
            color: 'text-blue-400',
            bgColor: 'bg-blue-400/10',
            borderColor: 'border-blue-400/30',
            icon: HeartPulse,
            label: 'Recovering',
            desc: "Momentum saved. Build it back up!"
        },
        comeback: {
            color: 'text-purple-400',
            bgColor: 'bg-purple-400/10',
            borderColor: 'border-purple-400/30',
            icon: Zap,
            label: 'Comeback',
            desc: "Day 1 of your new greatness."
        },
        lost: {
            color: 'text-slate-500',
            bgColor: 'bg-slate-500/10',
            borderColor: 'border-slate-800',
            icon: Code,
            label: 'Cold',
            desc: "Start a new streak today!"
        }
    };

    const config = statusConfig[status] || statusConfig.lost;
    const StatusIcon = config.icon;

    // Check if already committed today
    const today = new Date().toISOString().split('T')[0];
    const lastAction = lastActionDate ? (lastActionDate.toDate ? lastActionDate.toDate().toISOString().split('T')[0] : new Date(lastActionDate).toISOString().split('T')[0]) : null;
    const isDoneToday = lastAction === today && status !== 'risk';

    return (
        <Card className={`group relative h-full border-l-4 ${config.borderColor} transition-all duration-500 hover:shadow-2xl hover:shadow-primary/5`} hoverEffect>
            {/* Background Glow */}
            <div className={`absolute -right-4 -top-4 w-32 h-32 rounded-full blur-3xl opacity-10 group-hover:opacity-20 transition-opacity ${config.bgColor}`} />
            
            <div className="flex flex-col h-full justify-between gap-6 p-6">
                {/* Header */}
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-4">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-110 duration-500 ${config.bgColor} ${config.color} border ${config.borderColor}`}>
                            <StatusIcon size={28} className={isRisk ? 'animate-pulse' : ''} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-2xl font-black text-white tracking-tight">{count} Day Streak</h3>
                                {isRisk && (
                                    <span className="text-[10px] bg-red-500/20 text-red-500 px-2 py-0.5 rounded-full uppercase tracking-widest font-black border border-red-500/30 animate-pulse">
                                        Action Required
                                    </span>
                                )}
                            </div>
                            <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mt-0.5 flex items-center gap-1.5">
                                <Terminal size={12} /> Coding Mission • {config.label}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Description */}
                <p className="text-sm text-slate-400 leading-relaxed font-medium">
                    {isDoneToday ? "Mission accomplished! See you tomorrow." : config.desc}
                </p>

                {/* Logic/Actions */}
                <div className="mt-auto pt-2">
                    {isDoneToday ? (
                        <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 text-emerald-400">
                            <CheckCircle2 size={20} className="shrink-0" />
                            <span className="text-sm font-bold">Successfully committed today!</span>
                        </div>
                    ) : isRisk ? (
                        <button 
                            onClick={onRescue}
                            className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white rounded-2xl font-bold shadow-lg shadow-red-600/20 transition-all active:scale-95 group/btn"
                        >
                            <span className="flex items-center gap-2">
                                <Zap size={18} className="fill-current" />
                                Save with Micro Challenge
                            </span>
                            <ChevronRight size={18} className="group-hover/btn:translate-x-1 transition-transform" />
                        </button>
                    ) : (
                        <button 
                            onClick={onCommit}
                            className="w-full flex items-center justify-between p-4 bg-slate-900 border border-slate-700 hover:border-primary hover:bg-slate-800 text-white rounded-2xl font-bold transition-all active:scale-95 group/commit"
                        >
                            <span className="flex items-center gap-2">
                                <Code size={18} className="text-primary group-hover/commit:rotate-12 transition-transform" />
                                Commit Daily Practice
                            </span>
                            <ChevronRight size={18} className="text-slate-500 group-hover/commit:translate-x-1 transition-transform" />
                        </button>
                    )}
                </div>
            </div>
        </Card>
    );
};

export default CodingStreakCard;
