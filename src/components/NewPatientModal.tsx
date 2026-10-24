import React, {useState} from 'react';
import {
  X,
  User,
  Heart,
  Activity,
  Pill,
  FileText,
  Phone,
  Calendar,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Printer,
  QrCode,
  Send,
  Loader2,
  Sparkles
} from 'lucide-react';
import {collection, doc, setDoc, addDoc} from 'firebase/firestore';
import {db} from '../lib/firebase';
import {generatePatientToken} from '../lib/patientAuth';

interface NewPatientModalProps {
  onClose: () => void;
  onPatientAdded?: (patientId: string) => void;
}

const COMMON_CARDIAC_DIAGNOSES = [
  'ارتفاع ضغط الدم الشرياني (Hypertension)',
  'قصور الشريان التاجي المزمن (Chronic CAD)',
  'ما بعد قسطرة ودعامة دوائية (Post-PCI Stenting)',
  'ضعف وهبوط عضلة القلب (Heart Failure / HFrEF)',
  'الرجفان الأذيني (Atrial Fibrillation)',
  'اعتلال الصمامات المترالي/الأورطي (Valvular Heart Disease)',
  'مريض سكري وضغط عالي الخطورة (Diabetic Cardio-Renal Risk)'
];

const COMMON_DRUGS_PRESETS = [
  {name: 'Bisoprolol (Concor)', defaultDosage: '5 mg', slot: 'Morning', inst: 'حبة صباحاً بعد الإفطار'},
  {name: 'Aspirin Protect', defaultDosage: '81 mg', slot: 'Afternoon', inst: 'حبة بعد الغداء'},
  {name: 'Atorvastatin (Lipitor)', defaultDosage: '20 mg', slot: 'Evening', inst: 'حبة مساءً قبل النوم'},
  {name: 'Valsartan (Tareg)', defaultDosage: '80 mg', slot: 'Morning', inst: 'حبة صباحاً مع كوب ماء'},
  {name: 'Clopidogrel (Plavix)', defaultDosage: '75 mg', slot: 'Afternoon', inst: 'حبة يومياً بعد الأكل'},
  {name: 'Furosemide (Lasix)', defaultDosage: '40 mg', slot: 'Morning', inst: 'حبة صباحاً على الريق'}
];

