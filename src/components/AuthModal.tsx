import React, { useState, useEffect } from 'react';
import {
  X,
  AlertCircle,
  CheckCircle2,
  Clock,
  Phone,
  Eye,
  EyeOff,
  Loader2,
  UserCheck
} from 'lucide-react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  sendEmailVerification,
  signInWithPopup,
  signOut
} from 'firebase/auth';
import { doc, setDoc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { auth, db, googleProvider } from '../lib/firebase';
import { verifyPatientAccess } from '../lib/patientAuth';
import { trackSignupAttempt } from '../lib/analytics';
import { markSeedFlags, syncDoctorScheduleSummary } from '../lib/adminSync';
import { StaffRole } from '../types/clinic';

export type UserRole = 'doctor' | 'receptionist' | 'lab' | 'patient';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (
    role: UserRole,
    id?: string,
    name?: string,
    clinicCode?: string,
    labCode?: string,
    technicianName?: string,
    staffRole?: StaffRole,
    staffName?: string
  ) => void;
  initialRole?: UserRole;
  initialMode?: 'login' | 'signup';
}

export default function AuthModal({
  isOpen,
  onClose,
  onSuccess,
  initialRole = 'doctor',
  initialMode = 'login'
}: AuthModalProps) {
  const [selectedRole, setSelectedRole] = useState<UserRole>(initialRole);
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);

  // Doctor/Lab/Receptionist fields
  const [fullName, setFullName] = useState('');
  const [technicianNameInput, setTechnicianNameInput] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [partnerClinicCodeInput, setPartnerClinicCodeInput] = useState('');

  // Patient Quick Access fields
  const [patientIdInput, setPatientIdInput] = useState('');
  const [patientTokenInput, setPatientTokenInput] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Pending Review Confirmation State
  const [signupPendingInfo, setSignupPendingInfo] = useState<{
    role: UserRole;
    name: string;
    code: string;
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedRole(initialRole);
      setMode(initialRole === 'receptionist' ? 'login' : initialMode);
      setError(null);
      setSuccessMessage(null);
      setSignupPendingInfo(null);
    }
  }, [isOpen, initialRole, initialMode]);

  useEffect(() => {
    if (selectedRole === 'receptionist' && mode === 'signup') {
      setMode('login');
    }
  }, [selectedRole, mode]);

  if (!isOpen) return null;

  // Patient direct file access (with ID + Security Token)
  const handlePatientDirectAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const cleanId = patientIdInput.trim().replace(/^#/, '');
    if (!cleanId) {
      setError('يرجى إدخال رقم الملف الطبي الخاص بك.');
      return;
    }
    const cleanToken = patientTokenInput.trim();
    if (!cleanToken) {
      setError('يرجى إدخال رمز الأمان المطبوع على كارت المريض الخاص بك.');
      return;
    }

    setLoading(true);
    try {
      const res = await verifyPatientAccess(cleanId, cleanToken);
      if (res.valid) {
        setSuccessMessage(`أهلاً بك يا ${res.patientName || 'المريض'}! جاري فتح الملف الطبي...`);
        setTimeout(() => {
          onSuccess('patient', cleanId, res.patientName);
          onClose();
        }, 400);
      } else {
        setError(res.reason || 'رمز التحقق غير صحيح، يرجى مراجعة الكارت المسلم لك من العيادة.');
      }
    } catch {
      setError('تعذر التحقق من الملف الطبي حالياً.');
    } finally {
      setLoading(false);
    }
  };

  // Resolve active Receptionist staff record after Firebase Auth login
  const resolveReceptionistLogin = async (uid: string, userEmail: string) => {
    let staffSnap = await getDoc(doc(db, 'clinic_staff', uid));
    if (!staffSnap.exists() && userEmail) {
      const q = query(collection(db, 'clinic_staff'), where('email', '==', userEmail.toLowerCase()));
      const qSnap = await getDocs(q);
      if (!qSnap.empty) {
        staffSnap = qSnap.docs[0] as any;
      }
    }

    if (!staffSnap.exists()) {
      await signOut(auth).catch(() => {});
      setError('لا يوجد حساب موظف استقبال / تمريض مسجل بهذا البريد. اطلب من طبيب العيادة إضافتك من إدارة الطاقم.');
      return;
    }

    const staffData = staffSnap.data() as any;
    if (staffData.status !== 'active') {
      await signOut(auth).catch(() => {});
      setError('حساب الاستقبال/التمريض مجمّد حالياً. يرجى مراجعة طبيب العيادة.');
      return;
    }

    const doctorSnap = await getDoc(doc(db, 'doctors', staffData.doctorId));
    if (!doctorSnap.exists()) {
      await signOut(auth).catch(() => {});
      setError('لم يتم العثور على العيادة المرتبطة بهذا الحساب.');
      return;
    }

    const doctorData = doctorSnap.data() as any;
    if (doctorData.status !== 'active') {
      await signOut(auth).catch(() => {});
      setError('العيادة المرتبطة بهذا الحساب قيد المراجعة أو موقوفة مؤقتاً.');
      return;
    }

    setSuccessMessage(`مرحباً ${staffData.name}! جاري فتح لوحة العيادة...`);
    setTimeout(() => {
      onSuccess(
        'receptionist',
        doctorSnap.id,
        doctorData.name,
        doctorData.clinicCode || staffData.clinicCode,
        undefined,
        undefined,
        'receptionist',
        staffData.name
      );
      onClose();
    }, 400);
  };

  // Professional Auth (Doctor / Receptionist / Lab) via Real Firebase Auth ONLY
  const handleProfessionalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setError('يرجى إدخال البريد الإلكتروني.');
      return;
    }

    if (!password || password.length < 6) {
      setError('كلمة المرور يجب أن تتكون من 6 أحرف على الأقل.');
      return;
    }

    if (selectedRole === 'receptionist' && mode === 'signup') {
      setError('حسابات السكرتارية والتمريض تُنشأ من داخل لوحة طبيب العيادة فقط.');
      return;
    }

    if (mode === 'signup') {
      if (selectedRole === 'lab') {
        if (!fullName.trim()) {
          setError('يرجى إدخال اسم معمل التحاليل.');
          return;
        }
        if (!technicianNameInput.trim()) {
          setError('يرجى إدخال اسم صاحب المعمل أو المدير الفني.');
          return;
        }
        if (!phone.trim()) {
          setError('يرجى إدخال رقم تليفون المعمل للتواصل والاعتماد.');
          return;
        }
      } else if (selectedRole === 'doctor' && !fullName.trim()) {
        setError('يرجى إدخال اسم الطبيب بالكامل.');
        return;
      }
    }

    setLoading(true);
    try {
      let resolvedName = fullName.trim();

      if (mode === 'signup') {
        const cred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
        const userId = cred.user.uid;
        await updateProfile(cred.user, { displayName: resolvedName }).catch(() => {});
        await sendEmailVerification(cred.user).catch(() => {});

        if (selectedRole === 'doctor') {
          const cleanName = resolvedName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase();
          const randNum = Math.floor(100 + Math.random() * 900);
          const resolvedClinicCode = `CLINIC-${cleanName || 'DOC'}-${randNum}`;

          const docData = {
            id: userId,
            uid: userId,
            name: resolvedName,
            clinicCode: resolvedClinicCode,
            clinicName: `عيادة ${resolvedName}`,
            specialty: 'استشاري أمراض القلب والقسطرة',
            email: cleanEmail,
            phone: phone.trim() || '',
            status: 'pending',
            verificationStatus: 'pending',
            medicalLicenseNumber: `EGY-MED-${randNum}9`,
            subscriptionExpiresAt: '2026-12-31',
            aiQueriesUsed: 0,
            aiQuotaLimit: 200,
            isAiBlocked: false,
            patientCount: 0,
            maxPatientsLimit: 50,
            planId: 'plan-starter',
            planName: 'باقة العيادة الذكية (Cardio Starter)',
            staffUids: [],
            createdAt: new Date().toISOString()
          };

          await setDoc(doc(db, 'doctors', userId), docData, { merge: true });
          await syncDoctorScheduleSummary({
            doctorId: userId,
            doctorName: resolvedName,
            clinicName: docData.clinicName,
            clinicCode: resolvedClinicCode,
            specialty: docData.specialty,
            status: 'pending'
          });
          await setDoc(
            doc(db, 'users', userId),
            {
              uid: userId,
              name: resolvedName,
              email: cleanEmail,
              phone: phone.trim() || '',
              role: 'doctor',
              clinicCode: resolvedClinicCode,
              status: 'pending',
              createdAt: new Date().toISOString()
            },
            { merge: true }
          );
          await setDoc(
            doc(db, 'system_users', userId),
            {
              id: userId,
              name: resolvedName,
              email: cleanEmail,
              role: 'Cardiologist',
              status: 'Inactive',
              lastLogin: new Date().toLocaleDateString('en-US'),
              licenseNumber: docData.medicalLicenseNumber,
              clinicCode: resolvedClinicCode
            },
            { merge: true }
          );
          await markSeedFlags({ doctorsSeeded: true, systemUsersSeeded: true });
          trackSignupAttempt('doctor', resolvedName, resolvedClinicCode);
          await signOut(auth).catch(() => {});

          setSignupPendingInfo({
            role: 'doctor',
            name: resolvedName,
            code: resolvedClinicCode
          });
          setLoading(false);
          return;
        }

        if (selectedRole === 'lab') {
          const cleanName = resolvedName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 5).toUpperCase();
          const randNum = Math.floor(10 + Math.random() * 90);
          const resolvedLabCode = `LAB-${cleanName || 'MED'}-${randNum}`;
          const resolvedTechnicianName = technicianNameInput.trim() || 'أخصائي التحاليل الطبية';
          const defaultLinked = partnerClinicCodeInput.trim()
            ? [partnerClinicCodeInput.trim().toUpperCase()]
            : [];

          const labData = {
            id: userId,
            uid: userId,
            name: resolvedName,
            labCode: resolvedLabCode,
            technicianName: resolvedTechnicianName,
            phone: phone.trim(),
            branch: 'الفرع الرئيسي للتشخيص المخبري',
            accreditation: 'معمل معتمد ومرخص رسمياً للتحاليل السريرية',
            linkedClinics: defaultLinked,
            email: cleanEmail,
            status: 'pending',
            testsProcessed: 0,
            createdAt: new Date().toISOString()
          };

          await setDoc(doc(db, 'labs', userId), labData, { merge: true });
          await setDoc(
            doc(db, 'users', userId),
            {
              uid: userId,
              name: resolvedName,
              technicianName: resolvedTechnicianName,
              phone: phone.trim(),
              email: cleanEmail,
              role: 'lab',
              labCode: resolvedLabCode,
              linkedClinics: defaultLinked,
              status: 'pending',
              createdAt: new Date().toISOString()
            },
            { merge: true }
          );
          await setDoc(
            doc(db, 'system_users', userId),
            {
              id: userId,
              name: resolvedName,
              email: cleanEmail,
              role: 'Lab / Imaging Center',
              status: 'Inactive',
              lastLogin: new Date().toLocaleDateString('en-US'),
              facilityName: labData.branch,
              labCode: resolvedLabCode
            },
            { merge: true }
          );
          await markSeedFlags({ labsSeeded: true, systemUsersSeeded: true });
          trackSignupAttempt('lab', resolvedName, resolvedLabCode);
          await signOut(auth).catch(() => {});

          setSignupPendingInfo({
            role: 'lab',
            name: resolvedName,
            code: resolvedLabCode
          });
          setLoading(false);
          return;
        }
      } else {
        // Real Firebase Auth Login
        const cred = await signInWithEmailAndPassword(auth, cleanEmail, password);
        const credUid = cred.user.uid;
        resolvedName = cred.user.displayName || '';

        if (selectedRole === 'receptionist') {
          await resolveReceptionistLogin(credUid, cleanEmail);
          setLoading(false);
          return;
        }

        const docCol = selectedRole === 'doctor' ? 'doctors' : 'labs';
        let snap = await getDoc(doc(db, docCol, credUid));
        let resolvedDocId = credUid;

        if (!snap.exists()) {
          const emailQuery = query(collection(db, docCol), where('email', '==', cleanEmail));
          const qSnap = await getDocs(emailQuery);
          if (!qSnap.empty) {
            snap = qSnap.docs[0] as any;
            resolvedDocId = qSnap.docs[0].id;
          }
        }

        if (!snap.exists()) {
          await signOut(auth).catch(() => {});
          setError(`لا يوجد حساب مسجل لهذا البريد في بوابة ${selectedRole === 'doctor' ? 'الأطباء' : 'المعامل'}.`);
          setLoading(false);
          return;
        }

        const d = snap.data() as any;
        resolvedName = d.name || resolvedName || (selectedRole === 'doctor' ? 'الطبيب' : 'معمل التحاليل');
        if (d.status === 'pending') {
          await signOut(auth).catch(() => {});
          setError(`حساب (${selectedRole === 'doctor' ? 'العيادة' : 'المعمل'}) في حالة مراجعة واعتماد حالياً من قِبل المشرف العام (Pending Approval).`);
          setLoading(false);
          return;
        }
        if (d.status === 'suspended') {
          await signOut(auth).catch(() => {});
          setError('حسابك مجمّد مؤقتاً من قبل إدارة المنظومة. يرجى التواصل مع المشرف العام للإعادة.');
          setLoading(false);
          return;
        }

        const resolvedClinicCode = selectedRole === 'doctor' ? (d.clinicCode || 'CLINIC-NEW') : undefined;
        const resolvedLabCode = selectedRole === 'lab' ? (d.labCode || 'LAB-NEW') : undefined;
        const resolvedTechnicianName =
          selectedRole === 'lab' ? (d.technicianName || d.name || 'أخصائي التحاليل السريرية') : undefined;

        setSuccessMessage('مرحباً بعودتك! جاري الدخول...');
        setTimeout(() => {
          onSuccess(
            selectedRole,
            resolvedDocId,
            resolvedName,
            resolvedClinicCode,
            resolvedLabCode,
            resolvedTechnicianName,
            selectedRole === 'doctor' ? 'doctor' : undefined
          );
          onClose();
        }, 400);
      }
    } catch (err: any) {
      console.warn('Auth error:', err);
      const code = err?.code || '';
      if (code === 'auth/email-already-in-use') {
        setError('هذا البريد مسجل بالفعل، يرجى التبديل لتبويب تسجيل الدخول.');
      } else if (code === 'auth/operation-not-allowed') {
        setError('تسجيل الدخول بالبريد وكلمة المرور غير مفعل حالياً في Firebase Auth؛ يمكنك التسجيل والدخول عبر Google مباشرة.');
      } else if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setError('البريد الإلكتروني أو كلمة المرور غير صحيحة.');
      } else if (code === 'auth/weak-password') {
        setError('كلمة المرور ضعيفة، يجب أن تتكون من 6 أحرف على الأقل.');
      } else {
        setError(err?.message || 'حدث خطأ أثناء المصادقة.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      const userDisplayName = cred.user.displayName || 'مستخدم مسجل';
      const userEmail = (cred.user.email || '').toLowerCase();

      if (selectedRole === 'receptionist') {
        await resolveReceptionistLogin(cred.user.uid, userEmail);
        return;
      }

      if (selectedRole === 'lab') {
        let labSnap = await getDoc(doc(db, 'labs', cred.user.uid));
        if (!labSnap.exists() && userEmail) {
          const qSnap = await getDocs(query(collection(db, 'labs'), where('email', '==', userEmail)));
          if (!qSnap.empty) labSnap = qSnap.docs[0] as any;
        }

        if (labSnap.exists()) {
          const existingLab = { id: labSnap.id, ...(labSnap.data() as any) };
          if (existingLab.status === 'pending') {
            await signOut(auth).catch(() => {});
            setError('طلب انضمام هذا المعمل قيد المراجعة والاعتماد حالياً من قِبل المشرف العام (Pending Approval).');
            return;
          }
          if (existingLab.status === 'suspended') {
            await signOut(auth).catch(() => {});
            setError('حساب المعمل مجمّد مؤقتاً من قبل الإدارة العامة للمنظومة.');
            return;
          }

          setSuccessMessage('تم تسجيل الدخول بحساب Google بنجاح!');
          setTimeout(() => {
            onSuccess('lab', existingLab.id, existingLab.name, undefined, existingLab.labCode, existingLab.technicianName);
            onClose();
          }, 400);
          return;
        } else {
          const cleanName = userDisplayName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 5).toUpperCase();
          const randNum = Math.floor(10 + Math.random() * 90);
          const genLabCode = `LAB-${cleanName || 'MED'}-${randNum}`;
          const labNameGoogle = `معمل ${userDisplayName}`;
          const phoneGoogle = cred.user.phoneNumber || phone.trim() || '';

          const newLabRecord = {
            id: cred.user.uid,
            uid: cred.user.uid,
            name: labNameGoogle,
            technicianName: userDisplayName,
            phone: phoneGoogle,
            email: userEmail,
            labCode: genLabCode,
            branch: 'الفرع الرئيسي للتشخيص المخبري',
            accreditation: 'معمل معتمد للتشخيص السريري',
            linkedClinics: [],
            status: 'pending',
            testsProcessed: 0,
            createdAt: new Date().toISOString()
          };

          await setDoc(doc(db, 'labs', cred.user.uid), newLabRecord, { merge: true });
          await setDoc(
            doc(db, 'users', cred.user.uid),
            {
              uid: cred.user.uid,
              name: labNameGoogle,
              technicianName: userDisplayName,
              phone: phoneGoogle,
              email: userEmail,
              role: 'lab',
              labCode: genLabCode,
              status: 'pending',
              createdAt: new Date().toISOString()
            },
            { merge: true }
          );
          await setDoc(
            doc(db, 'system_users', cred.user.uid),
            {
              id: cred.user.uid,
              name: labNameGoogle,
              email: userEmail,
              role: 'Lab / Imaging Center',
              status: 'Inactive',
              lastLogin: new Date().toLocaleDateString('en-US'),
              facilityName: newLabRecord.branch,
              labCode: genLabCode
            },
            { merge: true }
          );
          await markSeedFlags({ labsSeeded: true, systemUsersSeeded: true });
          trackSignupAttempt('lab', labNameGoogle, genLabCode);
          await signOut(auth).catch(() => {});

          setSignupPendingInfo({
            role: 'lab',
            name: labNameGoogle,
            code: genLabCode
          });
          return;
        }
      } else if (selectedRole === 'doctor') {
        let docSnap = await getDoc(doc(db, 'doctors', cred.user.uid));
        if (!docSnap.exists() && userEmail) {
          const qSnap = await getDocs(query(collection(db, 'doctors'), where('email', '==', userEmail)));
          if (!qSnap.empty) docSnap = qSnap.docs[0] as any;
        }

        if (docSnap.exists()) {
          const existingDoc = { id: docSnap.id, ...(docSnap.data() as any) };
          if (existingDoc.status === 'pending') {
            await signOut(auth).catch(() => {});
            setError('طلب انضمام هذه العيادة قيد المراجعة والاعتماد حالياً من قِبل المشرف العام.');
            return;
          }
          if (existingDoc.status === 'suspended') {
            await signOut(auth).catch(() => {});
            setError('حساب العيادة مجمّد مؤقتاً من قبل الإدارة العامة للمنظومة.');
            return;
          }

          setSuccessMessage('تم تسجيل الدخول بحساب Google بنجاح!');
          setTimeout(() => {
            onSuccess('doctor', existingDoc.id, existingDoc.name, existingDoc.clinicCode, undefined, undefined, 'doctor');
            onClose();
          }, 400);
          return;
        } else {
          const cleanName = userDisplayName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase();
          const randNum = Math.floor(100 + Math.random() * 900);
          const genClinicCode = `CLINIC-${cleanName || 'DOC'}-${randNum}`;
          const newDocRecord = {
            id: cred.user.uid,
            uid: cred.user.uid,
            name: userDisplayName,
            clinicCode: genClinicCode,
            clinicName: `عيادة ${userDisplayName}`,
            specialty: 'استشاري أمراض القلب والقسطرة',
            email: userEmail,
            phone: cred.user.phoneNumber || phone.trim() || '',
            status: 'pending',
            verificationStatus: 'pending',
            medicalLicenseNumber: `EGY-MED-${randNum}9`,
            subscriptionExpiresAt: '2026-12-31',
            aiQueriesUsed: 0,
            aiQuotaLimit: 200,
            isAiBlocked: false,
            patientCount: 0,
            maxPatientsLimit: 50,
            planId: 'plan-starter',
            planName: 'باقة العيادة الذكية (Cardio Starter)',
            staffUids: [],
            createdAt: new Date().toISOString()
          };

          await setDoc(doc(db, 'doctors', cred.user.uid), newDocRecord, { merge: true });
          await syncDoctorScheduleSummary({
            doctorId: cred.user.uid,
            doctorName: userDisplayName,
            clinicName: newDocRecord.clinicName,
            clinicCode: genClinicCode,
            specialty: newDocRecord.specialty,
            status: 'pending'
          });
          await setDoc(
            doc(db, 'users', cred.user.uid),
            {
              uid: cred.user.uid,
              name: userDisplayName,
              email: userEmail,
              role: 'doctor',
              clinicCode: genClinicCode,
              status: 'pending',
              createdAt: new Date().toISOString()
            },
            { merge: true }
          );
          await setDoc(
            doc(db, 'system_users', cred.user.uid),
            {
              id: cred.user.uid,
              name: userDisplayName,
              email: userEmail,
              role: 'Cardiologist',
              status: 'Inactive',
              lastLogin: new Date().toLocaleDateString('en-US'),
              licenseNumber: newDocRecord.medicalLicenseNumber,
              clinicCode: genClinicCode
            },
            { merge: true }
          );
          await markSeedFlags({ doctorsSeeded: true, systemUsersSeeded: true });
          trackSignupAttempt('doctor', userDisplayName, genClinicCode);
          await signOut(auth).catch(() => {});

          setSignupPendingInfo({
            role: 'doctor',
            name: userDisplayName,
            code: genClinicCode
          });
          return;
        }
      }
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        return;
      }
      if (code === 'auth/operation-not-allowed') {
        setError('تسجيل الدخول عبر Google غير مفعل حالياً، يرجى استخدام البريد الإلكتروني وكلمة المرور.');
        return;
      }
      setError('تعذر تسجيل الدخول عبر Google. يرجى المحاولة مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-all"
      dir="rtl"
    >
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative w-full max-w-[480px] bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-xl text-slate-800 z-10 overflow-hidden max-h-[95vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 left-5 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 flex items-center justify-center transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="text-center pt-2">
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            {selectedRole === 'patient'
              ? 'دخول المريض السريع'
              : selectedRole === 'receptionist'
              ? 'دخول موظفي العيادة (الاستقبال / التمريض)'
              : mode === 'signup'
              ? selectedRole === 'lab'
                ? 'تسجيل معمل تحاليل جديد'
                : 'تسجيل عيادة جديدة'
              : selectedRole === 'lab'
              ? 'دخول بوابة المعمل'
              : 'تسجيل الدخول للعيادة'}
          </h2>
          <p className="text-xs text-slate-500 mt-1.5">
            {selectedRole === 'patient'
              ? 'أدخل رقم ملفك الطبي للمتابعة المباشرة'
              : selectedRole === 'receptionist'
              ? 'إدارة الحجوزات، العلامات الحيوية، والخزينة والتعاقدات'
              : selectedRole === 'lab'
              ? 'ربط مباشر مع عيادات القلب لاستقبال وتوثيق التحاليل'
              : 'منظومة كارديوس الطبية الشاملة'}
          </p>
        </div>

        {/* Pending Review Confirmation View */}
        {signupPendingInfo ? (
          <div className="mt-6 space-y-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
              <Clock size={30} />
            </div>

            <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-5 text-right space-y-2">
              <h3 className="text-base font-bold text-slate-900">
                حساب {signupPendingInfo.role === 'lab' ? 'المعمل' : 'العيادة'} في حالة مراجعة واعتماد
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                تم استلام طلب تسجيل {signupPendingInfo.role === 'lab' ? 'معمل التحاليل' : 'العيادة'} (
                <span className="font-bold text-slate-900">{signupPendingInfo.name}</span>).
              </p>
              <div className="pt-2 border-t border-amber-200/60 flex items-center justify-between text-xs">
                <span className="text-slate-500">كود الحساب:</span>
                <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                  {signupPendingInfo.code}
                </span>
              </div>
              <p className="text-[11px] text-amber-800 pt-1 leading-relaxed">
                يقوم المشرف العام (Super Admin) بمراجعة البيانات واعتماد الحساب قبل التفعيل. يمكنك بعدها تسجيل الدخول مباشرة.
              </p>
            </div>

            <button
              onClick={() => {
                setSignupPendingInfo(null);
                onClose();
              }}
              className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
            >
              حسناً، تم استلام الطلب
            </button>
          </div>
        ) : (
          <>
            {/* Role Switcher Segmented Control */}
            <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-1 bg-slate-100 p-1 rounded-2xl">
              <button
                type="button"
                onClick={() => {
                  setSelectedRole('doctor');
                  setError(null);
                }}
                className={`py-2 px-1 text-[11px] font-bold rounded-xl transition-all cursor-pointer ${
                  selectedRole === 'doctor'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                طبيب (EHR)
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedRole('receptionist');
                  setMode('login');
                  setError(null);
                }}
                className={`py-2 px-1 text-[11px] font-bold rounded-xl transition-all cursor-pointer ${
                  selectedRole === 'receptionist'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                استقبال / تمريض
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedRole('lab');
                  setError(null);
                }}
                className={`py-2 px-1 text-[11px] font-bold rounded-xl transition-all cursor-pointer ${
                  selectedRole === 'lab'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                معمل تحاليل
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedRole('patient');
                  setError(null);
                }}
                className={`py-2 px-1 text-[11px] font-bold rounded-xl transition-all cursor-pointer ${
                  selectedRole === 'patient'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                المريض (QR)
              </button>
            </div>

            {error && (
              <div className="mt-4 p-3 bg-rose-50 border border-rose-200/80 rounded-xl text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle size={15} className="shrink-0 text-rose-500" />
                <span className="leading-relaxed">{error}</span>
              </div>
            )}

            {successMessage && (
              <div className="mt-4 p-3 bg-teal-50 border border-teal-200/80 rounded-xl text-teal-800 text-xs flex items-center gap-2">
                <CheckCircle2 size={15} className="shrink-0 text-teal-600" />
                <span className="leading-relaxed">{successMessage}</span>
              </div>
            )}

            {/* Form A: Patient Direct Access */}
            {selectedRole === 'patient' ? (
              <form onSubmit={handlePatientDirectAccess} className="mt-5 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    رقم الملف الطبي للمريض
                  </label>
                  <input
                    type="text"
                    value={patientIdInput}
                    onChange={(e) => setPatientIdInput(e.target.value)}
                    placeholder="أدخل رقم الملف الطبي المسلم من العيادة"
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-teal-500 rounded-xl py-3 px-4 text-slate-900 font-mono text-center text-sm font-bold placeholder:text-slate-400 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    رمز الأمان (Token) المطبوع على الكارت *
                  </label>
                  <input
                    type="text"
                    value={patientTokenInput}
                    onChange={(e) => setPatientTokenInput(e.target.value)}
                    placeholder="مثال: cp_xxxxxxxxxx"
                    dir="ltr"
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-teal-500 rounded-xl py-2.5 px-4 text-slate-700 font-mono text-center text-xs placeholder:text-slate-400 transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-sm transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <span>فتح ملف المريض</span>}
                </button>
              </form>
            ) : (
              /* Form B: Professional Account (Doctor / Receptionist / Lab) */
              <div className="mt-5 space-y-4">
                {selectedRole === 'receptionist' ? (
                  <div className="p-3 bg-indigo-50 border border-indigo-200/80 rounded-xl text-[11px] text-indigo-800 flex items-start gap-2">
                    <UserCheck size={16} className="shrink-0 text-indigo-600 mt-0.5" />
                    <span>
                      يتم إنشاء حساب السكرتارية أو التمريض من داخل حساب طبيب العيادة (زر <strong>طاقم العيادة</strong>) أو بواسطة المشرف العام، ثم تسجيل الدخول هنا.
                    </span>
                  </div>
                ) : (
                  <div className="flex border-b border-slate-200">
                    <button
                      type="button"
                      onClick={() => {
                        setMode('login');
                        setError(null);
                      }}
                      className={`flex-1 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                        mode === 'login'
                          ? 'border-teal-600 text-teal-700'
                          : 'border-transparent text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      تسجيل الدخول
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMode('signup');
                        setError(null);
                      }}
                      className={`flex-1 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                        mode === 'signup'
                          ? 'border-teal-600 text-teal-700'
                          : 'border-transparent text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      حساب جديد
                    </button>
                  </div>
                )}

                <div>
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 transition-all shadow-sm cursor-pointer"
                  >
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                    <span>
                      {selectedRole === 'lab'
                        ? 'تسجيل / دخول المعمل عبر Google'
                        : selectedRole === 'receptionist'
                        ? 'دخول طاقم العيادة عبر Google'
                        : 'المتابعة عبر Google'}
                    </span>
                  </button>
                </div>

                <form onSubmit={handleProfessionalSubmit} className="space-y-3 pt-1">
                  {mode === 'signup' && selectedRole !== 'receptionist' && (
                    <>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          {selectedRole === 'doctor' ? 'الاسم الكامل للطبيب' : 'اسم معمل التحاليل *'}
                        </label>
                        <input
                          type="text"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder={selectedRole === 'doctor' ? 'مثال: د/ اسم الطبيب' : 'مثال: معمل النيل للتحاليل الطبية'}
                          className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-teal-500 rounded-xl py-2.5 px-3.5 text-slate-900 text-xs placeholder:text-slate-400 transition-colors"
                        />
                      </div>

                      {selectedRole === 'lab' && (
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            اسم صاحب المعمل / المدير الفني *
                          </label>
                          <input
                            type="text"
                            value={technicianNameInput}
                            onChange={(e) => setTechnicianNameInput(e.target.value)}
                            placeholder="مثال: د. المدير الفني (استشاري الكيمياء الإكلينيكية)"
                            className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-teal-500 rounded-xl py-2.5 px-3.5 text-slate-900 text-xs placeholder:text-slate-400 transition-colors"
                          />
                        </div>
                      )}

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          رقم تليفون {selectedRole === 'lab' ? 'المعمل للتواصل والاعتماد *' : 'العيادة'}
                        </label>
                        <div className="relative">
                          <input
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="010XXXXXXXX"
                            dir="ltr"
                            className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-teal-500 rounded-xl py-2.5 px-3.5 pl-9 text-slate-900 text-xs placeholder:text-slate-400 transition-colors text-right font-mono"
                          />
                          <Phone size={14} className="absolute left-3 top-3 text-slate-400 pointer-events-none" />
                        </div>
                      </div>

                      {selectedRole === 'lab' && (
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            كود تعاقد عيادة للربط المبدئي (اختياري)
                          </label>
                          <input
                            type="text"
                            value={partnerClinicCodeInput}
                            onChange={(e) => setPartnerClinicCodeInput(e.target.value)}
                            placeholder="مثال: CLINIC-CODE-101"
                            dir="ltr"
                            className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-teal-500 rounded-xl py-2.5 px-3.5 text-slate-900 text-xs placeholder:text-slate-400 transition-colors font-mono"
                          />
                        </div>
                      )}
                    </>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      البريد الإلكتروني *
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="user@clinic.eg"
                      dir="ltr"
                      className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-teal-500 rounded-xl py-2.5 px-3.5 text-slate-900 text-xs placeholder:text-slate-400 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      كلمة المرور *
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        dir="ltr"
                        className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-teal-500 rounded-xl py-2.5 px-3.5 pl-10 text-slate-900 text-xs placeholder:text-slate-400 transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs sm:text-sm shadow-sm transition-all cursor-pointer"
                  >
                    {loading ? (
                      <Loader2 size={16} className="animate-spin mx-auto" />
                    ) : mode === 'signup' && selectedRole !== 'receptionist' ? (
                      <span>إرسال طلب تسجيل {selectedRole === 'lab' ? 'معمل التحاليل' : 'العيادة'}</span>
                    ) : (
                      <span>تسجيل الدخول</span>
                    )}
                  </button>
                </form>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
