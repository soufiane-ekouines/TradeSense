import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Sphere, MeshDistortMaterial, Backdrop } from '@react-three/drei';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, LineChart, GraduationCap, Github, BadgeInfo, Trophy, CheckCircle2 } from 'lucide-react';

// --- THREE.JS BACKGROUND: CONNECTED NODES CONSTELLATION ---
function Constellation() {
    const pointsRef = useRef();
    const count = 50;

    const positions = useMemo(() => {
        const coords = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
            coords[i * 3] = (Math.random() - 0.5) * 10;
            coords[i * 3 + 1] = (Math.random() - 0.5) * 10;
            coords[i * 3 + 2] = (Math.random() - 0.5) * 10;
        }
        return coords;
    }, []);

    useFrame((state) => {
        const t = state.clock.getElapsedTime();
        pointsRef.current.rotation.y = t * 0.05;
        pointsRef.current.rotation.x = t * 0.02;
    });

    return (
        <group ref={pointsRef}>
            <points>
                <bufferGeometry>
                    <bufferAttribute
                        attach="attributes-position"
                        count={count}
                        array={positions}
                        itemSize={3}
                    />
                </bufferGeometry>
                <pointsMaterial
                    size={0.05}
                    color="#06b6d4"
                    transparent
                    opacity={0.6}
                    sizeAttenuation
                />
            </points>
            {/* Simple lines can be added here for a "grid" feel if needed */}
        </group>
    );
}

// --- CHAT SIMULATOR COMPONENT ---
const mockMessages = [
    { id: 1, user: "Soufiane", msg: "@Karim Regarde le setup sur le Gold, breakout imminent !", badge: "Funded", color: "text-emerald-400" },
    { id: 2, user: "Elena", msg: "Excellent trade sur l'EURUSD ce matin, merci pour l'analyse IA.", badge: "Expert", color: "text-violet-400" },
    { id: 3, user: "Karim", msg: "Je surveille les 2100$, si ça casse on va vers le ciel 🚀", badge: "Trader", color: "text-cyan-400" },
    { id: 4, user: "Admin", msg: "L'atelier Stratégies NFP commence dans 10 minutes !", badge: "Expert", color: "text-emerald-500" },
    { id: 5, user: "Hiba", msg: "Quelqu'un a vu la corrélation crypto/indices aujourd'hui ?", badge: "Funded", color: "text-amber-400" }
];

