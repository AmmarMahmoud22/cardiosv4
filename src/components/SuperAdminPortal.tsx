import React, { useState, useEffect } from 'react';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Plan, DoctorWithSubscription, LabWithStats } from '../types/subscription';
import { SEED_PLANS, SEED_DOCTORS, SEED_LABS } from '../lib/seed';
import {
  ShieldAlert,
  ShieldCheck,
  Lock,
  KeyRound,
  Users,
  CreditCard,
  Cpu,
  FlaskConical,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Search,
  DollarSign,
  TrendingUp,
  Sparkles,
  ArrowRight,
  Stethoscope,
  BarChart3,
  Check,
  X,
  Zap,
  Globe,
  RefreshCw,
  Edit3,
  UserCheck,
  FileSpreadsheet,
  Printer,
  Download,
  BadgeCheck,
  CalendarClock,
  Coins,
  Activity,
  FileText,
  Clock,
  Sliders,
  ChevronDown,
  Building,
  Phone,
  Mail,
  Radio
} from 'lucide-react';
import {
  subscribeToAnalytics,
  resetAnalyticsData,
  getLocalMetrics,
  getLocalEvents,
  AnalyticsMetrics,
  AnalyticsEvent,
  trackClinicApproval,
  trackLabConnection,
  trackErrorReport
} from '../lib/analytics';
import {
  exportDoctorsToCSV,
  exportFinancialSummaryToCSV,
  openAdminPrintableReport
} from '../lib/exportUtils';
import { useLanguage, LanguageSwitcher } from '../context/LanguageContext';
import PlatformRevenueDashboard from './PlatformRevenueDashboard';
import SystemActivityLog from './SystemActivityLog';

interface SuperAdminPortalProps {
  onBack: () => void;
}

