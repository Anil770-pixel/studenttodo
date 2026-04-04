import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { useAuth } from './AuthContext';

const ReminderContext = createContext();

export const useReminders = () => useContext(ReminderContext);

export const ReminderProvider = ({ children }) => {
    const { user } = useAuth();
    const [activeReminders, setActiveReminders] = useState([]);
    const [urgentCount, setUrgentCount] = useState(0);

    // Request Notification Permission
    useEffect(() => {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }, []);

    // Helper to send local push notification
    const triggerLocalPush = (title, body) => {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(title, {
                body,
                icon: '/pwa-192x192.png'
            });
        }
    };

    useEffect(() => {
        if (!user) {
            setActiveReminders([]);
            setUrgentCount(0);
            return;
        }

        // ── Offline-first query for pending tasks ──
        const tasksRef = collection(db, "users", user.uid, "tasks");
        const qTasks = query(tasksRef, where("completed", "==", false));

        const unsubscribeLogs = onSnapshot(qTasks, (snapshot) => {
            const tasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), type: 'task' }));
            
            // PRIORITY ENGINE: priority = urgency + importance - fatigue
            const now = new Date();
            const reminders = tasks.map(task => {
                let priority = 0;
                let message = "";
                let isUrgent = false;

                const taskDate = task.date ? new Date(task.date) : now;
                const isOverdue = taskDate < new Date(now.toDateString());
                const isToday = taskDate.toDateString() === now.toDateString();

                if (isOverdue) {
                    priority += 50;
                    message = `Overdue: ${task.title}`;
                    isUrgent = true;
                } else if (isToday) {
                    priority += 30;
                    message = `Due Today: ${task.title}`;
                } else {
                    priority += 10;
                    message = `Upcoming: ${task.title}`;
                }

                return {
                    id: task.id,
                    title: task.title,
                    message,
                    priority,
                    isUrgent,
                    data: task
                };
            }).sort((a, b) => b.priority - a.priority);

            setActiveReminders(reminders);
            
            const newUrgentCount = reminders.filter(r => r.isUrgent).length;
            setUrgentCount(newUrgentCount);

            // Trigger system notification if there are extremely urgent un-actioned items
            if (newUrgentCount > 0) {
                const CACHE_KEY = `lastNotifiedAt_${user.uid}`;
                const lastNotifiedAt = localStorage.getItem(CACHE_KEY);
                const nowMs = Date.now();
                const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;

                if (!lastNotifiedAt || nowMs - parseInt(lastNotifiedAt, 10) > FOUR_HOURS_MS) {
                    triggerLocalPush('StudentOS: Priority Alert', `You have ${newUrgentCount} overdue mission${newUrgentCount > 1 ? 's' : ''} to rescue.`);
                    localStorage.setItem(CACHE_KEY, nowMs.toString());
                }
            }
        });

        return () => unsubscribeLogs();
    }, [user]);

    const contextValue = {
        activeReminders,
        urgentCount,
        triggerLocalPush
    };

    return (
        <ReminderContext.Provider value={contextValue}>
            {children}
        </ReminderContext.Provider>
    );
};
