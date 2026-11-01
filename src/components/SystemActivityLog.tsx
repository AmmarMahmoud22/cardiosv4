import React, { useState, useMemo } from 'react';
import {
  Activity,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Info,
  Search,
  Filter,
  RefreshCw,
  Download,
  Trash2,
  Stethoscope,
  FlaskConical,
  Cpu,
  Clock,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Radio,
  PlusCircle,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';
import {
  AnalyticsEvent,
  recordSystemActivityEvent,
  trackClinicApproval,
  trackLabConnection,
  trackErrorReport
} from '../lib/analytics';
import { useLanguage } from '../context/LanguageContext';

interface SystemActivityLogProps {
  events: AnalyticsEvent[];
  onClearLogs?: () => void;
}

export default function SystemActivityLog({ events, onClearLogs }: SystemActivityLogProps) {
  const { language, isRTL, t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'clinic' | 'lab' | 'error' | 'system'>('all');
  const [severityFilter, setSeverityFilter] = useState<'all' | 'error' | 'warning' | 'success' | 'info'>('all');
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  // Filtered Events
  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      // Type matching
      let matchesType = true;
      if (typeFilter === 'clinic') {
        matchesType = ev.type === 'clinic_signup' || ev.type === 'clinic_approval' || ev.type === 'demo_doctor';
      } else if (typeFilter === 'lab') {
        matchesType = ev.type === 'lab_signup' || ev.type === 'lab_connection' || ev.type === 'demo_lab';
      } else if (typeFilter === 'error') {
        matchesType = ev.type === 'error_report' || ev.severity === 'error' || ev.severity === 'warning';
      } else if (typeFilter === 'system') {
        matchesType = ev.type === 'system_operation' || ev.type === 'visit' || ev.type === 'demo_patient';
      }

      // Severity matching
      const matchesSeverity = severityFilter === 'all' || ev.severity === severityFilter;

      // Text search matching
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        ev.title.toLowerCase().includes(q) ||
        (ev.details && ev.details.toLowerCase().includes(q)) ||
        (ev.source && ev.source.toLowerCase().includes(q)) ||
        (ev.device && ev.device.toLowerCase().includes(q));

      return matchesType && matchesSeverity && matchesSearch;
    });
  }, [events, typeFilter, severityFilter, searchQuery]);

  // Statistics counters
  const totalCount = events.length;
  const clinicEventsCount = events.filter(e => e.type === 'clinic_signup' || e.type === 'clinic_approval').length;
  const labEventsCount = events.filter(e => e.type === 'lab_signup' || e.type === 'lab_connection').length;
  const errorEventsCount = events.filter(e => e.type === 'error_report' || e.severity === 'error' || e.severity === 'warning').length;

  // Format relative timestamp
  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMins / 60);

      if (diffMins < 1) return isRTL ? 'الآن' : 'Just now';
      if (diffMins < 60) return isRTL ? `منذ ${diffMins} دقيقة` : `${diffMins}m ago`;
      if (diffHours < 24) return isRTL ? `منذ ${diffHours} ساعة` : `${diffHours}h ago`;
      return date.toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return isoString;
    }
  };

  // Helper icons and colors based on event type and severity
  const getEventBadge = (event: AnalyticsEvent) => {
    if (event.type === 'error_report' || event.severity === 'error') {
      return {
        icon: AlertCircle,
        bg: 'bg-rose-50',
        text: 'text-rose-700',
        border: 'border-rose-200',
        badge: isRTL ? 'تقرير خطأ' : 'Error Alert'
      };
    }
    if (event.severity === 'warning') {
      return {
        icon: AlertTriangle,
        bg: 'bg-amber-50',
        text: 'text-amber-700',
        border: 'border-amber-200',
        badge: isRTL ? 'تحذير تشغيلي' : 'Warning'
      };
    }
    if (event.type === 'clinic_signup' || event.type === 'clinic_approval') {
      return {
        icon: Stethoscope,
        bg: 'bg-teal-50',
        text: 'text-teal-700',
        border: 'border-teal-200',
        badge: isRTL ? 'تسجيل عيادة' : 'Clinic Registration'
      };
    }
    if (event.type === 'lab_signup' || event.type === 'lab_connection') {
      return {
        icon: FlaskConical,
        bg: 'bg-sky-50',
        text: 'text-sky-700',
        border: 'border-sky-200',
        badge: isRTL ? 'اتصال معملي' : 'Lab Connection'
      };
    }
    return {
      icon: Activity,
      bg: 'bg-indigo-50',
      text: 'text-indigo-700',
      border: 'border-indigo-200',
      badge: isRTL ? 'عملية نظام' : 'System Event'
    };
  };

  // Simulation Triggers (allowing admin to test real-time logging)
  const handleSimulateEvent = async (type: 'clinic' | 'lab' | 'error') => {
    setIsSimulating(true);
    try {
      if (type === 'clinic') {
        const randomCodes = ['CLINIC-ALEX-302', 'CLINIC-GIZA-109', 'CLINIC-MANSOURA-404'];
        const randomNames = ['د/ شريف العادلي', 'د/ مريم النجار', 'د/ يوسف البدري'];
        const chosen = Math.floor(Math.random() * randomNames.length);
        await recordSystemActivityEvent({
          type: 'clinic_signup',
          title: `تسجيل عيادة جديدة: ${randomNames[chosen]}`,
          details: `كود: ${randomCodes[chosen]} • استشاري قسطرة وتصوير شرايين القلب • بانتظار الاعتماد`,
          severity: 'info',
          source: 'Clinic Portal',
          metadata: { clinicCode: randomCodes[chosen], autoDetected: true }
        });
      } else if (type === 'lab') {
        const randomLabs = ['معمل ألفا التخصصي', 'مختبر كايرو سكان', 'معمل النيل للتحاليل'];
        const chosen = Math.floor(Math.random() * randomLabs.length);
        await trackLabConnection(randomLabs[chosen], 'عيادة د/ حسام فؤاد', 'Troponin I + Lipid Panel (فحص إنزيمات حاد)');
      } else if (type === 'error') {
        await trackErrorReport(
          'تنبيه اختناق كوتة استعلامات الذكاء الاصطناعي (AI Quota 92%)',
          'عيادة د/ محمد الصاوي تجاوزت 92% من حصة Gemini Flash • تفعيل الترشيد التلقائي للطلبات',
          'warning',
          'Gemini Rate Guard'
        );
      }
    } finally {
      setTimeout(() => setIsSimulating(false), 500);
    }
  };

  // Export Events to CSV
  const handleExportCSV = () => {
    const headers = ['معرف الحدث', 'النوع', 'العنوان', 'التفاصيل', 'مستوى الأهمية', 'المصدر', 'الجهاز', 'التوقيت'];
    const rows = filteredEvents.map(e => [
      e.id,
      e.type,
      `"${e.title.replace(/"/g, '""')}"`,
      `"${(e.details || '').replace(/"/g, '""')}"`,
      e.severity || 'info',
      e.source || 'Platform',
      e.device || 'Web',
      e.timestamp
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `CardiOS-System-Activity-Log-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white/80 backdrop-blur-xl border border-white/90 rounded-3xl p-5 sm:p-7 shadow-[0_8px_30px_rgba(15,23,42,0.04)] space-y-6">
      {/* Header and Live Status Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-teal-50 text-teal-600 border border-teal-200/80 flex items-center justify-center font-bold shadow-xs">
              <Activity size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-slate-900">
                  {isRTL ? 'سجل نشاط المنصة الحي (System Activity Log)' : 'Real-time System Activity Log'}
                </h2>
                <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
                  <span>{isRTL ? 'بث حي ومباشر' : 'Live Stream'}</span>
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {isRTL
                  ? 'رصد متصل في الوقت الفعلي لتسجيلات العيادات، اتصالات المعامل، وتقارير أخطاء وتنبيهات النظام'
                  : 'Real-time telemetry tracking clinic registrations, diagnostic lab connections, and error reports'}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons: Simulate test events & Export */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Simulation Menu */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/80">
            <button
              onClick={() => handleSimulateEvent('clinic')}
              disabled={isSimulating}
              className="px-2.5 py-1 bg-white hover:bg-slate-50 text-teal-700 rounded-lg text-xs font-bold transition-all shadow-2xs flex items-center gap-1 cursor-pointer disabled:opacity-50"
              title={isRTL ? 'محاكاة تسجيل عيادة جديدة' : 'Simulate Clinic Registration'}
            >
              <Stethoscope size={13} />
              <span className="hidden sm:inline">{isRTL ? '+ عيادة' : '+ Clinic'}</span>
            </button>
            <button
              onClick={() => handleSimulateEvent('lab')}
              disabled={isSimulating}
              className="px-2.5 py-1 bg-white hover:bg-slate-50 text-sky-700 rounded-lg text-xs font-bold transition-all shadow-2xs flex items-center gap-1 cursor-pointer disabled:opacity-50"
              title={isRTL ? 'محاكاة اتصال معمل تحاليل' : 'Simulate Lab Connection'}
            >
              <FlaskConical size={13} />
              <span className="hidden sm:inline">{isRTL ? '+ معمل' : '+ Lab'}</span>
            </button>
            <button
              onClick={() => handleSimulateEvent('error')}
              disabled={isSimulating}
              className="px-2.5 py-1 bg-white hover:bg-slate-50 text-rose-700 rounded-lg text-xs font-bold transition-all shadow-2xs flex items-center gap-1 cursor-pointer disabled:opacity-50"
              title={isRTL ? 'محاكاة تقرير خطأ/تنبيه' : 'Simulate Error Report'}
            >
              <AlertTriangle size={13} />
              <span className="hidden sm:inline">{isRTL ? '+ خطأ' : '+ Error'}</span>
            </button>
          </div>

          <button
            onClick={handleExportCSV}
            className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
            title="تصدير السجل إلى ملف CSV"
          >
            <Download size={14} className="text-teal-600" />
            <span className="hidden sm:inline">{isRTL ? 'تصدير السجل' : 'Export Log'}</span>
          </button>
        </div>
      </div>

      {/* Metric Counters Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div
          onClick={() => { setTypeFilter('all'); setSeverityFilter('all'); }}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            typeFilter === 'all' && severityFilter === 'all'
              ? 'bg-teal-50/70 border-teal-300 shadow-xs'
              : 'bg-white/90 border-slate-200/80 hover:bg-slate-50/60 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>{isRTL ? 'كافة الأحداث' : 'Total Events'}</span>
            <Activity size={15} className="text-teal-600" />
          </div>
          <div className="text-xl font-black text-slate-900 font-mono mt-1">{totalCount}</div>
        </div>

        <div
          onClick={() => setTypeFilter('clinic')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            typeFilter === 'clinic'
              ? 'bg-teal-50/70 border-teal-300 shadow-xs'
              : 'bg-white/90 border-slate-200/80 hover:bg-slate-50/60 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>{isRTL ? 'تسجيلات العيادات' : 'Clinic Signups'}</span>
            <Stethoscope size={15} className="text-teal-600" />
          </div>
          <div className="text-xl font-black text-teal-700 font-mono mt-1">{clinicEventsCount}</div>
        </div>

        <div
          onClick={() => setTypeFilter('lab')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            typeFilter === 'lab'
              ? 'bg-sky-50/70 border-sky-300 shadow-xs'
              : 'bg-white/90 border-slate-200/80 hover:bg-slate-50/60 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>{isRTL ? 'اتصالات المعامل' : 'Lab Connections'}</span>
            <FlaskConical size={15} className="text-sky-600" />
          </div>
          <div className="text-xl font-black text-sky-700 font-mono mt-1">{labEventsCount}</div>
        </div>

        <div
          onClick={() => setTypeFilter('error')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            typeFilter === 'error'
              ? 'bg-rose-50/70 border-rose-300 shadow-xs'
              : 'bg-white/90 border-slate-200/80 hover:bg-slate-50/60 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>{isRTL ? 'التنبيهات والأخطاء' : 'Alerts & Errors'}</span>
            <AlertTriangle size={15} className="text-rose-600" />
          </div>
          <div className="text-xl font-black text-rose-700 font-mono mt-1">{errorEventsCount}</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'all', label: isRTL ? 'الكل' : 'All' },
            { id: 'clinic', label: isRTL ? 'العيادات' : 'Clinics' },
            { id: 'lab', label: isRTL ? 'المعامل' : 'Labs' },
            { id: 'error', label: isRTL ? 'الأخطاء والتحذيرات' : 'Errors' },
            { id: 'system', label: isRTL ? 'العمليات' : 'System' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setTypeFilter(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                typeFilter === tab.id
                  ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search input */}
        <div className="relative w-full sm:w-64">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isRTL ? 'بحث بالعيادة، المعمل، الخطأ...' : 'Filter events...'}
            className="w-full bg-white border border-slate-300 text-xs rounded-xl px-3.5 py-2 pr-8 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-teal-500 shadow-xs"
          />
          <Search size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
        </div>
      </div>

      {/* Real-time Events Feed */}
      <div className="space-y-2.5">
        {filteredEvents.length === 0 ? (
          <div className="bg-white/90 border border-slate-200/80 rounded-2xl p-8 text-center space-y-2">
            <Activity size={28} className="mx-auto text-slate-400" />
            <p className="text-xs font-bold text-slate-600">
              {isRTL ? 'لا توجد أحداث مطابقة لخيارات الفلترة الحالية' : 'No events matching current filters'}
            </p>
            <button
              onClick={() => { setTypeFilter('all'); setSeverityFilter('all'); setSearchQuery(''); }}
              className="text-xs text-teal-700 hover:text-teal-800 font-bold underline cursor-pointer"
            >
              {isRTL ? 'إعادة ضبط الفلاتر' : 'Reset Filters'}
            </button>
          </div>
        ) : (
          filteredEvents.map((event) => {
            const badge = getEventBadge(event);
            const Icon = badge.icon;
            const isExpanded = expandedEventId === event.id;

            return (
              <div
                key={event.id}
                className="bg-white/90 backdrop-blur-md border border-slate-200/80 hover:border-teal-300 rounded-2xl p-4 transition-all shadow-xs space-y-2"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-xl ${badge.bg} ${badge.text} border ${badge.border} flex items-center justify-center font-bold shrink-0 mt-0.5`}>
                      <Icon size={18} />
                    </div>

                    <div className="space-y-0.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-black text-slate-900">{event.title}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.2 rounded-full border ${badge.bg} ${badge.text} ${badge.border}`}>
                          {badge.badge}
                        </span>
                      </div>
                      {event.details && (
                        <p className="text-xs text-slate-600 leading-relaxed font-sans">{event.details}</p>
                      )}
                    </div>
                  </div>

                  {/* Timestamp & Toggle */}
                  <div className="flex items-center gap-3 shrink-0 text-slate-500 text-xs font-mono self-end sm:self-center">
                    <span className="flex items-center gap-1" title={event.timestamp}>
                      <Clock size={12} className="text-slate-400" />
                      <span>{formatTime(event.timestamp)}</span>
                    </span>

                    <button
                      onClick={() => setExpandedEventId(isExpanded ? null : event.id)}
                      className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                      title={isRTL ? 'تفاصيل الحدث الفنية' : 'Event Technical Details'}
                    >
                      {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                    </button>
                  </div>
                </div>

                {/* Expanded Details Drawer */}
                {isExpanded && (
                  <div className="pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] font-mono text-slate-600 bg-slate-50/70 p-3 rounded-xl">
                    <div>
                      <span className="text-slate-400 font-sans block">{isRTL ? 'معرف الحدث (Event ID):' : 'Event ID:'}</span>
                      <span className="font-bold text-slate-800">{event.id}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-sans block">{isRTL ? 'مصدر الإشعار (Source):' : 'Source Node:'}</span>
                      <span className="font-bold text-slate-800">{event.source || 'CardiOS Telemetry Engine'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-sans block">{isRTL ? 'بيئة العميل (Client Agent):' : 'Client Agent:'}</span>
                      <span className="font-bold text-slate-800">{event.device || 'System Daemon'}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
