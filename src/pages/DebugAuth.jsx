import { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import Card from '../components/Card';

export default function DebugAuth() {
    const { user, profile } = useAuth();
    const [debugInfo, setDebugInfo] = useState({});
    const [firestoreDoc, setFirestoreDoc] = useState(null);
    const [loading, setLoading] = useState(true);
    const [createStatus, setCreateStatus] = useState('');

    useEffect(() => {
        const checkAuth = async () => {
            setLoading(true);
            const currentUser = auth.currentUser;

            const info = {
                authCurrentUser: currentUser ? 'YES ✅' : 'NO ❌',
                authEmail: currentUser?.email || 'Not logged in',
                authUID: currentUser?.uid || 'No UID',
                authDisplayName: currentUser?.displayName || 'No name',
                contextUser: user ? 'YES ✅' : 'NO ❌',
                contextProfile: profile ? 'YES ✅' : 'NO ❌',
            };

            setDebugInfo(info);

            // Check Firestore
            if (currentUser) {
                try {
                    const userRef = doc(db, "users", currentUser.uid);
                    const docSnap = await getDoc(userRef);

                    if (docSnap.exists()) {
                        setFirestoreDoc({
                            exists: true,
                            data: docSnap.data()
                        });
                    } else {
                        setFirestoreDoc({
                            exists: false,
                            data: null
                        });
                    }
                } catch (error) {
                    setFirestoreDoc({
                        exists: false,
                        error: error.message
                    });
                }
            }

            setLoading(false);
        };

        checkAuth();
    }, [user, profile]);

    const handleCreateDocument = async () => {
        const currentUser = auth.currentUser;
        if (!currentUser) {
            setCreateStatus('❌ No user logged in!');
            return;
        }

        setCreateStatus('⏳ Creating document...');

        try {
            const userRef = doc(db, "users", currentUser.uid);
            await setDoc(userRef, {
                fullName: currentUser.displayName || 'Student',
                email: currentUser.email,
                uid: currentUser.uid,
                photoURL: currentUser.photoURL || '',
                branch: 'General',
                interests: [],
                createdAt: new Date().toISOString(),
                profileCompleted: false,
                radarStatus: "active"
            });

            setCreateStatus('✅ Document created successfully!');

            // Refresh the check
            setTimeout(() => {
                window.location.reload();
            }, 1500);
        } catch (error) {
            setCreateStatus(`❌ Error: ${error.message}`);
            console.error('Create document error:', error);
        }
    };

    const handleCheckFirestore = () => {
        const projectId = 'student-os-3dfea';
        const uid = auth.currentUser?.uid;
        if (uid) {
            window.open(
                `https://console.firebase.google.com/project/${projectId}/firestore/data/~2Fusers~2F${uid}`,
                '_blank'
            );
        } else {
            alert('Please log in first!');
        }
    };

    const handleRepairConnection = async () => {
        if (!window.confirm("This will clear the app's local checking memory and refresh the page. Continue?")) return;

        try {
            // clear standard local storage
            localStorage.clear();
            sessionStorage.clear();

            // Attempt to clear Firebase IndexedDB if possible
            const databases = await window.indexedDB.databases();
            for (const db of databases) {
                if (db.name && db.name.includes('firebase')) {
                    window.indexedDB.deleteDatabase(db.name);
                }
            }

            alert("🧹 Memory cleared! The page will now reload.");
            window.location.reload();
        } catch (e) {
            console.error("Cleanup failed", e);
            alert("Could not auto-clear. Please try opening the app in an Incognito window!");
            window.location.reload();
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-white">Loading debug info...</div>
            </div>
        );
    }

    return (
        <div className="space-y-6 p-6 max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold text-white mb-6">🔍 Authentication & Database Debug</h1>

            <div className="bg-red-500/10 border border-red-500 text-red-200 p-4 rounded-xl flex justify-between items-center">
                <div>
                    <h3 className="font-bold">Seeing "Database not found"?</h3>
                    <p className="text-sm">Your browser might be stuck. Click this to fix it.</p>
                </div>
                <button
                    onClick={handleRepairConnection}
                    className="bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-4 rounded-lg"
                >
                    🧹 Repair Connection
                </button>
            </div>

            {/* Auth Status */}
            <Card className="p-6">
                <h2 className="text-xl font-semibold text-white mb-4">Authentication Status</h2>
                <div className="space-y-2 font-mono text-sm">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="text-gray-400">auth.currentUser:</div>
                        <div className="text-white">{debugInfo.authCurrentUser}</div>

                        <div className="text-gray-400">Email:</div>
                        <div className="text-white">{debugInfo.authEmail}</div>

                        <div className="text-gray-400">UID:</div>
                        <div className="text-cyan-400 break-all">{debugInfo.authUID}</div>

                        <div className="text-gray-400">Display Name:</div>
                        <div className="text-white">{debugInfo.authDisplayName}</div>

                        <div className="text-gray-400">Context User:</div>
                        <div className="text-white">{debugInfo.contextUser}</div>

                        <div className="text-gray-400">Context Profile:</div>
                        <div className="text-white">{debugInfo.contextProfile}</div>
                    </div>
                </div>
            </Card>

            {/* Firestore Status */}
            <Card className="p-6">
                <h2 className="text-xl font-semibold text-white mb-4">Firestore Database Status</h2>

                {firestoreDoc ? (
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className={`text-2xl ${firestoreDoc.exists ? 'text-green-500' : 'text-red-500'}`}>
                                {firestoreDoc.exists ? '✅' : '❌'}
                            </div>
                            <div className="text-white font-semibold">
                                {firestoreDoc.exists
                                    ? 'Document EXISTS in Firestore'
                                    : 'Document DOES NOT EXIST in Firestore'}
                            </div>
                        </div>

                        {firestoreDoc.exists && firestoreDoc.data && (
                            <div className="mt-4">
                                <h3 className="text-sm font-semibold text-gray-400 mb-2">Document Data:</h3>
                                <pre className="bg-slate-900 p-4 rounded-lg text-xs text-green-400 overflow-auto">
                                    {JSON.stringify(firestoreDoc.data, null, 2)}
                                </pre>
                            </div>
                        )}

                        {firestoreDoc.error && (
                            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-sm">
                                Error: {firestoreDoc.error}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-gray-400">Not checked yet</div>
                )}
            </Card>

            {/* Actions */}
            <Card className="p-6">
                <h2 className="text-xl font-semibold text-white mb-4">Actions</h2>

                <div className="space-y-4">
                    {!firestoreDoc?.exists && auth.currentUser && (
                        <div>
                            <button
                                onClick={handleCreateDocument}
                                className="btn-primary w-full"
                            >
                                🛠️ Manually Create User Document
                            </button>
                            {createStatus && (
                                <div className="mt-2 text-sm text-center text-white">
                                    {createStatus}
                                </div>
                            )}
                        </div>
                    )}

                    <button
                        onClick={handleCheckFirestore}
                        className="btn-secondary w-full"
                    >
                        🔗 Open Firestore Console
                    </button>

                    <button
                        onClick={() => window.location.reload()}
                        className="btn-ghost w-full"
                    >
                        🔄 Refresh Debug Info
                    </button>
                </div>
            </Card>

            {/* Instructions */}
            <Card className="p-6 bg-blue-500/5 border-blue-500/20">
                <h2 className="text-xl font-semibold text-white mb-4">📋 What to Check</h2>
                <div className="space-y-2 text-sm text-gray-300">
                    <div>1. ✅ Make sure "auth.currentUser" shows YES</div>
                    <div>2. ✅ Check that UID is displayed (long string starting with letters)</div>
                    <div>3. ✅ Firestore document should show "EXISTS"</div>
                    <div>4. ❌ If document doesn't exist, click "Manually Create User Document"</div>
                    <div>5. 🔗 Click "Open Firestore Console" to verify in Firebase dashboard</div>
                </div>
            </Card>

            {/* Console Logs */}
            <Card className="p-6 bg-purple-500/5 border-purple-500/20">
                <h2 className="text-xl font-semibold text-white mb-4">🖥️ Check Browser Console</h2>
                <div className="text-sm text-gray-300">
                    <p className="mb-2">Press <kbd className="px-2 py-1 bg-slate-800 rounded">F12</kbd> and look for:</p>
                    <ul className="list-disc list-inside space-y-1 ml-4">
                        <li>✅ "User document exists in database"</li>
                        <li>🛠️ "Repairing Database for: [email]"</li>
                        <li>❌ Any red error messages</li>
                    </ul>
                </div>
            </Card>
        </div>
    );
}
