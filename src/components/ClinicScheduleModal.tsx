import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, Users, CheckCircle2, Save, RefreshCw } from 'lucide-react';
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

export default function ClinicScheduleModal({
  isOpen,
  onClose,
  doctorId = 'doc-1',
  doctorName = 'د/ عمار محمود',
  clinicCode = 'CLINIC-AMMAR-101',
  onSaveSuccess
}: {
  isOpen: boolean;
  onClose: () => void;
  doctorId?: string;
  doctorName?: string;
  clinicCode?: string;
  onSaveSuccess?: () => void;
}) {
  const [workingDays, setWorkingDays] = useState<DoctorWorkingDay[]>(DEFAULT_DAYS);
  const [instructions, setInstructions] = useState<string>(
    'يرجى التواجد بالعيادة قبل موعد الدور بـ 15 دقيقة مع إحضار كافة الفحوصات والتحاليل الطبية السابقة.'
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;

    const fetchSchedule = async () => {
      setLoading(true);
      try {
        const snap = await getDoc(doc(db, 'doctor_schedules', doctorId));
        if (snap.exists()) {
          const data = snap.data() as DoctorScheduleSettings;
          if (data.workingDays && data.workingDays.length > 0) {
            setWorkingDays(data.workingDays);
          }
          if (data.instructions) {
            setInstructions(data.instructions);
          }
        }
      } catch (err) {
        console.warn('Error fetching doctor schedule settings:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSchedule();
  }, [isOpen, doctorId]);

  if (!isOpen) return null;

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

  const handleTimeChange = (index: number, field: 'startTime' | 'endTime', val: string) => {
    const updated = [...workingDays];
    updated[index][field] = val;
    setWorkingDays(updated);
  };

  const handleSave = async () => {
    setSaving(true);
    setSavedSuccess(false);

    try {
      const scheduleData: DoctorScheduleSettings = {
        doctorId,
        doctorName,
        clinicName: 'عيادة أمراض القلب والقسطرة',
        clinicCode,
        workingDays,
        instructions,
        updatedAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'doctor_schedules', doctorId), scheduleData, { merge: true });

      setSavedSuccess(true);
      if (onSaveSuccess) onSaveSuccess();
      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 800);
    } catch (err) {
      console.error('Error saving doctor schedule:', err);
      alert('حدث خطأ أثناء حفظ جدول المواعيد، يرجى المحاولة مرة أخرى.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 font-sans text-slate-800" dir="rtl">
      <div className="bg-white border border-slate-200 max-w-2xl w-full rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
              <Calendar size={20} />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900">إعدادات مواعيد وسعة الكشف بالعيادة</h2>
              <p className="text-xs text-slate-500">تحديد أيام العمل، أقصى عدد للمرضى يومياً، وساعات الدوام</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-6 flex-1">
          {loading ? (
            <div className="py-12 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
              <RefreshCw size={24} className="animate-spin text-amber-600" />
              <span>جاري تحميل إعدادات جدول العيادة...</span>
            </div>
          ) : (
            <>
              {/* Working Days & Capacities Grid */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                    <Users size={16} className="text-amber-600" />
                    <span>أيام العمل والعدد المسموح به لكل يوم:</span>
                  </h3>
                  <span className="text-[11px] text-slate-400">حدد الأيام الفعالة والأقصى للحجوزات</span>
                </div>

                <div className="space-y-2">
                  {workingDays.map((day, idx) => (
                    <div
                      key={day.dayOfWeek}
                      className={`p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        day.enabled
                          ? 'bg-amber-50/40 border-amber-200/80'
                          : 'bg-slate-50 border-slate-200 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-[130px]">
                        <input
                          type="checkbox"
                          id={`day-check-${idx}`}
                          checked={day.enabled}
                          onChange={() => handleToggleDay(idx)}
                          className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500 cursor-pointer"
                        />
                        <label htmlFor={`day-check-${idx}`} className="text-xs font-black text-slate-900 cursor-pointer">
                          يوم {day.dayNameAr}
                        </label>
                      </div>

                      {day.enabled ? (
                        <div className="flex flex-wrap items-center gap-3">
                          {/* Capacity Input */}
                          <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-2.5 py-1 rounded-xl shadow-2xs">
                            <Users size={14} className="text-slate-400" />
                            <span className="text-[11px] text-slate-500 font-bold">الحد الأقصى:</span>
                            <input
                              type="number"
                              min="1"
                              max="100"
                              value={day.maxCapacity}
                              onChange={(e) => handleCapacityChange(idx, parseInt(e.target.value) || 1)}
                              className="w-12 text-center text-xs font-black text-amber-900 bg-transparent focus:outline-none"
                            />
                            <span className="text-[10px] text-slate-400 font-bold">مريض</span>
                          </div>

                          {/* Times Input */}
                          <div className="flex items-center gap-1 bg-white border border-slate-200 px-2.5 py-1 rounded-xl shadow-2xs">
                            <Clock size={14} className="text-slate-400" />
                            <input
                              type="time"
                              value={day.startTime}
                              onChange={(e) => handleTimeChange(idx, 'startTime', e.target.value)}
                              className="text-xs font-bold text-slate-700 bg-transparent focus:outline-none"
                            />
                            <span className="text-[10px] text-slate-400 font-bold">إلى</span>
                            <input
                              type="time"
                              value={day.endTime}
                              onChange={(e) => handleTimeChange(idx, 'endTime', e.target.value)}
                              className="text-xs font-bold text-slate-700 bg-transparent focus:outline-none"
                            />
                          </div>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 font-medium">غير متاح للحجز (إجازة)</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Clinic Custom Instructions for Patients */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="text-xs font-black text-slate-900 block">
                  تعليمات العيادة للمريض (تظهر في إيصال الكشف الرقمي):
                </label>
                <textarea
                  rows={2}
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="مثال: يرجى التواجد قبل الموعد بـ 15 دقيقة مع إحضار التحاليل السابقة..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs text-slate-800 focus:bg-white focus:border-amber-500"
                />
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl transition-colors"
          >
            إلغاء
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loading}
            className={`px-6 py-2.5 text-white font-bold text-xs rounded-xl transition-all shadow-sm flex items-center gap-2 ${
              savedSuccess
                ? 'bg-emerald-600'
                : 'bg-amber-600 hover:bg-amber-700 active:scale-98'
            }`}
          >
            {savedSuccess ? (
              <>
                <CheckCircle2 size={16} />
                <span>تم حفظ الجدول بنجاح ✓</span>
              </>
            ) : saving ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                <span>جاري الحفظ...</span>
              </>
            ) : (
              <>
                <Save size={16} />
                <span>حفظ التعديلات</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
