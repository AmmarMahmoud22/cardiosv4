import React, {useState, useEffect} from 'react';
import {addDoc, collection, query, orderBy, onSnapshot, doc, getDoc} from 'firebase/firestore';
import {db} from '../lib/firebase';
import {LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer} from 'recharts';
import {QrCode} from 'lucide-react';
import LabResultsModal from './LabResultsModal';
import CardiologyReport from './CardiologyReport';
import GeminiChat from './GeminiChat';
import Chat from './Chat';
import ReferralModal from './ReferralModal';
import BillingModal from './BillingModal';
import PatientQRCardModal from './PatientQRCardModal';

export default function PatientProfile({patientId, onBack}: {patientId: string, onBack: () => void}) {
  const [patient, setPatient] = useState<any>(null);

  useEffect(() => {
    const fetchPatient = async () => {
      const docRef = doc(db, 'patients', patientId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setPatient({id: docSnap.id, ...docSnap.data()});
      }
    };
    fetchPatient();
  }, [patientId]);
  const [medications, setMedications] = useState<{name: string, dosage: string}[]>([]);
  const [vitals, setVitals] = useState<{timestamp: string, systolic: number, diastolic: number}[]>([]);
  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');
  const [saving, setSaving] = useState(false);
  const [medName, setMedName] = useState('');
  const [medDosage, setMedDosage] = useState('');
  const [showLabModal, setShowLabModal] = useState(false);
  const [showReferralModal, setShowReferralModal] = useState(false);
  const [showBillingModal, setShowBillingModal] = useState(false);
  const [showQRCard, setShowQRCard] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'patients', patientId, 'vitals'), orderBy('timestamp', 'asc'));
    return onSnapshot(q, (snapshot) => {
      setVitals(snapshot.docs.map(doc => ({...doc.data()})) as any);
    });
  }, [patientId]);

  // Real-time synchronization of prescribed medications
  useEffect(() => {
    const qRx = query(
      collection(db, 'patients', patientId, 'prescriptions'),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(qRx, (snap) => {
      if (!snap.empty) {
        const latest = snap.docs[0].data();
        if (latest.medications && Array.isArray(latest.medications) && latest.medications.length > 0) {
          setMedications(latest.medications);
        }
      }
    });
    return unsub;
  }, [patientId]);

  const saveVital = async () => {
    if (systolic && diastolic) {
      await addDoc(collection(db, 'patients', patientId, 'vitals'), {
        systolic: Number(systolic),
        diastolic: Number(diastolic),
        timestamp: new Date().toISOString()
      });
      setSystolic('');
      setDiastolic('');
    }
  };

  const addMedication = () => {
    if (medName && medDosage) {
      setMedications([...medications, {name: medName, dosage: medDosage}]);
      setMedName('');
      setMedDosage('');
    }
  };

  const savePrescription = async () => {
    setSaving(true);
    try {
      await addDoc(collection(db, 'patients', patientId, 'prescriptions'), {
        medications,
        createdAt: new Date().toISOString()
      });
      alert('تم حفظ الروشتة ومزامنتها بنجاح مع هاتف المريض وبوابته الذكية!');
    } catch (error) {
      console.error('Error saving:', error);
      alert('Failed to save prescription.');
    } finally {
      setSaving(false);
    }
  };

  if (!patient) return <div>Loading...</div>;

  return (
    <div className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <button onClick={onBack} className="text-blue-600 mb-1 hover:underline text-sm font-medium">&larr; Back to Dashboard</button>
          <h1 className="text-2xl font-bold text-gray-900">{patient.name} - Profile</h1>
        </div>
        <button
          onClick={() => setShowQRCard(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-800 hover:to-indigo-800 text-white rounded-xl shadow-xs text-xs font-bold transition-all active:scale-95"
        >
          <QrCode size={16} />
          <span>Patient QR Access Card (كارت المريض الذكي)</span>
        </button>
      </div>
      
      {showLabModal && <LabResultsModal patientId={patientId} onClose={() => setShowLabModal(false)} />}
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow col-span-3 md:col-span-2">
          <h2 className="text-lg font-semibold mb-4">Blood Pressure Trends</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={vitals}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="timestamp" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="systolic" stroke="#ef4444" />
                <Line type="monotone" dataKey="diastolic" stroke="#3b82f6" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Log Vitals</h2>
          <div className="space-y-2">
            <input type="number" value={systolic} onChange={(e) => setSystolic(e.target.value)} placeholder="Systolic" className="w-full p-2 border rounded" />
            <input type="number" value={diastolic} onChange={(e) => setDiastolic(e.target.value)} placeholder="Diastolic" className="w-full p-2 border rounded" />
            <button onClick={saveVital} className="w-full bg-blue-600 text-white p-2 rounded">Log Vitals</button>
          </div>
          {vitals.length > 0 && vitals[vitals.length - 1].systolic > 140 && (
            <p className="mt-4 text-red-600 font-bold">⚠️ Warning: High BP detected!</p>
          )}
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow col-span-3">
          <h2 className="text-lg font-semibold mb-4">Smart Prescription</h2>
          
          <div id="prescription-content" className="printable p-4 border rounded mb-4 print:border-0">
             <h3 className="font-bold border-b pb-2 mb-2">Prescription for {patient.name}</h3>
             <ul className="space-y-2">
               {medications.map((m, i) => <li key={i}>{m.name} - {m.dosage}</li>)}
               {medications.length === 0 && <li className="italic text-gray-500">No medications added yet...</li>}
             </ul>
          </div>

           <div className="bg-gray-50 p-4 rounded mb-4">
             <h4 className="font-medium mb-2">Add Medication</h4>
             <div className="flex gap-2">
                <input list="meds" value={medName} onChange={(e) => setMedName(e.target.value)} placeholder="Medication Name" className="flex-1 p-2 border rounded" />
                <datalist id="meds">
                    <option value="Atorvastatin 20mg" />
                    <option value="Bisoprolol 5mg" />
                    <option value="Ramipril 10mg" />
                    <option value="Aspirin 81mg" />
                    <option value="Clopidogrel 75mg" />
                </datalist>
                <input type="text" value={medDosage} onChange={(e) => setMedDosage(e.target.value)} placeholder="Dosage" className="w-32 p-2 border rounded" />
                <button onClick={addMedication} className="bg-green-600 text-white px-4 py-2 rounded">Add</button>
             </div>
          </div>

          <div className="flex gap-2">
            <button onClick={savePrescription} disabled={saving} className="bg-blue-600 text-white px-4 py-2 rounded disabled:bg-blue-300">
              {saving ? 'Saving...' : 'Save Prescription'}
            </button>
            <button onClick={() => window.print()} className="bg-gray-600 text-white px-4 py-2 rounded">Print/Export PDF</button>
            <button onClick={async () => {
                try {
                    const response = await fetch('/api/consult-ai', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({vitals, patientName: patient.name})
                    });
                    if (!response.ok) throw new Error('AI service failed');
                    const data = await response.json();
                    alert(data.advice);
                } catch (e) {
                    alert('Error: Could not reach AI Assistant.');
                }
            }} className="bg-purple-600 text-white px-4 py-2 rounded">Consult AI Assistant</button>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow col-span-3">
          <h2 className="text-lg font-semibold mb-4">Pending Lab Results</h2>
          <button onClick={() => setShowLabModal(true)} className="text-blue-600 hover:underline">Review Lipid Profile</button>
        </div>

        <div className="col-span-3">
          <CardiologyReport patientName={patient.name} patientId={patient.id || patientId} />
        </div>
        <div className="col-span-3">
          <Chat patientId={patientId} patientName={patient.name} />
        </div>
        <div className="col-span-3 flex gap-2">
          <button onClick={() => setShowReferralModal(true)} className="bg-orange-600 text-white px-4 py-2 rounded">New Referral</button>
          <button onClick={() => setShowBillingModal(true)} className="bg-green-600 text-white px-4 py-2 rounded">New Invoice</button>
        </div>
      </div>
      <GeminiChat
        patientContext={{
          id: patientId,
          name: patient.name,
          dob: patient.dob,
          status: patient.status,
          vitals: vitals,
          medications: medications
        }}
      />
      {showReferralModal && <ReferralModal patientId={patientId} onClose={() => setShowReferralModal(false)} />}
      {showBillingModal && <BillingModal patientId={patientId} onClose={() => setShowBillingModal(false)} />}
      {showQRCard && (
        <PatientQRCardModal
          patientName={patient.name}
          patientId={patient.id || patientId}
          onClose={() => setShowQRCard(false)}
        />
      )}
    </div>
  );
}
