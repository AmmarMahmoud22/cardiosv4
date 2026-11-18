import React, {useState, useEffect} from 'react';
import {X, UserCheck} from 'lucide-react';
import {collection, getDocs, query, where} from 'firebase/firestore';
import {db} from '../lib/firebase';
import CardiologyReport from './CardiologyReport';

interface Props {
  onClose: () => void;
  doctorId?: string;
  doctorName?: string;
  clinicName?: string;
  specialty?: string;
}

export default function ReportsModal({onClose, doctorId, doctorName, clinicName, specialty}: Props) {
  const [patients, setPatients] = useState<{id: string; name: string}[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<{id: string; name: string} | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPatients = async () => {
      setLoading(true);
      try {
        const ref = doctorId
          ? query(collection(db, 'patients'), where('doctorId', '==', doctorId))
          : collection(db, 'patients');
        const snap = await getDocs(ref);
        const list = snap.docs.map(d => ({id: d.id, name: d.data().name || 'Patient ' + d.id}));
        setPatients(list);
        if (list.length > 0) {
          setSelectedPatient(list[0]);
        } else {
          setSelectedPatient(null);
        }
      } catch (e) {
        console.warn('Error fetching patients for reports:', e);
        setPatients([]);
        setSelectedPatient(null);
      } finally {
        setLoading(false);
      }
    };
    fetchPatients();
  }, [doctorId]);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Top Bar */}
        <div className="p-4 bg-gray-900 text-white flex items-center justify-between no-print shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <UserCheck size={18} className="text-blue-400" />
              <label className="text-xs font-semibold text-gray-300">Select Patient:</label>
            </div>
            <select
              value={selectedPatient?.id || ''}
              onChange={(e) => {
                const found = patients.find(p => p.id === e.target.value);
                if (found) setSelectedPatient(found);
              }}
              disabled={patients.length === 0}
              className="bg-gray-800 text-white text-xs px-3 py-1.5 rounded-lg border border-gray-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium"
            >
              {patients.length === 0 ? (
                <option value="">لا يوجد مرضى مسجلين</option>
              ) : (
                patients.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} (ID: {p.id})
                  </option>
                ))
              )}
            </select>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-800 text-gray-300 hover:text-white rounded-lg transition-colors"
            title="Close dialog"
          >
            <X size={20} />
          </button>
        </div>

        {/* Report Content Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-gray-50">
          {selectedPatient ? (
            <CardiologyReport
              patientName={selectedPatient.name}
              patientId={selectedPatient.id}
              doctorName={doctorName}
              clinicName={clinicName}
              specialty={specialty}
            />
          ) : (
            <div className="p-12 text-center text-gray-500 text-sm">
              {loading ? 'جاري تحميل قائمة المرضى...' : 'لا يوجد مرضى مسجلين بالعيادة لإصدار تقارير إيكو لهم حالياً.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
