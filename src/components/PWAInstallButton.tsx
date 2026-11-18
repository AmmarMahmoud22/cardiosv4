import React, { useState } from 'react';
import { Download, Smartphone, Share, PlusSquare, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { useLanguage } from '../context/LanguageContext';

interface PWAInstallButtonProps {
  variant?: 'light' | 'dark' | 'compact';
  className?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'light',
  className = '',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const { isRTL, direction } = useLanguage();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  const baseStyle =
    variant === 'dark'
      ? 'bg-teal-500/20 hover:bg-teal-500/30 text-teal-200 border border-teal-400/30'
      : variant === 'compact'
      ? 'bg-white/15 hover:bg-white/25 text-white border border-white/25'
      : 'bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200/80';

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${baseStyle} ${className}`}
        title={isRTL ? 'تثبيت التطبيق على جهازك للعمل السريع وبدون إنترنت' : 'Install Cardios App'}
      >
        <Download size={14} />
        <span className={variant === 'compact' ? 'hidden sm:inline' : ''}>
          {isRTL ? 'تثبيت التطبيق' : 'Install App'}
        </span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${baseStyle} ${className}`}
          title={isRTL ? 'تثبيت على الآيفون والآيباد' : 'Install on iPhone / iPad'}
        >
          <Smartphone size={14} />
          <span className={variant === 'compact' ? 'hidden sm:inline' : ''}>
            {isRTL ? 'تثبيت التطبيق' : 'Install App'}
          </span>
        </button>

        {showIOSGuide && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4"
            dir={direction}
          >
            <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center border border-teal-200">
                    <Smartphone size={18} />
                  </div>
                  <h3 className="text-sm font-black text-slate-900">
                    {isRTL ? 'تثبيت Cardios على iPhone / iPad' : 'Install Cardios on iPhone / iPad'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
                <div className="flex items-start gap-2.5 bg-slate-50 p-3 rounded-2xl border border-slate-200/70">
                  <Share size={18} className="text-blue-600 shrink-0 mt-0.5" />
                  <p>
                    {isRTL ? (
                      <>
                        1. اضغط على زر <strong>المشاركة (Share)</strong> في شريط متصفح Safari بالأسفل.
                      </>
                    ) : (
                      <>
                        1. Tap the <strong>Share</strong> button in the Safari browser toolbar.
                      </>
                    )}
                  </p>
                </div>
                <div className="flex items-start gap-2.5 bg-slate-50 p-3 rounded-2xl border border-slate-200/70">
                  <PlusSquare size={18} className="text-teal-600 shrink-0 mt-0.5" />
                  <p>
                    {isRTL ? (
                      <>
                        2. مرر للأسفل واختر <strong>إضافة إلى الشاشة الرئيسية (Add to Home Screen)</strong> لتعمل كأيقونة تطبيق مستقل.
                      </>
                    ) : (
                      <>
                        2. Scroll down and tap <strong>Add to Home Screen</strong>.
                      </>
                    )}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="w-full rounded-xl bg-teal-600 hover:bg-teal-700 py-2.5 text-xs font-bold text-white transition-all cursor-pointer"
              >
                {isRTL ? 'فهمت' : 'Got it'}
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
