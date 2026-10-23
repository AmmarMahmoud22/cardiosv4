import React, {useState} from 'react';
import {addDoc, collection} from 'firebase/firestore';
import {db} from '../lib/firebase';

export default function ReferralModal({patientId, onClose}: {patientId: string, onClose: () => void}) {
  const [specialist, setSpecialist] = useState('');
  const [reason, setReason] = useState('');

  const saveReferral = async () => {
    if (specialist && reason) {
      await addDoc(collection(db, 'patients', patientId, 'referrals'), {specialist, reason, date: new Date().toISOString(), status: 'Pending'});
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
      <div className="bg-white p-6 rounded-lg shadow w-96">
        <h2 className="text-xl font-bold mb-4">New Referral</h2>
        <input value={specialist} onChange={(e) => setSpecialist(e.target.value)} placeholder="Specialist/Center" className="w-full p-2 border rounded mb-2" />
        <textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason for referral" className="w-full p-2 border rounded mb-4" />
        <div className="flex gap-2">
            <button onClick={saveReferral} className="bg-blue-600 text-white px-4 py-2 rounded">Save</button>
            <button onClick={onClose} className="bg-gray-400 text-white px-4 py-2 rounded">Cancel</button>
        </div>
      </div>
    </div>
  );
}
