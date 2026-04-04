import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Target, Clock, Calendar, CheckCircle2, Settings, Trash2 } from 'lucide-react';

const StreakSettingsModal = ({ isOpen, onClose, currentSettings, onSave, onDelete }) => {
    const isEdit = !!currentSettings?.id;
    const [goal, setGoal] = useState("");
    const [frequency, setFrequency] = useState("daily");
    const [targetTime, setTargetTime] = useState("21:00");
    const inputRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            setGoal(currentSettings?.goal || "");
            setFrequency(currentSettings?.frequency || "daily");
            setTargetTime(currentSettings?.targetTime || "21:00");
            
            setTimeout(() => {
                inputRef.current?.focus();
            }, 100);
        }
    }, [isOpen, currentSettings]);

    const handleSave = () => {
        if (!goal.trim()) return;
        onSave({ 
            id: currentSettings?.id || Date.now().toString(),
            goal, 
            frequency, 
            targetTime 
        });
        onClose();
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleSave();
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/80 backdrop-blur-md z-[110] flex items-center justify-center p-4"
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="w-full max-w-md bg-[#0f172a] border border-white/10 rounded-[32px] overflow-hidden shadow-2xl flex flex-col"
                >
                    {/* Header */}
                    <div className="p-8 pb-4 flex justify-between items-start">
                        <div>
                            <h2 className="text-2xl font-black text-white flex items-center gap-3">
                                <Settings size={22} className="text-primary" />
                                {isEdit ? 'Edit Mission' : 'New Mission'}
                            </h2>
                            <p className="text-slate-400 text-sm mt-1">Design your ultimate habit streak.</p>
                        </div>
                        <button onClick={onClose} className="p-2 text-slate-500 hover:text-white bg-white/5 rounded-xl transition-all">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="p-8 space-y-6">
                        {/* Goal Name */}
                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                                <Target size={14} /> Mission Goal
                            </label>
                            <input 
                                ref={inputRef}
                                type="text"
                                value={goal}
                                onChange={(e) => setGoal(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="e.g., Coding Practice, Morning Run"
                                className="w-full bg-slate-900 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-primary transition-all font-medium"
                            />
                        </div>

                        {/* Frequency & Time Side-by-Side */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                                    <Calendar size={14} /> Freq
                                </label>
                                <select 
                                    value={frequency}
                                    onChange={(e) => setFrequency(e.target.value)}
                                    className="w-full bg-slate-900 border border-white/10 rounded-2xl px-4 py-4 text-white focus:outline-none focus:border-primary transition-all font-bold appearance-none cursor-pointer"
                                >
                                    <option value="daily">Daily</option>
                                    <option value="weekly">Weekly</option>
                                    <option value="monthly">Monthly</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                                    <Clock size={14} /> Deadline
                                </label>
                                <input 
                                    type="time"
                                    value={targetTime}
                                    onChange={(e) => setTargetTime(e.target.value)}
                                    className="w-full bg-slate-900 border border-white/10 rounded-2xl px-4 py-4 text-white focus:outline-none focus:border-primary transition-all font-mono"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="p-8 pt-0 flex justify-between items-center gap-3">
                        {isEdit ? (
                            <button
                                onClick={() => { onDelete(currentSettings.id); onClose(); }}
                                className="p-4 text-red-500 hover:bg-red-500/10 rounded-2xl transition-all flex items-center gap-2 font-bold text-sm"
                            >
                                <Trash2 size={18} />
                                Delete
                            </button>
                        ) : <div />}
                        
                        <div className="flex gap-3">
                            <button
                                onClick={onClose}
                                className="px-6 py-4 font-bold text-slate-500 hover:text-white transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                className="flex items-center gap-2 px-8 py-4 bg-primary hover:bg-primary-hover shadow-xl shadow-primary/20 text-white font-black rounded-2xl transition-all active:scale-95 group"
                            >
                                {isEdit ? 'Update' : 'Deploy'}
                                <CheckCircle2 size={18} className="group-hover:scale-110 transition-transform" />
                            </button>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default StreakSettingsModal;
