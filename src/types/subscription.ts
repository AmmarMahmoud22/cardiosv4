export interface PlanFeatures {
  rpmAlerts: boolean;        // تنبيهات الضغط والنبض اللحظية
  echoReports: boolean;      // تقارير الإيكو وتوثيق كفاءة العضلة
  labIntegration: boolean;   // الربط المتزامن مع معامل التحاليل
  qrPortal: boolean;         // كروت المريض الذكية وQR
  ddiChecker: boolean;       // فحص تعارضات أدوية القلب
  customBranding: boolean;   // شعار وهوية العيادة المخصصة
  prioritySupport: boolean;  // دعم فني وسريري على مدار الساعة
}

export type BillingCycle = 'monthly' | 'quarterly' | 'yearly' | 'lifetime';

export interface Plan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  billingCycle: BillingCycle;
  maxPatients: number;         // -1 for unlimited
  aiMonthlyQuota: number;      // -1 for unlimited, 0 for disabled
  features: PlanFeatures;
  isDefault?: boolean;
  badgeColor?: 'blue' | 'emerald' | 'amber' | 'purple' | 'rose' | 'indigo';
  createdAt?: string;
  updatedAt?: string;
}

export interface DoctorWithSubscription {
  id: string;
  name: string;
  clinicCode: string;
  clinicName: string;
  specialty: string;
  phone?: string;
  email?: string;
  planId?: string;
  planName?: string;
  status: 'active' | 'suspended' | 'pending' | 'trial' | 'expired';
  subscriptionExpiresAt?: string;
  aiQueriesUsed: number;
  aiQuotaLimit: number;
  isAiBlocked: boolean;
  maxPatientsLimit?: number;
  notes?: string;
  patientCount?: number;
  medicalLicenseNumber?: string;
  verificationStatus?: 'verified' | 'unverified' | 'pending';
  lastActiveAt?: string;
  prescriptionsIssued?: number;
  echoReportsCount?: number;
  createdAt?: string;
}

export interface LabWithStats {
  id: string;
  name: string;
  labCode: string;
  technicianName: string;
  phone: string;
  branch: string;
  accreditation: string;
  linkedClinics: string[];
  email?: string;
  status?: 'active' | 'pending' | 'suspended';
  testsProcessed?: number;
  createdAt?: string;
}
