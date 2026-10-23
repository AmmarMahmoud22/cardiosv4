import React, {useState, useEffect} from 'react';
import {collection, query, where, onSnapshot, updateDoc, doc, addDoc} from 'firebase/firestore';
import {db} from '../lib/firebase';
import {AlertCircle, CheckCircle, FileText} from 'lucide-react';

export default function AlertPanel() {
  const [alerts, setAlerts] = useState<any[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'vitals'), where('systolic', '>', 140));
    return onSnapshot(q, (snapshot) => {
      setAlerts(snapshot.docs.map(doc => ({id: doc.id, ...doc.data()})));
    });
  }, []);

  const acknowledgeAlert = async (id: string) => {
    await updateDoc(doc(db, 'vitals', id), {status: 'acknowledged'});
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow mt-6">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <AlertCircle className="text-red-600" /> Active RPM Alerts
      </h2>
      <div className="space-y-2">
        {alerts.filter(a => !a.status).map(alert => (
          <div key={alert.id} className="p-3 border-l-4 border-red-500 bg-red-50 flex justify-between items-center">
            <div>
              <p className="font-bold">High BP Detected: {alert.systolic}/{alert.diastolic}</p>
              <p className="text-xs text-gray-600">Patient ID: {alert.patientId} - {alert.timestamp}</p>
            </div>
            <button onClick={() => acknowledgeAlert(alert.id)} className="bg-white border p-1 rounded"><CheckCircle className="text-green-600" /></button>
          </div>
        ))}
      </div>
    </div>
  );
}
