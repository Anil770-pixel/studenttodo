import React, { useState, useEffect } from 'react';
import { DownloadCloud, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const InstallAppBanner = () => {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const handleBeforeInstallPrompt = (e) => {
            // Prevent the mini-infobar from appearing on mobile
            e.preventDefault();
            // Stash the event so it can be triggered later.
            setDeferredPrompt(e);
            // Update UI to show the install button
            setIsVisible(true);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        // Check if already installed
        window.addEventListener('appinstalled', () => {
            setIsVisible(false);
            setDeferredPrompt(null);
            console.log('PWA was installed');
        });

        // Test mode for Desktop development
        if (window.matchMedia('(display-mode: standalone)').matches) {
            setIsVisible(false); // Already installed
        } else {
            // Force the banner to show for presentation/testing purposes,
            // even if the browser hasn't fired the prompt yet.
            setIsVisible(true);
        }

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) {
            alert("To install StudentOS: Click the Install 'App' icon in your browser's address bar OR open your browser menu and select 'Install StudentOS'.");
            return;
        }
        
        // Show the install prompt
        deferredPrompt.prompt();
        
        // Wait for the user to respond to the prompt
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`User response to the install prompt: ${outcome}`);
        
        // We've used the prompt, and can't use it again, throw it away
        setDeferredPrompt(null);
        setIsVisible(false);
    };

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div 
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between shadow-xl mb-6 shadow-blue-500/10 border border-blue-400/20"
                >
                    <div className="flex items-center gap-4 mb-3 sm:mb-0 text-white">
                        <div className="p-2 bg-white/20 rounded-xl">
                            <DownloadCloud size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg leading-tight">Install StudentOS App</h3>
                            <p className="text-blue-100 text-sm">Get notifications, offline access, and a faster experience.</p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <button 
                            onClick={() => setIsVisible(false)}
                            className="p-2 text-blue-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors hidden sm:block"
                            title="Dismiss"
                        >
                            <X size={20} />
                        </button>
                        <button 
                            onClick={handleInstallClick}
                            className="w-full sm:w-auto px-6 py-2 bg-white text-blue-600 font-bold rounded-xl shadow-md hover:scale-105 active:scale-95 transition-all text-sm"
                        >
                            Install Now
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default InstallAppBanner;
