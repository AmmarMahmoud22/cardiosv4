import {doc, setDoc, getDoc, collection, getDocs, addDoc} from 'firebase/firestore';
import {db} from './firebase';
import {generatePatientToken} from './patientAuth';

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
})[] = [
  {
    id: 'doc-1',
    name: 'د/ عمار محمود',
    clinicCode: 'CLINIC-AMMAR-101',
    clinicName: 'عيادة أمراض القلب والقسطرة (د/ عمار)',
    specialty: 'استشاري أمراض القلب والقسطرة التداخلية',
    planId: 'plan-pro',
    planName: 'باقة الاستشاري المحترف (Cardio Pro)',
    status: 'active',
    subscriptionExpiresAt: '2026-12-31',
    aiQueriesUsed: 84,
    aiQuotaLimit: 600,
    isAiBlocked: false,
    maxPatientsLimit: 250,
    phone: '01012345678',
    email: 'dr.ammar@cardios.eg'
  },
  {
    id: 'doc-2',
    name: 'د/ شريف عبد الهادي',
    clinicCode: 'CLINIC-SHERIF-202',
    clinicName: 'مركز القاهرة لرعاية القلب (د/ شريف)',
    specialty: 'استشاري جراحة وقصور القلب',
    planId: 'plan-starter',
    planName: 'باقة العيادة الذكية (Cardio Starter)',
    status: 'active',
    subscriptionExpiresAt: '2026-11-15',
    aiQueriesUsed: 37,
    aiQuotaLimit: 120,
    isAiBlocked: false,
    maxPatientsLimit: 50,
    phone: '01098765432',
    email: 'dr.sherif@cardios.eg'
  },
  {
    id: 'doc-3',
    name: 'د/ طارق عبد الرؤوف (طلب انضمام جديد)',
    clinicCode: 'CLINIC-TAREK-303',
    clinicName: 'عيادة د/ طارق للقلب والأوعية',
    specialty: 'أخصائي أمراض القلب وضغط الدم',
    planId: 'plan-starter',
    planName: 'باقة العيادة الذكية (Cardio Starter)',
    status: 'pending',
    subscriptionExpiresAt: '2026-12-31',
    aiQueriesUsed: 0,
    aiQuotaLimit: 120,
    isAiBlocked: false,
    maxPatientsLimit: 50,
    phone: '01233445566',
    email: 'dr.tarek@cardios.eg'
  }
];

export const SEED_LABS: LabProfile[] = [
  {
    id: 'lab-1',
    name: 'معمل الأزهري للتحاليل التخصصية والوراثية',
    labCode: 'LAB-AZHARI-88',
    technicianName: 'د. مروة الشيمي (استشاري الكيمياء الإكلينيكية)',
    phone: '01029384756',
    branch: 'فرع الدقي - الجيزة',
    accreditation: 'معتمد ISO 15189 والجودة السريرية',
    linkedClinics: ['CLINIC-AMMAR-101', 'CLINIC-SHERIF-202'],
    email: 'azhari.lab@cardios.eg'
  },
  {
    id: 'lab-2',
    name: 'مختبر البرج للتشخيص الدقيق للقلب',
    labCode: 'LAB-ALBORG-99',
    technicianName: 'د. أحمد صابر (أخصائي المناعة وأمراض الدم)',
    phone: '01198765432',
    branch: 'فرع مدينة نصر - القاهرة',
    accreditation: 'اعتماد CAP الدولي للتشخيص الجزيئي',
    linkedClinics: ['CLINIC-AMMAR-101'],
    email: 'alborg.cardio@cardios.eg'
  },
  {
    id: 'lab-3',
    name: 'كايرو لاب للتشخيص السريري المتقدم',
    labCode: 'LAB-CAIRO-55',
    technicianName: 'د. إيمان عبد الحميد (استشاري التحاليل السريرية)',
    phone: '01234567891',
    branch: 'فرع المهندسين - الجيزة',
    accreditation: 'معتمد من الهيئة العامة للاعتماد والرقابة الصحية GAHAR',
    linkedClinics: ['CLINIC-SHERIF-202'],
    email: 'cairo.lab@cardios.eg'
  }
];

