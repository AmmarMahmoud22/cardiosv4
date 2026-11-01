import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Appointment } from '../types/appointment';
import { format, addDays, startOfWeek } from 'date-fns';
import { Share2, Calendar as CalendarIcon, Plus, Settings, Printer } from 'lucide-react';
import AppointmentBookingModal from './AppointmentBookingModal';
import ClinicScheduleModal from './ClinicScheduleModal';
import ClinicBookingPosterModal from './ClinicBookingPosterModal';

export default function CalendarView({
  doctorId = 'doc-1',
  doctorName = 'د/ عمار محمود',
  clinicCode = 'CLINIC-AMMAR-101',
  isDemoSession = true
}: {
  doctorId?: string;
  doctorName?: string;
  clinicCode?: string;
  isDemoSession?: boolean;
}) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showPosterModal, setShowPosterModal] = useState(false);

  const startDate = startOfWeek(new Date(), { weekStartsOn: 6 }); // Saturday start for Arabic calendar

  useEffect(() => {
    const q = query(collection(db, 'appointments'));
    return onSnapshot(q, (snapshot) => {
      const allApps = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as (Appointment & { doctorId?: string })[];
      if (!isDemoSession && doctorId) {
        setAppointments(allApps.filter(a => a.doctorId === doctorId));
      } else {
        setAppointments(allApps);
      }
    });
  }, [doctorId, isDemoSession]);

  const updateStatus = async (id: string, status: string) => {
    await updateDoc(doc(db, 'appointments', id), { status });
  };

  return (
    <div className="bg-white p-5 sm:p-6 rounded-3xl shadow-xs border border-slate-200 mt-6 font-sans space-y-6" dir="rtl">
      {/* Top Header Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
            <CalendarIcon size={20} className="text-amber-600" />
            <span>جدول المواعيد والكشوفات (Calendar & Schedule)</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            متابعة المواعيد المحجوزة، طباعة بوستر الـ QR للعيادة، وضبط سعة الحجز اليومي
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowPosterModal(true)}
            className="bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-xs font-bold px-3.5 py-2.5 rounded-xl transition-all flex items-center gap-1.5 shrink-0"
          >
            <Printer size={16} className="text-teal-600" />
            <span>بوستر الـ QR للطباعة</span>
          </button>

          <button
            onClick={() => setShowScheduleModal(true)}
            className="bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold px-3.5 py-2.5 rounded-xl transition-all flex items-center gap-1.5 shrink-0"
          >
            <Settings size={16} className="text-amber-600" />
            <span>إعدادات السعة والأيام</span>
          </button>

          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition-all flex items-center gap-1.5 shrink-0"
          >
            <Plus size={16} />
            <span>حجز موعد مريض جديد</span>
          </button>
        </div>
      </div>

      {/* Modals */}
      {showModal && (
        <AppointmentBookingModal
          onClose={() => setShowModal(false)}
          doctorId={doctorId}
        />
      )}

      {showScheduleModal && (
        <ClinicScheduleModal
          isOpen={showScheduleModal}
          onClose={() => setShowScheduleModal(false)}
          doctorId={doctorId}
          doctorName={doctorName}
          clinicCode={clinicCode}
        />
      )}

      {showPosterModal && (
        <ClinicBookingPosterModal
          isOpen={showPosterModal}
          onClose={() => setShowPosterModal(false)}
          doctorName={doctorName}
          clinicCode={clinicCode}
        />
      )}

      {/* Calendar Days Grid */}
      <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
        {Array.from({ length: 7 }).map((_, i) => {
          const day = addDays(startDate, i);
          const dayApps = appointments.filter(a => {
            try {
              const targetDate = a.date || (a.startTime ? format(new Date(a.startTime), 'yyyy-MM-dd') : '');
              return targetDate === format(day, 'yyyy-MM-dd');
            } catch {
              return false;
            }
          });

          return (
            <div key={i} className="border border-slate-200 bg-slate-50/50 rounded-2xl p-3 min-h-[150px]">
              <div className="font-black text-xs text-slate-800 pb-2 mb-2 border-b border-slate-200 flex justify-between items-center">
                <span>{format(day, 'EEE dd')}</span>
                {dayApps.length > 0 && (
                  <span className="text-[10px] bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded-full font-bold">
                    {dayApps.length} كشوفات
                  </span>
                )}
              </div>

              {dayApps.length > 0 ? (
                dayApps.map(app => (
                  <div key={app.id} className="text-xs bg-white border border-amber-200/80 p-2.5 mb-2 rounded-xl shadow-2xs space-y-1">
                    <div className="flex items-center justify-between font-bold text-slate-900">
                      <span className="font-mono text-[11px] bg-amber-50 text-amber-900 px-1.5 py-0.2 rounded font-bold">
                        {app.queueNumber ? `دور #${app.queueNumber}` : (app.startTime ? format(new Date(app.startTime), 'HH:mm') : 'كشف')}
                      </span>
                      <button
                        onClick={() => {
                          const message = `*تذكير بموعد العيادة - Cardios Clinic* 🫀\nمرحباً ${app.patientName}،\nنود تذكيرك بموعدك القادم:\n📅 *الموعد:* ${app.date || format(new Date(app.startTime), 'yyyy/MM/dd')}\n🔢 *رقم الدور:* #${app.queueNumber || '1'}\n🩺 *نوع الزيارة:* ${app.type}\n📍 عيادة القلب والأوعية الدموية`;
                          window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
                        }}
                        className="text-emerald-600 hover:text-emerald-700 p-1 hover:bg-emerald-50 rounded-lg transition-colors"
                        title="إرسال تذكير عبر الواتساب"
                      >
                        <Share2 size={13} />
                      </button>
                    </div>
                    <p className="font-black text-slate-900 truncate">{app.patientName}</p>
                    {app.patientPhone && (
                      <p className="text-[10px] text-slate-400 font-mono">{app.patientPhone}</p>
                    )}
                    <select
                      defaultValue={app.status || 'Scheduled'}
                      onChange={(e) => updateStatus(app.id, e.target.value)}
                      className="w-full mt-1 text-[10px] bg-slate-50 border border-slate-200 rounded-lg p-1 text-slate-700 font-bold focus:ring-1 focus:ring-amber-500"
                    >
                      <option value="Scheduled">مجدول (Scheduled)</option>
                      <option value="Completed">تم الحضور (Completed)</option>
                      <option value="Cancelled">ملغي (Cancelled)</option>
                      <option value="No-Show">لم يحضر (No-Show)</option>
                    </select>
                  </div>
                ))
              ) : (
                <div className="text-[11px] text-slate-400 text-center py-8 font-medium">
                  لا توجد كشوفات
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
