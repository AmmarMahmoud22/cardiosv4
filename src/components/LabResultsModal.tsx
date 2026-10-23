import React, {useState} from 'react';
import {doc, updateDoc} from 'firebase/firestore';
import {db} from '../lib/firebase';

export default function LabResultsModal({patientId, onClose}: {patientId: string, onClose: () => void}) {
  const [labResult] = useState({id: 'lab1', name: 'Lipid Profile', status: 'Pending'});

  const approveLab = async () => {
    await updateDoc(doc(db, 'patients', patientId), {status: 'Stable'});
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
      <div className="bg-white p-6 rounded-lg shadow w-96">
        <h2 className="text-xl font-bold mb-4">Pending Lab Result</h2>
        <p>Result: {labResult.name}</p>
        <p className="mb-6">Status: {labResult.status}</p>
        <div className="flex gap-2">
          <button onClick={approveLab} className="bg-green-600 text-white px-4 py-2 rounded">Approve & Update Patient</button>
          <button onClick={onClose} className="bg-gray-400 text-white px-4 py-2 rounded">Cancel</button>
        </div>
      </div>
    </div>
  );
}
