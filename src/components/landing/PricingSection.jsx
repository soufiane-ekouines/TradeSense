import React from 'react';
import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { motion } from 'framer-motion';
import { useLanguage } from '../../context/LanguageContext';

export default function PricingSection() {
    const { t, isRTL } = useLanguage();

    const plans = [
        { name: 'Starter', price: '200 DH', balance: '5,000 DH', slug: 'starter', delay: 0.1 },
        { name: 'Pro', price: '500 DH', balance: '25,000 DH', slug: 'pro', popular: true, delay: 0.2 },
        { name: 'Elite', price: '1,000 DH', balance: '100,000 DH', slug: 'elite', delay: 0.3 },
    ];

    return (
        <section className="bg-[#050505] relative z-10 py-24" id="pricing">
            <div className="container mx-auto px-4 max-w-7xl">
                <div className="text-center mb-16 space-y-4">
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className="text-3xl md:text-5xl font-bold text-white"
                    >
                        {t('pricing.title_main')} <span className="text-emerald-500">{t('pricing.title_accent')}</span>
                    </motion.h2>
                    <p className="text-slate-400 text-lg">{t('pricing.subtitle')}</p>
                </div>

                <div id='pricing' className="grid md:grid-cols-3 gap-8">
                    {plans.map((plan) => (
                        <motion.div
                            key={plan.name}
                            initial={{ opacity: 0, y: 50 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: plan.delay }}
                        >
                            <Card className={`relative p-8 h-full flex flex-col border-2 transition-all duration-300 ${plan.popular
                                ? 'border-emerald-500 bg-slate-900/40 shadow-[0_0_30px_rgba(16,185,129,0.1)]'
                                : 'border-slate-800 bg-slate-950/40 hover:border-slate-700'
                                }`}>
                                {plan.popular && (
                                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-emerald-500 text-black px-4 py-1 text-sm font-bold rounded-full uppercase tracking-wider shadow-lg">
                                        {t('pricing.popular')}
                                    </div>
                                )}

                                <div className="text-center mb-8">
                                    <h3 className="text-xl font-bold text-slate-300 mb-2 uppercase tracking-widest">{plan.name}</h3>
                                    <div className="text-4xl md:text-5xl font-bold text-white mb-2 tracking-widest">{plan.balance}</div>
                                    <div className="text-emerald-500 font-mono text-sm">{t('pricing.balance_label')}</div>
                                </div>

                                <div className="space-y-4 mb-8 flex-1">
                                    <div className={`flex items-center gap-3 text-slate-300 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
                                        <div className="w-6 h-6 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                                            <Check className="text-emerald-500" size={14} />
                                        </div>
                                        <span>{t('pricing.target')}: <span className="text-white font-bold">10%</span></span>
                                    </div>
                                    <div className={`flex items-center gap-3 text-slate-300 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
                                        <div className="w-6 h-6 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                                            <Check className="text-emerald-500" size={14} />
                                        </div>
                                        <span>{t('pricing.daily_loss')}: <span className="text-white font-bold">5%</span></span>
                                    </div>
                                    <div className={`flex items-center gap-3 text-slate-300 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
                                        <div className="w-6 h-6 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                                            <Check className="text-emerald-500" size={14} />
                                        </div>
                                        <span>{t('pricing.max_loss')}: <span className="text-white font-bold">10%</span></span>
                                    </div>
                                    <div className={`flex items-center gap-3 text-slate-300 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
                                        <div className="w-6 h-6 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                                            <Check className="text-emerald-500" size={14} />
                                        </div>
                                        <span>{t('pricing.leverage')} <span className="text-white font-bold tracking-widest">1:100</span></span>
                                    </div>
                                </div>

                                <div className="text-center pt-8 border-t border-slate-800">
                                    <div className="mb-6">
                                        <span className="text-4xl font-bold text-white tracking-widest">{plan.price}</span>
                                        <span className="text-slate-500"> {t('pricing.one_time')}</span>
                                    </div>
                                    <Link to={`/checkout?plan=${plan.slug}`} className="block">
                                        <button className={`w-full py-4 rounded-xl font-bold text-lg transition-all duration-300 ${plan.popular
                                            ? 'bg-emerald-500 text-black hover:bg-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.2)] hover:shadow-[0_0_30px_rgba(16,185,129,0.4)]'
                                            : 'bg-white/10 text-white hover:bg-white/20'
                                            }`}>
                                            {t('pricing.cta')}
                                        </button>
                                    </Link>
                                </div>
                            </Card>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
