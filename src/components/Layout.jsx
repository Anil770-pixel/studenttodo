import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

const Layout = () => {
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
        </div>
    );
};

export default Layout;
