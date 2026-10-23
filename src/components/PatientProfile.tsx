import React, {useState, useEffect} from 'react';
import {addDoc, collection, query, orderBy, onSnapshot, doc, getDoc} from 'firebase/firestore';
import {db} from '../lib/firebase';
import {LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer} from 'recharts';
import {
  QrCode,
  Sparkles,
  HeartPulse,
  Activity,
  Pill,
  Printer,
  ShieldCheck,
  AlertTriangle,
  ArrowLeft,
  Calendar,
  Phone,
  FileSpreadsheet,
  Check,
  Plus,
  Trash2,
  Stethoscope,
  Info
} from 'lucide-react';
import LabResultsModal from './LabResultsModal';
import CardiologyReport from './CardiologyReport';
import GeminiChat from './GeminiChat';
import Chat from './Chat';
import ReferralModal from './ReferralModal';
import BillingModal from './BillingModal';
import PatientQRCardModal from './PatientQRCardModal';

const CLINIC_HOTLINE = '01146963589';

const COMMON_CARDIOLOGY_MEDS = [
  {name: 'Bisoprolol (Concor)', dose: '5 mg', timing: 'صباحاً بعد الإفطار'},
  {name: 'Atorvastatin (Lipitor)', dose: '40 mg', timing: 'مساءً قبل النوم'},
  {name: 'Aspirin Protect', dose: '81 mg', timing: 'بعد وجبة الغداء'},
  {name: 'Perindopril (Coversyl)', dose: '5 mg', timing: 'صباحاً'},
  {name: 'Amlodipine (Norvasc)', dose: '5 mg', timing: 'ظهراً'},
  {name: 'Valsartan (Tareg)', dose: '160 mg', timing: 'صباحاً'},
  {name: 'Apixaban (Eliquis)', dose: '5 mg', timing: 'كل 12 ساعة'},
  {name: 'Sacubitril/Valsartan (Entresto)', dose: '49/51 mg', timing: 'مرتين يومياً'},
  {name: 'Empagliflozin (Jardiance)', dose: '10 mg', timing: 'صباحاً'},
  {name: 'Spironolactone (Aldactone)', dose: '25 mg', timing: 'بعد الإفطار'},
  {name: 'Clopidogrel (Plavix)', dose: '75 mg', timing: 'يومياً'}
];

