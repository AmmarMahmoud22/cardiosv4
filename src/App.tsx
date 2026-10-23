/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, {useState, useEffect} from 'react';
import Dashboard from './components/Dashboard';
import LandingPage from './components/LandingPage';
import PatientMobileDashboard from './components/PatientMobileDashboard';
import {seedDatabase} from './lib/seed';
import {isDoctorAuthenticated, setDoctorAuthenticated, verifyDoctorPin, DOCTOR_PIN} from './lib/patientAuth';
import {Stethoscope, Lock, ShieldCheck, ArrowRight, AlertCircle, Sparkles} from 'lucide-react';

export default function App() {
  const [view, setView] = useState<'landing' | 'dashboard' | 'portal'>('landing');
  const [portalPatientId, setPortalPatientId] = useState<string>('1');
  const [doctorAuthed, setDoctorAuthed] = useState<boolean>(false);
  const [pinInput, setPinInput] = useState<string>('');
  const [pinError, setPinError] = useState<string>('');

  useEffect(() => {
    seedDatabase();

    // Check existing doctor session
    if (isDoctorAuthenticated()) {
      setDoctorAuthed(true);
    }

    // Check for QR access URL params (?portal=true&patientId=...)
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('portal') === 'true') {
        const pId = params.get('patientId') || '1';
        setPortalPatientId(pId);
        setView('portal');
      }
    }
  }, []);

  const handleDoctorLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (verifyDoctorPin(pinInput)) {
      setDoctorAuthenticated(true);
      setDoctorAuthed(true);
      setPinError('');
      setPinInput('');
    } else {
      setPinError('رمز الدخول الطبي غير صحيح. (رمز العيادة التجريبي: ' + DOCTOR_PIN + ')');
    }
  };

  const handleDoctorLogout = () => {
    setDoctorAuthenticated(false);
    setDoctorAuthed(false);
    setView('landing');
  };

  // 1. Patient Portal Access (Via QR code or direct portal link)
  // Strictly isolated: NO buttons or banners to access doctor EHR
  if (view === 'portal') {
    return (
      <div className="min-h-screen bg-slate-100">
        <PatientMobileDashboard patientId={portalPatientId} isPortalMode={true} />
      </div>
    );
  }

  // 2. Landing Page
  if (view === 'landing') {
    return <LandingPage onLaunch={() => setView('dashboard')} />;
  }

  // 3. Doctor Dashboard Access - Protected with Doctor Security PIN Gate
  if (!doctorAuthed) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4 font-sans" dir="rtl">
        <div className="bg-slate-800 border border-slate-700 max-w-md w-full rounded-3xl p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500" />
          
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-blue-500/20 text-blue-400 border border-blue-400/30 flex items-center justify-center mx-auto mb-3 shadow-lg">
              <Stethoscope size={32} />
            </div>
            <h1 className="text-xl font-black text-white">منظومة Cardios Clinical EHR</h1>
            <p className="text-xs text-slate-400 mt-1">بوابة الدخول المحمية للكادر الطبي وأطباء القلب</p>
          </div>

          <div className="bg-blue-950/40 border border-blue-500/30 rounded-2xl p-3.5 mb-5 text-xs text-blue-200 flex items-start gap-2.5">
            <ShieldCheck size={20} className="text-blue-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              هذه اللوحة مخصصة للأطباء فقط لإدارة ملفات جميع المرضى والروشتات. يرجى إدخال الرقم السري للكادر الطبي المعتمد.
            </p>
          </div>

          <form onSubmit={handleDoctorLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                الرقم السري للطبيب (Doctor Security PIN)
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  placeholder="أدخل رمز المرور (مثال: 2026)"
                  maxLength={10}
                  autoFocus
                  className="w-full text-center text-lg tracking-widest font-mono font-bold p-3 bg-slate-900/80 border border-slate-600 rounded-xl text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <Lock size={16} className="absolute left-3.5 top-3.5 text-slate-500" />
              </div>
            </div>

            {pinError && (
              <div className="p-3 bg-red-950/50 border border-red-500/40 rounded-xl text-xs text-red-300 flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0 text-red-400" />
                <span>{pinError}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 text-white font-bold text-sm rounded-xl shadow-lg transition-all active:scale-98 flex items-center justify-center gap-2"
            >
              <span>تسجيل دخول الطبيب للوحة السريرية</span>
              <ArrowRight size={16} />
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-700/80 flex items-center justify-between text-xs text-slate-400">
            <button
              onClick={() => setView('landing')}
              className="hover:text-white transition-colors"
            >
              &larr; العودة للصفحة الرئيسية
            </button>
            <span className="text-[11px] text-slate-500">
              رمز الدخول التجريبي: <code className="text-blue-400 font-mono">2026</code>
            </span>
          </div>
        </div>
      </div>
    );
  }

  // 4. Authenticated Doctor EHR Dashboard
  return <Dashboard onLogout={handleDoctorLogout} />;
}