export const MOCK_PATIENTS_DETAILED: DetailedPatient[] = [
  // Doctor 1's Patients (CLINIC-AMMAR-101)
  {
    id: '1',
    doctorId: 'doc-1',
    clinicCode: 'CLINIC-AMMAR-101',
    name: 'أحمد حسن (Ahmed Hassan)',
    nameEn: 'Ahmed Hassan',
    dob: '1975-05-15',
    age: 51,
    gender: 'ذكر (Male)',
    phone: '01012345678',
    status: 'مستقر (Stable Control)',
    diagnosis: 'ارتفاع ضغط الدم الشرياني + دعامة بالشريان التاجي الأيسر (Post-PCI to LAD)',
    riskTier: 'عالي الخطورة (Very High CV Risk)',
    ef: 55,
    targetBP: '< 130/80 mmHg',
    labs: {
      ldl: '72 mg/dL',
      hdl: '44 mg/dL',
      creatinine: '0.9 mg/dL',
      egfr: '92 mL/min',
      potassium: '4.4 mmol/L',
      hba1c: '5.8%',
      troponin: 'سالب (<0.01 ng/mL)'
    },
    echo: {
      ef: 55,
      lvedd: 48,
      ivs: 11,
      wallMotion: 'Anterior wall mild hypokinesia, preserved global ejection fraction (55%)',
      conclusion: 'Post-stenting evaluation: Good LV function, no residual ischemia at rest'
    },
    initialVitals: [
      {systolic: 142, diastolic: 90, heartRate: 78, timestamp: new Date(Date.now() - 6 * 86400000).toISOString()},
      {systolic: 138, diastolic: 88, heartRate: 74, timestamp: new Date(Date.now() - 4 * 86400000).toISOString()},
      {systolic: 134, diastolic: 84, heartRate: 70, timestamp: new Date(Date.now() - 2 * 86400000).toISOString()},
      {systolic: 128, diastolic: 82, heartRate: 68, timestamp: new Date(Date.now() - 1 * 86400000).toISOString()},
      {systolic: 126, diastolic: 80, heartRate: 66, timestamp: new Date().toISOString()}
    ],
    initialMedications: [
      {name: 'Bisoprolol (Concor)', dosage: '5 mg', instructions: 'قرص صباحاً بعد الإفطار'},
      {name: 'Atorvastatin (Lipitor)', dosage: '40 mg', instructions: 'قرص مساءً قبل النوم'},
      {name: 'Aspirin Protect', dosage: '81 mg', instructions: 'قرص بعد وجبة الغداء'},
      {name: 'Perindopril (Coversyl)', dosage: '5 mg', instructions: 'قرص صباحاً'}
    ]
  },
  {
    id: '2',
    doctorId: 'doc-1',
    clinicCode: 'CLINIC-AMMAR-101',
    name: 'فاطمة علي (Fatma Ali)',
    nameEn: 'Fatma Ali',
    dob: '1982-09-20',
    age: 44,
    gender: 'أنثى (Female)',
    phone: '01123456789',
    status: 'تنبيه: ضغط مرتفع (Alert: High BP)',
    diagnosis: 'ارتفاع ضغط دم غير منضبط (Stage 2 HTN) + نوبات رجفان أذيني (Paroxysmal AF)',
    riskTier: 'مرتفع الخطورة (High CV Risk)',
    ef: 60,
    targetBP: '< 130/80 mmHg',
    labs: {
      ldl: '118 mg/dL',
      hdl: '48 mg/dL',
      creatinine: '1.0 mg/dL',
      egfr: '82 mL/min',
      potassium: '4.2 mmol/L',
      hba1c: '6.4%',
      troponin: 'سالب (<0.01 ng/mL)'
    },
    echo: {
      ef: 60,
      lvedd: 46,
      ivs: 12,
      wallMotion: 'Concentric left ventricular remodeling, normal wall motion',
      conclusion: 'Hypertensive heart disease, dilated left atrium, preserved EF'
    },
    initialVitals: [
      {systolic: 158, diastolic: 96, heartRate: 92, timestamp: new Date(Date.now() - 3 * 86400000).toISOString()},
      {systolic: 154, diastolic: 94, heartRate: 88, timestamp: new Date(Date.now() - 2 * 86400000).toISOString()},
      {systolic: 162, diastolic: 100, heartRate: 95, timestamp: new Date().toISOString()}
    ],
    initialMedications: [
      {name: 'Valsartan/Amlodipine (Exforge)', dosage: '160/5 mg', instructions: 'قرص واحد يومياً صباحاً'},
      {name: 'Rivaroxaban (Xarelto)', dosage: '20 mg', instructions: 'قرص بعد وجبة العشاء للوقاية من جلطات الأذين'},
      {name: 'Bisoprolol (Concor Cor)', dosage: '2.5 mg', instructions: 'قرص صباحاً لضبط ضربات القلب'}
    ]
  },
  {
    id: '3',
    doctorId: 'doc-1',
    clinicCode: 'CLINIC-AMMAR-101',
    name: 'محمود عبد الرحمن (Mahmoud Rahman)',
    nameEn: 'Mahmoud Rahman',
    dob: '1962-03-10',
    age: 64,
    gender: 'ذكر (Male)',
    phone: '01234567890',
    status: 'قصور قلب قيد الضبط (HFrEF Monitoring)',
    diagnosis: 'اعتلال عضلة القلب الإقفاري (Ischemic Dilated CM) + كفاءة القلب 32% (HFrEF)',
    riskTier: 'شديد الخطورة (Severe CV Risk)',
    ef: 32,
    targetBP: '< 120/75 mmHg',
    labs: {
      ldl: '64 mg/dL',
      hdl: '36 mg/dL',
      creatinine: '1.3 mg/dL',
      egfr: '58 mL/min',
      potassium: '4.7 mmol/L',
      hba1c: '6.1%',
      bnp: '780 pg/mL'
    },
    echo: {
      ef: 32,
      lvedd: 64,
      ivs: 9,
      wallMotion: 'Diffuse global hypokinesia, severe LV systolic impairment (LVEF 32%)',
      conclusion: 'Ischemic Cardiomyopathy, Dilated LV, moderate functional mitral regurgitation'
    },
    initialVitals: [
      {systolic: 118, diastolic: 74, heartRate: 72, timestamp: new Date(Date.now() - 4 * 86400000).toISOString()},
      {systolic: 122, diastolic: 76, heartRate: 75, timestamp: new Date(Date.now() - 2 * 86400000).toISOString()},
      {systolic: 116, diastolic: 70, heartRate: 70, timestamp: new Date().toISOString()}
    ],
    initialMedications: [
      {name: 'Sacubitril/Valsartan (Entresto)', dosage: '49/51 mg', instructions: 'قرص مرتين يومياً صباحاً ومساءً'},
      {name: 'Empagliflozin (Jardiance)', dosage: '10 mg', instructions: 'قرص صباحاً لدعم عضلة القلب والكلى'},
      {name: 'Spironolactone (Aldactone)', dosage: '25 mg', instructions: 'قرص بعد الإفطار'},
      {name: 'Carvedilol (Dilatrend)', dosage: '12.5 mg', instructions: 'نصف قرص مرتين يومياً مع الأكل'},
      {name: 'Furosemide (Lasix)', dosage: '40 mg', instructions: 'قرص صباحاً عند اللزوم لتخفيف احتقان السوائل'}
    ]
  },

  // Doctor 2's Patients (CLINIC-SHERIF-202 - completely isolated from Doctor 1)
  {
    id: '4',
    doctorId: 'doc-2',
    clinicCode: 'CLINIC-SHERIF-202',
    name: 'حسام الدين فؤاد (Hossam Fouad)',
    nameEn: 'Hossam Fouad',
    dob: '1970-11-04',
    age: 56,
    gender: 'ذكر (Male)',
    phone: '01511223344',
    status: 'مستقر (تحت إشراف د/ شريف)',
    diagnosis: 'قصور الشريان التاجي المزمن وارتفاع الدهون الثلاثية',
    riskTier: 'متوسط الخطورة',
    ef: 58,
    targetBP: '< 130/80 mmHg',
    labs: {
      ldl: '135 mg/dL',
      hdl: '40 mg/dL',
      creatinine: '0.85 mg/dL',
      egfr: '95 mL/min',
      potassium: '4.5 mmol/L',
      hba1c: '5.6%'
    },
    echo: {
      ef: 58,
      lvedd: 49,
      ivs: 10,
      wallMotion: 'Normal resting wall motion, no valvular lesions',
      conclusion: 'Normal global LV systolic function, mild diastolic dysfunction'
    },
    initialVitals: [
      {systolic: 130, diastolic: 82, heartRate: 72, timestamp: new Date().toISOString()}
    ],
    initialMedications: [
      {name: 'Rosuvastatin (Crestor)', dosage: '20 mg', instructions: 'قرص مساءً قبل النوم'},
      {name: 'Aspirin Protect', dosage: '81 mg', instructions: 'قرص بعد الغداء'}
    ]
  },
  {
    id: '5',
    doctorId: 'doc-2',
    clinicCode: 'CLINIC-SHERIF-202',
    name: 'نادية إبراهيم حسنين (Nadia Ibrahim)',
    nameEn: 'Nadia Ibrahim',
    dob: '1965-08-14',
    age: 61,
    gender: 'أنثى (Female)',
    phone: '01099887766',
    status: 'متابعة دورية (عيادة د/ شريف)',
    diagnosis: 'ارتجاع الصمام المترالي البسيط وضغط الدم',
    riskTier: 'متوسط الخطورة',
    ef: 62,
    targetBP: '< 130/80 mmHg',
    labs: {
      ldl: '98 mg/dL',
      hdl: '52 mg/dL',
      creatinine: '0.9 mg/dL',
      egfr: '88 mL/min',
      potassium: '4.3 mmol/L',
      hba1c: '5.7%'
    },
    echo: {
      ef: 62,
      lvedd: 47,
      ivs: 11,
      wallMotion: 'Good LV systolic contraction',
      conclusion: 'Mild mitral valve prolapse with mild regurgitation'
    },
    initialVitals: [
      {systolic: 128, diastolic: 78, heartRate: 68, timestamp: new Date().toISOString()}
    ],
    initialMedications: [
      {name: 'Candez (Candesartan)', dosage: '8 mg', instructions: 'قرص صباحاً'}
    ]
  }
];

