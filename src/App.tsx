/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {useState, useEffect} from 'react';
import Dashboard from './components/Dashboard';
import LandingPage from './components/LandingPage';
import PatientMobileDashboard from './components/PatientMobileDashboard';
import {seedDatabase} from './lib/seed';

export default function App() {
  const [view, setView] = useState<'landing' | 'dashboard' | 'portal'>('landing');
  const [portalPatientId, setPortalPatientId] = useState<string>('1');

  useEffect(() => {
    seedDatabase();

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

  if (view === 'portal') {
    return (
      <div className="min-h-screen bg-slate-100">
        <div className="bg-gray-900 text-white text-xs px-4 py-2 flex items-center justify-between no-print select-none">
          <span className="font-medium text-blue-300">📱 وضع تجربة بوابة المريض (Patient QR Portal View)</span>
          <button
            onClick={() => setView('dashboard')}
            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold transition-colors"
          >
            لوحة تحكم الطبيب &larr;
          </button>
        </div>
        <PatientMobileDashboard patientId={portalPatientId} />
      </div>
    );
  }

  if (view === 'landing') {
    return <LandingPage onLaunch={() => setView('dashboard')} />;
  }

  return <Dashboard />;
}
