import React, {useState} from 'react';
import {collection, addDoc} from 'firebase/firestore';
import {db} from '../lib/firebase';

export default function NewPatientModal({onClose}: {onClose: () => void}) {
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');

  const savePatient = async () => {
    if (name && dob) {
      await addDoc(collection(db, 'patients'), {name, dob, status: 'Stable'});
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
      <div className="bg-white p-6 rounded-lg shadow w-96">
        <h2 className="text-xl font-bold mb-4">Add New Patient</h2>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Patient Name" className="w-full p-2 border rounded mb-2" />
        <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} className="w-full p-2 border rounded mb-4" />
        <div className="flex gap-2">
            <button onClick={savePatient} className="bg-blue-600 text-white px-4 py-2 rounded">Save</button>
            <button onClick={onClose} className="bg-gray-400 text-white px-4 py-2 rounded">Cancel</button>
        </div>
      </div>
    </div>
  );
}
