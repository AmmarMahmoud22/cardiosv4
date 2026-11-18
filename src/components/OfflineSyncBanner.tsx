import React from 'react';
import { WifiOff, RefreshCw, CheckCircle2 } from 'lucide-react';
import { useOnlineSync } from '../hooks/useOnlineSync';
import { useLanguage } from '../context/LanguageContext';

export const OfflineSyncBanner: React.FC = () => {
  const { isOnline, isSyncing, justSynced } = useOnlineSync();
  const { isRTL, direction } = useLanguage();

  if (isOnline && !isSyncing && !justSynced) {
    return null;
  }

  if (!isOnline) {
    return (
      <div
        dir={direction}
        className="fixed bottom-4 left-4 right-4 sm:right-auto sm:max-w-md z-50 flex items-center gap-2.5 rounded-2xl bg-amber-600 px-4 py-2.5 text-xs font-bold text-white shadow-xl border border-amber-400/50"
      >
        <WifiOff size={16} className="shrink-0 animate-pulse" />
        <span>
          {isRTL
            ? 'وضع العمل بدون إنترنت — يتم استخدام النسخة المخبأة وحفظ التعديلات محلياً للمزامنة التلقائية'
            : 'Offline Mode — Cached records active; changes queued for automatic sync'}
        </span>
      </div>
    );
  }

  if (isSyncing) {
    return (
      <div
        dir={direction}
        className="fixed bottom-4 left-4 right-4 sm:right-auto sm:max-w-sm z-50 flex items-center gap-2.5 rounded-2xl bg-sky-600 px-4 py-2.5 text-xs font-bold text-white shadow-xl border border-sky-400/50"
      >
        <RefreshCw size={16} className="shrink-0 animate-spin" />
        <span>
          {isRTL
            ? 'تمت استعادة الاتصال — جاري مزامنة التعديلات المحفوظة...'
            : 'Back online — Syncing offline updates...'}
        </span>
      </div>
    );
  }

  return (
    <div
      dir={direction}
      className="fixed bottom-4 left-4 right-4 sm:right-auto sm:max-w-sm z-50 flex items-center gap-2.5 rounded-2xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-xl border border-emerald-400/50"
    >
      <CheckCircle2 size={16} className="shrink-0" />
      <span>
        {isRTL
          ? 'تمت مزامنة كافة البيانات المحفوظة مع السحابة بنجاح'
          : 'All queued offline data synced to cloud'}
      </span>
    </div>
  );
};
