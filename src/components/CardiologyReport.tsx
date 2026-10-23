import React, {useState, useEffect} from 'react';
import {FileText, Printer, Share2, Sparkles, Check, CheckCircle2, AlertTriangle, HeartPulse, RefreshCw} from 'lucide-react';
import {addDoc, collection} from 'firebase/firestore';
import {db} from '../lib/firebase';

interface Props {
  patientName: string;
  patientId?: string;
}

interface EchoData {
  indication: string;
  ef: number; // Ejection Fraction %
  lvedd: number; // mm
  lvesd: number; // mm
  ivs: number; // Interventricular septum mm
  pw: number; // Posterior wall mm
  laDiameter: number; // Left atrium mm
  tapse: number; // mm (RV function)
  pasp: number; // Pulmonary artery systolic pressure mmHg
  mitralValve: string;
  aorticValve: string;
  tricuspidValve: string;
  pericardium: string;
  wallMotion: string;
  ecgRhythm: string;
  ecgConduction: string;
  ecgIschemia: string;
  conclusion: string;
  recommendations: string;
}

const DEFAULT_NORMAL: EchoData = {
  indication: 'Hypertension evaluation & routine cardiac checkup',
  ef: 62,
  lvedd: 46,
  lvesd: 29,
  ivs: 10,
  pw: 10,
  laDiameter: 34,
  tapse: 22,
  pasp: 24,
  mitralValve: 'Normal leaflets, no significant regurgitation or stenosis',
  aorticValve: 'Trileaflet aortic valve with normal excursion, no AR or AS',
  tricuspidValve: 'Normal tricuspid valve, trace physiological TR',
  pericardium: 'No pericardial effusion, smooth pericardium',
  wallMotion: 'Normal resting regional and global wall motion',
  ecgRhythm: 'Normal Sinus Rhythm (HR 72 bpm)',
  ecgConduction: 'Normal PR & QRS intervals (No bundle branch block)',
  ecgIschemia: 'No acute ST-T ischemic changes or pathological Q waves',
  conclusion: 'Normal resting transthoracic echocardiogram. Preserved LV systolic function (LVEF 62%). Normal valve morphology with no hemodynamically significant lesions.',
  recommendations: 'Continue lifestyle modifications and cardiovascular risk factors control. Routine follow-up after 1 year.'
};