export const seedDatabase = async () => {
  try {
    // 0. Seed dynamic subscription plans only if they do not already exist
    for (const plan of SEED_PLANS) {
      const planRef = doc(db, 'plans', plan.id);
      const snap = await getDoc(planRef);
      if (!snap.exists()) {
        await setDoc(planRef, plan);
      }
    }

    // 1. Seed Doctors only if they do not already exist
    for (const docProfile of SEED_DOCTORS) {
      const docRef = doc(db, 'doctors', docProfile.id);
      const snap = await getDoc(docRef);
      if (!snap.exists()) {
        await setDoc(docRef, docProfile);
      }
    }

    // 2. Seed Diagnostic Laboratories only if they do not already exist
    for (const labProfile of SEED_LABS) {
      const labRef = doc(db, 'labs', labProfile.id);
      const snap = await getDoc(labRef);
      if (!snap.exists()) {
        await setDoc(labRef, labProfile);
      }
    }

    // 3. Seed Patients with doctorId & clinicCode
    for (const patient of MOCK_PATIENTS_DETAILED) {
      const patientRef = doc(db, 'patients', patient.id);
      const existingPatient = await getDoc(patientRef);
      if (existingPatient.exists()) {
        continue;
      }
      const token = generatePatientToken(patient.id);

      const patientData = {
        id: patient.id,
        doctorId: patient.doctorId,
        clinicCode: patient.clinicCode,
        name: patient.name,
        nameEn: patient.nameEn,
        dob: patient.dob,
        age: patient.age,
        gender: patient.gender,
        phone: patient.phone,
        status: patient.status,
        diagnosis: patient.diagnosis,
        riskTier: patient.riskTier,
        ef: patient.ef,
        targetBP: patient.targetBP,
        labs: patient.labs,
        echo: patient.echo,
        accessToken: token,
        securityToken: token
      };

      await setDoc(patientRef, patientData, {merge: true});

      // Seed vitals subcollection if empty
      const vitalsCol = collection(db, 'patients', patient.id, 'vitals');
      const vitalsSnap = await getDocs(vitalsCol);
      if (vitalsSnap.empty) {
        for (const vital of patient.initialVitals) {
          await addDoc(vitalsCol, vital);
        }
      }

      // Seed prescriptions subcollection if empty
      const rxCol = collection(db, 'patients', patient.id, 'prescriptions');
      const rxSnap = await getDocs(rxCol);
      if (rxSnap.empty) {
        await addDoc(rxCol, {
          medications: patient.initialMedications,
          doctorId: patient.doctorId,
          createdAt: new Date().toISOString()
        });
      }
    }
  } catch (err) {
    console.warn('Seed database warning:', err);
  }
};
