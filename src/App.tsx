/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, {useState, useEffect} from 'react';
import Dashboard from './components/Dashboard';
import LandingPage from './components/LandingPage';
import PatientMobileDashboard from './components/PatientMobileDashboard';
import {seedDatabase} from './lib/seed';
import {isDoctorAuthenticated, setDoctorAuthenticated} from './lib/patientAuth';
import {Stethoscope, Lock, ShieldCheck, ArrowRight, Sparkles} from 'lucide-react';

import LaboratoryPortal from './components/LaboratoryPortal';
import AuthModal, {UserRole} from './components/AuthModal';

export default function App() {
  const [view, setView] = useState<'landing' | 'dashboard' | 'portal' | 'lab-portal'>('landing');
  const [portalPatientId, setPortalPatientId] = useState<string>('1');
  const [doctorAuthed, setDoctorAuthed] = useState<boolean>(true);
  const [doctorName, setDoctorName] = useState<string>('استشاري أمراض القلب');

  // Auth Modal State
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [authRole, setAuthRole] = useState<UserRole>('doctor');
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup'>('login');

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
      } else if (params.get('lab') === 'true') {
        setView('lab-portal');
      }
    }
  }, []);

  const navigateTo = (newView: 'landing' | 'dashboard' | 'portal' | 'lab-portal') => {
    if (typeof window !== 'undefined' && window.history && window.location.search) {
      window.history.replaceState({}, '', window.location.pathname);
    }
    setView(newView);
  };

  const handleDoctorLogout = () => {
    setDoctorAuthenticated(false);
    setDoctorAuthed(false);
    navigateTo('landing');
  };

  return (
    <>
      {/* 1. Patient Portal Access (Via QR code or direct file lookup) */}
      {view === 'portal' && (
        <div className="min-h-screen bg-slate-100">
          <PatientMobileDashboard
            patientId={portalPatientId}
            isPortalMode={true}
            onBack={() => navigateTo('landing')}
            onOpenAuth={() => {
              setAuthRole('patient');
              setAuthModalMode('login');
              setAuthModalOpen(true);
            }}
          />
        </div>
      )}

      {/* 2. Laboratory Portal Access */}
      {view === 'lab-portal' && (
        <LaboratoryPortal onBack={() => navigateTo('landing')} />
      )}

      {/* 3. Landing Page */}
      {view === 'landing' && (
        <LandingPage
          onLaunch={() => {
            setDoctorAuthed(true);
            navigateTo('dashboard');
          }}
          onOpenLabPortal={() => navigateTo('lab-portal')}
          onOpenPatientPortal={(pId) => {
            setPortalPatientId(pId || '1');
            navigateTo('portal');
          }}
          onOpenAuthModal={(role) => {
            setAuthRole(role || 'doctor');
            setAuthModalMode('login');
            setAuthModalOpen(true);
          }}
        />
      )}

      {/* 4. Doctor Dashboard Access */}
      {view === 'dashboard' && (
        !doctorAuthed ? (
          <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4 font-sans" dir="rtl">
            <div className="bg-slate-800 border border-slate-700 max-w-md w-full rounded-3xl p-8 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500" />
              
              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-700 p-1 flex items-center justify-center mx-auto mb-3 shadow-lg">
                  <Stethoscope size={32} className="text-white" />
                </div>
                <h1 className="text-xl font-black text-white">منظومة Cardios السريرية (Doctor EHR)</h1>
                <p className="text-xs text-slate-400 mt-1">بوابة الدخول المباشرة لكادر عيادات القلب والأوعية الدموية</p>
              </div>

              <button
                onClick={() => {
                  setDoctorAuthenticated(true);
                  setDoctorAuthed(true);
                }}
                className="w-full py-3.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 text-white font-bold text-sm rounded-xl shadow-lg transition-all active:scale-98 flex items-center justify-center gap-2"
              >
                <span>دخول لوحة الطبيب فوراً</span>
                <ArrowRight size={16} className="transform -scale-x-100" />
              </button>

              <div className="mt-6 pt-5 border-t border-slate-700/80 text-center text-xs text-slate-400">
                <button
                  onClick={() => setView('landing')}
                  className="hover:text-white transition-colors"
                >
                  &larr; العودة للصفحة الرئيسية
                </button>
              </div>
            </div>
          </div>
        ) : (
          <Dashboard
            onLogout={handleDoctorLogout}
            onBackToLanding={() => navigateTo('landing')}
            doctorName={doctorName}
          />
        )
      )}

      {/* Global Auth Modal (Doctor, Lab, or Patient QR entry) */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialRole={authRole}
        initialMode={authModalMode}
        onSuccess={(role, id, name) => {
          if (role === 'doctor') {
            setDoctorAuthed(true);
            if (name) setDoctorName(name);
            setView('dashboard');
          } else if (role === 'lab') {
            setView('lab-portal');
          } else if (role === 'patient') {
            setPortalPatientId(id || '1');
            setView('portal');
          }
        }}
      />
    </>
  );
}