export default function CardiologyReport({patientName, patientId}: Props) {
  const [data, setData] = useState<EchoData>(DEFAULT_NORMAL);
  const [activeTab, setActiveTab] = useState<'echo' | 'valves' | 'ecg' | 'conclusion'>('echo');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Quick preset templates
  const applyPreset = (presetName: string) => {
    if (presetName === 'normal') {
      setData(DEFAULT_NORMAL);
    } else if (presetName === 'hhd') {
      setData({
        ...DEFAULT_NORMAL,
        indication: 'Long-standing Essential Hypertension',
        ef: 58,
        ivs: 13,
        pw: 12,
        laDiameter: 41,
        pasp: 28,
        mitralValve: 'Mild Mitral Regurgitation (Grade I), impaired LV relaxation (E/A < 1)',
        conclusion: 'Concentric Left Ventricular Hypertrophy (LVH) consistent with Hypertensive Heart Disease. Grade I LV Diastolic Dysfunction with preserved EF (58%). Mild LA dilation.',
        recommendations: 'Strict blood pressure control (Target < 130/80 mmHg). Continue ARB/CCB combination. Repeat Echo in 6 months.'
      });
    } else if (presetName === 'ischemic') {
      setData({
        ...DEFAULT_NORMAL,
        indication: 'Coronary Artery Disease / Post-MI evaluation',
        ef: 38,
        lvedd: 58,
        lvesd: 44,
        wallMotion: 'Regional wall motion abnormality: Hypokinesia of anterior and apical segments',
        mitralValve: 'Moderate secondary ischemic mitral regurgitation (Grade II)',
        pasp: 38,
        ecgIschemia: 'Pathological Q-waves in V1-V4 with T-wave inversions',
        conclusion: 'Ischemic Cardiomyopathy. Dilated Left Ventricle with reduced LV systolic function (LVEF 38%, HFrEF). Antero-apical hypokinesia. Moderate ischemic mitral regurgitation.',
        recommendations: 'Optimize GDMT heart failure therapy (Beta-blocker, ARNI/ACEi, SGLT2i, MRA). Refer for Coronary Angiography evaluation.'
      });
    } else if (presetName === 'afib') {
      setData({
        ...DEFAULT_NORMAL,
        indication: 'Palpitations & Irregular pulse',
        laDiameter: 46,
        ecgRhythm: 'Atrial Fibrillation with controlled ventricular response (HR 85-110 bpm)',
        mitralValve: 'Mild-to-moderate functional Mitral Regurgitation secondary to LA dilation',
        conclusion: 'Atrial Fibrillation. Significantly dilated Left Atrium (LA 46 mm). Preserved LV systolic function (EF 55%).',
        recommendations: 'Calculate CHA2DS2-VASc score for anticoagulation (DOAC). Rate control with Beta-blocker. Rule out thyrotoxicosis and sleep apnea.'
      });
    }
  };

  const handleSaveReport = async () => {
    if (!patientId) {
      alert('Report saved locally.');
      return;
    }
    setSaving(true);
    try {
      await addDoc(collection(db, 'patients', patientId, 'cardiology_reports'), {
        ...data,
        patientName,
        createdAt: new Date().toISOString()
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e) {
      console.error(e);
      alert('Failed to save report to database.');
    } finally {
      setSaving(false);
    }
  };

  const handleWhatsAppShare = () => {
    const text = `*تقرير فحص القلب (Cardios Cardiovascular Center)*
👤 *المريض:* ${patientName}
📅 *التاريخ:* ${new Date().toLocaleDateString('ar-EG')}

🫀 *فحص الموجات الصوتية على القلب (Echocardiogram):*
• كفاءة عضلة القلب (LVEF): ${data.ef}% ${data.ef >= 55 ? '(طبيعي ✅)' : '(منخفض ⚠️)'}
• حجم البطين الأيسر (LVEDD): ${data.lvedd} mm
• سمك الجدار العضلي (IVS): ${data.ivs} mm ${data.ivs > 11 ? '(تضخم جداري)' : '(طبيعي)'}
• ضغط الشريان الرئوي (PASP): ${data.pasp} mmHg

📈 *تخطيط رسم القلب (ECG):*
• ${data.ecgRhythm}

📝 *الخلاصة الطبية:*
${data.conclusion}

💊 *التوصيات الطبية والمتابعة:*
${data.recommendations}

👨‍⚕️ *د. القلب والأوعية الدموية - منصة Cardios*`;

    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mt-6">
      {/* Editor & Control Header (Hidden when printing) */}
      <div className="p-5 border-b border-gray-200 bg-gradient-to-r from-blue-50/60 to-indigo-50/40 no-print">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <HeartPulse size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                Cardiology Report Engine
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">Echo & ECG</span>
              </h2>
              <p className="text-xs text-gray-500">Official Clinical Report for {patientName}</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleSaveReport}
              disabled={saving}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 shadow-2xs transition-all disabled:opacity-60"
            >
              {saveSuccess ? <Check className="text-emerald-600" size={15} /> : <FileText size={15} className="text-blue-600" />}
              <span>{saveSuccess ? 'Saved!' : saving ? 'Saving...' : 'Save to EHR'}</span>
            </button>

            <button
              onClick={handleWhatsAppShare}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all active:scale-95"
            >
              <Share2 size={15} />
              <span>Share via WhatsApp</span>
            </button>

            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-all active:scale-95"
            >
              <Printer size={15} />
              <span>Print Official Report</span>
            </button>
          </div>
        </div>

        {/* Quick Presets Bar */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2">
          <span className="text-xs text-gray-500 font-medium mr-1 flex items-center gap-1">
            <Sparkles size={13} className="text-amber-500" /> Presets:
          </span>
          <button
            onClick={() => applyPreset('normal')}
            className="px-2.5 py-1 text-xs font-medium rounded-lg bg-white border border-gray-200 hover:border-emerald-300 hover:bg-emerald-50 text-gray-700 transition-colors"
          >
            Normal Study
          </button>
          <button
            onClick={() => applyPreset('hhd')}
            className="px-2.5 py-1 text-xs font-medium rounded-lg bg-white border border-gray-200 hover:border-orange-300 hover:bg-orange-50 text-gray-700 transition-colors"
          >
            Hypertensive Heart (LVH)
          </button>
          <button
            onClick={() => applyPreset('ischemic')}
            className="px-2.5 py-1 text-xs font-medium rounded-lg bg-white border border-gray-200 hover:border-red-300 hover:bg-red-50 text-gray-700 transition-colors"
          >
            Ischemic / Reduced EF (38%)
          </button>
          <button
            onClick={() => applyPreset('afib')}
            className="px-2.5 py-1 text-xs font-medium rounded-lg bg-white border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 text-gray-700 transition-colors"
          >
            Atrial Fibrillation
          </button>
        </div>
      </div>

      {/* Tabs Selector for Editing (Hidden when printing) */}
      <div className="flex border-b border-gray-200 bg-gray-50 px-5 gap-4 no-print text-xs font-medium text-gray-600">
        <button
          onClick={() => setActiveTab('echo')}
          className={`py-3 border-b-2 font-semibold transition-colors ${
            activeTab === 'echo' ? 'border-blue-600 text-blue-600' : 'border-transparent hover:text-gray-900'
          }`}
        >
          1. Echo Chamber Dimensions & EF%
        </button>
        <button
          onClick={() => setActiveTab('valves')}
          className={`py-3 border-b-2 font-semibold transition-colors ${
            activeTab === 'valves' ? 'border-blue-600 text-blue-600' : 'border-transparent hover:text-gray-900'
          }`}
        >
          2. Valve & Doppler Assessment
        </button>
        <button
          onClick={() => setActiveTab('ecg')}
          className={`py-3 border-b-2 font-semibold transition-colors ${
            activeTab === 'ecg' ? 'border-blue-600 text-blue-600' : 'border-transparent hover:text-gray-900'
          }`}
        >
          3. ECG & Rhythm Analysis
        </button>
        <button
          onClick={() => setActiveTab('conclusion')}
          className={`py-3 border-b-2 font-semibold transition-colors ${
            activeTab === 'conclusion' ? 'border-blue-600 text-blue-600' : 'border-transparent hover:text-gray-900'
          }`}
        >
          4. Clinical Conclusion & Plan
        </button>
      </div>

      {/* Interactive Form Controls (Hidden when printing) */}
      <div className="p-5 border-b border-gray-200 bg-white no-print">
        {activeTab === 'echo' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Ejection Fraction (LVEF %)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={data.ef}
                    onChange={(e) => setData({...data, ef: Number(e.target.value)})}
                    className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <span className={`text-xs px-2 py-1 rounded-md font-bold whitespace-nowrap ${
                    data.ef >= 55 ? 'bg-emerald-100 text-emerald-800' :
                    data.ef >= 45 ? 'bg-amber-100 text-amber-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {data.ef >= 55 ? 'Normal' : data.ef >= 45 ? 'Mild Dysfunction' : 'Reduced (HFrEF)'}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  LVEDD (Normal: 35-53 mm)
                </label>
                <input
                  type="number"
                  value={data.lvedd}
                  onChange={(e) => setData({...data, lvedd: Number(e.target.value)})}
                  className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  LVESD (Normal: 22-38 mm)
                </label>
                <input
                  type="number"
                  value={data.lvesd}
                  onChange={(e) => setData({...data, lvesd: Number(e.target.value)})}
                  className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Septum - IVS (Normal: 6-11 mm)
                </label>
                <input
                  type="number"
                  value={data.ivs}
                  onChange={(e) => setData({...data, ivs: Number(e.target.value)})}
                  className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Posterior Wall - PW (6-11 mm)
                </label>
                <input
                  type="number"
                  value={data.pw}
                  onChange={(e) => setData({...data, pw: Number(e.target.value)})}
                  className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  LA Diameter (Normal: &lt; 40 mm)
                </label>
                <input
                  type="number"
                  value={data.laDiameter}
                  onChange={(e) => setData({...data, laDiameter: Number(e.target.value)})}
                  className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  TAPSE RV (&ge; 17 mm)
                </label>
                <input
                  type="number"
                  value={data.tapse}
                  onChange={(e) => setData({...data, tapse: Number(e.target.value)})}
                  className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  PASP (Normal: &le; 35 mmHg)
                </label>
                <input
                  type="number"
                  value={data.pasp}
                  onChange={(e) => setData({...data, pasp: Number(e.target.value)})}
                  className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Regional Wall Motion</label>
              <input
                type="text"
                value={data.wallMotion}
                onChange={(e) => setData({...data, wallMotion: e.target.value})}
                className="w-full p-2 text-sm border border-gray-300 rounded-lg"
              />
            </div>
          </div>
        )}

        {activeTab === 'valves' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Mitral Valve & Diastolic Flow</label>
                <textarea
                  value={data.mitralValve}
                  onChange={(e) => setData({...data, mitralValve: e.target.value})}
                  rows={2}
                  className="w-full p-2 text-sm border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Aortic Valve & Aortic Root</label>
                <textarea
                  value={data.aorticValve}
                  onChange={(e) => setData({...data, aorticValve: e.target.value})}
                  rows={2}
                  className="w-full p-2 text-sm border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Tricuspid & Pulmonary Valves</label>
                <textarea
                  value={data.tricuspidValve}
                  onChange={(e) => setData({...data, tricuspidValve: e.target.value})}
                  rows={2}
                  className="w-full p-2 text-sm border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Pericardium & Effusion</label>
                <textarea
                  value={data.pericardium}
                  onChange={(e) => setData({...data, pericardium: e.target.value})}
                  rows={2}
                  className="w-full p-2 text-sm border border-gray-300 rounded-lg"
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'ecg' && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Heart Rhythm & Rate</label>
                <input
                  type="text"
                  value={data.ecgRhythm}
                  onChange={(e) => setData({...data, ecgRhythm: e.target.value})}
                  className="w-full p-2 text-sm border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Conduction & QRS Axis</label>
                <input
                  type="text"
                  value={data.ecgConduction}
                  onChange={(e) => setData({...data, ecgConduction: e.target.value})}
                  className="w-full p-2 text-sm border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">ST-T Changes & Ischemia</label>
                <input
                  type="text"
                  value={data.ecgIschemia}
                  onChange={(e) => setData({...data, ecgIschemia: e.target.value})}
                  className="w-full p-2 text-sm border border-gray-300 rounded-lg"
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'conclusion' && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Echocardiogram Impression & Conclusion
              </label>
              <textarea
                value={data.conclusion}
                onChange={(e) => setData({...data, conclusion: e.target.value})}
                rows={3}
                className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Clinical Recommendations & Follow-up Plan
              </label>
              <textarea
                value={data.recommendations}
                onChange={(e) => setData({...data, recommendations: e.target.value})}
                rows={2}
                className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* Official Formatted Clinical Report (Displayed cleanly on screen & isolated during @media print) */}
      <div id="report-printable" className="printable p-8 bg-white text-gray-900">
        {/* Print Header */}
        <div className="border-b-2 border-blue-900 pb-4 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-blue-900">CARDIOS CARDIOVASCULAR CENTER</h1>
              <p className="text-xs font-bold text-gray-700 uppercase tracking-widest mt-0.5">
                Specialized Cardiology, Echocardiography & Vascular Clinic
              </p>
              <p className="text-xs text-gray-500">Cairo, Egypt • Comprehensive Cardiovascular Diagnostic Services</p>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-blue-900 uppercase px-2.5 py-1 bg-blue-50 border border-blue-200 rounded">
                Official Diagnostic Report
              </span>
              <p className="text-xs text-gray-500 mt-2 font-mono">Date: {new Date().toLocaleDateString('en-GB')}</p>
            </div>
          </div>
        </div>

        {/* Patient Demographics */}
        <div className="grid grid-cols-3 gap-4 p-3 bg-gray-50 rounded-lg border border-gray-200 text-xs mb-6">
          <div>
            <span className="text-gray-500 font-medium">Patient Name:</span>
            <p className="font-bold text-gray-900 text-sm mt-0.5">{patientName}</p>
          </div>
          <div>
            <span className="text-gray-500 font-medium">Examination:</span>
            <p className="font-semibold text-gray-900 mt-0.5">Transthoracic Echocardiogram (TTE) & 12-Lead ECG</p>
          </div>
          <div>
            <span className="text-gray-500 font-medium">Clinical Indication:</span>
            <p className="font-medium text-gray-900 mt-0.5">{data.indication}</p>
          </div>
        </div>

        {/* 1. Chamber Dimensions Table */}
        <div className="mb-6">
          <h3 className="text-xs font-bold text-blue-900 uppercase tracking-wider mb-2 border-b border-gray-200 pb-1">
            1. Echocardiographic Measurements (2D & M-Mode)
          </h3>
          <table className="w-full text-xs border border-gray-200 border-collapse">
            <thead>
              <tr className="bg-gray-100 text-gray-700">
                <th className="border border-gray-200 p-2 text-left">Parameter</th>
                <th className="border border-gray-200 p-2 text-center">Value</th>
                <th className="border border-gray-200 p-2 text-center">Reference Range</th>
                <th className="border border-gray-200 p-2 text-left">Clinical Interpretation</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-gray-200 p-2 font-semibold">LV Ejection Fraction (LVEF)</td>
                <td className="border border-gray-200 p-2 text-center font-bold text-blue-900 text-sm">{data.ef}%</td>
                <td className="border border-gray-200 p-2 text-center text-gray-500">&ge; 55%</td>
                <td className="border border-gray-200 p-2 font-medium">
                  {data.ef >= 55 ? 'Normal LV Systolic Function' : data.ef >= 45 ? 'Mildly Reduced' : 'Reduced (HFrEF)'}
                </td>
              </tr>
              <tr className="bg-gray-50/50">
                <td className="border border-gray-200 p-2 font-semibold">LV End-Diastolic Dimension (LVEDD)</td>
                <td className="border border-gray-200 p-2 text-center font-semibold">{data.lvedd} mm</td>
                <td className="border border-gray-200 p-2 text-center text-gray-500">35 - 53 mm</td>
                <td className="border border-gray-200 p-2">
                  {data.lvedd > 53 ? 'Dilated Left Ventricle' : 'Normal cavity size'}
                </td>
              </tr>
              <tr>
                <td className="border border-gray-200 p-2 font-semibold">LV End-Systolic Dimension (LVESD)</td>
                <td className="border border-gray-200 p-2 text-center font-semibold">{data.lvesd} mm</td>
                <td className="border border-gray-200 p-2 text-center text-gray-500">22 - 38 mm</td>
                <td className="border border-gray-200 p-2">Normal systolic dimension</td>
              </tr>
              <tr className="bg-gray-50/50">
                <td className="border border-gray-200 p-2 font-semibold">Interventricular Septum (IVSd)</td>
                <td className="border border-gray-200 p-2 text-center font-semibold">{data.ivs} mm</td>
                <td className="border border-gray-200 p-2 text-center text-gray-500">6 - 11 mm</td>
                <td className="border border-gray-200 p-2 font-medium">
                  {data.ivs > 11 ? 'Left Ventricular Hypertrophy (LVH)' : 'Normal wall thickness'}
                </td>
              </tr>
              <tr>
                <td className="border border-gray-200 p-2 font-semibold">Posterior Wall Thickness (LVPWd)</td>
                <td className="border border-gray-200 p-2 text-center font-semibold">{data.pw} mm</td>
                <td className="border border-gray-200 p-2 text-center text-gray-500">6 - 11 mm</td>
                <td className="border border-gray-200 p-2">Concentric geometry assessment</td>
              </tr>
              <tr className="bg-gray-50/50">
                <td className="border border-gray-200 p-2 font-semibold">Left Atrial Dimension (LA)</td>
                <td className="border border-gray-200 p-2 text-center font-semibold">{data.laDiameter} mm</td>
                <td className="border border-gray-200 p-2 text-center text-gray-500">&lt; 40 mm</td>
                <td className="border border-gray-200 p-2">
                  {data.laDiameter > 40 ? 'Left Atrial Enlargement' : 'Normal LA dimension'}
                </td>
              </tr>
              <tr>
                <td className="border border-gray-200 p-2 font-semibold">TAPSE (Right Ventricular Function)</td>
                <td className="border border-gray-200 p-2 text-center font-semibold">{data.tapse} mm</td>
                <td className="border border-gray-200 p-2 text-center text-gray-500">&ge; 17 mm</td>
                <td className="border border-gray-200 p-2">Preserved RV Longitudinal Function</td>
              </tr>
              <tr className="bg-gray-50/50">
                <td className="border border-gray-200 p-2 font-semibold">Estimated PASP (Pulmonary Pressure)</td>
                <td className="border border-gray-200 p-2 text-center font-semibold">{data.pasp} mmHg</td>
                <td className="border border-gray-200 p-2 text-center text-gray-500">&le; 35 mmHg</td>
                <td className="border border-gray-200 p-2">
                  {data.pasp > 35 ? 'Elevated pulmonary pressure' : 'Normal estimated PASP'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 2. Valvular & Doppler Evaluation */}
        <div className="mb-6">
          <h3 className="text-xs font-bold text-blue-900 uppercase tracking-wider mb-2 border-b border-gray-200 pb-1">
            2. Valvular Morphology & Doppler Findings
          </h3>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-2.5 bg-gray-50 rounded border border-gray-200">
              <span className="font-bold text-gray-800 block mb-0.5">Mitral Valve:</span>
              <p className="text-gray-700">{data.mitralValve}</p>
            </div>
            <div className="p-2.5 bg-gray-50 rounded border border-gray-200">
              <span className="font-bold text-gray-800 block mb-0.5">Aortic Valve:</span>
              <p className="text-gray-700">{data.aorticValve}</p>
            </div>
            <div className="p-2.5 bg-gray-50 rounded border border-gray-200">
              <span className="font-bold text-gray-800 block mb-0.5">Tricuspid & Pulmonic:</span>
              <p className="text-gray-700">{data.tricuspidValve}</p>
            </div>
            <div className="p-2.5 bg-gray-50 rounded border border-gray-200">
              <span className="font-bold text-gray-800 block mb-0.5">Pericardium & Wall Motion:</span>
              <p className="text-gray-700">{data.wallMotion} • {data.pericardium}</p>
            </div>
          </div>
        </div>

        {/* 3. Electrocardiogram (ECG) */}
        <div className="mb-6">
          <h3 className="text-xs font-bold text-blue-900 uppercase tracking-wider mb-2 border-b border-gray-200 pb-1">
            3. Standard 12-Lead Electrocardiogram (ECG)
          </h3>
          <div className="p-3 bg-gray-50 rounded border border-gray-200 text-xs grid grid-cols-3 gap-2">
            <div>
              <span className="font-semibold text-gray-500 block">Rhythm:</span>
              <p className="font-bold text-gray-900">{data.ecgRhythm}</p>
            </div>
            <div>
              <span className="font-semibold text-gray-500 block">Conduction:</span>
              <p className="text-gray-800">{data.ecgConduction}</p>
            </div>
            <div>
              <span className="font-semibold text-gray-500 block">Repolarization:</span>
              <p className="text-gray-800">{data.ecgIschemia}</p>
            </div>
          </div>
        </div>

        {/* 4. Conclusion & Plan */}
        <div className="mb-8 p-4 bg-blue-50/40 rounded-xl border-2 border-blue-200 text-xs">
          <h3 className="font-bold text-blue-900 uppercase tracking-wider text-xs mb-1.5 flex items-center gap-1.5">
            <CheckCircle2 size={16} className="text-blue-700" />
            Clinical Conclusion & Impression
          </h3>
          <p className="text-gray-900 text-xs sm:text-sm font-medium leading-relaxed mb-3">
            {data.conclusion}
          </p>

          <h4 className="font-bold text-gray-700 uppercase tracking-wider text-[11px] mb-1">
            Clinical Recommendations:
          </h4>
          <p className="text-gray-800 text-xs leading-relaxed">
            {data.recommendations}
          </p>
        </div>

        {/* Official Signature Footer */}
        <div className="pt-6 border-t border-gray-300 flex justify-between items-end text-xs text-gray-600 print-footer">
          <div>
            <p className="font-bold text-gray-800">Cardios Cardiovascular Clinic</p>
            <p className="text-[11px] text-gray-500">Certified Digital Medical Record • Egypt</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400 mb-6">Physician Signature & Stamp:</p>
            <div className="w-48 border-b-2 border-gray-800 pb-1 text-center font-serif text-sm font-bold text-gray-800">
              Dr. Cardios, MD, FESC
            </div>
            <p className="text-[10px] text-gray-500 mt-1">Consultant of Cardiology & Angiography</p>
          </div>
        </div>
      </div>
    </div>
  );
}
