const { onSchedule } = require("firebase-functions/v2/scheduler");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const logger = require("firebase-functions/logger");

initializeApp();
const db = getFirestore();

/**
 * The Syncing Robot 🤖
 * Runs every day at 6:00 AM to fetch fresh opportunities.
 */
exports.syncOpportunitiesRobot = onSchedule("every day 06:00", async (event) => {
    logger.info("🤖 Robot waking up... Starting daily opportunity sync.");

    // 1. Simulate Fetching Data (Mock Scraper)
    // In a real scenario, you would use axios/cheerio to scrape sites or fetch from APIs.
    const fetchedEvents = await fetchExternalEvents();

    logger.info(`🔎 Found ${fetchedEvents.length} potential events.`);

    let newCount = 0;

    // 2. Firestore Sync
    const batch = db.batch();
    const opportunitiesRef = db.collection("opportunities");

    for (const event of fetchedEvents) {
        // Check for duplicates based on title (or a unique external_id)
        const snapshot = await opportunitiesRef
            .where("title", "==", event.title)
            .limit(1)
            .get();

        if (snapshot.empty) {
            // It's new! Add it.
            const newDocRef = opportunitiesRef.doc();
            batch.set(newDocRef, {
                ...event,
                createdAt: new Date().toISOString(),
                syncedBy: "automated_robot_v1"
            });
            newCount++;
        }
    }

    // Commit changes
    if (newCount > 0) {
        await batch.commit();
        logger.info(`✅ Successfully added ${newCount} new opportunities to the database.`);
    } else {
        logger.info("💤 No new events found today. Information is already up to date.");
    }
});

/**
 * Helper to simulate fetching from external platforms (Google, LinkedIn, etc.)
 */
async function fetchExternalEvents() {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    const today = new Date();
    const futureDate = (days) => {
        const d = new Date(today);
        d.setDate(today.getDate() + days);
        return d.toISOString().split('T')[0];
    };

    // Realistic Mock Data
    return [
        {
            title: "AWS Student Cloud Challenge 2026",
            category: "Competition",
            scope: "Global",
            location: "Online",
            date: futureDate(45), // 45 days from now
            platform: "AWS",
            tags: ["cloud", "aws", "beginner"],
            url: "https://aws.amazon.com/education/awseducate/",
            image: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&q=80"
        },
        {
            title: "Google Solution Challenge 2026",
            category: "Hackathon",
            scope: "Global",
            location: "Global",
            date: futureDate(60),
            platform: "Google",
            tags: ["google", "impact", "coding"],
            url: "https://developers.google.com/community/gdsc-solution-challenge",
            image: "https://images.unsplash.com/photo-1573164713714-d95e436ab8d6?w=800&q=80"
        },
        {
            title: "National Coding Championship India",
            category: "Competition",
            scope: "National",
            location: "India",
            date: futureDate(20),
            platform: "CodeChef",
            tags: ["coding", "india", "competitive"],
            url: "https://www.codechef.com/",
            image: "https://images.unsplash.com/photo-1504384308090-c54be3855833?w=800&q=80"
        },
        {
            title: "Open Source Contribution Week",
            category: "Workshop",
            scope: "Global",
            location: "GitHub",
            date: futureDate(10),
            platform: "GitHub",
            tags: ["opensource", "git", "learning"],
            url: "https://opensource.guide/",
            image: "https://images.unsplash.com/photo-1618401471353-b98afee0b2eb?w=800&q=80"
        }
    ];
}
