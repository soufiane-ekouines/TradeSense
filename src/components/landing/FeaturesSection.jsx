import React from 'react';
import { motion } from 'framer-motion';
import { Brain, Zap, LineChart, Globe2 } from 'lucide-react';
import { Card } from '../ui/Card';
import { useLanguage } from '../../context/LanguageContext';

const FeatureBlock = ({ title, description, badge, align = 'left', image, icon: Icon, isRTL }) => {
    // Determine horizontal movement based on alignment AND RTL
    const initialX = align === 'left' ? (isRTL ? 50 : -50) : (isRTL ? -50 : 50);
    const containerClasses = align === 'right' ? (isRTL ? 'lg:flex-row' : 'lg:flex-row-reverse') : (isRTL ? 'lg:flex-row-reverse' : 'lg:flex-row');

    return (
        <div className="py-24 relative overflow-hidden">
            <div className="container mx-auto px-4">
                <div className={`flex flex-col items-center gap-16 ${containerClasses}`}>
                    <motion.div
                        initial={{ opacity: 0, x: initialX }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true, margin: "-100px" }}
                        transition={{ duration: 0.8 }}
                        className="flex-1 space-y-6"
                    >
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                            <Icon size={14} />
                            {badge}
                        </div>
                        <h2 className="text-4xl md:text-5xl font-bold text-white leading-tight">
                            {title}
                        </h2>
                        <p className="text-lg text-slate-400 leading-relaxed max-w-xl">
                            {description}
                        </p>
                        <div className="pt-4">
                            <div className="h-1 w-20 bg-emerald-500/50 rounded-full"></div>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 50 }}
                        whileInView={{ opacity: 1, scale: 1, y: 0 }}
                        viewport={{ once: true, margin: "-100px" }}
                        transition={{ duration: 0.8 }}
                        className="flex-1 w-full"
                    >
                        <div className="relative group">
                            <div className="absolute inset-0 bg-emerald-500/20 blur-[100px] rounded-full opacity-50 group-hover:opacity-70 transition-opacity duration-700"></div>
                            <Card className="relative p-2 bg-[#0A0A0A] border-slate-800 overflow-hidden rounded-2xl shadow-2xl transform transition-transform duration-700 hover:scale-[1.02] hover:border-emerald-500/30">
                                {image}
                                <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-transparent to-transparent opacity-60"></div>
                            </Card>
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
};

export default function FeaturesSection() {
    const { t, isRTL } = useLanguage();

    return (
        <section className="bg-[#050505] relative z-10">
            <div className={`absolute top-0 w-[1px] h-full bg-gradient-to-b from-transparent via-slate-800 to-transparent opacity-30 hidden md:block ${isRTL ? 'right-32' : 'left-32'}`}></div>

            <FeatureBlock
                align="left"
                isRTL={isRTL}
                badge={t('features.badge_ai')}
                icon={Brain}
                title={t('features.title_ai')}
                description={t('features.desc_ai')}
                image={
                    <div className="aspect-[16/10] bg-slate-900 rounded-lg overflow-hidden relative border border-slate-800">
                        <div className={`absolute top-4 ${isRTL ? 'left-4' : 'right-4'} bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded text-xs font-mono border border-emerald-500/30 flex items-center gap-2 z-10`}>
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            AI Signal: STRONG BUY
                        </div>
                        <div className="p-8 mt-8 grid grid-cols-2 gap-4">
                            <div className="h-24 bg-slate-800/50 rounded-lg animate-pulse w-full"></div>
                            <div className="h-24 bg-slate-800/50 rounded-lg animate-pulse w-full"></div>
                            <div className="col-span-2 h-40 bg-gradient-to-br from-emerald-500/10 to-transparent rounded-lg border border-emerald-500/20 p-4">
                                <div className={`text-sm text-emerald-400 font-mono mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>Sentiment Analysis</div>
                                <div className={`flex items-end gap-1 h-24 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                                    {[40, 60, 45, 70, 85, 60, 75, 50, 65, 80].map((h, i) => (
                                        <div key={i} style={{ height: `${h}%` }} className="flex-1 bg-emerald-500/40 rounded-t-sm"></div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                }
            />

            <FeatureBlock
                align="right"
                isRTL={isRTL}
                badge={t('features.badge_data')}
                icon={Zap}
                title={t('features.title_data')}
                description={t('features.desc_data')}
                image={
                    <div className="aspect-[16/10] bg-[#020408] rounded-lg overflow-hidden relative flex items-center justify-center border border-slate-800">
                        <div className="absolute inset-0 opacity-30">
                            <svg className="w-full h-full" preserveAspectRatio="none">
                                <path d="M0,100 C100,80 200,120 300,60 C400,20 500,80 600,40 L600,200 L0,200 Z" fill="url(#grad1)" />
                                <defs>
                                    <linearGradient id="grad1" x1="0%" y1="0%" x2="0%" y2="100%">
                                        <stop offset="0%" style={{ stopColor: '#10b981', stopOpacity: 0.5 }} />
                                        <stop offset="100%" style={{ stopColor: '#10b981', stopOpacity: 0 }} />
                                    </linearGradient>
                                </defs>
                            </svg>
                        </div>
                        <div className="relative z-10 w-full px-8">
                            <div className={`flex items-center justify-between mb-8 text-xs font-mono text-emerald-500 bg-emerald-950/30 p-2 rounded border border-emerald-500/20 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                                <span>EUR/USD - 1.0845</span>
                                <span className="flex items-center gap-1">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></div>
                                    LIVE 24ms
                                </span>
                            </div>
                            <div className={`h-32 w-full flex items-end gap-0.5 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                                {Array.from({ length: 40 }).map((_, i) => {
                                    const h = 20 + Math.random() * 60;
                                    const color = Math.random() > 0.4 ? 'bg-emerald-500' : 'bg-red-500';
                                    return (
                                        <div key={i} style={{ height: `${h}%` }} className={`flex-1 ${color} opacity-80 hover:opacity-100 transition-opacity`}></div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                }
            />
        </section>
    );
}
