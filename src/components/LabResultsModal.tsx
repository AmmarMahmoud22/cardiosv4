import React, { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  FileText,
  CheckCircle2,
  AlertTriangle,
  X,
  Activity,
  Droplets,
  ShieldCheck,
  Upload,
  FileCheck,
  Download,
  Sparkles,
  Send,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  HeartPulse
} from 'lucide-react';

interface Props {
  patientId: string;
  onClose: () => void;
}

export default function LabResultsModal({ patientId, onClose }: Props) {
  const [patient, setPatient] = useState<any>(null);
  const [updating, setUpdating] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  // Option 1: Attachment Viewer State
  const [showAttachmentViewer, setShowAttachmentViewer] = useState(false);

  // Option 2: Doctor Clinical Order & Recommendation State
  const [doctorRecommendation, setDoctorRecommendation] = useState('');
  const [sendingOrder, setSendingOrder] = useState(false);
  const [orderSentSuccess, setOrderSentSuccess] = useState(false);
  const [orderError, setOrderError] = useState('');

  // Option 3: AI Patient Explanation State
  const [showAiExplanation, setShowAiExplanation] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      const snap = await getDoc(doc(db, 'patients', patientId));
      if (snap.exists()) {
        const data = snap.data();
        setPatient(data);
        if (data.doctorOrder?.text) {
          setDoctorRecommendation(data.doctorOrder.text);
        }
      }
    };
    fetch();
  }, [patientId]);

  const labs = patient?.labs || null;
  const attachment = labs?.attachment?.url ? labs.attachment : null;

  const approveLab = async () => {
    if (!labs) return;
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

  const handleSendDoctorOrder = async () => {
    if (!doctorRecommendation.trim()) return;
    setSendingOrder(true);
    setOrderError('');
    try {
      const activeDocName = patient?.doctorName || 'الطبيب المعالج';
      const orderPayload = {
        text: doctorRecommendation,
        doctorName: activeDocName,
        updatedAt: new Date().toISOString(),
        readByPatient: false
      };

      // 1. Save in patient record
      await updateDoc(doc(db, 'patients', patientId), {
        doctorOrder: orderPayload
      });

      // 2. Dispatch alert notification to patient's phone
      await addDoc(collection(db, `patients/${patientId}/notifications`), {
        type: 'doctor_order',
        title: `توصية وطلب تحاليل من ${activeDocName}`,
        message: `بناءً على المتابعة السريرية: ${doctorRecommendation}`,
        createdAt: new Date().toISOString(),
        timestamp: serverTimestamp(),
        read: false
      });

      // 3. Dispatch to lab_orders collection for the laboratory queue
      try {
        await addDoc(collection(db, 'lab_orders'), {
          patientId,
          patientName: patient?.name || `مريض #${patientId}`,
          doctorId: patient?.doctorId || '',
          staffUids: Array.isArray(patient?.staffUids) ? patient.staffUids : [],
          doctorName: activeDocName,
          clinicCode: patient?.clinicCode || '',
          tests: ['تحاليل مخبرية متابعة', 'وظائف كلى ودهون'],
          priority: doctorRecommendation.includes('عاجل') || doctorRecommendation.includes('STAT') ? 'urgent' : 'routine',
          instructions: doctorRecommendation,
          status: 'pending',
          createdAt: new Date().toISOString()
        });
      } catch (orderErr) {
        console.warn('Notice saving lab_order:', orderErr);
      }

      setOrderSentSuccess(true);
      setTimeout(() => setOrderSentSuccess(false), 4000);
    } catch (e) {
      console.error('Error sending doctor order:', e);
      setOrderError('حدث خطأ أثناء إرسال التوصية، يرجى المحاولة مرة أخرى.');
    } finally {
      setSendingOrder(false);
    }
  };

  // Plain Arabic AI explanation helper
  const getAiExplanationText = () => {
    if (!labs) return 'لا توجد نتائج تحاليل مسجلة لتفسيرها بعد.';
    const ldlVal = parseFloat(labs.ldl);
    const egfrVal = parseFloat(labs.egfr);
    const isTropNeg = !labs.troponin || labs.troponin.includes('سالب');

    return `
${labs.ldl ? `• كوليسترول الدم (LDL = ${labs.ldl}): ${
      !Number.isNaN(ldlVal) && ldlVal <= 70
        ? 'نتيجة ممتازة وفي النطاق المثالي المستهدف لحماية شرايين القلب والصمامات.'
        : 'يوصى بمتابعة القراءة مع الطبيب والالتزام بالخطة العلاجية والنظام الغذائي.'
    }` : ''}
${labs.egfr ? `• وظائف الكلى والفلترة (eGFR = ${labs.egfr}): ${
      !Number.isNaN(egfrVal) && egfrVal >= 60
        ? 'كفاءة الكلى ممتازة وتعمل بشكل طبيعي وآمن.'
        : 'يرجى متابعة وظائف الكلى ومراجعة جرعات الأدوية مع الطبيب.'
    }` : ''}
${labs.troponin ? `• إنزيم جلطة القلب (Troponin = ${labs.troponin}): ${
      isTropNeg
        ? 'نتيجة سلبية تؤكد عدم وجود إجهاد حاد في عضلة القلب.'
        : 'توجد قراءة تحتاج لمتابعة، يرجى التواصل مع العيادة.'
    }` : ''}
    `.trim() || 'تم توثيق القيم المخبرية بنجاح في ملف المريض.';
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 font-sans" dir="rtl">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 text-white p-5 flex items-center justify-between sticky top-0 z-10 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center border border-white/20">
              <Droplets size={20} className="text-red-300" />
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
        <div className="p-6 space-y-5">
          {!labs ? (
            <div className="p-6 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-center space-y-2">
              <Droplets size={28} className="mx-auto text-slate-400" />
              <p className="text-sm font-bold text-slate-800">لا توجد نتائج تحاليل مسجلة لهذا المريض بعد</p>
              <p className="text-xs text-slate-500">يمكنك إرسال طلب فحوصات للمعمل المرتبط بالعيادة من القسم التالي ليتم رفع النتائج هنا فور اعتمادها.</p>
            </div>
          ) : (
            <>
              {/* Status & Lab Info Banner */}
              <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-3.5 text-xs text-blue-900 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={18} className="text-blue-600 shrink-0" />
                  <span>فني / معمل التحاليل: <strong>{labs.technician || 'معمل التحاليل المعتمد'}</strong></span>
                </div>
                <span className="font-bold text-blue-700 font-mono">
                  تاريخ التحديث: {labs.updatedAt ? new Date(labs.updatedAt).toLocaleDateString('ar-EG') : '—'}
                </span>
              </div>

              {/* Biomarkers Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5">
                  <div className="text-slate-500 mb-1 flex items-center justify-between">
                    <span>الكوليسترول الضار (LDL)</span>
                    <span className="text-[10px] text-emerald-600 font-bold bg-emerald-100 px-1.5 py-0.5 rounded">&lt; 70</span>
                  </div>
                  <div className="text-lg font-bold text-slate-800 font-mono">{labs.ldl || '—'}</div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5">
                  <div className="text-slate-500 mb-1 flex items-center justify-between">
                    <span>الكوليسترول النافع (HDL)</span>
                    <span className="text-[10px] text-blue-600 font-bold bg-blue-100 px-1.5 py-0.5 rounded">&gt; 40</span>
                  </div>
                  <div className="text-lg font-bold text-slate-800 font-mono">{labs.hdl || '—'}</div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5">
                  <div className="text-slate-500 mb-1 flex items-center justify-between">
                    <span>الكرياتينين (Creatinine)</span>
                    <span className="text-[10px] text-slate-500">0.7 - 1.2</span>
                  </div>
                  <div className="text-lg font-bold text-slate-800 font-mono">{labs.creatinine || '—'}</div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5">
                  <div className="text-slate-500 mb-1 flex items-center justify-between">
                    <span>الفلترة الكلوية (eGFR)</span>
                    <span className="text-[10px] text-emerald-600 font-bold bg-emerald-100 px-1.5 py-0.5 rounded">&gt; 60</span>
                  </div>
                  <div className="text-lg font-bold text-slate-800 font-mono">{labs.egfr || '—'}</div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5">
                  <div className="text-slate-500 mb-1 flex items-center justify-between">
                    <span>البوتاسيوم (K+)</span>
                    <span className="text-[10px] text-slate-500">3.5 - 5.0</span>
                  </div>
                  <div className="text-lg font-bold text-slate-800 font-mono">{labs.potassium || '—'}</div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5">
                  <div className="text-slate-500 mb-1 flex items-center justify-between">
                    <span>السكر التراكمي (HbA1c)</span>
                    <span className="text-[10px] text-amber-600 font-bold bg-amber-100 px-1.5 py-0.5 rounded">&lt; 7.0%</span>
                  </div>
                  <div className="text-lg font-bold text-slate-800 font-mono">{labs.hba1c || '—'}</div>
                </div>
              </div>

              {labs.troponin && (
                <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-3 text-xs flex items-center justify-between text-emerald-900">
                  <span className="font-semibold">إنزيم تروبونين القلب (hs-cTnI):</span>
                  <span className="font-bold font-mono">{labs.troponin}</span>
                </div>
              )}

              {attachment && (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileCheck size={18} className="text-teal-600" />
                      <div>
                        <h4 className="font-bold text-xs text-slate-800">تقرير المعمل الأصلي المرفق</h4>
                        <p className="text-[10px] text-slate-500 font-mono">{attachment.name} {attachment.size ? `• ${attachment.size}` : ''}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowAttachmentViewer(!showAttachmentViewer)}
                        className="px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1"
                      >
                        <FileText size={14} />
                        <span>{showAttachmentViewer ? 'إخفاء المعاينة' : 'معاينة ملخص التقرير'}</span>
                      </button>

                      <a
                        href={attachment.url}
                        download={attachment.name}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1"
                      >
                        <Download size={14} />
                        <span>تنزيل</span>
                      </a>
                    </div>
                  </div>

                  {showAttachmentViewer && (
                    <div className="mt-3 p-4 bg-white border border-slate-300 rounded-2xl shadow-inner text-center space-y-3">
                      <div className="bg-slate-900 text-white p-4 rounded-xl text-right font-mono text-xs space-y-2">
                        <div className="border-b border-slate-700 pb-2 flex justify-between items-center">
                          <span className="text-teal-400 font-bold">CARDIOS CLINICAL LAB REPORT</span>
                          <span className="text-slate-400">VERIFIED RECORD</span>
                        </div>
                        <div className="text-slate-300 space-y-1 text-[11px]">
                          <p>Patient Name: {patient?.name || '—'}</p>
                          <p>Lab Reference ID: LAB-{patientId}</p>
                          <p>Lipid Profile: LDL={labs.ldl || '—'}, HDL={labs.hdl || '—'}</p>
                          <p>Renal Panel: Creatinine={labs.creatinine || '—'}, eGFR={labs.egfr || '—'}, K+={labs.potassium || '—'}</p>
                          <p>Biomarkers: Troponin={labs.troponin || '—'}, HbA1c={labs.hba1c || '—'}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Option 2: Doctor Direct Feedback & Order Entry */}
          <div className="bg-indigo-50/70 border border-indigo-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-xs text-indigo-900 flex items-center gap-2">
                <MessageSquare size={16} className="text-indigo-600" />
                <span>توصية وقرار الطبيب المعالج المباشر (Direct Doctor Clinical Order)</span>
              </h4>
              <span className="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded-full">
                تظهر بهاتف المريض والمعمل
              </span>
            </div>

            {/* Quick Templates Buttons */}
            <div className="flex flex-wrap gap-1.5 text-[11px]">
              <button
                type="button"
                onClick={() => setDoctorRecommendation('الاستمرار على الخطة العلاجية الحالية مع التزام شرب الماء والرياضة الخفيفة.')}
                className="bg-white hover:bg-indigo-100 text-indigo-900 border border-indigo-200 px-2.5 py-1 rounded-lg transition-colors font-medium"
              >
                + استمرار على العلاج الحالي
              </button>
              <button
                type="button"
                onClick={() => setDoctorRecommendation('زيادة جرعة أتورفاستاتين (Lipitor) إلى 80 mg للوصول إلى هدف الكوليسترول الضار < 55 mg/dL.')}
                className="bg-white hover:bg-indigo-100 text-indigo-900 border border-indigo-200 px-2.5 py-1 rounded-lg transition-colors font-medium"
              >
                + ضبط جرعة أتورفاستاتين
              </button>
              <button
                type="button"
                onClick={() => setDoctorRecommendation('إعادة فحص وظائف الكلى والبوتاسيوم بعد شهر واحد وتقليل الملح بالطعام.')}
                className="bg-white hover:bg-indigo-100 text-indigo-900 border border-indigo-200 px-2.5 py-1 rounded-lg transition-colors font-medium"
              >
                + إعادة وظائف الكلى بعد شهر
              </button>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={doctorRecommendation}
                onChange={(e) => setDoctorRecommendation(e.target.value)}
                placeholder="اكتب التوصية أو القرار الطبي ليتم إرسال إشعار فوري بها للمريض..."
                className="flex-1 text-xs p-2.5 bg-white border border-indigo-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleSendDoctorOrder}
                disabled={sendingOrder || !doctorRecommendation.trim()}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                <Send size={14} />
                <span>{sendingOrder ? 'جاري الإرسال...' : 'إرسال'}</span>
              </button>
            </div>

            {orderSentSuccess && (
              <p className="text-[11px] text-emerald-700 font-bold flex items-center gap-1">
                <CheckCircle2 size={14} />
                <span>تم إرسال التوصية الطبية بنجاح لهاتف المريض وتم توثيقها بالملف!</span>
              </p>
            )}

            {orderError && (
              <p className="text-[11px] text-rose-700 font-bold flex items-center gap-1">
                <AlertTriangle size={14} />
                <span>{orderError}</span>
              </p>
            )}
          </div>

          {/* Option 3: AI Patient Explanation Section */}
          <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 space-y-2">
            <button
              onClick={() => setShowAiExplanation(!showAiExplanation)}
              className="w-full flex items-center justify-between text-xs font-bold text-amber-900"
            >
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-amber-600" />
                <span>✨ الشرح والتبسيط السريري للنتائج بواسطة الذكاء الاصطناعي (Patient Explanation)</span>
              </div>
              {showAiExplanation ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {showAiExplanation && (
              <div className="p-3 bg-white border border-amber-200 rounded-xl text-xs text-slate-700 leading-relaxed space-y-2 animate-in fade-in">
                <pre className="whitespace-pre-wrap font-sans text-xs text-slate-700">{getAiExplanationText()}</pre>
              </div>
            )}
          </div>

          {statusMessage && (
            <div className="p-3 bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold text-center">
              {statusMessage}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between sticky bottom-0">
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-200/60 transition-colors"
          >
            إغلاق النافذة
          </button>

          <button
            onClick={approveLab}
            disabled={updating || !labs}
            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95 disabled:opacity-50"
          >
            <CheckCircle2 size={16} />
            <span>{updating ? 'جاري الاعتماد...' : 'اعتماد التحاليل وتأكيد استقرار حالة المريض'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

