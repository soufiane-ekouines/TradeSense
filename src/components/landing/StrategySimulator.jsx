import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../../context/LanguageContext';
import { HelpCircle, Info, Activity, TrendingUp, Zap, Newspaper } from 'lucide-react';

const Tooltip = ({ content }) => (
    <div className="group relative inline-block ml-2">
        <HelpCircle size={14} className="text-slate-500 cursor-help" />
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-800 text-white text-[10px] rounded shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 border border-white/10">
            {content}
        </div>
    </div>
);

const Gauge = ({ value }) => {
    // Radius of the circle
    const radius = 80;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (value / 100) * circumference;

    const getColor = (v) => {
        if (v < 40) return '#ef4444'; // Red
        if (v < 70) return '#f59e0b'; // Amber
        return '#10b981'; // Emerald
    };

    return (
        <div className="relative flex items-center justify-center">
            <svg className="w-48 h-48 transform -rotate-90">
                <circle
                    cx="96"
                    cy="96"
                    r={radius}
                    stroke="currentColor"
                    strokeWidth="12"
                    fill="transparent"
                    className="text-slate-800"
                />
                <motion.circle
                    cx="96"
                    cy="96"
                    r={radius}
                    stroke={getColor(value)}
                    strokeWidth="12"
                    fill="transparent"
                    strokeDasharray={circumference}
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset: offset }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    strokeLinecap="round"
                    className="drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <motion.span
                    key={value}
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-5xl font-black text-white tracking-widest"
                >
                    {Math.round(value)}%
                </motion.span>
                <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-1">Win Probability</span>
            </div>
        </div>
    );
};

