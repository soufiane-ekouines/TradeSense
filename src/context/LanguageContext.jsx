import React, { createContext, useContext, useState, useEffect } from 'react';
import en from '../locales/en.json';
import fr from '../locales/fr.json';
import ar from '../locales/ar.json';

const translations = { en, fr, ar };
const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
    const [language, setLanguage] = useState(localStorage.getItem('language') || 'en');
    const [isRTL, setIsRTL] = useState(language === 'ar');

    useEffect(() => {
        const rtl = language === 'ar';
        setIsRTL(rtl);
        document.documentElement.dir = rtl ? 'rtl' : 'ltr';
        document.documentElement.lang = language;
        localStorage.setItem('language', language);

        // Update body font class for Arabic
        if (rtl) {
            document.body.classList.add('font-arabic');
        } else {
            document.body.classList.remove('font-arabic');
        }
    }, [language]);

    const t = (keyPath) => {
        const keys = keyPath.split('.');
        let result = translations[language];

        for (const key of keys) {
            if (result[key] === undefined) {
                // Fallback to English if key missing in current language
                let fallback = translations['en'];
                for (const fKey of keys) {
                    fallback = fallback[fKey] || keyPath;
                }
                return fallback;
            }
            result = result[key];
        }
        return result;
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t, isRTL }}>
            <div className={isRTL ? 'text-right' : 'text-left'}>
                {children}
            </div>
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => useContext(LanguageContext);
