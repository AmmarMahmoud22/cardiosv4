import React, {useState} from 'react';
import {
  Activity,
  Users,
  FileText,
  ClipboardList,
  Globe,
  Lock,
  Stethoscope,
  Heart,
  Phone,
  QrCode,
  Sparkles,
  ShieldCheck,
  Calendar as CalendarIcon,
  Plus,
  Home
} from 'lucide-react';
import {useTranslation} from 'react-i18next';
import PatientTable from './PatientTable';
import PatientProfile from './PatientProfile';
import CalendarView from './Calendar';
import PatientMobileDashboard from './PatientMobileDashboard';
import AlertPanel from './AlertPanel';
import NewPatientModal from './NewPatientModal';
import PrescriptionModal from './PrescriptionModal';
import ReportsModal from './ReportsModal';
import GeminiChat from './GeminiChat';

const CLINIC_HOTLINE = '01146963589';

export default function Dashboard({
  onLogout,
  onBackToLanding,
  doctorName = 'استشاري أمراض القلب'
}: {
  onLogout?: () => void;
  onBackToLanding?: () => void;
  doctorName?: string;
}) {
  const {t, i18n} = useTranslation();
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'patients' | 'calendar' | 'patientPortal'>('patients');
  const [showNewPatient, setShowNewPatient] = useState(false);
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
  const [showReportsModal, setShowReportsModal] = useState(false);

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === 'en' ? 'ar' : 'en');
  };

  if (selectedPatientId) {
    return <PatientProfile patientId={selectedPatientId} onBack={() => setSelectedPatientId(null)} />;
  }

  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-6 space-y-6 font-sans" dir="rtl">
      {/* Top Clinic Navigation Bar */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-700 p-0.5 flex items-center justify-center text-white shadow-md overflow-hidden shrink-0">
              <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center">
                <Stethoscope size={22} className="text-blue-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900">لوحة الطبيب السريرية (Doctor EHR)</h1>
                <span className="text-[11px] font-bold bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full border border-blue-200">
                  Cardios Clinic
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                <span>{doctorName} - استشاري أمراض القلب والقسطرة</span>
                <span>• منظومة المتابعة والربط المباشر مع معامل التحاليل</span>
              </p>
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveTab('patients')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'patients'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              سجل المرضى
            </button>
            <button
              onClick={() => setActiveTab('calendar')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'calendar'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              جدول المواعيد
            </button>
            <button
              onClick={() => setActiveTab('patientPortal')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'patientPortal'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
              }`}
            >
              <QrCode size={14} />
              <span>محاكي هاتف المريض (QR Portal)</span>
            </button>
            <button
              onClick={() => setShowPrescriptionModal(true)}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
            >
              الروشتة الذكية
            </button>
            <button
              onClick={() => setShowReportsModal(true)}
              className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
            >
              تقارير الإيكو
            </button>
            <button
              onClick={() => setShowNewPatient(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold border border-blue-200 transition-all"
            >
              <Plus size={14} />
              <span>مريض جديد</span>
            </button>
            {onBackToLanding && (
              <button
                onClick={onBackToLanding}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                title="العودة لصفحة الهبوط الرئيسية"
              >
                <Home size={14} className="text-emerald-400" />
                <span>صفحة الهبوط الرئيسية</span>
              </button>
            )}
            {onLogout && (
              <button
                onClick={onLogout}
                title="تسجيل خروج وقفل لوحة التحكم"
                className="flex items-center gap-1.5 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl text-xs font-bold border border-red-200 transition-colors"
              >
                <Lock size={14} />
                <span>خروج</span>
              </button>
            )}
          </div>
        </div>

        {/* Demo Fast Navigation & Showcase Bar */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-500 font-bold">
            <Sparkles size={14} className="text-amber-500 animate-pulse" />
            <span>تجربة حالات الديمو بنقرة واحدة:</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setSelectedPatientId('1')}
              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl font-bold border border-emerald-200 transition-all"
            >
              🟢 مريض 1: أحمد حسن (دعامة شرايين وضغط مستقر)
            </button>
            <button
              onClick={() => setSelectedPatientId('2')}
              className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-800 rounded-xl font-bold border border-red-200 transition-all"
            >
              🔴 مريض 2: فاطمة علي (ضغط غير منضبط 160/98)
            </button>
            <button
              onClick={() => setSelectedPatientId('3')}
              className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 rounded-xl font-bold border border-indigo-200 transition-all"
            >
              🟡 مريض 3: محمد إبراهيم (قصور قلب متقدم EF 32%)
            </button>
          </div>
        </div>
      </div>

      {showNewPatient && <NewPatientModal onClose={() => setShowNewPatient(false)} />}
      {showPrescriptionModal && <PrescriptionModal onClose={() => setShowPrescriptionModal(false)} />}
      {showReportsModal && <ReportsModal onClose={() => setShowReportsModal(false)} />}

      {/* Statistical Cardiology KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <DashboardCard
          title="المرضى النشطين بالعيادة"
          value="124"
          trend="+12 هذا الشهر"
          icon={<Users className="w-5 h-5 text-blue-600" />}
          bgColor="bg-blue-50"
        />
        <DashboardCard
          title="فحوصات وتحاليل معلقة"
          value="8"
          trend="Lipid & Echo reviews"
          icon={<FileText className="w-5 h-5 text-purple-600" />}
          bgColor="bg-purple-50"
        />
        <DashboardCard
          title="تنبيهات الضغط الحرج (RPM)"
          value="3"
          trend="ضغط &gt; 140/90 mmHg"
          icon={<Activity className="w-5 h-5 text-red-600" />}
          bgColor="bg-red-50"
        />
        <DashboardCard
          title="كشوفات واستشارات اليوم"
          value="15"
          trend="9 تم الانتهاء • 6 متبقي"
          icon={<ClipboardList className="w-5 h-5 text-emerald-600" />}
          bgColor="bg-emerald-50"
        />
      </div>

      {/* Main Content View */}
      {activeTab === 'patients' ? (
        <>
          <PatientTable onSelectPatient={setSelectedPatientId} />
          <AlertPanel />
        </>
      ) : activeTab === 'calendar' ? (
        <CalendarView />
      ) : (
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
          <div className="mb-4 pb-3 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-800">محاكي هاتف المريض التفاعلي (Mobile QR Simulator)</h2>
              <p className="text-xs text-slate-500">هذه هي الشاشة المخصصة للمريض عند مسح رمز الاستجابة السريعة (QR) من هاتفه المحمول</p>
            </div>
            <button
              onClick={() => setActiveTab('patients')}
              className="text-xs text-blue-600 font-bold hover:underline"
            >
              العودة للوحة الطبيب &larr;
            </button>
          </div>
          <div className="max-w-md mx-auto">
            <PatientMobileDashboard patientId="1" isPortalMode={false} />
          </div>
        </div>
      )}

      {/* Floating Global AI Assistant */}
      <GeminiChat />

      {/* Modals */}
      {showNewPatient && (
        <NewPatientModal
          onClose={() => setShowNewPatient(false)}
          onPatientAdded={(id) => {
            setSelectedPatientId(id);
            setShowNewPatient(false);
          }}
        />
      )}

      {showPrescriptionModal && (
        <PrescriptionModal onClose={() => setShowPrescriptionModal(false)} />
      )}

      {showReportsModal && (
        <ReportsModal onClose={() => setShowReportsModal(false)} />
      )}
    </div>
  );
}

function DashboardCard({
  title,
  value,
  trend,
  icon,
  bgColor
}: {
  title: string;
  value: string;
  trend?: string;
  icon: React.ReactNode;
  bgColor: string;
}) {
  return (
    <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200 flex items-center gap-4">
      <div className={`p-3.5 ${bgColor} rounded-2xl shrink-0`}>
        {icon}
      </div>
      <div>
        <p className="text-slate-400 text-xs font-semibold">{title}</p>
        <p className="text-2xl font-black text-slate-900 font-mono mt-0.5">{value}</p>
        {trend && (
          <p className="text-[11px] text-slate-500 mt-0.5 font-medium">{trend}</p>
        )}
      </div>
    </div>
  );
}
