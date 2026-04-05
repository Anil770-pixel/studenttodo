import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, Check, Clock, AlertTriangle } from 'lucide-react';
import { useReminders } from '../context/ReminderContext';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';

const NotificationCenter = ({ isOpen, onClose }) => {
    const { activeReminders } = useReminders();
    const { user } = useAuth();

    const handleMarkDone = async (reminder) => {
        if (!user) return;
        const { id, type } = reminder;
        const collectionName = type === 'assessment' ? "assessments" : "tasks";
        const updateData = type === 'assessment' ? { status: 'done' } : { completed: true };
        
        const docRef = doc(db, "users", user.uid, collectionName, id);
        try {
            await updateDoc(docRef, updateData);
        } catch(err) {
            console.error(`Error marking ${type} done:`, err);
        }
    };

    const handleSnooze = async (id) => {
        if (!user) return;
        const taskRef = doc(db, "users", user.uid, "tasks", id);
        try {
            // Push snooze limit up by changing date to tomorrow
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            await updateDoc(taskRef, { date: tomorrow.toISOString().split('T')[0] });
        } catch(err) {
            console.error("Error snoozing:", err);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
                    />
                    
                    {/* Panel */}
                    <motion.div
                        initial={{ x: '100%', opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: '100%', opacity: 0 }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="fixed right-0 top-0 bottom-0 w-full max-w-sm bg-slate-900 border-l border-slate-800 z-50 shadow-2xl flex flex-col"
                    >
                        <div className="p-5 border-b border-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Bell className="text-white" size={20} />
                                <h2 className="text-lg font-bold text-white">Action Center</h2>
                            </div>
                            <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-4">
                            {activeReminders.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-center px-4">
                                    <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-4">
                                        <Check className="text-slate-500" size={32} />
                                    </div>
                                    <p className="text-slate-200 font-semibold mb-1">You're all caught up!</p>
                                    <p className="text-slate-500 text-sm">No intelligent reminders right now. Enjoy the focus.</p>
                                </div>
                            ) : (
                                activeReminders.map(rem => (
                                    <motion.div 
                                        layout
                                        key={rem.id} 
                                        className={`p-4 rounded-2xl border ${rem.isUrgent ? 'bg-red-500/10 border-red-500/20' : 'bg-slate-800/80 border-slate-700'}`}
                                    >
                                        <div className="flex gap-3">
                                            {rem.isUrgent ? <AlertTriangle className="text-red-400 shrink-0" size={18} /> : <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 shrink-0" />}
                                            <div className="flex-1">
                                                <p className={`text-xs font-bold uppercase tracking-wider mb-1 flex items-center justify-between ${rem.isUrgent ? 'text-red-400' : 'text-blue-400'}`}>
                                                    {rem.isUrgent ? 'Priority Rescue' : 'Upcoming Action'}
                                                </p>
                                                <h4 className="text-white font-medium text-sm leading-snug">{rem.title}</h4>
                                                
                                                <div className="flex gap-2 mt-4">
                                                    <button onClick={() => handleMarkDone(rem)} className="flex-1 py-1.5 px-3 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-xs font-bold rounded-lg transition-colors border border-emerald-500/20 flex justify-center items-center gap-1">
                                                        <Check size={14} /> Done
                                                    </button>
                                                    <button onClick={() => handleSnooze(rem.id)} className="flex-1 py-1.5 px-3 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-bold rounded-lg transition-colors flex justify-center items-center gap-1">
                                                        <Clock size={14} /> Tomorrow
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default NotificationCenter;
