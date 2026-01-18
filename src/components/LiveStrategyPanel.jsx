import React, { useState, useEffect } from 'react';
import { Card } from './ui/Card';
import { strategy } from '../services/api';
import { Activity, Zap, TrendingUp, Radio, AlertTriangle, ArrowRight } from 'lucide-react';

export default function LiveStrategyPanel({ symbol, onExecute }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let mounted = true;

        const fetchData = async () => {
            try {
                const res = await strategy.getConsensus(symbol);
                if (mounted) {
                    setData(res.data);
                    setLoading(false);
                }
            } catch (err) {
                console.error("Strategy Fetch Error", err);
                if (mounted) setError("Market data unavailable for analysis");
            }
        };

        fetchData();
        const interval = setInterval(fetchData, 5000); // Poll every 5s

        return () => {
            mounted = false;
            clearInterval(interval);
        };
    }, [symbol]);

    if (error) return (
        <Card className="p-4 border-red-500/30 bg-red-500/10 text-red-400 text-xs">
            {error}
        </Card>
    );

    if (loading || !data) return (
        <Card className="p-6 bg-slate-950 border-slate-800 animate-pulse min-h-[200px] flex items-center justify-center">
            <div className="text-slate-500 text-xs tracking-widest uppercase">Initializing Strategy Nexus...</div>
        </Card>
    );

    // Safe defaults for consensus, setup, and strategies
    const consensus = data?.consensus || { action: 'NEUTRAL', confidence: 50, score: 50 };
    const setup = data?.setup || { entry_price: 0, stop_loss: 0, take_profit: 0 };
    const strategies = data?.strategies || {};
    
    const isBullish = consensus?.action === 'BUY';
    const isBearish = consensus?.action === 'SELL';

    // Cyberpunk dynamic border color
    const borderColor = isBullish ? 'border-emerald-500/50' : isBearish ? 'border-red-500/50' : 'border-slate-500/50';
    const glowColor = isBullish ? 'shadow-[0_0_20px_-5px_rgba(16,185,129,0.3)]' : isBearish ? 'shadow-[0_0_20px_-5px_rgba(239,68,68,0.3)]' : '';
    const pulseAnimation = 'animate-[pulse_3s_ease-in-out_infinite]';

    return (
        <Card className={`relative overflow-hidden bg-slate-950/80 backdrop-blur-xl border ${borderColor} ${glowColor} ${pulseAnimation} transition-all duration-500`}>
            {/* Header */}
            <div className="p-4 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Zap size={16} className={`fill-current ${isBullish ? 'text-emerald-400' : isBearish ? 'text-red-400' : 'text-slate-400'}`} />
                    <h3 className="text-sm font-bold tracking-wider text-slate-100 uppercase">Strategy Nexus <span className="text-[10px] text-slate-500 ml-1">v2.0</span></h3>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-slate-400">
                    <Radio size={12} className="text-emerald-500 animate-ping" />
                    LIVE
                </div>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* 1. Main Consensus Gauge */}
                <div className="flex flex-col items-center justify-center text-center space-y-2">
                    <div className="relative w-32 h-32 flex items-center justify-center">
                        {/* CSS Arc visualization would go here, simplified for MVP as a ring */}
                        <div className={`absolute inset-0 rounded-full border-4 opacity-20 ${isBullish ? 'border-emerald-500' : 'border-red-500'}`}></div>
                        <div className={`absolute inset-0 rounded-full border-4 border-t-transparent border-l-transparent rotate-45 ${isBullish ? 'border-emerald-500' : isBearish ? 'border-red-500' : 'border-slate-600'}`}></div>

                        <div className="z-10 flex flex-col items-center">
                            <span className="text-xs text-slate-400 uppercase tracking-widest">Confidence</span>
                            <span className={`text-3xl font-black ${isBullish ? 'text-emerald-400' : isBearish ? 'text-red-400' : 'text-slate-200'}`}>
                                {consensus?.confidence || 50}%
                            </span>
                        </div>
                    </div>
                    <div className={`px-3 py-1 rounded text-xs font-bold uppercase ${isBullish ? 'bg-emerald-500/20 text-emerald-400' : isBearish ? 'bg-red-500/20 text-red-400' : 'bg-slate-800 text-slate-400'}`}>
                        {consensus?.action || 'NEUTRAL'}
                    </div>
                </div>

                {/* 2. Strategy Matrix */}
                <div className="space-y-3">
                    <h4 className="text-[10px] uppercase text-slate-500 font-bold mb-2">Signal Matrix</h4>
                    {Object.entries(strategies).map(([name, signal]) => (
                        <div key={name} className="flex items-center justify-between text-xs bg-white/5 p-2 rounded border border-white/5">
                            <span className="text-slate-300">{name}</span>
                            <div className="flex items-center gap-2">
                                <span className={`font-bold ${signal.direction === 'BUY' ? 'text-emerald-400' : signal.direction === 'SELL' ? 'text-red-400' : 'text-slate-500'}`}>
                                    {signal.direction}
                                </span>
                                <div className="w-12 h-1 bg-slate-800 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full ${signal.direction === 'BUY' ? 'bg-emerald-500' : 'bg-red-500'}`}
                                        style={{ width: `${signal.strength}%` }}
                                    ></div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* 3. Execution Zone */}
                <div className="flex flex-col justify-between bg-black/40 rounded-lg p-3 border border-white/5 relative overflow-hidden">
                    {/* Scanline effect */}
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-emerald-500/5 to-transparent pointer-events-none animate-[scan_2s_linear_infinite]" />

                    <div className="space-y-2 z-10">
                        <div className="flex justify-between text-xs">
                            <span className="text-slate-400">Entry Zone</span>
                            <span className="font-mono text-slate-200">{setup?.entry_price || '---'}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                            <span className="text-slate-400">Stop Loss</span>
                            <span className="font-mono text-red-400">{setup?.stop_loss || '---'}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                            <span className="text-slate-400">Take Profit</span>
                            <span className="font-mono text-emerald-400">{setup?.take_profit || '---'}</span>
                        </div>
                    </div>

                    <button
                        onClick={() => onExecute && onExecute((consensus?.action || 'neutral').toLowerCase(), setup)}
                        className={`mt-4 w-full py-2 flex items-center justify-center gap-2 rounded text-xs font-bold uppercase transition-all hover:scale-[1.02] active:scale-95
                            ${isBullish ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/50' :
                                isBearish ? 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-900/50' :
                                    'bg-slate-700 text-slate-400 cursor-not-allowed'}
                        `}
                        disabled={!consensus?.action || consensus?.action === 'NEUTRAL'}
                    >
                        <Zap size={14} />
                        Execute Setup
                    </button>
                </div>

            </div>

            {/* Logic explanation footer */}
            <div className="px-4 py-2 bg-black/20 text-[10px] text-slate-500 flex justify-between">
                <span>Aggregated from EMA, MACD, RSI, BB, News.</span>
                <span>System Latency: 12ms</span>
            </div>
        </Card>
    );
}
