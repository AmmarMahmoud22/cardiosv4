import {doc, setDoc, getDoc, collection, getDocs, addDoc} from 'firebase/firestore';
import {db} from './firebase';
import {generatePatientToken} from './patientAuth';

export interface DetailedPatient {
  id: string;
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

export const MOCK_PATIENTS_DETAILED: DetailedPatient[] = [
  {
    id: '1',
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
      potassium: '4.1 mmol/L',
      hba1c: '6.2%'
    },
    echo: {
      ef: 60,
      lvedd: 46,
      ivs: 13,
      wallMotion: 'Concentric LV hypertrophy, Left atrial enlargement (LA 42mm)',
      conclusion: 'Hypertensive heart disease with preserved EF (60%), Grade 1 diastolic dysfunction'
    },
    initialVitals: [
      {systolic: 154, diastolic: 96, heartRate: 88, timestamp: new Date(Date.now() - 5 * 86400000).toISOString()},
      {systolic: 160, diastolic: 98, heartRate: 92, timestamp: new Date(Date.now() - 3 * 86400000).toISOString()},
      {systolic: 158, diastolic: 100, heartRate: 85, timestamp: new Date(Date.now() - 1 * 86400000).toISOString()},
      {systolic: 162, diastolic: 98, heartRate: 90, timestamp: new Date().toISOString()}
    ],
    initialMedications: [
      {name: 'Amlodipine (Norvasc)', dosage: '10 mg', instructions: 'قرص ظهراً'},
      {name: 'Valsartan (Tareg)', dosage: '160 mg', instructions: 'قرص صباحاً'},
      {name: 'Apixaban (Eliquis)', dosage: '5 mg', instructions: 'قرص كل 12 ساعة للوقاية من جلطات الأذين'},
      {name: 'Bisoprolol (Concor)', dosage: '5 mg', instructions: 'قرص صباحاً لضبط ضربات القلب'}
    ]
  },
  {
    id: '3',
    name: 'محمد إبراهيم (Mohamed Ibrahim)',
    nameEn: 'Mohamed Ibrahim',
    dob: '1960-01-10',
    age: 66,
    gender: 'ذكر (Male)',
    phone: '01234567890',
    status: 'متابعة حرجة / بانتظار تحاليل (Pending Lab)',
    diagnosis: 'قصور متقدم بعضلة القلب (HFrEF - EF 32%) + اعتلال كلى سكري (CKD 3a)',
    riskTier: 'خطورة قصوى (Extreme CV Risk)',
    ef: 32,
    targetBP: '< 125/75 mmHg',
    labs: {
      ldl: '65 mg/dL',
      hdl: '38 mg/dL',
      creatinine: '1.4 mg/dL',
      egfr: '54 mL/min',
      potassium: '4.8 mmol/L',
      hba1c: '7.3%',
      bnp: '1420 pg/mL'
    },
    echo: {
      ef: 32,
      lvedd: 62,
      ivs: 10,
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
  }
];

export const seedDatabase = async () => {
  try {
    for (const patient of MOCK_PATIENTS_DETAILED) {
      const patientRef = doc(db, 'patients', patient.id);
      const snap = await getDoc(patientRef);

      const token = generatePatientToken(patient.id);

      // Always ensure full rich profile fields exist
      const patientData = {
        id: patient.id,
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
          createdAt: new Date().toISOString()
        });
      }
    }
  } catch (err) {
    console.warn('Seed database warning:', err);
  }
};
