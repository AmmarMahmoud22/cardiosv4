export interface Appointment {
  id: string;
  patientId?: string;
  patientName: string;
  patientPhone?: string;
  patientAge?: string;
  date?: string; // YYYY-MM-DD
  startTime: string; // ISO string or date string YYYY-MM-DD
  endTime?: string;
  type: 'Consultation' | 'Follow-up' | 'Echo' | 'كشف عيادة';
  status: 'Scheduled' | 'Completed' | 'Cancelled' | 'Waitlist';
  queueNumber?: number;
  clinicCode?: string;
  doctorId?: string;
  notes?: string;
  createdAt?: string;
}

export interface DoctorWorkingDay {
  dayOfWeek: number; // 0 = Sun, 1 = Mon, 2 = Tue, 3 = Wed, 4 = Thu, 5 = Fri, 6 = Sat
  dayNameAr: string;
  enabled: boolean;
  maxCapacity: number;
  startTime: string; // e.g. "16:00"
  endTime: string;   // e.g. "21:00"
}

export interface DoctorScheduleSettings {
  doctorId: string;
  clinicName: string;
  doctorName: string;
  specialty?: string;
  clinicCode: string;
  clinicLogoUrl?: string; // Base64 or image URL uploaded from device
  clinicLogoIcon?: string; // Preset icon name ('HeartPulse' | 'Stethoscope' | 'Activity' | 'Building2' | 'ShieldCheck' | 'Sparkles')
  workingDays: DoctorWorkingDay[];
  instructions: string;
  updatedAt?: string;
}

export interface WaitlistEntry {
  id: string;
  doctorId: string;
  clinicCode: string;
  patientName: string;
  patientPhone: string;
  patientAge: string;
  requestedDate: string;
  suggestedDate: string;
  status: 'Pending' | 'Promoted' | 'Cancelled';
  createdAt: string;
}
