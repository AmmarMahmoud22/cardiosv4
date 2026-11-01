import React, {useState, useEffect} from 'react';
import {addDoc, collection, getDocs} from 'firebase/firestore';
import {db} from '../lib/firebase';
import {Patient} from '../types/ehr';
import {Calendar as CalendarIcon, X} from 'lucide-react';

export default function AppointmentBookingModal({
  onClose,
  doctorId = 'doc-1'
}: {
  onClose: () => void;
  doctorId?: string;
}) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientId, setPatientId] = useState('');
  const [type, setType] = useState<'كشف جديد' | 'استشارة ومتابعة' | 'فحص إيكو / رسم قلب'>('كشف جديد');
  const [startTime, setStartTime] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchPatients = async () => {
      const q = collection(db, 'patients');
      const snapshot = await getDocs(q);
      const allPatients = snapshot.docs.map(doc => ({id: doc.id, ...doc.data()})) as Patient[];
      if (doctorId) {
        setPatients(allPatients.filter((p: any) => p.doctorId === doctorId || (!p.doctorId && doctorId === 'doc-1')));
      } else {
        setPatients(allPatients);
      }
    };
    fetchPatients();
  }, [doctorId]);

  const saveAppointment = async () => {
    if (patientId && startTime) {
      setSaving(true);
      try {
        const patient = patients.find(p => p.id === patientId);
        await addDoc(collection(db, 'appointments'), {
          patientId,
          patientName: patient?.name,
          doctorId,
          startTime,
          type,
          status: 'Scheduled',
          createdAt: new Date().toISOString()
        });
        onClose();
      } finally {
        setSaving(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 font-sans" dir="rtl">
      <div className="bg-white p-6 rounded-3xl shadow-xl max-w-md w-full border border-slate-200 animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold border border-blue-100">
              <CalendarIcon size={20} />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900">حجز موعد مريض جديد</h2>
              <p className="text-[11px] text-slate-400">إضافة موعد لجدول كشوفات واستشارات العيادة</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">اختر المريض من سجل العيادة *</label>
            <select
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- اختر مريض --</option>
              {patients.map(p => (
                <option key={p.id} value={p.id}>{p.name} ({p.dob || 'بدون تاريخ'})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">نوع الكشف أو الزيارة *</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as any)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-blue-500"
            >
              <option value="كشف جديد">كشف جديد (First Consultation)</option>
              <option value="استشارة ومتابعة">استشارة ومتابعة (Follow-up)</option>
              <option value="فحص إيكو / رسم قلب">فحص إيكو / رسم قلب (ECHO / ECG Exam)</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">تاريخ ووقت الموعد *</label>
            <input
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 mt-6 pt-4 border-t border-slate-100">
          <button
            onClick={saveAppointment}
            disabled={!patientId || !startTime || saving}
            className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all disabled:opacity-50"
          >
            {saving ? 'جاري الحجز...' : 'تأكيد وحفظ الموعد'}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all"
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}

