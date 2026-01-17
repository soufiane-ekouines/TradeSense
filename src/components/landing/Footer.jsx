import React from 'react';
import { Twitter, Linkedin, Instagram, Mail, Globe } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export default function Footer() {
    const { t, isRTL, language } = useLanguage();

    const langNames = {
        en: 'English',
        fr: 'Français',
        ar: 'العربية'
    };

    return (
        <footer className={`bg-[#020202] border-t border-slate-900 pt-16 pb-8 ${isRTL ? 'text-right' : 'text-left'}`}>
            <div className="container mx-auto px-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
                    {/* Brand Column */}
                    <div className="col-span-1 md:col-span-1 space-y-6">
                        <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <div className="w-8 h-8 rounded bg-emerald-500 flex items-center justify-center">
                                <span className="font-bold text-black text-lg">T</span>
                            </div>
                            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400 font-inherit">
                                TradeSense AI
                            </span>
                        </div>
                        <p className="text-slate-500 text-sm leading-relaxed">
                            {t('footer.brand_desc')}
                        </p>
                        <div className={`flex items-center gap-4 ${isRTL ? 'justify-end' : ''}`}>
                            <a href="#" className="text-slate-500 hover:text-white transition-colors"><Twitter size={20} /></a>
                            <a href="#" className="text-slate-500 hover:text-white transition-colors"><Linkedin size={20} /></a>
                            <a href="#" className="text-slate-500 hover:text-white transition-colors"><Instagram size={20} /></a>
                        </div>
                    </div>

                    {/* Links Columns */}
                    <div>
                        <h4 className="text-white font-bold mb-6">{t('footer.col_platform')}</h4>
                        <ul className="space-y-4 text-sm text-slate-500">
                            <li><a href="#" className="hover:text-emerald-500 transition-colors">{t('footer.challenges')}</a></li>
                            <li><a href="#" className="hover:text-emerald-500 transition-colors">{t('footer.pricing')}</a></li>
                            <li><a href="#" className="hover:text-emerald-500 transition-colors">{t('footer.ai_dashboard')}</a></li>
                            <li><a href="#" className="hover:text-emerald-500 transition-colors">{t('footer.leaderboard')}</a></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="text-white font-bold mb-6">{t('footer.col_company')}</h4>
                        <ul className="space-y-4 text-sm text-slate-500">
                            <li><a href="#" className="hover:text-emerald-500 transition-colors">{t('footer.about')}</a></li>
                            <li><a href="#" className="hover:text-emerald-500 transition-colors">{t('footer.careers')}</a></li>
                            <li><a href="#" className="hover:text-emerald-500 transition-colors">{t('footer.blog')}</a></li>
                            <li><a href="#" className="hover:text-emerald-500 transition-colors">{t('footer.contact')}</a></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="text-white font-bold mb-6">{t('footer.col_legal')}</h4>
                        <ul className="space-y-4 text-sm text-slate-500">
                            <li><a href="#" className="hover:text-emerald-500 transition-colors">{t('footer.terms')}</a></li>
                            <li><a href="#" className="hover:text-emerald-500 transition-colors">{t('footer.privacy')}</a></li>
                            <li><a href="#" className="hover:text-emerald-500 transition-colors">{t('footer.risk')}</a></li>
                        </ul>
                    </div>
                </div>

                <div className={`border-t border-slate-900 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-600 ${isRTL ? 'md:flex-row-reverse' : ''}`}>
                    <p>{t('footer.copyright')}</p>
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                            <span>{t('footer.country')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Globe size={14} />
                            <span>{langNames[language]}</span>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}
