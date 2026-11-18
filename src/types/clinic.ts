export type StaffRole = 'doctor' | 'receptionist';

export interface ClinicStaffMember {
  id: string;
  uid: string;
  doctorId: string;
  doctorName?: string;
  clinicCode: string;
  name: string;
  email: string;
  phone?: string;
  roleTitle: 'سكرتيرة' | 'تمريض' | 'إدارة استقبال';
  status: 'active' | 'suspended';
  createdAt: string;
  createdBy: string;
}

export interface ClinicContract {
  id: string;
  doctorId: string;
  staffUids: string[];
  name: string; // e.g., "نقدي (كشف خاص)", "نقابة الأطباء", "نقابة المهندسين", "أكسا للتأمين"
  category: 'cash' | 'syndicate' | 'insurance' | 'corporate';
  discountPercent: number; // 0 - 100
  coveragePercent: number; // percentage paid by entity (0 - 100)
  notes?: string;
  isActive: boolean;
  createdAt: string;
}

export interface ClinicInvoiceItem {
  description: string;
  serviceType: 'consultation' | 'followup' | 'echo' | 'ecg' | 'other';
  unitPrice: number;
  discountPercent?: number;
}

export interface ClinicInvoice {
  id: string;
  invoiceNumber: string;
  doctorId: string;
  staffUids: string[];
  patientId: string;
  patientName: string;
  patientPhone?: string;
  serviceType: 'consultation' | 'followup' | 'echo' | 'ecg' | 'other';
  serviceLabel: string;
  baseAmount: number;
  contractId?: string;
  contractName?: string;
  discountPercent: number;
  discountAmount: number;
  patientPayable: number;
  entityShare: number;
  paymentMethod: 'Cash' | 'InstaPay' | 'Card';
  status: 'Paid' | 'Unpaid';
  date: string;
  createdAt: string;
  paidAt?: string;
  createdBy: string;
  createdByRole: StaffRole;
  notes?: string;
}

export interface PatientAttachment {
  id: string;
  patientId: string;
  doctorId: string;
  staffUids: string[];
  title: string;
  category: 'ECG' | 'Echo' | 'X-Ray' | 'Cath' | 'Other';
  mimeType: string;
  fileName: string;
  fileSizeBytes: number;
  dataUrl: string; // Compressed WebP/JPEG or PDF <= 450KB
  studyDate: string;
  notes?: string;
  uploadedBy: string;
  uploadedByRole: StaffRole;
  createdAt: string;
}
