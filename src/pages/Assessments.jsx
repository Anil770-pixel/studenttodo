import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Plus, Calendar as CalendarIcon, Clock, CheckCircle, AlertOctagon, MoreVertical } from 'lucide-react';
import Card from '../components/Card';
import { db, auth } from '../firebase';
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, doc, deleteDoc, writeBatch } from 'firebase/firestore';
import { parseSwayamSyllabus } from '../lib/groq';
import '../styles/rescue.css';

const Assessments = () => {
    const [assessments, setAssessments] = useState([]);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [loading, setLoading] = useState(true);

    const [formData, setFormData] = useState({
        courseName: '',
        weekNumber: '',
        lastDate: '',
        status: 'pending' // pending, done, missed
    });

    const [importMode, setImportMode] = useState('manual'); // manual, turbo, ai
    const [swayamData, setSwayamData] = useState({
        name: '',
        duration: 8
    });
    const [syllabusText, setSyllabusText] = useState('');
    const [isParsing, setIsParsing] = useState(false);

    const handleAISmartPaste = async () => {
        if (!syllabusText.trim() || !auth.currentUser) return;
        setIsParsing(true);
        try {
            const items = await parseSwayamSyllabus(syllabusText);
            const batch = writeBatch(db);
            items.forEach(item => {
                const docRef = doc(collection(db, "users", auth.currentUser.uid, "assessments"));
                batch.set(docRef, {
                    ...item,
                    status: 'pending',
                    createdAt: new Date().toISOString()
                });
            });
            await batch.commit();
            setIsAddModalOpen(false);
            setSyllabusText('');
            alert(`AI Shield Activated! Tracked ${items.length} accurate course milestones.`);
        } catch (error) {
            console.error("AI Parse Error:", error);
            alert("AI could not read that. Try pasting the 'About Course' section from Swayam.");
        } finally {
            setIsParsing(false);
        }
    };

    const handleTurboImport = async () => {
        if (!swayamData.name || !auth.currentUser) return;

        // Official SWAYAM Jan 2026 Baseline: Starts Jan 19 (Monday)
        const startDate = new Date('2026-01-19');
        const batchItems = [];

        // 1. Weekly Assignments
        for (let i = 1; i <= swayamData.duration; i++) {
            // Standard NPTEL Deadline: Week X + 15 days (Usually a Tuesday)
            const deadline = new Date(startDate);
            deadline.setDate(startDate.getDate() + (i * 7) + 1); // Tuesday of following week
            
            batchItems.push({
                courseName: swayamData.name,
                weekNumber: `Assignment Week ${i}`,
                lastDate: deadline.toISOString().split('T')[0],
                status: 'pending',
                type: 'swayam_assignment',
                createdAt: new Date().toISOString()
            });
        }

        // 2. Exam Fee Registration (Usually deadline is ~Mid Feb for Jan session)
        batchItems.push({
            courseName: swayamData.name,
            weekNumber: "Exam Fee & Registration Deadline",
            lastDate: "2026-02-16",
            status: 'pending',
            type: 'swayam_fee',
            createdAt: new Date().toISOString()
        });

        // 3. Final Exam (Usually April 25/26 for full courses)
        const examDate = swayamData.duration === 12 ? "2026-04-25" : (swayamData.duration === 8 ? "2026-03-29" : "2026-03-28");
        batchItems.push({
            courseName: swayamData.name,
            weekNumber: "Proctored Final Exam",
            lastDate: examDate,
            status: 'pending',
            type: 'swayam_exam',
            createdAt: new Date().toISOString()
        });

        try {
            const batch = writeBatch(db);
            batchItems.forEach(item => {
                const docRef = doc(collection(db, "users", auth.currentUser.uid, "assessments"));
                batch.set(docRef, item);
            });
            await batch.commit();
            setIsAddModalOpen(false);
            setSwayamData({ name: '', duration: 8 });
            alert(`Turbo Success! Managed to track ${batchItems.length} course touchpoints.`);
        } catch (error) {
            console.error("Turbo Import Error:", error);
            alert("Failed to turbo import. Connection issue?");
        }
    };

    useEffect(() => {
        if (!auth.currentUser) return;
        const q = query(collection(db, "users", auth.currentUser.uid, "assessments"), orderBy("lastDate", "asc"));
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            // Auto-detect missed assignments based on today's date if not already marked "done"
            const todayStr = new Date().toISOString().split('T')[0];
            const autoUpdated = data.map(item => {
                let currentStatus = item.status;
                if (item.status === 'pending' && item.lastDate < todayStr) {
                    currentStatus = 'missed';
                }
                return { ...item, status: currentStatus };
            });

            setAssessments(autoUpdated);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const handleAddAssessment = async (e) => {
        e.preventDefault();
        if (!formData.courseName || !formData.lastDate) return;

        try {
            await addDoc(collection(db, "users", auth.currentUser.uid, "assessments"), {
                ...formData,
                createdAt: new Date().toISOString()
            });
            setIsAddModalOpen(false);
            setFormData({ courseName: '', weekNumber: '', lastDate: '', status: 'pending' });
        } catch (error) {
            console.error("Error adding assessment:", error);
            alert("Failed to save.");
        }
    };

    const updateStatus = async (id, newStatus) => {
        try {
            await updateDoc(doc(db, "users", auth.currentUser.uid, "assessments", id), {
                status: newStatus
            });
        } catch (error) {
            console.error("Status update error", error);
        }
    };

    const deleteAssessment = async (id) => {
        if(confirm("Are you sure you want to delete this assessment record?")) {
            await deleteDoc(doc(db, "users", auth.currentUser.uid, "assessments", id));
        }
    }

    const todayStr = new Date().toISOString().split('T')[0];
    
    // Status metrics
    const pendingCount = assessments.filter(a => a.status === 'pending').length;
    const completedCount = assessments.filter(a => a.status === 'done').length;
    const missedCount = assessments.filter(a => a.status === 'missed').length;

    return (
        <div className="max-w-6xl mx-auto pb-24 space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                <div>
                    <h1 className="text-4xl font-bold text-white tracking-tight flex items-center gap-3">
                        Assessment Shield <Shield className="text-green-400" size={36} />
                    </h1>
                    <p className="text-slate-400 mt-2 text-lg">Never miss a SWAYAM or hard-deadline course submission again.</p>
                </div>
                <button 
                    onClick={() => setIsAddModalOpen(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl transition-all shadow-lg active:scale-95"
                >
                    <Plus size={18} /> Track Assessment
                </button>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-3 gap-4">
                <Card className="p-4 border-l-4 border-slate-500 bg-slate-900/50">
                    <p className="text-slate-400 text-xs font-bold uppercase">Pending</p>
                    <p className="text-2xl font-black text-white mt-1">{pendingCount}</p>
                </Card>
                <Card className="p-4 border-l-4 border-green-500 bg-green-500/10">
                    <p className="text-green-500 text-xs font-bold uppercase">Completed</p>
                    <p className="text-2xl font-black text-green-400 mt-1">{completedCount}</p>
                </Card>
                <Card className="p-4 border-l-4 border-red-500 bg-red-500/10">
                    <p className="text-red-500 text-xs font-bold uppercase">Missed</p>
                    <p className="text-2xl font-black text-red-400 mt-1">{missedCount}</p>
                </Card>
            </div>

            {/* Grid */}
            {loading ? (
                <div className="text-slate-500 text-center py-20">Loading shield data...</div>
            ) : assessments.length === 0 ? (
                <div className="text-center py-20 bg-slate-900/50 rounded-3xl border border-dashed border-slate-700">
                    <Shield size={48} className="text-slate-600 mx-auto mb-4" />
                    <h3 className="text-xl text-slate-400 font-bold">Shield is Empty</h3>
                    <p className="text-slate-500 max-w-sm mx-auto mt-2">Add your upcoming SWAYAM / NPTEL assignments to get protected.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {assessments.map(item => {
                        // Calculate days left
                        const target = new Date(item.lastDate);
                        const today = new Date(todayStr);
                        const diffTime = (target - today);
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                        let statusColor = "border-slate-800 bg-slate-900/50";
                        let statusText = "text-slate-400";
                        let statusIcon = <Clock size={16} />;
                        let warningText = "";

                        if (item.status === 'done') {
                            statusColor = "border-green-500/30 bg-green-500/5";
                            statusText = "text-green-400";
                            statusIcon = <CheckCircle size={16} />;
                            warningText = "Secured";
                        } else if (item.status === 'missed') {
                            statusColor = "border-red-500/30 bg-red-500/5";
                            statusText = "text-red-400";
                            statusIcon = <AlertOctagon size={16} />;
                            warningText = "Missed";
                        } else {
                            // Pending logic & Rescue Strikes
                            const dateObj = new Date(item.lastDate);
                            const hoursLeft = (dateObj - today) / (1000 * 60 * 60);

                            if (hoursLeft < 0) warningText = "Overdue";
                            else if (hoursLeft < 6) {
                                warningText = "RESCUE MODE: <6H LEFT!";
                                statusColor = "strike-3";
                                statusText = "text-red-500 font-black";
                                statusIcon = <AlertOctagon size={16} className="text-red-500 animate-bounce" />;
                            }
                            else if (hoursLeft < 24) {
                                warningText = "WARNING: STRIKE 2 (24H)";
                                statusColor = "strike-2";
                                statusText = "text-red-400";
                                statusIcon = <Clock size={16} className="text-red-400" />;
                            }
                            else if (hoursLeft < 72) {
                                warningText = "STRIKE 1 (3 Days Remaining)";
                                statusColor = "strike-1";
                                statusText = "text-yellow-400";
                            }
                            else if (diffDays === 0) {
                                warningText = "Due TODAY";
                                statusColor = "border-orange-500/50 bg-orange-500/10";
                                statusText = "text-orange-400";
                                statusIcon = <AlertOctagon size={16} className="animate-pulse" />;
                            }
                            else if (diffDays <= 3) {
                                warningText = `Closing in ${diffDays} days`;
                                statusColor = "border-yellow-500/30 bg-yellow-500/10";
                                statusText = "text-yellow-400";
                            } else {
                                warningText = `${diffDays} days left`;
                            }
                        }

                        return (
                            <Card key={item.id} className={`p-5 rounded-2xl border transition-all ${statusColor} group relative overflow-hidden flex flex-col justify-between min-h-[160px]`}>
                                <div>
                                    <div className="flex justify-between items-start mb-2">
                                        <div className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider flex items-center gap-1 ${item.status==='done'?'bg-green-500/20 text-green-400': 'bg-slate-800 text-slate-300'}`}>
                                            {statusIcon} {item.status}
                                        </div>
                                        <button onClick={() => deleteAssessment(item.id)} className="text-slate-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">
                                            <MoreVertical size={16} />
                                        </button>
                                    </div>
                                    <h3 className="font-bold text-white text-lg">
                                        {item.courseName}
                                    </h3>
                                    {item.weekNumber && (
                                        <p className="text-sm font-medium text-slate-400">Week / Module {item.weekNumber}</p>
                                    )}
                                </div>
                                <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-end">
                                    <div>
                                        <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Last Date</p>
                                        <p className="text-sm font-medium text-slate-300 flex items-center gap-1.5 border border-white/10 px-2 py-1 rounded bg-slate-900 w-fit">
                                            <CalendarIcon size={12} /> {item.lastDate}
                                        </p>
                                    </div>
                                    
                                    {item.status === 'pending' ? (
                                        <div className="flex flex-col items-end gap-2">
                                            <span className={`text-xs font-bold ${statusText}`}>{warningText}</span>
                                            <button 
                                                onClick={() => updateStatus(item.id, 'done')}
                                                className="px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white text-xs font-bold rounded-lg transition-colors"
                                            >
                                                Mark Done
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-end">
                                            <span className={`text-xs font-bold ${statusText}`}>{warningText}</span>
                                        </div>
                                    )}
                                </div>
                            </Card>
                        )
                    })}
                </div>
            )}

            {/* Add Modal */}
            <AnimatePresence>
                {isAddModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div 
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md overflow-hidden relative shadow-2xl"
                        >
                            <div className="p-6">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-xl font-bold text-white">Track New Assessment</h3>
                                    <div className="px-2 py-1 bg-green-500/20 text-green-400 text-[10px] font-black uppercase rounded flex items-center gap-1">
                                        <Shield size={10} /> Smart Shield
                                    </div>
                                </div>

                                <div className="flex p-1 bg-slate-950 rounded-xl mb-6 border border-slate-800">
                                    <button 
                                        onClick={() => setImportMode('manual')}
                                        className={`flex-1 py-2 text-[10px] font-bold rounded-lg transition-all ${importMode === 'manual' ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-500'}`}
                                    >
                                        Manual
                                    </button>
                                    <button 
                                        onClick={() => setImportMode('turbo')}
                                        className={`flex-1 py-2 text-[10px] font-bold rounded-lg transition-all ${importMode === 'turbo' ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-500'}`}
                                    >
                                        Turbo
                                    </button>
                                    <button 
                                        onClick={() => setImportMode('ai')}
                                        className={`flex-1 py-2 text-[10px] font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${importMode === 'ai' ? 'bg-green-600 text-white shadow-lg' : 'text-slate-500'}`}
                                    >
                                        <Shield size={12} /> Smart Paste (AI)
                                    </button>
                                </div>

                                {importMode === 'manual' ? (
                                    <form onSubmit={handleAddAssessment} className="space-y-4">
                                        {/* ... manual form unchanged ... */}
                                        <div>
                                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Course Name</label>
                                            <input 
                                                required autoFocus
                                                type="text" 
                                                placeholder="e.g. SWAYAM: Joy of Computing"
                                                value={formData.courseName}
                                                onChange={e => setFormData({...formData, courseName: e.target.value})}
                                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Week / Module</label>
                                                <input 
                                                    type="text" 
                                                    placeholder="e.g. Week 4"
                                                    value={formData.weekNumber}
                                                    onChange={e => setFormData({...formData, weekNumber: e.target.value})}
                                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-green-500 outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Last Date</label>
                                                <input 
                                                    required
                                                    type="date" 
                                                    value={formData.lastDate}
                                                    onChange={e => setFormData({...formData, lastDate: e.target.value})}
                                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-green-500 outline-none [color-scheme:dark]"
                                                />
                                            </div>
                                        </div>
                                        <div className="flex gap-3 justify-end mt-8">
                                            <button 
                                                type="button" 
                                                onClick={() => setIsAddModalOpen(false)}
                                                className="px-5 py-2.5 text-slate-400 font-bold hover:text-white transition-colors"
                                            >
                                                Cancel
                                            </button>
                                            <button 
                                                type="submit" 
                                                className="px-6 py-2.5 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl transition-all shadow-lg active:scale-95"
                                            >
                                                Save to Shield
                                            </button>
                                        </div>
                                    </form>
                                ) : importMode === 'turbo' ? (
                                    <div className="space-y-4">
                                        {/* ... turbo form unchanged ... */}
                                        <div>
                                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Course Name</label>
                                            <input 
                                                required autoFocus
                                                type="text" 
                                                placeholder="e.g. Data structures using Python"
                                                value={swayamData.name}
                                                onChange={e => setSwayamData({...swayamData, name: e.target.value})}
                                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-green-500 outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Select Duration</label>
                                            <div className="grid grid-cols-3 gap-2">
                                                {[4, 8, 12].map(d => (
                                                    <button 
                                                        key={d}
                                                        onClick={() => setSwayamData({...swayamData, duration: d})}
                                                        className={`py-3 rounded-xl border font-bold text-sm transition-all ${swayamData.duration === d ? 'bg-green-500/20 border-green-500 text-green-400' : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700'}`}
                                                    >
                                                        {d} Weeks
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="flex gap-3 justify-end mt-8">
                                            <button 
                                                type="button" 
                                                onClick={() => setIsAddModalOpen(false)}
                                                className="px-5 py-2.5 text-slate-400 font-bold hover:text-white transition-colors"
                                            >
                                                Cancel
                                            </button>
                                            <button 
                                                disabled={!swayamData.name}
                                                onClick={handleTurboImport}
                                                className="px-6 py-2.5 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:grayscale"
                                            >
                                                Generate Full Schedule
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl">
                                            <p className="text-xs text-green-400 font-bold flex items-center gap-2">
                                                <Shield size={14} /> AI Smart Paste (Beta)
                                            </p>
                                            <p className="text-[10px] text-slate-400 mt-1 italic">
                                                Paste your Swayam Course syllabus or "About Course" text. AI will identify the weeks and deadlines automatically.
                                            </p>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Paste Syllabus Text</label>
                                            <textarea 
                                                autoFocus
                                                value={syllabusText}
                                                onChange={e => setSyllabusText(e.target.value)}
                                                placeholder="e.g. This course is for 4 weeks. Assignment 1 is due on Jan 27..."
                                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-green-500 outline-none min-h-[150px] text-xs leading-relaxed"
                                            />
                                        </div>
                                        <div className="flex gap-3 justify-end mt-4">
                                            <button 
                                                type="button" 
                                                onClick={() => setIsAddModalOpen(false)}
                                                className="px-5 py-2.5 text-slate-400 font-bold hover:text-white transition-colors"
                                            >
                                                Cancel
                                            </button>
                                            <button 
                                                disabled={!syllabusText.trim() || isParsing}
                                                onClick={handleAISmartPaste}
                                                className="px-6 py-2.5 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl transition-all shadow-lg active:scale-95 disabled:opacity-50 flex items-center gap-2"
                                            >
                                                {isParsing ? (
                                                    <>
                                                        <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                                        Analyzing...
                                                    </>
                                                ) : (
                                                    'Activate AI Shield'
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Assessments;
