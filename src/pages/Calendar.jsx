import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, onSnapshot, orderBy, limit, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { fetchRadarOpportunities, acceptOpportunity } from '../lib/radar';
import {
    ChevronLeft, ChevronRight, Zap, Loader2, Radar, Linkedin, Github, Chrome, Globe, Code,
    Plus, Clock, MapPin, Calendar as CalendarIcon, X, ExternalLink, Trash2, Layout, AlignJustify
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const getPlatformIcon = (platform) => {
    const p = (platform || '').toLowerCase();
    if (p.includes('linkedin')) return <Linkedin size={10} />;
    if (p.includes('github')) return <Github size={10} />;
    if (p.includes('google')) return <Chrome size={10} />;
    if (p.includes('code') || p.includes('devfolio') || p.includes('kaggle') || p.includes('unstop')) return <Code size={10} />;
    return <Globe size={10} />;
};

const Calendar = () => {
    const { user, profile } = useAuth();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [events, setEvents] = useState([]);
    const [view, setView] = useState('month'); // 'month' or 'week'
    const [userInterests, setUserInterests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [scanning, setScanning] = useState(false);

    // Modal States
    const [selectedDate, setSelectedDate] = useState(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [newEventTitle, setNewEventTitle] = useState('');
    const [newEventTime, setNewEventTime] = useState('09:00');
    const [newEventType, setNewEventType] = useState('study');

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    useEffect(() => {
        if (profile?.interests) {
            setUserInterests(Array.isArray(profile.interests) ? profile.interests : []);
        }
    }, [profile]);

    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }

        // 1. Fetch Events
        const eventsRef = collection(db, "users", user.uid, "events");
        // FETCH WITHOUT SORT to avoid Index errors. Sort client-side.
        const qEvents = query(eventsRef, limit(300));

        // 2. Fetch Tasks
        const tasksRef = collection(db, "users", user.uid, "tasks");
        const qTasks = query(tasksRef, limit(300));

        let unsubEvents = () => { };
        let unsubTasks = () => { };

        let fetchedEvents = [];
        let fetchedTasks = [];

        const updateCombinedEvents = () => {
            const taskEvents = fetchedTasks.map(t => ({
                ...t,
                id: 'task-' + t.id,
                originalId: t.id,
                title: t.title,
                // Tasks usually just have a date string YYYY-MM-DD. We'll treat them as events at 9 AM or all-day.
                startTime: t.date ? `${t.date}T09:00:00` : new Date().toISOString(),
                endTime: t.date ? `${t.date}T10:00:00` : new Date().toISOString(),
                type: 'task',
                isTask: true,
                isGhost: false,
                color: t.completed ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-pink-500/20 text-pink-300 border-pink-500/30'
            }));

            // Merge and Sort
            const all = [...fetchedEvents, ...taskEvents]
                .filter(ev => {
                    const d = new Date(ev.endTime || ev.startTime);
                    // Keep future events or events from today
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    return d >= today;
                })
                .sort((a, b) => {
                    return new Date(a.startTime) - new Date(b.startTime);
                });

            setEvents(all);
            setLoading(false);
        };

        unsubEvents = onSnapshot(qEvents, (snapshot) => {
            fetchedEvents = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                startTime: doc.data().startTime || doc.data().date,
                date: new Date(doc.data().startTime || doc.data().date)
            }));
            updateCombinedEvents();
        }, (error) => {
            console.error("Error fetching events:", error);
            setLoading(false);
        });

        unsubTasks = onSnapshot(qTasks, (snapshot) => {
            fetchedTasks = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            updateCombinedEvents();
        }, (error) => {
            console.error("Error fetching tasks:", error);
        });

        return () => {
            unsubEvents();
            unsubTasks();
        };
    }, [user]);

    // Navigation
    const prevPeriod = () => {
        if (view === 'month') {
            setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
        } else {
            const d = new Date(currentDate);
            d.setDate(d.getDate() - 7);
            setCurrentDate(d);
        }
    };

    const nextPeriod = () => {
        if (view === 'month') {
            setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
        } else {
            const d = new Date(currentDate);
            d.setDate(d.getDate() + 7);
            setCurrentDate(d);
        }
    };

    const goToToday = () => setCurrentDate(new Date());

    const handleScan = async () => {
        if (!user) return;
        if (userInterests.length === 0) {
            alert("Please select interests in your Profile first.");
            return;
        }

        setScanning(true);
        try {
            for (const interestId of userInterests) {
                await fetchRadarOpportunities(user, interestId, userInterests, profile || {});
            }
        } catch (error) {
            console.error("Scan failed:", error);
            alert("Scan failed. Please try again.");
        } finally {
            setScanning(false);
        }
    };

    const handleDayClick = (day) => {
        if (!day) return;
        const clickedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
        setSelectedDate(clickedDate);
        setNewEventTime('09:00');
        setShowAddModal(true);
    };

    const handleTimeSlotClick = (date, hour) => {
        setSelectedDate(date);
        const timeStr = `${hour.toString().padStart(2, '0')}:00`;
        setNewEventTime(timeStr);
        setShowAddModal(true);
    };

    const createEvent = async () => {
        if (!newEventTitle.trim() || !selectedDate || !user) return;

        const [hours, minutes] = newEventTime.split(':');
        const eventStart = new Date(selectedDate);
        eventStart.setHours(parseInt(hours), parseInt(minutes));

        const eventEnd = new Date(eventStart);
        eventEnd.setHours(eventStart.getHours() + 1);

        try {
            await addDoc(collection(db, "users", user.uid, "events"), {
                userId: user.uid,
                title: newEventTitle,
                startTime: eventStart.toISOString(),
                endTime: eventEnd.toISOString(),
                type: newEventType,
                isGhost: false,
                createdAt: new Date().toISOString()
            });
            setShowAddModal(false);
            setNewEventTitle('');
            setNewEventTime('09:00');
        } catch (error) {
            console.error("Failed to create event:", error);
            alert("Error creating event");
        }
    };

    const deleteEvent = async () => {
        if (!selectedEvent || !user) return;
        if (confirm("Are you sure you want to delete this event?")) {
            try {
                await deleteDoc(doc(db, "users", user.uid, "events", selectedEvent.id));
                setSelectedEvent(null);
            } catch (error) {
                console.error("Failed to delete event:", error);
            }
        }
    };

    const acceptGhostEvent = async () => {
        if (!selectedEvent || !user) return;
        try {
            await acceptOpportunity(user, selectedEvent);
            alert("Event added to your calendar!");
            setSelectedEvent(null);
        } catch (error) {
            console.error("Failed to add event:", error);
        }
    };

    const addToGoogleCalendar = () => {
        if (!selectedEvent) return;
        const start = new Date(selectedEvent.startTime).toISOString().replace(/-|:|\.\d\d\d/g, "");
        const end = new Date(selectedEvent.endTime || new Date(new Date(selectedEvent.startTime).getTime() + 3600000)).toISOString().replace(/-|:|\.\d\d\d/g, "");
        const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(selectedEvent.title)}&dates=${start}/${end}&details=${encodeURIComponent(selectedEvent.description || '')}`;
        window.open(url, '_blank');
    };

    // --- Renderers ---

    const renderMonthView = () => {
        const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
        const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
        const days = [];

        for (let i = 0; i < firstDay; i++) {
            days.push(<div key={`empty-${i}`} className="min-h-[120px] bg-slate-900/40 border-r border-b border-white/5" />);
        }

        for (let i = 1; i <= daysInMonth; i++) {
            const isToday = i === new Date().getDate() && currentDate.getMonth() === new Date().getMonth() && currentDate.getFullYear() === new Date().getFullYear();
            const dayEvents = events.filter(ev => {
                const evDate = new Date(ev.startTime);
                return evDate.getDate() === i && evDate.getMonth() === currentDate.getMonth() && evDate.getFullYear() === currentDate.getFullYear();
            });

            days.push(
                <div key={i} onClick={() => handleDayClick(i)} className={`min-h-[120px] p-2 border-r border-b border-white/5 transition-colors relative group hover:bg-slate-800/50 cursor-pointer ${isToday ? 'bg-indigo-500/5' : ''}`}>
                    <div className="flex justify-between items-start mb-2">
                        <span className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full ${isToday ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-400 group-hover:text-white'}`}>{i}</span>
                        {dayEvents.length > 0 && <span className="text-[10px] text-slate-600 font-medium">{dayEvents.length}</span>}
                    </div>
                    <div className="flex flex-col gap-1.5">
                        {dayEvents.slice(0, 4).map((ev, idx) => (
                            <div key={ev.id || idx} onClick={(e) => { e.stopPropagation(); setSelectedEvent(ev); }} className={`px-2 py-1 rounded text-[11px] font-medium truncate border shadow-sm transition-all hover:scale-[1.02] ${ev.isGhost ? 'bg-purple-500/10 border-purple-500/30 text-purple-300 border-dashed' :
                                ev.isTask ? (ev.completed ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-pink-500/10 border-pink-500/30 text-pink-300') :
                                    'bg-indigo-500/15 border-indigo-500/30 text-indigo-200'
                                }`}>
                                {ev.title}
                            </div>
                        ))}
                    </div>
                </div>
            );
        }
        return (
            <>
                <div className="grid grid-cols-7 border-b border-white/5 bg-slate-900/40">
                    {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(day => (
                        <div key={day} className="py-4 text-center font-bold text-slate-500 text-[11px] tracking-widest">{day}</div>
                    ))}
                </div>
                <div className="grid grid-cols-7 flex-1 auto-rows-[minmax(120px,1fr)] overflow-y-auto custom-scrollbar">{days}</div>
            </>
        );
    };

    const renderWeekView = () => {
        // Find start of the week (Sunday)
        const startOfWeek = new Date(currentDate);
        const day = startOfWeek.getDay();
        const diff = startOfWeek.getDate() - day; // adjust when day is sunday
        startOfWeek.setDate(diff); // Set to Sunday

        const weekDays = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date(startOfWeek);
            d.setDate(startOfWeek.getDate() + i);
            weekDays.push(d);
        }

        const hours = Array.from({ length: 18 }, (_, i) => i + 6); // 6 AM to 11 PM

        return (
            <div className="flex flex-col h-full overflow-hidden">
                {/* Header */}
                <div className="grid grid-cols-8 border-b border-white/5 bg-slate-900/40 divide-x divide-white/5">
                    <div className="p-4 text-center text-xs font-bold text-slate-500">GMT+5:30</div>
                    {weekDays.map((d, i) => {
                        const isToday = d.getDate() === new Date().getDate() && d.getMonth() === new Date().getMonth();
                        return (
                            <div key={i} className={`py-4 text-center ${isToday ? 'bg-indigo-500/10' : ''}`}>
                                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][d.getDay()]}</div>
                                <div className={`mt-1 text-xl font-bold ${isToday ? 'text-indigo-400' : 'text-white'}`}>{d.getDate()}</div>
                            </div>
                        );
                    })}
                </div>

                {/* Grid */}
                <div className="flex-1 overflow-y-auto custom-scrollbar relative">
                    {/* Time Lines */}
                    {hours.map(h => (
                        <div key={h} className="grid grid-cols-8 min-h-[60px] border-b border-white/5 divide-x divide-white/5">
                            <div className="text-right pr-4 py-2 text-xs text-slate-500 font-mono -mt-3">{h}:00</div>
                            {weekDays.map((d, i) => (
                                <div
                                    key={`${h}-${i}`}
                                    className="relative group hover:bg-white/[0.02] cursor-pointer transition-colors"
                                    onClick={() => handleTimeSlotClick(d, h)}
                                >
                                    {/* Plus Icon on Hover */}
                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none">
                                        <Plus size={14} className="text-slate-600" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ))}

                    {/* Events Overlay */}
                    {events.map(ev => {
                        const evDate = new Date(ev.startTime);
                        // Check if event is in this week
                        if (evDate >= weekDays[0] && evDate < new Date(weekDays[6].getTime() + 86400000)) {
                            const dayIndex = evDate.getDay(); // 0-6
                            const startHour = evDate.getHours();
                            if (startHour < 6) return null; // Skip early morning events for now or adust

                            const top = (startHour - 6) * 60 + evDate.getMinutes(); // pixels matching 60px height
                            // Default duration 60 mins if no end time
                            let duration = 60;

                            if (ev.endTime) {
                                duration = (new Date(ev.endTime) - evDate) / 60000;
                            }

                            return (
                                <div
                                    key={ev.id}
                                    onClick={(e) => { e.stopPropagation(); setSelectedEvent(ev); }}
                                    className={`absolute left-0 right-1 mx-1 rounded-md p-2 text-xs font-medium border overflow-hidden cursor-pointer shadow-lg hover:z-10 hover:shadow-xl transition-all
                                        ${ev.isGhost
                                            ? 'bg-purple-900/80 border-purple-500/50 text-purple-100 border-dashed backdrop-blur-sm'
                                            : ev.isTask
                                                ? (ev.completed ? 'bg-emerald-900/80 border-emerald-500/50 text-emerald-100 backdrop-blur-sm' : 'bg-pink-900/80 border-pink-500/50 text-pink-100 backdrop-blur-sm')
                                                : ev.type === 'exam'
                                                    ? 'bg-orange-900/80 border-orange-500/50 text-orange-100 backdrop-blur-sm'
                                                    : 'bg-indigo-600/80 border-indigo-400/50 text-white backdrop-blur-sm'
                                        }`}
                                    style={{
                                        top: `${top}px`,
                                        height: `${Math.max(duration, 30)}px`,
                                        left: `calc(${(dayIndex + 1) * 12.5}%)`, // 12.5% is 1/8
                                        width: `calc(12.5% - 8px)`
                                    }}
                                >
                                    <div className="font-bold truncate">{ev.title}</div>
                                    <div className="opacity-80 text-[10px] truncate">
                                        {evDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                            );
                        }
                        return null;
                    })}

                    {/* Current Time Indicator */}
                    {new Date() >= weekDays[0] && new Date() <= weekDays[6] && (
                        <div
                            className="absolute z-20 w-[12.5%] border-t-2 border-red-500 pointer-events-none flex items-center"
                            style={{
                                top: `${(new Date().getHours() - 6) * 60 + new Date().getMinutes()}px`,
                                left: `calc(${(new Date().getDay() + 1) * 12.5}%)`
                            }}
                        >
                            <div className="w-2 h-2 -ml-1 rounded-full bg-red-500"></div>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    // Get Upcoming Events for Sidebar
    const upcomingEvents = events
        .filter(ev => new Date(ev.startTime) > new Date())
        .sort((a, b) => new Date(a.startTime) - new Date(b.startTime))
        .slice(0, 3);

    return (
        <div className="h-full flex gap-6">
            {/* Main Calendar Area */}
            <div className="flex-1 flex flex-col space-y-4 h-full relative">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/60 p-4 rounded-2xl border border-white/10 backdrop-blur-xl shadow-lg">
                    <div className="flex items-center gap-4">
                        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                            {monthNames[currentDate.getMonth()]} <span className="text-slate-500">{currentDate.getFullYear()}</span>
                        </h1>
                        <div className="flex bg-slate-950 p-1 rounded-lg border border-white/10">
                            <button
                                onClick={() => setView('month')}
                                className={`p-1.5 px-3 rounded-md text-xs font-bold transition-colors ${view === 'month' ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-white'}`}
                            >
                                <Layout size={14} className="inline mr-1" /> Month
                            </button>
                            <button
                                onClick={() => setView('week')}
                                className={`p-1.5 px-3 rounded-md text-xs font-bold transition-colors ${view === 'week' ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-white'}`}
                            >
                                <AlignJustify size={14} className="inline mr-1" /> Week
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button onClick={prevPeriod} className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white"><ChevronLeft size={18} /></button>
                        <button onClick={goToToday} className="px-3 py-1 text-xs font-bold text-white hover:bg-white/5 rounded-md border border-white/10">Today</button>
                        <button onClick={nextPeriod} className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white"><ChevronRight size={18} /></button>

                        <div className="h-6 w-px bg-white/10 mx-2"></div>

                        <button
                            onClick={handleScan}
                            disabled={scanning}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white p-2 rounded-lg transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50"
                            title="Sync Opportunities"
                        >
                            {scanning ? <Loader2 className="animate-spin" size={18} /> : <Radar size={18} />}
                        </button>
                    </div>
                </div>

                {/* Switchable View Container */}
                <div className="flex-1 bg-slate-950/30 border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col backdrop-blur-sm">
                    {view === 'month' ? renderMonthView() : renderWeekView()}
                </div>
            </div>

            {/* Sidebar (Next Up) - Only visible on large screens */}
            <div className="hidden lg:flex w-72 flex-col gap-4">
                <div className="bg-slate-900/60 border border-white/10 p-5 rounded-2xl backdrop-blur-xl flex-1 flex flex-col">
                    <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Up Next</h2>

                    <div className="space-y-3 flex-1 overflow-y-auto custom-scrollbar">
                        {upcomingEvents.length === 0 ? (
                            <div className="text-center py-10 text-slate-500 text-sm">
                                <Zap className="mx-auto mb-2 opacity-20" size={32} />
                                Nothing scheduled.<br />Enjoy your free time!
                            </div>
                        ) : (
                            upcomingEvents.map((ev, i) => (
                                <div key={i} className="group relative p-3 rounded-xl bg-slate-800/50 border border-white/5 hover:border-indigo-500/30 transition-all">
                                    <div className={`absolute left-0 top-3 bottom-3 w-1 rounded-r-full ${ev.type === 'exam' ? 'bg-orange-500' : 'bg-indigo-500'}`}></div>
                                    <div className="pl-3">
                                        <div className="text-xs text-indigo-300 font-mono mb-0.5">
                                            {new Date(ev.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                        <div className="font-bold text-white text-sm leading-tight mb-1">{ev.title}</div>
                                        <div className="text-[10px] text-slate-500">
                                            {new Date(ev.startTime).toDateString() === new Date().toDateString() ? 'Today' : new Date(ev.startTime).toLocaleDateString()}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <button
                        onClick={() => { setSelectedDate(new Date()); setNewEventTime('09:00'); setShowAddModal(true); }}
                        className="mt-4 w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-slate-300 hover:text-white font-bold text-sm flex items-center justify-center gap-2 transition-all"
                    >
                        <Plus size={16} /> Add Event
                    </button>
                </div>

                {/* Mini Month Grid - Just abstract blocks for aesthetic */}
                <div className="bg-slate-900/60 border border-white/10 p-5 rounded-2xl backdrop-blur-xl">
                    <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Stats</h2>
                    <div className="flex justify-between items-center mb-2 text-sm text-slate-300">
                        <span>Total Events</span>
                        <span className="font-bold text-white">{events.length}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm text-slate-300">
                        <span>Ghost Events</span>
                        <span className="font-bold text-purple-400">{events.filter(e => e.isGhost).length}</span>
                    </div>
                </div>
            </div>

            {/* Modals (Already Implemented - Reusing Structure) */}
            <AnimatePresence>
                {showAddModal && (
                    <>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" onClick={() => setShowAddModal(false)} />
                        <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-slate-900 border border-white/10 rounded-2xl shadow-2xl z-50 p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold text-white">Create Event</h3>
                                <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white"><X size={20} /></button>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Title</label>
                                    <input type="text" autoFocus value={newEventTitle} onChange={e => setNewEventTitle(e.target.value)} placeholder="e.g. Physics Study Session" className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white focus:outline-none focus:border-indigo-500 transition-all font-medium" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Time</label>
                                        <div className="relative">
                                            <input type="time" value={newEventTime} onChange={e => setNewEventTime(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white focus:outline-none focus:border-indigo-500 transition-all pl-10" />
                                            <Clock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Type</label>
                                        <select value={newEventType} onChange={e => setNewEventType(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white focus:outline-none focus:border-indigo-500 transition-all">
                                            <option value="study">Study</option>
                                            <option value="exam">Exam</option>
                                            <option value="personal">Personal</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="pt-2 flex justify-end gap-3">
                                    <button onClick={() => setShowAddModal(false)} className="px-4 py-2 text-slate-300 hover:bg-white/5 rounded-lg font-medium transition-colors">Cancel</button>
                                    <button onClick={createEvent} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold shadow-lg shadow-indigo-600/20 transition-all">Create Event</button>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
            <AnimatePresence>
                {selectedEvent && (
                    <>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" onClick={() => setSelectedEvent(null)} />
                        <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-slate-900 border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden">
                            <div className={`p-6 border-b border-white/5 ${selectedEvent.isGhost ? 'bg-purple-500/10' : 'bg-indigo-500/10'}`}>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider mb-2 ${selectedEvent.isGhost ? 'bg-purple-500/20 text-purple-300' : 'bg-indigo-500/20 text-indigo-300'}`}>{selectedEvent.type || 'Event'}</span>
                                        <h3 className="text-2xl font-bold text-white leading-tight">{selectedEvent.title}</h3>
                                    </div>
                                    <button onClick={() => setSelectedEvent(null)} className="text-slate-400 hover:text-white p-1 bg-black/20 rounded-full hover:bg-black/40"><X size={18} /></button>
                                </div>
                            </div>
                            <div className="p-6 space-y-6">
                                <div className="space-y-4">
                                    <div className="flex items-start gap-4">
                                        <CalendarIcon className="text-slate-500 mt-0.5" size={18} />
                                        <div>
                                            <p className="text-slate-200 font-medium">{new Date(selectedEvent.startTime).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}</p>
                                            <p className="text-slate-400 text-sm">{new Date(selectedEvent.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} {selectedEvent.endTime && ` - ${new Date(selectedEvent.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}</p>
                                        </div>
                                    </div>
                                    {selectedEvent.platform && (
                                        <div className="flex items-center gap-4"><Globe className="text-slate-500" size={18} /><div className="flex items-center gap-2">{getPlatformIcon(selectedEvent.platform)}<span className="text-slate-300">{selectedEvent.platform}</span></div></div>
                                    )}
                                    {/* Display location if available */}
                                    {(selectedEvent.exactLocation || selectedEvent.location) && (
                                        <div className="flex items-start gap-4">
                                            <MapPin className="text-slate-500 mt-0.5" size={18} />
                                            <span className="text-slate-300 text-sm">{selectedEvent.exactLocation || selectedEvent.location}</span>
                                        </div>
                                    )}
                                    {selectedEvent.description && (<div className="p-3 bg-slate-950/50 rounded-xl border border-white/5 text-sm text-slate-400">{selectedEvent.description}</div>)}

                                    {/* Show Apply Link in Modal if available */}
                                    {(selectedEvent.applicationUrl || selectedEvent.url) && (
                                        <div className="pt-2">
                                            <a href={selectedEvent.applicationUrl || selectedEvent.url} target="_blank" rel="noreferrer" className="text-indigo-400 hover:text-indigo-300 text-sm font-medium flex items-center gap-1">
                                                Direct Link <ExternalLink size={12} />
                                            </a>
                                        </div>
                                    )}
                                </div>
                                <div className="grid grid-cols-2 gap-3 pt-2">
                                    {selectedEvent.isGhost ? (
                                        <button onClick={acceptGhostEvent} className="col-span-2 flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold shadow-lg shadow-purple-600/20 transition-all"><Zap size={18} /> Add to Calendar</button>
                                    ) : (
                                        <>
                                            <button onClick={addToGoogleCalendar} className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl font-medium transition-colors border border-white/5"><ExternalLink size={16} /> Google Cal</button>
                                            <button onClick={deleteEvent} className="flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 hover:text-red-400 rounded-xl font-medium transition-colors border border-red-500/10"><Trash2 size={16} /> Delete</button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Calendar;
