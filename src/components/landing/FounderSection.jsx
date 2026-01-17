import React from 'react';
import { motion } from 'framer-motion';
import { Linkedin, Github, Quote } from 'lucide-react';
import devImg from '../../dev.jpg';
import { useLanguage } from '../../context/LanguageContext';

export default function FounderSection() {
    const { t, isRTL } = useLanguage();

    return (
        <section className="py-24 bg-[#050505] relative overflow-hidden">
            <div className={`absolute top-0 ${isRTL ? 'left-0' : 'right-0'} w-[500px] h-[500px] bg-emerald-600/10 rounded-full blur-[120px] pointer-events-none`}></div>
            <div className={`absolute bottom-0 ${isRTL ? 'right-0' : 'left-0'} w-[500px] h-[500px] bg-blue-600/5 rounded-full blur-[120px] pointer-events-none`}></div>

            <div className="container mx-auto px-4 relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8 }}
                    className="max-w-5xl mx-auto"
                >
                    <div className="relative rounded-3xl overflow-hidden backdrop-blur-xl bg-white/5 border border-white/10 p-8 md:p-12 shadow-2xl">
                        <div className={`absolute top-8 ${isRTL ? 'left-8' : 'right-8'} text-emerald-500/20`}>
                            <Quote size={120} className={isRTL ? 'scale-x-110 rotate-180' : ''} />
                        </div>

                        <div className={`flex flex-col md:flex-row items-center md:items-start gap-10 md:gap-16 relative z-10 ${isRTL ? 'md:text-right' : 'md:text-left'}`}>
                            <div className="flex-shrink-0 text-center">
                                <div className="w-32 h-32 md:w-40 md:h-40 rounded-full p-1 bg-gradient-to-br from-emerald-500 to-slate-800 mx-auto shadow-[0_0_30px_rgba(16,185,129,0.3)]">
                                    <div className="w-full h-full rounded-full bg-slate-900 border-4 border-[#050505] overflow-hidden">
                                        <img
                                            src={devImg}
                                            alt="Soufiane Ekouines"
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                </div>
                                <div className="mt-6 flex justify-center gap-4">
                                    <a href="#" className="w-10 h-10 rounded-full bg-white/5 hover:bg-emerald-500/20 border border-white/10 hover:border-emerald-500/50 flex items-center justify-center text-slate-400 hover:text-emerald-400 transition-all duration-300">
                                        <Linkedin size={18} />
                                    </a>
                                    <a href="#" className="w-10 h-10 rounded-full bg-white/5 hover:bg-emerald-500/20 border border-white/10 hover:border-emerald-500/50 flex items-center justify-center text-slate-400 hover:text-emerald-400 transition-all duration-300">
                                        <Github size={18} />
                                    </a>
                                </div>
                            </div>

                            <div className="flex-1 text-center md:text-inherit">
                                <h3 className="text-3xl font-bold text-white mb-2">
                                    Soufiane Ekouines
                                </h3>
                                <div className="text-emerald-500 font-medium mb-6 uppercase tracking-widest text-sm">
                                    {t('founder.role')}
                                </div>

                                <p className={`text-lg text-slate-300 leading-relaxed font-light italic ${isRTL ? 'font-arabic' : ''}`}>
                                    {t('founder.bio')}
                                </p>

                                <div className={`mt-8 pt-8 border-t border-white/5 grid grid-cols-2 md:grid-cols-3 gap-8 ${isRTL ? 'md:text-right' : 'md:text-left'}`}>
                                    <div>
                                        <div className="text-2xl font-bold text-white tracking-widest">5+</div>
                                        <div className="text-xs text-slate-500 uppercase tracking-wider">{t('founder.stat_exp')}</div>
                                    </div>
                                    <div>
                                        <div className="text-2xl font-bold text-white tracking-widest">100%</div>
                                        <div className="text-xs text-slate-500 uppercase tracking-wider">{t('founder.stat_dedication')}</div>
                                    </div>
                                    <div className="hidden md:block">
                                        <div className="text-2xl font-bold text-white tracking-widest">∞</div>
                                        <div className="text-xs text-slate-500 uppercase tracking-wider">{t('founder.stat_vision')}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}
