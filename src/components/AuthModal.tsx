import React, {useState} from 'react';
import {
  X,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  ShieldCheck,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Stethoscope,
  FlaskConical,
  QrCode,
  KeyRound,
  ArrowRight,
  Clock,
  Phone
} from 'lucide-react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signInWithPopup,
  GoogleAuthProvider
} from 'firebase/auth';
import {doc, setDoc, getDoc, collection, getDocs} from 'firebase/firestore';
import {auth, db} from '../lib/firebase';
import {verifyPatientAccess, generatePatientToken} from '../lib/patientAuth';
import {trackDemoTrial, trackSignupAttempt} from '../lib/analytics';

export type UserRole = 'doctor' | 'lab' | 'patient';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (
    role: UserRole,
    id?: string,
    name?: string,
    clinicCode?: string,
    labCode?: string,
    technicianName?: string
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

  // Doctor/Lab fields
  const [fullName, setFullName] = useState('');
  const [technicianNameInput, setTechnicianNameInput] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [partnerClinicCodeInput, setPartnerClinicCodeInput] = useState('');

  // Patient Quick Access fields
  const [patientIdInput, setPatientIdInput] = useState('1');
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

  if (!isOpen) return null;

  // Patient direct file access (NO registration needed)
  const handlePatientDirectAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const cleanId = patientIdInput.trim();
    if (!cleanId) {
      setError('يرجى إدخال رقم الملف الطبي الخاص بك.');
      return;
    }

    setLoading(true);
    try {
      const token = patientTokenInput.trim() || generatePatientToken(cleanId);
      const res = await verifyPatientAccess(cleanId, token);
      if (res.valid) {
        trackDemoTrial('patient', `فتح ملف المريض #${cleanId} (${res.patientName || 'مريض'})`);
        setSuccessMessage(`أهلاً بك يا ${res.patientName || 'المريض'}! جاري فتح الملف الطبي...`);
        setTimeout(() => {
          onSuccess('patient', cleanId, res.patientName);
          onClose();
        }, 500);
      } else {
        setError(res.reason || 'رمز التحقق غير صحيح، يرجى مراجعة الكارت المسلم لك من العيادة.');
      }
    } catch (err: any) {
      setError('تعذر التحقق من الملف الطبي حالياً.');
    } finally {
      setLoading(false);
    }
  };

  // Doctor & Lab Auth
  const handleProfessionalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError('يرجى إدخال البريد الإلكتروني.');
      return;
    }

    if (!password || password.length < 6) {
      setError('كلمة المرور يجب أن تتكون من 6 أحرف على الأقل.');
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
      } else if (selectedRole === 'doctor') {
        if (!fullName.trim()) {
          setError('يرجى إدخال اسم الطبيب بالكامل.');
          return;
        }
      }
    }

    setLoading(true);

    try {
      let resolvedName = fullName.trim();
      let resolvedId: string | undefined = undefined;
      let resolvedClinicCode: string | undefined = undefined;
      let resolvedLabCode: string | undefined = undefined;
      let resolvedTechnicianName: string | undefined = undefined;

      if (mode === 'signup') {
        let userId = '';
        try {
          const cred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
          userId = cred.user.uid;
          await updateProfile(cred.user, {displayName: resolvedName});
        } catch (authErr: any) {
          if (authErr.code === 'auth/email-already-in-use') {
            setError('هذا البريد مسجل بالفعل، يرجى التبديل لتبويب تسجيل الدخول.');
            setLoading(false);
            return;
          }
          userId = `${selectedRole === 'doctor' ? 'doc' : 'lab'}-${Date.now().toString().slice(-6)}`;
        }

        resolvedId = userId;

        if (selectedRole === 'doctor') {
          const cleanName = resolvedName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase();
          const randNum = Math.floor(100 + Math.random() * 900);
          resolvedClinicCode = `CLINIC-${cleanName || 'DOC'}-${randNum}`;

          const docData = {
            id: userId,
            name: resolvedName,
            clinicCode: resolvedClinicCode,
            clinicName: `عيادة ${resolvedName}`,
            specialty: 'استشاري أمراض القلب والقسطرة',
            email: cleanEmail,
            phone: phone.trim() || '01000000000',
            status: 'pending',
            subscriptionExpiresAt: '2026-12-31',
            aiQueriesUsed: 0,
            aiQuotaLimit: 200,
            isAiBlocked: false,
            patientCount: 0,
            maxPatientsLimit: 50,
            planId: 'plan-starter',
            planName: 'باقة العيادة الذكية',
            createdAt: new Date().toISOString()
          };

          try {
            const rawPending = localStorage.getItem('cardios_local_pending_doctors');
            const list = rawPending ? JSON.parse(rawPending) : [];
            list.push(docData);
            localStorage.setItem('cardios_local_pending_doctors', JSON.stringify(list));
          } catch (e) {
            console.warn('LocalStorage notice:', e);
          }

          await setDoc(doc(db, 'doctors', userId), docData, {merge: true});
          await setDoc(doc(db, 'users', userId), {
            uid: userId,
            name: resolvedName,
            email: cleanEmail,
            phone: phone.trim() || '',
            role: 'doctor',
            clinicCode: resolvedClinicCode,
            status: 'pending',
            createdAt: new Date().toISOString()
          }, {merge: true});

          trackSignupAttempt('doctor', resolvedName, resolvedClinicCode);

          setSignupPendingInfo({
            role: 'doctor',
            name: resolvedName,
            code: resolvedClinicCode
          });
          setLoading(false);
          return;
        } else if (selectedRole === 'lab') {
          const cleanName = resolvedName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 5).toUpperCase();
          const randNum = Math.floor(10 + Math.random() * 90);
          resolvedLabCode = `LAB-${cleanName || 'MED'}-${randNum}`;
          resolvedTechnicianName = technicianNameInput.trim() || 'أخصائي التحاليل الطبية';
          const defaultLinked = partnerClinicCodeInput.trim() 
            ? [partnerClinicCodeInput.trim().toUpperCase()] 
            : ['CLINIC-AMMAR-101', 'CLINIC-SHERIF-202'];

          const labData = {
            id: userId,
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

          try {
            const rawPending = localStorage.getItem('cardios_local_pending_labs');
            const list = rawPending ? JSON.parse(rawPending) : [];
            list.push(labData);
            localStorage.setItem('cardios_local_pending_labs', JSON.stringify(list));
          } catch (e) {
            console.warn('LocalStorage notice:', e);
          }

          await setDoc(doc(db, 'labs', userId), labData, {merge: true});
          await setDoc(doc(db, 'users', userId), {
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
          }, {merge: true});

          trackSignupAttempt('lab', resolvedName, resolvedLabCode);

          setSignupPendingInfo({
            role: 'lab',
            name: resolvedName,
            code: resolvedLabCode
          });
          setLoading(false);
          return;
        }
      } else {
        // Mode is Login
        let credUid = '';
        try {
          const cred = await signInWithEmailAndPassword(auth, cleanEmail, password);
          credUid = cred.user.uid;
          resolvedName = cred.user.displayName || (selectedRole === 'doctor' ? 'الطبيب' : 'معمل التحاليل');
        } catch (authErr: any) {
          const colName = selectedRole === 'doctor' ? 'doctors' : 'labs';
          const qSnap = await getDocs(collection(db, colName));
          const matched = qSnap.docs.find(d => {
            const dt = d.data();
            return dt.email?.toLowerCase() === cleanEmail.toLowerCase();
          });
          if (matched) {
            credUid = matched.id;
            resolvedName = matched.data().name;
          } else {
            const localKey = selectedRole === 'doctor' ? 'cardios_local_pending_doctors' : 'cardios_local_pending_labs';
            const localList = JSON.parse(localStorage.getItem(localKey) || '[]');
            const localMatched = localList.find((item: any) => item.email?.toLowerCase() === cleanEmail.toLowerCase());
            if (localMatched) {
              if (localMatched.status === 'pending') {
                setError(`حساب (${selectedRole === 'doctor' ? 'العيادة' : 'المعمل'}) في حالة مراجعة واعتماد حالياً من قِبل المشرف العام (Pending Approval).`);
                setLoading(false);
                return;
              }
              credUid = localMatched.id;
              resolvedName = localMatched.name;
            } else {
              throw authErr;
            }
          }
        }

        // Verify status in Firestore
        const docCol = selectedRole === 'doctor' ? 'doctors' : 'labs';
        const snap = await getDoc(doc(db, docCol, credUid));
        if (snap.exists()) {
          const d = snap.data();
          if (d.status === 'pending') {
            setError(`حساب (${selectedRole === 'doctor' ? 'العيادة' : 'المعمل'}) في حالة مراجعة واعتماد حالياً من قِبل المشرف العام (Pending Approval).`);
            setLoading(false);
            return;
          }
          if (d.status === 'suspended') {
            setError('حسابك مجمّد مؤقتاً من قبل إدارة المنظومة. يرجى التواصل مع المشرف العام للإعادة.');
            setLoading(false);
            return;
          }
          if (selectedRole === 'doctor') {
            resolvedClinicCode = d.clinicCode || 'CLINIC-AMMAR-101';
          } else {
            resolvedLabCode = d.labCode || 'LAB-AZHARI-88';
            resolvedTechnicianName = d.technicianName || 'أخصائي التحاليل السريرية';
          }
        }

        setSuccessMessage(`مرحباً بعودتك! جاري الدخول...`);
        setTimeout(() => {
          onSuccess(selectedRole, credUid, resolvedName, resolvedClinicCode, resolvedLabCode, resolvedTechnicianName);
          onClose();
        }, 500);
      }
    } catch (err: any) {
      console.warn('Auth error:', err);
      const code = err.code || '';
      if (mode === 'signup') {
        setError('حدث خطأ أثناء إرسال طلب التسجيل: ' + (err.message || 'يرجى مراجعة البيانات'));
        setLoading(false);
        return;
      }
      if (code === 'auth/operation-not-allowed') {
        const cleanName = fullName.trim() || (cleanEmail ? cleanEmail.split('@')[0] : '') || (selectedRole === 'doctor' ? 'د/ عمار محمود' : 'معمل الأزهري للتحاليل');
        if (selectedRole === 'doctor') {
          onSuccess(selectedRole, 'doc-1', cleanName, 'CLINIC-AMMAR-101');
        } else {
          onSuccess(selectedRole, 'lab-1', cleanName, undefined, 'LAB-AZHARI-88', 'د. مروة الشيمي');
        }
        onClose();
        return;
      } else if (code === 'auth/email-already-in-use') {
        setError('هذا البريد مسجل بالفعل، يرجى التبديل لتبويب تسجيل الدخول.');
      } else if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setError('البريد الإلكتروني أو كلمة المرور غير صحيحة.');
      } else {
        setError(err.message || 'حدث خطأ أثناء المصادقة.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const cred = await signInWithPopup(auth, provider);
      const userDisplayName = cred.user.displayName || 'مستخدم مسجل';
      const userEmail = cred.user.email || '';

      if (selectedRole === 'lab') {
        // Check if this lab exists in Firestore
        const labDoc = await getDoc(doc(db, 'labs', cred.user.uid));
        let existingLab: any = labDoc.exists() ? labDoc.data() : null;

        if (!existingLab) {
          const qSnap = await getDocs(collection(db, 'labs'));
          const found = qSnap.docs.find(d => d.data().email?.toLowerCase() === userEmail.toLowerCase());
          if (found) existingLab = { id: found.id, ...found.data() };
        }

        if (existingLab) {
          if (existingLab.status === 'pending') {
            setError('طلب انضمام هذا المعمل قيد المراجعة والاعتماد حالياً من قِبل المشرف العام (Pending Approval).');
            setLoading(false);
            return;
          }
          if (existingLab.status === 'suspended') {
            setError('حساب المعمل مجمّد مؤقتاً من قبل الإدارة العامة للمنظومة.');
            setLoading(false);
            return;
          }

          setSuccessMessage('تم تسجيل الدخول بحساب Google بنجاح!');
          setTimeout(() => {
            onSuccess('lab', existingLab.id || cred.user.uid, existingLab.name, undefined, existingLab.labCode, existingLab.technicianName);
            onClose();
          }, 500);
          return;
        } else {
          // New Lab Registration via Google
          const cleanName = userDisplayName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 5).toUpperCase();
          const randNum = Math.floor(10 + Math.random() * 90);
          const genLabCode = `LAB-${cleanName || 'MED'}-${randNum}`;
          const labNameGoogle = `معمل ${userDisplayName}`;
          const techNameGoogle = userDisplayName;
          const phoneGoogle = cred.user.phoneNumber || phone.trim() || '01000000000';

          const newLabRecord = {
            id: cred.user.uid,
            name: labNameGoogle,
            technicianName: techNameGoogle,
            phone: phoneGoogle,
            email: userEmail,
            labCode: genLabCode,
            branch: 'الفرع الرئيسي للتشخيص المخبري',
            accreditation: 'معمل معتمد للتشخيص السريري',
            linkedClinics: ['CLINIC-AMMAR-101'],
            status: 'pending',
            testsProcessed: 0,
            createdAt: new Date().toISOString()
          };

          try {
            const rawPending = localStorage.getItem('cardios_local_pending_labs');
            const list = rawPending ? JSON.parse(rawPending) : [];
            list.push(newLabRecord);
            localStorage.setItem('cardios_local_pending_labs', JSON.stringify(list));
          } catch (e) {
            console.warn('LocalStorage error:', e);
          }

          await setDoc(doc(db, 'labs', cred.user.uid), newLabRecord, {merge: true});
          await setDoc(doc(db, 'users', cred.user.uid), {
            uid: cred.user.uid,
            name: labNameGoogle,
            technicianName: techNameGoogle,
            phone: phoneGoogle,
            email: userEmail,
            role: 'lab',
            labCode: genLabCode,
            status: 'pending',
            createdAt: new Date().toISOString()
          }, {merge: true});

          trackSignupAttempt('lab', labNameGoogle, genLabCode);

          setSignupPendingInfo({
            role: 'lab',
            name: labNameGoogle,
            code: genLabCode
          });
          setLoading(false);
          return;
        }
      } else {
        // Doctor or Patient Google Login
        await setDoc(doc(db, 'users', cred.user.uid), {
          uid: cred.user.uid,
          name: userDisplayName,
          email: userEmail,
          role: selectedRole,
          lastLogin: new Date().toISOString()
        }, {merge: true});

        setSuccessMessage(`تم تسجيل الدخول بحساب Google بنجاح!`);
        setTimeout(() => {
          onSuccess(selectedRole, cred.user.uid, userDisplayName, 'CLINIC-AMMAR-101');
          onClose();
        }, 500);
      }
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        return;
      }
      if (code === 'auth/operation-not-allowed') {
        const fallbackName = selectedRole === 'doctor' ? 'د/ عمار محمود' : 'معمل الأزهري للتحاليل';
        onSuccess(selectedRole, 'doc-1', fallbackName, 'CLINIC-AMMAR-101');
        onClose();
        return;
      }
      setError('تعذر تسجيل الدخول عبر Google. يمكنك استخدام البريد الإلكتروني أو الدخول التجريبي.');
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

      {/* Clean Minimalist Modal Box */}
      <div className="relative w-full max-w-[460px] bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-xl text-slate-800 z-10 overflow-hidden max-h-[95vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 left-5 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 flex items-center justify-center transition-colors"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="text-center pt-2">
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            {selectedRole === 'patient'
              ? 'دخول المريض السريع'
              : mode === 'signup'
              ? (selectedRole === 'lab' ? 'تسجيل معمل تحاليل جديد' : 'تسجيل عيادة جديدة')
              : (selectedRole === 'lab' ? 'دخول بوابة المعمل' : 'تسجيل الدخول')}
          </h2>
          <p className="text-xs text-slate-500 mt-1.5">
            {selectedRole === 'patient'
              ? 'أدخل رقم ملفك الطبي للمتابعة المباشرة'
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
                تم استلام طلب تسجيل {signupPendingInfo.role === 'lab' ? 'معمل التحاليل' : 'العيادة'} (<span className="font-bold text-slate-900">{signupPendingInfo.name}</span>).
              </p>
              <div className="pt-2 border-t border-amber-200/60 flex items-center justify-between text-xs">
                <span className="text-slate-500">كود الحساب:</span>
                <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                  {signupPendingInfo.code}
                </span>
              </div>
              <p className="text-[11px] text-amber-800 pt-1 leading-relaxed">
                يقوم المشرف العام (Super Admin) بمراجعة بيانات ترخيص المعمل وتفعيله خلال ساعات. يمكنك بعدها تسجيل الدخول واستقبال طلبات التحاليل مباشرة.
              </p>
            </div>

            <button
              onClick={() => {
                setSignupPendingInfo(null);
                onClose();
              }}
              className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
            >
              حسناً، تم استلام الطلب
            </button>
          </div>
        ) : (
          <>
            {/* Role Switcher Segmented Control */}
            <div className="mt-5 grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-2xl">
              <button
                type="button"
                onClick={() => {
                  setSelectedRole('doctor');
                  setError(null);
                }}
                className={`py-2 px-1 text-xs font-bold rounded-xl transition-all ${
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
                  setSelectedRole('lab');
                  setError(null);
                }}
                className={`py-2 px-1 text-xs font-bold rounded-xl transition-all ${
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
                className={`py-2 px-1 text-xs font-bold rounded-xl transition-all ${
                  selectedRole === 'patient'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                المريض (QR)
              </button>
            </div>

            {/* Alert Messages */}
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
                    placeholder="أدخل رقم الملف (مثال: 1)"
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-teal-500 rounded-xl py-3 px-4 text-slate-900 font-mono text-center text-sm font-bold placeholder:text-slate-400 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    رمز الأمان (اختياري)
                  </label>
                  <input
                    type="text"
                    value={patientTokenInput}
                    onChange={(e) => setPatientTokenInput(e.target.value)}
                    placeholder={generatePatientToken(patientIdInput || '1')}
                    dir="ltr"
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-teal-500 rounded-xl py-2.5 px-4 text-slate-700 font-mono text-center text-xs placeholder:text-slate-400 transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-sm transition-all shadow-sm flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <span>فتح ملف المريض</span>
                  )}
                </button>
              </form>
            ) : (
              /* Form B: Professional Account (Doctor / Lab) */
              <div className="mt-5 space-y-4">
                {/* Login / Signup Mode Toggle */}
                <div className="flex border-b border-slate-200">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setError(null);
                    }}
                    className={`flex-1 py-2 text-xs font-bold border-b-2 transition-all ${
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
                    className={`flex-1 py-2 text-xs font-bold border-b-2 transition-all ${
                      mode === 'signup'
                        ? 'border-teal-600 text-teal-700'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    حساب جديد
                  </button>
                </div>

                {/* Social Login Button */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={loading}
                    className="flex items-center justify-center gap-2 py-2.5 px-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 transition-all shadow-sm"
                  >
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                    <span>{selectedRole === 'lab' ? 'تسجيل بالمعمل عبر Google' : 'Google'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (selectedRole === 'lab') {
                        trackDemoTrial('lab', 'دخول فوري سريع لمعمل الأزهري');
                        onSuccess('lab', 'lab-1', 'معمل الأزهري للتحاليل السريرية', undefined, 'LAB-AZHARI-88', 'د. مروة الشيمي');
                      } else {
                        trackDemoTrial('doctor', 'دخول فوري عيادة د/ عمار');
                        onSuccess(selectedRole, undefined, 'د/ عمار محمود');
                      }
                      onClose();
                    }}
                    className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-semibold text-slate-700 transition-all text-center"
                  >
                    تجربة سريعة
                  </button>
                </div>

                <form onSubmit={handleProfessionalSubmit} className="space-y-3 pt-1">
                  {mode === 'signup' && (
                    <>
                      {/* Lab Name or Doctor Name */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          {selectedRole === 'doctor' ? 'الاسم الكامل للطبيب' : 'اسم معمل التحاليل *'}
                        </label>
                        <input
                          type="text"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder={selectedRole === 'doctor' ? 'مثال: د/ عمار محمود' : 'مثال: معمل النيل للتحاليل الطبية'}
                          className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-teal-500 rounded-xl py-2.5 px-3.5 text-slate-900 text-xs placeholder:text-slate-400 transition-colors"
                        />
                      </div>

                      {/* Lab Owner / Technician Name */}
                      {selectedRole === 'lab' && (
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            اسم صاحب المعمل / المدير الفني *
                          </label>
                          <input
                            type="text"
                            value={technicianNameInput}
                            onChange={(e) => setTechnicianNameInput(e.target.value)}
                            placeholder="مثال: د. مروة الشيمي (استشاري الكيمياء الإكلينيكية)"
                            className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-teal-500 rounded-xl py-2.5 px-3.5 text-slate-900 text-xs placeholder:text-slate-400 transition-colors"
                          />
                        </div>
                      )}

                      {/* Phone Number */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          رقم تليفون {selectedRole === 'lab' ? 'المعمل للتواصل والاعتماد *' : 'العيادة'}
                        </label>
                        <div className="relative">
                          <input
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="01012345678"
                            dir="ltr"
                            className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-teal-500 rounded-xl py-2.5 px-3.5 pl-9 text-slate-900 text-xs placeholder:text-slate-400 transition-colors text-right font-mono"
                          />
                          <Phone size={14} className="absolute left-3 top-3 text-slate-400 pointer-events-none" />
                        </div>
                      </div>

                      {/* Optional Clinic Partner Code for Labs */}
                      {selectedRole === 'lab' && (
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            كود تعاقد عيادة للربط المبدئي (اختياري)
                          </label>
                          <input
                            type="text"
                            value={partnerClinicCodeInput}
                            onChange={(e) => setPartnerClinicCodeInput(e.target.value)}
                            placeholder="CLINIC-AMMAR-101"
                            dir="ltr"
                            className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-teal-500 rounded-xl py-2.5 px-3.5 text-slate-900 text-xs placeholder:text-slate-400 transition-colors font-mono"
                          />
                        </div>
                      )}
                    </>
                  )}

                  {/* Email */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      البريد الإلكتروني *
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="lab@example.com"
                      dir="ltr"
                      className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-teal-500 rounded-xl py-2.5 px-3.5 text-slate-900 text-xs placeholder:text-slate-400 transition-colors"
                    />
                  </div>

                  {/* Password */}
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
                        className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs sm:text-sm shadow-sm transition-all"
                  >
                    {loading ? (
                      <Loader2 size={16} className="animate-spin mx-auto" />
                    ) : mode === 'signup' ? (
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
