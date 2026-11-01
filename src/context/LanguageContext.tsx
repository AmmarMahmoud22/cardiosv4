import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { translations, Language, TranslationKey } from '../lib/translations';
import i18n from '../lib/i18n';
import { Globe } from 'lucide-react';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  isRTL: boolean;
  direction: 'rtl' | 'ltr';
  t: (key: TranslationKey | string, fallback?: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('cardios_app_language') as Language;
      if (saved === 'ar' || saved === 'en') {
        return saved;
      }
    }
    return 'ar'; // Default language Arabic
  });

  const isRTL = language === 'ar';
  const direction = isRTL ? 'rtl' : 'ltr';

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('cardios_app_language', language);
      document.documentElement.dir = direction;
      document.documentElement.lang = language;
      // Sync with i18next
      if (i18n && i18n.changeLanguage) {
        i18n.changeLanguage(language).catch(() => {});
      }
    }
  }, [language, direction]);

  const setLanguage = (newLang: Language) => {
    setLanguageState(newLang);
  };

  const toggleLanguage = () => {
    setLanguageState(prev => (prev === 'ar' ? 'en' : 'ar'));
  };

  const t = (key: TranslationKey | string, fallback?: string): string => {
    const currentDict = translations[language] as Record<string, string>;
    if (currentDict && currentDict[key]) {
      return currentDict[key];
    }
    // Fallback to English dict if available
    const enDict = translations.en as Record<string, string>;
    if (enDict && enDict[key]) {
      return enDict[key];
    }
    return fallback || key;
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        toggleLanguage,
        isRTL,
        direction,
        t
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

/**
 * Reusable Language Switcher Component
 * Supports compact style for navbars or full style with label
 */
export function LanguageSwitcher({
  variant = 'navbar',
  className = ''
}: {
  variant?: 'navbar' | 'pill' | 'minimal' | 'dark' | 'light';
  className?: string;
}) {
  const { language, toggleLanguage, t } = useLanguage();

  if (variant === 'light') {
    return (
      <button
        onClick={toggleLanguage}
        className={`bg-white/90 hover:bg-white text-slate-700 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer select-none ${className}`}
        title={language === 'ar' ? 'Switch to English' : 'التبديل إلى العربية'}
      >
        <Globe size={14} className="text-teal-600" />
        <span className="font-semibold">{language === 'ar' ? 'English' : 'العربية'}</span>
        <span className="text-[10px] bg-teal-50 text-teal-700 border border-teal-200 px-1.5 py-0.2 rounded font-bold uppercase font-mono">
          {language === 'ar' ? 'EN' : 'AR'}
        </span>
      </button>
    );
  }

  if (variant === 'dark') {
    return (
      <button
        onClick={toggleLanguage}
        className={`bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer select-none ${className}`}
        title={language === 'ar' ? 'Switch to English' : 'التبديل إلى العربية'}
      >
        <Globe size={14} className="text-teal-400" />
        <span className="font-mono">{language === 'ar' ? 'English' : 'العربية'}</span>
        <span className="text-[10px] bg-slate-900 text-teal-400 px-1.5 py-0.2 rounded font-bold uppercase font-mono">
          {language === 'ar' ? 'EN' : 'AR'}
        </span>
      </button>
    );
  }

  if (variant === 'pill') {
    return (
      <div className={`inline-flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200/80 shadow-2xs ${className}`}>
        <button
          onClick={() => toggleLanguage()}
          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
            language === 'ar' ? 'bg-white text-teal-700 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          العربية
        </button>
        <button
          onClick={() => toggleLanguage()}
          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
            language === 'en' ? 'bg-white text-teal-700 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          English
        </button>
      </div>
    );
  }

  // Default navbar variant
  return (
    <button
      onClick={toggleLanguage}
      className={`px-3 py-1.5 bg-slate-100 hover:bg-slate-200/80 text-slate-700 border border-slate-200/90 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer select-none ${className}`}
      title={language === 'ar' ? 'Switch to English for International Staff' : 'التبديل إلى العربية'}
    >
      <Globe size={14} className="text-teal-600" />
      <span className="font-medium">{language === 'ar' ? 'English' : 'العربية'}</span>
      <span className="text-[10px] bg-white text-teal-700 border border-teal-200 px-1.5 py-0.2 rounded font-black uppercase font-mono shadow-2xs">
        {language === 'ar' ? 'EN' : 'AR'}
      </span>
    </button>
  );
}
