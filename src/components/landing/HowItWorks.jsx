import React from 'react';
import { motion } from 'framer-motion';
import { User, TrendingUp, Trophy } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

const StepCard = ({ number, title, description, icon: Icon, isRTL }) => {
    return (
        <div className="relative flex-1 z-10 w-full md:w-auto font-inherit">
            <div className="group p-8 rounded-2xl bg-[#0A0A0A] border border-slate-800 hover:border-emerald-500/50 transition-all duration-500 hover:shadow-[0_0_30px_rgba(16,185,129,0.1)] h-full flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500 relative">
                    <div className="absolute inset-0 bg-emerald-500/0 group-hover:bg-emerald-500/10 rounded-2xl transition-colors duration-500"></div>
                    <Icon className="text-slate-400 group-hover:text-emerald-400 transition-colors duration-500" size={32} />
                    <div className={`absolute -top-3 ${isRTL ? '-left-3' : '-right-3'} w-8 h-8 rounded-full bg-[#050505] border border-emerald-500/30 flex items-center justify-center font-bold text-emerald-500 text-sm shadow-lg tracking-normal`}>
                        {number}
                    </div>
                </div>
                <h3 className="text-xl font-bold text-white mb-3 group-hover:text-emerald-400 transition-colors leading-tight">
                    {title}
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                    {description}
                </p>
            </div>
        </div>
    );
};

export default function HowItWorks() {
    const { t, isRTL } = useLanguage();

    return (
        <section className="py-32 bg-[#050505] relative overflow-hidden">
            <div className="container mx-auto px-4 font-inherit">
                <div className="text-center mb-24">
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className="text-3xl md:text-5xl font-bold text-white mb-6"
                    >
                        {t('how_it_works.title_main')} <span className="text-emerald-500">{t('how_it_works.title_accent')}</span>
                    </motion.h2>
                    <p className="text-slate-400 max-w-2xl mx-auto">
                        {t('how_it_works.subtitle')}
                    </p>
                </div>

                <div className="relative flex flex-col md:flex-row items-stretch justify-between gap-8 max-w-6xl mx-auto">
                    <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-800 -translate-y-1/2 hidden md:block z-0 rounded-full"></div>
                    <motion.div
                        initial={{ scaleX: 0 }}
                        whileInView={{ scaleX: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 1.5, ease: "easeInOut" }}
                        className={`absolute top-1/2 left-0 w-full h-1 bg-gradient-to-r ${isRTL ? 'from-emerald-400 to-emerald-600' : 'from-emerald-600 to-emerald-400'} -translate-y-1/2 hidden md:block z-0 origin-${isRTL ? 'right' : 'left'} rounded-full shadow-[0_0_15px_rgba(16,185,129,0.5)]`}
                    ></motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        className="w-full"
                    >
                        <StepCard
                            number="1"
                            isRTL={isRTL}
                            icon={User}
                            title={t('how_it_works.step1_title')}
                            description={t('how_it_works.step1_desc')}
                        />
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.3 }}
                        className="w-full"
                    >
                        <StepCard
                            number="2"
                            isRTL={isRTL}
                            icon={TrendingUp}
                            title={t('how_it_works.step2_title')}
                            description={t('how_it_works.step2_desc')}
                        />
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.5 }}
                        className="w-full"
                    >
                        <StepCard
                            number="3"
                            isRTL={isRTL}
                            icon={Trophy}
                            title={t('how_it_works.step3_title')}
                            description={t('how_it_works.step3_desc')}
                        />
                    </motion.div>
                </div>
            </div>
        </section>
    );
}
