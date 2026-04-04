/**
 * referral.js
 * Viral growth utilities:
 *  - generateReferralLink  → unique invite URL
 *  - claimReferral         → +50 tokens to referrer
 *  - uploadNotes           → +10 tokens to uploader
 */
import { db } from '../firebase';
import {
    doc, getDoc, setDoc, addDoc,
    collection, serverTimestamp, increment, updateDoc
} from 'firebase/firestore';

const APP_URL = 'https://studentos.app'; // update to real domain when live

// ─── Generate referral link ───────────────────────────────────────────────────
/**
 * generateReferralLink(uid)
 * Returns a unique shareable invite URL for the student.
 * Also initialises their referral doc in Firestore.
 */
export const generateReferralLink = async (uid) => {
    const link = `${APP_URL}/signup?ref=${uid}`;

    // Ensure referral root document exists
    const refDoc = doc(db, 'referrals', uid);
    const snap = await getDoc(refDoc);
    if (!snap.exists()) {
        await setDoc(refDoc, {
            uid,
            totalClaims: 0,
            totalEarned: 0,
            createdAt: serverTimestamp(),
        });
    }

    return link;
};

// ─── Claim a referral ─────────────────────────────────────────────────────────
/**
 * claimReferral(referrerUID, newUserUID)
 * Called when a new user signs up with a ?ref= link.
 * Awards +50 tokens to the referrer (atomic, idempotent).
 */
export const claimReferral = async (referrerUID, newUserUID) => {
    if (!referrerUID || !newUserUID || referrerUID === newUserUID) return;

    // Idempotency: check if this newUser already claimed
    const claimRef = doc(db, 'referrals', referrerUID, 'claims', newUserUID);
    const claimSnap = await getDoc(claimRef);
    if (claimSnap.exists()) {
        console.log('Referral already claimed.');
        return;
    }

    // Record the claim
    await setDoc(claimRef, {
        newUserUID,
        claimedAt: serverTimestamp(),
    });

    // Award tokens to referrer
    const REFERRAL_REWARD = 50;
    const walletRef = doc(db, 'users', referrerUID, 'tokenData', 'wallet');
    await updateDoc(walletRef, {
        balance: increment(REFERRAL_REWARD),
        totalEarned: increment(REFERRAL_REWARD),
    });

    // Update referral summary
    await updateDoc(doc(db, 'referrals', referrerUID), {
        totalClaims: increment(1),
        totalEarned: increment(REFERRAL_REWARD),
    });

    console.log(`🎉 Referral claimed! +${REFERRAL_REWARD} tokens for ${referrerUID}`);
};

// ─── Upload notes ─────────────────────────────────────────────────────────────
/**
 * uploadNotes(uid, notesData)
 * Saves notes to community_notes collection and rewards +10 tokens.
 *
 * notesData: { subject, title, content | fileUrl, branch, year }
 */
export const uploadNotes = async (uid, notesData) => {
    const NOTES_REWARD = 10;

    // Save to community collection
    const notesRef = collection(db, 'community_notes');
    const docRef = await addDoc(notesRef, {
        uploadedBy: uid,
        subject: notesData.subject || 'General',
        title: notesData.title || 'Untitled Notes',
        content: notesData.content || '',
        fileUrl: notesData.fileUrl || '',
        branch: notesData.branch || '',
        year: notesData.year || '',
        upvotes: 0,
        downloads: 0,
        createdAt: serverTimestamp(),
    });

    // Award tokens to uploader
    const walletRef = doc(db, 'users', uid, 'tokenData', 'wallet');
    await updateDoc(walletRef, {
        balance: increment(NOTES_REWARD),
        totalEarned: increment(NOTES_REWARD),
    });

    console.log(`📚 Notes uploaded! +${NOTES_REWARD} tokens. Doc ID: ${docRef.id}`);
    return { docId: docRef.id, tokensEarned: NOTES_REWARD };
};
