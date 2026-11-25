import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, onSnapshot, getDoc, query, where } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '../lib/firebase';
import {
  Activity,
  Users,
  FileText,
  Stethoscope,
  QrCode,
  Calendar as CalendarIcon,
  Plus,
  Menu,
  X,
  Pill,
  ShieldAlert,
  MessageSquare,
  ChevronRight,
  ChevronLeft,
  Send,
  Printer,
  Settings,
  ShieldCheck,
  BarChart3,
  HeartPulse,
  Building2,
  Sparkles,
  Calculator,
  User,
  Wallet,
  UserPlus
} from 'lucide-react';
import { useLanguage, LanguageSwitcher } from '../context/LanguageContext';
import PatientTable from './PatientTable';
import PatientProfile from './PatientProfile';
import CalendarView from './Calendar';
import PatientMobileDashboard from './PatientMobileDashboard';
import AlertPanel from './AlertPanel';
import NewPatientModal from './NewPatientIntakeModal';
import PrescriptionModal from './PrescriptionModal';
import ReportsModal from './ReportsModal';
import GeminiChat from './GeminiChat';
import CardiologyReport from './CardiologyReport';
import DoctorAnalyticsPanel from './DoctorAnalyticsPanel';
import DoctorSettingsModal from './DoctorSettingsModal';
import ClinicalCalculatorsModal from './ClinicalCalculatorsModal';
import UserProfileModal from './UserProfileModal';
import ClinicCashboxPanel from './ClinicCashboxPanel';
import ClinicStaffModal from './ClinicStaffModal';
import { PWAInstallButton } from './PWAInstallButton';
import { DoctorScheduleSettings } from '../types/appointment';
import { StaffRole } from '../types/clinic';

