import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

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

async function testConnection() {
    console.log("Testing Firestore Connection...");
    try {
        const querySnapshot = await getDocs(collection(db, "calendar_events"));
        console.log("Success! Found documents:", querySnapshot.size + " (This means the connection is working)");
    } catch (error) {
        console.error("Connection Failed:", error.code, error.message);
        if (error.cause) console.error("Cause:", error.cause);
    }
}

testConnection();
