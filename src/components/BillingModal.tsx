import React, {useState} from 'react';
import {addDoc, collection} from 'firebase/firestore';
import {db} from '../lib/firebase';

export default function BillingModal({patientId, onClose}: {patientId: string, onClose: () => void}) {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');

  const saveInvoice = async () => {
    if (amount && description) {
      await addDoc(collection(db, 'patients', patientId, 'invoices'), {amount: Number(amount), description, status: 'Unpaid', date: new Date().toISOString()});
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
      <div className="bg-white p-6 rounded-lg shadow w-96">
        <h2 className="text-xl font-bold mb-4">New Invoice</h2>
        <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount" className="w-full p-2 border rounded mb-2" />
        <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Service Description" className="w-full p-2 border rounded mb-4" />
        <div className="flex gap-2">
            <button onClick={saveInvoice} className="bg-green-600 text-white px-4 py-2 rounded">Save Invoice</button>
            <button onClick={onClose} className="bg-gray-400 text-white px-4 py-2 rounded">Cancel</button>
        </div>
      </div>
    </div>
  );
}
