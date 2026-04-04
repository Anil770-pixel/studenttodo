import React from 'react';
import { Sparkles, Trophy, BookOpen, Clock, Calendar as CalendarIcon, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const getEventIcon = (type) => {
    switch (type) {
        case 'hackathon':
        case 'comp':
        case 'project': // Project mapped to Trophy for Hackathons/Challenges
            return <Trophy size={14} className="text-neon-orange" />;
        case 'exam':
        case 'study':
            return <BookOpen size={14} className="text-neon-cyan" />;
        case 'workshop':
            return <Sparkles size={14} className="text-neon-purple" />;
        default:
            return <CalendarIcon size={14} className="text-white" />;
    }
};

const getEventColor = (type) => {
    switch (type) {
        case 'hackathon':
        case 'comp':
        case 'project':
            return 'bg-neon-orange/10 border-neon-orange/30 text-neon-orange';
        case 'exam':
        case 'study':
            return 'bg-neon-cyan/10 border-neon-cyan/30 text-neon-cyan';
        case 'workshop':
            return 'bg-neon-purple/10 border-neon-purple/30 text-neon-purple';
        default:
            return 'bg-white/10 border-white/20 text-white';
    }
};

const CalendarTile = ({ event, onClick }) => {
    return (
        <motion.div
            layoutId={`event-${event.id}`}
            onClick={(e) => { e.stopPropagation(); onClick(e, event); }}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`
                group relative p-3 rounded-xl border backdrop-blur-md cursor-pointer transition-all duration-300
                hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:border-white/20 hover:-translate-y-1
                ${getEventColor(event.type)}
            `}
        >
            {/* Header: Icon & Category Tag */}
            <div className="flex justify-between items-center mb-2">
                <div className={`p-1.5 rounded-lg bg-white/10 backdrop-blur-sm shadow-inner`}>
                    {getEventIcon(event.type)}
                </div>
                <span className="text-[9px] font-bold uppercase tracking-widest opacity-90 px-2 py-0.5 rounded-full bg-white/5 border border-white/10">
                    {event.type}
                </span>
            </div>

            {/* Title */}
            <h4 className="font-bold text-xs leading-snug mb-1 line-clamp-2 text-white/90 group-hover:text-white transition-colors">
                {event.title}
            </h4>

            {/* Time (Always visible for better UX) */}
            <div className="flex items-center gap-1.5 text-[10px] opacity-70 group-hover:opacity-100 transition-opacity mt-2">
                <Clock size={10} />
                <span>
                    {new Date(event.startTime || event.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
            </div>

            {/* Decorative Corner Glow */}
            <div className="absolute -top-px -right-px w-8 h-8 bg-gradient-to-br from-white/20 to-transparent rounded-tr-xl opacity-0 group-hover:opacity-100 transition-opacity" />
        </motion.div>
    );
};

export default CalendarTile;