function ChatDisplay({ activeFeature }) {
    const [messages, setMessages] = useState(mockMessages.slice(0, 3));

    useEffect(() => {
        const interval = setInterval(() => {
            setMessages(prev => {
                const nextMsg = mockMessages[Math.floor(Math.random() * mockMessages.length)];
                return [...prev.slice(1), { ...nextMsg, id: Date.now() }];
            });
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="relative w-full h-[400px] rounded-3xl bg-slate-900/40 backdrop-blur-xl border border-white/10 p-6 overflow-hidden shadow-2xl">
            {/* Glassmorphism Header */}
            <div className="flex items-center gap-3 pb-4 border-b border-white/10 mb-4">
                <div className="w-3 h-3 rounded-full bg-red-500/50"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500/50"></div>
                <div className="w-3 h-3 rounded-full bg-emerald-500/50"></div>
                <div className="ml-2 text-xs font-black uppercase tracking-widest text-slate-500">Global Traders Hub</div>
            </div>

            <div className="space-y-4">
                <AnimatePresence mode="popLayout">
                    {messages.map((m) => (
                        <motion.div
                            key={m.id}
                            initial={{ opacity: 0, x: -20, scale: 0.9 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -20, scale: 0.8 }}
                            className="flex items-start gap-3 p-3 rounded-2xl bg-white/5 border border-white/5"
                        >
                            <div className={`w-8 h-8 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-[10px] font-bold ${m.color}`}>
                                {m.user[0]}
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs font-bold text-slate-200">{m.user}</span>
                                    {m.badge === "Expert" && (
                                        <span className="flex items-center gap-0.5 text-[8px] px-1.5 py-0.5 rounded-full bg-violet-500/20 text-violet-400 border border-violet-500/30">
                                            <CheckCircle2 size={8} /> EXPERT
                                        </span>
                                    )}
                                    {m.badge === "Funded" && (
                                        <span className="flex items-center gap-0.5 text-[8px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                            <Trophy size={8} /> FUNDED
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm text-slate-400 leading-relaxed">{m.msg}</p>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {/* Overlays to simulate depth/fade */}
            <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-slate-900/60 to-transparent pointer-events-none"></div>
            <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-slate-900/60 to-transparent pointer-events-none"></div>

            {/* Strategy Overlay when hovering feature 2 */}
            <AnimatePresence>
                {activeFeature === 1 && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.2 }}
                        className="absolute inset-0 z-20 flex items-center justify-center p-6"
                    >
                        <div className="w-full aspect-video bg-black/80 backdrop-blur-md rounded-2xl border border-emerald-500/30 p-4 shadow-[0_0_50px_rgba(16,185,129,0.2)]">
                            <div className="flex justify-between items-center mb-4">
                                <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Shared Strategy: XAUUSD</span>
                                <span className="text-[10px] text-slate-500">Shared by @ExpertTrader</span>
                            </div>
                            <div className="h-full flex items-center justify-center">
                                <LineChart className="text-emerald-500 w-full h-full opacity-50" />
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default function CommunitySection() {
    const [activeFeature, setActiveFeature] = useState(null);

    const features = [
        {
            icon: <MessageSquare className="text-cyan-400" size={24} />,
            text: "Discuter avec des amis & Rencontrer de nouveaux traders",
            glow: "shadow-[0_0_20px_rgba(34,211,238,0.3)]"
        },
        {
            icon: <LineChart className="text-emerald-400" size={24} />,
            text: "Partager des stratégies & Rejoindre des groupes thématiques",
            glow: "shadow-[0_0_20px_rgba(16,185,129,0.3)]"
        },
        {
            icon: <GraduationCap className="text-violet-400" size={24} />,
            text: "Apprendre des experts",
            glow: "shadow-[0_0_20px_rgba(139,92,246,0.3)]"
        }
    ];

    return (
        <section className="relative min-h-[90vh] flex items-center bg-black overflow-hidden py-20">
            {/* Background Canvas */}
            <div className="absolute inset-0 z-0">
                <Canvas camera={{ position: [0, 0, 5] }}>
                    <ambientLight intensity={0.5} />
                    <Constellation />
                </Canvas>
            </div>

            <div className="container mx-auto px-4 relative z-10">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

                    {/* Left Column: Typography and List */}
                    <div className="space-y-10">
                        <motion.div
                            initial={{ opacity: 0, x: -50 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.8 }}
                        >
                            <h2 className="text-5xl md:text-7xl font-black mb-6 bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-violet-400 to-emerald-400 uppercase tracking-tighter">
                                Zone Communautaire
                            </h2>
                            <p className="text-xl text-slate-400 font-medium">
                                Un espace social dédié aux traders où vous pouvez :
                            </p>
                        </motion.div>

                        <div className="space-y-6">
                            {features.map((f, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, x: -30 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.1 }}
                                    onMouseEnter={() => setActiveFeature(i)}
                                    onMouseLeave={() => setActiveFeature(null)}
                                    className={`group flex items-center gap-6 p-5 rounded-2xl border border-white/5 transition-all cursor-pointer ${activeFeature === i ? 'bg-white/5 border-white/20 scale-105 ' + f.glow : 'hover:bg-white/[0.02]'}`}
                                >
                                    <div className={`p-4 rounded-xl bg-black/50 border border-white/10 group-hover:scale-110 transition-transform`}>
                                        {f.icon}
                                    </div>
                                    <span className="text-lg font-bold text-slate-300 group-hover:text-white transition-colors">
                                        {f.text}
                                    </span>
                                </motion.div>
                            ))}
                        </div>

                        <motion.div
                            initial={{ opacity: 0 }}
                            whileInView={{ opacity: 1 }}
                            className="space-y-8 pt-6"
                        >
                            <p className="text-slate-500 font-medium italic border-l-2 border-emerald-500/50 pl-6 py-2">
                                Cela construit un réseau solide autour de votre croissance.
                            </p>

                            <button className="group relative px-10 py-5 bg-transparent border border-white/10 hover:border-violet-500/50 rounded-2xl transition-all overflow-hidden flex items-center gap-4">
                                <div className="absolute inset-0 bg-violet-600/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                <div className="p-2 rounded-lg bg-[#5865F2]/20">
                                    {/* Using a placeholder SVG for Discord icon if layout-dashboard doesn't have it */}
                                    <svg width="24" height="24" viewBox="0 0 127.14 96.36" fill="#5865F2">
                                        <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.71,32.65-1.82,56.6.4,80.21a105.73,105.73,0,0,0,32.22,16.15,77.7,77.7,0,0,0,6.89-11.11,68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1,105.25,105.25,0,0,0,32.24-16.14C129.5,50.2,120.7,26.52,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5.07-12.72,11.41-12.72S54,46,54,53,48.83,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5.07-12.72,11.44-12.72S96.16,46,96.16,53,91,65.69,84.69,65.69Z" />
                                    </svg>
                                </div>
                                <span className="text-xl font-bold text-white uppercase tracking-widest">Rejoindre le Discord VIP</span>
                            </button>
                        </motion.div>
                    </div>

                    {/* Right Column: Interactive Visual */}
                    <div className="relative group/visual">
                        <motion.div
                            initial={{ opacity: 0, rotateY: 45, x: 100 }}
                            whileInView={{ opacity: 1, rotateY: -15, x: 0 }}
                            transition={{ duration: 1.2, type: "spring" }}
                            className="relative z-10 transform perspective-[1000px] hover:rotate-y-0 transition-transform duration-700"
                        >
                            <ChatDisplay activeFeature={activeFeature} />

                            {/* Decorative Floating Elements */}
                            <motion.div
                                animate={{ y: [0, -20, 0] }}
                                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                                className="absolute -top-10 -right-10 p-6 bg-emerald-500/20 backdrop-blur-xl border border-emerald-500/30 rounded-3xl shadow-[0_0_30px_rgba(16,185,129,0.3)]"
                            >
                                <Trophy className="text-emerald-400" size={32} />
                            </motion.div>

                            <motion.div
                                animate={{ y: [0, 20, 0] }}
                                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                                className="absolute -bottom-10 -left-10 p-6 bg-cyan-500/20 backdrop-blur-xl border border-cyan-500/30 rounded-3xl shadow-[0_0_30px_rgba(34,211,238,0.3)]"
                            >
                                <MessageSquare className="text-cyan-400" size={32} />
                            </motion.div>
                        </motion.div>

                        {/* Background Glow */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/10 via-violet-500/10 to-emerald-500/10 blur-[100px] opacity-50 group-hover/visual:opacity-100 transition-opacity"></div>
                    </div>

                </div>
            </div>
        </section>
    );
}
