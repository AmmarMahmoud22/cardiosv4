import React from 'react';
import {
  X,
  Printer,
  Share2,
  Calendar,
  Clock,
  CheckCircle2,
  User,
  Phone,
  HeartPulse,
  Stethoscope,
  Activity,
  Building2,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

export interface ReceiptData {
  appointmentId?: string;
  queueNumber: number;
  patientName: string;
  patientPhone: string;
  patientAge: string;
  dateStr: string; // YYYY-MM-DD
  doctorName?: string;
  clinicName?: string;
  clinicCode?: string;
  clinicLogoUrl?: string;
  clinicLogoIcon?: string;
  visitType?: string;
  instructions?: string;
}

export default function DigitalReceiptModal({
  isOpen,
  onClose,
  data
}: {
  isOpen: boolean;
  onClose: () => void;
  data: ReceiptData | null;
}) {
  if (!isOpen || !data) return null;

  const handlePrint = () => {
    window.print();
  };

  const formattedDate = () => {
    try {
      const d = new Date(data.dateStr);
      return format(d, 'EEEE d MMMM yyyy', { locale: ar });
    } catch {
      return data.dateStr;
    }
  };

  const handleWhatsAppShare = () => {
    const text = `*إيصال حجز كشف عيادة القلب* 🩺\n\n*رقم الدور:* #${data.queueNumber}\n*اسم المريض:* ${data.patientName}\n*الموعد:* ${formattedDate()}\n*العيادة:* ${data.clinicName || 'عيادة القلب'}\n*الطبيب:* ${data.doctorName || 'د/ عمار محمود'}\n\n*التعليمات:* ${data.instructions || 'يرجى الحضور قبل الموعد بـ 15 دقيقة.'}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const renderReceiptLogo = () => {
    if (data.clinicLogoUrl) {
      return <img src={data.clinicLogoUrl} alt="لوجو العيادة" className="w-10 h-10 object-contain mx-auto rounded-lg bg-white p-0.5" />;
    }
    switch (data.clinicLogoIcon) {
      case 'Stethoscope': return <Stethoscope size={24} className="mx-auto" />;
      case 'Activity': return <Activity size={24} className="mx-auto" />;
      case 'Building2': return <Building2 size={24} className="mx-auto" />;
      case 'ShieldCheck': return <ShieldCheck size={24} className="mx-auto" />;
      case 'Sparkles': return <Sparkles size={24} className="mx-auto" />;
      default: return <HeartPulse size={24} className="mx-auto" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 font-sans text-slate-800" dir="rtl">
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-receipt, #printable-receipt * {
            visibility: visible;
          }
          #printable-receipt {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 20px;
            box-shadow: none !important;
            border: 1px solid #cbd5e1 !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="bg-white border border-slate-200 max-w-md w-full rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between no-print shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <CheckCircle2 size={18} />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900">إيصال حجز الكشف الرقمي</h3>
              <p className="text-[10px] text-slate-500">تم تأكيد الموعد وإضافة بياناتك بالعيادة</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* PRINTABLE RECEIPT BODY */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 bg-slate-50/50 space-y-4">
          <div
            id="printable-receipt"
            className="bg-white border-2 border-slate-200 rounded-3xl p-5 shadow-sm space-y-4 relative overflow-hidden text-right"
          >
            {/* Top Badge Accent */}
            <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-blue-600 text-white p-4 -m-5 mb-3 rounded-t-3xl text-center space-y-1">
              <div className="mb-1">{renderReceiptLogo()}</div>
              <span className="text-[10px] font-bold tracking-widest uppercase bg-white/20 px-2 py-0.5 rounded-full inline-block">
                تأكيد حجز الموعد
              </span>
              <h2 className="text-lg font-black">{data.clinicName || 'عيادة أمراض القلب والقسطرة'}</h2>
              <p className="text-xs text-white/90 font-medium">{data.doctorName || 'د/ عمار محمود'}</p>
            </div>

            {/* QUEUE NUMBER BIG BADGE */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center space-y-1">
              <span className="text-xs font-black text-emerald-800 block">رقم الدور الخاص بك:</span>
              <div className="text-4xl font-black text-emerald-700 font-mono tracking-tight">
                #{data.queueNumber}
              </div>
              <p className="text-[10px] text-emerald-800 font-bold">يرجى الاحتفاظ بهذا الرقم أو تصوير الشاشة</p>
            </div>

            {/* Patient Info Card */}
            <div className="space-y-2 border-t border-b border-slate-100 py-3 text-xs">
              <div className="flex items-center justify-between text-slate-600">
                <span className="font-bold flex items-center gap-1.5">
                  <User size={14} className="text-slate-400" />
                  <span>اسم المريض:</span>
                </span>
                <span className="font-black text-slate-900">{data.patientName}</span>
              </div>

              <div className="flex items-center justify-between text-slate-600">
                <span className="font-bold flex items-center gap-1.5">
                  <Phone size={14} className="text-slate-400" />
                  <span>رقم الهاتف:</span>
                </span>
                <span className="font-mono font-bold text-slate-800">{data.patientPhone}</span>
              </div>

              <div className="flex items-center justify-between text-slate-600">
                <span className="font-bold flex items-center gap-1.5">
                  <Calendar size={14} className="text-slate-400" />
                  <span>تاريخ الموعد:</span>
                </span>
                <span className="font-bold text-slate-900">{formattedDate()}</span>
              </div>

              <div className="flex items-center justify-between text-slate-600">
                <span className="font-bold flex items-center gap-1.5">
                  <Clock size={14} className="text-slate-400" />
                  <span>نوع الزيارة:</span>
                </span>
                <span className="font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                  {data.visitType || 'كشف عيادة'}
                </span>
              </div>
            </div>

            {/* Clinic Instructions */}
            <div className="bg-amber-50/60 border border-amber-200/80 rounded-2xl p-3 text-xs space-y-1">
              <p className="font-black text-amber-900">تعليمات العيادة:</p>
              <p className="text-amber-800 leading-relaxed text-[11px]">
                {data.instructions || 'يرجى التواجد بالعيادة قبل موعدك بـ 15 دقيقة وإحضار الكشف السابق والفحوصات إن وجدت.'}
              </p>
            </div>


            {/* Receipt Footer */}
            <div className="pt-2 flex items-center justify-between text-[10px] text-slate-400 font-mono">
              <span>كود العيادة: {data.clinicCode || 'CLINIC-AMMAR-101'}</span>
              <span>Cardios Health EHR</span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between no-print shrink-0">
          <button
            onClick={handleWhatsAppShare}
            className="px-3.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
          >
            <Share2 size={15} />
            <span>واتساب</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5"
            >
              <Printer size={15} />
              <span>طباعة</span>
            </button>

            <button
              onClick={onClose}
              className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl transition-all shadow-sm"
            >
              تم الحفظ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
