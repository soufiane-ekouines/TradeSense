import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, TrendingUp, TrendingDown, Target, Wallet } from 'lucide-react';

export default function TradeConfirmationModal({ trade, onClose }) {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, 3500);
        return () => clearTimeout(timer);
    }, [onClose]);

    if (!trade) return null;

    const isProfit = trade.pnl >= 0;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ scale: 0.8, opacity: 0, y: 50 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.5, opacity: 0, transition: { duration: 0.2 } }}
                className="fixed bottom-10 left-10 z-[200] w-[320px]"
            >
                <div className={`relative overflow-hidden p-5 rounded-2xl border-2 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] ${isProfit ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-100' : 'bg-red-950/90 border-red-500/50 text-red-100'}`}>

                    {/* Background Glow */}
                    <div className={`absolute -top-10 -right-10 w-32 h-32 rounded-full blur-[60px] opacity-30 ${isProfit ? 'bg-emerald-400' : 'bg-red-400'}`}></div>

                    <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-2">
                            {isProfit ? <CheckCircle size={20} className="text-emerald-400" /> : <XCircle size={20} className="text-red-400" />}
                            <span className="font-black uppercase tracking-widest text-xs">Trade Closed</span>
                        </div>
                        <button onClick={onClose} className="hover:opacity-50 transition-opacity">
                            <XCircle size={14} />
                        </button>
                    </div>

                    <div className="space-y-4">
                        <div className="flex justify-between items-end">
                            <div>
                                <div className="text-[10px] uppercase opacity-60">Realized PnL</div>
                                <div className={`text-2xl font-black font-mono tracking-tighter ${isProfit ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {isProfit ? '+' : ''}{trade.pnl.toFixed(2)} USD
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-[10px] uppercase opacity-60">Symbol</div>
                                <div className="font-bold text-sm tracking-widest">{trade.symbol}</div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-3 border-t border-white/10 text-[11px]">
                            <div className="flex items-center gap-1.5 opacity-80">
                                <Target size={12} />
                                Exit: {trade.exitPrice.toFixed(2)}
                            </div>
                            <div className="flex justify-end items-center gap-1.5 opacity-80">
                                <Wallet size={12} />
                                New Equity: {trade.newEquity.toLocaleString()}
                            </div>
                        </div>

                        {/* Progress Bar Simulation */}
                        <div className="space-y-1 pt-2">
                            <div className="flex justify-between text-[9px] uppercase font-bold opacity-60">
                                <span>Challenge Progress</span>
                                <span>{trade.progress}%</span>
                            </div>
                            <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${trade.progress}%` }}
                                    className={`h-full ${isProfit ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]' : 'bg-red-500'}`}
                                ></motion.div>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
