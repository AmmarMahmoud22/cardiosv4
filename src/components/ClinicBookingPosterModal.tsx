import React, { useState, useEffect } from 'react';
import {
  X,
  Printer,
  Share2,
  QrCode,
  ShieldCheck,
  HeartPulse,
  Stethoscope,
  Activity,
  Building2,
  Sparkles
} from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { DoctorScheduleSettings } from '../types/appointment';

export default function ClinicBookingPosterModal({
  isOpen,
  onClose,
  doctorId = 'doc-1',
  doctorName = 'د/ عمار محمود',
  specialty = 'استشاري أمراض القلب والقسطرة التداخلية',
  clinicName = 'عيادة أمراض القلب والقسطرة',
  clinicCode = 'CLINIC-AMMAR-101'
}: {
  isOpen: boolean;
  onClose: () => void;
  doctorId?: string;
  doctorName?: string;
  specialty?: string;
  clinicName?: string;
  clinicCode?: string;
}) {
  const [currentClinicName, setCurrentClinicName] = useState(clinicName);
  const [currentDoctorName, setCurrentDoctorName] = useState(doctorName);
  const [currentSpecialty, setCurrentSpecialty] = useState(specialty);
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [logoIcon, setLogoIcon] = useState<string>('HeartPulse');

  useEffect(() => {
    if (!isOpen) return;

    const fetchPosterSettings = async () => {
      try {
        const snap = await getDoc(doc(db, 'doctor_schedules', doctorId));
        if (snap.exists()) {
          const data = snap.data() as DoctorScheduleSettings;
          if (data.clinicName) setCurrentClinicName(data.clinicName);
          if (data.doctorName) setCurrentDoctorName(data.doctorName);
          if (data.specialty) setCurrentSpecialty(data.specialty);
          if (data.clinicLogoUrl) setLogoUrl(data.clinicLogoUrl);
          if (data.clinicLogoIcon) setLogoIcon(data.clinicLogoIcon);
        }
      } catch (err) {
        console.warn('Error loading poster settings:', err);
      }
    };

    fetchPosterSettings();
  }, [isOpen, doctorId]);

  if (!isOpen) return null;

  const bookingUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/?booking=true&clinicCode=${clinicCode}`
    : `https://cardios.app/?booking=true&clinicCode=${clinicCode}`;

  const qrCodeImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(bookingUrl)}&color=0f172a&bgcolor=ffffff&margin=1`;

  const handlePrint = () => {
    window.print();
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `حجز موعد - ${currentClinicName}`,
        text: `احجز موعدك الآن لدى ${currentDoctorName} عبر مسح كود الـ QR أونلاين:`,
        url: bookingUrl
      }).catch(() => {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(bookingUrl);
      alert('تم نسخ رابط الحجز أونلاين للحافظة!');
    }
  };

  // Render vector icon if logoUrl is not present
  const renderLogoIcon = () => {
    switch (logoIcon) {
      case 'Stethoscope': return <Stethoscope size={32} />;
      case 'Activity': return <Activity size={32} />;
      case 'Building2': return <Building2 size={32} />;
      case 'ShieldCheck': return <ShieldCheck size={32} />;
      case 'Sparkles': return <Sparkles size={32} />;
      default: return <HeartPulse size={32} />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 font-sans text-slate-800" dir="rtl">
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-poster, #printable-poster * {
            visibility: visible;
          }
          #printable-poster {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            margin: 0;
            padding: 20px;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="bg-white border border-slate-200 max-w-xl w-full rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header - No Print */}
        <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between no-print shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold">
              <Printer size={18} />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-slate-900">بوستر العيادة الطباعي (Printable Clinic QR Poster)</h2>
              <p className="text-[11px] text-slate-500">جاهز للطباعة والتعليق بالعيادة باللوجو المخصص</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              className="p-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
              title="مشاركة رابط الحجز"
            >
              <Share2 size={16} />
              <span className="hidden sm:inline">مشاركة</span>
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* PRINTABLE POSTER CONTAINER */}
        <div className="p-6 overflow-y-auto flex-1 flex flex-col items-center justify-center bg-slate-50/50">
          <div
            id="printable-poster"
            className="w-full max-w-md bg-white border-2 border-teal-600 rounded-3xl p-6 sm:p-8 shadow-lg text-center space-y-6 relative overflow-hidden"
          >
            {/* Top Bar Accent */}
            <div className="absolute top-0 right-0 left-0 h-3 bg-gradient-to-r from-teal-500 via-emerald-500 to-blue-500" />

            {/* Clinic Logo & Title */}
            <div className="space-y-2 pt-2">
              <div className="w-16 h-16 rounded-2xl bg-teal-50 text-teal-700 border border-teal-200 flex items-center justify-center mx-auto shadow-sm overflow-hidden p-1">
                {logoUrl ? (
                  <img src={logoUrl} alt="لوجو العيادة" className="w-full h-full object-contain" />
                ) : (
                  renderLogoIcon()
                )}
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {currentClinicName}
              </h1>
              <p className="text-sm font-extrabold text-teal-700">
                {currentDoctorName}
              </p>
              <p className="text-xs text-slate-500 font-medium max-w-xs mx-auto">
                {currentSpecialty}
              </p>
            </div>

            {/* QR Code Container */}
            <div className="bg-gradient-to-b from-slate-50 to-teal-50/30 p-5 rounded-3xl border border-slate-200 inline-block shadow-inner">
              <div className="bg-white p-3 rounded-2xl shadow-md border border-slate-200">
                <img
                  src={qrCodeImageUrl}
                  alt="كود حجز المواعيد بالعيادة"
                  className="w-48 h-48 sm:w-56 sm:h-56 mx-auto object-contain rounded-lg"
                />
              </div>
              <p className="text-xs font-black text-slate-800 mt-3 flex items-center justify-center gap-1.5">
                <QrCode size={16} className="text-teal-600" />
                <span>امسح الـ QR بالكاميرا لحجز موعدك فوراً</span>
              </p>
            </div>

            {/* Instructions list */}
            <div className="bg-teal-50/60 border border-teal-100 rounded-2xl p-3.5 text-right space-y-1.5">
              <p className="text-xs font-black text-teal-900 flex items-center gap-1.5">
                <ShieldCheck size={16} className="text-teal-600" />
                <span>مميزات الحجز الإلكتروني عبر QR:</span>
              </p>
              <ul className="text-[11px] text-teal-800 space-y-1 font-medium pr-4 list-disc">
                <li>معرفة عدد الأماكن المتبقية وتحديد رقم الدور مباشرة.</li>
                <li>استلام إيصال كشف رقمي مؤكد على الموبايل.</li>
                <li>تنبيهات المواعيد وتوفير زمن الانتظار بالعيادة.</li>
              </ul>
            </div>

            {/* Poster Footer Code */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-mono font-bold">
              <span>كود العيادة: {clinicCode}</span>
              <span>منظومة Cardios الرقمية</span>
            </div>
          </div>
        </div>

        {/* Footer Actions - No Print */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between no-print shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl transition-colors"
          >
            إغلاق
          </button>

          <button
            onClick={handlePrint}
            className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center gap-2 active:scale-98"
          >
            <Printer size={16} />
            <span>طباعة البوستر الآن</span>
          </button>
        </div>
      </div>
    </div>
  );
}
