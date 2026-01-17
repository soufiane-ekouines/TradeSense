import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cpu, Calendar, TrendingUp, AlertCircle, ChevronRight, Clock, Rocket } from 'lucide-react';
import { news_api } from '../services/api';
import { Card } from './ui/Card';

const TypingEffect = ({ text, speed = 40 }) => {
    const [displayedText, setDisplayedText] = useState('');

    useEffect(() => {
        let i = 0;
        const timer = setInterval(() => {
            setDisplayedText((prev) => prev + text.charAt(i));
            i++;
            if (i >= text.length) clearInterval(timer);
        }, speed);
        return () => clearInterval(timer);
    }, [text, speed]);

    return <span>{displayedText}</span>;
};

const CountdownTimer = ({ targetTime }) => {
    const [timeLeft, setTimeLeft] = useState('');
    const [isCritical, setIsCritical] = useState(false);

    useEffect(() => {
        const calculateTime = () => {
            const now = new Date();
            const target = new Date(targetTime);
            const diff = target - now;

            if (diff <= 0) {
                setTimeLeft('00:00:00');
                return;
            }

            const h = Math.floor(diff / 3600000).toString().padStart(2, '0');
            const m = Math.floor((diff % 3600000) / 60000).toString().padStart(2, '0');
            const s = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0');

            setIsCritical(diff < 3600000); // Less than 1 hour
            setTimeLeft(`${h}:${m}:${s}`);
        };

        const timer = setInterval(calculateTime, 1000);
        return () => clearInterval(timer);
    }, [targetTime]);

    return (
        <div className={`font-mono text-3xl font-black tracking-tighter ${isCritical ? 'text-red-500 animate-pulse drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'text-emerald-400'}`}>
            {timeLeft}
        </div>
    );
};

