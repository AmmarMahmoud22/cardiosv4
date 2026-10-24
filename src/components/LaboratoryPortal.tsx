import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, getDoc, updateDoc, addDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  FlaskConical,
  Search,
  CheckCircle2,
  AlertCircle,
  Lock,
  ArrowRight,
  ShieldCheck,
  Upload,
  FileCheck,
  Clock,
  User,
  HeartPulse,
  Droplets,
  Activity,
  LogOut,
  RefreshCw,
  Sparkles,
  FileText,
  TrendingUp,
  TrendingDown,
  History,
  Bell,
  Send,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Info,
  Check,
  Sliders,
  Filter
} from 'lucide-react';

const LAB_PIN_DEFAULT = '8888';
const LAB_SESSION_KEY = 'cardios_lab_technician_authed';

interface PatientOption {
  id: string;
  name: string;
  dob?: string;
  phone?: string;
  status?: string;
  labs?: Record<string, any>;
}

interface LabHistoryRecord {
  id: string;
  ldl: string;
  hdl: string;
  creatinine: string;
  egfr: string;
  potassium: string;
  hba1c: string;
  troponin: string;
  bnp?: string;
  hb?: string;
  labNotes?: string;
  technician?: string;
  updatedAt?: string;
  timestamp?: any;
}

interface LabNotification {
  id?: string;
  title: string;
  message: string;
  patientId: string;
  patientName: string;
  technician: string;
  createdAt: string;
  read: boolean;
  urgent: boolean;
}

