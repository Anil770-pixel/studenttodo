import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Check, Zap, Trophy, Flame, Calendar, Loader2, SkipForward, ShieldAlert } from 'lucide-react';
import { db } from '../firebase';
import { collection, query, orderBy, limit, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { organizeTasks, generateMicroTasks } from '../lib/groq';
import { recordPostpone, resetPostponeCount, buildMicroTaskObjects } from '../lib/burnout';
import AntiGravityModal from '../components/AntiGravityModal';
import RescueModal from '../components/RescueModal';
import { evaluateStreakStatus, processNewAction } from '../lib/streak_engine';
import confetti from 'canvas-confetti';
import { setDoc } from 'firebase/firestore';

const Todos = () => {
    const { user, profile } = useAuth();
    const [tasks, setTasks] = useState([]);
    const [xp, setXp] = useState(0);
    const [streak, setStreak] = useState(1);
    const [loadingTasks, setLoadingTasks] = useState(true);

    const [newTask, setNewTask] = useState('');
    const [category, setCategory] = useState('Study');
    const [taskDate, setTaskDate] = useState(new Date().toISOString().split('T')[0]);

    // AI Smart To-Do State
    const [aiProcessing, setAiProcessing] = useState(false);
    const [smartPlan, setSmartPlan] = useState(null);
    const [showRescueModal, setShowRescueModal] = useState(false);

    // ── Burnout / Anti-Gravity State ──
    const [stuckTask, setStuckTask] = useState(null);   // task that triggered overwhelm
    const [showAntiGravity, setShowAntiGravity] = useState(false);
    const [microTaskLoading, setMicroTaskLoading] = useState(false);
    const [microTasks, setMicroTasks] = useState(null);   // string[] once AI responds

    // 1. Real-time Subscription
    useEffect(() => {
        if (!user) {
            setTasks([]);
            setXp(0);
            setLoadingTasks(false);
            return;
        }

        // 1a. User Stats (Profile is already real-time from Context, but let's sync local state)
        if (profile) {
            setXp(profile.xp || 0);
            setStreak(profile.streak || 1);
        }

        // 1b. Tasks Subscription
        const tasksRef = collection(db, "users", user.uid, "tasks");
        // We order by createdAt. Note: Mixed types (String vs Timestamp) in Firestore can break ordering.
        // We'll fetch all and sort client-side to be safe.
        const q = query(tasksRef, limit(100));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedTasks = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data
                };
            });

            // Client-side Sort: Handle both Firestore Timestamp and ISO Strings
            fetchedTasks.sort((a, b) => {
                const getDate = (item) => {
                    if (!item.createdAt) return 0;
                    if (item.createdAt.toDate) return item.createdAt.toDate().getTime(); // Firestore Timestamp
                    if (typeof item.createdAt === 'string') return new Date(item.createdAt).getTime(); // ISO String
                    if (typeof item.createdAt === 'number') return item.createdAt * 1000; // Seconds
                    return 0;
                };
                return getDate(b) - getDate(a); // Descending (Newest first)
            });

            setTasks(fetchedTasks);
            setLoadingTasks(false);
            console.log("Tasks synced:", fetchedTasks.length);
        }, (error) => {
            console.error("Error subscribing to tasks:", error);
            setLoadingTasks(false);
        });

        return () => unsubscribe();
    }, [user, profile]);

    // Helper to update User Stats in Firestore
    const updateUserStats = async (newXp, newStreakData) => {
        if (!user) return;
        try {
            const userRef = doc(db, "users", user.uid);
            await setDoc(userRef, { xp: newXp, streak: newStreakData }, { merge: true });
        } catch (error) {
            console.error("Failed to sync stats:", error);
        }
    };

    const addTask = async (e) => {
        e.preventDefault();
        if (!newTask.trim() || !user) return;

        const tempId = Date.now().toString(); // Temporary ID for optimistic UI
        const taskData = {
            title: newTask,
            completed: false,
            category,
            date: taskDate || new Date().toISOString().split('T')[0],
            createdAt: serverTimestamp()
        };

        try {
            // Optimistic UI
            const optimisticTask = { ...taskData, id: tempId, createdAt: { seconds: Date.now() / 1000 } };
            setTasks(prev => [optimisticTask, ...prev]);
            setNewTask('');

            const tasksRef = collection(db, "users", user.uid, "tasks");
            const docRef = await addDoc(tasksRef, taskData);

            // Replace optimistic with real
            setTasks(prev => prev.map(t => t.id === tempId ? { ...t, id: docRef.id } : t));
        } catch (error) {
            console.error("Error adding task:", error);
            alert(`Failed to save task: ${error.message}`);
            // Revert
            setTasks(prev => prev.filter(t => t.id !== tempId));
        }
    };

    const toggleTask = async (task) => {
        if (!user) return;

        const isCompleting = !task.completed;

        // Optimistic UI
        setTasks(prev => prev.map(t => t.id === task.id ? { ...t, completed: isCompleting } : t));

        try {
            const taskRef = doc(db, "users", user.uid, "tasks", task.id);
            await updateDoc(taskRef, {
                completed: isCompleting
            });

            if (isCompleting) {
                confetti({
                    particleCount: 100,
                    spread: 70,
                    origin: { y: 0.6 }
                });
                const newXp = (xp || 0) + 10;
                setXp(newXp);

                // Calculate or update streak
                const currentStreakObj = profile?.streak || { count: 0, status: 'lost', lastActionDate: null };
                const updatedStreak = processNewAction(currentStreakObj);
                
                updateUserStats(newXp, updatedStreak);
            } else {
                const newXp = Math.max(0, (xp || 0) - 10);
                setXp(newXp);
                // When un-completing, we don't necessarily decrease the streak count,
                // but we keep the current streak data in sync with XP.
                updateUserStats(newXp, profile?.streak || { count: 0, status: 'lost', lastActionDate: null });
            }
        } catch (error) {
            console.error("Error toggling task:", error);
            // Revert
            setTasks(prev => prev.map(t => t.id === task.id ? { ...t, completed: !isCompleting } : t));
        }
    };

    const deleteTask = async (id) => {
        if (!user) return;

        const backup = tasks;
        setTasks(prev => prev.filter(t => t.id !== id));

        try {
            const taskRef = doc(db, "users", user.uid, "tasks", id);
            await deleteDoc(taskRef);
        } catch (error) {
            console.error("Error deleting task:", error);
            setTasks(backup);
        }
    };

    // Calculate Progress
    const completedCount = tasks.filter(t => t.completed).length;
    const totalCount = tasks.length;
    const progress = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);
    const radius = 30;
    const circumference = 2 * Math.PI * radius;
    const dashOffset = circumference - (progress / 100) * circumference;

    const handleAntiOverwhelm = async () => {
        if (!user) return;
        setAiProcessing(true);
        try {
            // Get calendar context from Firestore
            const eventsRef = collection(db, "users", user.uid, "events");
            const q = query(eventsRef, limit(20)); // Just get some context
            const querySnapshot = await getDocs(q);
            const events = querySnapshot.docs.map(doc => ({
                ...doc.data(),
                start: doc.data().startTime || doc.data().date
            }));

            const plan = await organizeTasks(tasks, events || []);
            setSmartPlan(plan);
        } catch (error) {
            console.error("AI Planning Failed", error);
            alert("Failed to organize tasks.");
        } finally {
            setAiProcessing(false);
        }
    };

    // ── Postpone a task (Burnout detector) ────────────────────────────────────
    const handlePostpone = async (task) => {
        if (!user || task.completed) return;

        // Optimistically shift the date in UI
        setTasks(prev => prev.map(t =>
            t.id === task.id
                ? { ...t, date: shiftDay(t.date, 1), postponeCount: (t.postponeCount || 0) + 1 }
                : t
        ));

        try {
            const { overwhelmed, updatedTask } = await recordPostpone(user.uid, task);
            if (overwhelmed) {
                setStuckTask(updatedTask);
                setMicroTasks(null);
                setShowAntiGravity(true);
            }
        } catch (err) {
            console.error('Postpone failed:', err);
        }
    };

    // ── Anti-Gravity: generate & replace with micro-tasks ────────────────────
    const handleAntiGravityAccept = async () => {
        if (!user || !stuckTask) return;
        setMicroTaskLoading(true);

        try {
            const titles = await generateMicroTasks(stuckTask.title);
            const microObjs = buildMicroTaskObjects(stuckTask, titles);

            const tasksRef = collection(db, 'users', user.uid, 'tasks');

            // Save 4 micro-tasks
            const saved = await Promise.all(
                microObjs.map(m => addDoc(tasksRef, { ...m, createdAt: serverTimestamp() }))
            );

            // Delete the original stuck task
            await deleteDoc(doc(db, 'users', user.uid, 'tasks', stuckTask.id));

            // Reset postpone counter safety
            await resetPostponeCount(user.uid, stuckTask.id).catch(() => { });

            setMicroTasks(titles);
        } catch (err) {
            console.error('Anti-Gravity generation failed:', err);
            alert('Failed to generate micro-tasks. Please try again.');
            setShowAntiGravity(false);
        } finally {
            setMicroTaskLoading(false);
        }
    };

    const handleAntiGravityDismiss = () => {
        setShowAntiGravity(false);
        setStuckTask(null);
        setMicroTasks(null);
    };

    // ─── Helpers ─────────────────────────────────────────────────────────────
    function shiftDay(dateStr, days = 1) {
        const d = dateStr ? new Date(dateStr) : new Date();
        d.setDate(d.getDate() + days);
        return d.toISOString().split('T')[0];
    }

    const handleAcceptRescuePlan = async (rescuePlan) => {
        if (!user || !rescuePlan) return;
        setShowRescueModal(false);
        setLoadingTasks(true);

        try {
            const batchPromises = rescuePlan.rescue_plan.map(task => {
                const taskRef = doc(db, "users", user.uid, "tasks", task.id);
                return updateDoc(taskRef, { date: task.new_date });
            });

            if (rescuePlan.can_drop_or_ignore) {
                rescuePlan.can_drop_or_ignore.forEach(task => {
                    const taskRef = doc(db, "users", user.uid, "tasks", task.id);
                    batchPromises.push(deleteDoc(taskRef));
                });
            }

            await Promise.all(batchPromises);
        } catch (error) {
            console.error("Rescue apply error:", error);
            alert("Failed to apply rescue plan.");
        } finally {
            setLoadingTasks(false);
        }
    };

    const todayStr = new Date().toISOString().split('T')[0];
    const overdueTasks = tasks.filter(t => !t.completed && t.date && t.date < todayStr);

    if (loadingTasks && !user) {
        return (
            <div className="flex items-center justify-center min-h-[500px]">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
            </div>
        );
    }

    if (smartPlan) {
        return (
            <div className="max-w-6xl mx-auto space-y-6">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-pink-500 to-rose-500 bg-clip-text text-transparent">
                        Anti-Overwhelm Mode
                    </h1>
                    <button onClick={() => setSmartPlan(null)} className="text-slate-400 hover:text-white">
                        Exit Mode
                    </button>
                </div>

                <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl mb-6">
                    <p className="text-indigo-300 italic">"{smartPlan.coaching_message}"</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-4">
                        <h3 className="text-white font-bold flex items-center gap-2">
                            <Zap className="text-yellow-400" size={20} /> Today's Focus
                        </h3>
                        {smartPlan.today_plan?.map((t, i) => (
                            <div key={i} className="p-4 bg-slate-800 rounded-lg border-l-4 border-yellow-400">
                                <h4 className="text-white font-medium">{t.title}</h4>
                                <p className="text-sm text-slate-400">{t.start ? `At ${new Date(t.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'High Priority'}</p>
                            </div>
                        ))}
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-white font-bold flex items-center gap-2">
                            <Calendar className="text-blue-400" size={20} /> This Week
                        </h3>
                        {smartPlan.this_week?.map((t, i) => (
                            <div key={i} className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                                <h4 className="text-slate-200">{t.title}</h4>
                            </div>
                        ))}
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-white font-bold flex items-center gap-2">
                            <Trash2 className="text-red-400" size={20} /> Drop / Delay
                        </h3>
                        {smartPlan.can_drop_or_delay?.map((t, i) => (
                            <div key={i} className="p-4 bg-red-900/10 rounded-lg border border-red-500/20 opacity-70">
                                <h4 className="text-red-300 line-through">{t.title}</h4>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-8">

            {/* Anti-Gravity Modal */}
            {showAntiGravity && (
                <AntiGravityModal
                    task={stuckTask}
                    onAccept={handleAntiGravityAccept}
                    onDismiss={handleAntiGravityDismiss}
                    loading={microTaskLoading}
                    microTasks={microTasks}
                    postponeCount={stuckTask?.postponeCount || 3}
                />
            )}
            
            {/* Rescue Modal */}
            {showRescueModal && (
                <RescueModal 
                    overdueTasks={overdueTasks} 
                    onClose={() => setShowRescueModal(false)} 
                    onAcceptPlan={handleAcceptRescuePlan} 
                />
            )}
            {/* Gamification Stats Bar */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="glass-panel p-4 rounded-2xl flex items-center justify-between relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-r from-neon-purple/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div>
                        <h3 className="text-slate-400 text-sm font-medium">Daily Progress</h3>
                        <p className="text-2xl font-bold text-white mt-1">{progress}% Completed</p>
                    </div>
                    {/* Progress Ring */}
                    <div className="relative w-16 h-16 flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90">
                            <circle cx="32" cy="32" r={radius} stroke="currentColor" strokeWidth="6" fill="transparent" className="text-slate-800" />
                            <circle cx="32" cy="32" r={radius} stroke="currentColor" strokeWidth="6" fill="transparent" className="text-neon-purple transition-all duration-1000 ease-out"
                                strokeDasharray={circumference}
                                strokeDashoffset={dashOffset}
                                strokeLinecap="round"
                            />
                        </svg>
                        <Zap size={20} className="absolute text-neon-purple" fill="currentColor" />
                    </div>
                </div>

                <div className="glass-panel p-4 rounded-2xl flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-neon-cyan/20 flex items-center justify-center text-neon-cyan">
                        <Trophy size={24} />
                    </div>
                    <div>
                        <h3 className="text-slate-400 text-sm font-medium">Total XP</h3>
                        <p className="text-3xl font-black text-white">{xp}</p>
                    </div>
                </div>

                <div className="glass-panel p-4 rounded-2xl flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-neon-orange/20 flex items-center justify-center text-neon-orange">
                        <Flame size={24} />
                    </div>
                    <div>
                        <h3 className="text-slate-400 text-sm font-medium">Day Streak</h3>
                        <p className="text-3xl font-black text-white">{streak}</p>
                    </div>
                </div>
            </div>

            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Focus <span className="text-gradient">& Tasks</span></h1>
                    <p className="text-slate-400 mt-1">Manage your active priorities.</p>
                </div>
                <div className="flex gap-3">
                    {overdueTasks.length > 0 ? (
                        <button
                            onClick={() => setShowRescueModal(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 rounded-lg text-white font-medium transition-all shadow-lg shadow-emerald-500/20 animate-pulse"
                            title={`${overdueTasks.length} overdue tasks detected`}
                        >
                            <ShieldAlert size={18} />
                            <span className="hidden sm:inline">Rescue Backlog</span>
                        </button>
                    ) : (
                        <button
                            onClick={() => setShowRescueModal(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600/50 to-teal-600/50 hover:from-emerald-500 hover:to-teal-500 rounded-lg text-white/70 font-medium transition-all shadow-lg shadow-emerald-500/10"
                            title="Force open the Rescue Engine to see the new feature"
                        >
                            <ShieldAlert size={18} />
                            <span className="hidden sm:inline">Demo Rescue</span>
                        </button>
                    )}
                    <button
                        onClick={handleAntiOverwhelm}
                        disabled={aiProcessing}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 rounded-lg text-white font-medium transition-all shadow-lg shadow-pink-500/20"
                    >
                        {aiProcessing ? <Loader2 className="animate-spin" size={18} /> : <Zap size={18} />}
                        <span className="hidden sm:inline">Anti-Overwhelm</span>
                    </button>
                </div>
            </div>

            {/* Todo List Card */}
            <div className="glass-panel rounded-2xl overflow-hidden">
                {/* Input Area */}
                <div className="p-6 border-b border-white/5 bg-navy-800/50">
                    <form onSubmit={addTask} className="flex gap-4">
                        <div className="relative flex-1">
                            <Plus className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                            <input
                                type="text"
                                value={newTask}
                                onChange={(e) => setNewTask(e.target.value)}
                                placeholder="Add a new master task..."
                                className="w-full bg-navy-900 border border-slate-700 rounded-xl py-4 pl-12 pr-4 text-white placeholder:text-slate-500 focus:outline-none focus:border-neon-cyan focus:ring-1 focus:ring-neon-cyan transition-all"
                            />
                        </div>
                        <input
                            type="date"
                            value={taskDate}
                            onChange={(e) => setTaskDate(e.target.value)}
                            className="bg-navy-900 border border-slate-700 rounded-xl px-4 text-white text-sm outline-none focus:border-neon-cyan"
                        />
                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="bg-navy-900 border border-slate-700 rounded-xl px-6 text-white text-sm outline-none focus:border-neon-cyan"
                        >
                            <option>Study</option>
                            <option>Competition</option>
                            <option>Exam</option>
                        </select>
                        <button type="submit" className="bg-neon-cyan hover:bg-cyan-400 text-navy-900 font-bold px-8 rounded-xl transition-all">
                            Add
                        </button>
                    </form>
                </div>

                {/* List */}
                <div className="divide-y divide-white/5">
                    {tasks.length === 0 ? (
                        <div className="p-12 text-center text-slate-500">
                            No tasks found. Start your streak today!
                        </div>
                    ) : (
                        tasks.map((task) => (
                            <div key={task.id} className="group p-4 flex items-center gap-4 hover:bg-white/5 transition-colors">
                                <button
                                    onClick={() => toggleTask(task)}
                                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${task.completed
                                        ? 'bg-neon-green border-neon-green text-navy-900 scale-110'
                                        : 'border-slate-600 hover:border-neon-cyan text-transparent'
                                        }`}
                                >
                                    <Check size={14} strokeWidth={4} />
                                </button>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className={`text-base font-medium transition-all truncate ${task.completed ? 'text-slate-500 line-through' : 'text-white'}`}>
                                            {task.isMicroTask && <span className="text-purple-400 text-xs mr-1">⚡</span>}
                                            {task.title}
                                        </p>
                                        {/* Burnout urgency indicator */}
                                        {!task.completed && (task.postponeCount || 0) > 0 && (
                                            <span className={`flex-shrink-0 text-[10px] font-black px-1.5 py-0.5 rounded ${(task.postponeCount || 0) >= 2
                                                    ? 'bg-red-500/20 text-red-400'
                                                    : 'bg-yellow-500/15 text-yellow-400'
                                                }`}>
                                                {(task.postponeCount || 0) >= 2 ? '🔥' : '⏸'} ×{task.postponeCount}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-3 mt-1">
                                        <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded ${task.category === 'Exam' ? 'bg-neon-orange/10 text-neon-orange' :
                                            task.category === 'Competition' ? 'bg-neon-purple/10 text-neon-purple' :
                                                'bg-neon-cyan/10 text-neon-cyan'
                                            }`}>
                                            {task.category}
                                        </span>
                                        <span className="text-xs text-slate-500">{task.date}</span>
                                        {task.isMicroTask && (
                                            <span className="text-[10px] text-purple-400 font-semibold">10 min · Anti-Gravity</span>
                                        )}
                                    </div>
                                </div>

                                {/* Postpone button — only on incomplete, non-micro tasks */}
                                {!task.completed && !task.isMicroTask && (
                                    <button
                                        onClick={() => handlePostpone(task)}
                                        title="Postpone to tomorrow"
                                        className="p-2 text-slate-600 hover:text-yellow-400 rounded transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
                                    >
                                        <SkipForward size={16} />
                                    </button>
                                )}

                                <button
                                    onClick={() => deleteTask(task.id)}
                                    className="p-2 text-slate-600 hover:text-red-400 rounded transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default Todos;
