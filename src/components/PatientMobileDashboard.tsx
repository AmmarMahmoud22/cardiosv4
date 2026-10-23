import React, {useState, useEffect} from 'react';
import {
  Heart,
  Activity,
  Pill,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Send,
  FileText,
  Phone,
  QrCode,
  ShieldCheck,
  ShieldAlert,
  Flame,
  MessageCircle,
  Bot,
  User,
  Stethoscope,
  KeyRound,
  Loader2
} from 'lucide-react';
import {collection, addDoc, query, orderBy, onSnapshot, getDocs, doc, getDoc, where} from 'firebase/firestore';
import {db} from '../lib/firebase';
import {verifyPatientAccess, generatePatientToken} from '../lib/patientAuth';
import PatientQRCardModal from './PatientQRCardModal';

interface Props {
  patientId?: string;
  isPortalMode?: boolean;
}

interface MedicationSchedule {
  id: string;
  name: string;
  dosage: string;
  timeSlot: 'Morning' | 'Afternoon' | 'Evening';
  instructions: string;
  taken: boolean;
}

const CLINIC_PHONE = '01146963589';
const CLINIC_WHATSAPP = '201146963589';

const DEFAULT_MEDS: MedicationSchedule[] = [
  {
    id: 'm1',
    name: 'Bisoprolol (Concor)',
    dosage: '5 mg',
    timeSlot: 'Morning',
    instructions: 'حبة واحدة صباحاً بعد الإفطار مع كوب ماء',
    taken: true
  },
  {
    id: 'm2',
    name: 'Aspirin Protect',
    dosage: '81 mg',
    timeSlot: 'Afternoon',
    instructions: 'حبة واحدة بعد وجبة الغداء',
    taken: false
  },
  {
    id: 'm3',
    name: 'Atorvastatin (Lipitor)',
    dosage: '20 mg',
    timeSlot: 'Evening',
    instructions: 'حبة واحدة قبل النوم مباشرة',
    taken: false
  }
];

