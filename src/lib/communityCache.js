/**
 * communityCache.js
 * Global Firestore cache that intercepts Groq API calls.
 * Cache HIT  → return stored result, costs 0 tokens.
 * Cache MISS → call Groq, store result, deduct tokens.
 */
import { db } from '../firebase';
import {
    doc, getDoc, setDoc, updateDoc,
    serverTimestamp, increment
} from 'firebase/firestore';

// ─── Simple deterministic hash ────────────────────────────────────────────────
const hashKey = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const chr = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + chr;
        hash |= 0; // to 32-bit int
    }
    return Math.abs(hash).toString(36);
};

// Normalize query so minor spacing differences map to same cache key
const normalizeQuery = (query) =>
    query.toLowerCase().trim().replace(/\s+/g, ' ');

// ─── Check cache ──────────────────────────────────────────────────────────────
/**
 * checkCommunityCache(query)
 * Returns cached result object or null if not found.
 */
export const checkCommunityCache = async (query) => {
    try {
        const key = hashKey(normalizeQuery(query));
        const ref = doc(db, 'global_cache', key);
        const snap = await getDoc(ref);

        if (snap.exists()) {
            const data = snap.data();
            // Bump hit counter in background (don't await)
            updateDoc(ref, { hitCount: increment(1) }).catch(() => { });
            console.log(`🟢 Cache HIT [${key}] — hits: ${(data.hitCount || 0) + 1}`);
            return data.result;
        }

        console.log(`🔴 Cache MISS [${key}]`);
        return null;
    } catch (err) {
        console.warn('Cache read error:', err);
        return null; // fail open — let Groq handle it
    }
};

// ─── Save to cache ────────────────────────────────────────────────────────────
/**
 * saveToCache(query, result)
 * Stores a Groq result in the global community cache.
 */
export const saveToCache = async (query, result) => {
    try {
        const key = hashKey(normalizeQuery(query));
        const ref = doc(db, 'global_cache', key);
        await setDoc(ref, {
            queryKey: normalizeQuery(query),
            result,
            hitCount: 0,
            createdAt: serverTimestamp(),
        });
        console.log(`💾 Saved to cache [${key}]`);
    } catch (err) {
        console.warn('Cache save error:', err);
        // Non-fatal — user still got their result
    }
};

// ─── Main wrapper ─────────────────────────────────────────────────────────────
/**
 * withCache(queryKey, groqFn, { spendTokens, tokenCost })
 *
 * Usage:
 *   const result = await withCache(
 *     "study-schedule-gate-ai-2026",
 *     () => getGroqCompletion(prompt),
 *     { spendTokens, tokenCost: TOKEN_COSTS.AI_SCHEDULE }
 *   );
 *
 * Returns { result, fromCache: boolean }
 */
export const withCache = async (queryKey, groqFn, options = {}) => {
    const { spendTokens = null, tokenCost = 0 } = options;

    // 1. Try cache first (free)
    const cached = await checkCommunityCache(queryKey);
    if (cached !== null) {
        return { result: cached, fromCache: true, tokensSpent: 0 };
    }

    // 2. Cache miss — check tokens before calling Groq
    if (spendTokens && tokenCost > 0) {
        const ok = await spendTokens(tokenCost, queryKey);
        if (!ok) {
            throw new Error('INSUFFICIENT_TOKENS');
        }
    }

    // 3. Call Groq
    const groqResult = await groqFn();

    // 4. Save result to community cache for future students
    await saveToCache(queryKey, groqResult);

    return { result: groqResult, fromCache: false, tokensSpent: tokenCost };
};
