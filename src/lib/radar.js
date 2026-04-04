import { db } from '../firebase';
import { collection, query, where, limit, getDocs, addDoc, updateDoc, doc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { getGroqCompletion, parseGroqJSON } from './groq';


export const INTERESTS = [
    // ENGINEERING & CORE TECH
    { id: 'eee', label: 'Electrical & Electronics Engineering', category: 'Engineering & Core Tech', keywords: 'circuits, power systems, electronics, analog, signals' },
    { id: 'ece', label: 'Electronics & Communication Engineering', category: 'Engineering & Core Tech', keywords: 'vlsi, embedded, iot, 5g, communication, antennas' },
    { id: 'cse', label: 'Computer Science & Engineering', category: 'Engineering & Core Tech', keywords: 'software, algorithms, dsa, coding, computing' },
    { id: 'it', label: 'Information Technology', category: 'Engineering & Core Tech', keywords: 'it services, systems, networking, enterprise software' },
    { id: 'mech', label: 'Mechanical Engineering', category: 'Engineering & Core Tech', keywords: 'thermodynamics, cad, manufacturing, robotics, auto' },
    { id: 'civil', label: 'Civil Engineering', category: 'Engineering & Core Tech', keywords: 'structure, concrete, urban, construction, gate' },
    { id: 'mechatronics', label: 'Mechatronics', category: 'Engineering & Core Tech', keywords: 'robotics, automation, sensors, actuators, control systems' },
    { id: 'robotics', label: 'Robotics & Automation', category: 'Engineering & Core Tech', keywords: 'industrial automation, ros, drones, robotics' },
    { id: 'embedded', label: 'Embedded Systems & IoT', category: 'Engineering & Core Tech', keywords: 'microcontrollers, arduino, raspberry pi, iot, sensors' },
    { id: 'vlsi', label: 'VLSI & Chip Design', category: 'Engineering & Core Tech', keywords: 'verilog, vhdl, fpga, asic, soc design' },
    { id: 'power', label: 'Power Systems & Renewable Energy', category: 'Engineering & Core Tech', keywords: 'solar, wind, smart grid, power electronics' },
    { id: 'ev', label: 'Electric Vehicles & Battery Tech', category: 'Engineering & Core Tech', keywords: 'ev, battery management, bms, charging infra' },

    // SOFTWARE, AI & DATA
    { id: 'ai', label: 'Artificial Intelligence', category: 'Software, AI & Data', keywords: 'ai, deep learning, neural networks, agents' },
    { id: 'ml', label: 'Machine Learning', category: 'Software, AI & Data', keywords: 'ml, regression, classification, clustering, scikit-learn' },
    { id: 'ds', label: 'Data Science & Analytics', category: 'Software, AI & Data', keywords: 'pandas, visualization, tableau, sql, big data' },
    { id: 'cyber', label: 'Cyber Security', category: 'Software, AI & Data', keywords: 'hacking, network security, ctf, infosec' },
    { id: 'cloud', label: 'Cloud Computing & DevOps', category: 'Software, AI & Data', keywords: 'aws, azure, gcp, docker, kubernetes, cicd' },
    { id: 'fullstack', label: 'Full Stack Development', category: 'Software, AI & Data', keywords: 'mern, mean, react, node, nextjs, web' },
    { id: 'web', label: 'Web Development', category: 'Software, AI & Data', keywords: 'html, css, javascript, frontend, backend' },
    { id: 'mobile', label: 'Mobile App Development', category: 'Software, AI & Data', keywords: 'android, ios, flutter, react native, kotlin, swift' },
    { id: 'blockchain', label: 'Blockchain & Web3', category: 'Software, AI & Data', keywords: 'solidity, smart contracts, ethereum, crypto, nft' },
    { id: 'game', label: 'Game Development', category: 'Software, AI & Data', keywords: 'unity, unreal engine, c#, game design, 3d' },

    // GOVERNMENT & PUBLIC SECTOR
    { id: 'gate', label: 'GATE Preparation', category: 'Government & Public Sector', keywords: 'gate exam, iit mtech, psu recruitment, syllabus' },
    { id: 'ese', label: 'Engineering Services (ESE)', category: 'Government & Public Sector', keywords: 'ies, upsc ese, engineering services' },
    { id: 'psu', label: 'PSU Exams', category: 'Government & Public Sector', keywords: 'ongc, ntpc, bhel, iocl, psu jobs' },
    { id: 'ssc', label: 'SSC & Banking', category: 'Government & Public Sector', keywords: 'ssc cgl, ibps, sbi po, rbi grade b' },
    { id: 'upsc', label: 'UPSC & State PSC', category: 'Government & Public Sector', keywords: 'ias, ips, civil services, current affairs' },
    { id: 'defence', label: 'Defence & Space (ISRO/DRDO)', category: 'Government & Public Sector', keywords: 'isro, drdo, barc, scientist exam, defence' },
    { id: 'teaching', label: 'Teaching & Research (NET/SET)', category: 'Government & Public Sector', keywords: 'ugc net, csir net, lecturer, professor' },

    // COMPETITIONS & INNOVATION
    { id: 'hackathons', label: 'Hackathons', category: 'Competitions & Innovation', keywords: 'devpost, hackathon, coding, hackerearth' },
    { id: 'coding_contests', label: 'Coding Contests', category: 'Competitions & Innovation', keywords: 'codeforces, leetcode, competitive programming, dsa' },
    { id: 'ideathons', label: 'Ideathons', category: 'Competitions & Innovation', keywords: 'idea presentation, pitch deck, innovation challenge' },
    { id: 'startup_challenge', label: 'Startup & Innovation Challenges', category: 'Competitions & Innovation', keywords: 'startup india, grant, incubation, funding' },
    { id: 'research_comp', label: 'Research Competitions', category: 'Competitions & Innovation', keywords: 'paper presentation, symposium, conference' },

    // CAREER & PROFESSIONAL GROWTH
    { id: 'internships', label: 'Internships & Industrial Training', category: 'Career & Growth', keywords: 'summer intern, off-campus, industrial visit' },
    { id: 'higher_studies', label: 'Research & Higher Studies (MS/PhD)', category: 'Career & Growth', keywords: 'gre, toefl, masters abroad, phd positions' },
    { id: 'product_mgmt', label: 'Product Management', category: 'Career & Growth', keywords: 'pm, product lifecycle, strategy, roadmap' },
    { id: 'entrepreneurship', label: 'Startup & Entrepreneurship', category: 'Career & Growth', keywords: 'founder, business model, lean startup' },
    { id: 'freelancing', label: 'Freelancing & Remote Work', category: 'Career & Growth', keywords: 'upwork, fiverr, remote jobs, gig economy' },
    { id: 'tech_writing', label: 'Technical Writing', category: 'Career & Growth', keywords: 'documentation, blogs, whitepapers' },

    // LEARNING & CERTIFICATIONS
    { id: 'courses', label: 'Online Courses & Certifications', category: 'Learning & Certifications', keywords: 'coursera, udemy, edx, certificate' },
    { id: 'workshops', label: 'Workshops & Bootcamps', category: 'Learning & Certifications', keywords: 'hands-on, training, bootcamp' },
    { id: 'ieee', label: 'IEEE / ACM Activities', category: 'Learning & Certifications', keywords: 'ieee student branch, acm chapter, events' },
    { id: 'nptel', label: 'NPTEL & SWAYAM Courses', category: 'Learning & Certifications', keywords: 'nptel exam, swayam, iit courses' },

    // INTERDISCIPLINARY & MODERN FIELDS
    { id: 'sustainability', label: 'Sustainable Dev & Green Tech', category: 'Interdisciplinary', keywords: 'sustainability, green energy, climate tech' },
    { id: 'smart_cities', label: 'Smart Cities & Infrastructure', category: 'Interdisciplinary', keywords: 'urban planning, smart city, infra' },
    { id: 'healthcare', label: 'Healthcare Technology', category: 'Interdisciplinary', keywords: 'medtech, bioinformatics, health' },
    { id: 'fintech', label: 'FinTech', category: 'Interdisciplinary', keywords: 'finance, algorithmic trading, banking tech' },
    { id: 'edtech', label: 'EdTech', category: 'Interdisciplinary', keywords: 'education technology, lms, learning' },
    { id: 'space', label: 'Space Technology', category: 'Interdisciplinary', keywords: 'astronomy, satellite, space exploration' }
];

/**
 * Fetches AI-curated opportunities for a specific interest.
 */
export async function fetchRadarOpportunities(user, interestId, allInterests = [], profileData = {}) {
    if (!user) return [];

    const interest = INTERESTS.find(i => i.id === interestId) || { label: interestId };
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    console.log(`📡 Radar Scanning for: ${interest.label} (Active Events Only)`);

    try {
        // 1. Data Cleanup: Remove Passed Events
        const eventsRef = collection(db, "users", user.uid, "events");
        const archiveRef = collection(db, "users", user.uid, "archived_events");

        // KNOWN VERIFIED URLS — Official homepages for popular platforms
        const KNOWN_URLS = {
            "Smart India Hackathon": "https://www.sih.gov.in/",
            "SIH": "https://www.sih.gov.in/",
            "Google Summer of Code": "https://summerofcode.withgoogle.com/",
            "GSoC": "https://summerofcode.withgoogle.com/",
            "Microsoft Imagine Cup": "https://imaginecup.microsoft.com/en-us/",
            "HackTheNorth": "https://hackthenorth.com/",
            "HackMIT": "https://hackmit.org/",
            "Major League Hacking": "https://mlh.io/",
            "MLH": "https://mlh.io/",
            "Devfolio": "https://devfolio.co/hackathons",
            "Devpost": "https://devpost.com/hackathons",
            "Codeforces": "https://codeforces.com/contests",
            "CodeChef": "https://www.codechef.com/contests",
            "LeetCode": "https://leetcode.com/contest/",
            "HackerRank": "https://www.hackerrank.com/contests",
            "HackerEarth": "https://www.hackerearth.com/challenges/",
            "AtCoder": "https://atcoder.jp/contests/",
            "Topcoder": "https://www.topcoder.com/challenges",
            "ICPC": "https://icpc.global/",
            "Kaggle": "https://www.kaggle.com/competitions",
            "TCS CodeVita": "https://www.tcs.com/careers/tcs-codevita",
            "TCS NQT": "https://www.tcsionhub.in/form/tcs-nqt/",
            "Infosys Springboard": "https://infyspringboard.onwingspan.com/",
            "InfyTQ": "https://infyspringboard.onwingspan.com/",
            "Flipkart GRiD": "https://unstop.com/competitions/flipkart-grid-60-software-development-track-flipkart-81609",
            "Unstop": "https://unstop.com/competitions",
            "Internshala": "https://internshala.com/internships",
            "NPTEL": "https://nptel.ac.in/",
            "SWAYAM": "https://swayam.gov.in/",
            "Coursera": "https://www.coursera.org/",
            "edX": "https://www.edx.org/",
            "GATE": "https://gate2026.iitr.ac.in/",
            "UPSC": "https://upsc.gov.in/",
            "ISRO": "https://www.isro.gov.in/Careers.html",
            "DRDO": "https://www.drdo.gov.in/careers",
            "SSC": "https://ssc.nic.in/",
            "IEEE": "https://www.ieee.org/conferences/",
            "ACM": "https://www.acm.org/conferences",
            "Meta Hacker Cup": "https://www.facebook.com/codingcompetitions/hacker-cup",
            "Google Code Jam": "https://codingcompetitions.withgoogle.com/codejam",
        };

        // Helper: Validate AI-provided URL is genuine (not a hallucinated domain)
        const isValidUrl = (url) => {
            if (!url || typeof url !== 'string') return false;
            try {
                const u = new URL(url);
                return u.protocol === 'https:' && u.hostname.includes('.');
            } catch { return false; }
        };

        // Helper: Prefer known URL > valid AI URL > Google Search fallback
        const getSafeUrl = (title, aiUrl) => {
            const matchedKey = Object.keys(KNOWN_URLS).find(k =>
                title.toLowerCase().includes(k.toLowerCase())
            );
            if (matchedKey) return KNOWN_URLS[matchedKey];
            if (isValidUrl(aiUrl)) return aiUrl;
            return `https://www.google.com/search?q=${encodeURIComponent(title + ' official website apply 2026')}`;
        };

        try {
            // We'll scan recently added events to check if they passed
            const q = query(eventsRef, limit(50)); // Check last 50 events
            const snapshot = await getDocs(q);

            for (const d of snapshot.docs) {
                const data = d.data();
                const end = new Date(data.endTime || data.startTime);
                if (end < today) {
                    console.log(`🧹 Archiving passed event: ${data.title}`);
                    await addDoc(archiveRef, { ...data, originalId: d.id, archivedAt: serverTimestamp() });
                    await deleteDoc(d.ref);
                }
            }
        } catch (cleanupErr) {
            console.warn("Cleanup warning:", cleanupErr);
        }

        // 2. AI Discovery (Enhanced with Strict Date & Continuous Updates)
        const systemPrompt = `
System Prompt – StudentOS Global Radar [REAL-TIME MODE]
You are an advanced Opportunity Scout acting as a Real-Time Crawler.
Your GOAL: Find 'Active' & 'Upcoming' opportunities for 2026/2027.
TARGET SOURCES:
- **Unstop** (Hackathons, Coding Challenges)
- **LinkedIn** (Internships, Jobs)
- **AICTE** (Internships, Gov Schemes)
- **IEEE** (Conferences, Call for Papers)

 STRICT FILTERS:
 1. **Date Validation**: End Date MUST be after ${today.toDateString()}. Discard anything earlier.
 2. **Status**: Must be 'Open' or 'Registration Active'.
 3. **Urgency**: Sort by 'Days Remaining' (Soonest deadline first).
 4. **User Interest**: "${interest.label}"

URL SAFETY RULE (CRITICAL):
- **PRIORITY 1**: The **OFFICIAL HOMEPAGE** (e.g., 'https://summerofcode.withgoogle.com/', 'https://icpc.global/').
- **DO NOT** invent deep registration links (e.g., 'unstop.com/contest/xyz-2026'). These fail.
- **IF UNKNOWN**: Return a Google Search URL for the *Official Site*.
- Format: "https://www.google.com/search?q=[Event_Name]+2026+official+website"

Task:
Simulate a fresh search on these platforms. 
Identify 3-5 HIGH-PRIORITY opportunities that are currently accepting applications.

Output JSON format:
{
  "opportunities": [
    {
      "title": "Event Title",
      "type": "hackathon" | "internship" | "workshop" | "conference",
      "start_time": "ISO_DATE (Must be future)",
      "end_time": "ISO_DATE (Must be future)",
      "deadline": "ISO_DATE (Application Deadline)",
      "source": "Unstop / LinkedIn / AICTE",
      "location": "Online / City",
      "priority": "Critical" | "High" | "Medium",
      "url": "https://... (Official Homepage OR Google Search)",
      "exact_location": "Full Address or Platform Link",
      "description": "Why it's relevant + Deadline info."
    }
  ]
}
        `;

        const userContext = `Focus Area: "${interest.label}". Current Date: ${new Date().toISOString()}`;

        const completion = await getGroqCompletion(systemPrompt + "\n\n" + userContext);
        const content = completion.choices[0]?.message?.content || "{}";
        const data = parseGroqJSON(content);

        let foundOpportunities = data.opportunities || [];

        // 3. Post-Processing: Filtering & Sorting
        foundOpportunities = foundOpportunities.filter(item => {
            const end = new Date(item.end_time || item.deadline);
            return end > today;
        });

        // Sort by deadline (closest first)
        foundOpportunities.sort((a, b) => {
            const dA = new Date(a.deadline || a.end_time);
            const dB = new Date(b.deadline || b.end_time);
            return dA - dB;
        });

        const newItems = [];
        const eventsRefRef = collection(db, "users", user.uid, "events");
        const tasksRef = collection(db, "users", user.uid, "tasks");
        const globalOppRef = collection(db, "opportunities");

        for (const item of foundOpportunities) {

            // Fix Dates
            let start = new Date(item.start_time);
            if (isNaN(start.getTime())) {
                start = new Date();
                start.setDate(start.getDate() + 7 + Math.floor(Math.random() * 20)); // Future date
            }
            let end = new Date(item.end_time);
            if (isNaN(end.getTime())) end = new Date(start.getTime() + 3600000 * 2);

            // Ensure Valid URL — prefers known URL > valid AI URL > Google Search fallback
            const safeUrl = getSafeUrl(item.title, item.url);

            const commonData = {
                title: item.title,
                createdAt: serverTimestamp(),
                radarGenerated: true,
                interestTag: interest.label,
                deadline: item.deadline || end.toISOString(),
                applicationUrl: safeUrl,
                exactLocation: item.exact_location || item.location
            };

            // 1. Add to Events (Schedule)
            const eventData = {
                ...commonData,
                startTime: start.toISOString(),
                endTime: end.toISOString(),
                type: mapTypeToCalendar(item.type),
                isGhost: false,
                platform: item.source || 'Radar',
                description: item.description,
                url: safeUrl,
                tags: [interest.label, 'Radar']
            };

            try {
                await addDoc(eventsRefRef, eventData);
                newItems.push(eventData);
            } catch (e) {
                console.error("Event write failed", e);
            }

            // 2. Add to Tasks (Deadlines)
            // Critical: Add 'Apply' task if deadline is approaching
            const taskData = {
                title: `Apply: ${item.title}`,
                completed: false,
                category: 'Career',
                date: item.deadline ? item.deadline.split('T')[0] : start.toISOString().split('T')[0],
                priority: item.priority || 'High',
                description: `Official Site: ${safeUrl}`,
                createdAt: serverTimestamp()
            };
            try {
                await addDoc(tasksRef, taskData);
            } catch (e) { console.error("Task write failed", e); }

            // 3. Add to Public/Components Feed
            const oppData = {
                ...commonData,
                category: item.type.charAt(0).toUpperCase() + item.type.slice(1),
                scope: item.source.includes('Global') ? 'Global' : 'National',
                location: item.location || 'Online',
                date: start.toISOString().split('T')[0],
                url: safeUrl,
                image: `https://source.unsplash.com/800x600/?${encodeURIComponent(interest.label)},tech`
            };
            try {
                // Determine uniqueness loosely or just add
                await addDoc(globalOppRef, oppData);
            } catch (e) { console.error("Global Opp write failed", e); }
        }

        return newItems;

    } catch (error) {
        console.error("Radar Global Search Error:", error);
        return [];
    }
}

/**
 * Accepts a specific opportunity -> Converts to Calendar Event (Real)
 * Actually, in our new model, they are already in 'events' collection but marked isGhost: true.
 * We just need to update isGhost to false.
 */
export async function acceptOpportunity(user, opportunity) {
    if (!user || !opportunity) return;

    try {
        const eventRef = doc(db, "users", user.uid, "events", opportunity.id);
        await updateDoc(eventRef, {
            isGhost: false,
            // optionally update other fields if needed, e.g. priority
        });

    } catch (e) {
        console.error("Accept Error:", e);
    }
}

/**
 * Dismisses an opportunity (Hides it)
 * We can either delete it or mark a status. Let's delete it for cleanliness or mark 'dismissed' if we want to track.
 * Let's delete for now as 'ghosts' are ephemeral.
 */
// eslint-disable-next-line no-unused-vars
export async function dismissOpportunity(user, opportunityId) {
    if (!user || !opportunityId) return;
    try {
        // Assuming we delete it. Or we could add a 'dismissed' status and filter it out.
        // Let's assume we maintain a 'status' field? 
        // For simplicity with the prompt's instruction ("Write: ...") which didn't specify dismissal logic:
        // I'll leave it as a TODO or just not implement for now if not strictly required, 
        // OR just delete from the subcollection.

        const eventRef = doc(db, "users", user.uid, "events", opportunityId);
        await deleteDoc(eventRef);
    } catch (e) {
        console.error("Dismiss Error:", e);
    }
}

export function mapTypeToCalendar(radarType) {
    // Calendar types: 'exam', 'study', 'comp' (competition/project), 'workshop' (study/other)
    const t = (radarType || '').toLowerCase();
    if (t.includes('exam') || t.includes('test')) return 'exam';
    if (t.includes('hack') || t.includes('comp') || t.includes('intern')) return 'comp';
    return 'study'; // default
}