export default function StrategySimulator() {
    const { t, isRTL } = useLanguage();
    const [trend, setTrend] = useState(50); // 0 (Bearish) to 100 (Bullish)
    const [sentiment, setSentiment] = useState(50); // 0 (Neg) to 100 (Pos)
    const [volatility, setVolatility] = useState(30); // 0 (Low) to 100 (Extreme)
    const [winRate, setWinRate] = useState(65);

    // Calculate Win Rate based on parameters
    useEffect(() => {
        // Ideal scenario: Strong Trend + Strong Sentiment + Moderate Volatility
        let score = 50;

        // Trend component (Impact of being aligned with market)
        score += (trend - 50) * 0.3;

        // Sentiment component
        score += (sentiment - 50) * 0.3;

        // Volatility penalty if too high (risk) or too low (no move)
        const volPenalty = Math.abs(volatility - 30) * 0.4;
        score -= volPenalty;

        // Apply a "Synergy" boost if trend and sentiment are both very high
        if (trend > 80 && sentiment > 80) score += 15;

        // Clamp between 5 and 99
        setWinRate(Math.max(5, Math.min(99, score)));
    }, [trend, sentiment, volatility]);

    const getVerdict = () => {
        if (winRate > 75) return t('simulator.verdict_high');
        if (winRate > 45) return t('simulator.verdict_med');
        return t('simulator.verdict_low');
    };

    const getVerdictColor = () => {
        if (winRate > 75) return 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5';
        if (winRate > 45) return 'text-amber-400 border-amber-500/20 bg-amber-500/5';
        return 'text-red-400 border-red-500/20 bg-red-500/5';
    };

    return (
        <section className="py-24 bg-[#050505] relative z-10 overflow-hidden" id="simulator">
            {/* Background cockpit grid effect */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(16,185,129,0.05)_0%,transparent_100%)]"></div>
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px]"></div>

            <div className="container mx-auto px-4 max-w-6xl relative">
                <div className="text-center mb-16">
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        className="text-3xl md:text-5xl font-bold text-white mb-4"
                    >
                        {t('simulator.title')}
                    </motion.h2>
                    <p className="text-slate-400 max-w-2xl mx-auto">
                        {t('simulator.subtitle')}
                    </p>
                </div>

                <div className="grid lg:grid-cols-2 gap-12 items-center bg-slate-900/40 backdrop-blur-xl p-8 md:p-12 rounded-[2rem] border border-white/10 shadow-2xl relative">
                    {/* Cockpit Left: Controls */}
                    <div className="space-y-10">
                        <div className="flex items-center gap-2 mb-2">
                            <Zap className="text-emerald-500" size={18} />
                            <span className="text-sm font-bold uppercase tracking-widest text-slate-300">Market Controls</span>
                        </div>

                        {/* Slider 1: Trend */}
                        <div className="space-y-4">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-300 flex items-center">
                                    {t('simulator.trend_label')}
                                    <Tooltip content={t('simulator.tooltip_trend')} />
                                </span>
                                <span className="font-mono text-emerald-500">{trend}%</span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="100"
                                value={trend}
                                onChange={(e) => setTrend(parseInt(e.target.value))}
                                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                            />
                            <div className="flex justify-between text-[10px] uppercase text-slate-500 font-bold">
                                <span>{t('simulator.trend_bearish')}</span>
                                <span>{t('simulator.trend_bullish')}</span>
                            </div>
                        </div>

                        {/* Slider 2: Sentiment */}
                        <div className="space-y-4">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-300 flex items-center">
                                    {t('simulator.sentiment_label')}
                                    <Tooltip content={t('simulator.tooltip_sentiment')} />
                                </span>
                                <span className="font-mono text-emerald-500">{sentiment}%</span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="100"
                                value={sentiment}
                                onChange={(e) => setSentiment(parseInt(e.target.value))}
                                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                            />
                            <div className="flex justify-between text-[10px] uppercase text-slate-500 font-bold">
                                <span>{t('simulator.sentiment_neg')}</span>
                                <span>{t('simulator.sentiment_pos')}</span>
                            </div>
                        </div>

                        {/* Slider 3: Volatility */}
                        <div className="space-y-4">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-300 flex items-center">
                                    {t('simulator.volatility_label')}
                                    <Tooltip content={t('simulator.tooltip_volatility')} />
                                </span>
                                <span className="font-mono text-emerald-500">{volatility}%</span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="100"
                                value={volatility}
                                onChange={(e) => setVolatility(parseInt(e.target.value))}
                                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                            />
                            <div className="flex justify-between text-[10px] uppercase text-slate-500 font-bold">
                                <span>{t('simulator.vol_low')}</span>
                                <span>{t('simulator.vol_extreme')}</span>
                            </div>
                        </div>
                    </div>

                    {/* Cockpit Right: Output */}
                    <div className="flex flex-col items-center justify-center p-8 rounded-2xl bg-black/40 border border-white/5 relative">
                        {/* Shaking effect container for high volatility */}
                        <motion.div
                            animate={volatility > 80 ? {
                                x: [0, -2, 2, -2, 2, 0],
                                rotate: [0, -0.5, 0.5, -0.5, 0.5, 0]
                            } : {}}
                            transition={{ repeat: Infinity, duration: 0.1 }}
                            className="mb-8"
                        >
                            <Gauge value={winRate} />
                        </motion.div>

                        <div className={`mt-6 p-6 rounded-xl border w-full transition-all duration-500 ${getVerdictColor()}`}>
                            <div className="flex gap-4 items-start">
                                <Activity size={24} className="mt-1 flex-shrink-0" />
                                <div>
                                    <div className="text-xs uppercase font-black tracking-widest mb-1 opacity-60">AI Verdict</div>
                                    <p className={`text-sm md:text-base font-medium leading-relaxed ${isRTL ? 'font-arabic' : ''}`}>
                                        {getVerdict()}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Scanning labels for detail */}
                        <div className="mt-10 grid grid-cols-2 gap-4 w-full">
                            <div className="p-3 bg-white/5 rounded-lg border border-white/5 flex items-center gap-3">
                                <Newspaper size={16} className="text-slate-400" />
                                <div className="text-[10px] uppercase text-slate-500 font-bold">NLP Feed: SCANNING...</div>
                            </div>
                            <div className="p-3 bg-white/5 rounded-lg border border-white/5 flex items-center gap-3">
                                <TrendingUp size={16} className="text-slate-400" />
                                <div className="text-[10px] uppercase text-slate-500 font-bold">Signals: ACTIVE</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Decorative Elements */}
                <div className="absolute -top-12 -left-12 w-32 h-32 bg-emerald-500/20 rounded-full blur-3xl"></div>
                <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl"></div>
            </div>
        </section>
    );
}