export default function SuperAdminPortal({ onBack }: SuperAdminPortalProps) {
  const { language, direction, isRTL, t } = useLanguage();

  // Authentication & Security Gate
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('cardios_superadmin_auth') === 'true';
  });
  const [adminPin, setAdminPin] = useState<string>('');
  const [pinError, setPinError] = useState<string>('');

  // Navigation Tabs: overview, revenue, finance, activity, doctors, plans, ai, labs
  const [activeTab, setActiveTab] = useState<'overview' | 'revenue' | 'finance' | 'activity' | 'doctors' | 'plans' | 'ai' | 'labs'>('overview');

  // Platform Analytics State
  const [analyticsMetrics, setAnalyticsMetrics] = useState<AnalyticsMetrics>(getLocalMetrics);
  const [analyticsEvents, setAnalyticsEvents] = useState<AnalyticsEvent[]>(getLocalEvents);

  // Firestore Live State
  const [plans, setPlans] = useState<Plan[]>([]);
  const [doctors, setDoctors] = useState<DoctorWithSubscription[]>([]);
  const [labs, setLabs] = useState<LabWithStats[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended' | 'pending' | 'expiring'>('all');

  // Emergency Global AI Switch
  const [globalAiEnabled, setGlobalAiEnabled] = useState<boolean>(() => {
    return localStorage.getItem('cardios_global_ai_active') !== 'false';
  });

  // Plan Modal (Create / Edit)
  const [planModalOpen, setPlanModalOpen] = useState<boolean>(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [planForm, setPlanForm] = useState<Partial<Plan>>({
    name: '',
    description: '',
    price: 500,
    currency: 'EGP',
    billingCycle: 'monthly',
    maxPatients: 100,
    aiMonthlyQuota: 300,
    badgeColor: 'blue',
    isDefault: false,
    features: {
      rpmAlerts: true,
      echoReports: true,
      labIntegration: true,
      qrPortal: true,
      ddiChecker: true,
      customBranding: false,
      prioritySupport: false
    }
  });

  // Doctor Edit / Change Plan Modal
  const [doctorModalOpen, setDoctorModalOpen] = useState<boolean>(false);
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorWithSubscription | null>(null);
  const [doctorNewPlanId, setDoctorNewPlanId] = useState<string>('');
  const [doctorNewQuota, setDoctorNewQuota] = useState<number>(500);
  const [doctorNewPatientsLimit, setDoctorNewPatientsLimit] = useState<number>(100);
  const [doctorNewExpiry, setDoctorNewExpiry] = useState<string>('2026-12-31');
  const [doctorNewLicense, setDoctorNewLicense] = useState<string>('');
  const [doctorNewStatus, setDoctorNewStatus] = useState<'active' | 'suspended' | 'pending' | 'trial' | 'expired'>('active');

  // Add New Doctor Modal
  const [addDoctorModalOpen, setAddDoctorModalOpen] = useState<boolean>(false);
  const [newDocForm, setNewDocForm] = useState({
    name: '',
    clinicName: '',
    clinicCode: '',
    specialty: 'استشاري أمراض القلب والقسطرة',
    planId: 'plan-pro',
    phone: '',
    email: '',
    medicalLicenseNumber: '',
    aiQuotaLimit: 600,
    maxPatientsLimit: 250
  });

  // Lab Modal (Create / Edit)
  const [labModalOpen, setLabModalOpen] = useState<boolean>(false);
  const [labForm, setLabForm] = useState<Partial<LabWithStats>>({
    name: '',
    labCode: '',
    technicianName: '',
    phone: '',
    branch: '',
    accreditation: 'معتمد الجودة السريرية',
    linkedClinics: [],
    status: 'active'
  });

  // Success Notification Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // PIN verification
  const handleVerifyPin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (adminPin === '7777' || adminPin === 'admin2026' || adminPin === '') {
      setIsAuthenticated(true);
      sessionStorage.setItem('cardios_superadmin_auth', 'true');
      setPinError('');
    } else {
      setPinError('رمز المرور غير صحيح. انقر على زر الدخول السريع للتجربة');
    }
  };

  const handleQuickDemoAccess = () => {
    setAdminPin('7777');
    setIsAuthenticated(true);
    sessionStorage.setItem('cardios_superadmin_auth', 'true');
    setPinError('');
  };

  const handleAdminLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('cardios_superadmin_auth');
  };

  // Live Firestore Sync & Fallback
  useEffect(() => {
    if (!isAuthenticated) return;

    setLoading(true);

    const unsubPlans = onSnapshot(collection(db, 'plans'), (snap) => {
      if (!snap.empty) {
        const loadedPlans: Plan[] = [];
        snap.forEach((docSnap) => {
          loadedPlans.push({ id: docSnap.id, ...(docSnap.data() as any) });
        });
        setPlans(loadedPlans);
      } else {
        setPlans(SEED_PLANS);
        SEED_PLANS.forEach(p => {
          setDoc(doc(db, 'plans', p.id), p, { merge: true }).catch(console.warn);
        });
      }
    }, (err) => {
      console.warn('Error reading plans:', err);
      setPlans(SEED_PLANS);
    });

    const unsubDoctors = onSnapshot(collection(db, 'doctors'), (snap) => {
      let loadedDocs: DoctorWithSubscription[] = [];
      if (!snap.empty) {
        snap.forEach((docSnap) => {
          const data = docSnap.data() as any;
          loadedDocs.push({
            id: docSnap.id,
            name: data.name || 'طبيب بدون اسم',
            clinicCode: data.clinicCode || 'CLINIC-NA',
            clinicName: data.clinicName || 'عيادة قلب',
            specialty: data.specialty || 'استشاري أمراض القلب',
            planId: data.planId || 'plan-starter',
            planName: data.planName || 'باقة العيادة الذكية',
            status: data.status || 'active',
            subscriptionExpiresAt: data.subscriptionExpiresAt || '2026-12-31',
            aiQueriesUsed: data.aiQueriesUsed || 0,
            aiQuotaLimit: data.aiQuotaLimit || 200,
            isAiBlocked: !!data.isAiBlocked,
            maxPatientsLimit: data.maxPatientsLimit || 50,
            phone: data.phone || '01000000000',
            email: data.email || 'doctor@cardios.eg',
            patientCount: data.patientCount || 3,
            medicalLicenseNumber: data.medicalLicenseNumber || (data.id === 'doc-1' ? 'EGY-MED-49102' : data.id === 'doc-2' ? 'EGY-MED-38291' : 'EGY-MED-55019'),
            verificationStatus: data.verificationStatus || (data.status === 'active' ? 'verified' : data.status === 'pending' ? 'pending' : 'unverified'),
            prescriptionsIssued: data.prescriptionsIssued || (data.id === 'doc-1' ? 42 : data.id === 'doc-2' ? 18 : 0),
            echoReportsCount: data.echoReportsCount || (data.id === 'doc-1' ? 19 : data.id === 'doc-2' ? 7 : 0),
            lastActiveAt: data.lastActiveAt || 'اليوم، 11:30 ص'
          });
        });
      } else {
        const enrichedSeed = SEED_DOCTORS.map(d => ({
          ...d,
          medicalLicenseNumber: d.id === 'doc-1' ? 'EGY-MED-49102' : d.id === 'doc-2' ? 'EGY-MED-38291' : 'EGY-MED-55019',
          verificationStatus: d.status === 'active' ? ('verified' as const) : ('pending' as const),
          prescriptionsIssued: d.id === 'doc-1' ? 42 : d.id === 'doc-2' ? 18 : 0,
          echoReportsCount: d.id === 'doc-1' ? 19 : d.id === 'doc-2' ? 7 : 0,
          patientCount: d.id === 'doc-1' ? 3 : d.id === 'doc-2' ? 2 : 0,
          lastActiveAt: 'اليوم، 11:30 ص'
        }));
        loadedDocs = [...enrichedSeed as any];
        enrichedSeed.forEach(d => {
          setDoc(doc(db, 'doctors', d.id), d, { merge: true }).catch(console.warn);
        });
      }

      try {
        const rawLocal = localStorage.getItem('cardios_local_pending_doctors');
        if (rawLocal) {
          const localList: DoctorWithSubscription[] = JSON.parse(rawLocal);
          for (const item of localList) {
            const idx = loadedDocs.findIndex(d => d.id === item.id || d.clinicCode === item.clinicCode);
            if (idx === -1) {
              loadedDocs.unshift({
                ...item,
                medicalLicenseNumber: item.medicalLicenseNumber || 'EGY-MED-PENDING',
                verificationStatus: item.verificationStatus || 'pending',
                prescriptionsIssued: 0,
                echoReportsCount: 0,
                patientCount: 0,
                lastActiveAt: 'مسجل حديثاً'
              });
            } else if (item.status) {
              loadedDocs[idx].status = item.status;
            }
          }
        }
      } catch (e) {
        console.warn('Error reading local pending docs:', e);
      }

      setDoctors(loadedDocs);
      setLoading(false);
    }, (err) => {
      console.warn('Error reading doctors:', err);
      setDoctors(SEED_DOCTORS as any);
      setLoading(false);
    });

    const unsubLabs = onSnapshot(collection(db, 'labs'), (snap) => {
      let loadedLabs: LabWithStats[] = [];
      if (!snap.empty) {
        snap.forEach((docSnap) => {
          const data = docSnap.data() as any;
          loadedLabs.push({
            id: docSnap.id,
            name: data.name,
            labCode: data.labCode,
            technicianName: data.technicianName,
            phone: data.phone,
            branch: data.branch,
            accreditation: data.accreditation,
            linkedClinics: data.linkedClinics || [],
            status: data.status || 'active',
            testsProcessed: data.testsProcessed || 12
          });
        });
      } else {
        loadedLabs = [...SEED_LABS as any];
        SEED_LABS.forEach(l => {
          setDoc(doc(db, 'labs', l.id), l, { merge: true }).catch(console.warn);
        });
      }

      try {
        const rawLocalLabs = localStorage.getItem('cardios_local_pending_labs');
        if (rawLocalLabs) {
          const localList: LabWithStats[] = JSON.parse(rawLocalLabs);
          for (const item of localList) {
            const idx = loadedLabs.findIndex(l => l.id === item.id || l.labCode === item.labCode);
            if (idx === -1) {
              loadedLabs.unshift(item);
            } else if (item.status) {
              loadedLabs[idx].status = item.status;
            }
          }
        }
      } catch (e) {
        console.warn('Error reading local pending labs:', e);
      }

      setLabs(loadedLabs);
    }, (err) => {
      console.warn('Error reading labs:', err);
      setLabs(SEED_LABS as any);
    });

    const unsubAnalytics = subscribeToAnalytics((data) => {
      setAnalyticsMetrics(data.metrics);
      setAnalyticsEvents(data.events);
    });

    return () => {
      unsubPlans();
      unsubDoctors();
      unsubLabs();
      unsubAnalytics();
    };
  }, [isAuthenticated]);

  // Global AI Kill switch toggle
  const handleToggleGlobalAi = () => {
    const nextState = !globalAiEnabled;
    setGlobalAiEnabled(nextState);
    localStorage.setItem('cardios_global_ai_active', String(nextState));
    showToast(nextState ? 'تم تفعيل الذكاء الاصطناعي لكافة العيادات على المنصة' : '⚠️ تم تفعيل مفتاح الطوارئ وإيقاف AI مؤقتاً للمنصة');
  };

  // Bulk reset monthly quotas
  const handleBulkResetQuotas = async () => {
    if (!window.confirm('هل أنت متأكد من رغبتك في تصفير عداد استهلاك الذكاء الاصطناعي لجميع العيادات لشهر جديد؟')) {
      return;
    }
    try {
      const updated = doctors.map(d => ({ ...d, aiQueriesUsed: 0 }));
      setDoctors(updated);
      for (const d of doctors) {
        await setDoc(doc(db, 'doctors', d.id), { aiQueriesUsed: 0 }, { merge: true }).catch(() => {});
      }
      showToast('✓ تم تصفير عداد استهلاك الذكاء الاصطناعي لجميع العيادات بنجاح');
    } catch (err) {
      console.error('Error resetting quotas:', err);
    }
  };

  // Extend trial / subscription by 30 days
  const handleExtendSubscription = async (doctor: DoctorWithSubscription) => {
    try {
      const currentExp = doctor.subscriptionExpiresAt ? new Date(doctor.subscriptionExpiresAt) : new Date();
      currentExp.setDate(currentExp.getDate() + 30);
      const newExpStr = currentExp.toISOString().slice(0, 10);

      await setDoc(doc(db, 'doctors', doctor.id), {
        subscriptionExpiresAt: newExpStr,
        status: 'active'
      }, { merge: true });

      setDoctors(prev => prev.map(d => d.id === doctor.id ? { ...d, subscriptionExpiresAt: newExpStr, status: 'active' } : d));
      showToast(`✓ تم تمديد اشتراك د/ ${doctor.name} حتى ${newExpStr}`);
    } catch (err) {
      console.error('Error extending subscription:', err);
    }
  };

  // Approve Doctor License
  const handleVerifyLicense = async (doctor: DoctorWithSubscription) => {
    try {
      await setDoc(doc(db, 'doctors', doctor.id), {
        verificationStatus: 'verified',
        status: 'active'
      }, { merge: true });

      setDoctors(prev => prev.map(d => d.id === doctor.id ? { ...d, verificationStatus: 'verified', status: 'active' } : d));
      showToast(`✓ تم اعتماد وتوثيق ترخيص د/ ${doctor.name} رسمياً`);
      trackClinicApproval(doctor.name, doctor.clinicCode, doctor.planName || 'باقة العيادة').catch(console.warn);
    } catch (err) {
      console.error('Error verifying license:', err);
    }
  };

  // Doctor status toggle (Approve pending / Suspend active)
  const handleToggleDoctorStatus = async (doctor: DoctorWithSubscription) => {
    const newStatus = doctor.status === 'active' ? 'suspended' : 'active';
    try {
      localStorage.setItem(`cardios_doctor_status_${doctor.id}`, newStatus);
      await setDoc(doc(db, 'doctors', doctor.id), { status: newStatus }, { merge: true });
      await setDoc(doc(db, 'users', doctor.id), { status: newStatus }, { merge: true }).catch(() => {});

      setDoctors(prev => prev.map(d => d.id === doctor.id ? { ...d, status: newStatus } : d));

      if (doctor.status === 'pending') {
        showToast(`تم قبول واعتماد عيادة (${doctor.name}) بنجاح!`);
        trackClinicApproval(doctor.name, doctor.clinicCode, doctor.planName || 'باقة العيادة').catch(console.warn);
      } else {
        showToast(`تم ${newStatus === 'active' ? 'تفعيل' : 'تجميد'} حساب (${doctor.name})`);
        if (newStatus === 'suspended') {
          trackErrorReport(`تجميد حساب عيادة: ${doctor.name}`, `كود: ${doctor.clinicCode} • تم إيقاف صلاحيات الدخول مؤقتاً`, 'warning').catch(console.warn);
        }
      }
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  const handleToggleDoctorAi = async (doctor: DoctorWithSubscription) => {
    const newBlockedState = !doctor.isAiBlocked;
    try {
      localStorage.setItem(`cardios_ai_blocked_${doctor.id}`, String(newBlockedState));
      await setDoc(doc(db, 'doctors', doctor.id), { isAiBlocked: newBlockedState }, { merge: true });
      setDoctors(prev => prev.map(d => d.id === doctor.id ? { ...d, isAiBlocked: newBlockedState } : d));
      showToast(newBlockedState ? `تم إيقاف AI لـ ${doctor.name}` : `تم تفعيل AI لـ ${doctor.name}`);
      if (newBlockedState) {
        trackErrorReport(`حظر استهلاك الذكاء الاصطناعي لـ ${doctor.name}`, `تم حظر وصول العيادة إلى Gemini Flash لحين تسوية الكوتة`, 'warning').catch(console.warn);
      }
    } catch (err) {
      console.error('Error updating AI block state:', err);
    }
  };

  const handleToggleLabStatus = async (lab: LabWithStats) => {
    const newStatus = lab.status === 'active' ? 'suspended' : 'active';
    try {
      localStorage.setItem(`cardios_lab_status_${lab.id}`, newStatus);
      await setDoc(doc(db, 'labs', lab.id), { status: newStatus }, { merge: true });
      setLabs(prev => prev.map(l => l.id === lab.id ? { ...l, status: newStatus } : l));
      showToast(`تم ${newStatus === 'active' ? 'تنشيط' : 'تجميد'} معمل (${lab.name})`);
      if (newStatus === 'active') {
        trackLabConnection(lab.name, lab.branch || 'الفرع الرئيسي', 'تكامل حي مع شبكة عيادات القلب').catch(console.warn);
      }
    } catch (err) {
      console.error('Error updating lab status:', err);
    }
  };

  // Open Edit Doctor Modal
  const openDoctorEditModal = (doctor: DoctorWithSubscription) => {
    setSelectedDoctor(doctor);
    setDoctorNewPlanId(doctor.planId || 'plan-starter');
    setDoctorNewQuota(doctor.aiQuotaLimit || 200);
    setDoctorNewPatientsLimit(doctor.maxPatientsLimit || 50);
    setDoctorNewExpiry(doctor.subscriptionExpiresAt || '2026-12-31');
    setDoctorNewLicense(doctor.medicalLicenseNumber || '');
    setDoctorNewStatus(doctor.status);
    setDoctorModalOpen(true);
  };

  // Save Doctor Edit
  const handleSaveDoctorEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctor) return;

    const chosenPlan = plans.find(p => p.id === doctorNewPlanId);
    const planName = chosenPlan ? chosenPlan.name : selectedDoctor.planName;

    try {
      const updatedFields: Partial<DoctorWithSubscription> = {
        planId: doctorNewPlanId,
        planName,
        aiQuotaLimit: Number(doctorNewQuota),
        maxPatientsLimit: Number(doctorNewPatientsLimit),
        subscriptionExpiresAt: doctorNewExpiry,
        medicalLicenseNumber: doctorNewLicense,
        status: doctorNewStatus
      };

      await setDoc(doc(db, 'doctors', selectedDoctor.id), updatedFields, { merge: true });

      setDoctors(prev => prev.map(d => d.id === selectedDoctor.id ? { ...d, ...updatedFields } : d));
      setDoctorModalOpen(false);
      showToast(`✓ تم تحديث بيانات واشتراك د/ ${selectedDoctor.name}`);
    } catch (err) {
      console.error('Error saving doctor edit:', err);
    }
  };

  // Handle Add Doctor
  const handleAddDoctorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocForm.name || !newDocForm.clinicName) {
      alert('يرجى كتابة اسم الطبيب واسم العيادة');
      return;
    }

    const cCode = newDocForm.clinicCode || `CLINIC-${Date.now().toString().slice(-4)}`;
    const newDocId = `doc-${Date.now().toString().slice(-5)}`;
    const chosenPlan = plans.find(p => p.id === newDocForm.planId);

    const newDoctorObj: DoctorWithSubscription = {
      id: newDocId,
      name: newDocForm.name,
      clinicCode: cCode,
      clinicName: newDocForm.clinicName,
      specialty: newDocForm.specialty,
      planId: newDocForm.planId,
      planName: chosenPlan ? chosenPlan.name : 'باقة العيادة الذكية',
      status: 'active',
      subscriptionExpiresAt: '2026-12-31',
      aiQueriesUsed: 0,
      aiQuotaLimit: Number(newDocForm.aiQuotaLimit),
      maxPatientsLimit: Number(newDocForm.maxPatientsLimit),
      isAiBlocked: false,
      phone: newDocForm.phone || '01000000000',
      email: newDocForm.email || 'doctor@cardios.eg',
      medicalLicenseNumber: newDocForm.medicalLicenseNumber || `EGY-MED-${Date.now().toString().slice(-5)}`,
      verificationStatus: 'verified',
      patientCount: 0,
      prescriptionsIssued: 0,
      echoReportsCount: 0,
      lastActiveAt: 'نشط الآن'
    };

    try {
      await setDoc(doc(db, 'doctors', newDocId), newDoctorObj, { merge: true });
      setDoctors(prev => [newDoctorObj, ...prev]);
      setAddDoctorModalOpen(false);
      setNewDocForm({
        name: '',
        clinicName: '',
        clinicCode: '',
        specialty: 'استشاري أمراض القلب والقسطرة',
        planId: 'plan-pro',
        phone: '',
        email: '',
        medicalLicenseNumber: '',
        aiQuotaLimit: 600,
        maxPatientsLimit: 250
      });
      showToast(`✓ تم إضافة واعتماد عيادة ${newDoctorObj.name} بنجاح`);
      trackClinicApproval(newDoctorObj.name, newDoctorObj.clinicCode, chosenPlan?.name || 'باقة العيادة').catch(console.warn);
    } catch (err) {
      console.error('Error adding doctor:', err);
    }
  };

  // Metrics
  const totalDoctors = doctors.length;
  const activeDoctors = doctors.filter(d => d.status === 'active').length;
  const totalAiQueriesUsed = doctors.reduce((acc, curr) => acc + (curr.aiQueriesUsed || 0), 0);
  const totalEstimatedMRR = doctors.reduce((acc, curr) => {
    if (curr.status === 'suspended') return acc;
    const p = plans.find(plan => plan.id === curr.planId);
    return acc + (p?.price || 500);
  }, 0);
  const totalEstimatedARR = totalEstimatedMRR * 12;

  // AI Cost in EGP estimate
  const estimatedAiCostEgp = Math.round(totalAiQueriesUsed * 0.05);
  const netEstimatedMargin = Math.max(0, totalEstimatedMRR - estimatedAiCostEgp);

  const pendingDoctors = doctors.filter(d => d.status === 'pending');
  const pendingLabs = labs.filter(l => l.status === 'pending');

  // Check expiring within 30 days
  const now = new Date();
  const thirtyDaysAhead = new Date();
  thirtyDaysAhead.setDate(now.getDate() + 30);

  const expiringDoctors = doctors.filter(d => {
    if (!d.subscriptionExpiresAt) return false;
    const expDate = new Date(d.subscriptionExpiresAt);
    return expDate <= thirtyDaysAhead;
  });

  const filteredDoctors = doctors
    .filter((docItem) => {
      const matchesSearch =
        docItem.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        docItem.clinicCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (docItem.specialty && docItem.specialty.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (docItem.medicalLicenseNumber && docItem.medicalLicenseNumber.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && docItem.status === 'active') ||
        (statusFilter === 'suspended' && docItem.status === 'suspended') ||
        (statusFilter === 'pending' && docItem.status === 'pending') ||
        (statusFilter === 'expiring' && expiringDoctors.some(ed => ed.id === docItem.id));

      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => (a.status === 'pending' ? -1 : 1));

  // ================= SECURITY LOGIN GATE =================
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center p-4 font-sans relative overflow-hidden" dir={direction}>
        {/* Ambient decorative lighting */}
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-teal-200/40 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-sky-200/40 rounded-full blur-3xl pointer-events-none" />

        <div className="w-full max-w-md bg-white/85 backdrop-blur-2xl border border-white/90 rounded-3xl p-8 shadow-[0_20px_60px_rgba(15,23,42,0.08)] relative overflow-hidden z-10">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-teal-500 via-cyan-500 to-indigo-500" />

          <div className="flex justify-end mb-2">
            <LanguageSwitcher variant="light" />
          </div>

          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-teal-50 text-teal-600 border border-teal-200/70 flex items-center justify-center mx-auto mb-3 shadow-xs">
              <ShieldAlert size={32} />
            </div>
            <h1 className="text-xl font-black text-slate-900">{t('adminTitle')}</h1>
            <p className="text-xs text-slate-500 mt-1">{t('adminSub')}</p>
          </div>

          <form onSubmit={handleVerifyPin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                {isRTL ? 'رمز التحقق الخاص بالأدمن:' : 'Admin PIN Code:'}
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={adminPin}
                  onChange={(e) => setAdminPin(e.target.value)}
                  placeholder={isRTL ? 'أدخل الرمز (أو اضغط الدخول السريع)' : 'Enter PIN (or use Quick Demo Access)'}
                  className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-xs text-center font-mono text-slate-900 placeholder-slate-400 focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-500/10 shadow-xs"
                />
                <KeyRound size={16} className={`absolute ${isRTL ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 text-slate-400`} />
              </div>
              {pinError && <p className="text-xs text-rose-600 font-bold mt-1.5">{pinError}</p>}
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl transition-all shadow-sm shadow-teal-600/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Lock size={15} />
              <span>{isRTL ? 'دخول لوحة الإدارة' : 'Access Admin Command Center'}</span>
            </button>

            <div className="pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={handleQuickDemoAccess}
                className="w-full py-2.5 bg-teal-50/80 hover:bg-teal-100/80 text-teal-800 border border-teal-200 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Zap size={15} className="text-amber-500" />
                <span>{isRTL ? 'دخول تجريبي سريع بضغطة واحدة (Quick Admin Access)' : 'Quick Demo Access (1-Click Login)'}</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onBack}
              className="w-full text-center text-xs text-slate-500 hover:text-slate-800 transition-colors pt-2 block font-medium"
            >
              {isRTL ? '← العودة للصفحة الرئيسية' : '← Return to Main Page'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ================= MAIN SAAS DASHBOARD =================
  return (
    <div className="min-h-screen bg-slate-50/90 text-slate-800 font-sans pb-16 relative overflow-x-hidden" dir={direction}>
      {/* Ambient background lighting mesh */}
      <div className="absolute top-0 right-0 w-[550px] h-[550px] bg-teal-100/50 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-[35%] left-0 w-[600px] h-[600px] bg-sky-100/50 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-0 right-[25%] w-[500px] h-[500px] bg-emerald-100/40 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-teal-700 text-white text-xs font-bold px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 animate-bounce">
          <CheckCircle2 size={18} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Navbar in Frosted Glass */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-white/80 shadow-[0_4px_20px_rgba(15,23,42,0.03)] px-4 sm:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-600 text-white flex items-center justify-center font-bold shadow-sm shadow-teal-600/20">
              <ShieldCheck size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-black text-slate-900">{t('adminTitle')}</h1>
                <span className="text-[10px] bg-teal-50 text-teal-700 border border-teal-200 px-2 py-0.5 rounded-full font-mono font-bold">
                  {t('superAdminBadge')}
                </span>
                {!globalAiEnabled && (
                  <span className="text-[10px] bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-full font-bold animate-pulse">
                    ⚠️ {isRTL ? 'AI معلق عالمياً' : 'Global AI Paused'}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500">{t('adminSub')}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <LanguageSwitcher variant="light" />

            <button
              onClick={() => openAdminPrintableReport({
                doctors,
                plans,
                totalVisits: analyticsMetrics.totalVisits,
                totalAiQueries: totalAiQueriesUsed,
                mrr: totalEstimatedMRR,
                arr: totalEstimatedARR,
                language
              })}
              className="bg-white hover:bg-slate-50 text-indigo-700 border border-indigo-200 px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              title={t('printOfficialPdf')}
            >
              <Printer size={14} />
              <span className="hidden sm:inline">{t('printOfficialPdf')}</span>
            </button>

            <button
              onClick={handleAdminLogout}
              className="bg-white hover:bg-slate-50 text-slate-700 px-3 py-2 rounded-xl text-xs font-bold transition-all border border-slate-200 shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Lock size={14} className="text-amber-500" />
              <span>{t('lock')}</span>
            </button>
            <button
              onClick={onBack}
              className="bg-teal-600 hover:bg-teal-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm shadow-teal-600/20 flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowRight size={14} className={isRTL ? 'transform -scale-x-100' : ''} />
              <span>{t('back')}</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs Bar in Frosted Glass */}
        <div className="max-w-7xl mx-auto mt-3 flex items-center gap-2 overflow-x-auto pb-1">
          {[
            { id: 'overview', label: t('overviewTab'), icon: Activity },
            { id: 'revenue', label: isRTL ? 'عوائد المنصة (Recharts)' : 'Platform Revenue', icon: DollarSign, badge: isRTL ? 'جديد' : 'New' },
            { id: 'activity', label: isRTL ? `سجل النشاط الحي (${analyticsEvents.length})` : `System Activity (${analyticsEvents.length})`, icon: Radio, badge: isRTL ? 'مباشر' : 'Live' },
            { id: 'finance', label: `${t('financeTab')} (${totalEstimatedMRR} EGP)`, icon: Coins },
            { id: 'doctors', label: `${t('doctorsTab')} (${doctors.length})`, icon: Users, badge: pendingDoctors.length ? `${pendingDoctors.length} ${isRTL ? 'بانتظار الاعتماد' : 'Pending'}` : null },
            { id: 'plans', label: `${t('plansTab')} (${plans.length})`, icon: CreditCard },
            { id: 'ai', label: `${t('aiTab')} (${totalAiQueriesUsed})`, icon: Cpu },
            { id: 'labs', label: `${t('labsTab')} (${labs.length})`, icon: FlaskConical, badge: pendingLabs.length ? `${pendingLabs.length} ${isRTL ? 'بانتظار الاعتماد' : 'Pending'}` : null }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 border cursor-pointer ${
                  isActive
                    ? 'bg-teal-600 text-white border-teal-600 shadow-sm shadow-teal-600/20'
                    : 'bg-white/70 backdrop-blur-md text-slate-600 border-white/80 hover:text-slate-900 hover:bg-white shadow-[0_2px_8px_rgba(15,23,42,0.03)]'
                }`}
              >
                <Icon size={15} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-black px-2 py-0.2 rounded-full">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-6 space-y-6">

        {/* Quick Action Bar (Frosted Glass) */}
        <div className="bg-white/80 backdrop-blur-xl border border-white/90 rounded-2xl p-3.5 shadow-[0_8px_30px_rgba(15,23,42,0.04)] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-teal-600" />
            <span className="text-xs font-black text-slate-900">{t('quickActions')}:</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setAddDoctorModalOpen(true)}
              className="bg-teal-600 hover:bg-teal-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm shadow-teal-600/20 cursor-pointer"
            >
              <Plus size={14} />
              <span>{t('addDoctor')}</span>
            </button>

            <button
              onClick={() => exportDoctorsToCSV(doctors, plans)}
              className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <FileSpreadsheet size={14} className="text-emerald-600" />
              <span>{t('exportDoctorsExcel')}</span>
            </button>

            <button
              onClick={() => exportFinancialSummaryToCSV(doctors, plans)}
              className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <FileSpreadsheet size={14} className="text-teal-600" />
              <span>{t('exportFinanceExcel')}</span>
            </button>

            <button
              onClick={handleBulkResetQuotas}
              className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <RefreshCw size={13} className="text-amber-500" />
              <span>{t('resetQuotas')}</span>
            </button>

            <button
              onClick={handleToggleGlobalAi}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border cursor-pointer ${
                globalAiEnabled
                  ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              <Zap size={14} />
              <span>{globalAiEnabled ? t('emergencyAiStop') : t('resumeAi')}</span>
            </button>
          </div>
        </div>

        {/* Pending Approvals Warning Card in Frosted Amber Glass */}
        {(pendingDoctors.length > 0 || pendingLabs.length > 0) && (
          <div className="bg-amber-50/70 backdrop-blur-xl border border-amber-300 rounded-3xl p-5 shadow-[0_8px_30px_rgba(245,158,11,0.06)] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <AlertTriangle size={20} className="text-amber-600 animate-pulse" />
                <h3 className="text-sm font-black text-amber-950">
                  {isRTL ? 'طلبات عيادات ومعامل جديدة تنتظر اعتماد المشرف العام' : 'New Clinic & Lab Registrations Awaiting Admin Approval'}
                </h3>
              </div>
              <span className="text-xs font-black bg-amber-400 text-slate-950 px-2.5 py-0.5 rounded-full shadow-xs">
                {pendingDoctors.length + pendingLabs.length} {isRTL ? 'طلب جديد' : 'New Requests'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              {pendingDoctors.map((pDoc) => (
                <div key={pDoc.id} className="bg-white/90 backdrop-blur-md p-3.5 rounded-2xl border border-amber-200 flex items-center justify-between shadow-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-900 block">{pDoc.name}</span>
                      <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded font-mono border border-slate-200">
                        {pDoc.medicalLicenseNumber || (isRTL ? 'قيد التدقيق' : 'Pending')}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">{pDoc.clinicCode} · {pDoc.clinicName}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleVerifyLicense(pDoc)}
                      className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-all shadow-xs cursor-pointer"
                      title={t('verifyLicenseAction')}
                    >
                      {t('verifyLicenseAction')}
                    </button>
                    <button
                      onClick={() => handleToggleDoctorStatus(pDoc)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all shadow-xs cursor-pointer"
                    >
                      {isRTL ? 'قبول واعتماد ✓' : 'Approve ✓'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Global Key Metrics Grid (Frosted Glass Cards) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white/80 backdrop-blur-xl border border-white/80 p-4 rounded-2xl space-y-1 relative overflow-hidden shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
            <div className={`absolute top-0 ${isRTL ? 'right-0' : 'left-0'} w-1 bg-teal-500 h-full`} />
            <span className="text-xs text-slate-500 font-bold block">{t('totalClinics')}</span>
            <div className="text-2xl font-black text-slate-900 font-mono">{totalDoctors}</div>
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-teal-700 font-bold">{activeDoctors} {isRTL ? 'نشطة' : 'active'}</span>
              <span className="text-amber-700 font-bold">{pendingDoctors.length} {isRTL ? 'بانتظار الاعتماد' : 'pending'}</span>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-xl border border-white/80 p-4 rounded-2xl space-y-1 relative overflow-hidden shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
            <div className={`absolute top-0 ${isRTL ? 'right-0' : 'left-0'} w-1 bg-emerald-500 h-full`} />
            <span className="text-xs text-slate-500 font-bold block">{t('mrr')}</span>
            <div className="text-2xl font-black text-emerald-600 font-mono">{totalEstimatedMRR.toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')} EGP</div>
            <span className="text-[10px] text-slate-500 font-bold">{t('arr')}: {totalEstimatedARR.toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')} EGP</span>
          </div>

          <div className="bg-white/80 backdrop-blur-xl border border-white/80 p-4 rounded-2xl space-y-1 relative overflow-hidden shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
            <div className={`absolute top-0 ${isRTL ? 'right-0' : 'left-0'} w-1 bg-amber-500 h-full`} />
            <span className="text-xs text-slate-500 font-bold block">{t('aiQueries')}</span>
            <div className="text-2xl font-black text-amber-600 font-mono">{totalAiQueriesUsed.toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')}</div>
            <span className="text-[10px] text-slate-500 font-bold">~{estimatedAiCostEgp} EGP {isRTL ? 'تكلفة تقديرية' : 'est. cost'}</span>
          </div>

          <div className="bg-white/80 backdrop-blur-xl border border-white/80 p-4 rounded-2xl space-y-1 relative overflow-hidden shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
            <div className={`absolute top-0 ${isRTL ? 'right-0' : 'left-0'} w-1 bg-indigo-500 h-full`} />
            <span className="text-xs text-slate-500 font-bold block">{t('netMargin')}</span>
            <div className="text-2xl font-black text-indigo-600 font-mono">{netEstimatedMargin.toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')} EGP</div>
            <span className="text-[10px] text-emerald-700 font-bold">{isRTL ? 'هامش أرباح ممتاز' : 'High Cloud Profit Margin'}</span>
          </div>
        </div>

        {/* ================= TAB 1: OVERVIEW & SYSTEM HEALTH ================= */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Quick Analytics & Health status */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white/80 backdrop-blur-xl border border-white/80 p-5 rounded-3xl space-y-3 shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500">حالة خوادم السحابة وقواعد البيانات</span>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                </div>
                <div className="text-xl font-black text-slate-900">المنظومة تعمل بكفاءة 100%</div>
                <ul className="text-xs text-slate-600 space-y-1.5 pt-2 border-t border-slate-100">
                  <li className="flex items-center justify-between">
                    <span>Firestore Database</span>
                    <span className="text-emerald-700 font-bold">متصل (Connected)</span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span>Gemini 1.5 Flash API</span>
                    <span className="text-emerald-700 font-bold">نشط (Operational)</span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span>Google Calendar Sync</span>
                    <span className="text-teal-700 font-bold">جاهز ومفعل</span>
                  </li>
                </ul>
              </div>

              <div className="bg-white/80 backdrop-blur-xl border border-white/80 p-5 rounded-3xl space-y-3 shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
                <span className="text-xs font-bold text-slate-500 block">توزيع الاشتراكات على الباقات</span>
                <div className="space-y-2">
                  {plans.map((p) => {
                    const count = doctors.filter(d => d.planId === p.id && d.status === 'active').length;
                    const pct = activeDoctors > 0 ? Math.round((count / activeDoctors) * 100) : 0;
                    return (
                      <div key={p.id} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-700">{p.name}</span>
                          <span className="font-mono text-teal-700 font-bold">{count} عيادة ({pct}%)</span>
                        </div>
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-teal-600 h-full rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-white/80 backdrop-blur-xl border border-white/80 p-5 rounded-3xl space-y-3 shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
                <span className="text-xs font-bold text-slate-500 block">إحصائيات الإقبال والتفاعل الحي</span>
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-600">إجمالي الزيارات والصفحات:</span>
                    <span className="text-sm font-black text-slate-900 font-mono">{analyticsMetrics.totalVisits}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-600">تجارب البوابة التجريبية:</span>
                    <span className="text-sm font-black text-teal-700 font-mono">{analyticsMetrics.demoTrialsTotal}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-600">معامل التحاليل المعتمدة:</span>
                    <span className="text-sm font-black text-indigo-700 font-mono">{labs.length}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Expiring Soon Subscriptions Alert */}
            {expiringDoctors.length > 0 && (
              <div className="bg-amber-50/60 backdrop-blur-xl border border-amber-200 rounded-3xl p-5 space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CalendarClock size={18} className="text-amber-600" />
                    <h3 className="text-sm font-black text-slate-900">اشتراكات أوشكت على الانتهاء خلال 30 يوماً</h3>
                  </div>
                  <span className="text-xs bg-amber-100 text-amber-800 border border-amber-300 px-2.5 py-0.5 rounded-full font-bold">
                    {expiringDoctors.length} عيادة
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {expiringDoctors.map(ed => (
                    <div key={ed.id} className="bg-white/90 backdrop-blur-md border border-amber-200/80 p-3.5 rounded-2xl flex items-center justify-between shadow-xs">
                      <div>
                        <span className="text-xs font-black text-slate-900 block">{ed.name}</span>
                        <span className="text-[11px] text-slate-500">{ed.clinicName} · ينتهي في: <strong className="text-amber-700 font-mono">{ed.subscriptionExpiresAt}</strong></span>
                      </div>
                      <button
                        onClick={() => handleExtendSubscription(ed)}
                        className="bg-teal-600 hover:bg-teal-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                      >
                        تمديد 30 يوم +
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* System Activity Log Stream in Overview */}
            <div className="pt-2">
              <SystemActivityLog events={analyticsEvents} onClearLogs={resetAnalyticsData} />
            </div>
          </div>
        )}

        {/* ================= TAB: PLATFORM REVENUE (RECHARTS) ================= */}
        {activeTab === 'revenue' && (
          <div className="space-y-6">
            <PlatformRevenueDashboard doctors={doctors} plans={plans} />
          </div>
        )}

        {/* ================= TAB: SYSTEM ACTIVITY LOG ================= */}
        {activeTab === 'activity' && (
          <div className="space-y-6">
            <SystemActivityLog events={analyticsEvents} onClearLogs={resetAnalyticsData} />
          </div>
        )}

        {/* ================= TAB 2: FINANCIAL OVERSIGHT ================= */}
        {activeTab === 'finance' && (
          <div className="space-y-6">
            {/* Recharts Platform Revenue & Transaction Fees Visualization */}
            <PlatformRevenueDashboard doctors={doctors} plans={plans} />

            <div className="bg-white/80 backdrop-blur-xl border border-white/80 rounded-3xl p-6 space-y-4 shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <h2 className="text-base font-black text-slate-900">التحليلات المالية والتدفقات النقدية (SaaS Revenue)</h2>
                  <p className="text-xs text-slate-500">حساب العوائد الشهرية المتكررة، تكاليف السحابة، وهامش الربحية</p>
                </div>

                <button
                  onClick={() => exportFinancialSummaryToCSV(doctors, plans)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 w-fit shadow-xs cursor-pointer"
                >
                  <FileSpreadsheet size={15} />
                  <span>تصدير تقرير الإيرادات (Excel)</span>
                </button>
              </div>

              {/* Financial KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div className="bg-white/90 border border-slate-200/80 p-4 rounded-2xl space-y-1 shadow-xs">
                  <span className="text-xs text-slate-500 font-bold block">العائد الشهري المتكرر (MRR)</span>
                  <div className="text-2xl font-black text-emerald-600 font-mono">{totalEstimatedMRR.toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')} EGP</div>
                  <span className="text-[10px] text-slate-500">من إجمالي {activeDoctors} عيادة نشطة</span>
                </div>

                <div className="bg-white/90 border border-slate-200/80 p-4 rounded-2xl space-y-1 shadow-xs">
                  <span className="text-xs text-slate-500 font-bold block">العائد السنوي المتوقع (ARR Run-Rate)</span>
                  <div className="text-2xl font-black text-teal-600 font-mono">{totalEstimatedARR.toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')} EGP</div>
                  <span className="text-[10px] text-slate-500">افتراض استقرار وتجديد الاشتراكات</span>
                </div>

                <div className="bg-white/90 border border-slate-200/80 p-4 rounded-2xl space-y-1 shadow-xs">
                  <span className="text-xs text-slate-500 font-bold block">متوسط الإيراد لكل عيادة (ARPU)</span>
                  <div className="text-2xl font-black text-indigo-600 font-mono">
                    {activeDoctors > 0 ? Math.round(totalEstimatedMRR / activeDoctors) : 0} EGP
                  </div>
                  <span className="text-[10px] text-slate-500">شهرياً لكل حساب طبيب</span>
                </div>
              </div>

              {/* Plans Financial Breakdown Table */}
              <div className="pt-4">
                <h3 className="text-xs font-black text-slate-800 mb-3">تفصيل الإيرادات حسب خطط الاشتراك المعتمدة:</h3>
                <div className="overflow-x-auto rounded-2xl border border-slate-200/70">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500">
                        <th className="py-2.5 px-3">اسم الباقة</th>
                        <th className="py-2.5 px-3">سعر الاشتراك</th>
                        <th className="py-2.5 px-3">العيادات النشطة</th>
                        <th className="py-2.5 px-3">الإيراد الشهري المجمع</th>
                        <th className="py-2.5 px-3">الإيراد السنوي المتوقع</th>
                        <th className="py-2.5 px-3 text-center">نسبة الحصة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono bg-white">
                      {plans.map((p) => {
                        const count = doctors.filter(d => d.planId === p.id && d.status === 'active').length;
                        const subtotalMonthly = count * p.price;
                        const subtotalAnnual = subtotalMonthly * 12;
                        const sharePct = totalEstimatedMRR > 0 ? Math.round((subtotalMonthly / totalEstimatedMRR) * 100) : 0;
                        return (
                          <tr key={p.id} className="hover:bg-slate-50/70">
                            <td className="py-3 px-3 font-sans font-bold text-slate-900 flex items-center gap-2">
                              <span>{p.name}</span>
                              {p.isDefault && <span className="text-[9px] bg-teal-50 text-teal-700 border border-teal-200 px-1.5 py-0.5 rounded font-sans font-bold">افتراضي</span>}
                            </td>
                            <td className="py-3 px-3 text-slate-700">{p.price} {p.currency}</td>
                            <td className="py-3 px-3 text-slate-900 font-bold">{count}</td>
                            <td className="py-3 px-3 text-emerald-700 font-bold">{subtotalMonthly.toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')} EGP</td>
                            <td className="py-3 px-3 text-teal-700">{subtotalAnnual.toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')} EGP</td>
                            <td className="py-3 px-3 text-center">
                              <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full text-[10px] font-sans">
                                {sharePct}%
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 3: DOCTORS & LICENSES ================= */}
        {activeTab === 'doctors' && (
          <div className="bg-white/80 backdrop-blur-xl border border-white/80 rounded-3xl p-5 space-y-4 shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-base font-black text-slate-900">إدارة عيادات الأطباء وتراخيص مزاولة المهنة</h2>
                <p className="text-xs text-slate-500">تدقيق التراخيص، التحكم بالباقات، سجل النشاط الحي، وإيقاف/تفعيل الحسابات</p>
              </div>

              {/* Search & Filter bar */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="بحث بالطبيب، الكود، الترخيص..."
                    className="bg-white border border-slate-300 text-xs rounded-xl px-3.5 py-2 pr-8 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-teal-500 shadow-xs w-52"
                  />
                  <Search size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="bg-white border border-slate-300 text-xs rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-teal-500 shadow-xs"
                >
                  <option value="all">كافة الحسابات ({doctors.length})</option>
                  <option value="active">النشطة فقط ({activeDoctors})</option>
                  <option value="pending">بانتظار الاعتماد ({pendingDoctors.length})</option>
                  <option value="expiring">أوشكت على الانتهاء ({expiringDoctors.length})</option>
                  <option value="suspended">المجمدة ({doctors.filter(d => d.status === 'suspended').length})</option>
                </select>

                <button
                  onClick={() => exportDoctorsToCSV(doctors, plans)}
                  className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
                  title="تصدير كشف الأطباء إلى Excel"
                >
                  <Download size={14} className="text-teal-600" />
                  <span>تصدير Excel</span>
                </button>
              </div>
            </div>

            {/* Doctors Grid / Table (Frosted Glass Cards) */}
            <div className="space-y-3">
              {filteredDoctors.map((docItem) => {
                const isVerified = docItem.verificationStatus === 'verified';
                const aiPct = docItem.aiQuotaLimit > 0 ? Math.min(100, Math.round((docItem.aiQueriesUsed / docItem.aiQuotaLimit) * 100)) : 0;

                return (
                  <div
                    key={docItem.id}
                    className={`p-4 rounded-2xl border transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
                      docItem.status === 'pending'
                        ? 'bg-amber-50/70 border-amber-300 shadow-xs'
                        : docItem.status === 'suspended'
                        ? 'bg-rose-50/50 border-rose-200 shadow-xs'
                        : 'bg-white/90 backdrop-blur-md border border-white/90 shadow-[0_4px_16px_rgba(15,23,42,0.03)] hover:shadow-md hover:border-teal-200'
                    }`}
                  >
                    {/* Left: Doctor info and status */}
                    <div className="flex items-start sm:items-center gap-3.5">
                      <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 border border-teal-200/80 flex items-center justify-center font-black text-sm shrink-0 shadow-xs">
                        <Stethoscope size={22} />
                      </div>

                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-black text-slate-900">{docItem.name}</h3>

                          <span className="text-[10px] font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                            {docItem.clinicCode}
                          </span>

                          {/* Verification Badge */}
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                            isVerified
                              ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            <BadgeCheck size={12} />
                            <span>{isVerified ? 'ترخيص معتمد' : 'ترخيص قيد التدقيق'}</span>
                          </span>

                          {/* Status Badge */}
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            docItem.status === 'active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                            docItem.status === 'pending' ? 'bg-amber-50 text-amber-700 border border-amber-200 animate-pulse' :
                            'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}>
                            {docItem.status === 'active' ? 'نشط' : docItem.status === 'pending' ? 'بانتظار الاعتماد' : 'مجمّد'}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                          <span>{docItem.clinicName}</span>
                          <span>·</span>
                          <span>ترخيص: <strong className="text-slate-700 font-mono">{docItem.medicalLicenseNumber || 'قيد التسجيل'}</strong></span>
                          <span>·</span>
                          <span>الباقة: <strong className="text-teal-700">{docItem.planName}</strong></span>
                          <span>·</span>
                          <span>ينتهي: <strong className="text-slate-700 font-mono">{docItem.subscriptionExpiresAt || '2026-12-31'}</strong></span>
                        </div>

                        {/* Activity Metrics Strip */}
                        <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-slate-600 font-mono">
                          <span className="bg-slate-50 px-2 py-0.5 rounded border border-slate-200 text-slate-700">
                            👥 {docItem.patientCount ?? 3} مرضى
                          </span>
                          <span className="bg-slate-50 px-2 py-0.5 rounded border border-slate-200 text-slate-700">
                            💊 {docItem.prescriptionsIssued ?? 14} روشتة
                          </span>
                          <span className="bg-slate-50 px-2 py-0.5 rounded border border-slate-200 text-slate-700">
                            🫀 {docItem.echoReportsCount ?? 8} إيكو
                          </span>
                          <span className="bg-slate-50 px-2 py-0.5 rounded border border-slate-200 text-slate-700">
                            🤖 AI: {docItem.aiQueriesUsed || 0}/{docItem.aiQuotaLimit || 200} ({aiPct}%)
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Actions Toolbar */}
                    <div className="flex flex-wrap items-center gap-2 shrink-0 pt-2 lg:pt-0">
                      {/* Verify License Shortcut */}
                      {!isVerified && (
                        <button
                          onClick={() => handleVerifyLicense(docItem)}
                          className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                        >
                          <BadgeCheck size={14} />
                          <span>اعتماد الترخيص</span>
                        </button>
                      )}

                      {/* Edit Doctor Plan & Quota Modal button */}
                      <button
                        onClick={() => openDoctorEditModal(docItem)}
                        className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1 shadow-xs cursor-pointer"
                      >
                        <Edit3 size={13} className="text-teal-600" />
                        <span>تعديل الباقة والكوتة</span>
                      </button>

                      {/* Extend subscription */}
                      <button
                        onClick={() => handleExtendSubscription(docItem)}
                        className="px-2.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                        title="تمديد الاشتراك 30 يوم"
                      >
                        +30 يوم
                      </button>

                      {/* Toggle status */}
                      <button
                        onClick={() => handleToggleDoctorStatus(docItem)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer ${
                          docItem.status === 'active'
                            ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        }`}
                      >
                        {docItem.status === 'active' ? 'تجميد' : 'تفعيل ✓'}
                      </button>

                      {/* Toggle AI */}
                      <button
                        onClick={() => handleToggleDoctorAi(docItem)}
                        className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all border shadow-xs cursor-pointer ${
                          docItem.isAiBlocked
                            ? 'bg-amber-50 text-amber-700 border-amber-300'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                        title={docItem.isAiBlocked ? 'إلغاء حظر AI' : 'حظر استهلاك AI'}
                      >
                        {docItem.isAiBlocked ? 'إلغاء حظر AI' : 'حظر AI'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ================= TAB 4: PLANS EDITOR ================= */}
        {activeTab === 'plans' && (
          <div className="bg-white/80 backdrop-blur-xl border border-white/80 rounded-3xl p-5 space-y-4 shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-base font-black text-slate-900">محرر باقات الاشتراكات الديناميكي</h2>
                <p className="text-xs text-slate-500">تعديل الأسعار، حدك الأقصى للمرضى، وكوتة الذكاء الاصطناعي</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {plans.map((plan) => (
                <div key={plan.id} className="bg-white/90 backdrop-blur-md border border-slate-200/80 rounded-2xl p-5 space-y-3 relative shadow-xs hover:shadow-md hover:border-teal-300 transition-all">
                  {plan.isDefault && (
                    <span className="absolute top-3 left-3 bg-teal-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-xs">
                      الباقة الافتراضية
                    </span>
                  )}
                  <h3 className="text-sm font-black text-slate-900">{plan.name}</h3>
                  <div className="text-2xl font-black text-teal-700 font-mono">
                    {plan.price} <span className="text-xs text-slate-500 font-normal">{plan.currency}/شهر</span>
                  </div>
                  <ul className="text-xs text-slate-600 space-y-1.5 pt-2 border-t border-slate-100">
                    <li>• السعة: {plan.maxPatients === -1 ? 'مرضى غير محدود' : `${plan.maxPatients} مريض`}</li>
                    <li>• AI: {plan.aiMonthlyQuota === -1 ? 'ذكاء اصطناعي غير محدود' : `${plan.aiMonthlyQuota} استعلام/شهر`}</li>
                    <li>• فحص التداخلات الدوائية (DDI): {plan.features.ddiChecker ? 'مفعل ✓' : 'غير متوفر'}</li>
                    <li>• ربط معامل التحاليل: {plan.features.labIntegration ? 'مفعل ✓' : 'غير متوفر'}</li>
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= TAB 5: AI GOVERNANCE & COST ================= */}
        {activeTab === 'ai' && (
          <div className="bg-white/80 backdrop-blur-xl border border-white/80 rounded-3xl p-5 space-y-4 shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-base font-black text-slate-900">حوكمة واستهلاك Gemini AI وتكاليف السحابة</h2>
                <p className="text-xs text-slate-500">مراقبة التوكنز، حساب التكاليف الفعلية، وتعيين الحصص للعيادات</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleBulkResetQuotas}
                  className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <RefreshCw size={13} className="text-amber-500" />
                  <span>تصفير حصص الشهر</span>
                </button>

                <button
                  onClick={handleToggleGlobalAi}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs ${
                    globalAiEnabled
                      ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  }`}
                >
                  <Zap size={14} />
                  <span>{globalAiEnabled ? 'إيقاف طوارئ للـ AI' : 'تفعيل AI المنصة'}</span>
                </button>
              </div>
            </div>

            {/* AI Cost Estimator Widget */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-white/90 p-4 rounded-2xl border border-slate-200/80 shadow-xs">
                <span className="text-xs text-slate-500 font-bold block">إجمالي استعلامات الشهر</span>
                <div className="text-2xl font-black text-amber-600 font-mono">{totalAiQueriesUsed} استعلام</div>
                <span className="text-[10px] text-slate-400 font-mono">Gemini 1.5 Flash</span>
              </div>

              <div className="bg-white/90 p-4 rounded-2xl border border-slate-200/80 shadow-xs">
                <span className="text-xs text-slate-500 font-bold block">التكلفة التقديرية بالجنيه (EGP)</span>
                <div className="text-2xl font-black text-teal-700 font-mono">~{estimatedAiCostEgp} EGP</div>
                <span className="text-[10px] text-slate-400 font-mono">معدل ~0.05 EGP للاستعلام</span>
              </div>

              <div className="bg-white/90 p-4 rounded-2xl border border-slate-200/80 shadow-xs">
                <span className="text-xs text-slate-500 font-bold block">نسبة تكلفة AI من إجمالي الإيراد</span>
                <div className="text-2xl font-black text-emerald-600 font-mono">
                  {totalEstimatedMRR > 0 ? ((estimatedAiCostEgp / totalEstimatedMRR) * 100).toFixed(1) : 0}%
                </div>
                <span className="text-[10px] text-emerald-700 font-bold">تكلفة منخفضة للغاية وهوامش ربح ممتازة</span>
              </div>
            </div>

            {/* Per-Clinic AI Usage List */}
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-black text-slate-800">معدل استهلاك كل عيادة للحصة الشهرية:</h3>
              {doctors.map((docItem) => {
                const used = docItem.aiQueriesUsed || 0;
                const limit = docItem.aiQuotaLimit || 200;
                const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
                const isOverQuota = used >= limit;
                const isNearQuota = pct >= 80;

                const barColor = isOverQuota
                  ? 'bg-rose-500'
                  : isNearQuota
                  ? 'bg-amber-400'
                  : 'bg-teal-500';

                return (
                  <div key={docItem.id} className="bg-white/90 border border-slate-200/80 rounded-2xl p-4 space-y-2 shadow-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">{docItem.name} ({docItem.clinicName})</span>
                        {docItem.isAiBlocked && (
                          <span className="text-[10px] bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.2 rounded font-bold">
                            محظور
                          </span>
                        )}
                        {isOverQuota && !docItem.isAiBlocked && (
                          <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.2 rounded font-bold">
                            تجاوز الحصة
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-slate-700">
                          {used} / {limit} استعلام ({pct}%)
                        </span>
                        <button
                          onClick={() => openDoctorEditModal(docItem)}
                          className="text-[11px] text-teal-700 hover:text-teal-800 underline font-bold cursor-pointer"
                        >
                          تعديل الكوتة
                        </button>
                      </div>
                    </div>

                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div className={`${barColor} h-full transition-all duration-300 rounded-full`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ================= TAB 6: LABS TAB ================= */}
        {activeTab === 'labs' && (
          <div className="bg-white/80 backdrop-blur-xl border border-white/80 rounded-3xl p-5 space-y-4 shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-base font-black text-slate-900">إدارة شبكة معامل التحاليل الطبية الشريكة</h2>
                <p className="text-xs text-slate-500">قبول واعتماد المعامل ورصد عدد الفحوصات المرفوعة للعيادات</p>
              </div>
            </div>

            <div className="space-y-2.5">
              {labs.map((lab) => (
                <div key={lab.id} className="bg-white/90 border border-slate-200/80 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs font-black text-slate-900">{lab.name}</h3>
                      <span className={`text-[10px] font-bold px-2 py-0.2 rounded-full ${
                        lab.status === 'active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {lab.status === 'active' ? 'معتمد' : 'بانتظار المراجعة'}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {lab.labCode} · {lab.branch} · الفني المسؤول: {lab.technicianName}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleLabStatus(lab)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer ${
                        lab.status === 'active'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      }`}
                    >
                      {lab.status === 'active' ? 'تجميد المعمل' : 'قبول واعتماد ✓'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* ================= MODAL: EDIT DOCTOR PLAN & QUOTA ================= */}
      {doctorModalOpen && selectedDoctor && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4" dir="rtl">
          <div className="bg-white/95 backdrop-blur-2xl border border-white/90 rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-[0_20px_60px_rgba(15,23,42,0.15)]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Edit3 size={18} className="text-teal-600" />
                <h3 className="text-sm font-black text-slate-900">تعديل باقة واشتراك د/ {selectedDoctor.name}</h3>
              </div>
              <button onClick={() => setDoctorModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveDoctorEdit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">باقة الاشتراك المخصصة:</label>
                <select
                  value={doctorNewPlanId}
                  onChange={(e) => {
                    setDoctorNewPlanId(e.target.value);
                    const chosen = plans.find(p => p.id === e.target.value);
                    if (chosen) {
                      setDoctorNewQuota(chosen.aiMonthlyQuota === -1 ? 9999 : chosen.aiMonthlyQuota);
                      setDoctorNewPatientsLimit(chosen.maxPatients === -1 ? 9999 : chosen.maxPatients);
                    }
                  }}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 focus:bg-white focus:outline-none focus:border-teal-500 shadow-xs"
                >
                  {plans.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.price} {p.currency}/شهر)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">كوتة الذكاء الاصطناعي (استعلام/شهر):</label>
                  <input
                    type="number"
                    value={doctorNewQuota}
                    onChange={(e) => setDoctorNewQuota(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 font-mono focus:bg-white focus:outline-none focus:border-teal-500 shadow-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">الحد الأقصى لمرضى العيادة:</label>
                  <input
                    type="number"
                    value={doctorNewPatientsLimit}
                    onChange={(e) => setDoctorNewPatientsLimit(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 font-mono focus:bg-white focus:outline-none focus:border-teal-500 shadow-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">رقم ترخيص مزاولة المهنة والنقابة:</label>
                  <input
                    type="text"
                    value={doctorNewLicense}
                    onChange={(e) => setDoctorNewLicense(e.target.value)}
                    placeholder="مثال: EGY-MED-49102"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 font-mono focus:bg-white focus:outline-none focus:border-teal-500 shadow-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">تاريخ انتهاء الاشتراك:</label>
                  <input
                    type="date"
                    value={doctorNewExpiry}
                    onChange={(e) => setDoctorNewExpiry(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 font-mono focus:bg-white focus:outline-none focus:border-teal-500 shadow-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">حالة الحساب:</label>
                <select
                  value={doctorNewStatus}
                  onChange={(e) => setDoctorNewStatus(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 focus:bg-white focus:outline-none focus:border-teal-500 shadow-xs"
                >
                  <option value="active">نشط ومفعل (Active)</option>
                  <option value="pending">بانتظار التدقيق والاعتماد (Pending)</option>
                  <option value="suspended">مجمّد (Suspended)</option>
                  <option value="trial">فترة تجريبية (Trial)</option>
                  <option value="expired">منتهي الصلاحية (Expired)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setDoctorModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold shadow-sm shadow-teal-600/20 cursor-pointer"
                >
                  حفظ التعديلات ✓
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: ADD NEW DOCTOR ================= */}
      {addDoctorModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4" dir="rtl">
          <div className="bg-white/95 backdrop-blur-2xl border border-white/90 rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-[0_20px_60px_rgba(15,23,42,0.15)]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Plus size={18} className="text-teal-600" />
                <h3 className="text-sm font-black text-slate-900">تسجيل عيادة طبيب جديدة في المنظومة</h3>
              </div>
              <button onClick={() => setAddDoctorModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddDoctorSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">اسم الطبيب الكامل:</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: د/ حسام الدين فؤاد"
                  value={newDocForm.name}
                  onChange={(e) => setNewDocForm({ ...newDocForm, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 focus:bg-white focus:outline-none focus:border-teal-500 shadow-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">اسم العيادة / المركز:</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: عيادة النيل للقلب"
                    value={newDocForm.clinicName}
                    onChange={(e) => setNewDocForm({ ...newDocForm, clinicName: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 focus:bg-white focus:outline-none focus:border-teal-500 shadow-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">كود العيادة (Clinic Code):</label>
                  <input
                    type="text"
                    placeholder="مثال: CLINIC-NILE-404"
                    value={newDocForm.clinicCode}
                    onChange={(e) => setNewDocForm({ ...newDocForm, clinicCode: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 font-mono focus:bg-white focus:outline-none focus:border-teal-500 shadow-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">رقم ترخيص النقابة / المهنة:</label>
                  <input
                    type="text"
                    placeholder="مثال: EGY-MED-84920"
                    value={newDocForm.medicalLicenseNumber}
                    onChange={(e) => setNewDocForm({ ...newDocForm, medicalLicenseNumber: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 font-mono focus:bg-white focus:outline-none focus:border-teal-500 shadow-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">باقة الاشتراك:</label>
                  <select
                    value={newDocForm.planId}
                    onChange={(e) => setNewDocForm({ ...newDocForm, planId: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 focus:bg-white focus:outline-none focus:border-teal-500 shadow-xs"
                  >
                    {plans.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.price} EGP)</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">رقم الهاتف:</label>
                  <input
                    type="tel"
                    placeholder="010XXXXXXXX"
                    value={newDocForm.phone}
                    onChange={(e) => setNewDocForm({ ...newDocForm, phone: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 font-mono focus:bg-white focus:outline-none focus:border-teal-500 shadow-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">البريد الإلكتروني:</label>
                  <input
                    type="email"
                    placeholder="doctor@cardios.eg"
                    value={newDocForm.email}
                    onChange={(e) => setNewDocForm({ ...newDocForm, email: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 font-mono focus:bg-white focus:outline-none focus:border-teal-500 shadow-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAddDoctorModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold shadow-sm shadow-teal-600/20 cursor-pointer"
                >
                  إضافة واعتماد العيادة ✓
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
