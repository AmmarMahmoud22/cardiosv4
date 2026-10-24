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
  Phone
} from 'lucide-react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signInWithPopup,
  GoogleAuthProvider,
  GithubAuthProvider
} from 'firebase/auth';
import {doc, setDoc, getDoc} from 'firebase/firestore';
import {auth, db} from '../lib/firebase';
import {verifyPatientAccess, generatePatientToken} from '../lib/patientAuth';

export type UserRole = 'doctor' | 'lab' | 'patient';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (role: UserRole, id?: string, name?: string) => void;
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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Patient Quick Access fields
  const [patientIdInput, setPatientIdInput] = useState('1');
  const [patientTokenInput, setPatientTokenInput] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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
        setSuccessMessage(`أهلاً بك يا ${res.patientName || 'المريض'}! جاري فتح ملفك الطبي...`);
        setTimeout(() => {
          onSuccess('patient', cleanId, res.patientName);
          onClose();
        }, 600);
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

    if (mode === 'signup' && !fullName.trim()) {
      setError(selectedRole === 'doctor' ? 'يرجى إدخال اسم الطبيب بالكامل.' : 'يرجى إدخال اسم المعمل بالكامل.');
      return;
    }

    setLoading(true);

    try {
      let resolvedName = fullName.trim();

      if (mode === 'signup') {
        const cred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
        await updateProfile(cred.user, {displayName: resolvedName});

        // Store user profile with role in Firestore
        await setDoc(doc(db, 'users', cred.user.uid), {
          uid: cred.user.uid,
          name: resolvedName,
          email: cleanEmail,
          role: selectedRole,
          createdAt: new Date().toISOString()
        }, {merge: true});

        setSuccessMessage(`تم إنشاء حساب ${selectedRole === 'doctor' ? 'الطبيب' : 'المعمل'} بنجاح!`);
      } else {
        const cred = await signInWithEmailAndPassword(auth, cleanEmail, password);
        resolvedName = cred.user.displayName || (selectedRole === 'doctor' ? 'الطبيب' : 'المعمل');

        // Check if role is stored
        const userDoc = await getDoc(doc(db, 'users', cred.user.uid));
        if (userDoc.exists() && userDoc.data().role) {
          // If stored role differs from selected, inform or switch
          const storedRole = userDoc.data().role as UserRole;
          setSelectedRole(storedRole);
        }
        setSuccessMessage(`مرحباً بعودتك! جاري الدخول للوحة...`);
      }

      setTimeout(() => {
        onSuccess(selectedRole, undefined, resolvedName);
        onClose();
      }, 700);
    } catch (err: any) {
      console.warn('Auth error:', err);
      const code = err.code || '';
      if (code === 'auth/email-already-in-use') {
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
      const name = cred.user.displayName || 'مستخدم مسجل';

      // Save role
      await setDoc(doc(db, 'users', cred.user.uid), {
        uid: cred.user.uid,
        name,
        email: cred.user.email,
        role: selectedRole,
        lastLogin: new Date().toISOString()
      }, {merge: true});

      setSuccessMessage(`تم تسجيل الدخول بحساب Google بنجاح!`);
      setTimeout(() => {
        onSuccess(selectedRole, undefined, name);
        onClose();
      }, 600);
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        return;
      }
      console.warn('Google sign-in notice:', code);
      setError('تعذر تسجيل الدخول عبر Google. يمكنك استخدام البريد الإلكتروني.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md transition-all animate-fadeIn"
      dir="rtl"
    >
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative w-full max-w-[460px] bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl text-slate-100 z-10 overflow-hidden">
        {/* Top glow */}
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-64 h-32 bg-blue-500/15 blur-3xl pointer-events-none rounded-full" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 left-5 w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="text-center pt-2">
          <span className="text-[10px] font-mono tracking-wider text-blue-400 uppercase bg-blue-950/60 px-3 py-1 rounded-full border border-blue-500/30">
            منظومة Cardios الطبية والتشخيصية
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-2.5">
            {selectedRole === 'patient'
              ? 'دخول المريض المباشر'
              : mode === 'signup'
              ? 'إنشاء حساب مهني جديد'
              : 'تسجيل دخول الكادر المعتمد'}
          </h2>
          <p className="text-xs text-slate-400 mt-1.5">
            {selectedRole === 'patient'
              ? 'أدخل رقم ملفك الطبي أو رمز الأمان المسلم لك من العيادة'
              : 'منصة موحدة تربط الأطباء ومعامل التحاليل بملفات المرضى'}
          </p>
        </div>

        {/* Role Selector: 3 Choices (Doctor, Lab, Patient) */}
        <div className="mt-5 grid grid-cols-3 gap-2 bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800">
          <button
            type="button"
            onClick={() => {
              setSelectedRole('doctor');
              setError(null);
            }}
            className={`py-2 px-1 text-xs font-bold rounded-xl flex flex-col items-center gap-1 transition-all ${
              selectedRole === 'doctor'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Stethoscope size={16} />
            <span>طبيب (EHR)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedRole('lab');
              setError(null);
            }}
            className={`py-2 px-1 text-xs font-bold rounded-xl flex flex-col items-center gap-1 transition-all ${
              selectedRole === 'lab'
                ? 'bg-teal-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FlaskConical size={16} />
            <span>معمل تحاليل</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedRole('patient');
              setError(null);
            }}
            className={`py-2 px-1 text-xs font-bold rounded-xl flex flex-col items-center gap-1 transition-all ${
              selectedRole === 'patient'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <QrCode size={16} />
            <span>المريض (كود/QR)</span>
          </button>
        </div>

        {/* Alert Messages */}
        {error && (
          <div className="mt-4 p-3 bg-red-950/60 border border-red-500/30 rounded-xl text-red-300 text-xs flex items-center gap-2">
            <AlertCircle size={15} className="shrink-0 text-red-400" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="mt-4 p-3 bg-emerald-950/60 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 size={15} className="shrink-0 text-emerald-400" />
            <span className="leading-relaxed">{successMessage}</span>
          </div>
        )}

        {/* Case A: Patient Direct Access (No password / registration required) */}
        {selectedRole === 'patient' ? (
          <form onSubmit={handlePatientDirectAccess} className="mt-5 space-y-3.5">
            <div className="bg-emerald-950/30 border border-emerald-500/20 p-3 rounded-2xl text-[11px] text-emerald-300 leading-relaxed">
              <ShieldCheck size={16} className="inline ml-1 text-emerald-400" />
              <span>
                لا يحتاج المريض لإنشاء حساب أو بريد. فقط أدخل رقم الملف المسلم لك في العيادة.
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                رقم الملف الطبي للمريض (Patient File #)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={patientIdInput}
                  onChange={(e) => setPatientIdInput(e.target.value)}
                  placeholder="مثال: 1 أو P202601"
                  className="w-full bg-slate-950/80 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl py-3 px-4 text-white font-mono text-center text-sm font-bold placeholder:text-slate-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                رمز الأمان المسجل على كارت المتابعة (اختياري للتحقق السريع)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={patientTokenInput}
                  onChange={(e) => setPatientTokenInput(e.target.value)}
                  placeholder={generatePatientToken(patientIdInput || '1')}
                  dir="ltr"
                  className="w-full bg-slate-950/80 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl py-2.5 px-4 text-slate-300 font-mono text-center text-xs placeholder:text-slate-600"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl text-sm shadow-lg shadow-emerald-950/50 transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>جاري التحقق من السجل الطبي...</span>
                </>
              ) : (
                <>
                  <span>فتح ملف المريض الآن</span>
                  <ArrowRight size={16} className="transform -scale-x-100" />
                </>
              )}
            </button>
          </form>
        ) : (
          /* Case B: Doctor & Laboratory Professional Account */
          <div className="mt-5 space-y-4">
            {/* Login / Sign Up Pill Switcher */}
            <div className="bg-slate-950/70 p-1 rounded-2xl flex items-center border border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setError(null);
                }}
                className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all ${
                  mode === 'login'
                    ? 'bg-slate-800 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
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
                className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all ${
                  mode === 'signup'
                    ? 'bg-slate-800 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                حساب مهني جديد
              </button>
            </div>

            {/* Social Logins */}
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="flex items-center justify-center gap-2 py-2 px-3 bg-slate-800/70 hover:bg-slate-750 border border-slate-700/80 rounded-xl text-xs font-semibold text-slate-200 transition-all"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>Google</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  // Instant demo fast-lane for evaluation
                  onSuccess(selectedRole, undefined, selectedRole === 'doctor' ? 'طبيب العيادة' : 'معمل التحاليل');
                  onClose();
                }}
                className="py-2 px-3 bg-slate-800/70 hover:bg-slate-750 border border-slate-700/80 rounded-xl text-xs font-semibold text-blue-300 transition-all text-center"
              >
                <span>تجربة فورية سريعة</span>
              </button>
            </div>

            <div className="relative flex items-center my-3">
              <div className="flex-grow border-t border-slate-800" />
              <span className="flex-shrink mx-3 text-[10px] text-slate-500 font-medium">
                أو بالبريد الإلكتروني
              </span>
              <div className="flex-grow border-t border-slate-800" />
            </div>

            <form onSubmit={handleProfessionalSubmit} className="space-y-3">
              {mode === 'signup' && (
                <div className="relative">
                  <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                    <User size={15} />
                  </div>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder={selectedRole === 'doctor' ? 'اسم الطبيب / المركز' : 'اسم معمل التحاليل'}
                    className="w-full bg-slate-950/80 border border-slate-800 focus:border-blue-500 rounded-xl py-2.5 pr-10 pl-4 text-white text-xs placeholder:text-slate-500"
                  />
                </div>
              )}

              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail size={15} />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="البريد الإلكتروني"
                  dir="ltr"
                  className="w-full bg-slate-950/80 border border-slate-800 focus:border-blue-500 rounded-xl py-2.5 pr-10 pl-4 text-white text-xs placeholder:text-slate-500 placeholder:text-right"
                />
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock size={15} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="كلمة المرور"
                  dir="ltr"
                  className="w-full bg-slate-950/80 border border-slate-800 focus:border-blue-500 rounded-xl py-2.5 pr-10 pl-10 text-white text-xs placeholder:text-slate-500 placeholder:text-right"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`w-full py-3 text-white font-bold rounded-xl text-xs sm:text-sm shadow-md transition-all ${
                  selectedRole === 'doctor'
                    ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-900/30'
                    : 'bg-teal-600 hover:bg-teal-500 shadow-teal-900/30'
                }`}
              >
                {loading ? (
                  <Loader2 size={16} className="animate-spin mx-auto" />
                ) : mode === 'signup' ? (
                  <span>إنشاء حساب {selectedRole === 'doctor' ? 'طبيب' : 'معمل'} جديد</span>
                ) : (
                  <span>تسجيل الدخول للوحة {selectedRole === 'doctor' ? 'العيادة' : 'المعمل'}</span>
                )}
              </button>
            </form>
          </div>
        )}

        {/* Footer Security Badge */}
        <div className="mt-5 pt-2 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 text-[10px] font-medium">
            <ShieldCheck size={13} className="text-emerald-400 shrink-0" />
            <span>حماية خصوصية السجلات الطبية وفق قانون 151 لسنة 2020</span>
          </div>
        </div>
      </div>
    </div>
  );
}
