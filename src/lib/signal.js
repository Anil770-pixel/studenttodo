/**
 * signal.js — RSS & opportunity aggregator for "The Signal"
 *
 * Uses rss2json.com as a CORS-safe RSS-to-JSON proxy (free, 10k req/mo).
 * Falls back to curated static cards if a feed fails.
 */

const RSS2JSON = 'https://api.rss2json.com/v1/api.json?rss_url=';

// ─── Feed catalogue ──────────────────────────────────────────────────────────
export const FEEDS = [
    // Hackathons & Competitions
    {
        id: 'devpost',
        label: 'Devpost',
        url: 'https://devpost.com/hackathons.rss',
        tags: ['hackathon'],
        emoji: '🏆',
        color: 'blue',
    },
    {
        id: 'unstop',
        label: 'Unstop',
        url: 'https://unstop.com/api/public/opportunity/rss-feed',
        tags: ['hackathon', 'competition', 'internship'],
        emoji: '⚡',
        color: 'purple',
    },
    {
        id: 'aicte',
        label: 'AICTE',
        url: 'https://www.aicte-india.org/rss.php',
        tags: ['scholarship', 'internship', 'notice'],
        emoji: '🎓',
        color: 'green',
    },
    {
        id: 'mlcontests',
        label: 'ML Contests',
        url: 'https://mlcontests.com/feed/',
        tags: ['hackathon', 'ai', 'competition'],
        emoji: '🤖',
        color: 'orange',
    },
    {
        id: 'ieee',
        label: 'IEEE Spectrum',
        url: 'https://spectrum.ieee.org/rss/blog/tech-talk/fulltext',
        tags: ['research', 'paper', 'engineering'],
        emoji: '📡',
        color: 'indigo',
    },
    {
        id: 'acm',
        label: 'ACM TechNews',
        url: 'https://technews.acm.org/rss2.xml',
        tags: ['research', 'cs', 'engineering'],
        emoji: '🔬',
        color: 'teal',
    },
    {
        id: 'internshala',
        label: 'Internshala Blog',
        url: 'https://blog.internshala.com/feed/',
        tags: ['internship', 'career'],
        emoji: '💼',
        color: 'yellow',
    },
];

// ─── Branch → relevant tags ───────────────────────────────────────────────────
const BRANCH_INTEREST_MAP = {
    'eee': ['hackathon', 'engineering', 'ai', 'research'],
    'electrical': ['hackathon', 'engineering', 'research'],
    'ece': ['hackathon', 'engineering', 'ai', 'research'],
    'cse': ['hackathon', 'cs', 'ai', 'internship', 'competition'],
    'cs': ['hackathon', 'cs', 'ai', 'internship', 'competition'],
    'it': ['hackathon', 'cs', 'internship', 'ai'],
    'mechanical': ['engineering', 'research', 'competition'],
    'civil': ['engineering', 'research', 'scholarship'],
    'mba': ['internship', 'career', 'competition'],
    'bba': ['internship', 'career'],
    'default': ['hackathon', 'internship', 'scholarship', 'competition'],
};

export function getRelevantTags(branch = '', interests = []) {
    const key = (branch || '').toLowerCase().trim();
    const found = Object.keys(BRANCH_INTEREST_MAP).find(k => key.includes(k));
    const baseTags = BRANCH_INTEREST_MAP[found] || BRANCH_INTEREST_MAP.default;
    // Force universal tags so we never drop major opportunity feeds
    return [...new Set([...baseTags, ...interests.map(i => i.toLowerCase()), 'hackathon', 'competition', 'internship'])];
}

export function getRelevantFeeds(branch, interests) {
    const tags = getRelevantTags(branch, interests);
    return FEEDS.filter(f => f.tags.some(t => tags.includes(t)));
}

// ─── Fetch + parse one RSS feed ────────────────────────────────────────────────
async function fetchFeed(feed) {
    try {
        const res = await fetch(`${RSS2JSON}${encodeURIComponent(feed.url)}&count=10`, { signal: AbortSignal.timeout(8000) });
        const json = await res.json();

        if (json.status !== 'ok') throw new Error('feed error');

        return (json.items || []).slice(0, 8).map(item => ({
            id: item.guid || item.link,
            title: item.title?.trim(),
            description: stripHtml(item.description || item.content || '').slice(0, 180),
            url: item.link,
            date: item.pubDate ? new Date(item.pubDate) : new Date(),
            tags: feed.tags, // base feed tags
            source: feed.label,
            emoji: feed.emoji,
            color: feed.color,
        }));
    } catch {
        return []; // silently skip dead feeds
    }
}

