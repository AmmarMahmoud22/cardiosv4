export interface Patient {
  id: string;
  name: string;
  dob: string;
  medicalHistory: string[];
}

export interface Encounter {
  id: string;
  patientId: string;
  doctorId: string;
  date: Date;
  notes: string;
  diagnosis: string;
}

export interface Vital {
  id: string;
  patientId: string;
  type: 'BP' | 'HR';
  value: string;
  timestamp: Date;
}