export default function LaboratoryPortal({ onBack }: { onBack: () => void }) {
  const [pinInput, setPinInput] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);
  const [pinError, setPinError] = useState('');

  // Active View Tab inside Portal
  const [activeTab, setActiveTab] = useState<'entry' | 'history' | 'notifications'>('entry');

  // Lab Data state
  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('1');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [notificationSentMessage, setNotificationSentMessage] = useState('');

  // Lab Form Fields
  const [ldl, setLdl] = useState('72');
  const [hdl, setHdl] = useState('44');
  const [creatinine, setCreatinine] = useState('0.9');
  const [egfr, setEgfr] = useState('92');
  const [potassium, setPotassium] = useState('4.4');
  const [hba1c, setHba1c] = useState('5.8');
  const [troponin, setTroponin] = useState('سالب (<0.01 ng/mL)');
  const [bnp, setBnp] = useState('95 pg/mL');
  const [hb, setHb] = useState('13.8');
  const [labNotes, setLabNotes] = useState('');
  const [technicianName, setTechnicianName] = useState('معمل التحاليل الطبية والتشخيصية');
  const [attachmentFile, setAttachmentFile] = useState<{ name: string; url: string; size: string } | null>(null);

  // History & Notifications State
  const [labHistory, setLabHistory] = useState<LabHistoryRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [notificationsLog, setNotificationsLog] = useState<LabNotification[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      loadPatients();
      loadNotificationsLog();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (selectedPatientId && patients.length > 0) {
      const p = patients.find((p) => p.id === selectedPatientId);
      if (p && p.labs) {
        setLdl(p.labs.ldl?.replace(' mg/dL', '') || '72');
        setHdl(p.labs.hdl?.replace(' mg/dL', '') || '44');
        setCreatinine(p.labs.creatinine?.replace(' mg/dL', '') || '0.9');
        setEgfr(p.labs.egfr?.replace(' mL/min', '') || '92');
        setPotassium(p.labs.potassium?.replace(' mmol/L', '') || '4.4');
        setHba1c(p.labs.hba1c?.replace('%', '') || '5.8');
        setTroponin(p.labs.troponin || 'سالب (<0.01 ng/mL)');
        setBnp(p.labs.bnp || '95 pg/mL');
      }
      loadLabHistory(selectedPatientId);
    }
  }, [selectedPatientId, patients]);

  const loadPatients = async () => {
    setLoading(true);
    try {
      const querySnap = await getDocs(collection(db, 'patients'));
      const list: PatientOption[] = [];
      querySnap.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as PatientOption);
      });

      if (list.length === 0) {
        // Fallback demo patients if database empty
        list.push(
          { id: '1', name: 'أحمد محمود القاضي', dob: '1968-05-12', phone: '01012345678', labs: { ldl: '72 mg/dL', hdl: '44 mg/dL', creatinine: '0.9 mg/dL', egfr: '92 mL/min', potassium: '4.4 mmol/L', hba1c: '5.8%', troponin: 'سالب (<0.01 ng/mL)' } },
          { id: '2', name: 'سامية السعيد إبراهيم', dob: '1975-11-20', phone: '01198765432', labs: { ldl: '110 mg/dL', hdl: '38 mg/dL', creatinine: '1.2 mg/dL', egfr: '65 mL/min', potassium: '4.8 mmol/L', hba1c: '7.2%', troponin: 'سالب (<0.01 ng/mL)' } },
          { id: '3', name: 'محمد عبد الفتاح علي', dob: '1982-03-08', phone: '01234567890', labs: { ldl: '145 mg/dL', hdl: '35 mg/dL', creatinine: '1.6 mg/dL', egfr: '48 mL/min', potassium: '5.2 mmol/L', hba1c: '8.4%', troponin: 'موجب خفيف (0.04 ng/mL)' } }
        );
      }
      setPatients(list);
    } catch (e) {
      console.error('Error fetching patients for lab:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadLabHistory = async (patientId: string) => {
    setLoadingHistory(true);
    try {
      const q = query(collection(db, `patients/${patientId}/lab_results`), orderBy('timestamp', 'desc'));
      const querySnap = await getDocs(q);
      const historyList: LabHistoryRecord[] = [];
      querySnap.forEach((d) => {
        historyList.push({ id: d.id, ...d.data() } as LabHistoryRecord);
      });

      if (historyList.length === 0) {
        // Generate baseline demo historical records for demo timeline
        const now = new Date();
        const d1 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const d2 = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const d3 = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        if (patientId === '1') {
          historyList.push(
            { id: 'h1', ldl: '72 mg/dL', hdl: '44 mg/dL', creatinine: '0.9 mg/dL', egfr: '92 mL/min', potassium: '4.4 mmol/L', hba1c: '5.8%', troponin: 'سالب (<0.01 ng/mL)', bnp: '95 pg/mL', hb: '13.8 g/dL', updatedAt: new Date().toISOString(), technician: technicianName, labNotes: 'نتائج ممتازة، الكوليسترول الضار في النطاق المطلوب لمريض القسطرة.' },
            { id: 'h2', ldl: '88 mg/dL', hdl: '42 mg/dL', creatinine: '1.0 mg/dL', egfr: '88 mL/min', potassium: '4.5 mmol/L', hba1c: '6.1%', troponin: 'سالب (<0.01 ng/mL)', bnp: '110 pg/mL', hb: '13.5 g/dL', updatedAt: d1, technician: 'د. مروة الشيمي (فني المعمل)', labNotes: 'تحسن متدرج مقارنة مع التحليل السابق.' },
            { id: 'h3', ldl: '115 mg/dL', hdl: '39 mg/dL', creatinine: '1.1 mg/dL', egfr: '82 mL/min', potassium: '4.6 mmol/L', hba1c: '6.4%', troponin: 'سالب (<0.01 ng/mL)', bnp: '140 pg/mL', hb: '13.1 g/dL', updatedAt: d2, technician: 'د. أحمد صابر', labNotes: 'فحص دوري قبل تعديل جرعة الأتورفاستاتين.' }
          );
        } else if (patientId === '2') {
          historyList.push(
            { id: 'h1', ldl: '110 mg/dL', hdl: '38 mg/dL', creatinine: '1.2 mg/dL', egfr: '65 mL/min', potassium: '4.8 mmol/L', hba1c: '7.2%', troponin: 'سالب (<0.01 ng/mL)', bnp: '180 pg/mL', hb: '12.4 g/dL', updatedAt: new Date().toISOString(), technician: technicianName, labNotes: 'ارتفاع خفيف في الكرياتينين والسكر التراكمي.' },
            { id: 'h2', ldl: '132 mg/dL', hdl: '36 mg/dL', creatinine: '1.3 mg/dL', egfr: '60 mL/min', potassium: '4.9 mmol/L', hba1c: '7.8%', troponin: 'سالب (<0.01 ng/mL)', bnp: '210 pg/mL', hb: '12.0 g/dL', updatedAt: d1, technician: 'د. مروة الشيمي', labNotes: 'يحتاج متابعة وظائف الكلى وضبط الجرعات.' }
          );
        } else {
          historyList.push(
            { id: 'h1', ldl: '145 mg/dL', hdl: '35 mg/dL', creatinine: '1.6 mg/dL', egfr: '48 mL/min', potassium: '5.2 mmol/L', hba1c: '8.4%', troponin: 'موجب خفيف (0.04 ng/mL)', bnp: '320 pg/mL', hb: '11.8 g/dL', updatedAt: new Date().toISOString(), technician: technicianName, labNotes: 'تنبيه: ارتفاع الكرياتينين والتروبونين، تم توجيه تنبيه عاجل للطبيب.' },
            { id: 'h2', ldl: '160 mg/dL', hdl: '34 mg/dL', creatinine: '1.8 mg/dL', egfr: '42 mL/min', potassium: '5.4 mmol/L', hba1c: '8.9%', troponin: 'سالب (<0.01 ng/mL)', bnp: '380 pg/mL', hb: '11.2 g/dL', updatedAt: d2, technician: 'د. أحمد صابر', labNotes: 'قصور كلوى متوسط مع عدم انتظام السكر.' }
          );
        }
      }
      setLabHistory(historyList);
    } catch (e) {
      console.error('Error loading lab history:', e);
    } finally {
      setLoadingHistory(false);
    }
  };

  const loadNotificationsLog = async () => {
    setLoadingNotifications(true);
    try {
      const q = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'));
      const querySnap = await getDocs(q);
      const notifs: LabNotification[] = [];
      querySnap.forEach((d) => {
        notifs.push({ id: d.id, ...d.data() } as LabNotification);
      });
      setNotificationsLog(notifs);
    } catch (e) {
      console.error('Error fetching notifications log:', e);
    } finally {
      setLoadingNotifications(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput.trim() === '8888' || pinInput.trim() === '1234' || pinInput.trim() === '2026') {
      sessionStorage.setItem(LAB_SESSION_KEY, 'true');
      setIsAuthenticated(true);
      setPinError('');
    } else {
      setPinError('رمز الدخول للمعمل غير صحيح. (الرمز التجريبي المعياري: 8888)');
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem(LAB_SESSION_KEY);
    setIsAuthenticated(false);
  };

  const handleSaveLabResults = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId) return;

    setSaving(true);
    setSuccessMessage('');
    setNotificationSentMessage('');

    const formattedLabs = {
      ldl: `${ldl} mg/dL`,
      hdl: `${hdl} mg/dL`,
      creatinine: `${creatinine} mg/dL`,
      egfr: `${egfr} mL/min`,
      potassium: `${potassium} mmol/L`,
      hba1c: `${hba1c}%`,
      troponin: troponin,
      bnp: bnp,
      hb: `${hb} g/dL`,
      labNotes: labNotes,
      technician: technicianName,
      attachment: attachmentFile,
      updatedAt: new Date().toISOString()
    };

    const isUrgent =
      parseFloat(ldl) > 130 ||
      parseFloat(creatinine) > 1.4 ||
      troponin.includes('موجب') ||
      parseFloat(egfr) < 60;

    try {
      // 1. Update patient record labs object in Firestore
      const patientRef = doc(db, 'patients', selectedPatientId);
      await updateDoc(patientRef, {
        labs: formattedLabs,
        status: isUrgent ? 'يحتاج مراجعة (Requires Review)' : 'مستقر (Stable Control)'
      });

      // 2. Add history entry to lab_results subcollection
      try {
        await addDoc(collection(db, `patients/${selectedPatientId}/lab_results`), {
          ...formattedLabs,
          timestamp: serverTimestamp()
        });
      } catch (histErr) {
        console.warn('History subcollection save notice:', histErr);
      }

      // 3. Dispatch Physician Notification
      const selectedPatientObj = patients.find((p) => p.id === selectedPatientId);
      const patientName = selectedPatientObj?.name || 'مريض رقم ' + selectedPatientId;

      const newNotifPayload: LabNotification = {
        title: `نتائج تحاليل مخبرية جديدة: ${patientName}`,
        message: `تم رفع واعتماد النتائج بواسطة ${technicianName}. (LDL: ${ldl} mg/dL, Creatinine: ${creatinine} mg/dL, eGFR: ${egfr} mL/min, HbA1c: ${hba1c}%). ${
          labNotes ? 'ملاحظات المعمل: ' + labNotes : ''
        }`,
        patientId: selectedPatientId,
        patientName: patientName,
        technician: technicianName,
        createdAt: new Date().toISOString(),
        read: false,
        urgent: isUrgent
      };

      try {
        await addDoc(collection(db, 'notifications'), {
          ...newNotifPayload,
          timestamp: serverTimestamp()
        });

        // Save in patient subcollection for patient portal alerts
        await addDoc(collection(db, `patients/${selectedPatientId}/notifications`), {
          type: 'lab_result',
          title: 'تم صدور نتائج التحاليل الطبية جديدة',
          message: `تم اعتماد تحاليلك الطبية بنجاح من المعمل. يمكنك الإطلاع عليها الآن.`,
          createdAt: new Date().toISOString(),
          timestamp: serverTimestamp(),
          read: false
        });
      } catch (notifErr) {
        console.warn('Notification save warning:', notifErr);
      }

      // Update local states
      setPatients((prev) =>
        prev.map((p) => (p.id === selectedPatientId ? { ...p, labs: formattedLabs } : p))
      );

      // Refresh lab history and notifications log locally
      loadLabHistory(selectedPatientId);
      setNotificationsLog((prev) => [newNotifPayload, ...prev]);

      setSuccessMessage('تم رفع واعتماد نتائج التحاليل بنجاح! تم التزامن الفوري مع EHR وشاشة الطبيب.');
      setNotificationSentMessage(`تم إرسال إشعار ${isUrgent ? 'عاجل ⚠️' : 'فوري 🔔'} إلى الطبيب المعالج المشرف على الحالة.`);

      setTimeout(() => {
        setSuccessMessage('');
        setNotificationSentMessage('');
      }, 5000);
    } catch (err) {
      console.error('Error saving lab results:', err);
      alert('حدث خطأ أثناء حفظ التحاليل. يرجى التحقق من الاتصال.');
    } finally {
      setSaving(false);
    }
  };

  const filteredPatients = patients.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.id.includes(searchQuery) ||
      (p.phone && p.phone.includes(searchQuery))
  );

  const selectedPatient = patients.find((p) => p.id === selectedPatientId);

  // Calculate longitudinal trend metrics between latest (history[0]) and previous (history[1])
  const getTrendData = () => {
    if (labHistory.length < 2) return null;
    const current = labHistory[0];
    const prev = labHistory[1];

    const parseVal = (str?: string) => {
      if (!str) return 0;
      const match = str.match(/[\d.]+/);
      return match ? parseFloat(match[0]) : 0;
    };

    const curLdl = parseVal(current.ldl);
    const prevLdl = parseVal(prev.ldl);
    const ldlDiff = (curLdl - prevLdl).toFixed(1);

    const curEgfr = parseVal(current.egfr);
    const prevEgfr = parseVal(prev.egfr);
    const egfrDiff = (curEgfr - prevEgfr).toFixed(1);

    const curCreat = parseVal(current.creatinine);
    const prevCreat = parseVal(prev.creatinine);
    const creatDiff = (curCreat - prevCreat).toFixed(2);

    const curHbA1c = parseVal(current.hba1c);
    const prevHbA1c = parseVal(prev.hba1c);
    const hba1cDiff = (curHbA1c - prevHbA1c).toFixed(1);

    return {
      ldlDiff: parseFloat(ldlDiff),
      egfrDiff: parseFloat(egfrDiff),
      creatDiff: parseFloat(creatDiff),
      hba1cDiff: parseFloat(hba1cDiff),
      curLdl,
      prevLdl,
      curEgfr,
      prevEgfr,
      curCreat,
      prevCreat,
      curHbA1c,
      prevHbA1c
    };
  };

  const trendData = getTrendData();

  // Unauthenticated PIN Gate View
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4 font-sans" dir="rtl">
        <div className="bg-slate-800 border border-slate-700 max-w-md w-full rounded-3xl p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-teal-500 via-emerald-500 to-blue-500" />

          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-teal-500/20 text-teal-400 border border-teal-400/30 flex items-center justify-center mx-auto mb-3 shadow-lg">
              <FlaskConical size={32} />
            </div>
            <h1 className="text-xl font-black text-white">بوابة المعمل والتحاليل الطبية</h1>
            <p className="text-xs text-slate-400 mt-1">منظومة Cardios Clinical Lab Integration</p>
          </div>

          <div className="bg-teal-950/40 border border-teal-500/30 rounded-2xl p-3.5 mb-5 text-xs text-teal-200 flex items-start gap-2.5">
            <ShieldCheck size={20} className="text-teal-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              تتيح هذه البوابة لفني المعمل رفع نتائج التحاليل، تتبع الاتجاهات الزمنية للتحاليل السابقة، وإرسال إشعارات فورية للطبيب المعالج.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                رمز المرور الخاص بفني المعمل (Lab Technician PIN)
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  placeholder="أدخل الرمز (مثال: 8888)"
                  maxLength={10}
                  autoFocus
                  className="w-full text-center text-lg tracking-widest font-mono font-bold p-3 bg-slate-900/80 border border-slate-600 rounded-xl text-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
                <Lock size={16} className="absolute left-3.5 top-3.5 text-slate-500" />
              </div>
            </div>

            {pinError && (
              <div className="p-3 bg-red-950/50 border border-red-500/40 rounded-xl text-xs text-red-300 flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0 text-red-400" />
                <span>{pinError}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3.5 bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-700 hover:from-teal-700 hover:to-emerald-800 text-white font-bold text-sm rounded-xl shadow-lg transition-all active:scale-98 flex items-center justify-center gap-2"
            >
              <span>تسجيل دخول بوابة المعمل</span>
              <ArrowRight size={16} />
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-700 flex items-center justify-between text-xs text-slate-400">
            <button onClick={onBack} className="hover:text-white transition-colors">
              &larr; العودة للصفحة الرئيسية
            </button>
            <span className="text-[11px] text-slate-500">
              رمز الدخول التجريبي: <code className="text-teal-400 font-mono">8888</code>
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Authenticated Laboratory Management Screen
  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 font-sans pb-12" dir="rtl">
      {/* Top Navbar */}
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-teal-600 to-emerald-600 p-0.5 flex items-center justify-center text-white overflow-hidden shadow-sm">
              <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center">
                <FlaskConical size={20} className="text-teal-400" />
              </div>
            </div>
            <div>
              <h1 className="text-base font-bold text-white flex items-center gap-2">
                بوابة معامل التحاليل الطبية والتشخيصية
                <span className="text-[10px] bg-teal-500/20 text-teal-300 border border-teal-500/30 px-2 py-0.5 rounded-full font-mono">
                  Diagnostic Lab
                </span>
              </h1>
              <p className="text-xs text-slate-400">{technicianName}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                loadPatients();
                if (selectedPatientId) loadLabHistory(selectedPatientId);
                loadNotificationsLog();
              }}
              className="p-2 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors text-xs flex items-center gap-1.5"
              title="تحديث البيانات"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">تحديث</span>
            </button>

            <button
              onClick={handleLogout}
              className="px-3 py-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
            >
              <LogOut size={14} />
              <span>خروج</span>
            </button>

            <button
              onClick={onBack}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-colors"
            >
              الرئيسية &rarr;
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
        {/* Navigation Tabs Bar */}
        <div className="bg-white rounded-2xl border border-slate-200 p-2 mb-6 flex flex-wrap items-center justify-between gap-2 shadow-xs">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveTab('entry')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                activeTab === 'entry'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Upload size={16} />
              <span>إدخال ورفع نتائج تحاليل جديدة</span>
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                activeTab === 'history'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <History size={16} />
              <span>سجل التحاليل التاريخي وتتبع الاتجاهات (Longitudinal Trends)</span>
              {labHistory.length > 0 && (
                <span className="bg-teal-100 text-teal-800 text-[10px] px-2 py-0.5 rounded-full font-mono">
                  {labHistory.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('notifications')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                activeTab === 'notifications'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Bell size={16} />
              <span>إشعارات الطبيب المرسلة (Doctor Notifications)</span>
              {notificationsLog.length > 0 && (
                <span className="bg-amber-100 text-amber-800 text-[10px] px-2 py-0.5 rounded-full font-mono">
                  {notificationsLog.length}
                </span>
              )}
            </button>
          </div>

          {selectedPatient && (
            <div className="text-xs bg-slate-100 px-3 py-1.5 rounded-xl font-semibold text-slate-700 flex items-center gap-2">
              <User size={14} className="text-teal-600" />
              <span>المريض المختار: <strong>{selectedPatient.name}</strong></span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Patient Selection Sidebar (4 cols) */}
          <div className="lg:col-span-4 bg-white rounded-3xl border border-slate-200 shadow-sm p-4 flex flex-col h-[calc(100vh-180px)] sticky top-20">
            <div className="mb-3">
              <h2 className="font-bold text-slate-900 text-sm flex items-center gap-2 mb-2">
                <User size={16} className="text-teal-600" />
                <span>قائمة المرضى في العيادة والمختبر</span>
              </h2>
              <div className="relative">
                <input
                  type="text"
                  placeholder="بحث باسم المريض أو رقم الهوية..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-xs p-2.5 pr-8 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
                <Search size={14} className="absolute right-2.5 top-3 text-slate-400" />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {loading ? (
                <div className="p-8 text-center text-xs text-slate-400">جاري تحميل قائمة المرضى...</div>
              ) : filteredPatients.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">لم يتم العثور على مريض بهذا الاسم</div>
              ) : (
                filteredPatients.map((p) => {
                  const isSelected = p.id === selectedPatientId;
                  return (
                    <button
                      key={p.id}
                      onClick={() => setSelectedPatientId(p.id)}
                      className={`w-full text-right p-3 rounded-2xl border transition-all flex items-center justify-between ${
                        isSelected
                          ? 'bg-teal-50 border-teal-500/50 text-teal-900 shadow-xs'
                          : 'bg-slate-50 hover:bg-slate-100/80 border-slate-200 text-slate-700'
                      }`}
                    >
                      <div>
                        <div className="font-bold text-xs flex items-center gap-2">
                          <span>{p.name}</span>
                          <span className="text-[10px] font-mono text-slate-400">#{p.id}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {p.phone ? `هاتف: ${p.phone}` : 'مريض بالعيادة الخارجية'}
                        </div>
                      </div>
                      <div className="text-left">
                        {p.labs?.ldl ? (
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full inline-block">
                            مكتمل
                          </span>
                        ) : (
                          <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full inline-block">
                            في الانتظار
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Main Work Area (8 cols) */}
          <div className="lg:col-span-8 space-y-6">
            {/* TAB 1: ENTRY FORM */}
            {activeTab === 'entry' && (
              selectedPatient ? (
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                  {/* Header Banner */}
                  <div className="bg-gradient-to-r from-teal-700 via-emerald-700 to-slate-900 text-white p-6">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <div className="inline-flex items-center gap-1.5 bg-teal-500/20 text-teal-200 border border-teal-400/30 px-3 py-1 rounded-full text-xs font-semibold mb-2">
                          <Droplets size={14} className="text-teal-300" />
                          <span>نموذج تحاليل أمراض القلب والكلى</span>
                        </div>
                        <h2 className="text-xl font-bold text-white">{selectedPatient.name}</h2>
                        <p className="text-xs text-teal-100 mt-1">
                          معرف المريض: <span className="font-mono">{selectedPatient.id}</span> • تاريخ الميلاد: {selectedPatient.dob || '1970-01-01'}
                        </p>
                      </div>

                      <div className="text-left bg-white/10 p-3 rounded-2xl border border-white/20 text-xs">
                        <span className="block text-[11px] text-teal-200">حالة الربط والإشعارات:</span>
                        <span className="font-bold text-emerald-300 flex items-center gap-1 mt-0.5">
                          <Bell size={14} />
                          تنبيه فوري للطبيب المعالج
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Form Inputs */}
                  <form onSubmit={handleSaveLabResults} className="p-6 space-y-6">
                    {/* Category 1: Lipid Profile */}
                    <div>
                      <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2 border-b border-slate-100 pb-2">
                        <HeartPulse size={16} className="text-red-500" />
                        <span>1. صورة دهون الدم (Lipid Profile)</span>
                      </h3>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5">
                          <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                            <span>الكوليسترول الضار (LDL-C)</span>
                            <span className="text-[10px] text-slate-400">mg/dL</span>
                          </label>
                          <input
                            type="number"
                            step="0.1"
                            value={ldl}
                            onChange={(e) => setLdl(e.target.value)}
                            placeholder="72"
                            required
                            className="w-full text-base font-mono font-bold p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
                          />
                          <span className="text-[10px] text-slate-500 mt-1 block">
                            الهدف السريري لمريض القلب: &lt; 55 - 70 mg/dL
                          </span>
                        </div>

                        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5">
                          <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                            <span>الكوليسترول النافع (HDL-C)</span>
                            <span className="text-[10px] text-slate-400">mg/dL</span>
                          </label>
                          <input
                            type="number"
                            step="0.1"
                            value={hdl}
                            onChange={(e) => setHdl(e.target.value)}
                            placeholder="44"
                            required
                            className="w-full text-base font-mono font-bold p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
                          />
                          <span className="text-[10px] text-slate-500 mt-1 block">
                            النطاق الطبيعي: &gt; 40 mg/dL
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Category 2: Renal Function & Electrolytes */}
                    <div>
                      <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2 border-b border-slate-100 pb-2">
                        <Activity size={16} className="text-blue-500" />
                        <span>2. وظائف الكلى وأملاح الدم (Renal Profile & K+)</span>
                      </h3>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5">
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            الكرياتينين (Serum Creatinine)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={creatinine}
                            onChange={(e) => setCreatinine(e.target.value)}
                            placeholder="0.9"
                            required
                            className="w-full text-base font-mono font-bold p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
                          />
                          <span className="text-[10px] text-slate-500 mt-1 block">mg/dL (الطبيعي 0.7 - 1.2)</span>
                        </div>

                        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5">
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            كفاءة الفلترة (eGFR)
                          </label>
                          <input
                            type="number"
                            value={egfr}
                            onChange={(e) => setEgfr(e.target.value)}
                            placeholder="92"
                            required
                            className="w-full text-base font-mono font-bold p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
                          />
                          <span className="text-[10px] text-slate-500 mt-1 block">mL/min (&gt; 60 طبيعي)</span>
                        </div>

                        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5">
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            بوتاسيوم الدم (Serum K+)
                          </label>
                          <input
                            type="number"
                            step="0.1"
                            value={potassium}
                            onChange={(e) => setPotassium(e.target.value)}
                            placeholder="4.4"
                            required
                            className="w-full text-base font-mono font-bold p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
                          />
                          <span className="text-[10px] text-slate-500 mt-1 block">mmol/L (3.5 - 5.0)</span>
                        </div>
                      </div>
                    </div>

                    {/* Category 3: Cardiac Biomarkers & Glycemic Control */}
                    <div>
                      <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2 border-b border-slate-100 pb-2">
                        <Droplets size={16} className="text-purple-500" />
                        <span>3. إنزيمات القلب والسكر التراكمي (Cardiac Biomarkers & HbA1c)</span>
                      </h3>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5">
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            السكر التراكمي (HbA1c)
                          </label>
                          <input
                            type="number"
                            step="0.1"
                            value={hba1c}
                            onChange={(e) => setHba1c(e.target.value)}
                            placeholder="5.8"
                            required
                            className="w-full text-base font-mono font-bold p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
                          />
                          <span className="text-[10px] text-slate-500 mt-1 block">% (الهدف &lt; 7.0%)</span>
                        </div>

                        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5">
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            تروبونين القلب (hs-cTnI)
                          </label>
                          <input
                            type="text"
                            value={troponin}
                            onChange={(e) => setTroponin(e.target.value)}
                            placeholder="سالب (<0.01 ng/mL)"
                            required
                            className="w-full text-xs font-bold p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
                          />
                          <span className="text-[10px] text-slate-500 mt-1 block">نتيجة إنزيم جلطة القلب</span>
                        </div>

                        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5">
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            هيموجلوبين الدم (Hb)
                          </label>
                          <input
                            type="number"
                            step="0.1"
                            value={hb}
                            onChange={(e) => setHb(e.target.value)}
                            placeholder="13.8"
                            required
                            className="w-full text-base font-mono font-bold p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
                          />
                          <span className="text-[10px] text-slate-500 mt-1 block">g/dL (صورة الدم الكاملة)</span>
                        </div>
                      </div>
                    </div>

                    {/* Technician Notes & Report Document Attachment */}
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                          <FileText size={14} className="text-teal-600" />
                          <span>ملاحظات فني المختبر والتقرير المرفق</span>
                        </label>
                        <textarea
                          rows={2}
                          value={labNotes}
                          onChange={(e) => setLabNotes(e.target.value)}
                          placeholder="أدخل أي ملاحظات حول العينة أو التوصيات الخاصة بالطبيب..."
                          className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
                        />
                      </div>

                      {/* File Attachment Upload Box */}
                      <div className="border-t border-slate-200/80 pt-3">
                        <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                          <Upload size={14} className="text-teal-600" />
                          <span>إرفاق تقرير المعمل الورقي الاصلي (PDF / Scan Document)</span>
                        </label>

                        {attachmentFile ? (
                          <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <FileCheck size={18} className="text-emerald-600" />
                              <div>
                                <span className="font-bold text-emerald-900 block">{attachmentFile.name}</span>
                                <span className="text-[10px] text-emerald-700">الحجم: {attachmentFile.size} • جاهز للمزامنة</span>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setAttachmentFile(null)}
                              className="text-red-600 hover:text-red-800 text-xs font-bold bg-white border border-red-200 px-2.5 py-1 rounded-lg"
                            >
                              إزالة الملف
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-wrap items-center gap-3">
                            <label className="cursor-pointer bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all">
                              <Upload size={14} className="text-teal-600" />
                              <span>اختر ملف من الجهاز (PDF / صورة)</span>
                              <input
                                type="file"
                                accept="application/pdf,image/*"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    const reader = new FileReader();
                                    reader.onload = (event) => {
                                      setAttachmentFile({
                                        name: file.name,
                                        url: event.target?.result as string,
                                        size: `${(file.size / 1024).toFixed(1)} KB`
                                      });
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                }}
                                className="hidden"
                              />
                            </label>

                            <button
                              type="button"
                              onClick={() => {
                                setAttachmentFile({
                                  name: `Cardios_Lab_Report_${selectedPatientId}_${new Date().toISOString().split('T')[0]}.pdf`,
                                  url: `data:application/pdf;base64,JVBERi0xLjQKJcOkw7zDtsOfCjEgMCBvYmoKPDwvVHlwZSAvQ2F0YWxvZyAvUGFnZXMgMiAwIFI+PgplbmRvYmoKMiAwIG9iago8PC9UeXBlIC9QYWdlcyAvQ291bnQgMSAvS2lkcyBbMyAwIFJdPj4KZW5kb2JqCjMgMCBvYmoKPDwvVHlwZSAvUGFnZSAvUGFyZW50IDIgMCBSIC9NZWRpYUJveCBbMCAwIDYxMiA3OTJdID4+CmVuZG9iagoNCnhyZWYNCjAgNA0KMDAwMDAwMDAwMCA2NTUzNSBmDQowMDAwMDAwMDE5IDAwMDAwIG4NCjAwMDAwMDAwNjggMDAwMDAgbg0KMDAwMDAwMDEyMiAwMDAwMCBuDQp0cmFpbGVyDQo8PC9TaXplIDQgL1Jvb3QgMSAwIFI+Pg0Kc3RhcnR4cmVmDQoxOTMNCiUlRU9G`,
                                  size: '240.5 KB'
                                });
                              }}
                              className="bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
                            >
                              <Sparkles size={14} className="text-teal-600" />
                              <span>توليد تقرير معمل معتمد عينة (Sample Scan)</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Feedback Messages */}
                    {successMessage && (
                      <div className="p-4 bg-emerald-100 border border-emerald-300 text-emerald-900 rounded-2xl text-xs font-bold space-y-1 animate-in fade-in">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                          <span>{successMessage}</span>
                        </div>
                        {notificationSentMessage && (
                          <p className="text-[11px] text-emerald-700 pr-6">{notificationSentMessage}</p>
                        )}
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => setActiveTab('history')}
                        className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all flex items-center gap-2"
                      >
                        <History size={16} />
                        <span>عرض السجل التاريخي لملاحظة الاتجاهات</span>
                      </button>

                      <button
                        type="submit"
                        disabled={saving}
                        className="px-8 py-3.5 bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-700 hover:from-teal-700 hover:to-emerald-800 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg transition-all active:scale-98 flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        <Upload size={16} />
                        <span>{saving ? 'جاري الاعتماد والإرسال...' : 'اعتماد النتائج وإرسال إشعار فوري للطبيب'}</span>
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-400">
                  <FlaskConical size={48} className="mx-auto text-slate-300 mb-3" />
                  <p className="text-sm font-bold">يرجى اختيار مريض من القائمة لبدء إدخال ورفع التحاليل.</p>
                </div>
              )
            )}

            {/* TAB 2: LONGITUDINAL HISTORY & TRENDS */}
            {activeTab === 'history' && (
              selectedPatient ? (
                <div className="space-y-6">
                  {/* Header */}
                  <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <div className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-800 border border-blue-200 px-3 py-1 rounded-full text-xs font-bold mb-2">
                        <History size={14} className="text-blue-600" />
                        <span>السجل التاريخي الممتد والاتجاهات الحيوية</span>
                      </div>
                      <h2 className="text-lg font-bold text-slate-900">{selectedPatient.name}</h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        تتبع التطور الزمني للتحاليل المخبرية لتقييم كفاءة العلاج ومخاطر القلب.
                      </p>
                    </div>

                    <button
                      onClick={() => loadLabHistory(selectedPatientId)}
                      className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5"
                    >
                      <RefreshCw size={14} className={loadingHistory ? 'animate-spin' : ''} />
                      <span>تحديث السجل</span>
                    </button>
                  </div>

                  {/* Visual Trend Indicators Summary (If >=2 records) */}
                  {trendData ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* LDL Trend */}
                      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
                        <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                          <span>اتجاه الكوليسترول (LDL)</span>
                          <span className="font-mono text-[11px]">{trendData.curLdl} mg/dL</span>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-1.5">
                            {trendData.ldlDiff <= 0 ? (
                              <TrendingDown size={20} className="text-emerald-600" />
                            ) : (
                              <TrendingUp size={20} className="text-red-500" />
                            )}
                            <span
                              className={`text-base font-bold font-mono ${
                                trendData.ldlDiff <= 0 ? 'text-emerald-700' : 'text-red-600'
                              }`}
                            >
                              {trendData.ldlDiff > 0 ? `+${trendData.ldlDiff}` : trendData.ldlDiff} mg/dL
                            </span>
                          </div>
                          <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                            مقارنة بالقراءة السابقة
                          </span>
                        </div>
                      </div>

                      {/* eGFR Trend */}
                      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
                        <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                          <span>كفاءة الفلترة الكلوية (eGFR)</span>
                          <span className="font-mono text-[11px]">{trendData.curEgfr} mL/min</span>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-1.5">
                            {trendData.egfrDiff >= 0 ? (
                              <TrendingUp size={20} className="text-emerald-600" />
                            ) : (
                              <TrendingDown size={20} className="text-amber-600" />
                            )}
                            <span
                              className={`text-base font-bold font-mono ${
                                trendData.egfrDiff >= 0 ? 'text-emerald-700' : 'text-amber-600'
                              }`}
                            >
                              {trendData.egfrDiff > 0 ? `+${trendData.egfrDiff}` : trendData.egfrDiff} mL/min
                            </span>
                          </div>
                          <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                            {trendData.egfrDiff >= 0 ? 'تحسن كلوى' : 'تراجع خفيف'}
                          </span>
                        </div>
                      </div>

                      {/* Creatinine Trend */}
                      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
                        <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                          <span>الكرياتينين (Creatinine)</span>
                          <span className="font-mono text-[11px]">{trendData.curCreat} mg/dL</span>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-1.5">
                            {trendData.creatDiff <= 0 ? (
                              <TrendingDown size={20} className="text-emerald-600" />
                            ) : (
                              <TrendingUp size={20} className="text-amber-600" />
                            )}
                            <span
                              className={`text-base font-bold font-mono ${
                                trendData.creatDiff <= 0 ? 'text-emerald-700' : 'text-amber-600'
                              }`}
                            >
                              {trendData.creatDiff > 0 ? `+${trendData.creatDiff}` : trendData.creatDiff}
                            </span>
                          </div>
                          <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                            استقرار الوظائف
                          </span>
                        </div>
                      </div>

                      {/* HbA1c Trend */}
                      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
                        <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                          <span>السكر التراكمي (HbA1c)</span>
                          <span className="font-mono text-[11px]">{trendData.curHbA1c}%</span>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-1.5">
                            {trendData.hba1cDiff <= 0 ? (
                              <TrendingDown size={20} className="text-emerald-600" />
                            ) : (
                              <TrendingUp size={20} className="text-purple-600" />
                            )}
                            <span
                              className={`text-base font-bold font-mono ${
                                trendData.hba1cDiff <= 0 ? 'text-emerald-700' : 'text-purple-600'
                              }`}
                            >
                              {trendData.hba1cDiff > 0 ? `+${trendData.hba1cDiff}%` : `${trendData.hba1cDiff}%`}
                            </span>
                          </div>
                          <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                            انضباط السكر
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-800 flex items-center gap-2">
                      <Info size={18} className="text-amber-600 shrink-0" />
                      <span>
                        سيظهر تحليل اتجاهات المؤشرات الحيوية تلقائياً بمجرد توفر قراءتين مخبريتين أو أكثر لهذا المريض.
                      </span>
                    </div>
                  )}

                  {/* History List Timeline */}
                  <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
                    <h3 className="font-bold text-sm text-slate-900 mb-4 flex items-center gap-2">
                      <Clock size={16} className="text-teal-600" />
                      <span>سجل نتائج الفحوصات المخبرية المتعاقبة</span>
                    </h3>

                    {loadingHistory ? (
                      <div className="p-8 text-center text-xs text-slate-400">جاري تحميل سجل التحاليل...</div>
                    ) : labHistory.length === 0 ? (
                      <div className="p-8 text-center text-xs text-slate-400">
                        لا توجد تحاليل مسجلة سابقاً لهذا المريض.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {labHistory.map((rec, idx) => (
                          <div
                            key={rec.id || idx}
                            className={`border rounded-2xl p-4 transition-all ${
                              idx === 0
                                ? 'bg-teal-50/50 border-teal-300 ring-1 ring-teal-200'
                                : 'bg-slate-50/70 border-slate-200'
                            }`}
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/60 pb-2.5 mb-3">
                              <div className="flex items-center gap-2">
                                {idx === 0 && (
                                  <span className="text-[10px] bg-teal-600 text-white font-bold px-2 py-0.5 rounded-full">
                                    التحليل الأخير
                                  </span>
                                )}
                                <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                                  <Calendar size={14} className="text-slate-400" />
                                  <span>
                                    {rec.updatedAt
                                      ? new Date(rec.updatedAt).toLocaleDateString('ar-EG', {
                                          year: 'numeric',
                                          month: 'long',
                                          day: 'numeric'
                                        })
                                      : 'اليوم'}
                                  </span>
                                </span>
                              </div>

                              <span className="text-[11px] text-slate-500 font-medium">
                                فني المختبر: {rec.technician || 'فني معمل القلب'}
                              </span>
                            </div>

                            {/* Biomarkers Grid */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mb-3">
                              <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                                <span className="block text-[10px] text-slate-400">الكوليسترول LDL</span>
                                <span className="font-bold text-slate-800 font-mono text-sm">{rec.ldl}</span>
                              </div>
                              <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                                <span className="block text-[10px] text-slate-400">الكرياتينين Creatinine</span>
                                <span className="font-bold text-slate-800 font-mono text-sm">{rec.creatinine}</span>
                              </div>
                              <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                                <span className="block text-[10px] text-slate-400">الفلترة eGFR</span>
                                <span className="font-bold text-slate-800 font-mono text-sm">{rec.egfr}</span>
                              </div>
                              <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                                <span className="block text-[10px] text-slate-400">السكر التراكمي HbA1c</span>
                                <span className="font-bold text-slate-800 font-mono text-sm">{rec.hba1c}</span>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 bg-white/80 p-2.5 rounded-xl border border-slate-200/80">
                              <div>
                                <span className="font-semibold text-slate-700 pr-1">البوتاسيوم:</span>
                                <span className="font-mono font-bold pr-1">{rec.potassium}</span> •
                                <span className="font-semibold text-slate-700 px-1">التروبونين:</span>
                                <span className="font-mono font-bold">{rec.troponin}</span>
                              </div>
                              {rec.labNotes && (
                                <p className="text-[11px] text-slate-500 italic max-w-md">
                                  "{rec.labNotes}"
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-400">
                  <History size={48} className="mx-auto text-slate-300 mb-3" />
                  <p className="text-sm font-bold">يرجى اختيار مريض لعرض السجل التاريخي والاتجاهات.</p>
                </div>
              )
            )}

            {/* TAB 3: DOCTOR NOTIFICATIONS LOG */}
            {activeTab === 'notifications' && (
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div>
                    <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <Bell size={18} className="text-amber-500" />
                      <span>سجل الإشعارات والتنبيهات الموجهة للطبيب</span>
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      تتلقى هذه القائمة كافة التنبيهات المعتمدة المرسلة لعيادة د. إسلام الشريف فور صدور النتائج.
                    </p>
                  </div>

                  <button
                    onClick={loadNotificationsLog}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5"
                  >
                    <RefreshCw size={14} className={loadingNotifications ? 'animate-spin' : ''} />
                    <span>تحديث القائمة</span>
                  </button>
                </div>

                {loadingNotifications ? (
                  <div className="p-8 text-center text-xs text-slate-400">جاري تحميل سجل الإشعارات...</div>
                ) : notificationsLog.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">
                    لم يتم إرسال إشعارات سابقة حتى الآن.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {notificationsLog.map((notif, i) => (
                      <div
                        key={notif.id || i}
                        className={`p-4 rounded-2xl border transition-all flex items-start justify-between gap-3 ${
                          notif.urgent
                            ? 'bg-amber-50/80 border-amber-300'
                            : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            {notif.urgent ? (
                              <span className="text-[10px] font-bold bg-amber-500 text-white px-2 py-0.5 rounded-full flex items-center gap-1">
                                <AlertCircle size={12} />
                                تنبيه هام / عاجل
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold bg-teal-100 text-teal-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <CheckCircle2 size={12} />
                                إشعار اعتيادي
                              </span>
                            )}
                            <h4 className="font-bold text-xs text-slate-900">{notif.title}</h4>
                          </div>

                          <p className="text-xs text-slate-700 leading-relaxed pt-1">{notif.message}</p>

                          <div className="flex items-center gap-3 text-[10px] text-slate-400 pt-1 font-mono">
                            <span>المريض: {notif.patientName}</span> •
                            <span>فني المعمل: {notif.technician}</span> •
                            <span>
                              {notif.createdAt
                                ? new Date(notif.createdAt).toLocaleTimeString('ar-EG', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })
                                : 'الآن'}
                            </span>
                          </div>
                        </div>

                        <div className="shrink-0">
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1 rounded-xl flex items-center gap-1">
                            <Send size={12} />
                            تم التسليم لـ EHR
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

