import React, {useState, useEffect} from 'react';
import {doc, getDoc, updateDoc} from 'firebase/firestore';
import {db} from '../lib/firebase';
import {FileText, CheckCircle2, AlertTriangle, X, Activity, Droplet, ShieldCheck} from 'lucide-react';

interface Props {
  patientId: string;
  onClose: () => void;
}

export default function LabResultsModal({patientId, onClose}: Props) {
  const [patient, setPatient] = useState<any>(null);
  const [updating, setUpdating] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    const fetch = async () => {
      const snap = await getDoc(doc(db, 'patients', patientId));
      if (snap.exists()) {
        setPatient(snap.data());
      }
    };
    fetch();
  }, [patientId]);

  const labs = patient?.labs || {
    ldl: '72 mg/dL',
    hdl: '44 mg/dL',
    creatinine: '0.9 mg/dL',
    egfr: '92 mL/min',
    potassium: '4.4 mmol/L',
    hba1c: '5.8%',
    troponin: 'سالب (<0.01 ng/mL)'
  };

  const approveLab = async () => {
    setUpdating(true);
    try {
      await updateDoc(doc(db, 'patients', patientId), {
        status: 'مستقر (Stable Control)'
      });
      setStatusMessage('تم اعتماد التحاليل وتحديث حالة المريض بنجاح!');
      setTimeout(() => {
        onClose();
      }, 900);
    } catch (err) {
      console.error(err);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 font-sans" dir="rtl">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center border border-white/20">
              <Droplet size={20} className="text-red-300" />
            </div>
            <div>
              <h3 className="font-bold text-base">الملف المخبري والتحاليل الحيوية</h3>
              <p className="text-xs text-blue-100">
                {patient?.name ? `المريض: ${patient.name}` : 'مراجعة تحاليل القلب'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-blue-200 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-3.5 text-xs text-blue-900 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck size={18} className="text-blue-600 shrink-0" />
              <span>مختبر معتمد • تحليل دوري لمتابعة مخاطر القلب والشرايين ووظائف الكلى</span>
            </div>
            <span className="font-bold text-blue-700">تحديث: اليوم</span>
          </div>

          {/* Biomarkers Grid */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5">
              <div className="text-slate-500 mb-1 flex items-center justify-between">
                <span>الكوليسترول الضار (LDL-C)</span>
                <span className="text-[10px] text-emerald-600 font-bold bg-emerald-100 px-1.5 py-0.5 rounded">الهدف: &lt; 55-70</span>
              </div>
              <div className="text-lg font-bold text-slate-800 font-mono">{labs.ldl}</div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5">
              <div className="text-slate-500 mb-1 flex items-center justify-between">
                <span>الكوليسترول النافع (HDL-C)</span>
                <span className="text-[10px] text-blue-600 font-bold bg-blue-100 px-1.5 py-0.5 rounded">&gt; 40 mg/dL</span>
              </div>
              <div className="text-lg font-bold text-slate-800 font-mono">{labs.hdl || '44 mg/dL'}</div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5">
              <div className="text-slate-500 mb-1 flex items-center justify-between">
                <span>كرياتينين المصل (Serum Creatinine)</span>
                <span className="text-[10px] text-slate-500">0.7 - 1.2</span>
              </div>
              <div className="text-lg font-bold text-slate-800 font-mono">{labs.creatinine}</div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5">
              <div className="text-slate-500 mb-1 flex items-center justify-between">
                <span>كفاءة الفلترة الكلوية (eGFR)</span>
                <span className="text-[10px] text-emerald-600 font-bold bg-emerald-100 px-1.5 py-0.5 rounded">&gt; 60 mL/min</span>
              </div>
              <div className="text-lg font-bold text-slate-800 font-mono">{labs.egfr}</div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5">
              <div className="text-slate-500 mb-1 flex items-center justify-between">
                <span>بوتاسيوم الدم (Serum K+)</span>
                <span className="text-[10px] text-slate-500">3.5 - 5.0</span>
              </div>
              <div className="text-lg font-bold text-slate-800 font-mono">{labs.potassium}</div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5">
              <div className="text-slate-500 mb-1 flex items-center justify-between">
                <span>السكر التراكمي (HbA1c)</span>
                <span className="text-[10px] text-amber-600 font-bold bg-amber-100 px-1.5 py-0.5 rounded">&lt; 7.0%</span>
              </div>
              <div className="text-lg font-bold text-slate-800 font-mono">{labs.hba1c}</div>
            </div>
          </div>

          {labs.troponin && (
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-3 text-xs flex items-center justify-between text-emerald-900">
              <span className="font-semibold">إنزيم تروبونين القلب فائق الحساسية (hs-cTnI):</span>
              <span className="font-bold font-mono">{labs.troponin}</span>
            </div>
          )}

          {labs.bnp && (
            <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-3 text-xs flex items-center justify-between text-amber-900">
              <span className="font-semibold">مؤشر هبوط القلب (NT-proBNP):</span>
              <span className="font-bold font-mono">{labs.bnp}</span>
            </div>
          )}

          {statusMessage && (
            <div className="p-3 bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold text-center">
              {statusMessage}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-200/60 transition-colors"
          >
            إغلاق النافذة
          </button>
          <button
            onClick={approveLab}
            disabled={updating}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95 disabled:opacity-50"
          >
            <CheckCircle2 size={16} />
            <span>{updating ? 'جاري الاعتماد...' : 'اعتماد التحاليل وتأكيد استقرار الحالة'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
