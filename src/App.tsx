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
import { DEMO_DOCTOR_IDS, DEMO_LAB_IDS } from './lib/adminSync';
import { Stethoscope, FlaskConical, ArrowRight } from 'lucide-react';

import LaboratoryPortal from './components/LaboratoryPortal';
import SuperAdminPortal from './components/SuperAdminPortal';
import AuthModal, { UserRole } from './components/AuthModal';
import { OfflineSyncBanner } from './components/OfflineSyncBanner';
import { signOut } from 'firebase/auth';
import { auth } from './lib/firebase';
import { StaffRole } from './types/clinic';

export default function App() {
  const [view, setView] = useState<'landing' | 'dashboard' | 'portal' | 'lab-portal' | 'admin' | 'booking'>('landing');
  const [portalPatientId, setPortalPatientId] = useState<string>('');
  const [doctorAuthed, setDoctorAuthed] = useState<boolean>(false);
  const [doctorId, setDoctorId] = useState<string>('');
  const [doctorName, setDoctorName] = useState<string>('');
  const [clinicCode, setClinicCode] = useState<string>('');
  const [staffRole, setStaffRole] = useState<StaffRole>('doctor');
  const [staffName, setStaffName] = useState<string>('');

  // Laboratory Account State
  const [labId, setLabId] = useState<string>('');
  const [labName, setLabName] = useState<string>('');
  const [labCode, setLabCode] = useState<string>('');
  const [technicianName, setTechnicianName] = useState<string>('');
  const [labAuthed, setLabAuthed] = useState<boolean>(false);

  // Auth Modal State
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [authRole, setAuthRole] = useState<UserRole>('doctor');
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup'>('login');

  useEffect(() => {
    seedDatabase();

    let hasValidDoctor = false;
    if (isDoctorAuthenticated()) {
      try {
        const savedDoc = sessionStorage.getItem('cardios_doctor_profile');
        if (savedDoc) {
          const parsed = JSON.parse(savedDoc);
          if (parsed?.id && !DEMO_DOCTOR_IDS.includes(parsed.id)) {
            setDoctorId(parsed.id);
            setDoctorName(parsed.name || '');
            setClinicCode(parsed.clinicCode || '');
            setStaffRole(parsed.staffRole === 'receptionist' ? 'receptionist' : 'doctor');
            setStaffName(parsed.staffName || '');
            setDoctorAuthed(true);
            hasValidDoctor = true;
          } else {
            setDoctorAuthenticated(false);
            sessionStorage.removeItem('cardios_doctor_profile');
          }
        } else {
          setDoctorAuthenticated(false);
        }
      } catch {
        setDoctorAuthenticated(false);
      }
    }

    let hasValidLab = false;
    try {
      const savedLab = sessionStorage.getItem('cardios_lab_profile');
      if (savedLab) {
        const parsed = JSON.parse(savedLab);
        if (parsed?.id && !DEMO_LAB_IDS.includes(parsed.id)) {
          setLabId(parsed.id);
          setLabName(parsed.name || '');
          setLabCode(parsed.labCode || '');
          setTechnicianName(parsed.technicianName || '');
          setLabAuthed(true);
          hasValidLab = true;
        } else {
          sessionStorage.removeItem('cardios_lab_profile');
        }
      }
    } catch {
      // ignore storage read errors
    }

    // Check for URL params (?portal=true&patientId=..., ?booking=true&clinicCode=..., ?lab=true, ?admin=true)
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('booking') === 'true') {
        const cCode = params.get('clinicCode')?.trim() || '';
        if (cCode) {
          setClinicCode(cCode);
          setView('booking');
        }
      } else if (params.get('portal') === 'true') {
        const pId = params.get('patientId')?.trim() || '';
        if (pId) {
          setPortalPatientId(pId);
          setView('portal');
        } else {
          setAuthRole('patient');
          setAuthModalMode('login');
          setAuthModalOpen(true);
        }
      } else if (params.get('lab') === 'true') {
        if (hasValidLab) {
          setView('lab-portal');
        } else {
          setAuthRole('lab');
          setAuthModalMode('login');
          setAuthModalOpen(true);
        }
      } else if (params.get('dashboard') === 'true') {
        if (hasValidDoctor) {
          setView('dashboard');
        } else {
          setAuthRole('doctor');
          setAuthModalMode('login');
          setAuthModalOpen(true);
        }
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

  const handleDoctorLogout = async () => {
    setDoctorAuthenticated(false);
    setDoctorAuthed(false);
    setDoctorId('');
    setDoctorName('');
    setClinicCode('');
    setStaffRole('doctor');
    setStaffName('');
    try {
      sessionStorage.removeItem('cardios_doctor_profile');
    } catch {}
    await signOut(auth).catch(() => {});
    navigateTo('landing');
  };

  const handleLabLogout = async () => {
    setLabAuthed(false);
    setLabId('');
    setLabName('');
    setLabCode('');
    setTechnicianName('');
    try {
      sessionStorage.removeItem('cardios_lab_profile');
    } catch {}
    await signOut(auth).catch(() => {});
    navigateTo('landing');
  };

  return (
    <>
      {/* 1. Patient QR Booking View (When scanned via QR with valid clinicCode) */}
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

      {/* 3. Laboratory Portal Access (Requires authenticated lab session) */}
      {view === 'lab-portal' && (
        !labAuthed || !labId ? (
          <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4 font-sans" dir="rtl">
            <div className="bg-slate-800 border border-slate-700 max-w-md w-full rounded-3xl p-8 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-teal-500 via-blue-500 to-indigo-500" />
              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-teal-600 to-blue-700 p-1 flex items-center justify-center mx-auto mb-3 shadow-lg">
                  <FlaskConical size={32} className="text-white" />
                </div>
                <h1 className="text-xl font-black text-white">بوابة معامل التحاليل (Cardios Lab)</h1>
                <p className="text-xs text-slate-400 mt-1">يرجى تسجيل الدخول بحساب معمل معتمد للوصول إلى طلبات التحاليل</p>
              </div>
              <button
                onClick={() => {
                  setAuthRole('lab');
                  setAuthModalMode('login');
                  setAuthModalOpen(true);
                }}
                className="w-full py-3.5 bg-gradient-to-r from-teal-600 to-blue-700 hover:from-teal-700 hover:to-blue-800 text-white font-bold text-sm rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>تسجيل الدخول لبوابة المعمل</span>
                <ArrowRight size={16} className="transform -scale-x-100" />
              </button>
              <div className="mt-6 pt-5 border-t border-slate-700/80 text-center text-xs text-slate-400">
                <button
                  onClick={() => navigateTo('landing')}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  &larr; العودة للصفحة الرئيسية
                </button>
              </div>
            </div>
          </div>
        ) : (
          <LaboratoryPortal
            onBack={() => navigateTo('landing')}
            labId={labId}
            labName={labName}
            labCode={labCode}
            technicianName={technicianName}
            onLogout={handleLabLogout}
          />
        )
      )}

      {/* 4. Landing Page */}
      {view === 'landing' && (
        <LandingPage
          onLaunch={() => {
            if (doctorAuthed && doctorId) {
              navigateTo('dashboard');
            } else {
              setAuthRole('doctor');
              setAuthModalMode('login');
              setAuthModalOpen(true);
            }
          }}
          onOpenLabPortal={() => {
            if (labAuthed && labId) {
              navigateTo('lab-portal');
            } else {
              setAuthRole('lab');
              setAuthModalMode('login');
              setAuthModalOpen(true);
            }
          }}
          onOpenPatientPortal={(pId) => {
            if (pId) {
              setPortalPatientId(pId);
              navigateTo('portal');
            } else {
              setAuthRole('patient');
              setAuthModalMode('login');
              setAuthModalOpen(true);
            }
          }}
          onOpenAuthModal={(role, mode) => {
            setAuthRole(role || 'doctor');
            setAuthModalMode(mode || 'login');
            setAuthModalOpen(true);
          }}
          onOpenAdminPortal={() => navigateTo('admin')}
        />
      )}

      {/* 5. Super Admin Platform Owner Portal */}
      {view === 'admin' && (
        <SuperAdminPortal onBack={() => navigateTo('landing')} />
      )}

      {/* 6. Doctor Dashboard Access (Requires authenticated doctor session) */}
      {view === 'dashboard' && (
        !doctorAuthed || !doctorId ? (
          <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4 font-sans" dir="rtl">
            <div className="bg-slate-800 border border-slate-700 max-w-md w-full rounded-3xl p-8 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500" />

              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-700 p-1 flex items-center justify-center mx-auto mb-3 shadow-lg">
                  <Stethoscope size={32} className="text-white" />
                </div>
                <h1 className="text-xl font-black text-white">منظومة Cardios السريرية (Doctor EHR)</h1>
                <p className="text-xs text-slate-400 mt-1">يرجى تسجيل الدخول بحساب عيادة معتمد للوصول إلى سجلات المرضى</p>
              </div>

              <button
                onClick={() => {
                  setAuthRole('doctor');
                  setAuthModalMode('login');
                  setAuthModalOpen(true);
                }}
                className="w-full py-3.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 text-white font-bold text-sm rounded-xl shadow-lg transition-all active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>تسجيل الدخول لحساب العيادة</span>
                <ArrowRight size={16} className="transform -scale-x-100" />
              </button>

              <div className="mt-6 pt-5 border-t border-slate-700/80 text-center text-xs text-slate-400">
                <button
                  onClick={() => navigateTo('landing')}
                  className="hover:text-white transition-colors cursor-pointer"
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
            staffRole={staffRole}
            staffName={staffName}
          />
        )
      )}

      {/* Global Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialRole={authRole}
        initialMode={authModalMode}
        onSuccess={(role, id, name, cCode, lCode, techName, resolvedStaffRole, resolvedStaffName) => {
          if ((role === 'doctor' || role === 'receptionist') && id) {
            const finalStaffRole: StaffRole = role === 'receptionist' ? 'receptionist' : (resolvedStaffRole || 'doctor');
            setDoctorAuthenticated(true);
            setDoctorAuthed(true);
            setDoctorId(id);
            setDoctorName(name || '');
            setClinicCode(cCode || '');
            setStaffRole(finalStaffRole);
            setStaffName(resolvedStaffName || '');
            try {
              sessionStorage.setItem('cardios_doctor_profile', JSON.stringify({
                id,
                name: name || '',
                clinicCode: cCode || '',
                staffRole: finalStaffRole,
                staffName: resolvedStaffName || ''
              }));
            } catch {}
            setView('dashboard');
          } else if (role === 'lab' && id) {
            setLabAuthed(true);
            setLabId(id);
            setLabName(name || '');
            setLabCode(lCode || '');
            setTechnicianName(techName || '');
            try {
              sessionStorage.setItem('cardios_lab_profile', JSON.stringify({
                id,
                name: name || '',
                labCode: lCode || '',
                technicianName: techName || ''
              }));
            } catch {}
            setView('lab-portal');
          } else if (role === 'patient' && id) {
            setPortalPatientId(id);
            setView('portal');
          }
        }}
      />

      {/* Global Offline / Reconnect Auto-Sync Indicator */}
      <OfflineSyncBanner />
    </>
  );
}
