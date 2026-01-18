import React, { useEffect, useRef } from 'react';
import { createChart, ColorType } from 'lightweight-charts';

export default function TradingChart({ 
    data, 
    symbol = 'BTC-USD',
    // ========== SINGLE SOURCE OF TRUTH: Receive price from parent ==========
    tickCandle,         // Latest candle data from parent (SSoT)
    currentPrice,       // Current price from parent (SSoT)
    priceSource,        // 'live' | 'mock' | 'waiting'
    lastPriceUpdate,    // Timestamp of last update
    // ========================================================================
    colors: {
        backgroundColor = '#0f172a',
        lineColor = '#2962FF',
        textColor = 'rgba(255, 255, 255, 0.9)',
        areaTopColor = '#2962FF',
        areaBottomColor = 'rgba(41, 98, 255, 0.28)',
    } = {} 
}) {
    const chartContainerRef = useRef();
    const chartRef = useRef();
    const seriesRef = useRef();
    const lastCandleTimeRef = useRef(null);

    // Initialize chart
    useEffect(() => {
        const handleResize = () => {
            if (chartRef.current) {
                chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
            }
        };

        chartRef.current = createChart(chartContainerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: backgroundColor },
                textColor,
            },
            width: chartContainerRef.current.clientWidth,
            height: 400,
            grid: {
                vertLines: { color: 'rgba(255, 255, 255, 0.05)' },
                horzLines: { color: 'rgba(255, 255, 255, 0.05)' },
            },
            timeScale: {
                timeVisible: true,
                secondsVisible: true,
            },
            crosshair: {
                mode: 1, // Normal crosshair
            },
        });

        // Use CandlestickSeries for better trading feel
        seriesRef.current = chartRef.current.addCandlestickSeries({
            upColor: '#10b981',
            downColor: '#ef4444',
            borderVisible: false,
            wickUpColor: '#10b981',
            wickDownColor: '#ef4444',
        });

        // Initial Data
        if (data && data.length > 0) {
            seriesRef.current.setData(data);
            lastCandleTimeRef.current = data[data.length - 1].time;
        }

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            if (chartRef.current) {
                chartRef.current.remove();
            }
        };
    }, [backgroundColor, textColor]);

    // Update chart when initial data changes
    useEffect(() => {
        if (seriesRef.current && data && data.length > 0) {
            console.log('TradingChart: Setting', data.length, 'candles, first:', data[0], 'last:', data[data.length - 1]);
            seriesRef.current.setData(data);
            lastCandleTimeRef.current = data[data.length - 1].time;
        } else {
            console.log('TradingChart: No data to set, data=', data);
        }
    }, [data]);

    // ========== SINGLE SOURCE OF TRUTH: Update chart from parent's tickCandle ==========
    // This replaces the old independent fetching - now we receive data from Dashboard
    useEffect(() => {
        if (!seriesRef.current || !tickCandle) return;
        
        // CRUCIAL: Validate time is a proper Unix timestamp (number)
        const candleTime = typeof tickCandle.time === 'number' 
            ? tickCandle.time 
            : Math.floor(Date.now() / 1000);
        
        // SAFETY CHECK: Only update if time is >= last candle time
        // This prevents the "Cannot update oldest data" error
        if (lastCandleTimeRef.current && candleTime < lastCandleTimeRef.current) {
            console.log('[CHART] Skipping old candle:', candleTime, '< last:', lastCandleTimeRef.current);
            return;
        }
        
        const candleData = {
            time: candleTime,
            open: tickCandle.open,
            high: tickCandle.high,
            low: tickCandle.low,
            close: tickCandle.close
        };
        
        try {
            if (tickCandle.is_new && lastCandleTimeRef.current && candleTime > lastCandleTimeRef.current) {
                // New candle - add it
                console.log('[CHART] Adding new candle at time:', candleTime);
                seriesRef.current.update(candleData);
                lastCandleTimeRef.current = candleTime;
            } else if (candleTime >= lastCandleTimeRef.current || !lastCandleTimeRef.current) {
                // Update existing candle (modify high/low/close)
                seriesRef.current.update(candleData);
                if (!lastCandleTimeRef.current) {
                    lastCandleTimeRef.current = candleTime;
                }
            }
        } catch (err) {
            console.error('[CHART] Update error:', err.message);
        }
    }, [tickCandle]);

    return (
        <div className="relative w-full">
            {/* Debug Overlay - Now uses Single Source of Truth from parent */}
            <div className="absolute top-2 right-2 z-10 bg-slate-800/80 px-3 py-1.5 rounded text-xs font-mono">
                <span className="text-slate-400">Last: </span>
                <span className="text-emerald-400">{lastPriceUpdate ? lastPriceUpdate.toLocaleTimeString() : '--:--:--'}</span>
                <span className="text-slate-400 ml-2">Price: </span>
                <span className="text-white">{currentPrice ? currentPrice.toFixed(2) : '---'}</span>
                <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] ${
                    priceSource === 'live' ? 'bg-emerald-500/20 text-emerald-400' : 
                    priceSource === 'mock' ? 'bg-amber-500/20 text-amber-400' : 
                    'bg-slate-500/20 text-slate-400'
                }`}>
                    {priceSource?.toUpperCase() || 'WAITING'}
                </span>
            </div>
            
            <div ref={chartContainerRef} className="w-full h-[400px]" />
        </div>
    );
}