export default function PatientProfile({patientId, onBack}: {patientId: string, onBack: () => void}) {
  const [patient, setPatient] = useState<any>(null);
  const [medications, setMedications] = useState<{name: string, dosage: string, instructions?: string}[]>([]);
  const [vitals, setVitals] = useState<{timestamp: string, systolic: number, diastolic: number, heartRate?: number}[]>([]);
  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');
  const [heartRate, setHeartRate] = useState('');
  const [savingRx, setSavingRx] = useState(false);
  const [rxSyncSuccess, setRxSyncSuccess] = useState(false);

  // New med inputs
  const [medName, setMedName] = useState('');
  const [medDosage, setMedDosage] = useState('');
  const [medInstructions, setMedInstructions] = useState('');

  // Modals & triggers
  const [showLabModal, setShowLabModal] = useState(false);
  const [showReferralModal, setShowReferralModal] = useState(false);
  const [showBillingModal, setShowBillingModal] = useState(false);
  const [showQRCard, setShowQRCard] = useState(false);
  const [aiTrigger, setAiTrigger] = useState(0);

  // Load Patient Document
  useEffect(() => {
    const fetchPatient = async () => {
      const docRef = doc(db, 'patients', patientId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setPatient({id: docSnap.id, ...docSnap.data()});
      }
    };
    fetchPatient();
  }, [patientId]);

  // Real-time Vitals
  useEffect(() => {
    const q = query(collection(db, 'patients', patientId, 'vitals'), orderBy('timestamp', 'asc'));
    return onSnapshot(q, (snapshot) => {
      setVitals(snapshot.docs.map(d => ({...d.data()})) as any);
    });
  }, [patientId]);

  // Real-time synchronization of prescribed medications
  useEffect(() => {
    const qRx = query(
      collection(db, 'patients', patientId, 'prescriptions'),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(qRx, (snap) => {
      if (!snap.empty) {
        const latest = snap.docs[0].data();
        if (latest.medications && Array.isArray(latest.medications) && latest.medications.length > 0) {
          setMedications(latest.medications);
        }
      }
    });
    return unsub;
  }, [patientId]);

  const saveVital = async () => {
    if (systolic && diastolic) {
      await addDoc(collection(db, 'patients', patientId, 'vitals'), {
        systolic: Number(systolic),
        diastolic: Number(diastolic),
        heartRate: heartRate ? Number(heartRate) : 72,
        timestamp: new Date().toISOString()
      });
      setSystolic('');
      setDiastolic('');
      setHeartRate('');
    }
  };

  const addMedication = () => {
    if (medName.trim() && medDosage.trim()) {
      const newMed = {
        name: medName.trim(),
        dosage: medDosage.trim(),
        instructions: medInstructions.trim() || 'قرص يومياً حسب الإرشاد الطبي'
      };
      setMedications([...medications, newMed]);
      setMedName('');
      setMedDosage('');
      setMedInstructions('');
    }
  };

  const removeMedication = (idx: number) => {
    setMedications(medications.filter((_, i) => i !== idx));
  };

  const selectPresetMed = (med: typeof COMMON_CARDIOLOGY_MEDS[0]) => {
    setMedName(med.name);
    setMedDosage(med.dose);
    setMedInstructions(med.timing);
  };

  const savePrescription = async () => {
    setSavingRx(true);
    try {
      await addDoc(collection(db, 'patients', patientId, 'prescriptions'), {
        medications,
        createdAt: new Date().toISOString()
      });
      setRxSyncSuccess(true);
      setTimeout(() => setRxSyncSuccess(false), 3000);
    } catch (error) {
      console.error('Error saving prescription:', error);
      alert('تعذر حفظ الروشتة، يرجى المحاولة ثانية.');
    } finally {
      setSavingRx(false);
    }
  };

  if (!patient) {
    return (
      <div className="min-h-[500px] flex items-center justify-center p-8">
        <div className="flex items-center gap-3 text-slate-500 text-sm font-semibold">
          <Activity size={24} className="text-blue-600 animate-spin" />
          <span>جاري تحميل السجل الطبي للقلب...</span>
        </div>
      </div>
    );
  }

  const latestVital = vitals.length > 0 ? vitals[vitals.length - 1] : null;
  const isHighBP = latestVital && (latestVital.systolic >= 140 || latestVital.diastolic >= 90);

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto font-sans" dir="rtl">
      {/* Top Clinical Header & Actions */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 bg-slate-100 hover:bg-slate-200 rounded-2xl text-slate-700 transition-colors"
              title="العودة للوحة الرئيسية"
            >
              <ArrowLeft size={18} className="transform -scale-x-100" />
            </button>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900">{patient.name}</h1>
                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                  patient.status?.includes('تنبيه') || patient.status?.includes('Alert')
                    ? 'bg-red-100 text-red-800 border border-red-200'
                    : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                }`}>
                  {patient.status || 'نشط'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 flex items-center gap-3">
                <span>تاريخ الميلاد: {patient.dob} ({patient.age || 50} سنة)</span>
                <span>• الهاتف: {patient.phone || '01012345678'}</span>
                <span>• خط العيادة: <strong className="text-blue-600 font-mono">{CLINIC_HOTLINE}</strong></span>
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* AI Assistant Direct Trigger */}
            <button
              onClick={() => setAiTrigger(prev => prev + 1)}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-blue-700 hover:from-emerald-700 hover:to-blue-800 text-white rounded-2xl shadow-sm text-xs font-bold transition-all active:scale-95"
            >
              <Sparkles size={16} className="text-amber-300 animate-pulse" />
              <span>مستشار الذكاء الاصطناعي للحالة (Cardio AI)</span>
              <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded-md text-emerald-100">
                ملم بالحالة
              </span>
            </button>

            {/* Smart QR Card */}
            <button
              onClick={() => setShowQRCard(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-800 hover:to-indigo-800 text-white rounded-2xl shadow-sm text-xs font-bold transition-all active:scale-95"
            >
              <QrCode size={16} />
              <span>كارت المريض الذكي (QR Portal)</span>
            </button>
          </div>
        </div>

        {/* Clinical Dossier Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-100 text-xs">
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
            <span className="text-slate-400 block mb-1">التشخيص القلبي الأساسي:</span>
            <span className="font-bold text-slate-800 leading-snug block">
              {patient.diagnosis || 'ارتفاع ضغط الدم ومتابعة القلب والشرايين'}
            </span>
          </div>

          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
            <span className="text-slate-400 block mb-1">فئة الخطورة القلبية (CV Risk):</span>
            <span className="font-bold text-red-700 leading-snug block">
              {patient.riskTier || 'عالي الخطورة (Very High Risk)'}
            </span>
          </div>

          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
            <span className="text-slate-400 block mb-1">كفاءة عضلة القلب (LVEF):</span>
            <span className="font-bold text-blue-700 text-base font-mono block">
              {patient.ef || 55}%
              <span className="text-[11px] font-normal text-slate-500 mr-1.5">
                {patient.ef && patient.ef < 40 ? '(قصور HFrEF)' : '(كفاءة مقبولة)'}
              </span>
            </span>
          </div>

          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
            <span className="text-slate-400 block mb-1">الضغط المستهدف (Target BP):</span>
            <span className="font-bold text-emerald-700 font-mono text-base block">
              {patient.targetBP || '< 130/80 mmHg'}
            </span>
          </div>
        </div>
      </div>

      {showLabModal && <LabResultsModal patientId={patientId} onClose={() => setShowLabModal(false)} />}

      {/* Main Grid: Vitals & Logging */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Blood Pressure Trends Chart */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Activity size={18} className="text-blue-600" />
                <span>مخطط ضغط الدم ومعدل النبض (BP & HR Trends)</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                تتبع القراءات المسجلة من العيادة أو المرسلة عبر كارت المريض الذكي
              </p>
            </div>
            {latestVital && (
              <div className="text-left font-mono" dir="ltr">
                <span className="text-xs text-slate-400 block">Latest Reading</span>
                <span className={`text-base font-bold ${isHighBP ? 'text-red-600' : 'text-emerald-600'}`}>
                  {latestVital.systolic}/{latestVital.diastolic} mmHg
                </span>
              </div>
            )}
          </div>

          <div className="h-64" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={vitals}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={(val) => {
                    try {
                      return new Date(val).toLocaleDateString([], {month: 'numeric', day: 'numeric'});
                    } catch {
                      return val;
                    }
                  }}
                  stroke="#94a3b8"
                  fontSize={11}
                />
                <YAxis domain={[50, 190]} stroke="#94a3b8" fontSize={11} />
                <Tooltip
                  formatter={(val: any, name: any) => [
                    `${val} ${name === 'heartRate' ? 'bpm' : 'mmHg'}`,
                    name === 'systolic' ? 'الانقباضي (Systolic)' : name === 'diastolic' ? 'الانبساطي (Diastolic)' : 'النبض (Pulse)'
                  ]}
                  labelFormatter={(lbl) => (lbl ? new Date(String(lbl)).toLocaleString('ar-EG') : '')}
                />
                <Line
                  type="monotone"
                  dataKey="systolic"
                  stroke="#ef4444"
                  strokeWidth={2.5}
                  dot={{r: 4, fill: '#ef4444'}}
                  name="systolic"
                />
                <Line
                  type="monotone"
                  dataKey="diastolic"
                  stroke="#3b82f6"
                  strokeWidth={2.5}
                  dot={{r: 4, fill: '#3b82f6'}}
                  name="diastolic"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-100 gap-2">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-red-500 inline-block" />
                الانقباضي (Systolic)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-blue-500 inline-block" />
                الانبساطي (Diastolic)
              </span>
            </div>
            <span className="text-[11px] text-slate-400">
              المعدل المستهدف: أقل من 130/80 mmHg وفق إرشادات ESC 2024
            </span>
          </div>
        </div>

        {/* Quick Log Vitals Box */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-800 mb-1 flex items-center gap-2">
              <HeartPulse size={18} className="text-red-500" />
              <span>تسجيل قياس جديد في العيادة</span>
            </h2>
            <p className="text-xs text-slate-400 mb-4">
              إضافة قراءة حية لملف المريض وتحديث الرسم البياني
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">
                  الضغط الانقباضي (Systolic mmHg)
                </label>
                <input
                  type="number"
                  value={systolic}
                  onChange={(e) => setSystolic(e.target.value)}
                  placeholder="مثال: 125"
                  className="w-full p-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">
                  الضغط الانبساطي (Diastolic mmHg)
                </label>
                <input
                  type="number"
                  value={diastolic}
                  onChange={(e) => setDiastolic(e.target.value)}
                  placeholder="مثال: 80"
                  className="w-full p-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">
                  معدل نبض القلب (Heart Rate bpm - اختياري)
                </label>
                <input
                  type="number"
                  value={heartRate}
                  onChange={(e) => setHeartRate(e.target.value)}
                  placeholder="مثال: 72"
                  className="w-full p-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100">
            <button
              onClick={saveVital}
              disabled={!systolic || !diastolic}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-bold text-xs rounded-xl shadow-xs transition-all active:scale-98"
            >
              حفظ القياس في الملف السريري
            </button>

            {isHighBP && (
              <div className="mt-3 p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                <AlertTriangle size={16} className="shrink-0 text-red-500" />
                <span>تنبيه: آخر قراءة تشير لارتفاع الضغط (&gt;140/90).</span>
              </div>
            )}
          </div>
        </div>

        {/* Smart Prescription & Medication Sync */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 lg:col-span-3">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Pill size={18} className="text-emerald-600" />
                <span>الروشتة العلاجية الذكية والمزامنة الفورية (Smart Prescription)</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                تزامن الروشتة تلقائياً وتظهر في تطبيق هاتف المريض عند مسح رمز QR
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setAiTrigger(prev => prev + 1)}
                className="flex items-center gap-1.5 px-3 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-xl text-xs font-bold border border-purple-200 transition-colors"
              >
                <Sparkles size={14} className="text-purple-600" />
                <span>فحص التعارضات بالذكاء الاصطناعي</span>
              </button>
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
              >
                <Printer size={14} />
                <span>طباعة الروشتة (PDF)</span>
              </button>
            </div>
          </div>

          {/* Printable Prescription Box */}
          <div id="prescription-content" className="p-5 bg-slate-50 border border-slate-200 rounded-2xl mb-4 print:border-0 print:bg-white">
            <div className="border-b border-slate-200 pb-3 mb-3 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  عيادة القلب والأوعية الدموية • روشتة علاجية رسمية
                </h3>
                <p className="text-xs text-slate-500">اسم المريض: {patient.name} | التاريخ: {new Date().toLocaleDateString('ar-EG')}</p>
              </div>
              <div className="text-left text-xs text-slate-500 font-mono">
                <div>خط العيادة: {CLINIC_HOTLINE}</div>
                <div className="text-[11px] text-emerald-600 font-semibold">مفعلة بالمزامنة السحابية</div>
              </div>
            </div>

            <div className="space-y-2">
              {medications.map((m, i) => (
                <div key={i} className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200 text-xs">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0">
                      {i + 1}
                    </span>
                    <div>
                      <strong className="font-bold text-slate-900 text-sm">{m.name}</strong>
                      <span className="text-blue-700 font-mono font-bold mr-2">[{m.dosage}]</span>
                      {m.instructions && (
                        <p className="text-slate-500 mt-0.5">{m.instructions}</p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => removeMedication(i)}
                    className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg transition-colors print:hidden"
                    title="حذف الدواء"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              {medications.length === 0 && (
                <p className="italic text-slate-400 text-xs text-center py-4">
                  لم يتم إضافة أدوية حتى الآن... يمكنك الاختيار من قائمة أدوية القلب أدناه
                </p>
              )}
            </div>
          </div>

          {/* Quick preset pill buttons */}
          <div className="mb-4">
            <span className="text-[11px] font-bold text-slate-500 block mb-2">
              إضافة سريعة لأشهر أدوية القلب وضغط الدم في مصر:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {COMMON_CARDIOLOGY_MEDS.map((med, idx) => (
                <button
                  key={idx}
                  onClick={() => selectPresetMed(med)}
                  className="px-2.5 py-1 bg-white hover:bg-blue-50 hover:border-blue-300 border border-slate-200 rounded-xl text-[11px] text-slate-700 font-medium transition-all"
                >
                  + {med.name}
                </button>
              ))}
            </div>
          </div>

          {/* Add Medication Inputs */}
          <div className="bg-slate-100/80 p-4 rounded-2xl mb-4 border border-slate-200">
            <h4 className="text-xs font-bold text-slate-700 mb-2">إضافة دواء مخصص للروشتة:</h4>
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
              <input
                type="text"
                value={medName}
                onChange={(e) => setMedName(e.target.value)}
                placeholder="اسم الدواء (مثال: Bisoprolol / Concor)"
                className="sm:col-span-5 p-2.5 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                value={medDosage}
                onChange={(e) => setMedDosage(e.target.value)}
                placeholder="الجرعة (مثال: 5 mg)"
                className="sm:col-span-3 p-2.5 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                value={medInstructions}
                onChange={(e) => setMedInstructions(e.target.value)}
                placeholder="تعليمات التناول (مثال: قرص صباحاً)"
                className="sm:col-span-3 p-2.5 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={addMedication}
                className="sm:col-span-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center"
                title="إضافة للقائمة"
              >
                <Plus size={18} />
              </button>
            </div>
          </div>

          {/* Sync & Save Action */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
            <button
              onClick={savePrescription}
              disabled={savingRx || medications.length === 0}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 disabled:opacity-40 text-white font-bold text-xs rounded-xl shadow-sm transition-all active:scale-95"
            >
              <ShieldCheck size={16} />
              <span>{savingRx ? 'جاري المزامنة...' : 'حفظ الروشتة ومزامنتها فوراً مع هاتف المريض'}</span>
            </button>

            {rxSyncSuccess && (
              <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-bold bg-emerald-100 px-3 py-1.5 rounded-xl border border-emerald-200">
                <Check size={14} />
                <span>تمت المزامنة بنجاح! ستظهر الروشتة للمريض عند مسح الكود.</span>
              </div>
            )}

            <button
              onClick={() => setShowLabModal(true)}
              className="text-xs text-blue-600 hover:underline font-bold"
            >
              مراجعة التحاليل والدهون المرتبطة بالعلاج &larr;
            </button>
          </div>
        </div>

        {/* Diagnostic Cardiology Report (Echo & ECG) */}
        <div className="lg:col-span-3">
          <CardiologyReport patientName={patient.name} patientId={patient.id || patientId} />
        </div>

        {/* Direct Doctor-Patient Clinic Chat */}
        <div className="lg:col-span-3">
          <Chat patientId={patientId} patientName={patient.name} />
        </div>

        {/* Administrative Quick Actions */}
        <div className="lg:col-span-3 flex flex-wrap gap-2.5 pt-2">
          <button
            onClick={() => setShowReferralModal(true)}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
          >
            تحويل لمستشفى / قسطرة (Referral)
          </button>
          <button
            onClick={() => setShowBillingModal(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
          >
            فاتورة كشف واستشارة (Invoice)
          </button>
        </div>
      </div>

      {/* Floating AI Assistant with Full Patient Clinical Context */}
      <GeminiChat
        patientContext={{
          id: patientId,
          name: patient.name,
          nameEn: patient.nameEn,
          dob: patient.dob,
          age: patient.age,
          gender: patient.gender,
          status: patient.status,
          diagnosis: patient.diagnosis,
          riskTier: patient.riskTier,
          ef: patient.ef,
          vitals: vitals,
          medications: medications,
          labs: patient.labs,
          echo: patient.echo
        }}
        externalOpenTrigger={aiTrigger}
      />

      {showReferralModal && <ReferralModal patientId={patientId} onClose={() => setShowReferralModal(false)} />}
      {showBillingModal && <BillingModal patientId={patientId} onClose={() => setShowBillingModal(false)} />}
      {showQRCard && (
        <PatientQRCardModal
          patientName={patient.name}
          patientId={patient.id || patientId}
          onClose={() => setShowQRCard(false)}
        />
      )}
    </div>
  );
}
