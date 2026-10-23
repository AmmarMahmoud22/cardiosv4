import React, {useState, useEffect} from 'react';
import {collection, query, onSnapshot, updateDoc, doc} from 'firebase/firestore';
import {db} from '../lib/firebase';
import {Appointment} from '../types/appointment';
import {format, addDays, startOfWeek} from 'date-fns';
import {Share2} from 'lucide-react';
import AppointmentBookingModal from './AppointmentBookingModal';

export default function CalendarView() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [showModal, setShowModal] = useState(false);
  const startDate = startOfWeek(new Date());

  useEffect(() => {
    const q = query(collection(db, 'appointments'));
    return onSnapshot(q, (snapshot) => {
      setAppointments(snapshot.docs.map(doc => ({id: doc.id, ...doc.data()})) as Appointment[]);
    });
  }, []);

  const updateStatus = async (id: string, status: string) => {
      await updateDoc(doc(db, 'appointments', id), {status});
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow mt-6">
      <div className="flex justify-between mb-4">
        <h2 className="text-lg font-semibold">Appointment Calendar</h2>
        <button onClick={() => setShowModal(true)} className="bg-blue-600 text-white px-4 py-2 rounded">+ Book Appointment</button>
      </div>
      {showModal && <AppointmentBookingModal onClose={() => setShowModal(false)} />}
      <div className="grid grid-cols-7 gap-2">
        {Array.from({length: 7}).map((_, i) => {
          const day = addDays(startDate, i);
          const dayApps = appointments.filter(a => format(new Date(a.startTime), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd'));
          
          return (
            <div key={i} className="border p-2 min-h-[150px]">
              <div className="font-bold text-sm mb-2">{format(day, 'EEE dd')}</div>
              {dayApps.map(app => (
                <div key={app.id} className="text-xs bg-blue-50 border border-blue-200 p-2 mb-1.5 rounded-lg shadow-2xs">
                  <div className="flex items-center justify-between font-semibold text-blue-900">
                    <span>{format(new Date(app.startTime), 'HH:mm')}</span>
                    <button
                      onClick={() => {
                        const message = `*تذكير بموعد العيادة - Cardios Clinic* 🫀\nمرحباً ${app.patientName}،\nنود تذكيرك بموعدك القادم:\n📅 *الموعد:* ${format(new Date(app.startTime), 'yyyy/MM/dd - hh:mm a')}\n🩺 *نوع الزيارة:* ${app.type}\n📍 عيادة Cardios لأمراض القلب والأوعية الدموية`;
                        window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
                      }}
                      className="text-emerald-600 hover:text-emerald-700 p-0.5 hover:bg-emerald-50 rounded"
                      title="Send WhatsApp Reminder"
                    >
                      <Share2 size={13} />
                    </button>
                  </div>
                  <p className="font-bold text-gray-800 truncate mt-0.5">{app.patientName}</p>
                  <p className="text-[10px] text-gray-500">{app.type}</p>
                  <select defaultValue={app.status} onChange={(e) => updateStatus(app.id, e.target.value)} className="w-full mt-1.5 text-[10px] bg-white border border-gray-300 rounded p-1">
                      <option>Scheduled</option>
                      <option>Completed</option>
                      <option>Cancelled</option>
                      <option>No-Show</option>
                  </select>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
