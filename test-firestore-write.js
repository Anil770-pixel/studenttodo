import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";

const firebaseConfig = {
    apiKey: "AIzaSyCBxkg5xghcIE_TRqRv-mrRiIbbsD82E7k",
    authDomain: "student-os-3dfea.firebaseapp.com",
    projectId: "student-os-3dfea",
    storageBucket: "student-os-3dfea.firebasestorage.app",
    messagingSenderId: "752031860653",
    appId: "1:752031860653:web:e75387a1eb660ececc8324",
    measurementId: "G-09TLXGKLPM"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

async function testFirestoreWrite() {
    try {
        // You need to be logged in to test writes
        // Replace with your test account credentials
        console.log("Note: You must be logged in to test Firestore writes.");
        console.log("This test assumes you're authenticated in the browser.");

        // Try to write a test document
        const testRef = collection(db, "test_collection");
        const docRef = await addDoc(testRef, {
            testField: "test value",
            timestamp: new Date().toISOString()
        });

        console.log("✅ SUCCESS! Firestore write worked. Document ID:", docRef.id);
        console.log("Your Firestore rules are configured correctly.");
    } catch (error) {
        console.error("❌ FAILED! Firestore write error:", error.code, error.message);

        if (error.code === 'permission-denied') {
            console.error("\n🔒 PERMISSION DENIED");
            console.error("Your Firestore Security Rules are blocking writes.");
            console.error("\nTo fix this:");
            console.error("1. Go to: https://console.firebase.google.com/");
            console.error("2. Select your project: student-os-3dfea");
            console.error("3. Go to 'Firestore Database' → 'Rules'");
            console.error("4. Update rules to allow authenticated users to write:");
            console.error("\n   rules_version = '2';");
            console.error("   service cloud.firestore {");
            console.error("     match /databases/{database}/documents {");
            console.error("       match /users/{userId}/{document=**} {");
            console.error("         allow read, write: if request.auth != null && request.auth.uid == userId;");
            console.error("       }");
            console.error("       match /{document=**} {");
            console.error("         allow read, write: if request.auth != null;");
            console.error("       }");
            console.error("     }");
            console.error("   }");
        }
    }
}

testFirestoreWrite();
