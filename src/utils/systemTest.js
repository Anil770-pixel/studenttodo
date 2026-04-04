import { db, auth } from '../firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, query, limit } from 'firebase/firestore';

/**
 * Comprehensive System Test
 * Tests all critical Firebase operations
 */
export const runSystemTest = async () => {
    const results = {
        auth: false,
        taskCreate: false,
        taskRead: false,
        eventCreate: false,
        eventRead: false,
        cleanup: false,
        errors: []
    };

    try {
        // 1. CHECK AUTHENTICATION
        const user = auth.currentUser;
        if (!user) {
            results.errors.push("❌ No user logged in");
            return results;
        }
        results.auth = true;
        console.log("✅ 1/6 Authentication OK - User ID:", user.uid);

        // 2. TEST TASK CREATION
        try {
            const tasksRef = collection(db, "users", user.uid, "tasks");
            const testTask = {
                title: "🧪 TEST TASK - DELETE ME",
                completed: false,
                category: 'Test',
                date: new Date().toISOString().split('T')[0],
                createdAt: new Date().toISOString(),
                isTest: true
            };
            const taskDoc = await addDoc(tasksRef, testTask);
            results.taskCreate = true;
            results._testTaskId = taskDoc.id;
            console.log("✅ 2/6 Task Creation OK - ID:", taskDoc.id);
        } catch (e) {
            results.errors.push(`❌ Task Creation Failed: ${e.message}`);
        }

        // 3. TEST TASK READING
        try {
            const tasksRef = collection(db, "users", user.uid, "tasks");
            const q = query(tasksRef, limit(5));
            const snapshot = await getDocs(q);
            results.taskRead = true;
            console.log("✅ 3/6 Task Reading OK - Found", snapshot.size, "tasks");
        } catch (e) {
            results.errors.push(`❌ Task Reading Failed: ${e.message}`);
        }

        // 4. TEST EVENT CREATION
        try {
            const eventsRef = collection(db, "users", user.uid, "events");
            const testEvent = {
                title: "🧪 TEST EVENT - DELETE ME",
                startTime: new Date().toISOString(),
                endTime: new Date(Date.now() + 3600000).toISOString(),
                type: 'study',
                isGhost: false,
                createdAt: new Date().toISOString(),
                isTest: true
            };
            const eventDoc = await addDoc(eventsRef, testEvent);
            results.eventCreate = true;
            results._testEventId = eventDoc.id;
            console.log("✅ 4/6 Event Creation OK - ID:", eventDoc.id);
        } catch (e) {
            results.errors.push(`❌ Event Creation Failed: ${e.message}`);
        }

        // 5. TEST EVENT READING
        try {
            const eventsRef = collection(db, "users", user.uid, "events");
            const q = query(eventsRef, limit(5));
            const snapshot = await getDocs(q);
            results.eventRead = true;
            console.log("✅ 5/6 Event Reading OK - Found", snapshot.size, "events");
        } catch (e) {
            results.errors.push(`❌ Event Reading Failed: ${e.message}`);
        }

        // 6. CLEANUP TEST DATA
        try {
            if (results._testTaskId) {
                await deleteDoc(doc(db, "users", user.uid, "tasks", results._testTaskId));
            }
            if (results._testEventId) {
                await deleteDoc(doc(db, "users", user.uid, "events", results._testEventId));
            }
            results.cleanup = true;
            console.log("✅ 6/6 Cleanup OK - Test data removed");
        } catch (e) {
            results.errors.push(`⚠️ Cleanup Warning: ${e.message}`);
        }

    } catch (error) {
        results.errors.push(`❌ System Error: ${error.message}`);
    }

    return results;
};

/**
 * Format results for display
 */
export const formatTestResults = (results) => {
    const passed = results.auth && results.taskCreate && results.taskRead &&
        results.eventCreate && results.eventRead;

    let message = `🔍 SYSTEM TEST RESULTS\n\n`;
    message += `${results.auth ? '✅' : '❌'} Authentication\n`;
    message += `${results.taskCreate ? '✅' : '❌'} Task Creation\n`;
    message += `${results.taskRead ? '✅' : '❌'} Task Reading\n`;
    message += `${results.eventCreate ? '✅' : '❌'} Event Creation\n`;
    message += `${results.eventRead ? '✅' : '❌'} Event Reading\n`;
    message += `${results.cleanup ? '✅' : '⚠️'} Cleanup\n\n`;

    if (passed) {
        message += `🎉 ALL SYSTEMS OPERATIONAL!\n\n`;
        message += `Your app is working correctly:\n`;
        message += `• AI Planner can save tasks\n`;
        message += `• Calendar can save events\n`;
        message += `• Todos page can load data\n\n`;
        message += `You're ready to use StudentOS!`;
    } else {
        message += `⚠️ ISSUES DETECTED:\n\n`;
        results.errors.forEach(err => {
            message += `${err}\n`;
        });
        message += `\nCheck the console (F12) for details.`;
    }

    return message;
};
