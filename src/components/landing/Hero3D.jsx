import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Sphere, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, PlayCircle } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import CinematicVideoModal from './CinematicVideoModal';

function Globe() {
    const meshRef = useRef();
    // ... (rest of Globe component remains same)
    const dots = useMemo(() => {
        const temp = [];
        const phi = Math.PI * (3 - Math.sqrt(5));
        for (let i = 0; i < 1000; i++) {
            const y = 1 - (i / (1000 - 1)) * 2;
            const radius = Math.sqrt(1 - y * y);
            const theta = phi * i;
            const x = Math.cos(theta) * radius;
            const z = Math.sin(theta) * radius;
            temp.push([x * 2, y * 2, z * 2]);
        }
        return temp;
    }, []);

    useFrame((state) => {
        const t = state.clock.getElapsedTime();
        if (meshRef.current) {
            meshRef.current.rotation.y = t * 0.1;
            meshRef.current.rotation.z = Math.sin(t * 0.05) * 0.1;
        }
    });

    return (
        <group ref={meshRef}>
            <Sphere args={[1.9, 32, 32]}>
                <meshBasicMaterial color="#000000" transparent opacity={0.9} />
            </Sphere>
            {dots.map((pos, i) => (
                <mesh key={i} position={pos}>
                    <sphereGeometry args={[0.015, 8, 8]} />
                    <meshBasicMaterial color={i % 5 === 0 ? "#10b981" : "#059669"} />
                </mesh>
            ))}
            <lineSegments>
                <bufferGeometry />
                <lineBasicMaterial color="#047857" transparent opacity={0.1} />
            </lineSegments>
        </group>
    );
}

function Scene() {
    return (
        <Canvas camera={{ position: [0, 0, 5], fov: 45 }} gl={{ antialias: true, alpha: true }}>
            <color attach="background" args={['#050505']} />
            <ambientLight intensity={0.5} />
            <pointLight position={[10, 10, 10]} intensity={1} color="#10b981" />
            <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
            <Globe />
            <OrbitControls enableZoom={false} autoRotate autoRotateSpeed={0.5} enablePan={false} />
        </Canvas>
    );
}

export default function Hero3D() {
    const { t, isRTL } = useLanguage();
    const [isDemoOpen, setIsDemoOpen] = React.useState(false);

    // Scroll to pricing section on mount if hash is #pricing
    React.useEffect(() => {
        if (window.location.hash === '#pricing') {
            const pricingSection = document.getElementById('pricing');
            if (pricingSection) {
                pricingSection.scrollIntoView({ behavior: 'smooth' });
            }
        }
    }, []);

    return (
        <div className="relative h-[85vh] w-full bg-[#050505] overflow-hidden">
            <div className="absolute inset-0 z-0 opacity-60">
                <Scene />
            </div>

            <div className="relative z-10 container mx-auto px-4 h-full flex flex-col justify-center items-center text-center">
                <div className="max-w-4xl mx-auto space-y-8">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium backdrop-blur-sm"
                    >
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        {t('hero.badge')}
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className="text-5xl md:text-7xl lg:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-white to-slate-500 leading-tight tracking-tight drop-shadow-[0_0_50px_rgba(16,185,129,0.2)]"
                    >
                        {t('hero.title_1')}<br />
                        <span className="text-emerald-500">{t('hero.title_2')}</span>
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.4 }}
                        className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed"
                    >
                        {t('hero.subtitle')}
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.6 }}
                        className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4"
                    >
                        <Link 
                            to="/#pricing"
                            onClick={(e) => {
                                e.preventDefault();
                                const pricingSection = document.getElementById('pricing');
                                if (pricingSection) {
                                    pricingSection.scrollIntoView({ behavior: 'smooth' });
                                } else {
                                    window.location.href = '/#pricing';
                                }
                            }}
                        >
                            <button className="group relative px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-lg rounded-xl transition-all duration-300 shadow-[0_0_30px_rgba(16,185,129,0.3)] hover:shadow-[0_0_50px_rgba(16,185,129,0.5)] transform hover:scale-[1.02]">
                                <span className="flex items-center gap-2">
                                    {t('hero.cta_primary')}
                                    <ArrowRight className={`transition-transform ${isRTL ? 'rotate-180 group-hover:-translate-x-1' : 'group-hover:translate-x-1'}`} />
                                </span>
                            </button>
                        </Link>

                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setIsDemoOpen(true)}
                            className="px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white font-medium text-lg rounded-xl backdrop-blur-md transition-all duration-300 flex items-center gap-3 group"
                        >
                            <motion.div
                                whileHover={{ scale: 1.2, rotate: 10 }}
                                transition={{ type: "spring", stiffness: 400, damping: 10 }}
                            >
                                <PlayCircle size={20} className="text-emerald-500" />
                            </motion.div>
                            {t('hero.cta_secondary')}
                        </motion.button>
                    </motion.div>

                    {/* Cinematic Video Experience */}
                    <CinematicVideoModal
                        isOpen={isDemoOpen}
                        onClose={() => setIsDemoOpen(false)}
                    />
                </div>
            </div>

            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#050505] to-transparent z-10 pointer-events-none"></div>
        </div>
    );
}
