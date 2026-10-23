export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  startTime: string; // ISO string
  type: 'Consultation' | 'Follow-up' | 'Echo';
  status: 'Scheduled' | 'Completed' | 'Cancelled';
}
