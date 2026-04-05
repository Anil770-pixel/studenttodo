import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import RescueModal from './RescueModal';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';

const Layout = () => {
    const { user } = useAuth();
    const [rescueTask, setRescueTask] = useState(null);

    useEffect(() => {
        // Expose a global way to open the rescue modal (Strike 3)
        window.openRescueModal = (task) => {
            setRescueTask(task);
        };
        return () => { delete window.openRescueModal; };
    }, []);

    const handleAcceptRescuePlan = async (plan) => {
        if (!user || !plan.rescue_plan) return;
        
        try {
            // Updated tasks with new dates from AI
            for (const item of plan.rescue_plan) {
                const collectionName = item.type === 'assessment' ? "assessments" : "tasks";
                const docRef = doc(db, "users", user.uid, collectionName, item.id);
                await updateDoc(docRef, {
                    lastDate: item.new_date, // assessments use lastDate
                    date: item.new_date      // tasks use date
                });
            }
            setRescueTask(null);
            alert("Rescue Plan Synchronized. Check your new timeline!");
        } catch (err) {
            console.error("Rescue plan sync error:", err);
        }
    };

    return (
        <div className="min-h-screen bg-navy-900 text-white relative overflow-x-hidden selection:bg-neon-cyan/30">
            {/* Ambient Background Glow */}
            <div className="fixed top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-neon-cyan/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-neon-purple/10 rounded-full blur-[120px]" />
                <div className="absolute top-[40%] left-[40%] w-[20%] h-[20%] bg-neon-orange/5 rounded-full blur-[100px]" />
            </div>

            <Sidebar />
            
            <main className="pl-0 md:pl-64 min-h-screen relative pb-20 md:pb-0">
                <div className="p-4 md:p-8 max-w-[1920px] mx-auto animate-fade-in">
                    <Outlet />
                </div>
            </main>

            {/* Global Rescue Anchor */}
            {rescueTask && (
                <RescueModal 
                    taskToRescue={rescueTask.data || rescueTask} 
                    onClose={() => setRescueTask(null)}
                    onAcceptPlan={handleAcceptRescuePlan}
                />
            )}
        </div>
    );
};

export default Layout;
