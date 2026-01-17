import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Zap, ShieldAlert, Volume2, VolumeX, X } from 'lucide-react';
import { trades } from '../services/api';

// --- Sound Engine (Web Audio API Synthesizer) ---
const createSoundEngine = () => {
    let audioCtx = null;
    let alarmOscillator = null;

    const init = () => {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    };

    const playBeep = (freq, duration, volume = 0.1) => {
        init();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        gain.gain.setValueAtTime(volume, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + duration);
    };

    return {
        playDanger: () => {
            playBeep(440, 0.1, 0.2);
            setTimeout(() => playBeep(440, 0.1, 0.2), 150);
        },
        startCritical: () => {
            init();
            if (alarmOscillator) return;
            alarmOscillator = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            alarmOscillator.frequency.setValueAtTime(330, audioCtx.currentTime); // Low aeronautical-style warning
            gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
            alarmOscillator.connect(gain);
            gain.connect(audioCtx.destination);
            alarmOscillator.start();
        },
        stopCritical: () => {
            if (alarmOscillator) {
                alarmOscillator.stop();
                alarmOscillator = null;
            }
        }
    };
};

export default function RiskAlertSystem({ challengeId, onPanicSuccess }) {
    const [risk, setRisk] = useState({ danger_level: 0, status: 'NORMAL' });
    const [isMuted, setIsMuted] = useState(localStorage.getItem('risk_muted') === 'true');
    const [showPanic, setShowPanic] = useState(false);
    const soundEngine = useRef(null);

    useEffect(() => {
        soundEngine.current = createSoundEngine();
        return () => soundEngine.current.stopCritical();
    }, []);

    // Polling risk profile
    useEffect(() => {
        const checkRisk = async () => {
             if (!challengeId) return;
             try {
                // Fetch from the new risk endpoint
                const response = await fetch(`/api/trades/risk/${challengeId}`, {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                });
                const data = await response.json();
                setRisk(data);

                if (!isMuted) {
                    if (data.status === 'DANGER') soundEngine.current.playDanger();
                    if (data.status === 'CRITICAL') soundEngine.current.startCritical();
                    else soundEngine.current.stopCritical();
                } else {
                    soundEngine.current.stopCritical();
                }
             } catch (err) {
                console.error("Risk Sentinel Offline", err);
             }
        };

        const interval = setInterval(checkRisk, 5000); // Check every 5s
        checkRisk();
        return () => clearInterval(interval);
    }, [challengeId, isMuted]);

    const handlePanic = async () => {
        if (!window.confirm("PANIC MODE: Are you sure you want to close ALL positions immediately?")) return;
        try {
            await trades.panicClose({ challenge_id: challengeId });
            setRisk(prev => ({ ...prev, status: 'NORMAL', danger_level: 0 }));
            if (onPanicSuccess) onPanicSuccess();
        } catch (err) {
            console.error("Panic failure", err);
        }
    };

    const toggleMute = () => {
        const newVal = !isMuted;
        setIsMuted(newVal);
        localStorage.setItem('risk_muted', newVal);
    };

    if (!risk) return null;

    const isDanger = risk.status === 'DANGER' || risk.status === 'CRITICAL';
    const isCritical = risk.status === 'CRITICAL';

    return (
        <>
            {/* 1. Global Effects (Pulse & Glitch) */}
            <AnimatePresence>
                {isDanger && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className={`fixed inset-0 pointer-events-none z-[100] border-[10px] ${isCritical ? 'border-red-600/40 shadow-[inset_0_0_100px_rgba(220,38,38,0.5)]' : 'border-red-500/20 shadow-[inset_0_0_60px_rgba(239,68,68,0.3)]'} animate-pulse`}
                    >
                        {isCritical && (
                            <div className="absolute inset-0 bg-red-600/5 backdrop-brightness-75 mix-blend-overlay"></div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* 2. HUD HUD Notification */}
            <AnimatePresence>
                {isDanger && (
                    <motion.div
                        initial={{ y: -100, x: '-50%', opacity: 0 }}
                        animate={{ y: 20, x: '-50%', opacity: 1 }}
                        exit={{ y: -100, x: '-50%', opacity: 0 }}
                        style={{ left: '50%' }}
                        className="fixed z-[110] w-full max-w-md px-4"
                    >
                        <div className={`p-4 rounded-xl border-2 backdrop-blur-xl shadow-2xl flex items-center gap-4 ${isCritical ? 'bg-red-950/90 border-red-500 text-white' : 'bg-slate-900/90 border-red-500/50 text-red-400'}`}>
                            <div className={`p-2 rounded-lg ${isCritical ? 'bg-red-600 animate-bounce' : 'bg-red-500/20'}`}>
                                <ShieldAlert size={24} />
                            </div>
                            <div className="flex-1">
                                <div className="text-xs font-black uppercase tracking-tighter opacity-70">Risk Sentinel HUD</div>
                                <div className={`text-sm font-bold leading-tight ${isCritical ? 'animate-pulse' : ''}`}>
                                    {risk.message || "HIGH RISK DETECTED"}
                                </div>
                                <div className="text-xs font-mono mt-1">
                                    EXPOSURE: {risk.danger_level}% / 100%
                                </div>
                            </div>
                            <button onClick={toggleMute} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                                {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* 3. Panic Button Wrapper (Floating or In-HUD) */}
            <AnimatePresence>
                {isDanger && (
                    <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        className="fixed bottom-10 right-10 z-[120]"
                    >
                        <button
                            onClick={handlePanic}
                            className="group relative flex items-center justify-center p-6 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-[0_0_30px_rgba(220,38,38,0.6)] transition-all hover:scale-110 active:scale-95 overflow-hidden"
                        >
                            <span className="absolute inset-0 bg-white/20 animate-ping rounded-full"></span>
                            <div className="relative flex flex-col items-center">
                                <Zap size={28} className="mb-1" />
                                <span className="text-[10px] font-black tracking-widest uppercase">Panic Button</span>
                            </div>
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Style for glitch effect if critical */}
            <style jsx>{`
                @keyframes glitch {
                    0% { transform: translate(0); }
                    20% { transform: translate(-2px, 2px); }
                    40% { transform: translate(-2px, -2px); }
                    60% { transform: translate(2px, 2px); }
                    80% { transform: translate(2px, -2px); }
                    100% { transform: translate(0); }
                }
                .glitch-text {
                    animation: ${isCritical ? 'glitch 0.2s infinite' : 'none'};
                }
            `}</style>
        </>
    );
}
