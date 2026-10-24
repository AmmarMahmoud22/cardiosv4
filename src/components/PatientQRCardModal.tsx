import React, {useEffect} from 'react';
import {X, Printer, Share2, QrCode, Smartphone, CheckCircle, ShieldCheck, Copy} from 'lucide-react';
import {doc, setDoc} from 'firebase/firestore';
import {db} from '../lib/firebase';
import {generatePatientToken} from '../lib/patientAuth';

interface Props {
  patientName: string;
  patientId: string;
  onClose: () => void;
}

export default function PatientQRCardModal({patientName, patientId, onClose}: Props) {
  // Generate secure token and portal access URL
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://cardios-clinic.app';
  const patientToken = generatePatientToken(patientId);
  const portalUrl = `${currentOrigin}/?patientId=${patientId}&portal=true&token=${patientToken}`;
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(portalUrl)}&color=1e3a8a&bgcolor=ffffff`;

  // Ensure patient document in Firestore has this exact token stored
  useEffect(() => {
    try {
      const pRef = doc(db, 'patients', patientId);
      setDoc(pRef, {accessToken: patientToken, securityToken: patientToken}, {merge: true});
    } catch (e) {
      console.warn('Failed to sync patient token to firestore:', e);
    }
  }, [patientId, patientToken]);

  const handleShareWhatsApp = () => {
    const text = `*كارت المتابعة الذكية - عيادة د/ عمار محمود* 🫀
عزيزي المريض: *${patientName}*
رقم الملف: #${patientId}
رمز التحقق الأمني: ${patientToken}

حرصاً على سلامة قلبك واستقرار ضغط الدم، تم تفعيل بوابة المتابعة المنزلية الخاصة بك.
📱 *رابط الدخول المباشر لحسابك:*
${portalUrl}

*من خلال الرابط يمكنك:*
✅ تسجيل قياسات الضغط والنبض يومياً لتصل لطبيبك لحظياً.
✅ متابعة مواعيد أخذ الأدوية والجرعات اليومية.
✅ تحميل أحدث روشتة ونتائج معمل الأزهري للتحاليل.
✅ مراسلة د/ عمار محمود مباشرة عبر البوابة.

📞 *هاتف العيادة المباشر:* 01146963589
👨‍⚕️ عيادة د/ عمار محمود - استشاري أمراض القلب والقسطرة`;

    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-950 text-white flex items-center justify-between no-print">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-600/30 rounded-xl border border-blue-400/20">
              <QrCode size={20} className="text-blue-300" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Patient Smart QR Access Card</h3>
              <p className="text-[11px] text-blue-200/80">كارت الوصول الذكي - عيادة د/ عمار محمود</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Printable Card Area */}
        <div className="p-6 bg-gray-50 flex flex-col items-center">
          <div id="qr-printable-card" className="printable bg-white p-6 rounded-2xl border-2 border-blue-200 shadow-sm max-w-sm w-full text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-800" />

            {/* Clinic Info */}
            <div className="mb-4">
              <img src="/assets/aistudio/image_54a63720.png" alt="د/ عمار محمود" className="h-14 w-auto object-contain mx-auto mb-2" />
              <span className="text-[10px] font-bold text-blue-900 tracking-widest uppercase bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                Dr. Ammar Mahmoud Clinic
              </span>
              <h2 className="text-lg font-black text-gray-900 mt-1">عيادة د/ عمار محمود</h2>
              <p className="text-[11px] text-gray-500">استشاري أمراض القلب والأوعية الدموية والقسطرة</p>
            </div>

            {/* Patient Name badge */}
            <div className="p-2.5 bg-blue-50/70 rounded-xl border border-blue-100 mb-4">
              <span className="text-[11px] text-gray-500 block">اسم المريض (Patient Name)</span>
              <p className="font-bold text-blue-900 text-base">{patientName}</p>
              <div className="flex items-center justify-center gap-3 mt-1 text-[10px] text-gray-500">
                <span>File ID: #{patientId}</span>
                <span>•</span>
                <span className="font-mono bg-white px-2 py-0.5 rounded border border-blue-200 text-blue-700 font-bold">
                  رمز الأمان: {patientToken}
                </span>
              </div>
            </div>

            {/* QR Code Container */}
            <div className="p-3 bg-white rounded-xl border border-gray-200 shadow-2xs inline-block mb-4">
              <img
                src={qrImageUrl}
                alt={`QR Access code for ${patientName}`}
                className="w-48 h-48 mx-auto"
              />
            </div>

            {/* Scan Instructions */}
            <div className="text-left text-xs text-gray-600 space-y-1.5 bg-gray-50 p-3 rounded-xl border border-gray-200 mb-2" dir="rtl">
              <p className="font-bold text-gray-800 text-[11px] mb-1">تعليمات المريض:</p>
              <div className="flex items-center gap-2 text-[11px]">
                <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[10px]">١</span>
                <span>امسح الرمز بكاميرا هاتفك المحمول.</span>
              </div>
              <div className="flex items-center gap-2 text-[11px]">
                <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[10px]">٢</span>
                <span>افتح البوابة فوراً دون الحاجة لتحميل تطبيقات.</span>
              </div>
              <div className="flex items-center gap-2 text-[11px]">
                <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[10px]">٣</span>
                <span>سجّل قراءات ضغطك يومياً لتصل لطبيبك مباشرة.</span>
              </div>
            </div>

            <p className="text-[10px] text-gray-400 mt-2">
              🔒 اتصال مشفر وآمن مع خوادم عيادة د. القلب
            </p>
          </div>
        </div>

        {/* Modal Actions Footer */}
        <div className="p-4 bg-white border-t border-gray-200 flex items-center justify-end gap-2 no-print">
          <button
            onClick={handleShareWhatsApp}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all active:scale-95"
          >
            <Share2 size={15} />
            <span>Send to Patient (WhatsApp)</span>
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-all active:scale-95"
          >
            <Printer size={15} />
            <span>Print Access Card</span>
          </button>
        </div>
      </div>
    </div>
  );
}
