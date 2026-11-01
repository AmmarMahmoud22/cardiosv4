import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  User,
  Phone,
  CheckCircle2,
  AlertTriangle,
  Users,
  HeartPulse,
  Stethoscope,
  Activity,
  Building2,
  ShieldCheck,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  doc,
  getDoc
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { DoctorScheduleSettings, DoctorWorkingDay, WaitlistEntry } from '../types/appointment';
import DigitalReceiptModal, { ReceiptData } from './DigitalReceiptModal';
import { format, addDays } from 'date-fns';
import { ar } from 'date-fns/locale';

export default function PatientBookingView({
  clinicCode: urlClinicCode = 'CLINIC-AMMAR-101',
  onBackToMain
}: {
  clinicCode?: string;
  onBackToMain?: () => void;
}) {
  const [clinicCode] = useState<string>(urlClinicCode);
  const [schedule, setSchedule] = useState<DoctorScheduleSettings | null>(null);
  const [availableDays, setAvailableDays] = useState<Array<{
    dateStr: string;
    dayNameAr: string;
    formattedDisplay: string;
    maxCapacity: number;
    currentBooked: number;
    remaining: number;
    isFull: boolean;
    dayOfWeek: number;
  }>>([]);

  const [selectedDateStr, setSelectedDateStr] = useState<string>('');
  const [patientName, setPatientName] = useState<string>('');
  const [patientPhone, setPatientPhone] = useState<string>('');
  const [patientAge, setPatientAge] = useState<string>('');
  const [visitType, setVisitType] = useState<'كشف عيادة' | 'متابعة' | 'فحص إيكو'>('كشف عيادة');

  const [loadingDays, setLoadingDays] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [showReceipt, setShowReceipt] = useState<boolean>(false);

  // Waitlist state
  const [isWaitlistMode, setIsWaitlistMode] = useState<boolean>(false);
  const [waitlistAddedSuccess, setWaitlistAddedSuccess] = useState<boolean>(false);

  useEffect(() => {
    const loadScheduleAndSlots = async () => {
      setLoadingDays(true);
      try {
        const docId = 'doc-1';
        const schedSnap = await getDoc(doc(db, 'doctor_schedules', docId));

        let currentSchedule: DoctorScheduleSettings;
        if (schedSnap.exists()) {
          currentSchedule = schedSnap.data() as DoctorScheduleSettings;
        } else {
          currentSchedule = {
            doctorId: 'doc-1',
            doctorName: 'د/ عمار محمود',
            clinicName: 'عيادة أمراض القلب والقسطرة',
            specialty: 'استشاري أمراض القلب والقسطرة التداخلية',
            clinicCode,
            workingDays: [
              { dayOfWeek: 6, dayNameAr: 'السبت', enabled: true, maxCapacity: 10, startTime: '16:00', endTime: '21:00' },
              { dayOfWeek: 0, dayNameAr: 'الأحد', enabled: true, maxCapacity: 10, startTime: '16:00', endTime: '21:00' },
              { dayOfWeek: 2, dayNameAr: 'الثلاثاء', enabled: true, maxCapacity: 10, startTime: '16:00', endTime: '21:00' },
              { dayOfWeek: 4, dayNameAr: 'الخميس', enabled: true, maxCapacity: 12, startTime: '16:00', endTime: '22:00' }
            ],
            instructions: 'يرجى التواجد قبل الموعد بـ 15 دقيقة وإحضار التحاليل والأشعة السابقة.'
          };
        }
        setSchedule(currentSchedule);

        const appointmentsRef = collection(db, 'appointments');
        const appSnap = await getDocs(appointmentsRef);
        const allAppointments = appSnap.docs.map(d => d.data());

        const daysList = [];
        const today = new Date();

        for (let i = 0; i < 14; i++) {
          const checkDate = addDays(today, i);
          const dayOfWeek = checkDate.getDay();
          const matchingConfig = currentSchedule.workingDays?.find(w => w.dayOfWeek === dayOfWeek && w.enabled);

          if (matchingConfig) {
            const dateStr = format(checkDate, 'yyyy-MM-dd');
            const bookedCount = allAppointments.filter((a: any) => a.date === dateStr || (a.startTime && a.startTime.startsWith(dateStr))).length;
            const maxCap = matchingConfig.maxCapacity || 10;
            const remaining = Math.max(0, maxCap - bookedCount);
            const isFull = remaining === 0;

            daysList.push({
              dateStr,
              dayOfWeek,
              dayNameAr: matchingConfig.dayNameAr,
              formattedDisplay: format(checkDate, 'EEEE d MMMM', { locale: ar }),
              maxCapacity: maxCap,
              currentBooked: bookedCount,
              remaining,
              isFull
            });
          }
        }

        setAvailableDays(daysList);
        if (daysList.length > 0) {
          const firstAvailable = daysList.find(d => !d.isFull) || daysList[0];
          setSelectedDateStr(firstAvailable.dateStr);
          setIsWaitlistMode(firstAvailable.isFull);
        }
      } catch (err) {
        console.error('Error loading clinic slots:', err);
      } finally {
        setLoadingDays(false);
      }
    };

    loadScheduleAndSlots();
  }, [clinicCode]);

  const handleDaySelect = (dayObj: typeof availableDays[0]) => {
    setSelectedDateStr(dayObj.dateStr);
    setIsWaitlistMode(dayObj.isFull);
    setWaitlistAddedSuccess(false);
  };

  const renderHeaderLogo = () => {
    if (schedule?.clinicLogoUrl) {
      return (
        <img
          src={schedule.clinicLogoUrl}
          alt="لوجو العيادة"
          className="w-14 h-14 object-contain mx-auto rounded-2xl bg-white p-1 shadow-md border border-white/30"
        />
      );
    }
    switch (schedule?.clinicLogoIcon) {
      case 'Stethoscope': return <Stethoscope size={32} />;
      case 'Activity': return <Activity size={32} />;
      case 'Building2': return <Building2 size={32} />;
      case 'ShieldCheck': return <ShieldCheck size={32} />;
      case 'Sparkles': return <Sparkles size={32} />;
      default: return <HeartPulse size={32} />;
    }
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientName.trim() || !patientPhone.trim() || !patientAge.trim() || !selectedDateStr) {
      alert('يرجى استكمال جميع البيانات المطلوبة (الاسم، الهاتف، والسن).');
      return;
    }

    setSubmitting(true);

    try {
      const selectedDayObj = availableDays.find(d => d.dateStr === selectedDateStr);

      if (isWaitlistMode || selectedDayObj?.isFull) {
        const waitlistRef = collection(db, 'waitlists');
        const nextAvailableDay = availableDays.find(d => d.dateStr > selectedDateStr && !d.isFull) || availableDays[0];

        const waitlistEntry: Omit<WaitlistEntry, 'id'> = {
          doctorId: schedule?.doctorId || 'doc-1',
          clinicCode,
          patientName: patientName.trim(),
          patientPhone: patientPhone.trim(),
          patientAge: patientAge.trim(),
          requestedDate: selectedDateStr,
          suggestedDate: nextAvailableDay ? nextAvailableDay.dateStr : selectedDateStr,
          status: 'Pending',
          createdAt: new Date().toISOString()
        };

        await addDoc(waitlistRef, waitlistEntry);
        setWaitlistAddedSuccess(true);
        setSubmitting(false);
        return;
      }

      const appointmentsRef = collection(db, 'appointments');
      const q = query(appointmentsRef, where('date', '==', selectedDateStr));
      const existingSnap = await getDocs(q);
      const queueNumber = existingSnap.size + 1;

      const newAppointment = {
        doctorId: schedule?.doctorId || 'doc-1',
        clinicCode,
        patientName: patientName.trim(),
        patientPhone: patientPhone.trim(),
        patientAge: patientAge.trim(),
        date: selectedDateStr,
        startTime: `${selectedDateStr}T16:00:00`,
        queueNumber,
        type: visitType,
        status: 'Scheduled',
        createdAt: new Date().toISOString()
      };

      const docRef = await addDoc(appointmentsRef, newAppointment);

      const receipt: ReceiptData = {
        appointmentId: docRef.id,
        queueNumber,
        patientName: patientName.trim(),
        patientPhone: patientPhone.trim(),
        patientAge: patientAge.trim(),
        dateStr: selectedDateStr,
        doctorName: schedule?.doctorName || 'د/ عمار محمود',
        clinicName: schedule?.clinicName || 'عيادة أمراض القلب والقسطرة',
        clinicCode,
        clinicLogoUrl: schedule?.clinicLogoUrl,
        clinicLogoIcon: schedule?.clinicLogoIcon,
        visitType,
        instructions: schedule?.instructions
      };

      setReceiptData(receipt);
      setShowReceipt(true);
    } catch (err) {
      console.error('Error completing booking:', err);
      alert('حدث خطأ أثناء حفظ الموعد، يرجى إعادة المحاولة.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 font-sans p-3 sm:p-6 flex flex-col items-center justify-center text-slate-800" dir="rtl">
      <div className="w-full max-w-xl bg-white border border-slate-200 rounded-3xl shadow-xl overflow-hidden my-4">
        {/* Top Header Card */}
        <div className="bg-gradient-to-r from-teal-700 via-teal-600 to-blue-700 text-white p-6 sm:p-8 text-center space-y-2 relative overflow-hidden">
          <div className="absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-r from-emerald-400 to-amber-300" />
          {onBackToMain && (
            <button
              onClick={onBackToMain}
              className="absolute top-4 left-4 bg-white/10 hover:bg-white/20 text-white text-xs px-3 py-1.5 rounded-xl transition-colors font-bold"
            >
              &larr; الصفحة الرئيسية
            </button>
          )}

          <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md text-white border border-white/20 flex items-center justify-center mx-auto shadow-inner p-1">
            {renderHeaderLogo()}
          </div>

          <h1 className="text-xl sm:text-2xl font-black">{schedule?.clinicName || 'عيادة أمراض القلب والقسطرة'}</h1>
          <p className="text-xs sm:text-sm font-bold text-teal-100">{schedule?.doctorName || 'د/ عمار محمود'}</p>
          <div className="inline-block bg-white/15 backdrop-blur-xs px-3 py-1 rounded-full text-[11px] font-mono font-bold mt-1">
            كود العيادة: {clinicCode}
          </div>
        </div>

        {/* Form Container */}
        <div className="p-5 sm:p-8 space-y-6">
          <div className="text-center space-y-1 pb-2 border-b border-slate-100">
            <h2 className="text-base sm:text-lg font-black text-slate-900">حجز موعد جديد بالعيادة أونلاين</h2>
            <p className="text-xs text-slate-500">اختر اليوم المناسب وأدخل بياناتك لاستلام إيصال الكشف ورقم الدور فوراً</p>
          </div>

          {loadingDays ? (
            <div className="py-12 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
              <RefreshCw size={24} className="animate-spin text-teal-600" />
              <span>جاري التحقق من الأيام المتاحة والأعداد المتبقية...</span>
            </div>
          ) : (
            <form onSubmit={handleBookingSubmit} className="space-y-6">
              {/* Step 1: Select Day */}
              <div className="space-y-3">
                <label className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                  <Calendar size={16} className="text-teal-600" />
                  <span>1. اختر يوم الكشف المفضل:</span>
                </label>

                {availableDays.length === 0 ? (
                  <div className="p-4 bg-amber-50 text-amber-800 rounded-2xl text-xs font-bold text-center">
                    لا توجد أيام متاح بها حجز حالياً. يرجى التواصل مع العيادة مباشرة.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {availableDays.map((day) => {
                      const isSelected = selectedDateStr === day.dateStr;
                      return (
                        <button
                          key={day.dateStr}
                          type="button"
                          onClick={() => handleDaySelect(day)}
                          className={`p-3.5 rounded-2xl border text-right transition-all flex flex-col justify-between space-y-2 ${
                            isSelected
                              ? 'bg-teal-50 border-teal-600 ring-2 ring-teal-500/20 shadow-xs'
                              : 'bg-slate-50 hover:bg-slate-100/80 border-slate-200'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-black text-xs text-slate-900">{day.formattedDisplay}</span>
                            {day.isFull ? (
                              <span className="text-[10px] bg-rose-100 text-rose-800 font-bold px-2 py-0.5 rounded-full">
                                مكتمل العدد
                              </span>
                            ) : (
                              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                                متبقي {day.remaining} مكان
                              </span>
                            )}
                          </div>

                          <div className="text-[10px] text-slate-500 font-medium flex items-center justify-between">
                            <span>السعة: {day.currentBooked} / {day.maxCapacity} مرضى</span>
                            {isSelected && <span className="font-bold text-teal-700">محدد ✓</span>}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Waitlist Warning Notice if Selected Day is Full */}
              {isWaitlistMode && !waitlistAddedSuccess && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs space-y-2">
                  <div className="flex items-center gap-2 text-amber-900 font-black">
                    <AlertTriangle size={18} className="text-amber-600 shrink-0" />
                    <span>هذا اليوم مكتمل العدد بالطاقة القصوى (100%)</span>
                  </div>
                  <p className="text-amber-800 leading-relaxed text-[11px]">
                    يمكنك كتابة بياناتك أدناه للانضمام لـ <strong>قائمة الانتظار التلقائية</strong> وسيتم تسكينك في حال إلغاء أي حجز أو نقل موعدك لليوم المتاح القادم.
                  </p>
                </div>
              )}

              {/* Waitlist Success Screen */}
              {waitlistAddedSuccess && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-center space-y-3">
                  <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 size={28} />
                  </div>
                  <h3 className="font-black text-emerald-950 text-sm">تم إدراجك في قائمة الانتظار بنجاح!</h3>
                  <p className="text-xs text-emerald-800 leading-relaxed">
                    نشكرك {patientName}. تم إرسال طلبك لإدارة العيادة وسيتواصل معك سكرتير العيادة فور إتاحة مكان أو عند تأكيد الموعد القادم.
                  </p>
                  <button
                    type="button"
                    onClick={() => setWaitlistAddedSuccess(false)}
                    className="text-xs text-emerald-700 underline font-bold"
                  >
                    إجراء حجز ليوم آخر
                  </button>
                </div>
              )}

              {!waitlistAddedSuccess && (
                <>
                  {/* Step 2: Patient Info */}
                  <div className="space-y-3 pt-2 border-t border-slate-100">
                    <label className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                      <User size={16} className="text-teal-600" />
                      <span>2. أدخل بيانات المريض الكشف:</span>
                    </label>

                    <div className="space-y-3">
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">الاسم الكامل:</label>
                        <input
                          type="text"
                          required
                          value={patientName}
                          onChange={(e) => setPatientName(e.target.value)}
                          placeholder="مثال: أحمد محمد علي"
                          className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-teal-600 rounded-xl px-4 py-2.5 text-xs text-slate-900"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] font-bold text-slate-700 block mb-1">رقم التليفون / الموبايل:</label>
                          <input
                            type="tel"
                            required
                            value={patientPhone}
                            onChange={(e) => setPatientPhone(e.target.value)}
                            placeholder="01012345678"
                            className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-teal-600 rounded-xl px-4 py-2.5 text-xs text-slate-900 font-mono"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-bold text-slate-700 block mb-1">السن / العمر (بالسنوات):</label>
                          <input
                            type="number"
                            required
                            min="1"
                            max="110"
                            value={patientAge}
                            onChange={(e) => setPatientAge(e.target.value)}
                            placeholder="مثال: 45"
                            className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-teal-600 rounded-xl px-4 py-2.5 text-xs text-slate-900 font-mono"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">نوع الكشف / الزيارة:</label>
                        <div className="grid grid-cols-3 gap-2">
                          {(['كشف عيادة', 'متابعة', 'فحص إيكو'] as const).map((t) => (
                            <button
                              key={t}
                              type="button"
                              onClick={() => setVisitType(t)}
                              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                                visitType === t
                                  ? 'bg-teal-600 text-white border-teal-600 shadow-2xs'
                                  : 'bg-slate-50 border-slate-200 text-slate-700'
                              }`}
                            >
                              {t}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={submitting}
                    className={`w-full py-3.5 text-white font-bold text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-2 ${
                      isWaitlistMode
                        ? 'bg-amber-600 hover:bg-amber-700'
                        : 'bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-700 hover:from-teal-700 hover:to-emerald-700 active:scale-98'
                    }`}
                  >
                    {submitting ? (
                      <>
                        <RefreshCw size={18} className="animate-spin" />
                        <span>جاري حفظ البيانات والمزامنة...</span>
                      </>
                    ) : isWaitlistMode ? (
                      <>
                        <Users size={18} />
                        <span>الانضمام لقائمة الانتظار</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={18} />
                        <span>تأكيد الحجز واستخراج إيصال الكشف</span>
                      </>
                    )}
                  </button>
                </>
              )}
            </form>
          )}
        </div>
      </div>

      {/* Digital Examination Receipt Modal */}
      <DigitalReceiptModal
        isOpen={showReceipt}
        onClose={() => setShowReceipt(false)}
        data={receiptData}
      />
    </div>
  );
}
