import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Activity, TrendingUp } from 'lucide-react';

const DEFAULT_CHART_DATA = [
    { name: 'Mon', tasks: 0, events: 0 },
    { name: 'Tue', tasks: 0, events: 0 },
    { name: 'Wed', tasks: 0, events: 0 },
    { name: 'Thu', tasks: 0, events: 0 },
    { name: 'Fri', tasks: 0, events: 0 },
    { name: 'Sat', tasks: 0, events: 0 },
    { name: 'Sun', tasks: 0, events: 0 },
];

const Analytics = ({ stats, chartData }) => {
    // Real Calculation for Study Efficiency
    const totalTasks = stats?.totalTasks || 0;
    const completedTasks = stats?.completedTasks || 0;
    const efficiency = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const data = chartData && chartData.length > 0 ? chartData : DEFAULT_CHART_DATA;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Weekly Performance Report */}
            <div className="lg:col-span-2 glass-panel p-6 rounded-2xl relative overflow-hidden">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h3 className="text-white font-bold text-lg">Weekly Performance</h3>
                        <p className="text-slate-400 text-xs">Tasks Completed vs. Events Attended</p>
                    </div>
                </div>

                <div className="h-[200px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data}>
                            <XAxis
                                dataKey="name"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#94a3b8', fontSize: 12 }}
                            />
                            <Tooltip
                                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                            />
                            <Bar dataKey="tasks" fill="#06b6d4" radius={[4, 4, 0, 0]} barSize={20}>
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={index === 5 ? '#f97316' : '#06b6d4'} />
                                ))}
                            </Bar>
                            <Bar dataKey="events" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={20} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Study Efficiency Card */}
            <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between relative overflow-hidden group">
                <div className="absolute -right-10 -top-10 w-40 h-40 bg-neon-green/10 rounded-full blur-3xl group-hover:bg-neon-green/20 transition-all duration-500" />

                <div className="flex justify-between items-start z-10">
                    <div>
                        <h3 className="text-white font-bold text-lg">Study Efficiency</h3>
                        <p className="text-slate-400 text-xs">Completion Rate</p>
                    </div>
                    <div className="bg-neon-green/20 p-2 rounded-lg text-neon-green">
                        <Activity size={20} />
                    </div>
                </div>

                <div className="mt-6 z-10">
                    <div className="flex items-end gap-2">
                        <span className="text-5xl font-black text-white">{efficiency}%</span>
                        <span className="text-neon-green flex items-center text-sm font-bold mb-2">
                            <TrendingUp size={14} className="mr-1" /> +12%
                        </span>
                    </div>
                    <div className="w-full bg-slate-800 h-2 rounded-full mt-4 overflow-hidden">
                        <div
                            className="bg-neon-green h-full rounded-full transition-all duration-1000"
                            style={{ width: `${efficiency}%` }}
                        />
                    </div>
                    <p className="text-slate-500 text-xs mt-2">Based on {totalTasks} assigned tasks this week.</p>
                </div>
            </div>
        </div>
    );
};

export default Analytics;
