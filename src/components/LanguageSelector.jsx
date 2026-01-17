import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Globe, ChevronDown, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function LanguageSelector() {
    const { language, setLanguage, isRTL } = useLanguage();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    const languages = [
        { code: 'en', name: 'English', flag: '🇺🇸' },
        { code: 'fr', name: 'Français', flag: '🇫🇷' },
        { code: 'ar', name: 'العربية', flag: '🇲🇦' }
    ];

    const currentLang = languages.find(l => l.code === language);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all duration-300 group"
            >
                <Globe size={16} className="text-slate-400 group-hover:text-emerald-400" />
                <span className="text-sm font-medium text-slate-300 group-hover:text-white uppercase">
                    {language}
                </span>
                <ChevronDown
                    size={14}
                    className={`text-slate-500 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
                />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className={`absolute mt-2 w-40 rounded-xl bg-slate-900 border border-white/10 shadow-2xl z-[100] overflow-hidden backdrop-blur-xl ${isRTL ? 'left-0' : 'right-0'}`}
                    >
                        <div className="py-1">
                            {languages.map((lang) => (
                                <button
                                    key={lang.code}
                                    onClick={() => {
                                        setLanguage(lang.code);
                                        setIsOpen(false);
                                    }}
                                    className={`w-full flex items-center justify-between px-4 py-3 text-sm transition-colors hover:bg-emerald-500/10 group ${language === lang.code ? 'text-emerald-400' : 'text-slate-300 hover:text-white'
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <span>{lang.flag}</span>
                                        <span className={lang.code === 'ar' ? 'font-arabic' : ''}>{lang.name}</span>
                                    </div>
                                    {language === lang.code && <Check size={14} />}
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
