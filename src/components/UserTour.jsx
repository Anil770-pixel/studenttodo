import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    X, ChevronRight, ChevronLeft, Sparkles, Target, 
    BarChart3, Shield, Rocket, CheckCircle2 
} from 'lucide-react';

const UserTour = ({ isOpen, onClose, onFinish }) => {
    const [step, setStep] = useState(0);

    const tourSteps = [
        {
            title: "Welcome to StudentOS",
            description: "Your new high-performance command center is ready. Let's take a 30-second tour of your mission-critical tools.",
            icon: Rocket,
            color: "text-primary",
            bgColor: "bg-primary/10",
            image: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?q=80&w=2070&auto=format&fit=crop"
        },
        {
            title: "Mission Streaks",
            description: "Build unstoppable habits. Tracks Daily, Weekly, or Monthly missions with instant feedback and AI rescue recovery.",
            icon: Target,
            color: "text-orange-500",
            bgColor: "bg-orange-500/10",
            image: "https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=2070&auto=format&fit=crop"
        },
        {
            title: "Pulse & Analytics",
            description: "Data-driven growth. Monitor study hours, task efficiency, and arena wins in real-time.",
            icon: BarChart3,
            color: "text-purple-500",
            bgColor: "bg-purple-500/10",
            image: "https://images.unsplash.com/photo-1551288049-bbdac8a28a1e?q=80&w=2070&auto=format&fit=crop"
        },
        {
            title: "The Assessment Shield",
            description: "Never miss a deadline again. Our shield tracks your critical assessments and keeps your focus locked.",
            icon: Shield,
            color: "text-emerald-500",
            bgColor: "bg-emerald-500/10",
            image: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=2070&auto=format&fit=crop"
        }
    ];

    const currentStep = tourSteps[step];

    const handleNext = () => {
        if (step < tourSteps.length - 1) {
            setStep(step + 1);
        } else {
            onFinish();
        }
    };

    const handleBack = () => {
        if (step > 0) setStep(step - 1);
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-3xl"
            >
                <motion.div 
                    initial={{ opacity: 0, scale: 0.9, y: 30 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 30 }}
                    className="w-full max-w-4xl bg-[#0a0a0a] border border-white/10 rounded-[48px] overflow-hidden shadow-2xl relative flex flex-col md:flex-row h-[600px]"
                >
                    {/* Left: Interactive Content */}
                    <div className="flex-1 p-12 flex flex-col justify-between">
                        <div>
                            <div className="flex justify-between items-center mb-10">
                                <div className="flex items-center gap-3">
                                    <div className={`w-12 h-12 rounded-2xl ${currentStep.bgColor} ${currentStep.color} flex items-center justify-center`}>
                                        <currentStep.icon size={24} />
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
                                        Step {step + 1} of {tourSteps.length}
                                    </span>
                                </div>
                                <button 
                                    onClick={onFinish}
                                    className="text-xs font-black text-slate-500 hover:text-white uppercase tracking-widest transition-all"
                                >
                                    Skip Tour
                                </button>
                            </div>

                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={step}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    <h2 className="text-4xl font-black text-white tracking-tight mb-6 leading-tight">
                                        {currentStep.title}
                                    </h2>
                                    <p className="text-lg text-slate-400 font-medium leading-relaxed max-w-md">
                                        {currentStep.description}
                                    </p>
                                </motion.div>
                            </AnimatePresence>
                        </div>

                        <div className="flex items-center justify-between mt-12">
                            <div className="flex gap-2">
                                {tourSteps.map((_, i) => (
                                    <div 
                                        key={i} 
                                        className={`h-1.5 rounded-full transition-all duration-500 ${i === step ? 'w-8 bg-primary' : i < step ? 'w-4 bg-primary/30' : 'w-4 bg-slate-800'}`}
                                    />
                                ))}
                            </div>
                            
                            <div className="flex gap-4">
                                {step > 0 && (
                                    <button 
                                        onClick={handleBack}
                                        className="p-4 rounded-2xl bg-slate-900 border border-white/5 text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
                                    >
                                        <ChevronLeft size={24} />
                                    </button>
                                )}
                                <button 
                                    onClick={handleNext}
                                    className="px-10 py-5 bg-primary text-white font-black rounded-3xl flex items-center gap-3 shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
                                >
                                    {step === tourSteps.length - 1 ? (
                                        <>Finish <CheckCircle2 size={24} /></>
                                    ) : (
                                        <>Next <ChevronRight size={24} /></>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Right: Visual Preview */}
                    <div className="hidden md:flex w-5/12 bg-slate-900 relative">
                        <div className="absolute inset-0 bg-gradient-to-tr from-black/80 to-transparent z-10" />
                        <AnimatePresence mode="wait">
                            <motion.img 
                                key={step}
                                initial={{ opacity: 0, scale: 1.1 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 1.1 }}
                                transition={{ duration: 0.8 }}
                                src={currentStep.image}
                                className="w-full h-full object-cover"
                            />
                        </AnimatePresence>
                        <div className="absolute bottom-12 left-12 right-12 z-20">
                            <div className="bg-white/10 backdrop-blur-xl border border-white/10 p-6 rounded-3xl">
                                <p className="text-white text-sm font-bold flex items-center gap-3 italic">
                                    <Sparkles size={18} className="text-yellow-500" />
                                    "Your future workspace is ready."
                                </p>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default UserTour;
