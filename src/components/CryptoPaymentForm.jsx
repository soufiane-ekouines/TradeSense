import React, { useState, useEffect } from 'react';
import { Card } from './ui/Card';
import { Bitcoin, Copy, CheckCircle2, Clock, Wallet, ArrowRight } from 'lucide-react';

export default function CryptoPaymentForm({ onSubmit, onCancel, loading }) {
    const [selectedCrypto, setSelectedCrypto] = useState('ETH');
    const [timeLeft, setTimeLeft] = useState(600); // 10 minutes
    const [copied, setCopied] = useState(false);
    const [confirmed, setConfirmed] = useState(false);

    // Simulated wallet addresses
    const wallets = {
        ETH: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        BTC: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
        USDT: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb'
    };

    const amounts = {
        ETH: '0.125',
        BTC: '0.0052',
        USDT: '500.00'
    };

    const cryptoIcons = {
        ETH: { color: 'from-purple-600 to-indigo-600', icon: '⟠' },
        BTC: { color: 'from-orange-500 to-yellow-600', icon: '₿' },
        USDT: { color: 'from-emerald-600 to-teal-600', icon: '₮' }
    };

    useEffect(() => {
        if (timeLeft > 0 && !confirmed) {
            const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [timeLeft, confirmed]);

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(wallets[selectedCrypto]);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleConfirm = () => {
        setConfirmed(true);
        setTimeout(() => {
            onSubmit({ crypto: selectedCrypto, address: wallets[selectedCrypto] });
        }, 2000);
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
            {/* Crypto Selection */}
            <div className="grid grid-cols-3 gap-3">
                {Object.keys(wallets).map((crypto) => (
                    <button
                        key={crypto}
                        onClick={() => setSelectedCrypto(crypto)}
                        disabled={confirmed}
                        className={`p-4 rounded-xl border-2 transition-all duration-300 transform hover:scale-105 ${selectedCrypto === crypto
                                ? `border-orange-500 bg-gradient-to-br ${cryptoIcons[crypto].color} shadow-[0_0_30px_rgba(251,146,60,0.3)]`
                                : 'border-slate-700 bg-slate-900/50 hover:border-slate-600'
                            }`}
                    >
                        <div className={`text-3xl mb-2 ${selectedCrypto === crypto ? 'animate-bounce' : ''}`}>
                            {cryptoIcons[crypto].icon}
                        </div>
                        <div className={`text-sm font-bold ${selectedCrypto === crypto ? 'text-white' : 'text-slate-400'}`}>
                            {crypto}
                        </div>
                    </button>
                ))}
            </div>

            {/* Payment Card */}
            <Card className="p-6 border-orange-500/30 bg-gradient-to-br from-orange-950/20 to-slate-950">
                <div className="space-y-6">
                    {/* Timer */}
                    <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-lg border border-orange-500/20">
                        <div className="flex items-center gap-2">
                            <Clock className="text-orange-400" size={20} />
                            <span className="text-sm text-slate-300">Payment Expires In</span>
                        </div>
                        <div className={`text-xl font-mono font-bold ${timeLeft < 60 ? 'text-red-400 animate-pulse' : 'text-orange-400'}`}>
                            {formatTime(timeLeft)}
                        </div>
                    </div>

                    {/* Amount Display */}
                    <div className="text-center py-6 relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-orange-500/10 to-transparent animate-shimmer"></div>
                        <div className="relative">
                            <div className="text-sm text-slate-400 mb-2">Send Exactly</div>
                            <div className="text-4xl font-bold text-white mb-1 font-mono">
                                {amounts[selectedCrypto]} {selectedCrypto}
                            </div>
                            <div className="text-xs text-slate-500">Network: {selectedCrypto === 'USDT' ? 'ERC20' : selectedCrypto}</div>
                        </div>
                    </div>

                    {/* QR Code Placeholder */}
                    <div className="flex justify-center">
                        <div className="relative">
                            <div className="w-48 h-48 bg-white rounded-xl p-4 shadow-[0_0_40px_rgba(251,146,60,0.2)]">
                                {/* Simulated QR Code Pattern */}
                                <div className="grid grid-cols-8 gap-1 h-full">
                                    {Array.from({ length: 64 }).map((_, i) => (
                                        <div
                                            key={i}
                                            className={`rounded-sm ${Math.random() > 0.5 ? 'bg-slate-900' : 'bg-white'
                                                }`}
                                        ></div>
                                    ))}
                                </div>
                            </div>
                            <div className="absolute -top-2 -right-2 w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center shadow-lg">
                                <span className="text-white text-xl">{cryptoIcons[selectedCrypto].icon}</span>
                            </div>
                        </div>
                    </div>

                    {/* Wallet Address */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                            <Wallet size={16} />
                            Wallet Address
                        </label>
                        <div className="relative group">
                            <input
                                type="text"
                                value={wallets[selectedCrypto]}
                                readOnly
                                className="w-full bg-slate-900/50 border border-orange-500/30 rounded-lg px-4 py-3 pr-12 text-white font-mono text-sm select-all focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all"
                            />
                            <button
                                type="button"
                                onClick={handleCopy}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 hover:bg-orange-500/20 rounded-lg transition-all group"
                            >
                                {copied ? (
                                    <CheckCircle2 className="text-emerald-400" size={20} />
                                ) : (
                                    <Copy className="text-orange-400 group-hover:text-orange-300" size={20} />
                                )}
                            </button>
                        </div>
                        {copied && (
                            <div className="text-xs text-emerald-400 mt-2 animate-in fade-in slide-in-from-top-1">
                                ✓ Address copied to clipboard!
                            </div>
                        )}
                    </div>

                    {/* Instructions */}
                    <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg space-y-2">
                        <div className="flex items-start gap-3">
                            <div className="w-6 h-6 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <span className="text-orange-400 text-xs font-bold">1</span>
                            </div>
                            <p className="text-sm text-slate-300">
                                Send <span className="font-bold text-orange-400">{amounts[selectedCrypto]} {selectedCrypto}</span> to the address above
                            </p>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="w-6 h-6 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <span className="text-orange-400 text-xs font-bold">2</span>
                            </div>
                            <p className="text-sm text-slate-300">
                                Payment will be confirmed automatically after 3 network confirmations
                            </p>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="w-6 h-6 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <span className="text-orange-400 text-xs font-bold">3</span>
                            </div>
                            <p className="text-sm text-slate-300">
                                Do not close this page until payment is confirmed
                            </p>
                        </div>
                    </div>

                    {/* Confirmation Status */}
                    {confirmed && (
                        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg animate-in fade-in slide-in-from-bottom-2">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center">
                                    <CheckCircle2 className="text-emerald-400 animate-pulse" size={24} />
                                </div>
                                <div>
                                    <div className="font-bold text-emerald-400">Payment Detected!</div>
                                    <div className="text-xs text-emerald-300">Waiting for confirmations...</div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Buttons */}
                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onCancel}
                            disabled={loading || confirmed}
                            className="flex-1 px-6 py-3 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-900 disabled:text-slate-600 text-white rounded-lg font-medium transition-all duration-300 border border-slate-700 hover:border-slate-600"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleConfirm}
                            disabled={loading || confirmed}
                            className="flex-1 px-6 py-3 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-500 hover:to-orange-600 disabled:from-slate-700 disabled:to-slate-800 text-white rounded-lg font-bold transition-all duration-300 shadow-[0_0_20px_rgba(251,146,60,0.3)] hover:shadow-[0_0_30px_rgba(251,146,60,0.4)] disabled:shadow-none transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    Processing...
                                </>
                            ) : confirmed ? (
                                <>
                                    <CheckCircle2 size={20} />
                                    Confirmed
                                </>
                            ) : (
                                <>
                                    I've Sent Payment
                                    <ArrowRight size={20} />
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </Card>

            {/* Security Notice */}
            <div className="flex items-center gap-2 p-3 bg-orange-500/5 border border-orange-500/20 rounded-lg">
                <CheckCircle2 className="text-orange-400 flex-shrink-0" size={16} />
                <p className="text-xs text-orange-300">
                    Payments are irreversible. Please ensure the amount and address are correct.
                </p>
            </div>
        </div>
    );
}
