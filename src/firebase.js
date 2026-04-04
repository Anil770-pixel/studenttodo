import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore, enableMultiTabIndexedDbPersistence } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAN85fYZgF-UP1yeF-vbMo3R0IZwvGUK48",
  authDomain: "student-3bff7.firebaseapp.com",
  projectId: "student-3bff7",
  storageBucket: "student-3bff7.firebasestorage.app",
  messagingSenderId: "1098858236365",
  appId: "1:1098858236365:web:8f9c96f940bcb8b32f1c84"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export Authentication and Database services
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);

// Enable offline persistence
enableMultiTabIndexedDbPersistence(db).catch((err) => {
    if (err.code == 'failed-precondition') {
        console.warn("Multiple tabs open. Persistence can only be enabled in one tab at a time.");
    } else if (err.code == 'unimplemented') {
        console.warn("Browser doesn't support offline persistence.");
    }
});

// Export analytics as null (not configured in this project) to avoid breaking imports if any
export const analytics = null;

export default app;
