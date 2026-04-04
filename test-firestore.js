import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAN85fYZgF-UP1yeF-vbMo3R0IZwvGUK48",
  authDomain: "student-3bff7.firebaseapp.com",
  projectId: "student-3bff7",
  storageBucket: "student-3bff7.firebasestorage.app",
  messagingSenderId: "1098858236365",
  appId: "1:1098858236365:web:8f9c96f940bcb8b32f1c84"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function test() {
  try {
    const docRef = doc(db, "users", "test");
    await getDoc(docRef);
    console.log("Firestore connection successful");
  } catch (e) {
    console.error("Firestore test error:", e);
  }
  process.exit();
}
test();
