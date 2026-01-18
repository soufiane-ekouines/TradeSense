import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createChart, ColorType } from 'lightweight-charts';
import { market } from '../services/api';

export default function TradingChart({ 
    data, 
    symbol = 'BTC-USD',
    onPriceUpdate,  // NEW: Callback to send price updates to parent
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
    
    // Debug overlay state
    const [debugInfo, setDebugInfo] = useState({
        lastUpdate: null,
        price: null,
        source: null
    });

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

    // Live tick streaming - THE KEY FIX
    useEffect(() => {
        if (!symbol || !seriesRef.current) return;

        const fetchTick = async () => {
            try {
                const response = await market.getTick(symbol);
                const tickData = response.data;
                
                if (!tickData || !tickData.candle) return;
                
                const { candle, price, timestamp, source } = tickData;
                
                // Update debug overlay
                setDebugInfo({
                    lastUpdate: new Date().toLocaleTimeString(),
                    price: price?.toFixed(2),
                    source: source
                });
                
                // NEW: Send price update to parent component
                if (onPriceUpdate && price) {
                    onPriceUpdate(price, symbol);
                }
                
                // CRUCIAL: Use series.update() to update the chart in real-time
                const candleData = {
                    time: candle.time,
                    open: candle.open,
                    high: candle.high,
                    low: candle.low,
                    close: candle.close
                };
                
                if (candle.is_new && lastCandleTimeRef.current && candle.time > lastCandleTimeRef.current) {
                    // New candle - this will automatically add it
                    seriesRef.current.update(candleData);
                    lastCandleTimeRef.current = candle.time;
                } else {
                    // Update existing candle (modify high/low/close)
                    seriesRef.current.update(candleData);
                }
                
            } catch (err) {
                console.error('Tick fetch error:', err);
            }
        };

        // Initial fetch
        fetchTick();

        // Poll every 1 second for live updates
        const tickInterval = setInterval(fetchTick, 1000);

        return () => clearInterval(tickInterval);
    }, [symbol]);

    return (
        <div className="relative w-full">
            {/* Debug Overlay */}
            <div className="absolute top-2 right-2 z-10 bg-slate-800/80 px-3 py-1.5 rounded text-xs font-mono">
                <span className="text-slate-400">Last: </span>
                <span className="text-emerald-400">{debugInfo.lastUpdate || '--:--:--'}</span>
                <span className="text-slate-400 ml-2">Price: </span>
                <span className="text-white">{debugInfo.price || '---'}</span>
                <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] ${
                    debugInfo.source === 'live' ? 'bg-emerald-500/20 text-emerald-400' : 
                    debugInfo.source === 'mock' ? 'bg-amber-500/20 text-amber-400' : 
                    'bg-slate-500/20 text-slate-400'
                }`}>
                    {debugInfo.source?.toUpperCase() || 'WAITING'}
                </span>
            </div>
            
            <div ref={chartContainerRef} className="w-full h-[400px]" />
        </div>
    );
}
