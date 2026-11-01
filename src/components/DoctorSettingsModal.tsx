import React, { useState, useEffect } from 'react';
import {
  X,
  Settings,
  Upload,
  Image as ImageIcon,
  HeartPulse,
  Stethoscope,
  Activity,
  Building2,
  ShieldCheck,
  Sparkles,
  Calendar,
  Users,
  CheckCircle2,
  Save,
  RefreshCw,
  Trash2,
  Printer,
  QrCode,
  Share2
} from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { DoctorScheduleSettings, DoctorWorkingDay } from '../types/appointment';

const DEFAULT_DAYS: DoctorWorkingDay[] = [
  { dayOfWeek: 6, dayNameAr: 'السبت', enabled: true, maxCapacity: 10, startTime: '16:00', endTime: '21:00' },
  { dayOfWeek: 0, dayNameAr: 'الأحد', enabled: true, maxCapacity: 12, startTime: '16:00', endTime: '21:00' },
  { dayOfWeek: 1, dayNameAr: 'الإثنين', enabled: false, maxCapacity: 10, startTime: '16:00', endTime: '21:00' },
  { dayOfWeek: 2, dayNameAr: 'الثلاثاء', enabled: true, maxCapacity: 10, startTime: '16:00', endTime: '21:00' },
  { dayOfWeek: 3, dayNameAr: 'الأربعاء', enabled: false, maxCapacity: 10, startTime: '16:00', endTime: '21:00' },
  { dayOfWeek: 4, dayNameAr: 'الخميس', enabled: true, maxCapacity: 15, startTime: '16:00', endTime: '22:00' },
  { dayOfWeek: 5, dayNameAr: 'الجمعة', enabled: false, maxCapacity: 5, startTime: '16:00', endTime: '20:00' },
];

const PRESET_ICONS = [
  { id: 'HeartPulse', label: 'نبض القلب', icon: HeartPulse, bg: 'bg-rose-50 text-rose-600 border-rose-200' },
  { id: 'Stethoscope', label: 'سماعة طبية', icon: Stethoscope, bg: 'bg-teal-50 text-teal-600 border-teal-200' },
  { id: 'Activity', label: 'مخطط قلب', icon: Activity, bg: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
  { id: 'Building2', label: 'مبنى عيادات', icon: Building2, bg: 'bg-blue-50 text-blue-600 border-blue-200' },
  { id: 'ShieldCheck', label: 'درع طبي', icon: ShieldCheck, bg: 'bg-purple-50 text-purple-600 border-purple-200' },
  { id: 'Sparkles', label: 'عناية ممتازة', icon: Sparkles, bg: 'bg-amber-50 text-amber-600 border-amber-200' },
];

// Helper to compress image down to 250x250px WebP for instant Firestore save
const compressImage = (dataUrl: string, maxWidth = 250, maxHeight = 250, quality = 0.8): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = dataUrl;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/webp', quality));
      } else {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
  });
};

