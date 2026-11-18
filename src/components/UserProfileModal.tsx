import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  User,
  Camera,
  Upload,
  CheckCircle2,
  Save,
  Shield,
  Phone,
  Mail,
  Lock,
  Globe,
  Bell,
  Stethoscope,
  RefreshCw,
  AlertCircle,
  Building2,
  MessageCircle,
  Check
} from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useLanguage } from '../context/LanguageContext';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
  userName?: string;
  userEmail?: string;
  userPhone?: string;
  userRole?: 'Cardiologist' | 'System Administrator' | 'Lab / Imaging Center' | 'Patient';
  avatarUrl?: string;
  clinicWhatsAppNumber?: string;
  onSaveSuccess?: (updatedData: {
    name: string;
    email: string;
    phone: string;
    avatarUrl: string;
    clinicWhatsAppNumber?: string;
  }) => void;
}

// Compress dataURL down to max 250x250 WebP for instant Firestore save
const compressPhoto = (dataUrl: string, maxWidth = 250, maxHeight = 250, quality = 0.85): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = dataUrl;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/webp', quality));
      } else {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
  });
};

export default function UserProfileModal({
  isOpen,
  onClose,
  userId = '',
  userName = '',
  userEmail = '',
  userPhone = '',
  userRole = 'Cardiologist',
  avatarUrl: initialAvatarUrl = '',
  clinicWhatsAppNumber: initialClinicWhatsApp = '',
  onSaveSuccess
}: UserProfileModalProps) {
  const { language, isRTL, t, setLanguage } = useLanguage();

  // Form States
  const [name, setName] = useState(userName);
  const [email, setEmail] = useState(userEmail);
  const [phone, setPhone] = useState(userPhone);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const [clinicWhatsApp, setClinicWhatsApp] = useState(initialClinicWhatsApp);
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');

  // Preferences
  const [notifyWhatsApp, setNotifyWhatsApp] = useState(true);
  const [notifyRpmAlerts, setNotifyRpmAlerts] = useState(true);
  const [notifyEmailReports, setNotifyEmailReports] = useState(false);

  // Status & Feedback
  const [saving, setSaving] = useState(false);
  const [successToast, setSuccessToast] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Camera State
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState('');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Sync props when modal opens
  useEffect(() => {
    if (isOpen) {
      setName(userName);
      setEmail(userEmail);
      setPhone(userPhone);
      setAvatarUrl(initialAvatarUrl);
      setClinicWhatsApp(initialClinicWhatsApp);
      setSuccessToast('');
      setErrorMessage('');

      // Attempt to load profile from Firestore
      if (!userId) return;
      const loadProfile = async () => {
        try {
          const userDocRef = doc(db, 'users', userId);
          const snap = await getDoc(userDocRef);
          if (snap.exists()) {
            const data = snap.data();
            if (data.name) setName(data.name);
            if (data.email) setEmail(data.email);
            if (data.phone) setPhone(data.phone);
            if (data.avatarUrl) setAvatarUrl(data.avatarUrl);
            if (data.clinicWhatsAppNumber) setClinicWhatsApp(data.clinicWhatsAppNumber);
          }
        } catch (e) {
          console.warn('Profile load from Firestore fallback:', e);
        }
      };
      loadProfile();
    } else {
      stopCamera();
    }
  }, [isOpen, userId, userName, userEmail, userPhone, initialAvatarUrl, initialClinicWhatsApp]);

  // Clean up camera stream on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Stop WebCam Stream
  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
    setIsCameraActive(false);
  };

  // Start WebCam
  const startCamera = async () => {
    setCameraError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 400, height: 400, facingMode: 'user' }
      });
      setCameraStream(stream);
      setIsCameraActive(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      setCameraError(
        err.name === 'NotAllowedError'
          ? 'تم رفض الإذن باستخدام الكاميرا. يرجى إعطاء الصلاحية في المتصفح.'
          : 'تعذر الوصول إلى الكاميرا. تأكد من وجود كاميرا متصلة.'
      );
    }
  };

  // Capture photo from video stream
  const capturePhoto = async () => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 300;
    canvas.height = video.videoHeight || 300;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const rawDataUrl = canvas.toDataURL('image/jpeg');
      const compressed = await compressPhoto(rawDataUrl);
      setAvatarUrl(compressed);
      stopCamera();
    }
  };

  // Upload file from device
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMessage('يرجى اختيار ملف صورة صالح (JPG, PNG, WEBP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (evt) => {
      if (evt.target?.result) {
        const compressed = await compressPhoto(evt.target.result as string);
        setAvatarUrl(compressed);
      }
    };
    reader.readAsDataURL(file);
  };

  // Save profile modifications
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) {
      setErrorMessage('معرف المستخدم غير متوفر.');
      return;
    }
    if (!name.trim()) {
      setErrorMessage('الاسم مطلوب.');
      return;
    }

    setSaving(true);
    setErrorMessage('');

    const updatedProfile = {
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      avatarUrl,
      clinicWhatsAppNumber: clinicWhatsApp.trim() || phone.trim(),
      preferredLanguage: language,
      notifications: {
        whatsApp: notifyWhatsApp,
        rpmAlerts: notifyRpmAlerts,
        emailReports: notifyEmailReports
      },
      updatedAt: new Date().toISOString()
    };

    try {
      // Save to user doc
      await setDoc(doc(db, 'users', userId), updatedProfile, { merge: true }).catch(() => {});
      
      // If doctor, also update doctor profile so patients get updated WhatsApp number!
      if (userRole === 'Cardiologist') {
        await setDoc(
          doc(db, 'doctors', userId),
          {
            name: name.trim(),
            email: email.trim(),
            phone: phone.trim(),
            clinicWhatsAppNumber: clinicWhatsApp.trim() || phone.trim()
          },
          { merge: true }
        ).catch(() => {});

        // Save to local storage for instant global availability
        localStorage.setItem(`cardios_clinic_whatsapp_${userId}`, clinicWhatsApp.trim() || phone.trim());
      }

      setSuccessToast('✓ تم حفظ إعدادات الملف الشخصي وتحديث بيانات التواصل بنجاح!');

      if (onSaveSuccess) {
        onSaveSuccess({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          avatarUrl,
          clinicWhatsAppNumber: clinicWhatsApp.trim() || phone.trim()
        });
      }

      setTimeout(() => {
        setSuccessToast('');
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error('Error saving profile:', err);
      setErrorMessage('حدث خطأ أثناء الحفظ. يرجى المحاولة مرة أخرى.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="bg-white rounded-3xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 relative flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-teal-300">
              <User className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold">الملف الشخصي وإعدادات الحساب</h2>
              <p className="text-xs text-slate-300 mt-0.5">
                تحديث البيانات الشخصية، التقاط الصورة بالكاميرا، ورقم الواتساب للمرضى
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSaveProfile} className="p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* Status Notifications */}
          {successToast && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3.5 rounded-2xl text-xs font-semibold flex items-center gap-2 animate-fade-in">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{successToast}</span>
            </div>
          )}

          {errorMessage && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3.5 rounded-2xl text-xs font-semibold flex items-center gap-2 animate-fade-in">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Section 1: Profile Photo & Camera Capture */}
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/80 space-y-4">
            <label className="block text-xs font-bold text-slate-800">
              صورة الملف الشخصي (Profile Photo)
            </label>

            <div className="flex flex-col sm:flex-row items-center gap-5">
              {/* Photo Preview / Webcam View */}
              <div className="relative w-24 h-24 rounded-2xl overflow-hidden border-2 border-purple-200 bg-white flex items-center justify-center shadow-inner shrink-0">
                {isCameraActive ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover scale-x-[-1]"
                  />
                ) : avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-indigo-50 text-indigo-700 flex items-center justify-center text-2xl font-black">
                    {name.charAt(0) || 'U'}
                  </div>
                )}
              </div>

              {/* Photo Controls */}
              <div className="space-y-2.5 w-full">
                {isCameraActive ? (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={capturePhoto}
                      className="flex-1 py-2 px-3 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <Camera className="w-4 h-4" />
                      <span>التقاط الصورة الآن</span>
                    </button>
                    <button
                      type="button"
                      onClick={stopCamera}
                      className="py-2 px-3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl transition-colors"
                    >
                      إلغاء الكاميرا
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {/* Camera Button */}
                    <button
                      type="button"
                      onClick={startCamera}
                      className="py-2 px-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <Camera className="w-4 h-4" />
                      <span>التقاط صورة بالكاميرا</span>
                    </button>

                    {/* File Upload Button */}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="py-2 px-3.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Upload className="w-4 h-4" />
                      <span>رفع صورة من الجهاز</span>
                    </button>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </div>
                )}

                {cameraError && (
                  <p className="text-[11px] text-rose-600 font-medium">{cameraError}</p>
                )}

                <p className="text-[11px] text-slate-500">
                  يمكنك رفع صورة شخصية من جهازك أو تشغيل كاميرا الويب مباشرة لالتقاط صورتك الشخصية.
                </p>
              </div>
            </div>
          </div>

          {/* Section 2: Personal Information */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
              البيانات الشخصية والمعلومات العامة
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  الاسم الكامل *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="د. اسم الطبيب"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                  <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  البريد الإلكتروني
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="doctor@example.com"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
              </div>

              {/* Phone Number */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  رقم الهاتف الشخصي
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="010XXXXXXXX"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                  <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
              </div>

              {/* Role Display */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  الدور في المنظومة
                </label>
                <div className="px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-indigo-600" />
                  <span>{userRole}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: WhatsApp Contact for Patient Portal */}
          <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200 space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                <MessageCircle className="w-4 h-4 text-emerald-600" />
                رقم الواتساب المخصص لعيادتك (الذي يتواصل عليه المريض في البوابة)
              </label>
              <span className="text-[10px] bg-emerald-200 text-emerald-900 font-bold px-2 py-0.5 rounded-full">
                تواصل المرضى
              </span>
            </div>

            <p className="text-[11px] text-emerald-800 leading-relaxed">
              هذا هو الرقم الذي يظهر للمريض في بوابة المتابعة للضغط عليه والتواصل مباشرة عبر الواتساب مع عيادتك.
            </p>

            <input
              type="text"
              value={clinicWhatsApp}
              onChange={(e) => setClinicWhatsApp(e.target.value)}
              placeholder="مثال: 010XXXXXXXX"
              className="w-full px-3.5 py-2 bg-white border border-emerald-300 rounded-xl text-sm font-mono font-bold text-emerald-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
            />
          </div>

          {/* Section 4: Preferences & Notifications */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              إعدادات التنبيهات والواجهة
            </h3>

            <div className="space-y-2">
              <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors">
                <div className="flex items-center gap-2.5">
                  <Globe className="w-4 h-4 text-indigo-600" />
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">لغة الواجهة المفضلة</span>
                    <span className="text-[11px] text-slate-500">العربية / English</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
                  className="px-3 py-1 bg-white border border-slate-300 text-slate-800 rounded-lg text-xs font-bold"
                >
                  {language === 'ar' ? 'العربية 🇪🇬' : 'English 🇬🇧'}
                </button>
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors">
                <div className="flex items-center gap-2.5">
                  <Bell className="w-4 h-4 text-amber-600" />
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">إشعارات الحالات الحرجة لمرضى الضغط (RPM Alerts)</span>
                    <span className="text-[11px] text-slate-500">تنبيهات فورية عند تسجيل المريض لقياسات ضغط مرتفعة حادة</span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={notifyRpmAlerts}
                  onChange={(e) => setNotifyRpmAlerts(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                />
              </label>
            </div>
          </div>

          {/* Footer Submit Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                stopCamera();
                onClose();
              }}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
            >
              إلغاء
            </button>

            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'جاري الحفظ...' : 'حفظ التعديلات'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