function stripHtml(html) {
    return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

// ─── Scoring: boost recent items and matching keywords ────────────────────────
function scoreItem(item, relevantTags, interests = []) {
    let score = 0;
    // recency boost: items from the last 14 days score higher
    const ageDays = (Date.now() - item.date.getTime()) / 86_400_000;
    score += Math.max(0, 14 - ageDays) * 3;
    
    // tag relevance (from feed level)
    item.tags.forEach(t => { if (relevantTags.includes(t)) score += 5; });

    // Deep interest matching in Title/Description
    // If the user's specific interest keywords appear in the item, give it a massive boost!
    const searchString = `${item.title} ${item.description}`.toLowerCase();
    interests.forEach(interest => {
        if (searchString.includes(interest.toLowerCase())) {
            score += 25; // Huge boost for items mentioning user's specific interest (e.g., 'ai')
        }
    });

    return score;
}

// ─── Main export: fetch all relevant feeds ────────────────────────────────────
export async function fetchSignal({ branch, interests = [], filterTag = null } = {}) {
    const relevantFeeds = getRelevantFeeds(branch, interests);
    const relevantTags = getRelevantTags(branch, interests);

    const results = await Promise.allSettled(relevantFeeds.map(f => fetchFeed(f)));
    let items = results.flatMap(r => r.status === 'fulfilled' ? r.value : []);

    // Deduplicate by URL
    const seen = new Set();
    items = items.filter(item => {
        if (seen.has(item.url)) return false;
        seen.add(item.url);
        return true;
    });

    // Score & sort
    items = items
        .map(item => ({ ...item, score: scoreItem(item, relevantTags, interests) }))
        .sort((a, b) => b.score - a.score);

    // Optional tag filter
    if (filterTag && filterTag !== 'all') {
        items = items.filter(item => item.tags.includes(filterTag));
    }

    return items;
}

// ─── Fallback static cards (shown if all feeds fail / during load) ─────────────
export const STATIC_FALLBACKS = [
    {
        id: 'sih-2026', title: 'Smart India Hackathon 2026',
        description: 'National-level hackathon with ₹1 lakh+ prizes. Open to all engineering students across India.',
        url: 'https://www.sih.gov.in', tags: ['hackathon', 'competition'],
        source: 'SIH', emoji: '🇮🇳', color: 'orange', date: new Date(), score: 50,
    },
    {
        id: 'unstop-main', title: 'Explore 500+ Open Competitions on Unstop',
        description: 'Hackathons, case studies, quizzes and internships across every domain. Updated daily.',
        url: 'https://unstop.com', tags: ['hackathon', 'internship', 'competition'],
        source: 'Unstop', emoji: '⚡', color: 'purple', date: new Date(), score: 45,
    },
    {
        id: 'devpost-main', title: 'Live Hackathons on Devpost',
        description: 'Find global hackathons with cash prizes, mentorships and bounties. Remote-friendly.',
        url: 'https://devpost.com/hackathons', tags: ['hackathon'],
        source: 'Devpost', emoji: '🏆', color: 'blue', date: new Date(), score: 44,
    },
    {
        id: 'internshala-main', title: 'Browsing Engineering Internships on Internshala',
        description: 'Thousands of verified internships across IT, Core, and Management domains with stipends.',
        url: 'https://internshala.com/internships/engineering-internship', tags: ['internship', 'career'],
        source: 'Internshala', emoji: '💼', color: 'yellow', date: new Date(), score: 40,
    },
    {
        id: 'aicte-portal', title: 'AICTE Internship Portal (NEAT)',
        description: 'Government-backed internship placements for AICTE-approved engineering students.',
        url: 'https://internship.aicte-india.org', tags: ['internship', 'scholarship'],
        source: 'AICTE', emoji: '🎓', color: 'green', date: new Date(), score: 38,
    },
    {
        id: 'acm-icpc', title: 'ICPC — International Collegiate Programming Contest',
        description: 'World\'s oldest and most prestigious programming contest. Registration opens yearly.',
        url: 'https://icpc.global', tags: ['competition', 'cs', 'hackathon'],
        source: 'ICPC', emoji: '💻', color: 'indigo', date: new Date(), score: 36,
    },
];