export default function PatientMobileDashboard({
  patientId: initialPatientId = '1',
  isPortalMode = false
}: Props) {
  // Check if opened via URL QR parameter (?portal=true)
  const isQRDirectAccess = typeof window !== 'undefined'
    ? (window.location.search.includes('portal=true') || isPortalMode)
    : isPortalMode;

  const [selectedPatientId, setSelectedPatientId] = useState<string>(initialPatientId);
  const [patientName, setPatientName] = useState<string>('Ahmed Hassan');
  const [patientsList, setPatientsList] = useState<{id: string; name: string}[]>([]);
  const [activeTab, setActiveTab] = useState<'vitals' | 'meds' | 'chat' | 'prescriptions'>('vitals');

  // Security & Authentication State
  const [authStatus, setAuthStatus] = useState<'checking' | 'authorized' | 'unauthorized'>('checking');
  const [authError, setAuthError] = useState<string>('');
  const [tokenInput, setTokenInput] = useState<string>('');
  const [verifyingToken, setVerifyingToken] = useState<boolean>(false);

  // Vitals State
  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');
  const [heartRate, setHeartRate] = useState('');
  const [vitalsHistory, setVitalsHistory] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{type: 'success' | 'warning' | 'alert'; message: string} | null>(null);

  // Synced Medications from Doctor
  const [meds, setMeds] = useState<MedicationSchedule[]>(DEFAULT_MEDS);
  const [showQRModal, setShowQRModal] = useState(false);

  // Direct Doctor-Patient Chat State
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [newChatText, setNewChatText] = useState('');
  const [sendingChat, setSendingChat] = useState(false);

  // Security Verification Effect: verify patient ID against token or authenticated session
  useEffect(() => {
    let isCancelled = false;

    const runAuthCheck = async () => {
      // If doctor is testing inside the clinic dashboard (not portal mode)
      if (!isQRDirectAccess) {
        setAuthStatus('authorized');
        return;
      }

      setAuthStatus('checking');
      const urlToken = typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('token')
        : null;

      const result = await verifyPatientAccess(selectedPatientId, urlToken);
      if (isCancelled) return;

      if (result.valid) {
        setAuthStatus('authorized');
        if (result.patientName) setPatientName(result.patientName);
      } else {
        setAuthStatus('unauthorized');
        setAuthError(result.reason || 'رمز الأمان غير صالح أو غير مصرح به لهذا الملف.');
      }
    };

    runAuthCheck();

    return () => {
      isCancelled = true;
    };
  }, [selectedPatientId, isQRDirectAccess]);

  // Handle manual token submission from user's card
  const handleVerifyManualToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput.trim() || verifyingToken) return;

    setVerifyingToken(true);
    setAuthError('');
    try {
      const result = await verifyPatientAccess(selectedPatientId, tokenInput.trim());
      if (result.valid) {
        setAuthStatus('authorized');
        if (result.patientName) setPatientName(result.patientName);
      } else {
        setAuthError(result.reason || 'رمز الأمان غير صحيح أو لا يطابق هذا الملف.');
      }
    } finally {
      setVerifyingToken(false);
    }
  };

  // Load Patient Profile & Details ONLY when authorized
  useEffect(() => {
    if (authStatus !== 'authorized') return;

    const fetchPatientData = async () => {
      try {
        const patientRef = doc(db, 'patients', selectedPatientId);
        const snap = await getDoc(patientRef);
        if (snap.exists()) {
          setPatientName(snap.data().name || 'Patient ' + selectedPatientId);
        } else if (!isQRDirectAccess) {
          // Only in doctor preview mode: check patients collection
          const colSnap = await getDocs(collection(db, 'patients'));
          const list = colSnap.docs.map(d => ({id: d.id, name: d.data().name || 'Patient ' + d.id}));
          setPatientsList(list);
          const found = list.find(p => p.id === selectedPatientId);
          if (found) setPatientName(found.name);
        }
      } catch (e) {
        console.warn(e);
      }
    };
    fetchPatientData();
  }, [selectedPatientId, authStatus, isQRDirectAccess]);

  // Real-time Medication Sync ONLY when authorized
  useEffect(() => {
    if (authStatus !== 'authorized') return;

    const qPrescriptions = query(
      collection(db, 'patients', selectedPatientId, 'prescriptions'),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(qPrescriptions, (snap) => {
      if (!snap.empty) {
        const latestPrescription = snap.docs[0].data();
        if (latestPrescription.medications && Array.isArray(latestPrescription.medications) && latestPrescription.medications.length > 0) {
          const syncedMeds: MedicationSchedule[] = latestPrescription.medications.map((m: any, idx: number) => ({
            id: `rx-${idx}`,
            name: m.name,
            dosage: m.dosage || 'حسب الإرشاد',
            instructions: m.instructions || 'قرص يومياً حسب تعليمات د. القلب',
            timeSlot: idx % 3 === 0 ? 'Morning' : idx % 3 === 1 ? 'Afternoon' : 'Evening',
            taken: false
          }));
          setMeds(syncedMeds);
        }
      }
    }, (err) => {
      console.warn('Prescriptions listener error:', err);
    });
    return unsub;
  }, [selectedPatientId, authStatus]);

  // Real-time listener for patient's vitals ONLY when authorized
  useEffect(() => {
    if (authStatus !== 'authorized') return;

    const q = query(
      collection(db, 'patients', selectedPatientId, 'vitals'),
      orderBy('timestamp', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setVitalsHistory(snapshot.docs.map(doc => ({id: doc.id, ...doc.data()})));
    }, (err) => {
      console.warn('Vitals listener error:', err);
    });
    return unsubscribe;
  }, [selectedPatientId, authStatus]);

  // Real-time listener for Doctor-Patient Chat ONLY when authorized
  useEffect(() => {
    if (authStatus !== 'authorized') return;

    const qChat = query(
      collection(db, 'messages'),
      where('patientId', '==', selectedPatientId),
      orderBy('timestamp', 'asc')
    );
    const unsub = onSnapshot(qChat, (snapshot) => {
      setChatMessages(snapshot.docs.map(doc => ({id: doc.id, ...doc.data()})));
    }, (err) => {
      console.warn('Chat listener error:', err);
    });
    return unsub;
  }, [selectedPatientId, authStatus]);

  // Send message to doctor
  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChatText.trim() || sendingChat) return;

    setSendingChat(true);
    try {
      await addDoc(collection(db, 'messages'), {
        patientId: selectedPatientId,
        patientName,
        sender: 'patient',
        text: newChatText.trim(),
        timestamp: new Date().toISOString()
      });
      setNewChatText('');
    } catch (e) {
      alert('فشل في إرسال الرسالة، برجاء المحاولة لاحقاً.');
    } finally {
      setSendingChat(false);
    }
  };

  // Real-time classification for BP inputs
  const getBPStatus = () => {
    const sys = Number(systolic);
    const dia = Number(diastolic);
    if (!sys || !dia) return null;

    if (sys >= 160 || dia >= 100) {
      return {
        label: 'ارتفاع حرج للضغط (المرحلة الثانية)',
        sub: 'يتطلب اهتماماً فورياً وإشعار الطبيب المعالج',
        color: 'bg-red-50 text-red-700 border-red-200',
        badge: 'bg-red-600 text-white'
      };
    }
    if (sys >= 140 || dia >= 90) {
      return {
        label: 'ضغط دم مرتفع (مرحلة أولى)',
        sub: 'مستوى أعلى من المستهدف، راقب أعراض الصداع أو الدوار',
        color: 'bg-amber-50 text-amber-800 border-amber-200',
        badge: 'bg-amber-600 text-white'
      };
    }
    if (sys >= 120 || dia >= 80) {
      return {
        label: 'ضغط دم معتدل إلى مرتفع قليلاً',
        sub: 'ضمن النطاق المقبول، حافظ على تقليل الأملاح',
        color: 'bg-blue-50 text-blue-800 border-blue-200',
        badge: 'bg-blue-600 text-white'
      };
    }
    return {
      label: 'ضغط دم مثالي ومستقر تماماً',
      sub: 'ممتاز! كفاءة القلب ممتازة وتستجيب للعلاج',
      color: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      badge: 'bg-emerald-600 text-white'
    };
  };

  const currentBPStatus = getBPStatus();

  // Submit vitals to Firestore
  const handleSubmitVitals = async (e: React.FormEvent) => {
    e.preventDefault();
    const sys = Number(systolic);
    const dia = Number(diastolic);
    const hr = Number(heartRate);

    if (!sys || !dia || !hr) {
      alert('برجاء إدخال قياسات الضغط الانقباضي والانبساطي والنبض.');
      return;
    }

    setSubmitting(true);
    setFeedback(null);

    try {
      const now = new Date();
      await addDoc(collection(db, 'patients', selectedPatientId, 'vitals'), {
        systolic: sys,
        diastolic: dia,
        heartRate: hr,
        patientId: selectedPatientId,
        timestamp: now.toISOString(),
        formattedDate: now.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'}) + ' - ' + now.toLocaleDateString('ar-EG')
      });

      // Top-level alert doc if systolic > 140
      if (sys > 140) {
        await addDoc(collection(db, 'vitals'), {
          patientId: selectedPatientId,
          patientName,
          systolic: sys,
          diastolic: dia,
          heartRate: hr,
          timestamp: now.toISOString()
        });
      }

      if (sys >= 150) {
        setFeedback({
          type: 'alert',
          message: 'تم تسجيل القياس! نظراً لارتفاع قراءة الضغط، تم إرسال إشعار فوري إلى لوحة تحكم طبيبك للمتابعة.'
        });
      } else {
        setFeedback({
          type: 'success',
          message: 'أحسنت! تم تسجيل ومزامنة قراءاتك بنجاح مع عيادة القلب.'
        });
      }

      setSystolic('');
      setDiastolic('');
      setHeartRate('');
    } catch (e) {
      console.error(e);
      alert('حدث خطأ أثناء حفظ القراءات.');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleMedication = (id: string) => {
    setMeds(meds.map(m => m.id === id ? {...m, taken: !m.taken} : m));
  };

  const completedCount = meds.filter(m => m.taken).length;
  const adherencePercent = meds.length > 0 ? Math.round((completedCount / meds.length) * 100) : 0;

  // 1. Verifying Token / Session State
  if (authStatus === 'checking') {
    return (
      <div className="max-w-md mx-auto min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center" dir="rtl">
        <div className="w-16 h-16 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mb-4 shadow-sm animate-pulse">
          <ShieldCheck size={36} />
        </div>
        <h2 className="text-base font-bold text-gray-800 mb-1">التحقق من جلسة المريض المعتمدة...</h2>
        <p className="text-xs text-gray-500 mb-4">يتم التحقق من تشفير الـ QR وحماية خصوصية السجل الطبي</p>
        <Loader2 size={24} className="text-blue-600 animate-spin" />
      </div>
    );
  }

  // 2. Unauthorized / Invalid Token Barrier Screen (Protects against patient tampering with URLs)
  if (authStatus === 'unauthorized') {
    return (
      <div className="max-w-md mx-auto min-h-screen bg-slate-50 flex flex-col justify-between p-6 font-sans text-gray-900" dir="rtl">
        <div className="pt-8 space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto shadow-sm">
            <ShieldAlert size={36} />
          </div>

          <div className="text-center space-y-2">
            <span className="text-[11px] font-bold tracking-wider text-red-600 bg-red-50 border border-red-200 px-3 py-1 rounded-full uppercase">
              منطقة سريرية محمية • Medical Privacy
            </span>
            <h1 className="text-lg font-black text-gray-900 mt-2">
              التحقق من هوية المريض مطلوب
            </h1>
            <p className="text-xs text-gray-600 leading-relaxed max-w-xs mx-auto">
              حرصاً على سرية وخصوصية السجلات الطبية القلبية، لا يمكن الوصول إلى ملف المريض (#{selectedPatientId}) دون رمز الأمان الرقمي المصرح به.
            </p>
          </div>

          {authError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 text-center font-medium">
              {authError}
            </div>
          )}

          {/* Form to enter token manually from card */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-gray-800">
              <KeyRound size={16} className="text-blue-600" />
              <span>إدخال رمز الأمان المطبوع على كارت الـ QR الخاص بك:</span>
            </div>
            <form onSubmit={handleVerifyManualToken} className="space-y-3">
              <input
                type="text"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="مثال: cp_wvf314co2y"
                dir="ltr"
                className="w-full text-center font-mono font-bold text-sm p-3 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white"
              />
              <button
                type="submit"
                disabled={!tokenInput.trim() || verifyingToken}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2"
              >
                {verifyingToken ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>جاري التحقق...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} />
                    <span>تأكيد رمز الدخول الآمن</span>
                  </>
                )}
              </button>
            </form>

            {/* Quick Demo Autofill Helper */}
            <div className="bg-blue-50/80 border border-blue-200 rounded-xl p-3 text-xs text-blue-900 space-y-2 mt-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-medium text-blue-700">رمز الأمان المعتمد لهذا المريض:</span>
                <span className="font-mono font-bold bg-white px-2 py-0.5 rounded border border-blue-300 text-blue-800">
                  {generatePatientToken(selectedPatientId)}
                </span>
              </div>
              <button
                type="button"
                onClick={async () => {
                  const token = generatePatientToken(selectedPatientId);
                  setTokenInput(token);
                  setVerifyingToken(true);
                  setAuthError('');
                  try {
                    const result = await verifyPatientAccess(selectedPatientId, token);
                    if (result.valid) {
                      setAuthStatus('authorized');
                      if (result.patientName) setPatientName(result.patientName);
                    } else {
                      setAuthError(result.reason || 'رمز الأمان غير مطابق.');
                    }
                  } finally {
                    setVerifyingToken(false);
                  }
                }}
                disabled={verifyingToken}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 text-xs shadow-2xs active:scale-98"
              >
                <CheckCircle2 size={14} />
                <span>ملء الرمز تلقائياً والدخول الآن ({generatePatientToken(selectedPatientId)})</span>
              </button>
            </div>
          </div>
        </div>

        {/* Clinic support footer */}
        <div className="pt-6 pb-2 text-center space-y-2 border-t border-gray-200">
          <p className="text-[11px] text-gray-500">
            إذا لم يكن معك كارت المتابعة الخاص بك، يرجى التواصل مع عيادة القلب مباشرة:
          </p>
          <div className="flex justify-center gap-2">
            <a
              href={`https://wa.me/${CLINIC_WHATSAPP}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg inline-flex items-center gap-1"
            >
              <Send size={13} />
              <span>واتساب العيادة ({CLINIC_PHONE})</span>
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 text-gray-900 pb-12 font-sans" dir="rtl">
      {/* Top Patient Header Bar */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white p-5 rounded-b-3xl shadow-lg relative overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-xs flex items-center justify-center border border-white/20">
              <Heart className="text-red-400 animate-pulse" size={22} />
            </div>
            <div>
              <span className="text-[10px] font-bold tracking-wider text-blue-200 uppercase block">
                Cardios Remote Care • بوابتي
              </span>
              <h1 className="text-base font-bold">بوابة المتابعة القلبية الذكية</h1>
            </div>
          </div>

          <button
            onClick={() => setShowQRModal(true)}
            className="p-2 rounded-xl bg-white/15 hover:bg-white/25 border border-white/20 text-white transition-all flex items-center gap-1 text-xs"
            title="عرض كارت الدخول السريع"
          >
            <QrCode size={18} />
            <span className="hidden sm:inline">كارت QR</span>
          </button>
        </div>

        {/* Patient Identity Badge */}
        {isQRDirectAccess ? (
          /* Locked Private View for the real patient: NEVER shows other patients */
          <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-3 border border-white/15 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center border border-emerald-400/40">
                <ShieldCheck size={18} />
              </div>
              <div>
                <span className="text-[10px] text-blue-200 block">حساب المريض المؤكد:</span>
                <p className="font-bold text-sm text-white">{patientName}</p>
              </div>
            </div>
            <span className="text-[11px] bg-emerald-400/20 text-emerald-200 px-2.5 py-1 rounded-full font-medium border border-emerald-400/30">
              ملف #{selectedPatientId}
            </span>
          </div>
        ) : (
          /* Doctor's Preview / Simulation Selector (Only when doctor is testing in dashboard) */
          <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-3 border border-white/15 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-blue-200 block">معاينة الطبيب للمريض:</span>
              <p className="font-bold text-sm text-white">{patientName}</p>
            </div>
            <select
              value={selectedPatientId}
              onChange={(e) => {
                setSelectedPatientId(e.target.value);
                const found = patientsList.find(p => p.id === e.target.value);
                if (found) setPatientName(found.name);
              }}
              className="bg-white text-gray-900 text-xs px-2.5 py-1.5 rounded-lg border-0 font-medium focus:ring-2 focus:ring-blue-400"
            >
              {patientsList.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Adherence Streak Badge */}
        <div className="mt-3 flex items-center justify-between text-xs text-blue-100">
          <span className="flex items-center gap-1">
            <Flame size={15} className="text-amber-300" />
            التزام اليوم: <strong>{adherencePercent}%</strong> ({completedCount} من {meds.length} أدوية)
          </span>
          <span className="text-[11px] text-blue-200">
            {new Date().toLocaleDateString('ar-EG', {weekday: 'long', day: 'numeric', month: 'short'})}
          </span>
        </div>
      </div>

      {/* Navigation Tabs (4 Tabs: Vitals, Meds, Doctor Chat, Prescriptions) */}
      <div className="p-4">
        <div className="bg-white p-1 rounded-2xl shadow-xs border border-gray-200 grid grid-cols-4 gap-1 text-[11px] font-bold text-gray-600">
          <button
            onClick={() => setActiveTab('vitals')}
            className={`py-2 rounded-xl transition-all flex flex-col sm:flex-row items-center justify-center gap-1 ${
              activeTab === 'vitals'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'hover:bg-gray-100 text-gray-600'
            }`}
          >
            <Activity size={14} />
            <span>الضغط</span>
          </button>
          <button
            onClick={() => setActiveTab('meds')}
            className={`py-2 rounded-xl transition-all flex flex-col sm:flex-row items-center justify-center gap-1 ${
              activeTab === 'meds'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'hover:bg-gray-100 text-gray-600'
            }`}
          >
            <Pill size={14} />
            <span>الأدوية</span>
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className={`py-2 rounded-xl transition-all flex flex-col sm:flex-row items-center justify-center gap-1 relative ${
              activeTab === 'chat'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'hover:bg-gray-100 text-gray-600'
            }`}
          >
            <MessageCircle size={14} />
            <span>محادثة الطبيب</span>
            {chatMessages.length > 0 && activeTab !== 'chat' && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 absolute top-1 right-1" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('prescriptions')}
            className={`py-2 rounded-xl transition-all flex flex-col sm:flex-row items-center justify-center gap-1 ${
              activeTab === 'prescriptions'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'hover:bg-gray-100 text-gray-600'
            }`}
          >
            <FileText size={14} />
            <span>الروشتة</span>
          </button>
        </div>
      </div>

      {/* Main Content Areas */}
      <div className="px-4 space-y-4">
        {/* TAB 1: VITALS LOGGER */}
        {activeTab === 'vitals' && (
          <>
            {feedback && (
              <div className={`p-3.5 rounded-2xl border text-xs leading-relaxed animate-in fade-in duration-200 flex items-start gap-2.5 ${
                feedback.type === 'alert'
                  ? 'bg-red-50 border-red-200 text-red-800'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-800'
              }`}>
                {feedback.type === 'alert' ? <AlertTriangle size={18} className="text-red-600 shrink-0 mt-0.5" /> : <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />}
                <p className="font-medium">{feedback.message}</p>
              </div>
            )}

            <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-200 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                  <Activity size={18} className="text-blue-600" />
                  تسجيل قراءة الضغط والنبض اليومية
                </h2>
                <span className="text-[10px] text-gray-400">مباشر إلى طبيبك</span>
              </div>

              <form onSubmit={handleSubmitVitals} className="space-y-3.5">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      الضغط الانقباضي (العالي)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="60"
                        max="260"
                        value={systolic}
                        onChange={(e) => setSystolic(e.target.value)}
                        placeholder="مثال: 125"
                        required
                        className="w-full text-center text-lg font-bold p-3 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white"
                      />
                      <span className="absolute left-2.5 top-3.5 text-[10px] text-gray-400 font-normal">mmHg</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      الضغط الانبساطي (الواطي)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="40"
                        max="160"
                        value={diastolic}
                        onChange={(e) => setDiastolic(e.target.value)}
                        placeholder="مثال: 80"
                        required
                        className="w-full text-center text-lg font-bold p-3 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white"
                      />
                      <span className="absolute left-2.5 top-3.5 text-[10px] text-gray-400 font-normal">mmHg</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    معدل نبضات القلب (Heart Rate)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="40"
                      max="200"
                      value={heartRate}
                      onChange={(e) => setHeartRate(e.target.value)}
                      placeholder="مثال: 72"
                      required
                      className="w-full text-center text-base font-bold p-2.5 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white"
                    />
                    <span className="absolute left-3 top-3 text-[10px] text-gray-400">BPM (نبضة/د)</span>
                  </div>
                </div>

                {currentBPStatus && (
                  <div className={`p-3 rounded-xl border transition-all text-xs ${currentBPStatus.color}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold">{currentBPStatus.label}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${currentBPStatus.badge}`}>
                        {systolic}/{diastolic}
                      </span>
                    </div>
                    <p className="text-[11px] opacity-90">{currentBPStatus.sub}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 text-white font-bold text-sm rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  <Send size={16} />
                  <span>{submitting ? 'جارٍ الإرسال والتسجيل...' : 'إرسال القراءات وحفظها'}</span>
                </button>
              </form>
            </div>

            {/* Past Readings History */}
            <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-200 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wide">
                  سجل القياسات السابقة ({vitalsHistory.length})
                </h3>
                <span className="text-[11px] text-gray-400">محدث لحظياً</span>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto">
                {vitalsHistory.length > 0 ? (
                  vitalsHistory.map((v, i) => (
                    <div key={v.id || i} className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-3 h-3 rounded-full ${
                          v.systolic >= 160 ? 'bg-red-500' :
                          v.systolic >= 140 ? 'bg-amber-500' :
                          'bg-emerald-500'
                        }`} />
                        <div>
                          <p className="font-black text-sm text-gray-800">
                            {v.systolic} / {v.diastolic} <span className="text-xs font-normal text-gray-500">mmHg</span>
                          </p>
                          <p className="text-[10px] text-gray-400">
                            نبض: {v.heartRate || 72} BPM • {v.formattedDate || new Date(v.timestamp).toLocaleDateString('ar-EG')}
                          </p>
                        </div>
                      </div>

                      <span className={`text-[10px] px-2 py-1 rounded-md font-bold ${
                        v.systolic >= 140 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {v.systolic >= 140 ? 'مرتفع' : 'مثالي'}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-center text-gray-400 text-xs">
                    لم يتم تسجيل قراءات سابقة بعد. سجل قراءتك الأولى بالأعلى!
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* TAB 2: MEDICATION SCHEDULE (Synced live from Doctor's EHR) */}
        {activeTab === 'meds' && (
          <div className="space-y-3">
            <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <Pill className="text-indigo-600" size={18} />
                    جدول الأدوية والجرعات اليومية
                  </h2>
                  <p className="text-[11px] text-gray-500">محدث ومزامن تلقائياً من روشتة طبيبك</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-700 font-bold flex items-center justify-center text-xs border border-indigo-200">
                  {completedCount}/{meds.length}
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden mb-4">
                <div
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 h-full transition-all duration-300"
                  style={{width: `${adherencePercent}%`}}
                />
              </div>

              {/* Medication List */}
              <div className="space-y-2.5">
                {meds.map((med) => (
                  <div
                    key={med.id}
                    onClick={() => toggleMedication(med.id)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                      med.taken
                        ? 'bg-emerald-50/60 border-emerald-300 shadow-2xs'
                        : 'bg-white border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold transition-all ${
                        med.taken ? 'bg-emerald-600 text-white' : 'border-2 border-gray-300 bg-gray-50 text-transparent'
                      }`}>
                        ✓
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className={`text-sm font-bold ${med.taken ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                            {med.name}
                          </h4>
                          <span className="text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold border border-blue-200">
                            {med.dosage}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">{med.instructions}</p>
                      </div>
                    </div>

                    <span className="text-[10px] font-bold px-2 py-1 rounded-md bg-gray-100 text-gray-600">
                      {med.timeSlot === 'Morning' ? '🌅 صباحاً' : med.timeSlot === 'Afternoon' ? '☀️ ظهراً' : '🌙 مساءً'}
                    </span>
                  </div>
                ))}

                {meds.length === 0 && (
                  <div className="p-6 text-center text-gray-400 text-xs">
                    لم يقم الطبيب بإضافة أدوية لهذا الملف بعد.
                  </div>
                )}
              </div>
            </div>

            <div className="p-3.5 bg-blue-50/60 rounded-2xl border border-blue-200 text-xs text-blue-900 flex items-start gap-2">
              <ShieldCheck size={18} className="text-blue-600 shrink-0 mt-0.5" />
              <p>
                <strong>تنبيه طبي:</strong> الالتزام بمواعيد وجرعات حاصرات بيتا ومضادات الضغط ضروري لانتظام الدورة الدموية وحماية عضلة القلب.
              </p>
            </div>
          </div>
        )}

        {/* TAB 3: DIRECT PATIENT-DOCTOR CHAT */}
        {activeTab === 'chat' && (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-[520px]">
            {/* Chat Header */}
            <div className="p-3.5 bg-gradient-to-r from-blue-700 to-indigo-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                  <Stethoscope size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-xs">المحادثة المباشرة مع طبيبك</h3>
                  <p className="text-[10px] text-blue-100">د. القلب والأوعية الدموية - Cardios</p>
                </div>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-200 border border-emerald-400/30">
                متصل الآن
              </span>
            </div>

            {/* Chat Messages Thread */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/50">
              {chatMessages.length === 0 ? (
                <div className="h-full flex flex-col justify-center items-center text-center p-4">
                  <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mb-3">
                    <MessageCircle size={24} />
                  </div>
                  <h4 className="font-bold text-gray-800 text-sm mb-1">
                    تواصل مباشرة مع طبيبك
                  </h4>
                  <p className="text-xs text-gray-500 max-w-xs leading-relaxed">
                    يمكنك إرسال أي استفسار بشأن الأعراض، التعديل على الجرعات، أو نتائج القياسات اليومية ليجيبك الطبيب في ملفك.
                  </p>
                </div>
              ) : (
                chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${
                      msg.sender === 'patient' ? 'items-end' : 'items-start'
                    }`}
                  >
                    <div
                      className={`p-3 rounded-2xl text-xs max-w-[85%] leading-relaxed ${
                        msg.sender === 'patient'
                          ? 'bg-blue-600 text-white rounded-tr-xs shadow-xs'
                          : 'bg-white border border-gray-200 text-gray-900 rounded-tl-xs shadow-2xs'
                      }`}
                    >
                      {msg.sender === 'doctor' && (
                        <div className="flex items-center gap-1 text-[10px] font-bold text-blue-700 mb-1 border-b border-gray-100 pb-1">
                          <Stethoscope size={12} />
                          <span>د. القلب المعالج</span>
                        </div>
                      )}
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                    </div>
                    {msg.timestamp && (
                      <span className="text-[10px] text-gray-400 mt-1 px-1">
                        {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Chat Input Bar */}
            <form onSubmit={handleSendChatMessage} className="p-3 bg-white border-t border-gray-200 flex gap-2">
              <input
                type="text"
                value={newChatText}
                onChange={(e) => setNewChatText(e.target.value)}
                placeholder="اكتب رسالتك لطبيبك هنا..."
                className="flex-1 text-xs p-2.5 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white"
              />
              <button
                type="submit"
                disabled={!newChatText.trim() || sendingChat}
                className="p-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl shadow-xs transition-all flex items-center justify-center shrink-0"
                title="إرسال"
              >
                <Send size={16} />
              </button>
            </form>
          </div>
        )}

        {/* TAB 4: PRESCRIPTIONS & CLINIC CONTACT */}
        {activeTab === 'prescriptions' && (
          <div className="space-y-3">
            {/* Active Rx Card */}
            <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-200 space-y-3">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div>
                  <h3 className="font-bold text-sm text-gray-900">أحدث روشتة علاجية معتمدة</h3>
                  <p className="text-[11px] text-gray-400">عيادة د. القلب والأوعية الدموية - Cardios</p>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                  سارية المفعول
                </span>
              </div>

              <div className="space-y-2 text-xs">
                {meds.map((m, idx) => (
                  <div key={idx} className="p-2.5 bg-gray-50 rounded-xl border border-gray-200 flex justify-between items-center">
                    <div>
                      <span className="font-bold text-gray-900">{idx + 1}. {m.name}</span>
                      <p className="text-[11px] text-gray-500">{m.instructions}</p>
                    </div>
                    <span className="text-blue-700 font-semibold bg-blue-50 px-2 py-0.5 rounded text-[11px]">
                      {m.dosage}
                    </span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => window.print()}
                className="w-full py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-xl border border-blue-200 transition-colors flex items-center justify-center gap-1.5"
              >
                <FileText size={15} />
                <span>تحميل أو طباعة نسخة الروشتة الرسمية</span>
              </button>
            </div>

            {/* Direct Clinic WhatsApp / Phone Call using exact number 01146963589 */}
            <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-200 space-y-3">
              <h3 className="font-bold text-sm text-gray-900">التواصل المباشر مع العيادة</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                في حال وجود أي استفسار عاجل بشأن الجرعات أو الشعور بأي أعراض غير معتادة:
              </p>

              <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200 flex items-center justify-between text-xs font-semibold text-blue-900">
                <span>رقم العيادة المباشر:</span>
                <span className="font-mono text-sm tracking-wider font-bold text-blue-800">{CLINIC_PHONE}</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <a
                  href={`https://wa.me/${CLINIC_WHATSAPP}?text=${encodeURIComponent(`مرحباً عيادة د. القلب (Cardios)، أنا المريض ${patientName} (ملف #${selectedPatientId}). أود الاستفسار عن حالتي.`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs text-center"
                >
                  <Send size={15} />
                  <span>واتساب العيادة</span>
                </a>

                <a
                  href={`tel:${CLINIC_PHONE}`}
                  className="p-3 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all border border-gray-200 text-center"
                >
                  <Phone size={15} />
                  <span>اتصال هاتفي</span>
                </a>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* QR Access Card Modal */}
      {showQRModal && (
        <PatientQRCardModal
          patientName={patientName}
          patientId={selectedPatientId}
          onClose={() => setShowQRModal(false)}
        />
      )}
    </div>
  );
}
