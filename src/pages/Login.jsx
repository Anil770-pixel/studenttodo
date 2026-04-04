import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { X, Loader2, AlertCircle, Mail, Lock } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';

// Sync user with Firestore database
const syncUserWithDatabase = async (user) => {
    if (!user) return;

    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
        await setDoc(userRef, {
            fullName: user.displayName || 'Student',
            email: user.email,
            uid: user.uid,
            photoURL: user.photoURL || '',
            branch: 'General',
            interests: [],
            createdAt: new Date().toISOString(),
            profileCompleted: false,
            radarStatus: "active"
        });
        console.log("✅ New student folder created in Database!");
    } else {
        console.log("✅ User already exists in database");
    }
};

export default function Login() {
    const navigate = useNavigate();
    const { login, loginEmail, user } = useAuth();
    const [error, setError] = useState(null);
    const [isLoggingIn, setIsLoggingIn] = useState(false);

    // Email/Password State
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isEmailLoading, setIsEmailLoading] = useState(false);

    // Auto-Redirect if session exists
    useEffect(() => {
        if (user) {
            navigate('/calendar');
        }
    }, [user, navigate]);

    const handleGoogleLogin = async () => {
        setIsLoggingIn(true);
        setError(null);
        try {
            const userCredential = await login();
            // Sync user with database
            if (userCredential?.user) {
                await syncUserWithDatabase(userCredential.user);
            }
            // User state change will trigger useEffect redirect
        } catch (err) {
            console.error("Login failed:", err);
            setError("Failed to sign in with Google. Please try again.");
            setIsLoggingIn(false);
        }
    };

    const handleEmailLogin = async (e) => {
        e.preventDefault();
        setIsEmailLoading(true);
        setError(null);
        try {
            const userCredential = await loginEmail(email, password);
            // Sync user with database
            if (userCredential?.user) {
                await syncUserWithDatabase(userCredential.user);
            }
            // User state change will trigger useEffect redirect
        } catch (err) {
            console.error("Email Login failed:", err);
            setError("Invalid email or password. Please try again.");
            setIsEmailLoading(false);
        }
    };

    return (
        <div className="relative w-full h-screen bg-[#050505] flex items-center justify-center font-sans overflow-hidden">

            {/* 🌌 Background Atmosphere */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyan-500/10 rounded-full blur-3xl" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 rounded-full blur-3xl" />
            </div>

            {/* 🔐 The "Product Level" Modal */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="z-10 w-full max-w-md bg-[#0F0F0F] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
            >

                {/* Header with Close Button */}
                <div className="flex justify-between items-center p-6 border-b border-white/5">
                    <h2 className="text-xl font-semibold text-white">🚀 Access StudentOS</h2>
                    {/* Optional: Close or X to go back to landing if there was one */}
                </div>

                <div className="p-8 space-y-6">

                    {/* Error Display */}
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-sm flex items-center gap-2">
                            <AlertCircle size={16} />
                            {error}
                        </div>
                    )}

                    <div className="text-center">
                        <h3 className="text-lg font-medium text-white mb-2">Back to the Recovery Engine</h3>
                        <p className="text-gray-400 text-sm">Reschedule your backlog. Plan your week. Growth continues.</p>
                    </div>

                    {/* Email/Password Form */}
                    <form onSubmit={handleEmailLogin} className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-gray-500 uppercase">Email</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="student@university.edu"
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
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full bg-slate-900/50 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white placeholder:text-gray-600 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all outline-none"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoggingIn || isEmailLoading}
                            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-indigo-900/20 flex items-center justify-center gap-2"
                        >
                            {isEmailLoading ? <Loader2 className="animate-spin" size={20} /> : "Launch Session ⚡"}
                        </button>
                    </form>

                    <div className="relative flex py-2 items-center">
                        <div className="flex-grow border-t border-white/10"></div>
                        <span className="flex-shrink-0 mx-4 text-gray-500 text-xs uppercase">Or</span>
                        <div className="flex-grow border-t border-white/10"></div>
                    </div>

                    {/* Google Login Button */}
                    <button
                        onClick={handleGoogleLogin}
                        disabled={isLoggingIn || isEmailLoading}
                        className="w-full bg-white hover:bg-gray-100 text-black font-semibold py-3.5 rounded-xl transition-all flex items-center justify-center gap-3"
                    >
                        {isLoggingIn ? (
                            <>
                                <Loader2 size={18} className="animate-spin text-black" />
                                <span>Connecting...</span>
                            </>
                        ) : (
                            <>
                                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
                                <span>Login via Google</span>
                            </>
                        )}
                    </button>
                </div>

                {/* Footer */}
                <div className="p-4 bg-white/5 text-center border-t border-white/5">
                    <p className="text-xs text-gray-500">
                        New to StudentOS?
                        <Link to="/signup" className="text-cyan-400 hover:underline cursor-pointer ml-1">
                            Create your profile →
                        </Link>
                    </p>
                </div>

            </motion.div>
        </div>
    );
}