export default function NewsHubSection() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await news_api.getLatest();
                setData(res.data);
            } catch (err) {
                console.error("News fetch error", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
        const interval = setInterval(fetchData, 60000); // Update every minute
        return () => clearInterval(interval);
    }, []);

    if (loading || !data) return (
        <div className="h-64 flex items-center justify-center bg-black border border-white/5 rounded-2xl">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-emerald-500"></div>
        </div>
    );

    return (
        <section className="space-y-6 mt-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 px-4">
                <div>
                    <h2 className="text-3xl font-black tracking-tight text-white uppercase italic">Hub d'Actualités en Direct</h2>
                    <p className="text-slate-400 flex items-center gap-2 mt-1">
                        Restez informé avec :
                        <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Live Intelligence</span>
                    </p>
                </div>
                <div className="flex flex-wrap gap-3">
                    {["Actualités financières en temps réel", "Résumés de marché créés par l'IA", "Alertes d'événements économiques"].map((point, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs text-slate-500 bg-white/5 px-3 py-1.5 rounded-lg">
                            <div className="w-1 h-1 rounded-full bg-emerald-500"></div>
                            {point}
                        </div>
                    ))}
                </div>
            </div>

            {/* Zone A: Ticker Défilant */}
            <div className="relative overflow-hidden bg-emerald-950/20 border-y border-emerald-500/20 py-3 backdrop-blur-md">
                <motion.div
                    animate={{ x: [0, -2000] }}
                    transition={{ repeat: Infinity, duration: 40, ease: "linear" }}
                    className="flex whitespace-nowrap gap-12"
                >
                    {[...data.news, ...data.news].map((item, i) => (
                        <div key={i} className="flex items-center gap-3 group">
                            <span className={`w-2 h-2 rounded-full ${item.impact === 'High' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]' : 'bg-yellow-500'}`}></span>
                            <span className="text-sm font-bold text-slate-300 group-hover:text-white transition-colors uppercase tracking-wide">
                                {item.title}
                            </span>
                            <span className="text-xs font-mono text-emerald-500/50">[{item.time}]</span>
                        </div>
                    ))}
                </motion.div>
            </div>

            {/* Bento Grid Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 px-4">

                {/* Zone B: AI Market Wrap */}
                <Card className="lg:col-span-2 p-6 bg-gradient-to-br from-slate-900 to-black border-white/5 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Cpu size={120} className="text-emerald-500" />
                    </div>

                    <div className="relative z-10 space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                                <Cpu className="text-emerald-400 animate-pulse" size={24} />
                            </div>
                            <h3 className="font-black uppercase tracking-widest text-emerald-100">AI Market Wrap</h3>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pb-4 border-b border-white/10">
                            <div>
                                <div className="text-[10px] uppercase text-slate-500 font-bold mb-1">Market Sentiment</div>
                                <div className={`text-lg font-black tracking-tighter ${data.ai_summary.sentiment === 'BULLISH' ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {data.ai_summary.sentiment}
                                </div>
                            </div>
                            <div>
                                <div className="text-[10px] uppercase text-slate-500 font-bold mb-1">Primary Drivers</div>
                                <div className="text-xs text-slate-300 font-medium leading-tight">
                                    {data.ai_summary.drivers}
                                </div>
                            </div>
                        </div>

                        <div className="min-h-[60px] text-slate-300 text-sm leading-relaxed italic border-l-2 border-emerald-500/30 pl-4 py-1">
                            <TypingEffect text={data.ai_summary.summary} />
                            <span className="inline-block w-1.5 h-4 ml-1 bg-emerald-500 animate-pulse align-middle"></span>
                        </div>
                    </div>
                </Card>

                {/* Zone C: Economic Calendar / Next Big Event */}
                <Card className="p-6 bg-black border-red-500/20 relative overflow-hidden flex flex-col justify-between">
                    <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-red-500/5 rounded-full blur-3xl"></div>

                    <div className="space-y-4 relative z-10">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-red-500/10 rounded-xl border border-red-500/20">
                                <Calendar className="text-red-400" size={24} />
                            </div>
                            <h3 className="font-black uppercase tracking-widest text-red-100">Next Big Event</h3>
                        </div>

                        <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                            <div className="text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></div>
                                {data.events[0].name}
                            </div>
                            <CountdownTimer targetTime={data.events[0].time} />
                        </div>
                    </div>

                    <div className="pt-4 mt-4 border-t border-white/10 flex justify-between items-center text-[10px] uppercase font-bold text-slate-500">
                        <span>Economic Alert</span>
                        <TrendingUp size={14} className="text-emerald-500" />
                    </div>
                </Card>

                {/* Zone D: Live Feed */}
                <Card className="lg:col-span-3 p-4 bg-[#080808] border-white/5">
                    <div className="flex items-center justify-between mb-4 px-2">
                        <div className="flex items-center gap-2">
                            <AlertCircle size={18} className="text-emerald-500" />
                            <span className="font-black uppercase text-xs tracking-widest">Live Terminal Feed</span>
                        </div>
                        <div className="text-[10px] text-slate-600 font-mono">Real-time Data Stream</div>
                    </div>

                    <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                        {data.news.map((item) => (
                            <motion.div
                                key={item.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.05] transition-all group"
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-1 h-8 rounded-full ${item.impact === 'High' ? 'bg-red-500/50' : item.impact === 'Medium' ? 'bg-yellow-500/50' : 'bg-emerald-500/50'}`}></div>
                                    <div>
                                        <div className="text-sm font-bold text-slate-200 group-hover:text-emerald-400 transition-colors uppercase tracking-tight">
                                            {item.title}
                                        </div>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-black uppercase ${item.impact === 'High' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-500'}`}>
                                                {item.impact} IMPACT
                                            </span>
                                            <span className="text-[10px] text-slate-600 flex items-center gap-1 uppercase">
                                                <Clock size={10} /> {item.time}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <ChevronRight size={16} className="text-slate-700 group-hover:text-white transition-colors" />
                            </motion.div>
                        ))}
                    </div>
                </Card>
            </div>

            {/* Tagline Footer */}
            <div className="py-6 text-center">
                <motion.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    className="inline-flex items-center gap-3"
                >
                    <div className="h-px w-12 bg-gradient-to-r from-transparent to-emerald-500/50"></div>
                    <span className="text-lg font-black italic uppercase tracking-[0.2em] bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-white to-emerald-400">
                        Gardez toujours une longueur d'avance.
                    </span>
                    <div className="h-px w-12 bg-gradient-to-l from-transparent to-emerald-500/50"></div>
                </motion.div>
                <div className="mt-2">
                    <Rocket size={16} className="mx-auto text-emerald-500/30 animate-bounce" />
                </div>
            </div>
        </section>
    );
}
