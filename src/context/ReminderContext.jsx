import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { useAuth } from './AuthContext';

const ReminderContext = createContext();

export const useReminders = () => useContext(ReminderContext);

export const ReminderProvider = ({ children }) => {
    const { user } = useAuth();
    const [tasks, setTasks] = useState([]);
    const [assessments, setAssessments] = useState([]);
    const [activeReminders, setActiveReminders] = useState([]);
    const [urgentCount, setUrgentCount] = useState(0);

    // ... permissions ...
    useEffect(() => {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }, []);

    const triggerLocalPush = (title, body) => {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(title, {
                body,
                icon: '/pwa-192x192.png'
            });
        }
    };

    // Subscriptions
    useEffect(() => {
        if (!user) {
            setTasks([]);
            setAssessments([]);
            return;
        }

        const tasksRef = collection(db, "users", user.uid, "tasks");
        const assessmentsRef = collection(db, "users", user.uid, "assessments");
        
        const qTasks = query(tasksRef, where("completed", "==", false));
        const qAssessments = query(assessmentsRef, where("status", "==", "pending"));

        const unsubTasks = onSnapshot(qTasks, (snapshot) => {
            setTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), type: 'task' })));
        });

        const unsubAssessments = onSnapshot(qAssessments, (snapshot) => {
            setAssessments(snapshot.docs.map(doc => ({ 
                id: doc.id, 
                ...doc.data(), 
                title: `${doc.data().courseName}: ${doc.data().weekNumber || 'End Task'}`,
                date: doc.data().lastDate,
                type: 'assessment' 
            })));
        });

        return () => {
            unsubTasks();
            unsubAssessments();
        };
    }, [user]);

    // Combiner & Priority Engine
    useEffect(() => {
        if (!user) return;

        const combined = [...tasks, ...assessments];
        const now = new Date();
        const reminders = combined.map(item => {
            let priority = 0;
            let message = "";
            let isUrgent = false;

            const itemDate = item.date ? new Date(item.date) : now;
            const isOverdue = itemDate < new Date(now.toDateString());
            const isToday = itemDate.toDateString() === now.toDateString();

            if (isOverdue) {
                priority += 50;
                message = `Overdue: ${item.title}`;
                isUrgent = true;
            } else if (isToday) {
                priority += 30;
                message = `Due Today: ${item.title}`;
                isUrgent = true; // Trigger PWA Push for same-day deadlines
            } else {
                priority += 10;
                message = `Upcoming: ${item.title}`;
            }

            // Heavy priority for Assessments
            if (item.type === 'assessment') priority += 5;

            return {
                id: item.id,
                title: item.title,
                message,
                priority,
                isUrgent,
                type: item.type,
                data: item
            };
        }).sort((a, b) => b.priority - a.priority);

        setActiveReminders(reminders);
        
        const newUrgentCount = reminders.filter(r => r.isUrgent).length;
        setUrgentCount(newUrgentCount);

        if (newUrgentCount > 0) {
            const CACHE_KEY = `lastNotifiedAt_${user.uid}`;
            const lastNotifiedAt = localStorage.getItem(CACHE_KEY);
            const nowMs = Date.now();
            if (!lastNotifiedAt || nowMs - parseInt(lastNotifiedAt, 10) > 4 * 60 * 60 * 1000) {
                triggerLocalPush('StudentOS Priority', `You have ${newUrgentCount} urgent missions active.`);
                localStorage.setItem(CACHE_KEY, nowMs.toString());
            }
        }
    }, [tasks, assessments, user]);

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