export default function NewPatientModal({onClose, onPatientAdded}: NewPatientModalProps) {
  const [activeStep, setActiveStep] = useState<'profile' | 'clinical' | 'vitals_meds' | 'success'>('profile');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 1. Demographics
  const [name, setName] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [gender, setGender] = useState<'ذكر' | 'أنثى'>('ذكر');
  const [age, setAge] = useState<number | string>('52');
  const [dob, setDob] = useState('1974-06-15');
  const [phone, setPhone] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [address, setAddress] = useState('القاهرة');

  // 2. Clinical History
  const [diagnosis, setDiagnosis] = useState(COMMON_CARDIAC_DIAGNOSES[0]);
  const [customDiagnosis, setCustomDiagnosis] = useState('');
  const [riskTier, setRiskTier] = useState('عالي الخطورة (High CV Risk)');
  const [targetBP, setTargetBP] = useState('< 130/80 mmHg');
  const [ef, setEf] = useState<number | string>('55');
  const [allergies, setAllergies] = useState('لا توجد حساسية معروفة');
  const [smoker, setSmoker] = useState('غير مدخن');

  // 3. Baseline Vitals
  const [systolic, setSystolic] = useState('135');
  const [diastolic, setDiastolic] = useState('85');
  const [heartRate, setHeartRate] = useState('74');

  // 4. Initial Prescribed Medications
  const [medications, setMedications] = useState<Array<{name: string; dosage: string; instructions: string; slot: string}>>([
    {name: 'Bisoprolol (Concor)', dosage: '5 mg', instructions: 'قرص صباحاً بعد الإفطار', slot: 'Morning'},
    {name: 'Aspirin Protect', dosage: '81 mg', instructions: 'قرص بعد وجبة الغداء', slot: 'Afternoon'}
  ]);

  // 5. Initial Labs
  const [ldl, setLdl] = useState('110 mg/dL');
  const [creatinine, setCreatinine] = useState('1.0 mg/dL');
  const [hba1c, setHba1c] = useState('5.9%');

  // Success State
  const [createdPatientId, setCreatedPatientId] = useState<string>('');
  const [createdSecurityToken, setCreatedSecurityToken] = useState<string>('');

  const addMedication = (preset?: typeof COMMON_DRUGS_PRESETS[0]) => {
    if (preset) {
      setMedications([...medications, {
        name: preset.name,
        dosage: preset.defaultDosage,
        instructions: preset.inst,
        slot: preset.slot
      }]);
    } else {
      setMedications([...medications, {
        name: '',
        dosage: '',
        instructions: 'قرص يومياً حسب الإرشاد',
        slot: 'Morning'
      }]);
    }
  };

  const removeMedication = (index: number) => {
    setMedications(medications.filter((_, i) => i !== index));
  };

  const handleSavePatient = async () => {
    if (!name.trim()) {
      setError('يرجى إدخال اسم المريض.');
      setActiveStep('profile');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      // Generate clean sequential or random id
      const newPatientId = 'P' + Date.now().toString().slice(-6);
      const securityToken = generatePatientToken(newPatientId);

      const finalDiagnosis = customDiagnosis.trim() ? customDiagnosis.trim() : diagnosis;

      const patientDocData = {
        id: newPatientId,
        name: name.trim(),
        nameEn: nameEn.trim() || name.trim(),
        gender,
        age: Number(age) || 45,
        dob: dob || '1980-01-01',
        phone: phone.trim(),
        nationalId: nationalId.trim(),
        address: address.trim(),
        status: 'مستقر (تحت المتابعة الدورية)',
        diagnosis: finalDiagnosis,
        riskTier,
        targetBP,
        ef: Number(ef) || 55,
        allergies: allergies.trim(),
        smoker,
        securityToken,
        accessToken: securityToken,
        createdAt: new Date().toISOString(),
        labs: {
          ldl: ldl || 'غير مسجل',
          hdl: '45 mg/dL',
          creatinine: creatinine || 'غير مسجل',
          egfr: '85 mL/min',
          potassium: '4.3 mmol/L',
          hba1c: hba1c || 'غير مسجل'
        },
        initialVitals: [
          {
            systolic: Number(systolic) || 120,
            diastolic: Number(diastolic) || 80,
            heartRate: Number(heartRate) || 72,
            timestamp: new Date().toISOString()
          }
        ]
      };

      // 1. Create Patient document
      await setDoc(doc(db, 'patients', newPatientId), patientDocData);

      // 2. Add first vital reading subcollection
      if (systolic && diastolic) {
        await addDoc(collection(db, 'patients', newPatientId, 'vitals'), {
          systolic: Number(systolic),
          diastolic: Number(diastolic),
          heartRate: Number(heartRate) || 72,
          timestamp: new Date().toISOString(),
          patientId: newPatientId,
          formattedDate: new Date().toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'}) + ' - ' + new Date().toLocaleDateString('ar-EG')
        });
      }

      // 3. Add initial Prescription subcollection
      if (medications.length > 0) {
        const validMeds = medications.filter(m => m.name.trim().length > 0);
        if (validMeds.length > 0) {
          await addDoc(collection(db, 'patients', newPatientId, 'prescriptions'), {
            patientId: newPatientId,
            doctorName: 'طبيب العيادة المعالج',
            date: new Date().toLocaleDateString('ar-EG'),
            diagnosis: finalDiagnosis,
            medications: validMeds,
            notes: 'تم صرف الروشتة المبدئية عند فتح الملف الطبي.',
            createdAt: new Date().toISOString()
          });
        }
      }

      setCreatedPatientId(newPatientId);
      setCreatedSecurityToken(securityToken);
      setActiveStep('success');

      if (onPatientAdded) {
        onPatientAdded(newPatientId);
      }
    } catch (err: any) {
      console.error('Error creating patient:', err);
      setError('حدث خطأ أثناء حفظ الملف الطبي: ' + (err.message || ''));
    } finally {
      setSaving(false);
    }
  };

  const portalDirectUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/?portal=true&patientId=${createdPatientId}&token=${createdSecurityToken}`
    : '';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-fadeIn"
      dir="rtl"
    >
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-6">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-white">
              <User size={20} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black">فتح ملف مريض جديد (Clinical Intake)</h2>
              <p className="text-xs text-blue-200">تسجيل بيانات المريض الشاملة، حالته السريرية، وإصدار كارت المتابعة</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Step Indicator (Only if not in success state) */}
        {activeStep !== 'success' && (
          <div className="bg-slate-50 border-b border-slate-200 p-2.5 flex items-center justify-around text-xs font-bold text-slate-600">
            <button
              type="button"
              onClick={() => setActiveStep('profile')}
              className={`flex items-center gap-1.5 py-1 px-3 rounded-xl transition-all ${
                activeStep === 'profile'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'hover:bg-slate-200'
              }`}
            >
              <span>1. البيانات الشخصية</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveStep('clinical')}
              className={`flex items-center gap-1.5 py-1 px-3 rounded-xl transition-all ${
                activeStep === 'clinical'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'hover:bg-slate-200'
              }`}
            >
              <span>2. التقييم القلبي</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveStep('vitals_meds')}
              className={`flex items-center gap-1.5 py-1 px-3 rounded-xl transition-all ${
                activeStep === 'vitals_meds'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'hover:bg-slate-200'
              }`}
            >
              <span>3. القياسات والروشتة</span>
            </button>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-5 sm:p-6 max-h-[70vh] overflow-y-auto">
          {/* STEP 1: Personal Profile */}
          {activeStep === 'profile' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    اسم المريض بالكامل (عربي) *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="مثال: محمود عبد الرحمن الشريف"
                    autoFocus
                    className="w-full text-sm p-3 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    الاسم بالإنجليزية (اختياري)
                  </label>
                  <input
                    type="text"
                    value={nameEn}
                    onChange={(e) => setNameEn(e.target.value)}
                    placeholder="Mahmoud Abdelrahman"
                    dir="ltr"
                    className="w-full text-sm p-3 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">العمر (سنة)</label>
                  <input
                    type="number"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    className="w-full text-sm p-3 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">النوع</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as any)}
                    className="w-full text-sm p-3 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="ذكر">ذكر</option>
                    <option value="أنثى">أنثى</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">تاريخ الميلاد</label>
                  <input
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="w-full text-sm p-3 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">رقم الهاتف / الواتساب</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="010XXXXXXXX"
                    dir="ltr"
                    className="w-full text-sm p-3 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">الرقم القومي / المعرف المدني</label>
                  <input
                    type="text"
                    value={nationalId}
                    onChange={(e) => setNationalId(e.target.value)}
                    placeholder="14 رقم"
                    dir="ltr"
                    className="w-full text-sm p-3 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">المحافظة / العنوان</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="القاهرة - المعادي"
                  className="w-full text-sm p-3 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setActiveStep('clinical')}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all shadow-xs"
                >
                  التالي: التقييم القلبي والسريري &larr;
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Clinical Assessment */}
          {activeStep === 'clinical' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  التشخيص السريري الرئيسي (Primary Diagnosis)
                </label>
                <select
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  className="w-full text-sm p-3 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 mb-2"
                >
                  {COMMON_CARDIAC_DIAGNOSES.map((d, i) => (
                    <option key={i} value={d}>{d}</option>
                  ))}
                  <option value="تشخيص مخصص">تشخيص سريري آخر...</option>
                </select>

                {diagnosis === 'تشخيص مخصص' && (
                  <input
                    type="text"
                    value={customDiagnosis}
                    onChange={(e) => setCustomDiagnosis(e.target.value)}
                    placeholder="أدخل التشخيص الطبي بدقة..."
                    className="w-full text-sm p-3 bg-white border border-blue-400 rounded-xl focus:ring-2 focus:ring-blue-500"
                  />
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    كفاءة عضلة القلب (EF %)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={ef}
                      onChange={(e) => setEf(e.target.value)}
                      placeholder="55"
                      className="w-full text-sm p-3 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="absolute left-3 top-3 text-xs text-slate-400 font-bold">%</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    الضغط المستهدف (Target BP)
                  </label>
                  <input
                    type="text"
                    value={targetBP}
                    onChange={(e) => setTargetBP(e.target.value)}
                    placeholder="< 130/80"
                    className="w-full text-sm p-3 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    درجة الخطورة القلبية
                  </label>
                  <select
                    value={riskTier}
                    onChange={(e) => setRiskTier(e.target.value)}
                    className="w-full text-sm p-3 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="عالي جداً (Very High CV Risk)">عالي جداً (Very High)</option>
                    <option value="عالي الخطورة (High CV Risk)">عالي الخطورة (High)</option>
                    <option value="متوسط الخطورة (Moderate)">متوسط (Moderate)</option>
                    <option value="منخفض الخطورة (Low)">منخفض (Low)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    الحساسية الدوائية (Drug Allergies)
                  </label>
                  <input
                    type="text"
                    value={allergies}
                    onChange={(e) => setAllergies(e.target.value)}
                    placeholder="لا توجد حساسية معروفة"
                    className="w-full text-sm p-3 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    حالة التدخين وعوامل الخطر
                  </label>
                  <select
                    value={smoker}
                    onChange={(e) => setSmoker(e.target.value)}
                    className="w-full text-sm p-3 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="غير مدخن">غير مدخن</option>
                    <option value="مدخن حالي (شره)">مدخن حالي</option>
                    <option value="مدخن سابق (مقلع)">مدخن سابق</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex justify-between">
                <button
                  type="button"
                  onClick={() => setActiveStep('profile')}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all"
                >
                  &rarr; السابق
                </button>
                <button
                  type="button"
                  onClick={() => setActiveStep('vitals_meds')}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all shadow-xs"
                >
                  التالي: القياسات الحيوية والروشتة &larr;
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Vitals, Medications, Labs */}
          {activeStep === 'vitals_meds' && (
            <div className="space-y-5">
              {/* Vitals Box */}
              <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-blue-900">
                  <Activity size={16} className="text-blue-600" />
                  <span>القياسات الحيوية الأولية عند الكشف:</span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">الانقباضي (Systolic)</label>
                    <input
                      type="number"
                      value={systolic}
                      onChange={(e) => setSystolic(e.target.value)}
                      placeholder="130"
                      className="w-full text-sm p-2.5 bg-white border border-slate-300 rounded-xl text-center font-bold font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">الانبساطي (Diastolic)</label>
                    <input
                      type="number"
                      value={diastolic}
                      onChange={(e) => setDiastolic(e.target.value)}
                      placeholder="80"
                      className="w-full text-sm p-2.5 bg-white border border-slate-300 rounded-xl text-center font-bold font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">النبض (HR bpm)</label>
                    <input
                      type="number"
                      value={heartRate}
                      onChange={(e) => setHeartRate(e.target.value)}
                      placeholder="72"
                      className="w-full text-sm p-2.5 bg-white border border-slate-300 rounded-xl text-center font-bold font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Baseline Labs Box */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                  <div className="flex items-center gap-2">
                    <FileText size={16} className="text-teal-600" />
                    <span>التحاليل المبدئية المسجلة:</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-normal">يمكن للمعمل تحديثها لاحقاً</span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">الدهون LDL</label>
                    <input
                      type="text"
                      value={ldl}
                      onChange={(e) => setLdl(e.target.value)}
                      className="w-full text-xs p-2 bg-white border border-slate-300 rounded-xl text-center font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">وظائف كلى Creatinine</label>
                    <input
                      type="text"
                      value={creatinine}
                      onChange={(e) => setCreatinine(e.target.value)}
                      className="w-full text-xs p-2 bg-white border border-slate-300 rounded-xl text-center font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">السكر التراكمي HbA1c</label>
                    <input
                      type="text"
                      value={hba1c}
                      onChange={(e) => setHba1c(e.target.value)}
                      className="w-full text-xs p-2 bg-white border border-slate-300 rounded-xl text-center font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Prescribed Medications Box */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                    <Pill size={16} className="text-emerald-600" />
                    <span>الأدوية المبدئية المصروفة للمريض:</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => addMedication()}
                    className="text-xs text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1"
                  >
                    <Plus size={14} />
                    <span>إضافة دواء يدوي</span>
                  </button>
                </div>

                {/* Presets Quick Buttons */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <span className="text-[10px] text-slate-500 self-center">أدوية سريعة:</span>
                  {COMMON_DRUGS_PRESETS.slice(0, 4).map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => addMedication(preset)}
                      className="text-[11px] bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 px-2 py-1 rounded-lg transition-colors"
                    >
                      + {preset.name}
                    </button>
                  ))}
                </div>

                {/* Meds List */}
                <div className="space-y-2 pt-2">
                  {medications.map((med, index) => (
                    <div key={index} className="flex items-center gap-2 bg-white p-2.5 rounded-xl border border-slate-200">
                      <input
                        type="text"
                        value={med.name}
                        onChange={(e) => {
                          const updated = [...medications];
                          updated[index].name = e.target.value;
                          setMedications(updated);
                        }}
                        placeholder="اسم الدواء (مثل: Concor)"
                        className="flex-1 text-xs p-1.5 border border-slate-200 rounded-lg"
                      />
                      <input
                        type="text"
                        value={med.dosage}
                        onChange={(e) => {
                          const updated = [...medications];
                          updated[index].dosage = e.target.value;
                          setMedications(updated);
                        }}
                        placeholder="الجرعة (5 mg)"
                        className="w-24 text-xs p-1.5 border border-slate-200 rounded-lg text-center"
                      />
                      <input
                        type="text"
                        value={med.instructions}
                        onChange={(e) => {
                          const updated = [...medications];
                          updated[index].instructions = e.target.value;
                          setMedications(updated);
                        }}
                        placeholder="التعليمات (صباحاً بعد الإفطار)"
                        className="w-48 text-xs p-1.5 border border-slate-200 rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => removeMedication(index)}
                        className="text-red-500 hover:text-red-700 p-1"
                        title="حذف"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 flex items-center justify-between border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setActiveStep('clinical')}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all"
                >
                  &rarr; السابق
                </button>

                <button
                  type="button"
                  onClick={handleSavePatient}
                  disabled={saving}
                  className="px-6 py-3 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-600 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg transition-all active:scale-98 flex items-center gap-2 disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>جاري حفظ الملف وتوليد كارت المريض...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} />
                      <span>حفظ الملف الطبي وإصدار كارت المتابعة</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: Success & QR Access Card Generated */}
          {activeStep === 'success' && (
            <div className="space-y-6 text-center py-4">
              <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
                <ShieldCheck size={36} />
              </div>

              <div>
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full uppercase">
                  تم فتح السجل الطبي بنجاح
                </span>
                <h3 className="text-xl font-black text-slate-900 mt-2">
                  تم تسجيل المريض: {name}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  رقم الملف: <strong className="text-blue-700 font-mono text-sm">#{createdPatientId}</strong> • تم حفظ القياسات والروشتة في قاعدة البيانات
                </p>
              </div>

              {/* Physical/Digital Patient Card Preview */}
              <div className="bg-slate-900 text-white p-5 rounded-3xl border border-slate-800 shadow-xl max-w-md mx-auto text-right relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-500 via-emerald-400 to-indigo-500" />
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div>
                    <span className="text-[10px] text-blue-300 block font-mono">CARDIOS CLINICAL NETWORK</span>
                    <h4 className="text-sm font-bold text-white">كارت متابعة صحة القلب</h4>
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center text-emerald-400 border border-slate-700">
                    <QrCode size={20} />
                  </div>
                </div>

                <div className="py-3 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">اسم المريض:</span>
                    <strong className="text-white">{name}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">رقم الملف:</span>
                    <span className="font-mono text-emerald-400 font-bold">#{createdPatientId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">رمز الأمان (Token):</span>
                    <span className="font-mono text-blue-300 font-bold bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                      {createdSecurityToken}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800 text-center">
                  <p className="text-[10px] text-slate-400">
                    يمسح المريض الرمز بهاتفه لفتح ملفه ومتابعة ضغطه وروشتاته فوراً دون الحاجة لإنشاء حساب.
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  <Printer size={15} />
                  <span>طباعة كارت المريض</span>
                </button>

                {phone && (
                  <a
                    href={`https://wa.me/20${phone.replace(/^0/, '')}?text=${encodeURIComponent(`أهلاً بك يا ${name}، تم فتح ملفك الطبي في العيادة برقم #${createdPatientId}. يمكنك متابعة ضغطك وروشتتك عبر الرابط: ${portalDirectUrl}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                  >
                    <Send size={15} />
                    <span>إرسال الرابط للواتساب</span>
                  </a>
                )}

                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                >
                  إتمام والعودة لسجل المرضى
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
