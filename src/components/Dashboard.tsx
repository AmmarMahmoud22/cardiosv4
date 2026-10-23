import React, {useState} from 'react';
import {Activity, Users, FileText, ClipboardList, Globe} from 'lucide-react';
import {useTranslation} from 'react-i18next';
import PatientTable from './PatientTable';
import PatientProfile from './PatientProfile';

export default function Dashboard() {
  const {t, i18n} = useTranslation();
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'patients' | 'calendar' | 'patientPortal'>('patients');
  const [showNewPatient, setShowNewPatient] = useState(false);
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
  const [showReportsModal, setShowReportsModal] = useState(false);

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === 'en' ? 'ar' : 'en');
  };

  if (selectedPatientId) {
    return <PatientProfile patientId={selectedPatientId} onBack={() => setSelectedPatientId(null)} />;
  }

  return (
    <div className={`p-6 space-y-6 ${i18n.language === 'ar' ? 'rtl' : 'ltr'}`}>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{t('dashboard')}</h1>
        <div className="flex gap-2">
            <button onClick={() => setActiveTab('patients')} className={`px-4 py-2 rounded ${activeTab === 'patients' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>Patients</button>
            <button onClick={() => setActiveTab('calendar')} className={`px-4 py-2 rounded ${activeTab === 'calendar' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>Calendar</button>
            <button onClick={() => setActiveTab('patientPortal')} className={`px-4 py-2 rounded ${activeTab === 'patientPortal' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>Patient Portal</button>
            <button onClick={() => setShowPrescriptionModal(true)} className="px-4 py-2 bg-green-600 text-white rounded">Smart Prescription</button>
            <button onClick={() => setShowReportsModal(true)} className="px-4 py-2 bg-purple-600 text-white rounded">Cardiology Reports</button>
            <button onClick={toggleLanguage} className="flex items-center gap-2 p-2 bg-gray-200 rounded">
            <Globe size={16} /> {i18n.language.toUpperCase()}
            </button>
        </div>
      </div>
      
      {showNewPatient && <NewPatientModal onClose={() => setShowNewPatient(false)} />}
      {showPrescriptionModal && <PrescriptionModal onClose={() => setShowPrescriptionModal(false)} />}
      {showReportsModal && <ReportsModal onClose={() => setShowReportsModal(false)} />}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <DashboardCard title={t('activePatients')} value="124" icon={<Users className="w-6 h-6" />} />
        <DashboardCard title={t('pendingLab')} value="8" icon={<FileText className="w-6 h-6" />} />
        <DashboardCard title={t('rpmAlerts')} value="3" icon={<Activity className="w-6 h-6" />} />
        <DashboardCard title={t('appointments')} value="15" icon={<ClipboardList className="w-6 h-6" />} />
      </div>
      
      {activeTab === 'patients' ? <PatientTable onSelectPatient={setSelectedPatientId} /> : activeTab === 'calendar' ? <CalendarView /> : <PatientMobileDashboard patientId="1" />}
      
      {activeTab === 'patients' && <AlertPanel />}
      <GeminiChat />
    </div>
  );
}
import CalendarView from './Calendar';
import PatientMobileDashboard from './PatientMobileDashboard';
import AlertPanel from './AlertPanel';
import NewPatientModal from './NewPatientModal';
import PrescriptionModal from './PrescriptionModal';
import ReportsModal from './ReportsModal';
import GeminiChat from './GeminiChat';

function DashboardCard({title, value, icon}: {title: string, value: string, icon: React.ReactNode}) {
  return (
    <div className="bg-white p-4 rounded-lg shadow flex items-center space-x-4">
      <div className="p-2 bg-blue-100 rounded-full">{icon}</div>
      <div dir="auto">
        <p className="text-gray-500 text-sm">{title}</p>
        <p className="text-xl font-bold">{value}</p>
      </div>
    </div>
  );
}
