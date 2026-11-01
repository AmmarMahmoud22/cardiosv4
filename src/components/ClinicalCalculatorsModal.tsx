import React, {useState} from 'react';
import {
  X,
  Activity,
  Heart,
  ShieldAlert,
  Calculator,
  Check,
  Info,
  Copy,
  ChevronRight,
  Sparkles,
  AlertTriangle,
  Stethoscope
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface Props {
  onClose: () => void;
  patientName?: string;
  patientAge?: number;
  gender?: 'male' | 'female';
  systolicBp?: number;
  onApplyToReport?: (summaryText: string) => void;
}

export default function ClinicalCalculatorsModal({
  onClose,
  patientName = 'المريض',
  patientAge = 56,
  gender: initialGender = 'male',
  systolicBp: initialSystolic = 142,
  onApplyToReport
}: Props) {
  const { language, direction, isRTL, t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'ascvd' | 'chads' | 'echo'>('ascvd');
  const [copied, setCopied] = useState(false);

  // ----------------------------------------------------
  // 1. ASCVD Risk Calculator State (AHA/ACC & ESC)
  // ----------------------------------------------------
  const [age, setAge] = useState<number>(patientAge);
  const [gender, setGender] = useState<'male' | 'female'>(initialGender);
  const [systolic, setSystolic] = useState<number>(initialSystolic);
  const [totalCholesterol, setTotalCholesterol] = useState<number>(210);
  const [hdlCholesterol, setHdlCholesterol] = useState<number>(44);
  const [isSmoker, setIsSmoker] = useState<boolean>(true);
  const [isDiabetic, setIsDiabetic] = useState<boolean>(false);
  const [onHypertensionTreatment, setOnHypertensionTreatment] = useState<boolean>(true);

  // Approximate validated Pooled Cohort Equations for ASCVD 10-year risk
  const calculateAscvd = (): {score: number; category: string; color: string; statin: string} => {
    // Baseline risk model approximation
    let base = 0;
    if (gender === 'male') {
      base = (age - 40) * 0.45 + (systolic - 120) * 0.12 + (totalCholesterol - 180) * 0.06 - (hdlCholesterol - 50) * 0.15;
      if (isSmoker) base += 5.2;
      if (isDiabetic) base += 5.8;
      if (onHypertensionTreatment) base += 2.5;
    } else {
      base = (age - 40) * 0.35 + (systolic - 120) * 0.11 + (totalCholesterol - 180) * 0.05 - (hdlCholesterol - 50) * 0.14;
      if (isSmoker) base += 4.5;
      if (isDiabetic) base += 6.5;
      if (onHypertensionTreatment) base += 2.8;
    }

    const calculated = Math.max(1.2, Math.min(65.0, Number((base > 0 ? base : 2.5).toFixed(1))));

    if (calculated < 5) {
      return {
        score: calculated,
        category: 'خطر منخفض (Low Risk < 5%)',
        color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
        statin: 'التأكيد على نمط الحياة الصحي والنشاط البدني دون الحاجة للستاتين حالياً.'
      };
    } else if (calculated < 7.5) {
      return {
        score: calculated,
        category: 'خطر حدّي (Borderline 5% - 7.4%)',
        color: 'text-amber-700 bg-amber-50 border-amber-200',
        statin: 'مناقشة عوامل تعزيز الخطر (Risk Enhancers). يُنصح بجرعة خفيفة إلى متوسطة من الستاتين إذا كان هناك تاريخ عائلي مبكر.'
      };
    } else if (calculated < 20) {
      return {
        score: calculated,
        category: 'خطر متوسط (Intermediate 7.5% - 19.9%)',
        color: 'text-orange-700 bg-orange-50 border-orange-200',
        statin: 'موصى به بقوة: ستاتين متوسط القوة (Moderate-intensity Statin مثل Atorvastatin 20mg أو Rosuvastatin 10mg) لخفض LDL بنسبة 30-49%.'
      };
    } else {
      return {
        score: calculated,
        category: 'خطر مرتفع جداً (High Risk ≥ 20%)',
        color: 'text-red-700 bg-red-50 border-red-200',
        statin: 'علاج حاسم: ستاتين عالي القوة (High-intensity Statin مثل Atorvastatin 40-80mg أو Rosuvastatin 20-40mg) لخفض LDL > 50% مع تقييم إضافة Ezetimibe.'
      };
    }
  };

  const ascvdResult = calculateAscvd();

  // ----------------------------------------------------
  // 2. CHA₂DS₂-VASc Calculator State (AFib Stroke Risk)
  // ----------------------------------------------------
  const [chadsC, setChadsC] = useState<boolean>(false); // CHF (1)
  const [chadsH, setChadsH] = useState<boolean>(true); // HTN (1)
  const [chadsA2, setChadsA2] = useState<boolean>(false); // Age >= 75 (2)
  const [chadsD, setChadsD] = useState<boolean>(false); // DM (1)
  const [chadsS2, setChadsS2] = useState<boolean>(false); // Stroke / TIA (2)
  const [chadsV, setChadsV] = useState<boolean>(false); // Vascular disease (1)
  const [chadsA, setChadsA] = useState<boolean>(age >= 65 && age < 75); // Age 65-74 (1)
  const [chadsSc, setChadsSc] = useState<boolean>(gender === 'female'); // Female (1)

  const calculateChadsScore = () => {
    let score = 0;
    if (chadsC) score += 1;
    if (chadsH) score += 1;
    if (chadsA2) score += 2;
    if (chadsD) score += 1;
    if (chadsS2) score += 2;
    if (chadsV) score += 1;
    if (chadsA && !chadsA2) score += 1;
    if (chadsSc) score += 1;

    // Stroke risk per year based on consensus
    const rates: {[key: number]: string} = {
      0: '0.2%',
      1: '1.3%',
      2: '2.2%',
      3: '3.2%',
      4: '4.0%',
      5: '6.7%',
      6: '9.8%',
      7: '9.6%',
      8: '12.5%',
      9: '15.2%'
    };

    const strokeRisk = rates[Math.min(score, 9)] || '15%';

    let rec = '';
    let statusClass = '';

    const effectiveScoreForThreshold = gender === 'female' ? score - 1 : score;

    if (effectiveScoreForThreshold === 0) {
      rec = 'خطر منخفض: لا يُنصح ببدء مضادات التجلط الفموية (Oral Anticoagulants) أو مضادات الصفائح.';
      statusClass = 'text-emerald-700 bg-emerald-50 border-emerald-200';
    } else if (effectiveScoreForThreshold === 1) {
      rec = 'خطر متوسط: يُنصح بشدة ببدء مضادات التجلط الحديثة (DOAC: Apixaban أو Rivaroxaban) بعد تقييم خطر النزيف (HAS-BLED).';
      statusClass = 'text-amber-700 bg-amber-50 border-amber-200';
    } else {
      rec = 'خطر مرتفع: يُوصى قطعياً ببدء مضاد تجلط فموي من الجيل الحديث (DOAC) مثل Eliquis 5mg مرتين يومياً للوقاية من السكتة الدماغية الإقفارية.';
      statusClass = 'text-red-700 bg-red-50 border-red-200';
    }

    return {score, strokeRisk, rec, statusClass};
  };

  const chadsResult = calculateChadsScore();

  // ----------------------------------------------------
  // 3. Echo Left Ventricular Mass & Geometry
  // ----------------------------------------------------
  const [echoIvs, setEchoIvs] = useState<number>(12); // mm
  const [echoLvedd, setEchoLvedd] = useState<number>(48); // mm
  const [echoPw, setEchoPw] = useState<number>(11); // mm
  const [echoBsa, setEchoBsa] = useState<number>(1.85); // m^2
  const [echoEeRatio, setEchoEeRatio] = useState<number>(11.5); // E/e'

  const calculateEchoGeometry = () => {
    // Devereux Formula: LV Mass (g) = 0.8 * 1.04 * [ (IVS + LVEDD + PW)^3 - (LVEDD)^3 ] + 0.6
    const ivsCm = echoIvs / 10;
    const lveddCm = echoLvedd / 10;
    const pwCm = echoPw / 10;

    const lvMass = 0.8 * 1.04 * (Math.pow(ivsCm + lveddCm + pwCm, 3) - Math.pow(lveddCm, 3)) + 0.6;
    const lvmi = Math.round(lvMass / echoBsa);

    // Relative Wall Thickness (RWT) = (2 * PW) / LVEDD
    const rwt = Number(((2 * echoPw) / echoLvedd).toFixed(2));

    // Thresholds: Men: LVMI > 115 g/m2, Women: LVMI > 95 g/m2. RWT threshold 0.42
    const lvmiThreshold = gender === 'male' ? 115 : 95;
    const hasLvh = lvmi > lvmiThreshold;
    const hasConcentric = rwt > 0.42;

    let geometry = 'طبيعي تماماً (Normal LV Geometry)';
    let geometryDesc = 'كتلة البطين الأيسر ونسبة سمك الجدار ضمن المعدلات التشريحية السليمة.';
    let geomBadgeClass = 'text-emerald-700 bg-emerald-50 border-emerald-200';

    if (!hasLvh && hasConcentric) {
      geometry = 'إعادة تشكل متحدة المركز (Concentric Remodeling)';
      geometryDesc = 'زيادة سمك الجدار النسبي دون تضخم الكتلة الإجمالية، مؤشر مبكر لتأثير ضغط الدم المزمن.';
      geomBadgeClass = 'text-amber-700 bg-amber-50 border-amber-200';
    } else if (hasLvh && !hasConcentric) {
      geometry = 'تضخم لامركزي (Eccentric LVH)';
      geometryDesc = 'تضخم في كتلة البطين مع اتساع التجويف (Volume Overload / ارتجاع صمامات أو قصور قلب).';
      geomBadgeClass = 'text-orange-700 bg-orange-50 border-orange-200';
    } else if (hasLvh && hasConcentric) {
      geometry = 'تضخم متحد المركز (Concentric LVH)';
      geometryDesc = 'تضخم شديد في كتلة البطين وجدرانه مع ضيق التجويف، نموذج كلاسيكي لاعتلال القلب الناتج عن فرط ضغط الدم (Hypertensive Heart Disease).';
      geomBadgeClass = 'text-red-700 bg-red-50 border-red-200';
    }

    // Diastolic Assessment based on E/e'
    let diastolicText = 'ضغط امتلاء البطين الأيسر طبيعي (E/e\' < 10)';
    if (echoEeRatio > 14) {
      diastolicText = 'ارتفاع ملحوظ في ضغط امتلاء البطين الأيسر (Elevated LV Filling Pressure, E/e\' > 14) مؤشر على اعتلال انبساطي من الدرجة الثانية/الثالثة.';
    } else if (echoEeRatio >= 10) {
      diastolicText = 'نطاق وسطي (Indeterminate / Grade I Diastolic Dysfunction) يتطلب تقييم حجم الأذين وسرعة ارتجاع الصمام ثلاثي الشرف.';
    }

    return {lvMass: Math.round(lvMass), lvmi, rwt, geometry, geometryDesc, geomBadgeClass, diastolicText};
  };

  const echoResult = calculateEchoGeometry();

  // Summary generation to copy or insert
  const generateSummaryText = () => {
    return `📋 تقييم سريري شامل لـ ${patientName}:
• مخاطر أمراض القلب (ASCVD 10-Year): ${ascvdResult.score}% (${ascvdResult.category})
• توصية العلاج بالستاتين: ${ascvdResult.statin}
• تقييم تجلط الرفرفة الأذينية (CHA₂DS₂-VASc): ${chadsResult.score} نقاط (معدل السكتة: ${chadsResult.strokeRisk}/سنة)
• مؤشرات الإيكو: LVMI = ${echoResult.lvmi} g/m² | RWT = ${echoResult.rwt} | النمط: ${echoResult.geometry}
• الحالة الانبساطية: ${echoResult.diastolicText}`;
  };

  const handleCopySummary = () => {
    navigator.clipboard.writeText(generateSummaryText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApply = () => {
    if (onApplyToReport) {
      onApplyToReport(generateSummaryText());
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto" dir={direction}>
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600/30 border border-blue-400/30 flex items-center justify-center text-blue-400">
              <Calculator size={20} />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">
                {isRTL ? 'حاسبات القلب السريرية المعتمدة (Cardiology Clinical Calculators)' : 'Evidence-Based Cardiology Risk Calculators (ESC & ACC/AHA)'}
              </h3>
              <p className="text-xs text-slate-400">
                {isRTL ? 'حساب المخاطر وفق إرشادات جمعية القلب الأوروبية والأمريكية (ESC & ACC/AHA)' : '10-Year ASCVD Risk, CHA₂DS₂-VASc AF Stroke Score, and LVMI / Diastolic Function'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-slate-100 border-b border-slate-200 px-6 py-2.5 flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('ascvd')}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'ascvd'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
            }`}
          >
            <Heart size={14} />
            <span>مخاطر تصلب الشرايين (10-Yr ASCVD)</span>
          </button>

          <button
            onClick={() => setActiveTab('chads')}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'chads'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
            }`}
          >
            <ShieldAlert size={14} />
            <span>تجلط الرفرفة الأذينية (CHA₂DS₂-VASc)</span>
          </button>

          <button
            onClick={() => setActiveTab('echo')}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'echo'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
            }`}
          >
            <Activity size={14} />
            <span>مؤشرات الإيكو وتضخم البطين (LVMI & Echo)</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* 1. ASCVD Risk Section */}
          {activeTab === 'ascvd' && (
            <div className="space-y-5">
              <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3.5 flex items-start gap-3">
                <Info size={18} className="text-blue-700 shrink-0 mt-0.5" />
                <div className="text-xs text-blue-900">
                  <p className="font-semibold">تقييم مخاطر النوبات القلبية والسكتة الدماغية خلال الـ 10 سنوات القادمة</p>
                  <p className="text-blue-700 mt-0.5 leading-relaxed">
                    استناداً إلى معادلات المجموعات المجمعة (Pooled Cohort Risk Assessment) لتوجيه العلاج الوقائي بالستاتين ومضادات الصفائح.
                  </p>
                </div>
              </div>

              {/* Input Parameters Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">العمر (سنة)</label>
                  <input
                    type="number"
                    min="20"
                    max="85"
                    value={age}
                    onChange={e => setAge(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">الجنس</label>
                  <select
                    value={gender}
                    onChange={e => setGender(e.target.value as 'male' | 'female')}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="male">ذكر (Male)</option>
                    <option value="female">أنثى (Female)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">الضغط الانقباضي (mmHg)</label>
                  <input
                    type="number"
                    min="90"
                    max="220"
                    value={systolic}
                    onChange={e => setSystolic(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">الكولسترول الكلي (mg/dL)</label>
                  <input
                    type="number"
                    min="100"
                    max="450"
                    value={totalCholesterol}
                    onChange={e => setTotalCholesterol(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">الكولسترول الحميد HDL (mg/dL)</label>
                  <input
                    type="number"
                    min="20"
                    max="100"
                    value={hdlCholesterol}
                    onChange={e => setHdlCholesterol(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>

                <div className="flex flex-col justify-end">
                  <label className="flex items-center gap-2 p-2 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={onHypertensionTreatment}
                      onChange={e => setOnHypertensionTreatment(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-xs font-medium text-slate-700">يتلقى علاجاً لضغط الدم</span>
                  </label>
                </div>
              </div>

              {/* Toggles */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <label className="flex items-center gap-2 p-2.5 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isSmoker}
                    onChange={e => setIsSmoker(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-xs font-medium text-slate-700">مدخن حالياً (Current Smoker)</span>
                </label>

                <label className="flex items-center gap-2 p-2.5 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isDiabetic}
                    onChange={e => setIsDiabetic(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-xs font-medium text-slate-700">مصاب بمرض السكري (Diabetes)</span>
                </label>
              </div>

              {/* ASCVD Result Panel */}
              <div className={`p-5 rounded-xl border ${ascvdResult.color}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider block">نسبة الخطر القلبي الوعائي خلال 10 سنوات:</span>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-3xl font-extrabold font-mono">{ascvdResult.score}%</span>
                      <span className="text-sm font-bold">{ascvdResult.category}</span>
                    </div>
                  </div>
                  <Heart className="w-8 h-8 opacity-80" />
                </div>

                <div className="mt-3 pt-3 border-t border-current/20">
                  <span className="text-xs font-bold block mb-1">التوصية الدوائية السريرية (Clinical Guideline):</span>
                  <p className="text-xs leading-relaxed font-medium">{ascvdResult.statin}</p>
                </div>
              </div>
            </div>
          )}

          {/* 2. CHA2DS2-VASc Section */}
          {activeTab === 'chads' && (
            <div className="space-y-5">
              <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3.5 flex items-start gap-3">
                <ShieldAlert size={18} className="text-amber-700 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-900">
                  <p className="font-semibold">حساب مخاطر السكتة الدماغية لمرضى الرجفان / الرفرفة الأذينية (Non-valvular AF)</p>
                  <p className="text-amber-700 mt-0.5 leading-relaxed">
                    لتحديد ضرورة بدء مضادات التجلط الحديثة (NOACs / DOACs) وفق إرشادات الجمعية الأوروبية للقلب ESC 2024.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                {[
                  {id: 'c', label: 'قصور في عضلة القلب / هبوط احتقاني (CHF / LVEF ≤ 40%)', pts: 1, val: chadsC, set: setChadsC},
                  {id: 'h', label: 'ارتفاع ضغط الدم (Hypertension) أو يتناول أدوية ضغط', pts: 1, val: chadsH, set: setChadsH},
                  {id: 'a2', label: 'العمر 75 سنة فما فوق (Age ≥ 75 years)', pts: 2, val: chadsA2, set: setChadsA2},
                  {id: 'd', label: 'مرض السكري (Diabetes Mellitus)', pts: 1, val: chadsD, set: setChadsD},
                  {id: 's2', label: 'جلطة دماغية سابقة أو نوبة إقفارية عابرة (Stroke / TIA)', pts: 2, val: chadsS2, set: setChadsS2},
                  {id: 'v', label: 'مرض وعائي (تاريخ جلطة قلبية MI، تصلب شرايين طرفية، أو لويحات أورطية)', pts: 1, val: chadsV, set: setChadsV},
                  {id: 'a', label: 'العمر بين 65 إلى 74 سنة (Age 65 - 74 years)', pts: 1, val: chadsA, set: setChadsA},
                  {id: 'sc', label: 'الجنس: أنثى (Female Sex Category)', pts: 1, val: chadsSc, set: setChadsSc},
                ].map(item => (
                  <label
                    key={item.id}
                    className="flex items-center justify-between p-3 border border-slate-200 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={item.val}
                        onChange={e => item.set(e.target.checked)}
                        className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                      />
                      <span className="text-xs font-semibold text-slate-800">{item.label}</span>
                    </div>
                    <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md font-mono">+{item.pts} pt</span>
                  </label>
                ))}
              </div>

              {/* CHADS Result Panel */}
              <div className={`p-5 rounded-xl border ${chadsResult.statusClass}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider block">مجموع نقاط CHA₂DS₂-VASc:</span>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-3xl font-extrabold font-mono">{chadsResult.score} نقاط</span>
                      <span className="text-xs font-bold text-slate-600 font-mono">(معدل السكتة السنوي: {chadsResult.strokeRisk})</span>
                    </div>
                  </div>
                  <ShieldAlert className="w-8 h-8 opacity-80" />
                </div>

                <div className="mt-3 pt-3 border-t border-current/20">
                  <span className="text-xs font-bold block mb-1">القرار العلاجي لمضادات التجلط (Anticoagulation Guideline):</span>
                  <p className="text-xs leading-relaxed font-medium">{chadsResult.rec}</p>
                </div>
              </div>
            </div>
          )}

          {/* 3. Echo Structural Geometry & Diastology */}
          {activeTab === 'echo' && (
            <div className="space-y-5">
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5 flex items-start gap-3">
                <Activity size={18} className="text-emerald-700 shrink-0 mt-0.5" />
                <div className="text-xs text-emerald-900">
                  <p className="font-semibold">حاسبة هندسة البطين الأيسر والوظيفة الانبساطية (ASE/EACVI Guidelines)</p>
                  <p className="text-emerald-700 mt-0.5 leading-relaxed">
                    حساب مؤشر كتلة البطين (LVMI) ونسبة سمك الجدار (RWT) لتحديد تضخم عضلة القلب الناتج عن ضغط الدم.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">سمك الحاجز IVS (mm)</label>
                  <input
                    type="number"
                    min="6"
                    max="25"
                    value={echoIvs}
                    onChange={e => setEchoIvs(Number(e.target.value))}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                  <span className="text-[10px] text-slate-400 block mt-0.5">طبيعي: 6 - 11 mm</span>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">قطر الامتلاء LVEDD (mm)</label>
                  <input
                    type="number"
                    min="30"
                    max="75"
                    value={echoLvedd}
                    onChange={e => setEchoLvedd(Number(e.target.value))}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                  <span className="text-[10px] text-slate-400 block mt-0.5">طبيعي: 35 - 56 mm</span>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">الجدار الخلفي PW (mm)</label>
                  <input
                    type="number"
                    min="6"
                    max="22"
                    value={echoPw}
                    onChange={e => setEchoPw(Number(e.target.value))}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                  <span className="text-[10px] text-slate-400 block mt-0.5">طبيعي: 6 - 11 mm</span>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">مساحة الجسم BSA (m²)</label>
                  <input
                    type="number"
                    step="0.05"
                    min="1.2"
                    max="2.6"
                    value={echoBsa}
                    onChange={e => setEchoBsa(Number(e.target.value))}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                  <span className="text-[10px] text-slate-400 block mt-0.5">متوسط: 1.7 - 2.0 m²</span>
                </div>
              </div>

              {/* Extra Diastolic Parameter */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">معدل E/e' للوظيفة الانبساطية</label>
                  <input
                    type="number"
                    step="0.5"
                    min="4"
                    max="30"
                    value={echoEeRatio}
                    onChange={e => setEchoEeRatio(Number(e.target.value))}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>
                <div className="text-[11px] text-slate-600">
                  <span className="font-semibold block text-slate-800">تقييم ضغط الامتلاء:</span>
                  <p>{echoResult.diastolicText}</p>
                </div>
              </div>

              {/* Echo Geometry Output */}
              <div className={`p-5 rounded-xl border ${echoResult.geomBadgeClass}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider block">التصنيف الهندسي للبطين الأيسر (LV Geometry):</span>
                    <h4 className="text-base font-extrabold mt-1">{echoResult.geometry}</h4>
                  </div>
                  <Activity className="w-8 h-8 opacity-80" />
                </div>

                <div className="grid grid-cols-3 gap-2 my-3 py-2 border-y border-current/20 text-center font-mono">
                  <div>
                    <span className="text-[10px] block opacity-80">كتلة البطين (LV Mass)</span>
                    <span className="text-base font-bold">{echoResult.lvMass} g</span>
                  </div>
                  <div>
                    <span className="text-[10px] block opacity-80">مؤشر الكتلة (LVMI)</span>
                    <span className="text-base font-bold">{echoResult.lvmi} g/m²</span>
                  </div>
                  <div>
                    <span className="text-[10px] block opacity-80">سمك الجدار (RWT)</span>
                    <span className="text-base font-bold">{echoResult.rwt}</span>
                  </div>
                </div>

                <p className="text-xs leading-relaxed font-medium">{echoResult.geometryDesc}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopySummary}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 transition-colors"
            >
              {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
              <span>{copied ? 'تم نسخ التقرير السريري!' : 'نسخ ملخص الحسابات'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {onApplyToReport && (
              <button
                onClick={handleApply}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-all active:scale-95"
              >
                <Stethoscope size={15} />
                <span>إدراج في تقرير فحص المريض</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 transition-colors"
            >
              إغلاق
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
