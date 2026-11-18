import {doc, setDoc, getDoc} from 'firebase/firestore';
import { auth, db } from './firebase';
import { cleanLocalDemoStorage, purgeAllDemoData } from './adminSync';

export interface DetailedPatient {
  id: string;
  doctorId: string;
  clinicCode: string;
  name: string;
  nameEn: string;
  dob: string;
  age: number;
  gender: string;
  phone: string;
  status: string;
  diagnosis: string;
  riskTier: string;
  ef: number;
  targetBP: string;
  labs: {
    ldl: string;
    hdl: string;
    creatinine: string;
    egfr: string;
    potassium: string;
    hba1c: string;
    troponin?: string;
    bnp?: string;
  };
  echo: {
    ef: number;
    lvedd: number;
    ivs: number;
    wallMotion: string;
    conclusion: string;
  };
  initialVitals: {systolic: number; diastolic: number; heartRate?: number; timestamp: string}[];
  initialMedications: {name: string; dosage: string; instructions?: string}[];
}

export interface DoctorProfile {
  id: string;
  name: string;
  clinicCode: string;
  clinicName: string;
  specialty: string;
}

export interface LabProfile {
  id: string;
  name: string;
  labCode: string;
  technicianName: string;
  phone: string;
  branch: string;
  accreditation: string;
  linkedClinics: string[];
  email?: string;
}

import {Plan} from '../types/subscription';

export const SEED_PLANS: Plan[] = [
  {
    id: 'plan-starter',
    name: 'باقة العيادة الذكية (Cardio Starter)',
    description: 'مثالية للعيادات الفردية والناشئة لإدارة السجلات وإصدار كروت المريض الذكية',
    price: 450,
    currency: 'EGP',
    billingCycle: 'monthly',
    maxPatients: 50,
    aiMonthlyQuota: 120,
    badgeColor: 'blue',
    isDefault: true,
    features: {
      rpmAlerts: true,
      echoReports: true,
      labIntegration: false,
      qrPortal: true,
      ddiChecker: true,
      customBranding: false,
      prioritySupport: false
    },
    createdAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'plan-pro',
    name: 'باقة الاستشاري المحترف (Cardio Pro)',
    description: 'الخيار الأكثر طلباً: ربط مباشر مع معامل التحاليل وفحص تعارضات الأدوية المتقدم',
    price: 950,
    currency: 'EGP',
    billingCycle: 'monthly',
    maxPatients: 250,
    aiMonthlyQuota: 600,
    badgeColor: 'purple',
    isDefault: false,
    features: {
      rpmAlerts: true,
      echoReports: true,
      labIntegration: true,
      qrPortal: true,
      ddiChecker: true,
      customBranding: true,
      prioritySupport: false
    },
    createdAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'plan-enterprise',
    name: 'باقة مراكز القلب المتقدمة (Heart Center Enterprise)',
    description: 'مرضى غير محدودين، ربط متعدد الفروع، حصة ذكاء اصطناعي موسعة ودعم سريري VIP',
    price: 1950,
    currency: 'EGP',
    billingCycle: 'monthly',
    maxPatients: -1,
    aiMonthlyQuota: 3000,
    badgeColor: 'emerald',
    isDefault: false,
    features: {
      rpmAlerts: true,
      echoReports: true,
      labIntegration: true,
      qrPortal: true,
      ddiChecker: true,
      customBranding: true,
      prioritySupport: true
    },
    createdAt: '2026-01-01T00:00:00.000Z'
  }
];

export const SEED_DOCTORS: (DoctorProfile & {
  planId: string;
  planName: string;
  status: 'active' | 'suspended' | 'pending' | 'trial' | 'expired';
  subscriptionExpiresAt: string;
  aiQueriesUsed: number;
  aiQuotaLimit: number;
  isAiBlocked: boolean;
  maxPatientsLimit: number;
  phone?: string;
  email?: string;
})[] = [];

export const SEED_LABS: LabProfile[] = [];

export const MOCK_PATIENTS_DETAILED: DetailedPatient[] = [];

export const seedDatabase = async () => {
  try {
    cleanLocalDemoStorage();

    // Only attempt Firestore writes when a Firebase Auth session is active
    if (!auth.currentUser) {
      return;
    }

    for (const plan of SEED_PLANS) {
      const planRef = doc(db, 'plans', plan.id);
      const snap = await getDoc(planRef);
      if (!snap.exists()) {
        await setDoc(planRef, plan).catch(() => {});
      }
    }

    await purgeAllDemoData();
  } catch (err) {
    console.warn('Seed database warning:', err);
  }
};
