import React, { useState, useEffect, useRef } from 'react';
import { User, Lock, BookOpen, Target, Save, LogOut, Check, Sparkles, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';
import { INTERESTS } from '../lib/radar';
import Card from '../components/Card';
import { runInstantSync } from '../lib/instant_engine';

const Profile = () => {
    const { user, profile, checkUserStatus, logout } = useAuth();
    const [status, setStatus] = useState('idle'); // idle, saving, success

    // Group interests by category
    const groupedInterests = INTERESTS.reduce((acc, interest) => {
        if (!acc[interest.category]) {
            acc[interest.category] = [];
        }
        acc[interest.category].push(interest);
        return acc;
    }, {});

    const [formData, setFormData] = useState({
        full_name: '',
        university: '',
        department: '',
        grad_year: '',
        interests: []
    });

    // Load data from profile whenever it changes
    useEffect(() => {
        if (user || profile) {
            let currentInterests = [];
            if (profile?.interests) {
                currentInterests = Array.isArray(profile.interests)
                    ? profile.interests
                    : (typeof profile.interests === 'string' ? profile.interests.split(',').map(s => s.trim()) : []);
            }

            console.log("Create Profile Form from DB:", profile?.interests);

            setFormData(prev => ({
                ...prev,
                // Prioritize Google Auth Name if profile name is empty/missing
                full_name: (profile?.fullName) || user?.displayName || 'Student',
                university: profile?.college || profile?.university || '',
                department: profile?.branch || profile?.department || '',
                grad_year: profile?.grad_year || '',
                interests: currentInterests
            }));
        }
    }, [profile, user]);

    const toggleInterest = (id) => {
        setFormData(prev => {
            const exists = prev.interests.includes(id);
            if (exists) {
                return { ...prev, interests: prev.interests.filter(i => i !== id) };
            } else {
                return { ...prev, interests: [...prev.interests, id] };
            }
        });
    };

    const handleSave = async () => {
        if (!user) {
            alert("You must be logged in to save.");
            return;
        }
        setStatus('saving');

        try {
            // Clean payload to remove undefined values
            // Explicitly ensure Name is not empty
            const nameToSave = formData.full_name || user.displayName || 'Student';

            const payload = {
                fullName: nameToSave,
                college: formData.university || '',
                branch: formData.department || '',
                interests: Array.isArray(formData.interests) ? formData.interests : []
            };

            console.log("Saving Profile Payload:", payload);

            const userRef = doc(db, "users", user.uid);

            // Create a timeout promise to prevent infinite spinning
            const savePromise = setDoc(userRef, payload, { merge: true });
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error("Request timed out. Please check your internet connection.")), 15000)
            );

            await Promise.race([savePromise, timeoutPromise]);

            console.log("Save complete via Firestore.");

            setStatus('success');
            setTimeout(() => setStatus('idle'), 2000);

            // Run Instant Sync (Non-blocking)
            if (payload.interests && payload.interests.length > 0) {
                runInstantSync(user, payload.interests).catch(err => {
                    console.warn("Background sync warning:", err);
                });
            }
        } catch (error) {
            console.error("Profile Save Error:", error);
            setStatus('idle');
            alert(`Failed to save profile: ${error.message}`);
        }
    };

    const handleLogout = async () => {
        try {
            await logout();
            // Redirect handled by AuthContext or App router usually, but here:
            window.location.href = '/login';
        } catch (e) {
            console.error("Logout Error", e);
            window.location.href = '/login';
        }
    };

    return (
        <div className="max-w-6xl mx-auto pb-24 space-y-8 animate-in fade-in duration-500 relative">

            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-4xl font-bold text-white tracking-tight flex items-center gap-3">
                        Your Profile <span className="text-2xl">🎓</span>
                    </h1>
                    <p className="text-slate-400 mt-2 text-lg">Your academic identity and global radar settings.</p>
                </div>

                <div className="flex items-center gap-6">
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 px-4 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all"
                    >
                        <LogOut size={18} />
                        Sign Out
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* Left Column: Personal Only */}
                <div className="md:col-span-1 space-y-6">
                    <Card className="p-6 border-l-4 border-l-blue-500">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <User className="text-blue-400" size={20} />
                                Identity
                            </h2>
                            <Lock size={14} className="text-slate-500" />
                        </div>
                        <div className="space-y-4">
                            <div className="opacity-70">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Full Name</label>
                                <div className="w-full bg-slate-900/50 border border-slate-800 rounded-lg p-3 text-slate-300 font-medium flex items-center gap-2 cursor-not-allowed">
                                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                                    {formData.full_name}
                                </div>
                                <p className="text-[10px] text-slate-500 mt-1 pl-1">* Sourced from login provider. Read-only.</p>
                            </div>
                            <div className="opacity-70">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email</label>
                                <div className="w-full bg-slate-900/50 border border-slate-800 rounded-lg p-3 text-slate-400 font-mono text-sm cursor-not-allowed">
                                    {user?.email}
                                </div>
                            </div>
                            <div className="pt-2 border-t border-white/5">
                                <label className="block text-xs font-bold text-neon-cyan uppercase mb-1 tracking-widest">Extension Sync Token</label>
                                <div className="flex gap-2">
                                    <div className="flex-1 bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-[10px] font-mono text-slate-500 overflow-hidden text-ellipsis whitespace-nowrap">
                                        {user?.uid}
                                    </div>
                                    <button 
                                        onClick={() => {
                                            navigator.clipboard.writeText(user?.uid);
                                            alert("Sync Token copied! Paste this into your StudentOS Chrome Extension.");
                                        }}
                                        className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-[10px] font-bold transition-all"
                                    >
                                        Copy
                                    </button>
                                </div>
                                <p className="text-[9px] text-slate-600 mt-2 italic leading-tight">
                                    Use this token in the StudentOS Web Clipper to sync Swayam courses directly to this account.
                                </p>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">University</label>
                                <input
                                    type="text"
                                    value={formData.university}
                                    onChange={(e) => setFormData(prev => ({ ...prev, university: e.target.value }))}
                                    placeholder="e.g. Oxford University"
                                    className="w-full bg-slate-900/50 border border-slate-700 rounded-lg py-2.5 px-3 text-slate-300 placeholder:text-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Study Domain (Branch)</label>
                                <input
                                    type="text"
                                    value={formData.department}
                                    onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                                    placeholder="e.g. Computer Science"
                                    className="w-full bg-slate-900/50 border border-slate-700 rounded-lg py-2.5 px-3 text-slate-300 placeholder:text-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all outline-none"
                                />
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Right Column: Interest Radar Settings */}
                <div className="md:col-span-2">
                    <Card className="p-0 h-full flex flex-col relative overflow-hidden bg-slate-900/50 border-slate-800">
                        {/* Header */}
                        <div className="sticky top-0 z-20 bg-slate-900/95 backdrop-blur-xl border-b border-white/5 p-6 flex justify-between items-start">
                            <div>
                                <h2 className="text-2xl font-black text-white flex items-center gap-2">
                                    <Target className="text-neon-cyan" size={24} />
                                    Interest Radar
                                </h2>
                                <p className="text-slate-400 text-sm mt-1">Select your focus areas. StudentOS will get to work.</p>
                                <div className="flex gap-2 mt-4">
                                    <button
                                        onClick={() => setFormData(prev => ({ ...prev, interests: INTERESTS.map(i => i.id) }))}
                                        className="text-xs font-bold px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-neon-cyan rounded-lg border border-slate-700 transition"
                                    >
                                        Select All
                                    </button>
                                    <button
                                        onClick={() => setFormData(prev => ({ ...prev, interests: [] }))}
                                        className="text-xs font-bold px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-lg border border-slate-700 transition"
                                    >
                                        Clear All
                                    </button>
                                    <button
                                        onClick={handleSave}
                                        disabled={status === 'saving' || status === 'success'}
                                        className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition flex items-center gap-1 shadow-lg shadow-primary/20 ${status === 'success'
                                            ? 'bg-green-500 text-white border-green-500 hover:bg-green-600'
                                            : 'bg-primary hover:bg-primary-dark text-white border-primary/50'
                                            }`}
                                    >
                                        {status === 'saving' ? <Loader2 size={12} className="animate-spin" /> :
                                            status === 'success' ? <Check size={12} /> : <Save size={12} />}
                                        {status === 'success' ? 'Saved' : 'Save Changes'}
                                    </button>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="flex flex-col items-end">
                                    <span className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white to-slate-500">
                                        {formData.interests.length}
                                    </span>
                                    <span className="text-[10px] text-slate-500 block uppercase tracking-widest font-bold mt-1">Active Areas</span>
                                </div>
                            </div>
                        </div>

                        {/* Scrollable Content */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
                            {Object.entries(groupedInterests).map(([category, interests]) => (
                                <div key={category} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                            <Sparkles size={12} className="text-neon-purple" />
                                            {category}
                                        </h3>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => {
                                                    const catIds = interests.map(i => i.id);
                                                    const allSelected = catIds.every(id => formData.interests.includes(id));
                                                    setFormData(prev => {
                                                        const newInterests = allSelected
                                                            ? prev.interests.filter(id => !catIds.includes(id))
                                                            : [...new Set([...prev.interests, ...catIds])];
                                                        return { ...prev, interests: newInterests };
                                                    });
                                                }}
                                                className="text-[10px] font-bold px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors uppercase tracking-wider"
                                            >
                                                {interests.every(i => formData.interests.includes(i.id)) ? 'Clear' : 'Select All'}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {interests.map(interest => {
                                            const isSelected = formData.interests.includes(interest.id);
                                            return (
                                                <div
                                                    key={interest.id}
                                                    onClick={() => toggleInterest(interest.id)}
                                                    className={`
                                                        p-4 rounded-xl border cursor-pointer transition-all duration-200 group relative select-none
                                                        ${isSelected
                                                            ? 'bg-neon-cyan/5 border-neon-cyan/50 text-white shadow-[0_0_15px_rgba(6,182,212,0.1)] scale-[1.02]'
                                                            : 'bg-slate-800/20 border-slate-800 text-slate-400 hover:border-slate-600 hover:bg-slate-800/40 active:scale-95'
                                                        }
                                                    `}
                                                >
                                                    <div className="flex justify-between items-center">
                                                        <div>
                                                            <h4 className={`font-bold text-sm ${isSelected ? 'text-neon-cyan' : 'text-slate-300'}`}>
                                                                {interest.label}
                                                            </h4>
                                                        </div>
                                                        {isSelected && (
                                                            <div className="bg-neon-cyan text-slate-900 rounded-full p-0.5 animate-in zoom-in duration-200">
                                                                <Check size={12} strokeWidth={4} />
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
            </div>

            <div className="fixed bottom-0 left-0 right-0 p-4 flex justify-center pointer-events-none">
                {status === 'success' && (
                    <div className="bg-green-500/90 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-2 animate-in slide-in-from-bottom-5">
                        <Check size={18} />
                        <span className="font-bold">Preferences Saved Successfully</span>
                    </div>
                )}
            </div>

        </div>
    );
};

export default Profile;
