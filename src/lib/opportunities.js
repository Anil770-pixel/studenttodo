export const MOCK_OPPORTUNITIES = [
    {
        id: 'unstop-1',
        title: 'Flipkart GRiD 7.0',
        type: 'project',
        duration: 2, // hours needed
        priority: 'high',
        description: 'Software Development Challenge. Team of 3.',
        platform: 'Unstop'
    },
    {
        id: 'unstop-2',
        title: 'TVS Credit E.P.I.C',
        type: 'comp',
        duration: 1,
        priority: 'medium',
        description: 'Analytics Challenge. Open to all years.',
        platform: 'Unstop'
    },
    {
        id: 'google-1',
        title: 'Cloud Study Jam',
        type: 'study',
        duration: 3,
        priority: 'medium',
        description: 'Complete GenAI Arcade level.',
        platform: 'Google Cloud'
    },
    {
        id: 'hack-1',
        title: 'Smart India Hackathon (Internal)',
        type: 'project',
        duration: 4,
        priority: 'high',
        description: 'Prepare PPT for idea submission.',
        platform: 'SIH'
    },
    {
        id: 'intern-1',
        title: 'Microsoft Engage Prep',
        type: 'study',
        duration: 2,
        priority: 'high',
        description: 'Practice DSA problems on LeetCode.',
        platform: 'Microsoft'
    }
];

/**
 * Finds free slots in the student's calendar and suggests relevant opportunities.
 * @param {Array} currentEvents - List of existing calendar events
 * @param {Date} date - Current month
 * @returns {Array} List of "Ghost" events
 */
export function findOpportunities(currentEvents, currentDate) {
    // 1. Identify Weekends (Students are free usually)
    const suggestions = [];
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Helper to check if a day is busy
    const isBusy = (day) => {
        return currentEvents.some(e => {
            const d = new Date(e.start_time);
            return d.getDate() === day && d.getMonth() === month && d.getFullYear() === year;
        });
    };

    let oppIndex = 0;

    for (let day = 1; day <= daysInMonth; day++) {
        const dateObj = new Date(year, month, day);
        const dayOfWeek = dateObj.getDay(); // 0 = Sun, 6 = Sat

        // Target Weekends (Sat/Sun) or Fridays
        if (dayOfWeek === 0 || dayOfWeek === 6) {
            if (!isBusy(day)) {
                // Determine a slot (e.g., Sat 10am, Sun 2pm)
                const opp = MOCK_OPPORTUNITIES[oppIndex % MOCK_OPPORTUNITIES.length];
                oppIndex++;

                const start = new Date(year, month, day);
                start.setHours(dayOfWeek === 6 ? 10 : 14, 0, 0); // Sat 10am, Sun 2pm

                const end = new Date(start);
                end.setHours(start.getHours() + opp.duration);

                suggestions.push({
                    ...opp,
                    start_time: start.toISOString(),
                    end_time: end.toISOString(),
                    isGhost: true, // Marker for UI
                    uniqueId: `ghost-${day}-${opp.id}`
                });
            }
        }
    }

    return suggestions;
}
