import React, { createContext, useContext, useEffect, useState } from 'react';
import {
    signInWithPopup,
    signOut,
    onAuthStateChanged,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    updateProfile
} from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { auth, googleProvider, db } from '../firebase';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchUserProfile = async (currentUser) => {
        if (!currentUser) {
            setProfile(null);
            return;
        }
        try {
            const docRef = doc(db, "users", currentUser.uid);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                setProfile(docSnap.data());
            } else {
                // If profile doesn't exist in Firestore, create a default one
                // This handles Google Sign-In users who are new
                const defaultProfile = {
                    fullName: currentUser.displayName || 'Student',
                    email: currentUser.email,
                    uid: currentUser.uid,
                    photoURL: currentUser.photoURL || '',
                    branch: 'General', // Default branch
                    interests: [],
                    createdAt: new Date().toISOString(),
                    hasCompletedTour: false
                };
                await setDoc(docRef, defaultProfile);
                setProfile(defaultProfile);
            }
        } catch (error) {
            console.error("Error fetching user profile:", error);
        }
    };

    useEffect(() => {
        console.log('🔄 AuthContext: Initializing...');
        let unsubscribeProfile = null;

        const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
            console.log('🔄 AuthContext: Auth state changed', currentUser ? 'User logged in' : 'No user');
            setUser(currentUser);

            if (currentUser) {
                // Real-time listener for User Profile
                const userRef = doc(db, "users", currentUser.uid);

                // Unsubscribe previous listener if exists (edge case)
                if (unsubscribeProfile) unsubscribeProfile();

                unsubscribeProfile = onSnapshot(userRef, (docSnap) => {
                    console.log('🔄 AuthContext: Profile snapshot received', docSnap.exists());
                    if (docSnap.exists()) {
                        setProfile(docSnap.data());
                    } else {
                        // Create default if missing
                        const defaultProfile = {
                            fullName: currentUser.displayName || 'Student',
                            email: currentUser.email,
                            uid: currentUser.uid,
                            photoURL: currentUser.photoURL || '',
                            branch: 'General',
                            interests: [],
                            createdAt: new Date().toISOString(),
                            hasCompletedTour: false
                        };
                        setDoc(userRef, defaultProfile);
                        setProfile(defaultProfile);
                    }
                    setLoading(false);
                    console.log('✅ AuthContext: Loading complete');
                }, (error) => {
                    console.error("Profile Real-time Error:", error);
                    if (error.code === 'permission-denied') {
                        alert("⚠️ Firestore Database is locked! The web app cannot read your profile details. Please update your Firestore Rules to Test Mode.");
                    }
                    setLoading(false);
                });

            } else {
                setProfile(null);
                setLoading(false);
                console.log('✅ AuthContext: Loading complete (no user)');
                if (unsubscribeProfile) unsubscribeProfile();
            }
        });

        return () => {
            unsubscribeAuth();
            if (unsubscribeProfile) unsubscribeProfile();
        };
    }, []);

    const login = async () => {
        try {
            const result = await signInWithPopup(auth, googleProvider);
            return result;
        } catch (error) {
            console.error("Google Login failed", error);
            throw error;
        }
    };

    const loginEmail = async (email, password) => {
        try {
            const result = await signInWithEmailAndPassword(auth, email, password);
            return result;
        } catch (error) {
            console.error("Email Login failed", error);
            throw error;
        }
    };

    const signup = async (email, password, fullName, domain) => {
        try {
            // 1. Create User in Auth
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const newUser = userCredential.user;

            // 2. Update Auth Profile
            await updateProfile(newUser, {
                displayName: fullName
            });

            // 3. Create Firestore Document (Your requested logic)
            const userProfile = {
                fullName: fullName || 'Student',
                email: email,
                uid: newUser.uid, // ✅ This saves the UID automatically!
                branch: domain || 'General',
                interests: [],
                createdAt: new Date().toISOString(),
                profileCompleted: false,
                hasCompletedTour: false,
                radarStatus: "active"
            };

            await setDoc(doc(db, "users", newUser.uid), userProfile);
            console.log("✅ Automatic Database Entry Created!");

            // 4. Update local state immediately
            setUser(newUser);
            setProfile(userProfile);
            return userCredential; // improved to return credential

        } catch (error) {
            console.error("Signup failed", error);
            throw error;
        }
    };

    const logout = async () => {
        try {
            await signOut(auth);
            // window.location.href = '/login'; // Let router handle redirect
        } catch (error) {
            console.error("Logout failed", error);
        }
    };

    const value = React.useMemo(() => ({
        user,
        profile,
        loading,
        login,
        loginEmail,
        signup,
        logout,
        checkUserStatus: () => fetchUserProfile(auth.currentUser)
    }), [user, profile, loading]);

    return (
        <AuthContext.Provider value={value}>
            {loading ? (
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: '100vh',
                    background: '#0a0a0a',
                    color: '#fff',
                    fontSize: '18px'
                }}>
                    Loading StudentOS...
                </div>
            ) : children}
        </AuthContext.Provider>
    );
};