export default function Dashboard({
  onLogout,
  onBackToLanding,
  doctorId: initialDoctorId = '',
  doctorName: initialDoctorName = '',
  clinicCode: initialClinicCode = '',
  staffRole = 'doctor',
  staffName = '',
  onOpenAdminPortal
}: {
  onLogout?: () => void;
  onBackToLanding?: () => void;
  onOpenAdminPortal?: () => void;
  doctorId?: string;
  doctorName?: string;
  clinicCode?: string;
  staffRole?: StaffRole;
  staffName?: string;
}) {
  const { language, direction, isRTL, t } = useLanguage();
  const isReceptionist = staffRole === 'receptionist';
  const [currentDoctorId, setCurrentDoctorId] = useState<string>(initialDoctorId);
  const [currentDoctorName, setCurrentDoctorName] = useState<string>(initialDoctorName);
  const [currentClinicCode, setCurrentClinicCode] = useState<string>(initialClinicCode);
  const [currentClinicName, setCurrentClinicName] = useState<string>(
    initialDoctorName ? `عيادة ${initialDoctorName}` : 'عيادة أمراض القلب والقسطرة'
  );
  const [currentSpecialty, setCurrentSpecialty] = useState<string>('استشاري أمراض القلب والأوعية الدموية');
  const [clinicLogoUrl, setClinicLogoUrl] = useState<string>('');
  const [clinicLogoIcon, setClinicLogoIcon] = useState<string>('HeartPulse');
  const [staffUids, setStaffUids] = useState<string[]>([]);
  const [authUid, setAuthUid] = useState<string>(() => auth.currentUser?.uid || '');

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setAuthUid(u?.uid || ''));
    return () => unsub();
  }, []);

  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'patients' | 'reports' | 'messages' | 'calendar' | 'analytics' | 'cashbox' | 'patientPortal'>('patients');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const [showNewPatient, setShowNewPatient] = useState(false);
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
  const [showReportsModal, setShowReportsModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showClinicalCalculators, setShowClinicalCalculators] = useState(false);
  const [showUserProfileModal, setShowUserProfileModal] = useState(false);
  const [showClinicStaffModal, setShowClinicStaffModal] = useState(false);
  const [clinicDrawerOpen, setClinicDrawerOpen] = useState(false);

  // Doctor account status & AI governance
  const [doctorStatus, setDoctorStatus] = useState<'active' | 'suspended' | 'pending'>('active');
  const [isAiBlocked, setIsAiBlocked] = useState<boolean>(false);
  const [aiQueriesUsed, setAiQueriesUsed] = useState<number>(0);
  const [aiQuotaLimit, setAiQuotaLimit] = useState<number>(200);

  // Real doctor dynamic stats
  const [realStats, setRealStats] = useState({
    activePatients: 0,
    pendingLabs: 0,
    rpmAlerts: 0,
    todayAppointments: 0,
    completedAppointments: 0
  });

  const [doctorEmail, setDoctorEmail] = useState<string>('');
  const [doctorPhone, setDoctorPhone] = useState<string>('');
  const [doctorPatients, setDoctorPatients] = useState<Array<{ id: string; name: string; phone?: string }>>([]);
  const [patientsRefreshKey, setPatientsRefreshKey] = useState<number>(0);

  // Guard activeTab if receptionist opens a restricted tab
  useEffect(() => {
    if (isReceptionist && (activeTab === 'analytics' || activeTab === 'reports')) {
      setActiveTab('patients');
    }
  }, [isReceptionist, activeTab]);

  // Sync props when switching logged-in doctor accounts without unmounting
  useEffect(() => {
    setCurrentDoctorId(initialDoctorId);
    setCurrentDoctorName(initialDoctorName);
    setCurrentClinicCode(initialClinicCode);
    setCurrentClinicName(initialDoctorName ? `عيادة ${initialDoctorName}` : 'عيادة أمراض القلب والقسطرة');
    setCurrentSpecialty('استشاري أمراض القلب والأوعية الدموية');
    setDoctorEmail('');
    setDoctorPhone('');
    setSelectedPatientId(null);
    setDoctorStatus('active');
    setActiveTab('patients');
  }, [initialDoctorId, initialDoctorName, initialClinicCode]);

  // Direct Lab Messages State
  const [newMessageText, setNewMessageText] = useState('');
  const [messagesList, setMessagesList] = useState<Array<{
    id: string;
    sender: string;
    role: string;
    time: string;
    patientName: string;
    text: string;
    urgent: boolean;
  }>>([]);

  useEffect(() => {
    setMessagesList([]);
  }, [currentDoctorId]);

  // Real-time listener for current doctor schedule & logo settings
  useEffect(() => {
    if (!currentDoctorId) return;

    const fetchScheduleSettings = async () => {
      try {
        const snap = await getDoc(doc(db, 'doctor_schedules', currentDoctorId));
        if (snap.exists()) {
          const d = snap.data() as DoctorScheduleSettings;
          if (d.clinicName) setCurrentClinicName(d.clinicName);
          if (d.doctorName) setCurrentDoctorName(d.doctorName);
          if (d.specialty) setCurrentSpecialty(d.specialty);
          if (d.clinicLogoUrl !== undefined) setClinicLogoUrl(d.clinicLogoUrl);
          if (d.clinicLogoIcon) setClinicLogoIcon(d.clinicLogoIcon);
        }
      } catch (err) {
        console.warn('Error fetching doctor schedule settings:', err);
      }
    };

    fetchScheduleSettings();
  }, [currentDoctorId, showSettingsModal]);

  // Real-time listener for doctor account status & clinic staff UIDs
  useEffect(() => {
    if (!currentDoctorId) return;

    const unsubDoc = onSnapshot(doc(db, 'doctors', currentDoctorId), (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        if (d.name) setCurrentDoctorName(d.name);
        if (d.clinicName) setCurrentClinicName(d.clinicName);
        if (d.specialty) setCurrentSpecialty(d.specialty);
        if (d.clinicCode) setCurrentClinicCode(d.clinicCode);
        if (d.email) setDoctorEmail(d.email);
        if (d.phone) setDoctorPhone(d.phone);
        if (Array.isArray(d.staffUids)) setStaffUids(d.staffUids);
        if (d.status) setDoctorStatus(d.status);
        if (d.isAiBlocked !== undefined) setIsAiBlocked(!!d.isAiBlocked);
        if (d.aiQueriesUsed !== undefined) setAiQueriesUsed(d.aiQueriesUsed);
        if (d.aiQuotaLimit !== undefined) setAiQuotaLimit(d.aiQuotaLimit);
      }
    }, (err) => {
      console.warn('Error listening to doctor status:', err);
    });

    return () => unsubDoc();
  }, [currentDoctorId]);

  // Fetch doctor patients & real statistics
  useEffect(() => {
    const fetchDoctorPatientsAndStats = async () => {
      if (!currentDoctorId || !authUid) {
        setDoctorPatients([]);
        setRealStats({
          activePatients: 0,
          pendingLabs: 0,
          rpmAlerts: 0,
          todayAppointments: 0,
          completedAppointments: 0
        });
        return;
      }

      try {
        const pQ = isReceptionist
          ? query(collection(db, 'patients'), where('staffUids', 'array-contains', authUid))
          : query(collection(db, 'patients'), where('doctorId', '==', currentDoctorId));
        const aQ = isReceptionist
          ? query(collection(db, 'appointments'), where('staffUids', 'array-contains', authUid))
          : query(collection(db, 'appointments'), where('doctorId', '==', currentDoctorId));

        const [pSnap, aSnap] = await Promise.all([getDocs(pQ), getDocs(aQ)]);

        const docPatients = pSnap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter((p: any) => !isReceptionist || p.doctorId === currentDoctorId);

        setDoctorPatients(docPatients.map((p: any) => ({ id: p.id, name: p.name || `مريض #${p.id}`, phone: p.phone || '' })));

        const activeCount = docPatients.length;
        const labCount = docPatients.filter((p: any) => p.status?.includes('تحاليل') || p.status?.includes('فحص')).length;
        const alertsCount = docPatients.filter((p: any) => p.status?.includes('تنبيه') || (p.ef && p.ef < 40)).length;

        const docAppointments = aSnap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter((a: any) => !isReceptionist || a.doctorId === currentDoctorId);

        setRealStats({
          activePatients: activeCount,
          pendingLabs: labCount,
          rpmAlerts: alertsCount,
          todayAppointments: docAppointments.length,
          completedAppointments: docAppointments.filter((a: any) => a.status === 'Completed').length
        });
      } catch (err) {
        console.error('Error fetching doctor stats:', err);
      }
    };

    fetchDoctorPatientsAndStats();
  }, [currentDoctorId, showNewPatient, patientsRefreshKey, isReceptionist, authUid]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessageText.trim()) return;

    const msg = {
      id: `m-${Date.now()}`,
      sender: currentDoctorName,
      role: 'doctor',
      time: 'الآن',
      patientName: 'ملاحظة عامة / معمل التحاليل',
      text: newMessageText.trim(),
      urgent: false
    };

    setMessagesList([msg, ...messagesList]);
    setNewMessageText('');
  };

  const renderDashboardLogo = () => {
    if (clinicLogoUrl) {
      return <img src={clinicLogoUrl} alt="لوجو العيادة" className="w-full h-full object-contain p-0.5" />;
    }
    switch (clinicLogoIcon) {
      case 'Stethoscope': return <Stethoscope size={20} />;
      case 'Activity': return <Activity size={20} />;
      case 'Building2': return <Building2 size={20} />;
      case 'ShieldCheck': return <ShieldCheck size={20} />;
      case 'Sparkles': return <Sparkles size={20} />;
      default: return <HeartPulse size={20} />;
    }
  };

  const effectiveAiBlocked = isAiBlocked || (aiQuotaLimit !== -1 && aiQueriesUsed >= aiQuotaLimit);

  // 1. Frozen Account Screen
  if (doctorStatus === 'suspended') {
    return (
      <div className="fixed inset-0 z-50 bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4 font-sans text-slate-800" dir="rtl">
        <div className="bg-white border border-rose-200 max-w-lg w-full rounded-3xl p-8 shadow-2xl relative overflow-hidden text-center space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto border border-rose-200">
            <ShieldAlert size={36} />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900">حساب العيادة مجمّد مؤقتاً</h2>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              تم إيقاف تفعيل العيادة (<span className="text-slate-900 font-bold">{currentDoctorName}</span>) من قبل إدارة المنظومة.
            </p>
          </div>
          {onLogout && (
            <button
              onClick={onLogout}
              className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition-all shadow-sm"
            >
              تسجيل الخروج
            </button>
          )}
        </div>
      </div>
    );
  }

  // 2. Pending Account Screen
  if (doctorStatus === 'pending') {
    return (
      <div className="fixed inset-0 z-50 bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4 font-sans text-slate-800" dir="rtl">
        <div className="bg-white border border-amber-200 max-w-lg w-full rounded-3xl p-8 shadow-2xl relative overflow-hidden text-center space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto border border-amber-200">
            <ShieldCheck size={36} />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900">حسابك في حالة مراجعة واعتماد</h2>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              أهلاً بك د/ <span className="text-slate-900 font-bold">{currentDoctorName}</span>. كود العيادة: <span className="font-mono text-slate-900 font-bold">{currentClinicCode}</span>.
            </p>
          </div>
          {onLogout && (
            <button
              onClick={onLogout}
              className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl transition-all shadow-sm"
            >
              العودة والخروج
            </button>
          )}
        </div>
      </div>
    );
  }

  if (selectedPatientId) {
    return (
      <PatientProfile
        patientId={selectedPatientId}
        onBack={() => setSelectedPatientId(null)}
        isAiBlocked={effectiveAiBlocked}
        aiBlockedReason={isAiBlocked ? 'تم إيقاف خدمة الذكاء الاصطناعي لهذه العيادة من قبل المشرف العام (Super Admin).' : 'تم استنفاد كوتة الاستعلامات الشهرية للباقة الحالية.'}
        doctorId={currentDoctorId}
        doctorName={currentDoctorName}
        clinicName={currentClinicName}
        clinicPhone={doctorPhone}
        specialty={currentSpecialty}
        staffRole={staffRole}
        staffName={staffName}
        staffUids={staffUids}
      />
    );
  }

  // Stats values
  const activePatientsVal = `${realStats.activePatients}`;
  const pendingLabsVal = `${realStats.pendingLabs}`;
  const rpmAlertsVal = `${realStats.rpmAlerts}`;
  const appointmentsVal = `${realStats.todayAppointments}`;

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col lg:flex-row text-slate-800" dir={direction}>
      {/* 1. CLEAN MINIMALIST SIDEBAR NAVIGATION */}
      <aside
        className={`bg-white ${isRTL ? 'border-l' : 'border-r'} border-slate-200/80 shrink-0 transition-all duration-300 flex flex-col justify-between z-30 ${
          sidebarCollapsed ? 'w-20' : 'w-64'
        } hidden lg:flex min-h-screen sticky top-0 h-screen`}
      >
        <div className="p-4 space-y-6 overflow-y-auto">
          {/* Sidebar Top Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className={`flex items-center gap-2.5 overflow-hidden transition-all ${sidebarCollapsed ? 'opacity-0 w-0' : 'opacity-100 w-auto'}`}>
              <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0 shadow-sm overflow-hidden p-1">
                {renderDashboardLogo()}
              </div>
              <div className="overflow-hidden">
                <h2 className="font-black text-slate-900 text-xs truncate max-w-[140px]">{currentClinicName}</h2>
                <p className="text-[10px] text-slate-400 font-mono whitespace-nowrap">{currentClinicCode}</p>
              </div>
            </div>

            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-2 hover:bg-slate-100 text-slate-500 rounded-xl transition-colors shrink-0 mx-auto"
              title={sidebarCollapsed ? (isRTL ? 'توسيع الشريط' : 'Expand Sidebar') : (isRTL ? 'طي الشريط' : 'Collapse Sidebar')}
            >
              {sidebarCollapsed ? (isRTL ? <ChevronLeft size={18} /> : <ChevronRight size={18} />) : (isRTL ? <ChevronRight size={18} /> : <ChevronLeft size={18} />)}
            </button>
          </div>

          {/* Navigation Menu */}
          <nav className="space-y-1.5">
            <button
              onClick={() => setActiveTab('patients')}
              className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl text-xs font-bold transition-all ${
                activeTab === 'patients'
                  ? 'bg-teal-50 text-teal-700 border border-teal-200/80 shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
              }`}
            >
              <Users size={18} className={activeTab === 'patients' ? 'text-teal-600' : 'text-slate-400'} />
              {!sidebarCollapsed && <span className="whitespace-nowrap">{t('medicalRecords')}</span>}
            </button>

            {!isReceptionist && (
              <button
                onClick={() => setActiveTab('analytics')}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'analytics'
                    ? 'bg-teal-50 text-teal-700 border border-teal-200/80 shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                }`}
              >
                <BarChart3 size={18} className={activeTab === 'analytics' ? 'text-teal-600' : 'text-slate-400'} />
                {!sidebarCollapsed && <span className="whitespace-nowrap">{t('analytics')}</span>}
              </button>
            )}

            <button
              onClick={() => setActiveTab('cashbox')}
              className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'cashbox'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
              }`}
            >
              <Wallet size={18} className={activeTab === 'cashbox' ? 'text-emerald-600' : 'text-slate-400'} />
              {!sidebarCollapsed && <span className="whitespace-nowrap">الخزينة والتعاقدات</span>}
            </button>

            {!isReceptionist && (
              <button
                onClick={() => setActiveTab('reports')}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'reports'
                    ? 'bg-blue-50 text-blue-700 border border-blue-200/80 shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                }`}
              >
                <FileText size={18} className={activeTab === 'reports' ? 'text-blue-600' : 'text-slate-400'} />
                {!sidebarCollapsed && <span className="whitespace-nowrap">{t('reports')}</span>}
              </button>
            )}

            <button
              onClick={() => setActiveTab('messages')}
              className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl text-xs font-bold transition-all relative ${
                activeTab === 'messages'
                  ? 'bg-purple-50 text-purple-700 border border-purple-200/80 shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
              }`}
            >
              <div className="relative shrink-0">
                <MessageSquare size={18} className={activeTab === 'messages' ? 'text-purple-600' : 'text-slate-400'} />
                {messagesList.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                )}
              </div>
              {!sidebarCollapsed && (
                <div className="flex items-center justify-between w-full">
                  <span className="whitespace-nowrap">{t('messages')}</span>
                  {messagesList.length > 0 && (
                    <span className="text-[10px] bg-rose-100 text-rose-700 font-bold px-1.5 py-0.2 rounded-full">{messagesList.length}</span>
                  )}
                </div>
              )}
            </button>

            <button
              onClick={() => setActiveTab('calendar')}
              className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl text-xs font-bold transition-all ${
                activeTab === 'calendar'
                  ? 'bg-amber-50 text-amber-700 border border-amber-200/80 shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
              }`}
            >
              <CalendarIcon size={18} className={activeTab === 'calendar' ? 'text-amber-600' : 'text-slate-400'} />
              {!sidebarCollapsed && <span className="whitespace-nowrap">{t('calendar')}</span>}
            </button>

            <button
              onClick={() => setActiveTab('patientPortal')}
              className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl text-xs font-bold transition-all ${
                activeTab === 'patientPortal'
                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-200/80 shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
              }`}
            >
              <QrCode size={18} className={activeTab === 'patientPortal' ? 'text-indigo-600' : 'text-slate-400'} />
              {!sidebarCollapsed && <span className="whitespace-nowrap">محاكي كارت المريض</span>}
            </button>
          </nav>

          {/* Quick Actions */}
          {!sidebarCollapsed && (
            <div className="pt-4 border-t border-slate-100 space-y-2">
              {!isReceptionist && (
                <>
                  <button
                    onClick={() => setShowClinicStaffModal(true)}
                    className="w-full py-2.5 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200/80 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <UserPlus size={15} className="text-indigo-600" />
                    <span>طاقم العيادة ({staffUids.length})</span>
                  </button>

                  <button
                    onClick={() => setShowSettingsModal(true)}
                    className="w-full py-2.5 px-3 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/80 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Settings size={15} className="text-amber-600" />
                    <span>الإعدادات</span>
                  </button>

                  <button
                    onClick={() => setShowPrescriptionModal(true)}
                    className="w-full py-2.5 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/80 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Pill size={15} />
                    <span>الروشتة الذكية</span>
                  </button>
                </>
              )}

              <button
                onClick={() => setShowNewPatient(true)}
                className="w-full py-2.5 px-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <Plus size={16} />
                <span>إضافة مريض جديد</span>
              </button>
            </div>
          )}
        </div>

        {/* User Profile */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          <button
            onClick={() => !isReceptionist && setShowSettingsModal(true)}
            className="w-full flex items-center gap-3 text-right hover:bg-white p-2 rounded-xl transition-all"
          >
            <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden">
              {renderDashboardLogo()}
            </div>
            {!sidebarCollapsed && (
              <div className="overflow-hidden">
                <span className="block text-xs font-bold text-slate-900 truncate">
                  {isReceptionist ? (staffName || 'الاستقبال / التمريض') : currentDoctorName}
                </span>
                <span className="block text-[10px] text-teal-700 font-bold truncate">
                  {isReceptionist ? 'صلاحية استقبال وتمريض' : 'انقر فتح الإعدادات'}
                </span>
              </div>
            )}
          </button>
        </div>
      </aside>

      {/* 2. MAIN DASHBOARD CONTENT */}
      <main className="flex-1 p-3 sm:p-6 pb-24 lg:pb-6 space-y-5 overflow-x-hidden">
        {/* Top Header */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-xs border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-teal-50 text-teal-700 border border-teal-200/80 flex items-center justify-center shrink-0 overflow-hidden p-1">
              {renderDashboardLogo()}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-base sm:text-lg font-black text-slate-900">
                  {currentClinicName}
                </h1>
                <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200">
                  {currentClinicCode}
                </span>
                {isReceptionist && (
                  <span className="text-[10px] font-bold bg-indigo-50 text-indigo-800 px-2.5 py-0.5 rounded-full border border-indigo-200">
                    استقبال / تمريض: {staffName || 'فريق العيادة'}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {currentDoctorName} · {currentSpecialty}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <PWAInstallButton />
            <LanguageSwitcher />

            {!isReceptionist && (
              <>
                <button
                  onClick={() => setShowClinicalCalculators(true)}
                  className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200/80 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                  title={t('clinicalCalculators')}
                >
                  <Calculator size={15} className="text-blue-600" />
                  <span>{t('clinicalCalculators')}</span>
                </button>

                <button
                  onClick={() => setShowPrescriptionModal(true)}
                  className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200/80 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <Pill size={15} className="text-emerald-600" />
                  <span>{t('digitalPrescription')}</span>
                </button>

                <button
                  onClick={() => setShowClinicStaffModal(true)}
                  className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200/80 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <UserPlus size={15} className="text-indigo-600" />
                  <span>طاقم العيادة</span>
                </button>

                <button
                  onClick={() => setShowSettingsModal(true)}
                  className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/80 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <Settings size={15} className="text-amber-600" />
                  <span>{t('settings')}</span>
                </button>

                <button
                  onClick={() => setShowUserProfileModal(true)}
                  className="px-3.5 py-2 bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200/80 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                  title="الملف الشخصي وإعدادات الحساب"
                >
                  <User size={15} className="text-purple-600" />
                  <span>الملف الشخصي</span>
                </button>
              </>
            )}

            <button
              onClick={() => setActiveTab('cashbox')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs border cursor-pointer ${
                activeTab === 'cashbox'
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border-emerald-200/80'
              }`}
            >
              <Wallet size={15} className={activeTab === 'cashbox' ? 'text-white' : 'text-emerald-600'} />
              <span>الخزينة والتعاقدات</span>
            </button>

            <button
              onClick={() => setShowNewPatient(true)}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Plus size={16} />
              <span>{t('newPatient')}</span>
            </button>

            <button
              onClick={() => setClinicDrawerOpen(true)}
              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors cursor-pointer"
              title={t('clinicManagement')}
            >
              <Menu size={18} />
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center gap-3">
            <div className="p-3 bg-teal-50 text-teal-700 rounded-2xl shrink-0">
              <Users size={20} />
            </div>
            <div>
              <p className="text-slate-400 text-xs font-medium">{t('activePatients')}</p>
              <p className="text-xl font-black text-slate-900 font-mono">{activePatientsVal}</p>
            </div>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center gap-3">
            <div className="p-3 bg-purple-50 text-purple-700 rounded-2xl shrink-0">
              <FileText size={20} />
            </div>
            <div>
              <p className="text-slate-400 text-xs font-medium">{t('pendingLabs')}</p>
              <p className="text-xl font-black text-slate-900 font-mono">{pendingLabsVal}</p>
            </div>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center gap-3">
            <div className="p-3 bg-rose-50 text-rose-700 rounded-2xl shrink-0">
              <Activity size={20} />
            </div>
            <div>
              <p className="text-slate-400 text-xs font-medium">{t('rpmAlerts')}</p>
              <p className="text-xl font-black text-slate-900 font-mono">{rpmAlertsVal}</p>
            </div>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center gap-3">
            <div className="p-3 bg-amber-50 text-amber-700 rounded-2xl shrink-0">
              <CalendarIcon size={20} />
            </div>
            <div>
              <p className="text-slate-400 text-xs font-medium">{t('todayAppointments')}</p>
              <p className="text-xl font-black text-slate-900 font-mono">{appointmentsVal}</p>
            </div>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'patients' && (
          <div className="space-y-5">
            <PatientTable
              onSelectPatient={setSelectedPatientId}
              doctorId={currentDoctorId}
              doctorName={currentDoctorName}
              staffRole={staffRole}
              onOpenNewPatientModal={() => setShowNewPatient(true)}
              onPatientDeleted={() => setPatientsRefreshKey((k) => k + 1)}
              refreshKey={patientsRefreshKey}
            />
            <AlertPanel doctorId={currentDoctorId} staffRole={staffRole} />
          </div>
        )}

        {activeTab === 'analytics' && !isReceptionist && (
          <DoctorAnalyticsPanel
            doctorId={currentDoctorId}
            clinicCode={currentClinicCode}
          />
        )}

        {activeTab === 'cashbox' && (
          <ClinicCashboxPanel
            doctorId={currentDoctorId}
            clinicName={currentClinicName}
            clinicCode={currentClinicCode}
            staffUids={staffUids}
            staffRole={staffRole}
            staffName={staffName || currentDoctorName}
            patients={doctorPatients}
          />
        )}

        {activeTab === 'reports' && !isReceptionist && (
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-base font-black text-slate-900">التقارير السريرية وفحوصات الإيكو</h2>
                <p className="text-xs text-slate-500">طباعة وتوثيق التقرير الطبي المعتمد لمرضى العيادة</p>
              </div>
              <button
                onClick={() => setShowReportsModal(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-colors shadow-xs"
              >
                فتح نافذة الطباعة الموسعة
              </button>
            </div>
            {doctorPatients.length > 0 ? (
              <CardiologyReport
                patientName={doctorPatients[0].name}
                patientId={doctorPatients[0].id}
                doctorName={currentDoctorName}
                clinicName={currentClinicName}
                specialty={currentSpecialty}
              />
            ) : (
              <div className="py-12 text-center space-y-3 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <FileText size={32} className="mx-auto text-slate-400" />
                <p className="text-sm font-bold text-slate-800">لا توجد تقارير مرضى في عيادتك بعد</p>
                <p className="text-xs text-slate-500">قم بإضافة أول مريض لتتمكن من إصدار وطباعة تقارير القلب والإيكو الخاصة به.</p>
                <button
                  onClick={() => setShowNewPatient(true)}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl inline-flex items-center gap-1.5"
                >
                  <Plus size={14} />
                  <span>إضافة مريض جديد</span>
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'messages' && (
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-base font-black text-slate-900">مركز الرسائل والتواصل مع المعامل</h2>
                <p className="text-xs text-slate-500">متابعة إشعارات الفحوصات والتنبيهات الطبية اللحظية</p>
              </div>
            </div>

            <form onSubmit={handleSendMessage} className="flex gap-2">
              <input
                type="text"
                value={newMessageText}
                onChange={(e) => setNewMessageText(e.target.value)}
                placeholder="اكتب ملاحظة جديدة للمعمل أو المريض..."
                className="flex-1 bg-slate-50 border border-slate-200 focus:bg-white focus:border-purple-500 rounded-xl px-4 py-2.5 text-xs text-slate-900"
              />
              <button
                type="submit"
                className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 shrink-0"
              >
                <Send size={15} />
                <span>إرسال</span>
              </button>
            </form>

            <div className="space-y-3 pt-2">
              {messagesList.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  لا توجد رسائل أو إشعارات من المعامل في عيادتك حالياً.
                </div>
              ) : (
                messagesList.map((msg) => (
                  <div
                    key={msg.id}
                    className={`p-4 rounded-2xl border ${
                      msg.urgent ? 'bg-rose-50/60 border-rose-200/80' : 'bg-slate-50/80 border-slate-200/60'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-xs text-slate-900">{msg.sender} · {msg.time}</span>
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed">{msg.text}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'calendar' && (
          <CalendarView
            doctorId={currentDoctorId}
            doctorName={currentDoctorName}
            clinicCode={currentClinicCode}
            staffUids={staffUids}
            staffRole={staffRole}
          />
        )}

        {activeTab === 'patientPortal' && (
          <div className="bg-white p-6 rounded-3xl shadow-xs border border-slate-200/80">
            <div className="mb-4 pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">محاكي هاتف المريض التفاعلي</h2>
              <p className="text-xs text-slate-500">معاينة واجهة المريض عند مسح كارت QR الخاص به</p>
            </div>
            {doctorPatients.length > 0 ? (
              <div className="max-w-md mx-auto">
                <PatientMobileDashboard patientId={doctorPatients[0].id} isPortalMode={false} />
              </div>
            ) : (
              <div className="py-12 text-center space-y-3 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <QrCode size={32} className="mx-auto text-slate-400" />
                <p className="text-sm font-bold text-slate-800">لا يوجد مرضى لمعاينة كارت المتابعة</p>
                <p className="text-xs text-slate-500">سجل مريضك الأول أولاً لتظهر معاينة تطبيق الهاتف وكود QR الخاص به هنا.</p>
                <button
                  onClick={() => setShowNewPatient(true)}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl inline-flex items-center gap-1.5"
                >
                  <Plus size={14} />
                  <span>فتح ملف أول مريض</span>
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Global AI Assistant (Doctor only) */}
      {!isReceptionist && <GeminiChat isAiBlocked={effectiveAiBlocked} />}

      {/* Modals */}
      {showNewPatient && (
        <NewPatientModal
          onClose={() => setShowNewPatient(false)}
          doctorId={currentDoctorId}
          doctorName={currentDoctorName}
          clinicCode={currentClinicCode}
          staffUids={staffUids}
          staffRole={staffRole}
          onPatientAdded={() => {
            setPatientsRefreshKey((k) => k + 1);
          }}
        />
      )}

      {showClinicStaffModal && !isReceptionist && (
        <ClinicStaffModal
          isOpen={showClinicStaffModal}
          onClose={() => setShowClinicStaffModal(false)}
          doctorId={currentDoctorId}
          doctorName={currentDoctorName}
          clinicCode={currentClinicCode}
          onStaffChanged={setStaffUids}
        />
      )}

      {showPrescriptionModal && !isReceptionist && (
        <PrescriptionModal
          onClose={() => setShowPrescriptionModal(false)}
          doctorId={currentDoctorId}
          doctorName={currentDoctorName}
          clinicName={currentClinicName}
        />
      )}

      {showClinicalCalculators && (
        <ClinicalCalculatorsModal onClose={() => setShowClinicalCalculators(false)} />
      )}

      {showReportsModal && (
        <ReportsModal
          onClose={() => setShowReportsModal(false)}
          doctorId={currentDoctorId}
          doctorName={currentDoctorName}
          clinicName={currentClinicName}
          specialty={currentSpecialty}
        />
      )}

      {showSettingsModal && (
        <DoctorSettingsModal
          isOpen={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
          doctorId={currentDoctorId}
          initialClinicName={currentClinicName}
          initialDoctorName={currentDoctorName}
          initialSpecialty={currentSpecialty}
          clinicCode={currentClinicCode}
          onSaveSuccess={(updated) => {
            if (updated.clinicName) setCurrentClinicName(updated.clinicName);
            if (updated.doctorName) setCurrentDoctorName(updated.doctorName);
            if (updated.specialty) setCurrentSpecialty(updated.specialty);
            if (updated.clinicLogoUrl !== undefined) setClinicLogoUrl(updated.clinicLogoUrl);
            if (updated.clinicLogoIcon) setClinicLogoIcon(updated.clinicLogoIcon);
          }}
        />
      )}

      {/* Clinic Drawer */}
      {clinicDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/50 backdrop-blur-xs transition-opacity" dir="rtl">
          <div className="absolute inset-0" onClick={() => setClinicDrawerOpen(false)} />
          <div className="relative z-10 bg-white w-full sm:max-w-md h-full shadow-2xl flex flex-col border-r border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center overflow-hidden p-1">
                  {renderDashboardLogo()}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">{currentClinicName}</h3>
                  <p className="text-[11px] text-slate-400 font-mono">{currentClinicCode}</p>
                </div>
              </div>
              <button
                onClick={() => setClinicDrawerOpen(false)}
                className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-500 flex items-center justify-center"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <button
                onClick={() => {
                  setClinicDrawerOpen(false);
                  setActiveTab('cashbox');
                }}
                className="w-full p-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 rounded-2xl text-xs font-bold text-right flex items-center gap-2 cursor-pointer"
              >
                <Wallet size={16} className="text-emerald-600" />
                <span>الخزينة والتعاقدات الطبية</span>
              </button>

              {!isReceptionist && (
                <>
                  <button
                    onClick={() => {
                      setClinicDrawerOpen(false);
                      setShowClinicStaffModal(true);
                    }}
                    className="w-full p-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 rounded-2xl text-xs font-bold text-right flex items-center gap-2 cursor-pointer"
                  >
                    <UserPlus size={16} className="text-indigo-600" />
                    <span>إدارة طاقم العيادة (السكرتارية والتمريض)</span>
                  </button>

                  <button
                    onClick={() => {
                      setClinicDrawerOpen(false);
                      setShowSettingsModal(true);
                    }}
                    className="w-full p-3 bg-amber-50 hover:bg-amber-100 text-amber-900 rounded-2xl text-xs font-bold text-right flex items-center gap-2 cursor-pointer"
                  >
                    <Settings size={16} className="text-amber-600" />
                    <span>الإعدادات</span>
                  </button>

                  <button
                    onClick={() => {
                      setClinicDrawerOpen(false);
                      setActiveTab('analytics');
                    }}
                    className="w-full p-3 bg-teal-50 hover:bg-teal-100 text-teal-800 rounded-2xl text-xs font-bold text-right flex items-center gap-2 cursor-pointer"
                  >
                    <BarChart3 size={16} className="text-teal-600" />
                    <span>فتح اللوحة الإحصائية وتحليلات العيادة</span>
                  </button>
                </>
              )}

              {onLogout && (
                <button
                  onClick={() => {
                    setClinicDrawerOpen(false);
                    onLogout();
                  }}
                  className="w-full p-3 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-2xl text-xs font-bold text-right"
                >
                  تسجيل الخروج
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* User Profile Modal */}
      {showUserProfileModal && (
        <UserProfileModal
          isOpen={showUserProfileModal}
          onClose={() => setShowUserProfileModal(false)}
          userId={currentDoctorId}
          userName={currentDoctorName}
          userEmail={doctorEmail || ''}
          userPhone={doctorPhone || ''}
          userRole="Cardiologist"
          clinicWhatsAppNumber={localStorage.getItem('cardios_custom_doctor_phone') || doctorPhone || ''}
          onSaveSuccess={(updated) => {
            if (updated.name) setCurrentDoctorName(updated.name);
            if (updated.phone) setDoctorPhone(updated.phone);
            if (updated.clinicWhatsAppNumber) {
              localStorage.setItem('cardios_custom_doctor_phone', updated.clinicWhatsAppNumber);
            }
          }}
        />
      )}
    </div>
  );
}
