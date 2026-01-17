import React, { useState } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { CreditCard, Lock, CheckCircle2 } from 'lucide-react';

export default function CMICardForm({ onSubmit, onCancel, loading }) {
    const [cardData, setCardData] = useState({
        number: '',
        name: '',
        expiry: '',
        cvv: ''
    });
    const [focused, setFocused] = useState('');
    const [isFlipped, setIsFlipped] = useState(false);

    const formatCardNumber = (value) => {
        const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
        const matches = v.match(/\d{4,16}/g);
        const match = (matches && matches[0]) || '';
        const parts = [];

        for (let i = 0, len = match.length; i < len; i += 4) {
            parts.push(match.substring(i, i + 4));
        }

        if (parts.length) {
            return parts.join(' ');
        } else {
            return value;
        }
    };

    const formatExpiry = (value) => {
        const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
        if (v.length >= 2) {
            return v.slice(0, 2) + '/' + v.slice(2, 4);
        }
        return v;
    };

    const handleInputChange = (field, value) => {
        let formattedValue = value;

        if (field === 'number') {
            formattedValue = formatCardNumber(value);
            if (formattedValue.replace(/\s/g, '').length <= 16) {
                setCardData({ ...cardData, [field]: formattedValue });
            }
        } else if (field === 'expiry') {
            formattedValue = formatExpiry(value);
            if (formattedValue.replace('/', '').length <= 4) {
                setCardData({ ...cardData, [field]: formattedValue });
            }
        } else if (field === 'cvv') {
            if (value.length <= 3 && /^\d*$/.test(value)) {
                setCardData({ ...cardData, [field]: value });
            }
        } else {
            setCardData({ ...cardData, [field]: value });
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(cardData);
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
            {/* 3D Card Preview */}
            <div className="perspective-1000 mb-8">
                <div
                    className={`relative w-full max-w-md mx-auto transition-all duration-700 transform-style-3d ${isFlipped ? 'rotate-y-180' : ''
                        }`}
                    style={{
                        transformStyle: 'preserve-3d',
                        transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                        transition: 'transform 0.6s cubic-bezier(0.4, 0.2, 0.2, 1)'
                    }}
                >
                    {/* Front of Card */}
                    <div
                        className="backface-hidden"
                        style={{ backfaceVisibility: 'hidden' }}
                    >
                        <div className="relative aspect-[1.586/1] bg-gradient-to-br from-emerald-600 via-emerald-700 to-emerald-900 rounded-2xl p-6 shadow-[0_20px_50px_rgba(16,185,129,0.3)] overflow-hidden">
                            {/* Card Background Pattern */}
                            <div className="absolute inset-0 opacity-10">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full blur-3xl transform translate-x-32 -translate-y-32"></div>
                                <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full blur-3xl transform -translate-x-24 translate-y-24"></div>
                            </div>

                            {/* Card Content */}
                            <div className="relative z-10 h-full flex flex-col justify-between">
                                {/* Chip & Logo */}
                                <div className="flex justify-between items-start">
                                    <div className="w-12 h-10 bg-gradient-to-br from-amber-200 to-amber-400 rounded-lg shadow-lg flex items-center justify-center">
                                        <div className="w-8 h-6 border-2 border-amber-600/30 rounded"></div>
                                    </div>
                                    <div className="text-white font-bold text-xl tracking-wider">CMI</div>
                                </div>

                                {/* Card Number */}
                                <div className="mt-6">
                                    <div className="text-white text-xl md:text-2xl font-mono tracking-widest drop-shadow-lg">
                                        {cardData.number || '•••• •••• •••• ••••'}
                                    </div>
                                </div>

                                {/* Name & Expiry */}
                                <div className="flex justify-between items-end mt-4">
                                    <div>
                                        <div className="text-emerald-200 text-[10px] uppercase tracking-wider mb-1">Card Holder</div>
                                        <div className="text-white text-sm md:text-base font-medium tracking-wide uppercase">
                                            {cardData.name || 'YOUR NAME'}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-emerald-200 text-[10px] uppercase tracking-wider mb-1">Expires</div>
                                        <div className="text-white text-sm md:text-base font-mono">
                                            {cardData.expiry || 'MM/YY'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Back of Card */}
                    <div
                        className="absolute inset-0 backface-hidden"
                        style={{
                            backfaceVisibility: 'hidden',
                            transform: 'rotateY(180deg)'
                        }}
                    >
                        <div className="aspect-[1.586/1] bg-gradient-to-br from-emerald-700 via-emerald-800 to-emerald-900 rounded-2xl shadow-[0_20px_50px_rgba(16,185,129,0.3)] overflow-hidden">
                            <div className="w-full h-12 bg-slate-900 mt-6"></div>
                            <div className="px-6 mt-6">
                                <div className="bg-white h-10 rounded flex items-center justify-end px-4">
                                    <div className="text-slate-900 font-mono tracking-wider italic">
                                        {cardData.cvv || '•••'}
                                    </div>
                                </div>
                                <div className="text-emerald-100 text-xs mt-4 text-right">
                                    CVV
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Form */}
            <Card className="p-6 border-slate-800">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                            <CreditCard className="text-emerald-400" size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-white">Card Information</h3>
                            <p className="text-xs text-slate-400">Enter your CMI card details</p>
                        </div>
                    </div>

                    {/* Card Number */}
                    <div className="relative">
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Card Number
                        </label>
                        <input
                            type="text"
                            value={cardData.number}
                            onChange={(e) => handleInputChange('number', e.target.value)}
                            onFocus={() => {
                                setFocused('number');
                                setIsFlipped(false);
                            }}
                            onBlur={() => setFocused('')}
                            placeholder="1234 5678 9012 3456"
                            className={`w-full bg-slate-900/50 border rounded-lg px-4 py-3 text-white font-mono placeholder-slate-600 transition-all duration-300 ${focused === 'number'
                                    ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.15)]'
                                    : 'border-slate-700 hover:border-slate-600'
                                }`}
                            required
                        />
                        <CreditCard
                            className={`absolute right-3 top-10 transition-colors duration-300 ${focused === 'number' ? 'text-emerald-400' : 'text-slate-600'
                                }`}
                            size={20}
                        />
                    </div>

                    {/* Cardholder Name */}
                    <div className="relative">
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Cardholder Name
                        </label>
                        <input
                            type="text"
                            value={cardData.name}
                            onChange={(e) => handleInputChange('name', e.target.value.toUpperCase())}
                            onFocus={() => {
                                setFocused('name');
                                setIsFlipped(false);
                            }}
                            onBlur={() => setFocused('')}
                            placeholder="JOHN DOE"
                            className={`w-full bg-slate-900/50 border rounded-lg px-4 py-3 text-white uppercase placeholder-slate-600 transition-all duration-300 ${focused === 'name'
                                    ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.15)]'
                                    : 'border-slate-700 hover:border-slate-600'
                                }`}
                            required
                        />
                    </div>

                    {/* Expiry & CVV */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="relative">
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Expiry Date
                            </label>
                            <input
                                type="text"
                                value={cardData.expiry}
                                onChange={(e) => handleInputChange('expiry', e.target.value)}
                                onFocus={() => {
                                    setFocused('expiry');
                                    setIsFlipped(false);
                                }}
                                onBlur={() => setFocused('')}
                                placeholder="MM/YY"
                                className={`w-full bg-slate-900/50 border rounded-lg px-4 py-3 text-white font-mono placeholder-slate-600 transition-all duration-300 ${focused === 'expiry'
                                        ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.15)]'
                                        : 'border-slate-700 hover:border-slate-600'
                                    }`}
                                required
                            />
                        </div>

                        <div className="relative">
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                CVV
                            </label>
                            <input
                                type="text"
                                value={cardData.cvv}
                                onChange={(e) => handleInputChange('cvv', e.target.value)}
                                onFocus={() => {
                                    setFocused('cvv');
                                    setIsFlipped(true);
                                }}
                                onBlur={() => {
                                    setFocused('');
                                    setIsFlipped(false);
                                }}
                                placeholder="123"
                                className={`w-full bg-slate-900/50 border rounded-lg px-4 py-3 text-white font-mono placeholder-slate-600 transition-all duration-300 ${focused === 'cvv'
                                        ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.15)]'
                                        : 'border-slate-700 hover:border-slate-600'
                                    }`}
                                required
                            />
                            <Lock
                                className={`absolute right-3 top-10 transition-colors duration-300 ${focused === 'cvv' ? 'text-emerald-400' : 'text-slate-600'
                                    }`}
                                size={16}
                            />
                        </div>
                    </div>

                    {/* Security Note */}
                    <div className="flex items-center gap-2 p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-lg mt-4">
                        <CheckCircle2 className="text-emerald-400 flex-shrink-0" size={16} />
                        <p className="text-xs text-emerald-300">
                            Your payment is secured with 256-bit SSL encryption
                        </p>
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onCancel}
                            disabled={loading}
                            className="flex-1 px-6 py-3 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-900 disabled:text-slate-600 text-white rounded-lg font-medium transition-all duration-300 border border-slate-700 hover:border-slate-600"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 px-6 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 disabled:from-slate-700 disabled:to-slate-800 text-white rounded-lg font-bold transition-all duration-300 shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.4)] disabled:shadow-none transform hover:scale-[1.02] active:scale-[0.98]"
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
                </form>
            </Card>
        </div>
    );
}

function getPriceForDisplay() {
    const params = new URLSearchParams(window.location.search);
    const plan = params.get('plan');
    const prices = { starter: '200 DH', pro: '500 DH', elite: '1,000 DH' };
    return prices[plan] || '---';
}
