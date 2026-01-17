import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XCircle, Trophy, Lock, TrendingDown, AlertOctagon, Skull, ShieldOff, Zap } from 'lucide-react';

/**
 * AccountStatusOverlay - Epic Full-screen overlay for account status
 * Shows when account is FAILED or PASSED with dramatic animations
 */
export default function AccountStatusOverlay({ status, metrics, onDismiss }) {
    const [showContent, setShowContent] = useState(false);
    const [glitchText, setGlitchText] = useState(false);

    useEffect(() => {
        // Dramatic entrance timing
        const timer = setTimeout(() => setShowContent(true), 300);
        
        // Glitch effect for failed
        if (status === 'failed') {
            const glitchInterval = setInterval(() => {
                setGlitchText(true);
                setTimeout(() => setGlitchText(false), 100);
            }, 3000);
            return () => {
                clearInterval(glitchInterval);
                clearTimeout(timer);
            };
        }
        return () => clearTimeout(timer);
    }, [status]);

    // Only show for terminal states
    if (status !== 'failed' && status !== 'passed') {
        return null;
    }

    const isFailed = status === 'failed';
    const isPassed = status === 'passed';

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] overflow-hidden"
            >
                {/* Animated Background */}
                {isFailed ? (
                    <>
                        {/* Dark red gradient with animated pulse */}
                        <div className="absolute inset-0 bg-gradient-to-br from-black via-red-950 to-black" />
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(220,38,38,0.3),transparent_70%)] animate-pulse" />
                        
                        {/* Animated grid lines */}
                        <div className="absolute inset-0 opacity-10">
                            <div className="absolute inset-0" style={{
                                backgroundImage: 'linear-gradient(rgba(255,0,0,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,0,0,0.3) 1px, transparent 1px)',
                                backgroundSize: '50px 50px',
                                animation: 'pulse 4s ease-in-out infinite'
                            }} />
                        </div>

                        {/* Floating danger particles */}
                        {[...Array(20)].map((_, i) => (
                            <motion.div
                                key={i}
                                className="absolute w-2 h-2 bg-red-500/30 rounded-full"
                                initial={{ 
                                    x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1000), 
                                    y: (typeof window !== 'undefined' ? window.innerHeight : 800) + 50,
                                    opacity: 0 
                                }}
                                animate={{ 
                                    y: -50,
                                    opacity: [0, 0.8, 0],
                                }}
                                transition={{
                                    duration: 4 + Math.random() * 3,
                                    repeat: Infinity,
                                    delay: Math.random() * 3,
                                    ease: "linear"
                                }}
                            />
                        ))}
                    </>
                ) : (
                    <>
                        {/* Success gradient */}
                        <div className="absolute inset-0 bg-gradient-to-br from-black via-emerald-950 to-black" />
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(16,185,129,0.3),transparent_70%)]" />
                        
                        {/* Celebration particles */}
                        {[...Array(30)].map((_, i) => (
                            <motion.div
                                key={i}
                                className="absolute w-1 h-3 bg-gradient-to-b from-emerald-400 to-transparent rounded-full"
                                initial={{ 
                                    x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1000), 
                                    y: -20,
                                    rotate: Math.random() * 360,
                                    opacity: 0 
                                }}
                                animate={{ 
                                    y: (typeof window !== 'undefined' ? window.innerHeight : 800) + 50,
                                    rotate: Math.random() * 720,
                                    opacity: [0, 1, 1, 0],
                                }}
                                transition={{
                                    duration: 3 + Math.random() * 2,
                                    repeat: Infinity,
                                    delay: Math.random() * 2,
                                    ease: "linear"
                                }}
                            />
                        ))}
                    </>
                )}

                {/* Main Content */}
                <div className="relative z-10 h-full flex items-center justify-center p-6">
                    <motion.div
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.2, type: 'spring', damping: 15, stiffness: 200 }}
                        className="text-center max-w-4xl w-full"
                    >
                        {/* Epic Icon */}
                        {isFailed ? (
                            <motion.div
                                initial={{ scale: 0, rotate: -180 }}
                                animate={{ scale: 1, rotate: 0 }}
                                transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
                                className="relative mx-auto mb-8"
                            >
                                {/* Pulsing rings */}
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-48 h-48 rounded-full border-4 border-red-500/20 animate-ping" />
                                </div>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-40 h-40 rounded-full border-2 border-red-500/40 animate-pulse" />
                                </div>
                                
                                {/* Main icon container */}
                                <div className="relative w-44 h-44 mx-auto rounded-full bg-gradient-to-br from-red-600 to-red-900 flex items-center justify-center shadow-[0_0_100px_rgba(220,38,38,0.5)]">
                                    <motion.div
                                        animate={{ 
                                            scale: [1, 1.1, 1],
                                        }}
                                        transition={{ duration: 2, repeat: Infinity }}
                                    >
                                        <Skull size={80} className="text-white drop-shadow-2xl" />
                                    </motion.div>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div
                                initial={{ scale: 0, y: 100 }}
                                animate={{ scale: 1, y: 0 }}
                                transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
                                className="relative w-44 h-44 mx-auto mb-8 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-[0_0_100px_rgba(16,185,129,0.5)]"
                            >
                                <Trophy size={80} className="text-white drop-shadow-2xl" />
                            </motion.div>
                        )}

                        {/* GIANT Title */}
                        <motion.div
                            initial={{ opacity: 0, y: 50 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 }}
                            className="mb-6"
                        >
                            {isFailed ? (
                                <h1 
                                    className={`text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-black tracking-tighter ${
                                        glitchText ? 'translate-x-1 text-red-400' : ''
                                    }`}
                                    style={{
                                        background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 50%, #b91c1c 100%)',
                                        WebkitBackgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent',
                                        textShadow: '0 0 80px rgba(220,38,38,0.5)',
                                        filter: glitchText ? 'blur(2px)' : 'none'
                                    }}
                                >
                                    ÉCHOUÉ
                                </h1>
                            ) : (
                                <h1 
                                    className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-black tracking-tighter"
                                    style={{
                                        background: 'linear-gradient(135deg, #34d399 0%, #10b981 50%, #059669 100%)',
                                        WebkitBackgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent',
                                        textShadow: '0 0 80px rgba(16,185,129,0.5)'
                                    }}
                                >
                                    RÉUSSI
                                </h1>
                            )}
                        </motion.div>

                        {/* Subtitle */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.7 }}
                            className="mb-10"
                        >
                            {isFailed ? (
                                <div className="space-y-3">
                                    <p className="text-2xl md:text-3xl text-red-300 font-light">
                                        Compte Challenge Terminé
                                    </p>
                                    <div className="flex items-center justify-center gap-3 text-red-400">
                                        <ShieldOff size={24} />
                                        <span className="text-xl font-semibold">Règles de Risque Violées</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <p className="text-2xl md:text-3xl text-emerald-300 font-light">
                                        Félicitations, Trader d'Élite !
                                    </p>
                                    <div className="flex items-center justify-center gap-3 text-emerald-400">
                                        <Zap size={24} />
                                        <span className="text-xl font-semibold">Objectif de 10% Atteint</span>
                                    </div>
                                </div>
                            )}
                        </motion.div>

                        {/* Stats Cards */}
                        {metrics && (
                            <motion.div
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.9 }}
                                className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10 max-w-3xl mx-auto"
                            >
                                <div className={`rounded-2xl p-5 backdrop-blur-xl ${
                                    isFailed ? 'bg-red-950/50 border border-red-500/30' : 'bg-emerald-950/50 border border-emerald-500/30'
                                }`}>
                                    <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Balance Initiale</div>
                                    <div className="text-xl md:text-2xl font-bold text-white">
                                        {metrics.initial_balance?.toLocaleString() || '---'} <span className="text-sm text-slate-400">DH</span>
                                    </div>
                                </div>
                                <div className={`rounded-2xl p-5 backdrop-blur-xl ${
                                    isFailed ? 'bg-red-950/50 border border-red-500/30' : 'bg-emerald-950/50 border border-emerald-500/30'
                                }`}>
                                    <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Équité Finale</div>
                                    <div className={`text-xl md:text-2xl font-bold ${isFailed ? 'text-red-400' : 'text-emerald-400'}`}>
                                        {metrics.current_equity?.toLocaleString() || '---'} <span className="text-sm opacity-70">DH</span>
                                    </div>
                                </div>
                                <div className={`rounded-2xl p-5 backdrop-blur-xl ${
                                    isFailed ? 'bg-red-950/50 border border-red-500/30' : 'bg-emerald-950/50 border border-emerald-500/30'
                                }`}>
                                    <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">P&L Final</div>
                                    <div className={`text-xl md:text-2xl font-bold ${(metrics.profit || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                        {(metrics.profit || 0) >= 0 ? '+' : ''}{(metrics.profit_pct || 0).toFixed(2)}%
                                    </div>
                                </div>
                                <div className={`rounded-2xl p-5 backdrop-blur-xl ${
                                    isFailed ? 'bg-red-950/50 border border-red-500/30' : 'bg-emerald-950/50 border border-emerald-500/30'
                                }`}>
                                    <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">
                                        {isFailed ? 'Drawdown Max' : 'Progression'}
                                    </div>
                                    <div className={`text-xl md:text-2xl font-bold ${isFailed ? 'text-red-400' : 'text-emerald-400'}`}>
                                        {isFailed 
                                            ? `-${(metrics.total_drawdown_pct || 0).toFixed(1)}%`
                                            : `${(metrics.profit_progress_pct || 100).toFixed(0)}%`}
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* Lock Badge for Failed */}
                        {isFailed && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 1.1 }}
                                className="flex items-center justify-center gap-3 mb-10"
                            >
                                <div className="flex items-center gap-3 px-6 py-3 bg-red-500/20 border border-red-500/50 rounded-full">
                                    <Lock size={22} className="text-red-400" />
                                    <span className="text-lg font-bold text-red-400 uppercase tracking-wide">
                                        Trading Définitivement Désactivé
                                    </span>
                                </div>
                            </motion.div>
                        )}

                        {/* Action Buttons */}
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 1.2 }}
                            className="flex flex-col sm:flex-row gap-4 justify-center"
                        >
                            {isPassed && onDismiss && (
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={onDismiss}
                                    className="px-10 py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white text-lg font-bold rounded-xl shadow-lg shadow-emerald-500/30 transition-all"
                                >
                                    Continuer le Trading
                                </motion.button>
                            )}
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => window.location.href = '/#pricing'}
                                className={`px-10 py-4 text-lg font-bold rounded-xl transition-all ${
                                    isFailed
                                        ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 text-white shadow-lg shadow-red-500/30'
                                        : 'bg-white/10 hover:bg-white/20 text-white border border-white/30'
                                }`}
                            >
                                {isFailed ? '🔥 Nouveau Challenge' : 'Voir les Plans'}
                            </motion.button>
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => window.location.href = '/leaderboard'}
                                className="px-10 py-4 bg-white/10 hover:bg-white/20 text-white text-lg font-bold rounded-xl border border-white/30 transition-all"
                            >
                                🏆 Classement
                            </motion.button>
                        </motion.div>
                    </motion.div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
