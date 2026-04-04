import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { Mail, Lock, User, BookOpen, Loader2, AlertCircle, ArrowRight, Gift } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { claimReferral } from '../lib/referral';

export default function SignUp() {
    const navigate = useNavigate();
    const { signup } = useAuth();
    const [searchParams] = useSearchParams();
    const referrerUID = searchParams.get('ref');

    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        domain: '', // Optional study domain
        password: ''
    });
    const [error, setError] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setIsSubmitting(true);

        try {
            const result = await signup(formData.email, formData.password, formData.fullName, formData.domain);
            // 🎁 If user signed up via a referral link, reward the referrer
            if (referrerUID && result?.user?.uid) {
                await claimReferral(referrerUID, result.user.uid);
                console.log('✅ Referral claimed for:', referrerUID);
            }
            setTimeout(() => {
                navigate('/dashboard');
            }, 1000);
        } catch (err) {
            console.error("Signup Error:", err);
            setError(err.message || "Failed to create account. Please try again.");
            setIsSubmitting(false);
        }
    };

    return (
        <div className="relative w-full h-screen bg-[#050505] flex items-center justify-center font-sans overflow-hidden">
            {/* 🌌 Background Atmosphere */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-500/10 rounded-full blur-3xl" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyan-500/10 rounded-full blur-3xl" />
            </div>

            {/* Form Card */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="z-10 w-full max-w-md bg-[#0F0F0F] border border-white/10 rounded-2xl shadow-2xl overflow-hidden p-8"
            >
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2 bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
                        🚀 Activate StudentOS
                    </h1>
                    <p className="text-gray-300 font-medium">The operating system for serious students.</p>
                    <p className="text-gray-500 text-xs mt-1">Plan your week. Recover from backlog. Discover opportunities.</p>
                    {referrerUID && (
                        <div className="mt-3 flex items-center justify-center gap-2 bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-2">
                            <Gift size={15} className="text-green-400" />
                            <p className="text-green-400 text-xs font-semibold">You were referred! Your friend earns +50 StudentOS tokens when you launch ⚡</p>
                        </div>
                    )}
                </div>

                {error && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-sm flex items-center gap-2 mb-6"
                    >
                        <AlertCircle size={16} />
                        {error}
                    </motion.div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-500 uppercase">Full Name</label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                            <input
                                type="text"
                                required
                                value={formData.fullName}
                                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                placeholder="John Doe"
                                className="w-full bg-slate-900/50 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white placeholder:text-gray-600 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all outline-none"
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-500 uppercase">Email Address</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                            <input
                                type="email"
                                required
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                placeholder="student@university.edu"
                                className="w-full bg-slate-900/50 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white placeholder:text-gray-600 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all outline-none"
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-500 uppercase">Study Domain (Optional)</label>
                        <div className="relative">
                            <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                            <input
                                type="text"
                                value={formData.domain}
                                onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                                placeholder="e.g. Computer Science, Mechanical..."
                                className="w-full bg-slate-900/50 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white placeholder:text-gray-600 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all outline-none"
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-500 uppercase">Password</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                            <input
                                type="password"
                                required
                                minLength={6}
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                placeholder="••••••••"
                                className="w-full bg-slate-900/50 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white placeholder:text-gray-600 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all outline-none"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-purple-900/20 flex items-center justify-center gap-2 mt-6"
                    >
                        {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <div className="flex items-center gap-2">Launch My Profile <ArrowRight size={18} /></div>}
                    </button>
                </form>

                <div className="mt-6 text-center text-sm text-gray-500">
                    Already flying with StudentOS?{' '}
                    <Link to="/login" className="text-purple-400 hover:text-purple-300 font-medium hover:underline transition-colors">
                        Log back in →
                    </Link>
                </div>
            </motion.div>
        </div>
    );
}
