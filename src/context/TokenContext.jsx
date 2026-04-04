import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { db } from '../firebase';
import { doc, getDoc, setDoc, updateDoc, increment } from 'firebase/firestore';
import { useAuth } from './AuthContext';

// ─── Constants ────────────────────────────────────────────────────────────────
const WELCOME_GRANT = 100;      // one-time signup bonus — no daily refills
const REFERRAL_REWARD = 50;     // earned only by referring friends
const TOKEN_COSTS = {
    AI_SCHEDULE: 3,   // AI Planner message
    RADAR_SCAN: 2,   // Interest Radar search
    ANALYZE: 4,   // Analytics AI analysis
    GROWTH_PLAN: 3,   // Growth plan generation
    HACK_YOUR_MONTH: 5,   // AI-generated monthly challenge calendar
};

// ─── Context ──────────────────────────────────────────────────────────────────
const TokenContext = createContext(null);

export const useTokens = () => {
    const ctx = useContext(TokenContext);
    if (!ctx) throw new Error('useTokens must be used inside <TokenProvider>');
    return ctx;
};

// ─── Provider ─────────────────────────────────────────────────────────────────
export const TokenProvider = ({ children }) => {
    const { user } = useAuth();
    const [balance, setBalance] = useState(0);
    const [totalEarned, setTotalEarned] = useState(0);
    const [loading, setLoading] = useState(true);

    // ── Load tokens from Firestore (no daily grant) ──────────────────────────
    useEffect(() => {
        if (!user) { setLoading(false); return; }

        const loadWallet = async () => {
            setLoading(true);
            try {
                const ref = doc(db, 'users', user.uid, 'tokenData', 'wallet');
                const snap = await getDoc(ref);

                if (!snap.exists()) {
                    // First-time user — create wallet with 100 welcome tokens
                    const init = {
                        balance: WELCOME_GRANT,
                        totalEarned: WELCOME_GRANT,
                        createdAt: new Date().toISOString(),
                    };
                    await setDoc(ref, init);
                    setBalance(WELCOME_GRANT);
                    setTotalEarned(WELCOME_GRANT);
                    console.log(`⚡ Welcome! ${WELCOME_GRANT} StudentOS Tokens granted.`);
                } else {
                    const data = snap.data();
                    setBalance(data.balance || 0);
                    setTotalEarned(data.totalEarned || 0);
                }
            } catch (err) {
                console.warn('Token load error:', err);
            } finally {
                setLoading(false);
            }
        };

        loadWallet();
    }, [user]);

    // ── Spend tokens (returns false if insufficient) ─────────────────────────
    const spendTokens = useCallback(async (amount, reason = 'feature') => {
        if (!user) return false;
        if (balance < amount) return false;

        try {
            const ref = doc(db, 'users', user.uid, 'tokenData', 'wallet');
            await updateDoc(ref, { balance: increment(-amount) });
            setBalance(prev => prev - amount);
            console.log(`⚡ Spent ${amount} tokens for: ${reason}`);
            return true;
        } catch (err) {
            console.error('Spend token error:', err);
            return false;
        }
    }, [user, balance]);

    // ── Earn tokens ──────────────────────────────────────────────────────────
    const earnTokens = useCallback(async (amount, reason = 'reward') => {
        if (!user) return;
        try {
            const ref = doc(db, 'users', user.uid, 'tokenData', 'wallet');
            await updateDoc(ref, {
                balance: increment(amount),
                totalEarned: increment(amount),
            });
            setBalance(prev => prev + amount);
            setTotalEarned(prev => prev + amount);
            console.log(`🎉 Earned +${amount} tokens: ${reason}`);
        } catch (err) {
            console.error('Earn token error:', err);
        }
    }, [user]);

    // ── Check if user can afford a feature ───────────────────────────────────
    const canAfford = useCallback((amount) => balance >= amount, [balance]);

    return (
        <TokenContext.Provider value={{
            balance,
            totalEarned,
            loading,
            spendTokens,
            earnTokens,
            canAfford,
            TOKEN_COSTS,
            WELCOME_GRANT,
            REFERRAL_REWARD,
        }}>
            {children}
        </TokenContext.Provider>
    );
};
