import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import TradingChart from '../components/TradingChart';
import LiveStrategyPanel from '../components/LiveStrategyPanel';
import { challenges, trades, market } from '../services/api';
import { ArrowUpCircle, ArrowDownCircle, RefreshCw, Activity, AlertTriangle, CheckCircle, Shield, Loader2, Target, Share2, Lock, Trophy } from 'lucide-react';
import RiskAlertSystem from '../components/RiskAlertSystem';
import TradeConfirmationModal from '../components/TradeConfirmationModal';
import NewsHubSection from '../components/NewsHubSection';
import AccountStatusOverlay from '../components/AccountStatusOverlay';
import { motion, AnimatePresence } from 'framer-motion';

export default function Dashboard() {
    const [challenge, setChallenge] = useState(null);
    const [symbol, setSymbol] = useState('BTC-USD');
    const [ohlc, setOhlc] = useState([]);
    const [tradeHistory, setTradeHistory] = useState([]);
    const [currentPrice, setCurrentPrice] = useState(0);
    const [qty, setQty] = useState(1);
    const [loading, setLoading] = useState(true);
    const [executing, setExecuting] = useState(false);
    const [closingId, setClosingId] = useState(null);
    const [lastClosedTrade, setLastClosedTrade] = useState(null);
    const [chartLoading, setChartLoading] = useState(false);
    const [suggestedSide, setSuggestedSide] = useState(null);
    
    // Optimistic UI state
    const [optimisticTrades, setOptimisticTrades] = useState([]);
    const [watchdogStatus, setWatchdogStatus] = useState(null);
    const priceRef = useRef(currentPrice);
    
    // Live prices for all symbols (for PnL calculation)
    const [livePrices, setLivePrices] = useState({});
    
    // ========== SINGLE SOURCE OF TRUTH: Centralized Price State ==========
    const [lastPriceUpdate, setLastPriceUpdate] = useState(null); // Timestamp of last update
    const [priceSource, setPriceSource] = useState('waiting');    // 'live' | 'mock' | 'waiting'
    const [tickCandle, setTickCandle] = useState(null);          // Latest candle for chart
    // =====================================================================
    
    // ========== ACCOUNT STATUS STATE ==========
    const [accountStatus, setAccountStatus] = useState('active'); // 'active' | 'failed' | 'passed'
    const [isAccountLocked, setIsAccountLocked] = useState(false);
    const [accountMetrics, setAccountMetrics] = useState(null);
    const [showStatusOverlay, setShowStatusOverlay] = useState(true);
    // ==========================================
    
    // Keep ref in sync for instant access
    useEffect(() => {
        priceRef.current = currentPrice;
    }, [currentPrice]);

    const handleStrategyExecute = (side, setup) => {
        setSuggestedSide(side);
        // Optional: Pre-fill stop loss/take profit if we had those fields in the UI
        console.log("Strategy suggested:", side, setup);
    };

    // ========== PnL FORMATTING HELPER ==========
    // Returns formatted PnL text with proper sign and color class
    const formatPnL = (pnl) => {
        if (pnl === null || pnl === undefined || isNaN(pnl)) {
            return { text: '---', color: 'text-slate-400' };
        }
        const text = (pnl >= 0 ? '+' : '') + pnl.toLocaleString(undefined, { 
            minimumFractionDigits: 2, 
            maximumFractionDigits: 2 
        });
        const color = pnl >= 0 ? 'text-emerald-500' : 'text-red-500';
        return { text, color };
    };
    // ============================================

    // PnL Calculation (useMemo to ensure Hooks consistency)
    // Returns both position data AND pre-computed display data for trades
    const { positions: activePositionsMap, tradeAnalytics, displayTrades } = React.useMemo(() => {
        const positions = {};
        const tradeAnalytics = {}; // { [tradeId]: { pnl, entryPrice, type: 'open'|'close' } }

        if (!tradeHistory || tradeHistory.length === 0) {
            return { positions, tradeAnalytics, displayTrades: [] };
        }

        const sortedTrades = [...tradeHistory].sort((a, b) => new Date(a.time) - new Date(b.time));

        sortedTrades.forEach(t => {
            if (!positions[t.symbol]) positions[t.symbol] = { qty: 0, avgEntry: 0 };

            const pos = positions[t.symbol];
            const isBuy = t.side === 'buy';
            const quantity = t.qty;
            const price = t.price;

            // Determine if this trade opens or closes a position
            // FLAT (qty=0): Any trade is OPENING
            // LONG (qty>0): BUY adds to position (OPENING), SELL closes (CLOSING)
            // SHORT (qty<0): SELL adds to position (OPENING), BUY closes (CLOSING)
            const isFlat = Math.abs(pos.qty) < 0.000001;
            const isLong = pos.qty > 0;
            const isShort = pos.qty < 0;
            
            const isOpening = isFlat || (isLong && isBuy) || (isShort && !isBuy);

            if (isOpening) {
                // Opening or adding to position
                const signedQty = isBuy ? quantity : -quantity;
                const totalVal = Math.abs(pos.qty * pos.avgEntry) + (quantity * price);
                const newQty = pos.qty + signedQty;
                pos.avgEntry = Math.abs(newQty) > 0.000001 ? totalVal / Math.abs(newQty) : price;
                pos.qty = newQty;
                tradeAnalytics[t.id] = { type: 'open', pnl: null, entryPrice: price };
            } else {
                // Closing position (partial or full)
                // PnL: For LONG closed by SELL -> (exit - entry) * qty
                //      For SHORT closed by BUY -> (entry - exit) * |qty|
                const pnl = isLong 
                    ? (price - pos.avgEntry) * quantity 
                    : (pos.avgEntry - price) * quantity;
                tradeAnalytics[t.id] = { type: 'close', pnl: pnl, entryPrice: pos.avgEntry };

                const signedQty = isBuy ? quantity : -quantity;
                pos.qty += signedQty;
                if (Math.abs(pos.qty) < 0.000001) {
                    pos.qty = 0;
                    pos.avgEntry = 0;
                }
            }
        });

        // Pre-compute display data for CLOSED trades only (completed round-trips)
        // Opening trades are shown in Open Positions, closing trades show in Recent Trades
        const displayTrades = [...tradeHistory]
            .sort((a, b) => new Date(b.time) - new Date(a.time))
            .map(t => {
                const analysis = tradeAnalytics[t.id];
                return {
                    ...t,
                    isClose: analysis?.type === 'close',
                    realizedPnl: analysis?.pnl ?? null,
                    entryPrice: analysis?.entryPrice ?? null
                };
            })
            .filter(t => t.isClose); // Only show closed trades with realized PnL

        return { positions, tradeAnalytics, displayTrades };
    }, [tradeHistory]);

    // Symbols List
    const symbols = [
        { id: 'BTC-USD', name: 'Bitcoin' },
        { id: 'AAPL', name: 'Apple' },
        { id: 'TSLA', name: 'Tesla' },
        { id: 'IAM', name: 'Maroc Telecom' },
        { id: 'ATW', name: 'Attijariwafa Bank' },
    ];

    const fetchChallengeData = useCallback(async () => {
        try {
            const { data } = await challenges.getActive();
            // API returns {challenge: ...} so extract the actual challenge object
            const challengeData = data?.challenge || data;
            setChallenge(challengeData);
            if (challengeData?.id) {
                const history = await trades.getHistory(challengeData.id);
                setTradeHistory(history.data || []);
                
                // IMPORTANT: Immediately show overlay for failed/passed challenges on load
                if (challengeData.status === 'failed') {
                    console.log('🚨 Challenge FAILED - Showing overlay');
                    setAccountStatus('failed');
                    setIsAccountLocked(true);
                    setShowStatusOverlay(true);
                    setAccountMetrics({
                        initial_balance: challengeData.start_balance,
                        current_equity: challengeData.equity,
                        profit: challengeData.equity - challengeData.start_balance,
                        profit_pct: ((challengeData.equity - challengeData.start_balance) / challengeData.start_balance) * 100,
                        total_drawdown_pct: ((challengeData.start_balance - challengeData.equity) / challengeData.start_balance) * 100
                    });
                } else if (challengeData.status === 'passed') {
                    console.log('🏆 Challenge PASSED - Showing overlay');
                    setAccountStatus('passed');
                    setIsAccountLocked(false);
                    setShowStatusOverlay(true);
                    setAccountMetrics({
                        initial_balance: challengeData.start_balance,
                        current_equity: challengeData.equity,
                        profit: challengeData.equity - challengeData.start_balance,
                        profit_pct: ((challengeData.equity - challengeData.start_balance) / challengeData.start_balance) * 100,
                        profit_progress_pct: 100
                    });
                }
            }
        } catch (err) {
            console.error('Failed to load challenge', err);
        } finally {
            setLoading(false);
        }
    }, []);

    // ========== ACCOUNT VALIDATION FUNCTION ==========
    // Checks if account has won (passed profit target) or lost (hit drawdown limit)
    const validateAccountStatus = useCallback(async () => {
        if (!challenge?.id) return;
        
        try {
            // Calculate current equity based on live prices
            const startBalance = challenge.start_balance || 100000;
            const currentEquity = challenge.equity || startBalance;
            
            // Calculate unrealized PnL from open positions
            let unrealizedPnL = 0;
            Object.entries(activePositionsMap).forEach(([sym, pos]) => {
                if (Math.abs(pos.qty) > 0.000001) {
                    const livePrice = livePrices[sym] || 0;
                    if (livePrice > 0 && pos.avgEntry > 0) {
                        // PnL = (current - entry) * qty (handles both long/short)
                        unrealizedPnL += (livePrice - pos.avgEntry) * pos.qty;
                    }
                }
            });
            
            const liveEquity = currentEquity + unrealizedPnL;
            const profitPct = ((liveEquity - startBalance) / startBalance) * 100;
            const drawdownPct = ((startBalance - Math.min(liveEquity, startBalance)) / startBalance) * 100;
            
            console.log(`[ACCOUNT CHECK] Equity: $${liveEquity.toFixed(2)} | Profit: ${profitPct.toFixed(2)}% | Drawdown: ${drawdownPct.toFixed(2)}%`);
            
            // WIN CONDITION: Profit target reached (e.g., +10% for Phase 1)
            const profitTarget = challenge.profit_target_pct || 10;
            if (profitPct >= profitTarget && accountStatus !== 'passed') {
                console.log('🏆 PROFIT TARGET REACHED! Challenge PASSED!');
                setAccountStatus('passed');
                setIsAccountLocked(false);
                setShowStatusOverlay(true);
                setAccountMetrics({
                    equity: liveEquity,
                    profit_pct: profitPct,
                    drawdown_pct: drawdownPct,
                    reason: `Profit target of ${profitTarget}% reached!`
                });
                return;
            }
            
            // LOSE CONDITION: Max drawdown breached (e.g., -10%)
            const maxDrawdown = challenge.max_drawdown_pct || 10;
            if (drawdownPct >= maxDrawdown && accountStatus !== 'failed') {
                console.log('🚨 MAX DRAWDOWN BREACHED! Challenge FAILED!');
                setAccountStatus('failed');
                setIsAccountLocked(true);
                setShowStatusOverlay(true);
                setAccountMetrics({
                    equity: liveEquity,
                    profit_pct: profitPct,
                    drawdown_pct: drawdownPct,
                    reason: `Maximum drawdown of ${maxDrawdown}% breached`
                });
                return;
            }
            
            // Update watchdog warnings if approaching limits
            const warnings = [];
            if (drawdownPct >= maxDrawdown * 0.7) {
                warnings.push(`⚠️ Drawdown at ${drawdownPct.toFixed(1)}% (limit: ${maxDrawdown}%)`);
            }
            if (profitPct >= profitTarget * 0.8) {
                warnings.push(`🎯 Close to target: ${profitPct.toFixed(1)}% (target: ${profitTarget}%)`);
            }
            
            if (warnings.length > 0) {
                setWatchdogStatus({
                    warnings,
                    danger_level: (drawdownPct / maxDrawdown) * 100
                });
            }
            
            // Also call backend validation for persistence
            const { data } = await trades.validateAccount(challenge.id, livePrices);
            if (data.status === 'failed' || data.status === 'passed') {
                setAccountStatus(data.status);
                setIsAccountLocked(data.is_locked);
                setAccountMetrics(data.metrics);
                setShowStatusOverlay(true);
            }
        } catch (err) {
            console.error('Account validation error', err);
        }
    }, [challenge, livePrices, activePositionsMap, accountStatus]);
    // ================================================

    const fetchMarketData = useCallback(async (silent = false) => {
        if (!silent) setChartLoading(true);
        try {
            // Get Candles
            const { data: candlesData } = await market.getSeries(symbol);
            
            // Handle both array and object response formats
            const candles = Array.isArray(candlesData) ? candlesData : (candlesData?.candles || []);
            console.log('Chart Data Received:', candles.length, 'candles for', symbol);
            
            setOhlc(candles);

            // Sync Header Price with Latest Candle
            if (candles && candles.length > 0) {
                const latest = candles[candles.length - 1];
                setCurrentPrice(latest.close);
            } else {
                // Fallback if no candles
                const { data: quote } = await market.getQuote(symbol);
                if (quote.price) setCurrentPrice(quote.price);
            }
        } catch (err) {
            console.error('Market data error', err);
        } finally {
            if (!silent) setChartLoading(false);
        }
    }, [symbol]);

    // Initial Load
    useEffect(() => {
        fetchChallengeData();
        fetchMarketData(false);
    }, [fetchChallengeData, fetchMarketData]);

    // ========== REAL-TIME ACCOUNT VALIDATION ==========
    // Validate account status on every price update (throttled)
    useEffect(() => {
        if (!challenge?.id || accountStatus === 'failed') return;
        
        // Throttle validation to every 2 seconds
        const validationInterval = setInterval(() => {
            validateAccountStatus();
        }, 2000);
        
        return () => clearInterval(validationInterval);
    }, [challenge?.id, accountStatus, validateAccountStatus]);
    // ==================================================

    // Polling for challenge status only (price is handled by SSoT useEffect)
    useEffect(() => {
        // Challenge status polling (every 15s for equity sync)
        const challengeInterval = setInterval(() => {
            fetchChallengeData();
        }, 15000);

        return () => {
            clearInterval(challengeInterval);
        };
    }, [fetchChallengeData]);

    // ========== SINGLE SOURCE OF TRUTH: Centralized Price Polling ==========
    // This is THE ONLY place that fetches prices - uses candle.close to match chart
    useEffect(() => {
        const fetchCentralizedPrice = async () => {
            try {
                // Fetch current symbol's tick (for chart + header)
                const { data } = await market.getTick(symbol);
                
                if (data?.candle) {
                    const now = new Date();
                    
                    // ========== USE CANDLE CLOSE AS THE PRICE (matches chart) ==========
                    const chartPrice = data.candle.close;
                    
                    // Update currentPrice (Single Source of Truth - same as chart)
                    setCurrentPrice(chartPrice);
                    priceRef.current = chartPrice;
                    
                    // Update livePrices for the current symbol (for PnL calculation)
                    setLivePrices(prev => ({ ...prev, [symbol]: chartPrice }));
                    
                    // Update metadata
                    setLastPriceUpdate(now);
                    setPriceSource(data.source || 'live');
                    
                    // Ensure time is a Unix timestamp (seconds), not an object
                    const candleTime = typeof data.candle.time === 'number' 
                        ? data.candle.time 
                        : Math.floor(Date.now() / 1000);
                    
                    // Update candle for chart
                    setTickCandle({
                        time: candleTime,
                        open: data.candle.open,
                        high: data.candle.high,
                        low: data.candle.low,
                        close: chartPrice,
                        is_new: data.candle.is_new
                    });
                    
                    console.log(`[PRICE SSoT] ${symbol}: $${chartPrice.toFixed(2)} (${data.source}) - CANDLE CLOSE`);
                }
            } catch (err) {
                console.error('[PRICE SSoT] Tick fetch error:', err);
            }
        };
        
        // Initial fetch
        fetchCentralizedPrice();
        
        // Poll every 3 seconds (centralized)
        const priceInterval = setInterval(fetchCentralizedPrice, 3000);
        
        return () => clearInterval(priceInterval);
    }, [symbol]);
    
    // Fetch prices for OTHER open positions (not the selected symbol)
    useEffect(() => {
        const positionSymbols = Object.keys(activePositionsMap).filter(
            sym => Math.abs(activePositionsMap[sym]?.qty || 0) > 0.000001 && sym !== symbol
        );
        
        if (positionSymbols.length === 0) return;
        
        const fetchOtherPrices = async () => {
            for (const sym of positionSymbols) {
                try {
                    const { data } = await market.getQuote(sym);
                    if (data?.price && data.price > 0) {
                        setLivePrices(prev => ({ ...prev, [sym]: data.price }));
                    }
                } catch (err) {
                    console.error(`[PRICE SSoT] Failed to fetch ${sym}:`, err);
                }
            }
        };
        
        fetchOtherPrices();
        const interval = setInterval(fetchOtherPrices, 5000);
        
        return () => clearInterval(interval);
    }, [activePositionsMap, symbol]);


    const handleTrade = async (side) => {
        if (!challenge || executing) return;
        setExecuting(true);
        
        // ========== OPTIMISTIC UI: Create temporary trade ===========
        const tempId = `temp_${Date.now()}`;
        const optimisticTrade = {
            id: tempId,
            symbol,
            side,
            qty,
            price: priceRef.current,
            time: new Date().toISOString(),
            _optimistic: true
        };
        
        // Instantly add to UI (no wait for server)
        setOptimisticTrades(prev => [optimisticTrade, ...prev]);
        setTradeHistory(prev => [optimisticTrade, ...prev]);
        
        // Optimistic equity adjustment (commission deduction)
        const commission = qty * priceRef.current * 0.001;
        setChallenge(prev => prev ? { 
            ...prev, 
            equity: prev.equity - commission 
        } : prev);
        // ===========================================================
        
        try {
            const { data: result } = await trades.place({
                challenge_id: challenge.id,
                symbol,
                side,
                qty,
                current_price: priceRef.current
            });

            // Replace optimistic trade with real trade
            const realTrade = result.trade;
            setOptimisticTrades(prev => prev.filter(t => t.id !== tempId));
            setTradeHistory(prev => [
                realTrade,
                ...prev.filter(t => t.id !== tempId)
            ]);
            
            // Update with server equity
            setChallenge(prev => ({ 
                ...prev, 
                equity: result.equity?.equity || result.new_equity,
                status: result.status 
            }));
            
            // Handle watchdog warnings
            if (result.watchdog?.warnings?.length > 0) {
                setWatchdogStatus(result.watchdog);
            }

        } catch (err) {
            console.error("Trade Error", err);
            // ROLLBACK: Remove optimistic trade on error
            setOptimisticTrades(prev => prev.filter(t => t.id !== tempId));
            setTradeHistory(prev => prev.filter(t => t.id !== tempId));
            // Restore equity
            setChallenge(prev => prev ? {
                ...prev,
                equity: prev.equity + commission
            } : prev);
            
            // ========== ACCOUNT VIOLATION HANDLER ===========
            const errorMsg = err.response?.data?.error || '';
            if (err.response?.status === 403 && errorMsg.includes('violation')) {
                // Account failed - show dramatic overlay
                setAccountStatus('failed');
                setIsAccountLocked(true);
                setShowStatusOverlay(true);
                // Refresh challenge to get accurate metrics
                fetchChallengeData();
            }
            // =================================================
        } finally {
            setExecuting(false);
        }
    };

    const handleClosePosition = async (sym, qty, avgEntry) => {
        if (!challenge || closingId) return;
        setClosingId(sym);
        const side = qty > 0 ? 'sell' : 'buy';
        const closePrice = sym === symbol ? priceRef.current : avgEntry;
        
        // ========== OPTIMISTIC UI: Remove position instantly ===========
        const tempId = `close_${Date.now()}`;
        const optimisticClose = {
            id: tempId,
            symbol: sym,
            side,
            qty: Math.abs(qty),
            price: closePrice,
            time: new Date().toISOString(),
            _optimistic: true,
            _isClose: true
        };
        
        // Instantly show closing trade
        setOptimisticTrades(prev => [optimisticClose, ...prev]);
        setTradeHistory(prev => [optimisticClose, ...prev]);
        
        // Calculate expected PnL for instant feedback
        const expectedPnl = (closePrice - avgEntry) * Math.abs(qty) * (qty > 0 ? 1 : -1);
        const optimisticEquity = challenge.equity + expectedPnl;
        
        // Show expected result immediately
        setChallenge(prev => prev ? { ...prev, equity: optimisticEquity } : prev);
        // =============================================================

        try {
            const { data: result } = await trades.place({
                challenge_id: challenge.id,
                symbol: sym,
                side,
                qty: Math.abs(qty),
                current_price: closePrice
            });

            // Replace optimistic trade with real trade
            const realTrade = result.trade;
            setOptimisticTrades(prev => prev.filter(t => t.id !== tempId));
            setTradeHistory(prev => [
                realTrade,
                ...prev.filter(t => t.id !== tempId)
            ]);
            
            // Update with server equity
            const serverEquity = result.equity?.equity || result.new_equity;
            setChallenge(prev => ({ 
                ...prev, 
                equity: serverEquity,
                status: result.status 
            }));

            // Show confirmation modal with actual results
            const actualPnl = (realTrade.price - avgEntry) * Math.abs(qty) * (qty > 0 ? 1 : -1);
            setLastClosedTrade({
                symbol: sym,
                pnl: actualPnl,
                exitPrice: realTrade.price,
                newEquity: serverEquity,
                progress: Math.min(100, Math.max(0, ((serverEquity - challenge.start_balance) / (challenge.start_balance * 0.1)) * 100))
            });
            
            // Handle watchdog
            if (result.watchdog?.warnings?.length > 0) {
                setWatchdogStatus(result.watchdog);
            }
        } catch (err) {
            console.error("Close Error", err);
            // ROLLBACK: Remove optimistic close on error
            setOptimisticTrades(prev => prev.filter(t => t.id !== tempId));
            setTradeHistory(prev => prev.filter(t => t.id !== tempId));
            // Restore equity
            setChallenge(prev => prev ? {
                ...prev,
                equity: challenge.equity
            } : prev);
            
            // ========== ACCOUNT VIOLATION HANDLER ===========
            const errorMsg = err.response?.data?.error || '';
            if (err.response?.status === 403 && errorMsg.includes('violation')) {
                // Account failed - show dramatic overlay
                setAccountStatus('failed');
                setIsAccountLocked(true);
                setShowStatusOverlay(true);
                // Refresh challenge to get accurate metrics
                fetchChallengeData();
            }
            // =================================================
        } finally {
            setClosingId(null);
        }
    };

    const handleShareStrategy = async () => {
        try {
            const token = localStorage.getItem('token');
            const formData = new FormData();
            formData.append('symbol', symbol);
            formData.append('description', `Intelligence suggested ${suggestedSide || 'market view'} on ${symbol} with current price ${currentPrice}`);
            formData.append('config_json', JSON.stringify({ symbol, price: currentPrice, side: suggestedSide }));

            await axios.post(`${import.meta.env.VITE_API_URL}/v1/community/strategies`, formData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });

            // Redirect to community hub
            window.location.href = '/community-hub?shared=true';
        } catch (err) {
            console.error("Share Strategy Error", err);
            alert("Failed to share strategy. Please try again.");
        }
    };

    if (loading) return <div className="p-8 text-center">Loading Terminal...</div>;

    if (!challenge) {
        return (
            <div className="p-12 text-center space-y-4">
                <h2 className="text-2xl font-bold">No Active Challenge</h2>
                <p className="text-slate-400">You need to purchase a challenge to start trading.</p>
                <Button onClick={() => window.location.href = '/#pricing'}>View Plans</Button>
            </div>
        );
    }

    const startBal = challenge?.start_balance || 0;
    const equity = challenge?.equity || 0;
    const pnl = equity - startBal;
    const pnlPct = startBal > 0 ? (pnl / startBal) * 100 : 0;

    // Determine if trading is allowed
    const canTrade = !isAccountLocked && challenge?.status === 'active';

    return (
        <>
            {/* ========== ACCOUNT STATUS OVERLAY (OUTSIDE MAIN CONTAINER) ========== */}
            {showStatusOverlay && (accountStatus === 'failed' || accountStatus === 'passed') && (
                <AccountStatusOverlay
                    status={accountStatus}
                    metrics={accountMetrics || {
                        initial_balance: startBal,
                        current_equity: equity,
                        profit: pnl,
                        profit_pct: pnlPct
                    }}
                    onDismiss={accountStatus === 'passed' ? () => setShowStatusOverlay(false) : null}
                />
            )}
            {/* ===================================================================== */}

            <div className="p-4 md:p-6 space-y-6 max-w-[1600px] mx-auto relative overflow-hidden">

            {/* Success Notifications & Modals */}
            <TradeConfirmationModal
                trade={lastClosedTrade}
                onClose={() => setLastClosedTrade(null)}
            />

            {/* Risk Sentinel Background System */}
            <RiskAlertSystem
                challengeId={challenge.id}
                onPanicSuccess={() => {
                    fetchChallengeData();
                }}
            />

            {/* ========== INLINE STATUS BANNER (for passed accounts) ========== */}
            {accountStatus === 'passed' && !showStatusOverlay && (
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gradient-to-r from-emerald-600 to-emerald-500 rounded-lg p-4 flex items-center justify-between"
                >
                    <div className="flex items-center gap-3">
                        <Trophy size={24} className="text-white" />
                        <span className="font-bold text-white text-lg">Compte RÉUSSI - Objectif de 10% Atteint !</span>
                    </div>
                    <button
                        onClick={() => window.location.href = '/leaderboard'}
                        className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-white font-semibold transition-all"
                    >
                        Voir Classement
                    </button>
                </motion.div>
            )}
            {/* ================================================================ */}

            {/* Header Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className={`p-4 flex items-center justify-between ${
                    accountStatus === 'failed' ? 'border-red-500/50 bg-red-950/20' :
                    accountStatus === 'passed' ? 'border-emerald-500/50 bg-emerald-950/20' : ''
                }`}>
                    <div>
                        <div className="text-slate-400 text-xs uppercase font-bold">Status</div>
                        <div className={`text-lg font-bold uppercase flex items-center gap-2 ${
                            accountStatus === 'active' ? 'text-primary-500' : 
                            accountStatus === 'passed' ? 'text-emerald-500' : 'text-red-500'
                        }`}>
                            {accountStatus === 'failed' && <Lock size={16} />}
                            {accountStatus === 'passed' && <Trophy size={16} />}
                            {accountStatus}
                        </div>
                    </div>
                    <Activity size={24} className="text-slate-600" />
                </Card>
                <Card className="p-4">
                    <div className="text-slate-400 text-xs uppercase font-bold">Equity</div>
                    <div className="text-2xl font-bold font-mono">
                        {(equity || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} <span className="text-sm text-slate-500">DH</span>
                    </div>
                </Card>
                <Card className="p-4">
                    <div className="text-slate-400 text-xs uppercase font-bold">Balance</div>
                    <div className="text-xl font-bold text-slate-300">
                        {(startBal || 0).toLocaleString()} <span className="text-sm text-slate-600">DH</span>
                    </div>
                </Card>
                <Card className="p-4">
                    <div className="text-slate-400 text-xs uppercase font-bold">Total PnL</div>
                    <div className={`text-2xl font-bold ${pnl >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                        {pnl >= 0 ? '+' : ''}{(pnlPct || 0).toFixed(2)}%
                    </div>
                </Card>
            </div>

            {/* Strategy Nexus HUD */}
            <div className="mb-2">
                <LiveStrategyPanel symbol={symbol} onExecute={handleStrategyExecute} />
            </div>

            {/* Main Workspace */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left: Chart & Control */}
                <div className="lg:col-span-2 space-y-6">
                    <Card className="p-4 flex items-center gap-4 bg-slate-900/80 sticky top-[72px] z-10 backdrop-blur">
                        <select
                            className="bg-slate-800 border border-slate-700 rounded px-3 py-1.5 focus:outline-none focus:border-primary-500"
                            value={symbol}
                            onChange={(e) => setSymbol(e.target.value)}
                        >
                            {symbols.map(s => <option key={s.id} value={s.id}>{s.name} ({s.id})</option>)}
                        </select>
                        {/* ========== PRICE DISPLAY (Single Source of Truth) ========== */}
                        <div className="text-xl font-mono font-bold flex items-center gap-2">
                            <span className={`transition-colors duration-200 ${currentPrice > (livePrices[symbol + '_prev'] || currentPrice) ? 'text-emerald-400' : currentPrice < (livePrices[symbol + '_prev'] || currentPrice) ? 'text-red-400' : 'text-white'}`}>
                                {currentPrice ? currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '---'}
                            </span>
                            <span className="text-xs text-slate-500">
                                {symbol.includes('BTC') || symbol.includes('ETH') ? 'USD' : symbol.includes('IAM') || symbol.includes('ATW') ? 'MAD' : 'USD'}
                            </span>
                        </div>
                        {/* Last Update Timestamp + Source Badge */}
                        <div className="flex items-center gap-2 text-xs">
                            <span className="text-slate-500">Last:</span>
                            <span className="text-slate-400 font-mono">
                                {lastPriceUpdate ? lastPriceUpdate.toLocaleTimeString() : '--:--:--'}
                            </span>
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                priceSource === 'live' ? 'bg-emerald-500/20 text-emerald-400' : 
                                priceSource === 'mock' ? 'bg-amber-500/20 text-amber-400' : 
                                'bg-slate-500/20 text-slate-400'
                            }`}>
                                {priceSource?.toUpperCase() || 'WAITING'}
                            </span>
                        </div>
                        <Button
                            variant="secondary"
                            size="sm"
                            className="hidden md:flex gap-2 border-primary-500/30 text-primary-500 hover:bg-primary-500/10"
                            onClick={handleShareStrategy}
                        >
                            <Share2 size={16} />
                            Share Alpha
                        </Button>
                        <div className="text-xs text-slate-500 flex items-center gap-1 ml-auto">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            Live Connection
                        </div>
                    </Card>

                    <Card className="p-1 overflow-hidden min-h-[400px] relative">
                        {chartLoading && (
                            <div className="absolute inset-0 z-10 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center">
                                <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                            </div>
                        )}
                        <TradingChart 
                            data={ohlc} 
                            symbol={symbol} 
                            tickCandle={tickCandle}
                            currentPrice={currentPrice}
                            priceSource={priceSource}
                            lastPriceUpdate={lastPriceUpdate}
                        />
                    </Card>
                </div>

                {/* Right: Order Entry & Signals */}
                <div className="space-y-6">
                    {/* Order Panel */}
                    <Card className={`p-6 space-y-6 ${isAccountLocked ? 'opacity-60 pointer-events-none' : ''}`}>
                        <div className="flex items-center justify-between">
                            <h3 className="font-bold">Order Entry</h3>
                            <span className={`text-xs px-2 py-0.5 rounded ${isAccountLocked ? 'bg-red-900 text-red-400' : 'bg-slate-800 text-slate-400'}`}>
                                {isAccountLocked ? 'LOCKED' : 'Market'}
                            </span>
                        </div>

                        {/* Lock Warning */}
                        {isAccountLocked && (
                            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                                <Lock size={18} className="text-red-500" />
                                <span className="text-red-400 text-sm font-semibold">Trading désactivé - Compte échoué</span>
                            </div>
                        )}

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs text-slate-400 block mb-1">Quantity</label>
                                <input
                                    type="number"
                                    value={qty}
                                    onChange={(e) => setQty(Number(e.target.value))}
                                    disabled={isAccountLocked}
                                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 font-mono disabled:opacity-50"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    disabled={executing || !canTrade}
                                    onClick={() => handleTrade('sell')}
                                    className={`
                                        relative overflow-hidden p-4 rounded-lg flex flex-col items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed border
                                        ${isAccountLocked 
                                            ? 'bg-slate-800 border-slate-700 text-slate-500'
                                            : suggestedSide === 'sell'
                                                ? 'bg-red-500 text-white border-red-400 shadow-[0_0_15px_rgba(239,68,68,0.5)] ring-2 ring-white scale-105'
                                                : 'bg-red-500/10 hover:bg-red-500/20 text-red-500 border-red-500/50'}
                                        ${executing ? 'bg-slate-800 border-slate-700 opacity-80' : ''}
                                    `}
                                >
                                    {isAccountLocked ? <Lock size={20} /> : executing ? <Loader2 className="animate-spin" /> : <ArrowDownCircle />}
                                    <span className="font-bold">{isAccountLocked ? 'LOCKED' : executing ? 'PROCESSING' : 'SELL'}</span>
                                </button>
                                <button
                                    disabled={executing || !canTrade}
                                    onClick={() => handleTrade('buy')}
                                    className={`
                                        relative overflow-hidden p-4 rounded-lg flex flex-col items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed border
                                        ${isAccountLocked
                                            ? 'bg-slate-800 border-slate-700 text-slate-500'
                                            : suggestedSide === 'buy'
                                                ? 'bg-emerald-500 text-white border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.5)] ring-2 ring-white scale-105'
                                                : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border-emerald-500/50'}
                                        ${executing ? 'bg-slate-800 border-slate-700 opacity-80' : ''}
                                    `}
                                >
                                    {isAccountLocked ? <Lock size={20} /> : executing ? <Loader2 className="animate-spin" /> : <ArrowUpCircle />}
                                    <span className="font-bold">{isAccountLocked ? 'LOCKED' : executing ? 'PROCESSING' : 'BUY'}</span>
                                </button>
                            </div>
                        </div>

                        {accountStatus === 'failed' && (
                            <div className="p-3 bg-red-500 text-white rounded text-center text-sm font-bold flex items-center justify-center gap-2">
                                <Lock size={16} />
                                COMPTE ÉCHOUÉ - TRADING DÉSACTIVÉ
                            </div>
                        )}
                        {accountStatus === 'passed' && (
                            <div className="p-3 bg-emerald-500 text-white rounded text-center text-sm font-bold flex items-center justify-center gap-2">
                                <Trophy size={16} />
                                COMPTE RÉUSSI - OBJECTIF ATTEINT
                            </div>
                        )}
                    </Card>

                    {/* AI Signals */}
                    <Card className="p-6 bg-gradient-to-br from-slate-900 to-indigo-950/30 border-indigo-500/20">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="p-1.5 bg-indigo-500 rounded text-white"><Activity size={16} /></div>
                            <h3 className="font-bold text-indigo-100">AI Signal</h3>
                        </div>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-400">{symbol} Bias</span>
                                <span className="font-bold text-emerald-400">BULLISH</span>
                            </div>
                            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full w-[70%] bg-emerald-500"></div>
                            </div>
                            <div className="text-xs text-slate-500">
                                Confidence: 70% based on EMA crossover and RSI.
                            </div>
                        </div>
                    </Card>

                    {/* Rules */}
                    <Card className="p-4 space-y-3 bg-slate-900 shadow-[inset_0_0_20px_rgba(0,0,0,0.4)]">
                        <div className="flex items-center justify-between mb-1">
                            <h4 className="text-sm font-bold text-slate-400">Security Layers</h4>
                            <Shield size={14} className="text-primary-500" />
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-300">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                            <span>Anti-Drawdown Lock (10%)</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-300">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                            <span>Daily Equity Stop (5%)</span>
                        </div>
                        <div className="mt-2 text-[10px] text-slate-500 leading-tight">
                            Risk Sentinel is active and monitoring your margin.
                        </div>
                    </Card>
                </div>
            </div>

            {/* Open Positions */}
            <Card className="overflow-hidden">
                <div className="p-4 border-b border-slate-800 font-bold flex justify-between items-center">
                    <span>Open Positions</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-950 text-slate-400">
                            <tr>
                                <th className="px-4 py-2">Symbol</th>
                                <th className="px-4 py-2">Net Qty</th>
                                <th className="px-4 py-2">Avg Entry</th>
                                <th className="px-4 py-2">Live PnL</th>
                                <th className="px-4 py-2 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {(() => {
                                const activePositions = Object.entries(activePositionsMap)
                                    .filter(([_, data]) => Math.abs(data.qty) > 0.000001)
                                    .map(([sym, data]) => ({ sym, ...data }));

                                if (activePositions.length === 0) {
                                    return <tr><td colSpan="5" className="px-4 py-8 text-center text-slate-500">No open positions.</td></tr>;
                                }

                                return activePositions.map(({ sym, qty, avgEntry }) => {
                                    // ========== LIVE PnL CALCULATION (Single Source of Truth) ==========
                                    // Get price from livePrices (SSoT) - includes current symbol from centralized polling
                                    const livePrice = livePrices[sym] || null;
                                    
                                    let livePnl = null;
                                    let pnlFormatted = { text: '---', color: 'text-slate-400' };
                                    
                                    // Validate inputs before calculation
                                    if (!avgEntry || avgEntry <= 0) {
                                        pnlFormatted = { text: 'Loading...', color: 'text-yellow-500' };
                                    } else if (livePrice && livePrice > 0) {
                                        // PnL Formula:
                                        // LONG (qty > 0):  PnL = (currentPrice - entryPrice) * quantity
                                        // SHORT (qty < 0): PnL = (entryPrice - currentPrice) * |quantity|
                                        // Since qty is signed, formula simplifies to: (current - entry) * qty
                                        livePnl = (livePrice - avgEntry) * qty;
                                        pnlFormatted = formatPnL(livePnl);
                                    }
                                    // =====================================================================

                                    return (
                                        <tr key={sym} className="hover:bg-white/5">
                                            <td className="px-4 py-2 font-medium">{sym}</td>
                                            <td className={`px-4 py-2 font-mono font-bold ${qty > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                {qty > 0 ? '+' : ''}{(qty || 0).toFixed(4)}
                                            </td>
                                            <td className="px-4 py-2 text-slate-400">
                                                ${(avgEntry || 0).toFixed(2)}
                                            </td>
                                            <td className={`px-4 py-2 font-semibold font-mono ${pnlFormatted.color}`}>
                                                {pnlFormatted.text} {!livePrice && <span className="text-xs text-slate-600">(Waiting...)</span>}
                                            </td>
                                            <td className="px-4 py-2 text-right relative">
                                                {livePnl && livePnl > 0 && sym === closingId && (
                                                    <motion.div
                                                        initial={{ opacity: 0, scale: 0.5 }}
                                                        animate={{ opacity: 1, scale: 1.5 }}
                                                        className="absolute inset-0 flex items-center justify-center pointer-events-none"
                                                    >
                                                        <div className="w-1 h-1 bg-emerald-400 rounded-full animate-ping"></div>
                                                    </motion.div>
                                                )}
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    disabled={closingId === sym}
                                                    className="h-8 text-xs border-red-500/50 text-red-400 hover:bg-red-500/10 min-w-[120px]"
                                                    onClick={() => handleClosePosition(sym, qty, avgEntry)}
                                                >
                                                    {closingId === sym ? (
                                                        <Loader2 className="animate-spin h-3 w-3 mr-1" />
                                                    ) : null}
                                                    {closingId === sym ? 'Closing...' : 'Close Position'}
                                                </Button>
                                            </td>
                                        </tr>
                                    );
                                });
                            })()}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Recent Trades Table */}
            <Card className="overflow-hidden">
                <div className="p-4 border-b border-slate-800 font-bold">Recent Trades</div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-950 text-slate-400">
                            <tr>
                                <th className="px-4 py-2">Time</th>
                                <th className="px-4 py-2">Symbol</th>
                                <th className="px-4 py-2">Side</th>
                                <th className="px-4 py-2">Qty</th>
                                <th className="px-4 py-2">Entry Price</th>
                                <th className="px-4 py-2">Exit Price</th>
                                <th className="px-4 py-2">Realized PnL</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {displayTrades.map(t => (
                                <tr key={t.id} className="hover:bg-white/5">
                                    <td className="px-4 py-2 text-slate-400">{new Date(t.time).toLocaleTimeString()}</td>
                                    <td className="px-4 py-2 font-medium">{t.symbol}</td>
                                    <td className={`px-4 py-2 uppercase font-bold ${t.side === 'buy' ? 'text-emerald-500' : 'text-red-500'}`}>{t.side}</td>
                                    <td className="px-4 py-2">{t.qty}</td>
                                    <td className="px-4 py-2 text-slate-400">
                                        {t.isClose && t.entryPrice != null ? (t.entryPrice || 0).toFixed(2) : '-'}
                                    </td>
                                    <td className="px-4 py-2 font-mono">
                                        {(t.price || 0).toFixed(2)}
                                    </td>
                                    <td className={`px-4 py-2 font-mono ${!t.isClose ? 'text-slate-600' : t.realizedPnl > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                        {t.isClose && t.realizedPnl != null ? (t.realizedPnl || 0).toFixed(2) : '-'}
                                    </td>
                                </tr>
                            ))}
                            {displayTrades.length === 0 && (
                                <tr><td colSpan="7" className="px-4 py-8 text-center text-slate-500">No trades yet.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Live Financial Intelligence Hub */}
            <NewsHubSection />
        </div>
        </>
    );
}
