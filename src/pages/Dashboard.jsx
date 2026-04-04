import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { 
    Clock, CheckCircle, Activity, Trophy, Book, Zap, 
    AlertCircle, Shield, Flame, ShieldAlert, HeartPulse, RefreshCw 
} from 'lucide-react';
import { db, auth } from '../firebase';
import { 
    collection, getDocs, query, orderBy, limit, 
    addDoc, doc, setDoc, getDoc, where 
} from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import Card from '../components/Card';
import { Plus } from 'lucide-react';
import Analytics from '../components/Analytics';
import AiSuggestionBox from '../components/AiSuggestionBox';
import ReminderBanner from '../components/ReminderBanner';
import BacklogRescueModal from '../components/BacklogRescueModal';
import InstallAppBanner from '../components/InstallAppBanner';
import MissionStreakCard from '../components/MissionStreakCard';
import MissionRescueModal from '../components/MissionRescueModal';
import StreakSettingsModal from '../components/StreakSettingsModal';
import UserTour from '../components/UserTour';
import { evaluateStreakStatus, processNewAction } from '../lib/streak_engine';

// ─── Sub-Components ──────────────────────────────────────────────────────────

const StatCard = ({ title, value, subtitle, icon: LucideIcon, color, progress }) => (
    <Card className="flex flex-col justify-between h-full p-6" hoverEffect>
        <div className="flex justify-between items-start">
            <div className={`p-3 rounded-2xl ${color} bg-opacity-20 text-white`}>
                <LucideIcon size={24} />
            </div>
            {progress !== undefined && (
                <div className="flex flex-col items-end">
                    <span className="text-xs font-medium text-slate-400 mb-1">{progress}%</span>
                    <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-primary to-accent-cyan rounded-full"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>
            )}
        </div>
        <div className="mt-4">
            <h3 className="text-3xl font-bold text-white tracking-tight">{value}</h3>
            <p className="text-sm font-medium text-slate-400 mt-1">{title}</p>
            {subtitle && <p className="text-xs text-slate-500 mt-2">{subtitle}</p>}
        </div>
    </Card>
);

// ─── Main Dashboard Component ───────────────────────────────────────────────

