import React from 'react';
import { Target, Zap, Flame, ShieldAlert, HeartPulse, CheckCircle2, Trophy, Settings as SettingsIcon, Clock } from 'lucide-react';
import Card from './Card';

const MissionStreakCard = ({ data, onCommit, onRescue, onSettings }) => {
    const { count = 0, status = 'lost', lastActionDate = null, goal = "Daily Success", frequency = "daily", targetTime = "21:00" } = data || {};
    const [isJustCompleted, setIsJustCompleted] = React.useState(false);
    
    // Determine visual state
    const isRisk = status === 'risk';
    
    const statusConfig = {
        live: { color: 'text-orange-500', bgColor: 'bg-orange-500/10', borderColor: 'border-orange-500/20', icon: Flame, label: 'On Fire' },
        risk: { color: 'text-red-500', bgColor: 'bg-red-500/10', borderColor: 'border-red-500/30', icon: ShieldAlert, label: 'At Risk' },
        recovery: { color: 'text-blue-400', bgColor: 'bg-blue-400/10', borderColor: 'border-blue-400/30', icon: HeartPulse, label: 'Recovering' },
        comeback: { color: 'text-purple-400', bgColor: 'bg-purple-400/10', borderColor: 'border-purple-400/30', icon: Zap, label: 'Comeback' },
        lost: { color: 'text-slate-500', bgColor: 'bg-slate-500/10', borderColor: 'border-slate-800', icon: Target, label: 'Ready' }
    };

    const config = statusConfig[status] || statusConfig.lost;
    const StatusIcon = config.icon;

    // Check if already committed for the current period
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const lastActionDateProcessed = lastActionDate?.toDate ? lastActionDate.toDate() : (lastActionDate ? new Date(lastActionDate) : null);
    const lastActionStr = lastActionDateProcessed ? lastActionDateProcessed.toISOString().split('T')[0] : null;
    
    const isDoneToday = (lastActionStr === todayStr && !isRisk) || isJustCompleted;

    const handleCommit = (e) => {
        e.stopPropagation();
        setIsJustCompleted(true);
        onCommit();
    };

    return (
        <Card className={`group relative h-full border-l-4 ${config.borderColor} transition-all duration-500 hover:shadow-2xl hover:shadow-primary/10 bg-slate-900/40 backdrop-blur-sm`} hoverEffect>
            <div className={`absolute -right-4 -top-4 w-32 h-32 rounded-full blur-3xl opacity-10 group-hover:opacity-25 transition-opacity ${config.bgColor} pointer-events-none`} />
            
            <div className="flex flex-col h-full justify-between gap-6 p-6">
                <div className="flex justify-between items-start">
                    <button 
                        onClick={(e) => { e.stopPropagation(); onSettings(); }}
                        className="flex items-center gap-4 text-left group/header min-w-0 flex-1"
                    >
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-transform group-hover/header:rotate-12 duration-500 ${config.bgColor} ${config.color} border ${config.borderColor} shrink-0`}>
                            <StatusIcon size={28} className={isRisk ? 'animate-pulse' : ''} />
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-2xl font-black text-white tracking-tight leading-none mb-1.5 group-hover/header:text-primary transition-colors">
                                {isJustCompleted ? count + 1 : count} <span className="text-slate-500 text-lg font-bold">{frequency === 'daily' ? 'Days' : frequency === 'weekly' ? 'Weeks' : 'Months'}</span>
                            </h3>
                            <p className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2 truncate opacity-70 group-hover/header:opacity-100 transition-opacity">
                                <Trophy size={12} className="text-primary" /> {goal}
                            </p>
                        </div>
                    </button>
                    <button 
                        onClick={(e) => { e.stopPropagation(); onSettings(); }}
                        className="p-2.5 text-slate-500 hover:text-white hover:bg-white/10 rounded-xl transition-all shrink-0 border border-transparent hover:border-white/10 ml-2"
                        title="Mission Settings"
                    >
                        <SettingsIcon size={18} />
                    </button>
                </div>

                <div className="flex items-center gap-6 bg-white/5 p-3 rounded-2xl border border-white/5 shadow-inner">
                    <div className="flex items-center gap-2.5 text-slate-300">
                        <Clock size={16} className="text-primary" />
                        <span className="text-xs font-black uppercase tracking-widest">{targetTime}</span>
                    </div>
                    <div className="h-4 w-px bg-white/10" />
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{frequency}</span>
                    </div>
                </div>

                <div className="mt-2">
                    {isDoneToday ? (
                        <div className="flex items-center justify-center gap-3 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shadow-lg shadow-emerald-500/5 animate-in zoom-in-95 duration-300">
                            <CheckCircle2 size={18} className="shrink-0" />
                            <span className="text-xs font-black uppercase tracking-[0.2em]">Success</span>
                        </div>
                    ) : isRisk ? (
                        <button 
                            onClick={(e) => { e.stopPropagation(); onRescue(); }}
                            className="w-full flex items-center justify-center gap-3 p-4 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-red-600/20 transition-all active:scale-95 hover:brightness-110"
                        >
                            <Zap size={16} className="fill-current" />
                            Rescue Mission
                        </button>
                    ) : (
                        <button 
                            onClick={handleCommit}
                            className="w-full flex items-center justify-center gap-3 p-4 bg-slate-950 border-2 border-slate-800 hover:border-primary text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all active:scale-95 hover:bg-slate-900 shadow-xl"
                        >
                            Complete Mission
                        </button>
                    )}
                </div>
            </div>
        </Card>
    );
};

export default MissionStreakCard;
