import React, {useState, useEffect} from 'react';
import {addDoc, collection, getDocs} from 'firebase/firestore';
import {db} from '../lib/firebase';
import {Patient} from '../types/ehr';

export default function AppointmentBookingModal({onClose}: {onClose: () => void}) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientId, setPatientId] = useState('');
  const [type, setType] = useState<'Consultation' | 'Follow-up' | 'Echo'>('Consultation');
  const [startTime, setStartTime] = useState('');

  useEffect(() => {
    const fetchPatients = async () => {
      const q = collection(db, 'patients');
      const snapshot = await getDocs(q);
      setPatients(snapshot.docs.map(doc => ({id: doc.id, ...doc.data()})) as Patient[]);
    };
    fetchPatients();
  }, []);

  const saveAppointment = async () => {
    if (patientId && startTime) {
      const patient = patients.find(p => p.id === patientId);
      await addDoc(collection(db, 'appointments'), {
        patientId,
        patientName: patient?.name,
        startTime,
        type,
        status: 'Scheduled'
      });
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
      <div className="bg-white p-6 rounded-lg shadow w-96">
        <h2 className="text-xl font-bold mb-4">Book Appointment</h2>
        <select value={patientId} onChange={(e) => setPatientId(e.target.value)} className="w-full p-2 border rounded mb-2">
            <option value="">Select Patient</option>
            {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select value={type} onChange={(e) => setType(e.target.value as any)} className="w-full p-2 border rounded mb-2">
            <option value="Consultation">Consultation</option>
            <option value="Follow-up">Follow-up</option>
            <option value="Echo">Echo/ECG Exam</option>
        </select>
        <input type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="w-full p-2 border rounded mb-4" />
        <div className="flex gap-2">
            <button onClick={saveAppointment} className="bg-blue-600 text-white px-4 py-2 rounded">Save</button>
            <button onClick={onClose} className="bg-gray-400 text-white px-4 py-2 rounded">Cancel</button>
        </div>
      </div>
    </div>
  );
}
