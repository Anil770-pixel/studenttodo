import { motion } from 'framer-motion';
import { TrendingUp, Award, Zap, Loader2, RefreshCw, Check, Briefcase, Hash, AlertTriangle } from 'lucide-react';
import { analyzeProgress } from '../lib/groq';
import { useState, useEffect, useCallback } from 'react';
import { db } from '../firebase';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';

const Analytics = () => {
    const { user, profile } = useAuth();
    const [loading, setLoading] = useState(false);
    const [analysis, setAnalysis] = useState(null);

    // Initial load check or manual refresh
    const runAnalysis = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            // Fetch Real Data via Firestore
            // 1. Events
            const eventsRef = collection(db, "users", user.uid, "events");
            const eventsQ = query(eventsRef, limit(50));
            const eventsSnap = await getDocs(eventsQ);
            const events = eventsSnap.docs
                .map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    start_time: doc.data().startTime // normalize for analyzeProgress
                }))
                .sort((a, b) => new Date(b.startTime || 0) - new Date(a.startTime || 0));

            // 2. Tasks
            const tasksRef = collection(db, "users", user.uid, "tasks");
            const tasksQ = query(tasksRef, limit(50));
            const tasksSnap = await getDocs(tasksQ);
            const tasks = tasksSnap.docs
                .map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }))
                .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

            // 3. Domain
            // Use profile branch or interests as domain hint
            let domain = 'General';
            if (profile) {
                if (profile.branch) domain = profile.branch;
                else if (profile.interests && profile.interests.length > 0) {
                    domain = Array.isArray(profile.interests) ? profile.interests[0] : (typeof profile.interests === 'string' ? profile.interests.split(',')[0] : 'General');
                }
            }

            const result = await analyzeProgress(events, tasks, domain);
            setAnalysis(result);

        } catch (error) {
            console.error("Analysis Failed", error);
            alert("Could not generate analysis. Try again.");
        } finally {
            setLoading(false);
        }
    }, [user, profile]);

    useEffect(() => {
        runAnalysis();
    }, [runAnalysis]);

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-white mb-2">My Progress</h1>
                <button
                    onClick={runAnalysis}
                    disabled={loading || !user}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white font-medium transition-all disabled:opacity-50"
                >
                    {loading ? <Loader2 className="animate-spin" size={18} /> : <RefreshCw size={18} />}
                    <span>{analysis ? 'Refresh Analysis' : 'Generate Report'}</span>
                </button>
            </div>

            {loading && (
                <div className="text-center py-20 bg-slate-900/50 rounded-2xl border border-dashed border-slate-700 animate-pulse">
                    <Loader2 size={48} className="text-indigo-500 mx-auto mb-4 animate-spin" />
                    <h3 className="text-xl text-white font-bold">Analyzing Your Growth...</h3>
                    <p className="text-slate-400 max-w-sm mx-auto mt-2">Crunching numbers from your schedule and tasks.</p>
                </div>
            )}

            {!analysis && !loading && (
                <div className="text-center py-20 bg-slate-900/50 rounded-2xl border border-dashed border-slate-700">
                    <TrendingUp size={48} className="text-slate-600 mx-auto mb-4" />
                    <h3 className="text-xl text-slate-400 font-bold">No Analysis Yet</h3>
                    <p className="text-slate-500 max-w-sm mx-auto mt-2">Click "Generate Report" to let StudentOS analyze your schedule and goals.</p>
                </div>
            )}

            {analysis && !loading && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                    {/* Scores Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="card bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border-indigo-500/20">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="p-3 rounded-lg bg-indigo-500/20 text-indigo-400">
                                    <Award size={24} />
                                </div>
                                <div>
                                    <p className="text-slate-400 text-sm">Academic Focus</p>
                                    <h3 className="text-4xl font-black text-white">{analysis.scores?.academic || 0}%</h3>
                                </div>
                            </div>
                            <div className="w-full bg-slate-800 rounded-full h-2">
                                <div className="bg-indigo-500 h-2 rounded-full" style={{ width: `${analysis.scores?.academic || 0}%` }}></div>
                            </div>
                        </div>

                        <div className="card bg-gradient-to-br from-orange-500/10 to-red-500/10 border-orange-500/20">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="p-3 rounded-lg bg-orange-500/20 text-orange-400">
                                    <Briefcase size={24} />
                                </div>
                                <div>
                                    <p className="text-slate-400 text-sm">Career Growth</p>
                                    <h3 className="text-4xl font-black text-white">{analysis.scores?.career || 0}%</h3>
                                </div>
                            </div>
                            <div className="w-full bg-slate-800 rounded-full h-2">
                                <div className="bg-orange-500 h-2 rounded-full" style={{ width: `${analysis.scores?.career || 0}%` }}></div>
                            </div>
                        </div>

                        <div className="card bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/20">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="p-3 rounded-lg bg-blue-500/20 text-blue-400">
                                    <Hash size={24} />
                                </div>
                                <div>
                                    <p className="text-slate-400 text-sm">Personal Brand</p>
                                    <h3 className="text-4xl font-black text-white">{analysis.scores?.brand || 0}%</h3>
                                </div>
                            </div>
                            <div className="w-full bg-slate-800 rounded-full h-2">
                                <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${analysis.scores?.brand || 0}%` }}></div>
                            </div>
                        </div>
                    </div>

                    {/* Detailed Insights */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Weak Zones & Summary */}
                        <div className="space-y-6">
                            <div className="card bg-gradient-to-r from-slate-900 to-slate-800 border-l-4 border-yellow-500">
                                <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                                    <AlertTriangle size={20} className="text-yellow-500" />
                                    Weak Zones Detected
                                </h3>
                                <ul className="space-y-2">
                                    {analysis.weak_zones?.map((zone, i) => (
                                        <li key={i} className="flex items-center gap-2 text-slate-300">
                                            <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full"></span>
                                            {zone}
                                        </li>
                                    ))}
                                    {(!analysis.weak_zones || analysis.weak_zones.length === 0) && (
                                        <p className="text-slate-500 italic">No major weak zones! Keep it up.</p>
                                    )}
                                </ul>
                            </div>

                            <div className="card bg-gradient-to-r from-violet-600 to-indigo-600 border-none">
                                <div className="flex items-start justify-between mb-4">
                                    <Award className="text-yellow-300" size={32} />
                                    <span className="bg-white/20 px-2 py-1 rounded text-xs text-white">Coach's Summary</span>
                                </div>
                                <p className="text-lg font-bold text-white italic mb-2">
                                    "{analysis.motivational_summary}"
                                </p>
                            </div>
                        </div>

                        {/* Next Actions */}
                        <div className="card bg-slate-900/50">
                            <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                                <Zap size={20} className="text-cyan-400" />
                                Recommended Actions (Next 7 Days)
                            </h3>
                            <div className="space-y-3">
                                {analysis.next_7_days_actions?.map((action, i) => (
                                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-slate-800/50 border border-slate-700 hover:bg-slate-800 transition-colors">
                                        <div className="p-1 rounded-full bg-cyan-500/20 text-cyan-400 mt-0.5">
                                            <Check size={12} />
                                        </div>
                                        <p className="text-sm text-slate-200">{action}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </div>
    );
};

export default Analytics;