export default function DoctorSettingsModal({
  isOpen,
  onClose,
  doctorId = 'doc-1',
  initialClinicName = 'عيادة أمراض القلب والقسطرة',
  initialDoctorName = 'د/ عمار محمود',
  initialSpecialty = 'استشاري أمراض القلب والقسطرة التداخلية',
  clinicCode = 'CLINIC-AMMAR-101',
  onSaveSuccess
}: {
  isOpen: boolean;
  onClose: () => void;
  doctorId?: string;
  initialClinicName?: string;
  initialDoctorName?: string;
  initialSpecialty?: string;
  clinicCode?: string;
  onSaveSuccess?: (updated: Partial<DoctorScheduleSettings>) => void;
}) {
  const [activeTab, setActiveTab] = useState<'settings' | 'poster'>('settings');

  const [clinicName, setClinicName] = useState(initialClinicName);
  const [doctorName, setDoctorName] = useState(initialDoctorName);
  const [specialty, setSpecialty] = useState(initialSpecialty);

  // Logo States
  const [logoMode, setLogoMode] = useState<'upload' | 'preset'>('preset');
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [selectedPresetIcon, setSelectedPresetIcon] = useState<string>('HeartPulse');

  // Schedule & Instructions
  const [workingDays, setWorkingDays] = useState<DoctorWorkingDay[]>(DEFAULT_DAYS);
  const [instructions, setInstructions] = useState<string>(
    'يرجى التواجد بالعيادة قبل موعد الدور بـ 15 دقيقة مع إحضار كافة الفحوصات والتحاليل الطبية السابقة.'
  );

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const fetchSettings = async () => {
      setLoading(true);
      try {
        const snap = await getDoc(doc(db, 'doctor_schedules', doctorId));
        if (snap.exists()) {
          const data = snap.data() as DoctorScheduleSettings;
          if (data.clinicName) setClinicName(data.clinicName);
          if (data.doctorName) setDoctorName(data.doctorName);
          if (data.specialty) setSpecialty(data.specialty);
          if (data.clinicLogoUrl) {
            setLogoUrl(data.clinicLogoUrl);
            setLogoMode('upload');
          }
          if (data.clinicLogoIcon) {
            setSelectedPresetIcon(data.clinicLogoIcon);
          }
          if (data.workingDays && data.workingDays.length > 0) {
            setWorkingDays(data.workingDays);
          }
          if (data.instructions) {
            setInstructions(data.instructions);
          }
        }
      } catch (err) {
        console.warn('Error fetching settings:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [isOpen, doctorId]);

  if (!isOpen) return null;

  // Handle Logo Image Upload & Immediate Compression
  const handleLogoFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('حجم صورة اللوجو كبير جداً. يرجى اختيار صورة أقل من 5 ميجابايت.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      if (reader.result) {
        const compressed = await compressImage(reader.result.toString(), 250, 250, 0.85);
        setLogoUrl(compressed);
        setLogoMode('upload');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleToggleDay = (index: number) => {
    const updated = [...workingDays];
    updated[index].enabled = !updated[index].enabled;
    setWorkingDays(updated);
  };

  const handleCapacityChange = (index: number, val: number) => {
    const updated = [...workingDays];
    updated[index].maxCapacity = Math.max(1, val);
    setWorkingDays(updated);
  };

  // Instant & Fast Save
  const handleSave = async () => {
    setSaving(true);
    setSavedSuccess(false);

    try {
      let finalLogo = logoMode === 'upload' ? logoUrl : '';
      if (finalLogo && finalLogo.length > 8000) {
        finalLogo = await compressImage(finalLogo, 250, 250, 0.8);
      }

      const scheduleData: DoctorScheduleSettings = {
        doctorId,
        doctorName: doctorName.trim(),
        clinicName: clinicName.trim(),
        specialty: specialty.trim(),
        clinicCode,
        clinicLogoUrl: finalLogo,
        clinicLogoIcon: selectedPresetIcon,
        workingDays,
        instructions,
        updatedAt: new Date().toISOString()
      };

      // 1. Synchronous optimistic UI update
      if (onSaveSuccess) {
        onSaveSuccess(scheduleData);
      }

      // 2. Async background Firestore write
      setDoc(doc(db, 'doctor_schedules', doctorId), scheduleData, { merge: true }).catch(err => {
        console.error('Background Firestore save error:', err);
      });

      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 400);
    } catch (err) {
      console.error('Error saving settings:', err);
      alert('حدث خطأ أثناء حفظ الإعدادات، يرجى المحاولة مرة أخرى.');
    } finally {
      setSaving(false);
    }
  };

  const bookingUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/?booking=true&clinicCode=${clinicCode}`
    : `https://cardios.app/?booking=true&clinicCode=${clinicCode}`;

  const qrCodeImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(bookingUrl)}&color=0f172a&bgcolor=ffffff&margin=1`;

  const handlePrintPoster = () => {
    window.print();
  };

  const renderLogoIcon = () => {
    if (logoMode === 'upload' && logoUrl) {
      return <img src={logoUrl} alt="لوجو العيادة" className="w-full h-full object-contain p-1" />;
    }
    switch (selectedPresetIcon) {
      case 'Stethoscope': return <Stethoscope size={32} />;
      case 'Activity': return <Activity size={32} />;
      case 'Building2': return <Building2 size={32} />;
      case 'ShieldCheck': return <ShieldCheck size={32} />;
      case 'Sparkles': return <Sparkles size={32} />;
      default: return <HeartPulse size={32} />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 font-sans text-slate-800" dir="rtl">
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-settings-poster, #printable-settings-poster * {
            visibility: visible;
          }
          #printable-settings-poster {
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

      <div className="bg-white border border-slate-200 max-w-2xl w-full rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between shrink-0 no-print">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center font-bold">
              <Settings size={22} />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900">الإعدادات</h2>
              <p className="text-xs text-slate-500">بيانات العيادة، اللوجو، مواعيد الكشف، وبوستر الـ QR الطباعي</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation inside Modal */}
        <div className="px-5 pt-3 bg-slate-50 border-b border-slate-200 flex gap-2 no-print shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`pb-2.5 px-4 text-xs font-black transition-all border-b-2 flex items-center gap-2 ${
              activeTab === 'settings'
                ? 'border-teal-600 text-teal-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Settings size={15} />
            <span>بيانات وإعدادات العيادة</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('poster')}
            className={`pb-2.5 px-4 text-xs font-black transition-all border-b-2 flex items-center gap-2 ${
              activeTab === 'poster'
                ? 'border-teal-600 text-teal-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Printer size={15} />
            <span>بوستر الـ QR الطباعي</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {loading ? (
            <div className="py-12 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
              <RefreshCw size={24} className="animate-spin text-teal-600" />
              <span>جاري تحميل الإعدادات...</span>
            </div>
          ) : activeTab === 'settings' ? (
            <>
              {/* SECTION 1: CLINIC BRANDING & LOGO */}
              <div className="space-y-4">
                <h3 className="text-xs font-black text-slate-900 flex items-center gap-1.5 pb-2 border-b border-slate-100">
                  <ImageIcon size={16} className="text-teal-600" />
                  <span>1. الهوية البصرية ولوجو العيادة:</span>
                </h3>

                {/* Logo Source Selector Tabs */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setLogoMode('preset')}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                      logoMode === 'preset'
                        ? 'bg-teal-50 border-teal-600 text-teal-800 shadow-2xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    اختيار أيقونة طبية جاهزة
                  </button>
                  <button
                    type="button"
                    onClick={() => setLogoMode('upload')}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                      logoMode === 'upload'
                        ? 'bg-teal-50 border-teal-600 text-teal-800 shadow-2xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    رفع صورة لوجو من جهازك
                  </button>
                </div>

                {/* Logo Option A: Upload Custom Logo Image */}
                {logoMode === 'upload' && (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                      {/* Logo Preview Box */}
                      <div className="w-24 h-24 rounded-2xl bg-white border-2 border-slate-300 flex items-center justify-center overflow-hidden shrink-0 shadow-sm relative group">
                        {logoUrl ? (
                          <>
                            <img src={logoUrl} alt="لوجو العيادة" className="w-full h-full object-contain p-1" />
                            <button
                              type="button"
                              onClick={() => setLogoUrl('')}
                              className="absolute inset-0 bg-slate-900/60 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-xs font-bold gap-1"
                            >
                              <Trash2 size={16} />
                              <span>حذف</span>
                            </button>
                          </>
                        ) : (
                          <div className="text-center p-2 text-slate-400">
                            <Upload size={24} className="mx-auto mb-1 text-slate-400" />
                            <span className="text-[10px] font-bold block">لا توجد صورة</span>
                          </div>
                        )}
                      </div>

                      {/* File Input Controls */}
                      <div className="space-y-2 flex-1 text-center sm:text-right">
                        <label className="cursor-pointer inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-xs transition-all">
                          <Upload size={16} />
                          <span>اختر صورة اللوجو من الجهاز</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleLogoFileUpload}
                            className="hidden"
                          />
                        </label>
                        <p className="text-[11px] text-slate-400">
                          تُمغط الصورة تلقائياً لسرعة التحميل. تظهر فوراً في بوستر الـ QR وإيصال الكشف.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Logo Option B: Preset Vector Icons */}
                {logoMode === 'preset' && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {PRESET_ICONS.map((item) => {
                      const IconComp = item.icon;
                      const isSelected = selectedPresetIcon === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setSelectedPresetIcon(item.id)}
                          className={`p-3 rounded-2xl border text-right transition-all flex items-center gap-3 ${
                            isSelected
                              ? 'bg-teal-50/80 border-teal-600 ring-2 ring-teal-500/20 shadow-2xs'
                              : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
                          }`}
                        >
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${item.bg}`}>
                            <IconComp size={20} />
                          </div>
                          <div className="flex-1 overflow-hidden">
                            <span className="font-bold text-xs text-slate-900 block truncate">{item.label}</span>
                            {isSelected && <span className="text-[10px] text-teal-700 font-bold block">محدد ✓</span>}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* SECTION 2: CLINIC TEXT DETAILS */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <h3 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                  <Building2 size={16} className="text-teal-600" />
                  <span>2. بيانات اسم العيادة والتخصص:</span>
                </h3>

                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">اسم العيادة الرسمي:</label>
                    <input
                      type="text"
                      value={clinicName}
                      onChange={(e) => setClinicName(e.target.value)}
                      placeholder="مثال: عيادة أمراض القلب والقسطرة التداخلية"
                      className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-teal-600 rounded-xl px-4 py-2.5 text-xs text-slate-900 font-bold"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">اسم الطبيب المعالج:</label>
                      <input
                        type="text"
                        value={doctorName}
                        onChange={(e) => setDoctorName(e.target.value)}
                        placeholder="د/ عمار محمود"
                        className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-teal-600 rounded-xl px-4 py-2.5 text-xs text-slate-900 font-bold"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">التخصص الطبي:</label>
                      <input
                        type="text"
                        value={specialty}
                        onChange={(e) => setSpecialty(e.target.value)}
                        placeholder="استشاري أمراض القلب والقسطرة"
                        className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-teal-600 rounded-xl px-4 py-2.5 text-xs text-slate-900"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 3: WORKING DAYS & CAPACITY LIMITS */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <h3 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                  <Calendar size={16} className="text-teal-600" />
                  <span>3. أيام العمل والحد الأقصى للمرضى يومياً:</span>
                </h3>

                <div className="space-y-2">
                  {workingDays.map((day, idx) => (
                    <div
                      key={day.dayOfWeek}
                      className={`p-3 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        day.enabled ? 'bg-teal-50/30 border-teal-200/80' : 'bg-slate-50 border-slate-200 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          id={`settings-day-${idx}`}
                          checked={day.enabled}
                          onChange={() => handleToggleDay(idx)}
                          className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500 cursor-pointer"
                        />
                        <label htmlFor={`settings-day-${idx}`} className="text-xs font-black text-slate-900 cursor-pointer">
                          يوم {day.dayNameAr}
                        </label>
                      </div>

                      {day.enabled ? (
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1 bg-white border border-slate-200 px-2 py-1 rounded-xl">
                            <Users size={13} className="text-slate-400" />
                            <span className="text-[11px] text-slate-500 font-bold">الحد الأقصى:</span>
                            <input
                              type="number"
                              min="1"
                              max="100"
                              value={day.maxCapacity}
                              onChange={(e) => handleCapacityChange(idx, parseInt(e.target.value) || 1)}
                              className="w-10 text-center text-xs font-black text-teal-900 bg-transparent focus:outline-none"
                            />
                            <span className="text-[10px] text-slate-400 font-bold">مريض</span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400">إجازة (غير متاح)</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* SECTION 4: RECEIPT INSTRUCTIONS */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="text-xs font-black text-slate-900 block">
                  تعليمات العيادة للمريض (تظهر في إيصال الكشف الرقمي):
                </label>
                <textarea
                  rows={2}
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="مثال: يرجى التواجد بالعيادة قبل الموعد بـ 15 دقيقة..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs text-slate-800 focus:bg-white focus:border-teal-600"
                />
              </div>
            </>
          ) : (
            /* EMBEDDED POSTER TAB (بوستر ה-QR الجاهز للطباعة) */
            <div className="flex flex-col items-center justify-center space-y-4 py-2">
              <div
                id="printable-settings-poster"
                className="w-full max-w-sm bg-white border-2 border-teal-600 rounded-3xl p-6 shadow-lg text-center space-y-5 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 left-0 h-2 bg-gradient-to-r from-teal-500 via-emerald-500 to-blue-500" />

                <div className="space-y-1.5 pt-1">
                  <div className="w-14 h-14 rounded-2xl bg-teal-50 text-teal-700 border border-teal-200 flex items-center justify-center mx-auto shadow-sm overflow-hidden p-1">
                    {renderLogoIcon()}
                  </div>
                  <h2 className="text-lg font-black text-slate-900 tracking-tight">{clinicName}</h2>
                  <p className="text-xs font-extrabold text-teal-700">{doctorName}</p>
                  <p className="text-[11px] text-slate-500 font-medium">{specialty}</p>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 inline-block">
                  <img
                    src={qrCodeImageUrl}
                    alt="كود الحجز"
                    className="w-44 h-44 mx-auto object-contain rounded-lg border border-slate-200 bg-white p-1"
                  />
                  <p className="text-[11px] font-black text-slate-800 mt-2 flex items-center justify-center gap-1">
                    <QrCode size={14} className="text-teal-600" />
                    <span>امسح الـ QR لحجز موعدك أونلاين</span>
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-mono font-bold">
                  <span>كود العيادة: {clinicCode}</span>
                  <span>Cardios EHR System</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handlePrintPoster}
                className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center gap-2 active:scale-98 no-print"
              >
                <Printer size={16} />
                <span>طباعة بوستر الـ QR الآن</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between shrink-0 no-print">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl transition-colors"
          >
            إغلاق
          </button>

          {activeTab === 'settings' && (
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || loading}
              className={`px-6 py-2.5 text-white font-bold text-xs rounded-xl transition-all shadow-sm flex items-center gap-2 ${
                savedSuccess
                  ? 'bg-emerald-600'
                  : 'bg-teal-600 hover:bg-teal-700 active:scale-98'
              }`}
            >
              {savedSuccess ? (
                <>
                  <CheckCircle2 size={16} />
                  <span>تم الحفظ ✓</span>
                </>
              ) : saving ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  <span>جاري الحفظ...</span>
                </>
              ) : (
                <>
                  <Save size={16} />
                  <span>حفظ التغييرات</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
