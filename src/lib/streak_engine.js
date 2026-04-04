/**
 * Calculates current streak state based on date diffs, frequency, and target time.
 */
export function evaluateStreakStatus(lastActionDate, currentStreak, currentStatus, frequency = "daily", targetTime = "21:00") {
    if (!lastActionDate || currentStreak === 0) {
        return { status: "lost", daysDiff: -1, isLost: true, isOverdue: false };
    }

    const parseDate = (d) => {
        if (!d) return null;
        if (d.toDate) return d.toDate(); // Firestore Timestamp
        return new Date(d); // ISO string or other
    };

    const lastAction = parseDate(lastActionDate);
    if (!lastAction || currentStreak === 0) {
        return { status: "lost", daysDiff: -1, isLost: true, isOverdue: false };
    }

    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    lastAction.setHours(0, 0, 0, 0);

    const diffTime = Math.abs(today - lastAction);
    const daysDiff = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    // Time Check Logic
    const [targetH, targetM] = targetTime.split(":").map(Number);
    const targetDate = new Date(now);
    targetDate.setHours(targetH, targetM, 0, 0);
    const isPastTarget = now > targetDate;

    let newStatus = currentStatus;
    let isLost = false;
    let isOverdue = false;

    if (frequency === "daily") {
        if (daysDiff === 0) {
            newStatus = currentStatus;
        } else if (daysDiff === 1) {
            newStatus = "live";
            if (isPastTarget) {
                isOverdue = true;
                newStatus = "risk";
            }
        } else if (daysDiff === 2) {
            newStatus = "risk";
        } else {
            newStatus = "lost";
            isLost = true;
        }
    } else if (frequency === "weekly") {
        if (daysDiff < 7) {
            newStatus = "live";
            if (daysDiff >= 6 && isPastTarget) isOverdue = true;
        } else if (daysDiff < 14) {
            newStatus = "risk";
        } else {
            newStatus = "lost";
            isLost = true;
        }
    } else if (frequency === "monthly") {
        if (daysDiff < 30) {
            newStatus = "live";
            if (daysDiff >= 28 && isPastTarget) isOverdue = true;
        } else if (daysDiff < 60) {
            newStatus = "risk";
        } else {
            newStatus = "lost";
            isLost = true;
        }
    }

    return { status: newStatus, daysDiff, isLost, isOverdue };
}

/**
 * Handles "Saving" a streak via a micro-task.
 */
export function processRescueAction(currentStreakData) {
    const todayStr = new Date().toISOString();
    return {
        ...currentStreakData,
        status: "recovery",
        lastActionDate: todayStr,
        message: "Mission Rescued! Momentum Saved."
    };
}

/**
 * Processes a normal continuation or restart.
 */
export function processNewAction(currentStreakData) {
    const todayStr = new Date().toISOString();
    const freq = currentStreakData?.frequency || "daily";
    const target = currentStreakData?.targetTime || "21:00";
    
    if (!currentStreakData || !currentStreakData.lastActionDate || currentStreakData.count === 0) {
        return { 
            count: 1, 
            status: "live", 
            lastActionDate: todayStr, 
            message: "Mission Started!",
            goal: currentStreakData?.goal || "Daily Success",
            frequency: freq,
            targetTime: target
        };
    }

    const evaluation = evaluateStreakStatus(currentStreakData.lastActionDate, currentStreakData.count, currentStreakData.status, freq, target);

    if (evaluation.isLost) {
        return { ...currentStreakData, count: 1, status: "comeback", lastActionDate: todayStr, message: "Comeback started!" };
    }

    if (evaluation.status === "risk") {
        return { ...currentStreakData, count: currentStreakData.count + 1, status: "recovery", lastActionDate: todayStr, message: "Mission Rescued!" };
    }

    // Normal increment only once per period
    if (evaluation.daysDiff > 0) {
        return { ...currentStreakData, count: currentStreakData.count + 1, status: "live", lastActionDate: todayStr, message: "Mission Updated!" };
    }

    return { ...currentStreakData, lastActionDate: todayStr };
}
