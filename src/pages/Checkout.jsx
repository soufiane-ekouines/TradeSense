import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { checkout } from '../services/api';
import { CheckCircle2, CreditCard, Bitcoin, AlertTriangle, ShieldCheck } from 'lucide-react';
import confetti from 'canvas-confetti';
import CMICardForm from '../components/CMICardForm';
import CryptoPaymentForm from '../components/CryptoPaymentForm';
import PayPalForm from '../components/PayPalForm';

export default function Checkout() {
    const [searchParams] = useSearchParams();
    const planSlug = searchParams.get('plan');
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');
    const [shake, setShake] = useState(false);
    const [activePaymentForm, setActivePaymentForm] = useState(null); // 'cmi', 'crypto', 'paypal', or null

    useEffect(() => {
        if (!planSlug) navigate('/#pricing');
    }, [planSlug, navigate]);


    const handlePaymentMethodClick = (method) => {
        setActivePaymentForm(method);
        setError('');
    };

    const handleCardFormSubmit = async (cardData) => {
        setLoading(true);
        setError('');
        setShake(false);
        try {
            await checkout.payCMI(planSlug);
            triggerSuccess();
        } catch (err) {
            handlePaymentError(err);
        }
    };

    const handleCryptoFormSubmit = async (cryptoData) => {
        setLoading(true);
        setError('');
        setShake(false);
        try {
            await checkout.payCrypto(planSlug);
            triggerSuccess();
        } catch (err) {
            handlePaymentError(err);
        }
    };

    const handlePayPalFormSubmit = async (paypalData) => {
        setLoading(true);
        setError('');
        setShake(false);
        try {
            await checkout.payPayPal(planSlug);
            triggerSuccess();
        } catch (err) {
            handlePaymentError(err);
        }
    };

    const triggerSuccess = () => {
        setSuccess(true);
        confetti({
            particleCount: 150,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#10b981', '#34d399', '#059669', '#ffffff']
        });
        setTimeout(() => navigate('/dashboard'), 3000);
    };

    const handlePaymentError = (err) => {
        setError(err.response?.data?.error || 'Transaction declined. Please try again.');
        setLoading(false);
        setShake(true);
        setTimeout(() => setShake(false), 500);
    };

    const handleCancelForm = () => {
        setActivePaymentForm(null);
        setLoading(false);
        setError('');
    };


    if (success) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Card className="text-center p-12 space-y-6 max-w-md w-full animate-in fade-in zoom-in duration-500 border-emerald-500/30 bg-emerald-950/20">
                    <div className="mx-auto w-20 h-20 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.3)]">
                        <CheckCircle2 size={40} />
                    </div>
                    <div>
                        <h2 className="text-3xl font-bold text-white mb-2">Payment Successful!</h2>
                        <p className="text-slate-400">Your {planSlug} challenge is active.</p>
                    </div>
                    <div className="text-sm text-slate-500 animate-pulse">Redirecting to Dashboard...</div>
                </Card>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto py-12 px-4">
            <h1 className="text-3xl font-bold mb-8 flex items-center gap-3">
                <ShieldCheck className="text-emerald-500" /> Secure Checkout
            </h1>

            <div className="grid md:grid-cols-2 gap-8">
                {/* Order Summary Panel */}
                <div className={`transition-all duration-300 ${shake ? 'animate-[shake_0.5s_cubic-bezier(.36,.07,.19,.97)_both]' : ''}`}>
                    <Card className={`p-6 space-y-4 h-full ${error ? 'border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.2)]' : 'border-slate-800'}`}>
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Order Summary</h3>

                        <div className="flex justify-between items-center py-4 border-b border-slate-800/50">
                            <div>
                                <div className="capitalize text-xl font-bold text-white">{planSlug} Challenge</div>
                                <div className="text-xs text-slate-400">Lifetime Access • No Recurring Fees</div>
                            </div>
                        </div>

                        <div className="space-y-2 pt-2">
                            <div className="flex justify-between items-center text-sm text-slate-400">
                                <span>Subtotal</span>
                                <span>{getPlanPrice(planSlug)}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm text-slate-400">
                                <span>Processing Fee</span>
                                <span className="text-emerald-400">Free</span>
                            </div>
                        </div>

                        <div className="pt-6 mt-6 border-t border-slate-800">
                            <div className="flex justify-between items-center text-2xl font-bold text-white">
                                <span>Total</span>
                                <span>{getPlanPrice(planSlug)}</span>
                            </div>
                            <div className="text-right text-[10px] text-slate-500 mt-1">
                                256-bit SSL Encrypted
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Payment Methods */}
                <div className="space-y-4">
                    {error && (
                        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                            <AlertTriangle size={18} />
                            <span className="text-sm font-medium">{error}</span>
                        </div>
                    )}

                    {activePaymentForm === 'cmi' ? (
                        <CMICardForm
                            onSubmit={handleCardFormSubmit}
                            onCancel={handleCancelForm}
                            loading={loading}
                        />
                    ) : activePaymentForm === 'crypto' ? (
                        <CryptoPaymentForm
                            onSubmit={handleCryptoFormSubmit}
                            onCancel={handleCancelForm}
                            loading={loading}
                        />
                    ) : activePaymentForm === 'paypal' ? (
                        <PayPalForm
                            onSubmit={handlePayPalFormSubmit}
                            onCancel={handleCancelForm}
                            loading={loading}
                        />
                    ) : loading ? (
                        <Card className="h-[240px] flex flex-col items-center justify-center space-y-4 border-primary-500/30 bg-primary-950/10 relative overflow-hidden">
                            {/* CSS-based 3D Loader Substitution */}
                            <div className="relative w-16 h-16">
                                <div className="absolute inset-0 border-4 border-slate-800 rounded-full"></div>
                                <div className="absolute inset-0 border-4 border-t-primary-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
                                <div className="absolute inset-2 border-4 border-slate-800 rounded-full"></div>
                                <div className="absolute inset-2 border-4 border-b-emerald-500 border-t-transparent border-l-transparent border-r-transparent rounded-full animate-[spin_1.5s_linear_infinite_reverse]"></div>
                            </div>
                            <div className="text-sm font-bold text-primary-400 animate-pulse tracking-widest uppercase">
                                Processing Secure Payment...
                            </div>
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-[shimmer_2s_infinite]"></div>
                        </Card>
                    ) : (
                        <>
                            <Card
                                className="p-6 cursor-pointer hover:border-emerald-500 hover:bg-emerald-950/10 transition-all group"
                                onClick={() => handlePaymentMethodClick('cmi')}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-10 bg-slate-900 rounded flex items-center justify-center border border-slate-700 group-hover:border-emerald-500/50 transition-colors">
                                        <CreditCard size={20} className="text-slate-300 group-hover:text-emerald-400" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="font-bold text-slate-200 group-hover:text-white">Pay with CMI Card</div>
                                        <div className="text-xs text-slate-500 group-hover:text-emerald-400/70">Instant Activation • Visa/Mastercard</div>
                                    </div>
                                    <div className="w-4 h-4 rounded-full border-2 border-slate-700 group-hover:border-emerald-500 transition-colors"></div>
                                </div>
                            </Card>

                            <Card
                                className="p-6 cursor-pointer hover:border-orange-500 hover:bg-orange-950/10 transition-all group"
                                onClick={() => handlePaymentMethodClick('crypto')}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-10 bg-slate-900 rounded flex items-center justify-center border border-slate-700 group-hover:border-orange-500/50 transition-colors">
                                        <Bitcoin size={20} className="text-slate-300 group-hover:text-orange-400" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="font-bold text-slate-200 group-hover:text-white">Pay with Crypto</div>
                                        <div className="text-xs text-slate-500 group-hover:text-orange-400/70">ETH • BTC • USDT (ERC20)</div>
                                    </div>
                                    <div className="w-4 h-4 rounded-full border-2 border-slate-700 group-hover:border-orange-500 transition-colors"></div>
                                </div>
                            </Card>

                            <Card
                                className="p-6 cursor-pointer hover:border-blue-500 hover:bg-blue-950/10 transition-all group"
                                onClick={() => handlePaymentMethodClick('paypal')}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-10 bg-slate-900 rounded flex items-center justify-center border border-slate-700 group-hover:border-blue-500/50 transition-colors overflow-hidden">
                                        <div className="text-2xl font-black text-slate-300 group-hover:text-blue-400 transition-colors italic">P</div>
                                    </div>
                                    <div className="flex-1">
                                        <div className="font-bold text-slate-200 group-hover:text-white">Pay with PayPal</div>
                                        <div className="text-xs text-slate-500 group-hover:text-blue-400/70">Secure & Fast • Buyer Protection</div>
                                    </div>
                                    <div className="w-4 h-4 rounded-full border-2 border-slate-700 group-hover:border-blue-500 transition-colors"></div>
                                </div>
                            </Card>
                        </>
                    )}

                    <div className="text-center text-[10px] text-slate-600">
                        Protected by 256-bit SSL encryption. By proceeding, you agree to the Terms of Service.
                    </div>
                </div>
            </div>
        </div>
    );
}

function getPlanPrice(slug) {
    const prices = { starter: '200 DH', pro: '500 DH', elite: '1,000 DH' };
    return prices[slug] || '---';
}
