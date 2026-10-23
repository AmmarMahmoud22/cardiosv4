import React, {useEffect, useState} from 'react';
import {collection, getDocs} from 'firebase/firestore';
import {db} from '../lib/firebase';

interface Patient {
  id: string;
  name: string;
  dob: string;
  status: string;
}

export default function PatientTable({onSelectPatient}: {onSelectPatient: (id: string) => void}) {
  const [patients, setPatients] = useState<Patient[]>([]);

  useEffect(() => {
    const fetchPatients = async () => {
      const querySnapshot = await getDocs(collection(db, 'patients'));
      const patientsData = querySnapshot.docs.map(doc => ({id: doc.id, ...doc.data()})) as Patient[];
      setPatients(patientsData);
    };
    fetchPatients();
  }, []);

  return (
    <div className="bg-white p-6 rounded-lg shadow mt-6">
      <h2 className="text-lg font-semibold mb-4">Patient Overview</h2>
      <table className="w-full text-left">
        <thead>
          <tr className="text-gray-500 border-b">
            <th className="pb-2">Name</th>
            <th className="pb-2">DOB</th>
            <th className="pb-2">Status</th>
            <th className="pb-2">Action</th>
          </tr>
        </thead>
        <tbody>
          {patients.map(patient => (
            <tr key={patient.id} className="border-b">
              <td className="py-3">{patient.name}</td>
              <td className="py-3">{patient.dob}</td>
              <td className={`py-3 ${patient.status.includes('Alert') ? 'text-red-500' : 'text-green-500'}`}>{patient.status}</td>
              <td className="py-3">
                <button onClick={() => onSelectPatient(patient.id)} className="text-blue-600 hover:underline">View Profile</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
