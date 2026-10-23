import {doc, setDoc, getDoc, collection} from 'firebase/firestore';
import {db} from './firebase';

const mockPatients = [
  {id: '1', name: 'Ahmed Hassan', dob: '1975-05-15', status: 'Stable'},
  {id: '2', name: 'Fatma Ali', dob: '1982-09-20', status: 'Alert: High BP'},
  {id: '3', name: 'Mohamed Ibrahim', dob: '1960-01-10', status: 'Pending Lab'},
];

export const seedDatabase = async () => {
  for (const patient of mockPatients) {
    const patientRef = doc(db, 'patients', patient.id);
    const snap = await getDoc(patientRef);
    if (!snap.exists()) {
      await setDoc(patientRef, patient);
    }
  }
};