const Dashboard = () => {
    const { user, profile } = useAuth();
    const [showRescueModal, setShowRescueModal] = useState(false);
    const [showMissionRescueModal, setShowMissionRescueModal] = useState(false);
    const [showStreakSettings, setShowStreakSettings] = useState(false);
    const [selectedStreak, setSelectedStreak] = useState(null);
    const [loadingStats, setLoadingStats] = useState(true);
    const [showTour, setShowTour] = useState(false);
    
    // 0. Check for New User Tour
    useEffect(() => {
        if (profile && profile.hasCompletedTour === false) {
            // Delay slightly for dramatic effect
            const timer = setTimeout(() => setShowTour(true), 1500);
            return () => clearTimeout(timer);
        }
    }, [profile?.hasCompletedTour]);
    
    const [stats, setStats] = useState({
        pendingTasks: 0,
        completedTasks: 0,
        totalTasks: 0,
        studyHours: 0,
        competitions: 0,
        upcomingDeadlines: [],
        upcomingAssessments: [],
        overdueCount: 0,
        chartData: []
    });

    const [timeContext, setTimeContext] = useState({
        greeting: 'Welcome back',
        loadingMsg: 'Restoring your workspace...'
    });

    // 1. Initialize Greeting Context
    useEffect(() => {
        const hour = new Date().getHours();
        let greeting = 'Welcome back';
        let loadingMsg = 'Restoring your workspace...';

        if (hour >= 5 && hour < 12) {
            greeting = 'Rise & conquer';
            loadingMsg = 'Launching your morning mission...';
        } else if (hour >= 12 && hour < 17) {
            greeting = 'Mid-session check-in';
            loadingMsg = 'Pulling your focus data...';
        } else if (hour >= 17 && hour < 21) {
            greeting = 'Evening debrief';
            loadingMsg = 'Logging today\'s wins...';
        } else {
            greeting = 'Night mode active';
            loadingMsg = 'Plotting tomorrow\'s moves...';
        }
        setTimeContext({ greeting, loadingMsg });
    }, []);

    // 2. Streak Data & Evaluation
    const currentStreakData = profile?.streak || { count: 0, status: 'lost', lastActionDate: null };
    const evaluatedStreak = evaluateStreakStatus(
        currentStreakData.lastActionDate,
        currentStreakData.count,
        currentStreakData.status
    );

    const handleRescueAction = async () => {
        if (!user) return;
        try {
            const newState = processNewAction(currentStreakData);
            await setDoc(doc(db, "users", user.uid), { streak: newState }, { merge: true });
            
            await addDoc(collection(db, "users", user.uid, "tasks"), {
                title: "10-Minute Recovery Sprint",
                completed: true,
                isDone: true,
                createdAt: new Date().toISOString(),
                date: new Date().toISOString().split('T')[0],
                type: "recovery"
            });
            alert("Streak Rescued! Keep the momentum going.");
        } catch (e) {
            console.error("Rescue failed", e);
        }
    };

    // 2.1 Mission Streak Logic (Multi-Mission)
    // Stable ID initialization to prevent re-generation on every render
    const missionStreaks = (profile?.missionStreaks || (profile?.missionStreak ? [ { ...profile.missionStreak, id: "primary" } ] : [])).map((s, i) => ({
        ...s,
        id: s.id || `ms-${i}` 
    }));

    const handleMissionCommit = async (streakId) => {
        if (!user) return;
        
        // --- OPTIMISTIC UPDATE ---
        const streakToUpdate = missionStreaks.find(s => s.id === streakId);
        if (!streakToUpdate) return;
        const newState = processNewAction(streakToUpdate);
        const updatedStreaks = missionStreaks.map(s => s.id === streakId ? newState : s);
        
        // Update local state immediately
        const prevStreaks = [...missionStreaks];
        // Note: we can't directly update 'missionStreaks' because it's derived from 'profile'
        // But the Dashboard uses 'profile.missionStreaks'. 
        // To be truly optimistic, we might need a local state copy or hope Firestore is fast enough.
        // Actually, Firestore's 'onSnapshot' is very fast locally.
        
        try {
            await setDoc(doc(db, "users", user.uid), { missionStreaks: updatedStreaks }, { merge: true });
            
            await addDoc(collection(db, "users", user.uid, "tasks"), {
                title: `${streakToUpdate.goal || "Mission"} Completed`,
                completed: true,
                isDone: true,
                createdAt: new Date().toISOString(),
                date: new Date().toISOString().split('T')[0],
                type: "mission",
                missionId: streakId
            });
        } catch (e) {
            console.error("Mission commit failed", e);
        }
    };

    const handleSaveMissionSettings = async (settings) => {
        if (!user) return;
        try {
            const existingIndex = missionStreaks.findIndex(s => s.id === settings.id);
            
            // Closing modal immediately for "fast" feel
            setShowStreakSettings(false);
            setSelectedStreak(null);

            // Ensure the streak being saved HAS an ID
            const streakToSave = { ...settings, id: settings.id || Date.now().toString() };
            const finalStreaks = [...missionStreaks];
            if (existingIndex >= 0) {
                finalStreaks[existingIndex] = { ...finalStreaks[existingIndex], ...streakToSave };
            } else {
                finalStreaks.push({ ...streakToSave, count: 0, status: 'lost', lastActionDate: null });
            }

            await setDoc(doc(db, "users", user.uid), { missionStreaks: finalStreaks }, { merge: true });
        } catch (e) {
            console.error("Failed to save mission settings", e);
        }
    };

    const handleDeleteMission = async (streakId) => {
        if (!user) return;
        try {
            const updatedStreaks = missionStreaks.filter(s => s.id !== streakId);
            await setDoc(doc(db, "users", user.uid), { missionStreaks: updatedStreaks }, { merge: true });
        } catch (e) {
            console.error("Failed to delete mission", e);
        }
    };

    const handleMissionRescue = async (streakId) => {
        if (!user) return;
        try {
            const streakToRescue = missionStreaks.find(s => s.id === streakId);
            if (!streakToRescue) return;

            const newState = processNewAction(streakToRescue);
            const updatedStreaks = missionStreaks.map(s => s.id === streakId ? newState : s);
            
            await setDoc(doc(db, "users", user.uid), { missionStreaks: updatedStreaks }, { merge: true });
            
            await addDoc(collection(db, "users", user.uid, "tasks"), {
                title: `${streakToRescue.goal} Rescue Recovery`,
                completed: true,
                isDone: true,
                createdAt: new Date().toISOString(),
                date: new Date().toISOString().split('T')[0],
                type: "mission_rescue"
            });
        } catch (e) {
            console.error("Mission rescue failed", e);
        }
    };

    const handleTourComplete = async () => {
        if (!user) return;
        try {
            setShowTour(false);
            await setDoc(doc(db, "users", user.uid), { hasCompletedTour: true }, { merge: true });
        } catch (e) {
            console.error("Failed to complete tour", e);
        }
    };

    // 3. Fetch Stats & Sync
    useEffect(() => {
        const fetchStats = async () => {
            if (!user) {
                setLoadingStats(false);
                return;
            }

            try {
                const [eventsSnap, tasksSnap, assessmentsSnap] = await Promise.all([
                    getDocs(query(collection(db, "users", user.uid, "events"), limit(100))),
                    getDocs(query(collection(db, "users", user.uid, "tasks"), limit(100))),
                    getDocs(query(collection(db, "users", user.uid, "assessments"), where("status", "==", "pending"), limit(5)))
                ]);

                const events = eventsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                const tasks = tasksSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                const assessments = assessmentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                const done = tasks.filter(t => t.isDone || t.completed).length;
                const pending = tasks.filter(t => !t.isDone && !t.completed).length;
                const studyHours = events.filter(e => e.type === 'study').length * 2;
                const competitions = events.filter(e => e.type === 'comp' || e.type === 'competition').length;

                const todayStr = new Date().toISOString().split('T')[0];
                const overdueCount = tasks.filter(t => (!t.isDone && !t.completed) && t.date && t.date < todayStr).length;

                // Upcoming Items Logic
                const upcomingItems = tasks
                    .filter(t => !t.completed && !t.isDone)
                    .map(t => ({ ...t, type: 'task', startTime: t.date || new Date().toISOString() }))
                    .sort((a, b) => new Date(a.date) - new Date(b.date))
                    .slice(0, 3);

                // Chart Data Logic
                const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                const charDataMap = {};
                const now = new Date();
                for (let i = 6; i >= 0; i--) {
                    const d = new Date(now);
                    d.setDate(d.getDate() - i);
                    charDataMap[d.toISOString().split('T')[0]] = { name: days[d.getDay()], tasks: 0, events: 0 };
                }
                tasks.forEach(t => {
                    const dStr = t.date;
                    if (dStr && charDataMap[dStr] && (t.isDone || t.completed)) charDataMap[dStr].tasks += 1;
                });
                const chartDataResult = Object.values(charDataMap);

                setStats({
                    pendingTasks: pending,
                    completedTasks: done,
                    totalTasks: pending + done,
                    studyHours,
                    competitions,
                    upcomingDeadlines: upcomingItems,
                    upcomingAssessments: assessments,
                    overdueCount,
                    chartData: chartDataResult
                });
            } catch (error) {
                console.error("Dashboard Fetch Error:", error);
            } finally {
                setLoadingStats(false);
            }
        };

        fetchStats();
    }, [user]);

    // 4. Rendering
    if (loadingStats) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[500px] animate-in fade-in duration-700">
                <div className="w-16 h-16 rounded-full border-4 border-slate-800 border-t-primary animate-spin" />
                <h3 className="text-lg font-bold text-white mt-6 animate-pulse">
                    {timeContext.greeting}, {profile?.fullName?.split(' ')[0] || 'Student'}
                </h3>
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-10 relative">
            <InstallAppBanner />
            <ReminderBanner />
            <BacklogRescueModal 
                isOpen={showRescueModal} 
                onClose={() => setShowRescueModal(false)} 
                overdueCount={stats.overdueCount} 
            />
            <MissionRescueModal 
                isOpen={showMissionRescueModal}
                onClose={() => setShowMissionRescueModal(false)}
                onComplete={() => handleMissionRescue(selectedStreak?.id)}
                missionGoal={selectedStreak?.goal}
            />
            <StreakSettingsModal 
                isOpen={showStreakSettings}
                onClose={() => { setShowStreakSettings(false); setSelectedStreak(null); }}
                currentSettings={selectedStreak}
                onSave={handleSaveMissionSettings}
                onDelete={handleDeleteMission}
            />
            <UserTour 
                isOpen={showTour} 
                onFinish={handleTourComplete} 
            />

            {stats.overdueCount > 0 && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg backdrop-blur-sm">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-red-500/20 rounded-xl text-red-400">
                            <AlertCircle size={24} />
                        </div>
                        <div>
                            <h3 className="text-white font-bold text-lg">Backlog Detected</h3>
                            <p className="text-red-300/80 text-sm">Rescue Engine™ ready to rebuild your plan.</p>
                        </div>
                    </div>
                    <button onClick={() => setShowRescueModal(true)} className="px-6 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl flex items-center gap-2">
                        <Zap size={16} /> Activate Rescue Engine™
                    </button>
                </div>
            )}

            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-4xl font-bold text-white tracking-tight">
                        {timeContext.greeting}, <span className="text-gradient">{profile?.fullName?.split(' ')[0] || 'Student'}</span> 🚀
                    </h1>
                    <p className="text-slate-400 mt-2 text-lg">StudentOS Command Center — your mission brief for today.</p>
                </div>
                {missionStreaks.length > 0 && (
                    <div className="flex items-center gap-3 bg-slate-900/50 border border-slate-800 px-5 py-3 rounded-2xl backdrop-blur-sm shadow-xl self-start">
                        <div className="flex -space-x-2">
                            {missionStreaks.slice(0, 3).map((s, i) => (
                                <div key={i} className="w-8 h-8 rounded-full bg-primary/20 border-2 border-[#0a0a0a] flex items-center justify-center text-[10px] font-black text-primary">
                                    {s.goal[0].toUpperCase()}
                                </div>
                            ))}
                        </div>
                        <div className="h-4 w-px bg-slate-800 mx-1" />
                        <span className="text-xs font-black uppercase tracking-widest text-slate-400">
                            {missionStreaks.length} Active {missionStreaks.length === 1 ? 'Mission' : 'Missions'}
                        </span>
                    </div>
                )}
            </div>

            {/* --- MISSIONS GRID --- */}
            <LayoutGroup>
                <motion.div 
                    layout
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                >
                    <AnimatePresence mode="popLayout">
                        {missionStreaks.map((streak) => (
                            <motion.div 
                                key={streak.id}
                                layout
                                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
                                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                                className="transition-all order-1"
                            >
                                <MissionStreakCard 
                                    data={streak} 
                                    onCommit={() => handleMissionCommit(streak.id)}
                                    onRescue={() => { setSelectedStreak(streak); setShowMissionRescueModal(true); }}
                                    onSettings={() => { setSelectedStreak(streak); setShowStreakSettings(true); }}
                                />
                            </motion.div>
                        ))}
                    </AnimatePresence>
                    
                    {/* Add New Mission Button */}
                    <motion.div layout className="transition-all order-2">
                        <button 
                            onClick={() => { setSelectedStreak(null); setShowStreakSettings(true); }}
                            className="w-full h-full min-h-[200px] flex flex-col items-center justify-center gap-4 p-8 bg-slate-900/40 border-2 border-dashed border-slate-800 rounded-[32px] hover:border-primary hover:bg-primary/5 transition-all group backdrop-blur-sm"
                        >
                            <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-500 group-hover:text-primary group-hover:bg-primary/10 transition-all shadow-inner">
                                <Plus size={36} />
                            </div>
                            <div className="text-center">
                                <p className="text-xl font-black text-white">Add Mission</p>
                                <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] mt-2">Expansion Slot</p>
                            </div>
                        </button>
                    </motion.div>
                </motion.div>
            </LayoutGroup>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="md:col-span-2 lg:col-span-4 row-span-1">
                    <Analytics stats={stats} chartData={stats.chartData} />
                </div>

                <StatCard title="Pending Tasks" value={stats.pendingTasks} icon={Clock} color="bg-orange-500" progress={stats.totalTasks > 0 ? Math.round((stats.pendingTasks / stats.totalTasks) * 100) : 0} />
                <StatCard title="Study Hours" value={`${stats.studyHours}h`} icon={Activity} color="bg-purple-500" subtitle="Tracked via schedule" />
                <StatCard title="Arena Events" value={stats.competitions} icon={Trophy} color="bg-yellow-500" subtitle="StudentOS-tracked contests" />
                <StatCard title="Tasks Done" value={stats.completedTasks} icon={CheckCircle} color="bg-emerald-500" progress={stats.totalTasks > 0 ? Math.round((stats.completedTasks / stats.totalTasks) * 100) : 0} />

                <div className="md:col-span-2 lg:col-span-4">
                    <AiSuggestionBox />
                </div>

                {/* Focus Zone Mini-Card */}
                <div className="md:col-span-2 lg:col-span-2">
                    <Card className="p-6 h-full" hoverEffect>
                        <h3 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">🎯 The Focus Zone</h3>
                        <div className="space-y-3">
                            {stats.upcomingDeadlines.length === 0 ? (
                                <p className="text-slate-500 text-sm">🎯 All clear missions.</p>
                            ) : (
                                stats.upcomingDeadlines.map((i, idx) => (
                                    <div key={idx} className="flex items-center gap-4 p-3 rounded-xl bg-slate-900/50 border border-slate-800">
                                        <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400"><Book size={18} /></div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-sm font-semibold text-slate-200 truncate">{i.title}</h4>
                                            <p className="text-[10px] text-slate-500">Due: {new Date(i.startTime).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </Card>
                </div>

                {/* Assessment Shield Mini-Card */}
                <div className="md:col-span-2 lg:col-span-2">
                    <Card className="p-6 h-full border-l-4 border-l-green-500 bg-green-500/5" hoverEffect>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-semibold text-white flex items-center gap-2"><Shield size={20} className="text-green-400" /> Assessment Shield</h3>
                            <NavLink to="/assessments" className="text-xs font-bold text-green-400 hover:underline">View All</NavLink>
                        </div>
                        <div className="space-y-3">
                            {(!stats.upcomingAssessments || stats.upcomingAssessments.length === 0) ? (
                                <p className="text-slate-500 text-sm italic">No urgent assessments. Shield: ACTIVE</p>
                            ) : (
                                stats.upcomingAssessments.map((a, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
                                        <div className="min-w-0">
                                            <h4 className="text-sm font-bold text-slate-200 truncate">{a.courseName}</h4>
                                            <p className="text-[10px] text-slate-500">Last Date: {a.lastDate}</p>
                                        </div>
                                        <div className="text-[10px] font-black text-green-400 bg-green-400/10 px-2 py-1 rounded uppercase">Pending</div>
                                    </div>
                                ))
                            )}
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
