import React, { useRef, useEffect, useState } from 'react';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
import {
    GraduationCap, BookOpen, TrendingUp, Shield, Users, 
    Play, ChevronRight, Award, Zap, Brain, Target, Star
} from 'lucide-react';

const MasterClassSection = () => {
    const sectionRef = useRef(null);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    
    const { scrollYProgress } = useScroll({
        target: sectionRef,
        offset: ["start end", "end start"]
    });
    
    const y = useTransform(scrollYProgress, [0, 1], [100, -100]);
    const opacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0, 1, 1, 0]);
    const scale = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0.8, 1, 1, 0.8]);
    
    const springY = useSpring(y, { stiffness: 100, damping: 20 });
    
    const handleMouseMove = (e) => {
        const rect = sectionRef.current?.getBoundingClientRect();
        if (rect) {
            const x = (e.clientX - rect.left - rect.width / 2) / rect.width;
            const y = (e.clientY - rect.top - rect.height / 2) / rect.height;
            setMousePos({ x: x * 20, y: y * 20 });
        }
    };

    const features = [
        {
            icon: BookOpen,
            title: "Leçons de trading du débutant à l'avancé",
            color: "from-blue-500 to-cyan-500"
        },
        {
            icon: TrendingUp,
            title: "Analyse technique & fondamentale",
            color: "from-green-500 to-emerald-500"
        },
        {
            icon: Shield,
            title: "Ateliers de gestion des risques",
            color: "from-purple-500 to-indigo-500"
        },
        {
            icon: Users,
            title: "Webinaires en direct avec des experts & Parcours d'apprentissage assistés par IA",
            color: "from-orange-500 to-red-500"
        },
        {
            icon: Target,
            title: "Défis pratiques et quiz",
            color: "from-pink-500 to-rose-500"
        }
    ];

    const courses = [
        {
            title: "Analyse Technique",
            image: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=400",
            level: "Débutant",
            duration: "2h"
        },
        {
            title: "Gestion des Risques",
            image: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=400",
            level: "Pro",
            duration: "3h"
        },
        {
            title: "Psychologie du Trading",
            image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400",
            level: "Pro",
            duration: "2.5h"
        },
        {
            title: "Stratégies Elite",
            image: "https://images.unsplash.com/photo-1642790106117-e829e14a795f?w=400",
            level: "Elite",
            duration: "4h"
        }
    ];

    return (
        <section 
            ref={sectionRef}
            onMouseMove={handleMouseMove}
            className="relative py-32 px-6 overflow-hidden bg-gradient-to-b from-black via-slate-950 to-black"
        >
            {/* Animated Background */}
            <div className="absolute inset-0 pointer-events-none">
                {/* Grid Pattern */}
                <div className="absolute inset-0 opacity-5">
                    <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                        <defs>
                            <pattern id="masterclass-grid" width="4" height="4" patternUnits="userSpaceOnUse">
                                <path d="M 4 0 L 0 0 0 4" fill="none" stroke="white" strokeWidth="0.1"/>
                            </pattern>
                        </defs>
                        <rect width="100" height="100" fill="url(#masterclass-grid)"/>
                    </svg>
                </div>
                
                {/* Floating Orbs */}
                <motion.div 
                    className="absolute w-96 h-96 rounded-full bg-blue-500/10 blur-3xl"
                    style={{ 
                        x: mousePos.x * -2, 
                        y: mousePos.y * -2,
                        top: '10%', 
                        left: '10%' 
                    }}
                />
                <motion.div 
                    className="absolute w-80 h-80 rounded-full bg-purple-500/10 blur-3xl"
                    style={{ 
                        x: mousePos.x * 2, 
                        y: mousePos.y * 2,
                        bottom: '20%', 
                        right: '10%' 
                    }}
                />
            </div>

            <motion.div 
                style={{ opacity, scale }}
                className="max-w-7xl mx-auto relative z-10"
            >
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                    
                    {/* Left Column - Marketing Content */}
                    <motion.div
                        initial={{ opacity: 0, x: -50 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8 }}
                    >
                        {/* Badge */}
                        <motion.div 
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 text-blue-400 text-sm font-medium mb-6"
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                        >
                            <GraduationCap size={18} />
                            Nouveau
                        </motion.div>

                        {/* Title */}
                        <h2 className="text-4xl md:text-5xl font-bold mb-4">
                            <span className="bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                                Centre d'Apprentissage
                            </span>
                            <br />
                            <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                                MasterClass
                            </span>
                        </h2>

                        {/* Subtitle */}
                        <p className="text-lg text-slate-400 mb-8 leading-relaxed">
                            TradeSense AI inclut une académie complète avec des cours de haute qualité :
                        </p>

                        {/* Feature List */}
                        <div className="space-y-4 mb-10">
                            {features.map((feature, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, x: -20 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: i * 0.1 }}
                                    className="flex items-start gap-4 group"
                                >
                                    <div className={`p-2 rounded-xl bg-gradient-to-br ${feature.color} bg-opacity-20 group-hover:scale-110 transition-transform`}>
                                        <feature.icon size={20} className="text-white" />
                                    </div>
                                    <span className="text-slate-300 group-hover:text-white transition-colors pt-1">
                                        {feature.title}
                                    </span>
                                </motion.div>
                            ))}
                        </div>

                        {/* Conclusion */}
                        <motion.p 
                            className="text-slate-400 italic border-l-4 border-blue-500/50 pl-4 mb-8"
                            initial={{ opacity: 0 }}
                            whileInView={{ opacity: 1 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.5 }}
                        >
                            "Que vous partiez de zéro ou que vous maîtrisiez des stratégies avancées, 
                            le centre MasterClass vous aide à grandir avec confiance."
                        </motion.p>

                        {/* CTA Button */}
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="group px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl font-bold text-lg shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all flex items-center gap-3"
                        >
                            <Play size={20} fill="white" />
                            Explorer l'Académie
                            <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                        </motion.button>
                    </motion.div>

                    {/* Right Column - 3D Floating Tablet */}
                    <motion.div
                        initial={{ opacity: 0, x: 50 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className="relative perspective-1000"
                    >
                        {/* 3D Tablet Container */}
                        <motion.div
                            style={{
                                rotateX: mousePos.y * -0.5,
                                rotateY: mousePos.x * 0.5,
                                y: springY
                            }}
                            className="relative preserve-3d"
                        >
                            {/* Tablet Frame */}
                            <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 rounded-[2.5rem] p-3 shadow-2xl shadow-blue-500/20 border border-white/10">
                                
                                {/* Camera Notch */}
                                <div className="absolute top-4 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-slate-700" />
                                
                                {/* Screen */}
                                <div className="relative bg-black rounded-[2rem] overflow-hidden aspect-[4/3]">
                                    
                                    {/* Scrolling Course Cards */}
                                    <div className="absolute inset-0 flex flex-col">
                                        {/* Header */}
                                        <div className="p-6 bg-gradient-to-b from-slate-900 to-transparent">
                                            <div className="flex items-center gap-3 mb-4">
                                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                                                    <GraduationCap size={20} />
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-sm">TradeSense Academy</h4>
                                                    <p className="text-xs text-slate-400">5 Cours Disponibles</p>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        {/* Scrolling Courses Animation */}
                                        <div className="flex-1 overflow-hidden relative">
                                            <motion.div
                                                animate={{ y: [0, -400, 0] }}
                                                transition={{ 
                                                    duration: 15, 
                                                    repeat: Infinity, 
                                                    ease: "linear" 
                                                }}
                                                className="space-y-4 px-6"
                                            >
                                                {[...courses, ...courses].map((course, i) => (
                                                    <motion.div
                                                        key={i}
                                                        className="bg-white/5 rounded-2xl overflow-hidden border border-white/10 hover:border-blue-500/50 transition-colors group"
                                                    >
                                                        <div className="relative h-24 overflow-hidden">
                                                            <img 
                                                                src={course.image} 
                                                                alt={course.title}
                                                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                                            />
                                                            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
                                                            <div className="absolute bottom-2 left-3 right-3 flex justify-between items-end">
                                                                <h5 className="font-semibold text-sm">{course.title}</h5>
                                                                <span className={`text-xs px-2 py-0.5 rounded-full ${
                                                                    course.level === 'Elite' 
                                                                        ? 'bg-amber-500/30 text-amber-300' 
                                                                        : course.level === 'Pro' 
                                                                            ? 'bg-blue-500/30 text-blue-300'
                                                                            : 'bg-green-500/30 text-green-300'
                                                                }`}>
                                                                    {course.level}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="p-3 flex items-center justify-between">
                                                            <div className="flex items-center gap-2 text-xs text-slate-400">
                                                                <Play size={12} />
                                                                {course.duration}
                                                            </div>
                                                            <div className="flex items-center gap-1 text-amber-400 text-xs">
                                                                <Zap size={12} />
                                                                +50 XP
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                ))}
                                            </motion.div>
                                            
                                            {/* Fade Gradients */}
                                            <div className="absolute top-0 left-0 right-0 h-12 bg-gradient-to-b from-black to-transparent pointer-events-none" />
                                            <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-black to-transparent pointer-events-none" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Floating Badges */}
                            <motion.div
                                animate={{ y: [0, -10, 0] }}
                                transition={{ duration: 3, repeat: Infinity }}
                                className="absolute -top-8 -right-8 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-4 shadow-lg shadow-amber-500/30"
                            >
                                <Award size={32} className="text-white" />
                            </motion.div>
                            
                            <motion.div
                                animate={{ y: [0, 10, 0] }}
                                transition={{ duration: 4, repeat: Infinity, delay: 1 }}
                                className="absolute -bottom-6 -left-6 bg-gradient-to-br from-purple-500 to-blue-600 rounded-2xl p-4 shadow-lg shadow-purple-500/30"
                            >
                                <Brain size={28} className="text-white" />
                            </motion.div>

                            {/* Stats Floating Card */}
                            <motion.div
                                animate={{ y: [0, -8, 0] }}
                                transition={{ duration: 3.5, repeat: Infinity, delay: 0.5 }}
                                className="absolute top-1/4 -left-16 bg-slate-900/90 backdrop-blur-sm rounded-xl p-4 border border-white/10 shadow-xl"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                                        <TrendingUp className="text-green-400" size={24} />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold">+87%</p>
                                        <p className="text-xs text-slate-400">Win Rate</p>
                                    </div>
                                </div>
                            </motion.div>

                            {/* XP Card */}
                            <motion.div
                                animate={{ y: [0, 8, 0] }}
                                transition={{ duration: 2.5, repeat: Infinity, delay: 1.5 }}
                                className="absolute bottom-1/4 -right-12 bg-slate-900/90 backdrop-blur-sm rounded-xl p-3 border border-white/10 shadow-xl"
                            >
                                <div className="flex items-center gap-2">
                                    <Zap className="text-amber-400" size={20} />
                                    <span className="font-bold text-amber-400">1,250 XP</span>
                                </div>
                            </motion.div>
                        </motion.div>
                    </motion.div>
                </div>
            </motion.div>

            {/* Decorative Elements */}
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />
        </section>
    );
};

export default MasterClassSection;
