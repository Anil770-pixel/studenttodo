import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

// Mock DB of potential events to "discover"
const DISCOVERY_DB = {
    'python': [
        { title: 'Python for Data Science Masterclass', type: 'study', duration: 2 },
        { title: 'PyCon India 2026 Registration', type: 'event', duration: 1 },
        { title: 'Automate boring stuff - Week 1', type: 'study', duration: 1.5 }
    ],
    'ai': [
        { title: 'Intro to Neural Networks', type: 'study', duration: 2 },
        { title: 'Global AI Summit 2026', type: 'event', duration: 1 },
        { title: 'Build your first LLM App', type: 'project', duration: 3 }
    ],
    'react': [
        { title: 'React 19 Hooks Deep Dive', type: 'study', duration: 1.5 },
        { title: 'Frontend Masters Challenge', type: 'comp', duration: 1 }
    ],
    'startup': [
        { title: 'YCombinator Winter 2026 Deadline', type: 'deadline', duration: 0 },
        { title: 'Pitch Deck Workshop', type: 'event', duration: 2 }
    ],
    // Fallbacks
    'default': [
        { title: 'Weekly Planning Session', type: 'study', duration: 0.5 },
        { title: 'Review Academic Goals', type: 'study', duration: 1 }
    ]
};

/**
 * INSTANT ENGINE
 * Instantly populates the user's schedule with relevant events based on interests.
 */
export const runInstantSync = async (user, interests) => {
    if (!user || !interests || interests.length === 0) return 0;

    // Import dynamically to avoid circular dependencies if any, though standard import is fine usually
    const { fetchRadarOpportunities } = await import('./radar');

    let totalFound = 0;

    // Run in parallel for each interest (limit to first 3 to avoid rate limits/spam)
    const activeInterests = interests.slice(0, 3);

    console.log("⚡ Starting Global Sync for:", activeInterests);

    const promises = activeInterests.map(interestId =>
        fetchRadarOpportunities(user, interestId, interests)
            .then(items => items.length)
            .catch(e => {
                console.error(`Sync failed for ${interestId}`, e);
                return 0;
            })
    );

    const results = await Promise.all(promises);
    totalFound = results.reduce((a, b) => a + b, 0);

    console.log("✅ Global Sync Complete. Items found:", totalFound);
    return totalFound;
};
