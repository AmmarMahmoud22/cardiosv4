/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import LandingPage from './components/LandingPage';
import PatientMobileDashboard from './components/PatientMobileDashboard';
import PatientBookingView from './components/PatientBookingView';
import { seedDatabase } from './lib/seed';
import { isDoctorAuthenticated, setDoctorAuthenticated } from './lib/patientAuth';
import { Stethoscope, ArrowRight } from 'lucide-react';

import LaboratoryPortal from './components/LaboratoryPortal';
import SuperAdminPortal from './components/SuperAdminPortal';
import AuthModal, { UserRole } from './components/AuthModal';
import { trackDemoTrial } from './lib/analytics';

export default function App() {
  const [view, setView] = useState<'landing' | 'dashboard' | 'portal' | 'lab-portal' | 'admin' | 'booking'>('landing');
  const [portalPatientId, setPortalPatientId] = useState<string>('1');
  const [doctorAuthed, setDoctorAuthed] = useState<boolean>(true);
  const [doctorId, setDoctorId] = useState<string>('doc-1');
  const [doctorName, setDoctorName] = useState<string>('د/ عمار محمود');
  const [clinicCode, setClinicCode] = useState<string>('CLINIC-AMMAR-101');

  // Laboratory Account State
  const [labId, setLabId] = useState<string>('lab-1');
  const [labName, setLabName] = useState<string>('معمل الأزهري للتحاليل التخصصية والوراثية');
  const [labCode, setLabCode] = useState<string>('LAB-AZHARI-88');
  const [technicianName, setTechnicianName] = useState<string>('د. مروة الشيمي (استشاري الكيمياء الإكلينيكية)');
  const [isLabDemoSession, setIsLabDemoSession] = useState<boolean>(true);

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

    // Check for URL params (?portal=true&patientId=..., ?booking=true&clinicCode=..., ?lab=true, ?admin=true)
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('booking') === 'true') {
        const cCode = params.get('clinicCode') || 'CLINIC-AMMAR-101';
        setClinicCode(cCode);
        trackDemoTrial('patient', `دخول مباشر لبوابة حجز المريض عبر QR كود العيادة ${cCode}`);
        setView('booking');
      } else if (params.get('portal') === 'true') {
        const pId = params.get('patientId') || '1';
        trackDemoTrial('patient', `دخول مباشر لكارت المريض #${pId} عبر الرابط`);
        setPortalPatientId(pId);
        setView('portal');
      } else if (params.get('lab') === 'true') {
        trackDemoTrial('lab', 'دخول مباشر لبوابة المعامل عبر الرابط');
        setView('lab-portal');
      } else if (params.get('admin') === 'true') {
        setView('admin');
      }
    }
  }, []);

  const navigateTo = (newView: 'landing' | 'dashboard' | 'portal' | 'lab-portal' | 'admin' | 'booking') => {
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
      {/* 1. Patient QR Booking View (When scanned via QR or navigated) */}
      {view === 'booking' && (
        <PatientBookingView
          clinicCode={clinicCode}
          onBackToMain={() => navigateTo('landing')}
        />
      )}

      {/* 2. Patient Mobile EHR Access */}
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

      {/* 3. Laboratory Portal Access */}
      {view === 'lab-portal' && (
        <LaboratoryPortal
          onBack={() => navigateTo('landing')}
          labId={labId}
          labName={labName}
          labCode={labCode}
          technicianName={technicianName}
          isDemoSession={isLabDemoSession}
          onSwitchLab={(switchedLab) => {
            setLabId(switchedLab.id);
            setLabName(switchedLab.name);
            setLabCode(switchedLab.code);
            setTechnicianName(switchedLab.technician);
            setIsLabDemoSession(true);
          }}
          onLogout={() => {
            setIsLabDemoSession(true);
            navigateTo('landing');
          }}
        />
      )}

      {/* 4. Landing Page */}
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
          onOpenAdminPortal={() => navigateTo('admin')}
        />
      )}

      {/* 5. Super Admin Platform Owner Portal */}
      {view === 'admin' && (
        <SuperAdminPortal onBack={() => navigateTo('landing')} />
      )}

      {/* 6. Doctor Dashboard Access */}
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
            onOpenAdminPortal={() => navigateTo('admin')}
            doctorId={doctorId}
            doctorName={doctorName}
            clinicCode={clinicCode}
          />
        )
      )}

      {/* Global Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialRole={authRole}
        initialMode={authModalMode}
        onSuccess={(role, id, name, cCode, lCode, techName) => {
          if (role === 'doctor') {
            setDoctorAuthed(true);
            if (id) setDoctorId(id);
            if (name) setDoctorName(name);
            if (cCode) setClinicCode(cCode);
            setView('dashboard');
          } else if (role === 'lab') {
            if (id) {
              setLabId(id);
              setIsLabDemoSession(id === 'lab-1' || id === 'lab-2' || id === 'lab-3');
            }
            if (name) setLabName(name);
            if (lCode) setLabCode(lCode);
            if (techName) setTechnicianName(techName);
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
