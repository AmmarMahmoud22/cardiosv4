import React, {useEffect, useState} from 'react';
import {collection, getDocs} from 'firebase/firestore';
import {db} from '../lib/firebase';
import {Search, User, Heart, AlertTriangle, CheckCircle2, ChevronRight, Stethoscope, Sparkles, Filter} from 'lucide-react';
import {useLanguage} from '../context/LanguageContext';

interface Patient {
  id: string;
  doctorId?: string;
  clinicCode?: string;
  name: string;
  nameEn?: string;
  dob: string;
  age?: number;
  gender?: string;
  phone?: string;
  status: string;
  diagnosis?: string;
  riskTier?: string;
  ef?: number;
}

export default function PatientTable({
  onSelectPatient,
  doctorId = 'doc-1',
  doctorName,
  onOpenNewPatientModal
}: {
  onSelectPatient: (id: string) => void;
  doctorId?: string;
  doctorName?: string;
  onOpenNewPatientModal?: () => void;
}) {
  const { language, direction, isRTL, t } = useLanguage();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'patients'));
        const patientsData = querySnapshot.docs.map(doc => ({id: doc.id, ...doc.data()})) as Patient[];
        setPatients(patientsData);
      } finally {
        setLoading(false);
      }
    };
    fetchPatients();
  }, []);

  // Filter patients by Doctor to ensure strict clinical isolation
  const doctorIsolatedPatients = patients.filter(patient => {
    if (!doctorId) return true;
    if (patient.doctorId) {
      return patient.doctorId === doctorId;
    }
    // Backward compatibility for legacy initial patients without doctorId -> doc-1
    return doctorId === 'doc-1';
  });

  const filteredPatients = doctorIsolatedPatients.filter(patient => {
    const matchesSearch = 
      patient.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (patient.nameEn && patient.nameEn.toLowerCase().includes(searchTerm.toLowerCase())) ||
      patient.diagnosis?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.phone?.includes(searchTerm);

    if (!matchesSearch) return false;

    if (filterStatus === 'alerts') {
      return patient.status?.includes('تنبيه') || patient.status?.includes('Alert');
    }
    if (filterStatus === 'stable') {
      return patient.status?.includes('مستقر') || patient.status?.includes('Stable');
    }
    if (filterStatus === 'heart-failure') {
      return (patient.ef && patient.ef < 50) || patient.diagnosis?.includes('قصور');
    }

    return true;
  });

  return (
    <div className="bg-white p-5 sm:p-6 rounded-3xl shadow-sm border border-slate-200 mt-6 font-sans" dir={direction}>
      {/* Table Header & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div>
          <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
            <Stethoscope size={20} className="text-blue-600" />
            <span>{isRTL ? 'سجل مرضى عيادة القلب (Active Cardiology Patients)' : 'Cardiology Patient Directory & EHR Records'}</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {isRTL ? 'إدارة السجلات السريرية ومتابعة قراءات الضغط والروشتات الذكية' : 'Clinical records management, BP monitoring, and smart prescriptions'}
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative min-w-[260px]">
          <Search size={16} className={`absolute ${isRTL ? 'right-3.5' : 'left-3.5'} top-3 text-slate-400`} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={isRTL ? 'بحث بالاسم أو التشخيص أو الهاتف...' : 'Search by name, diagnosis or phone...'}
            className={`w-full ${isRTL ? 'pr-10 pl-3' : 'pl-10 pr-3'} py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all`}
          />
        </div>
      </div>

      {/* Filter Chips */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
          <Filter size={12} />
          <span>{isRTL ? 'تصفية:' : 'Filter:'}</span>
        </span>
        <button
          onClick={() => setFilterStatus('all')}
          className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            filterStatus === 'all'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          {isRTL ? 'كل المرضى' : 'All Patients'} ({doctorIsolatedPatients.length})
        </button>
        <button
          onClick={() => setFilterStatus('alerts')}
          className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            filterStatus === 'alerts'
              ? 'bg-red-600 text-white shadow-xs'
              : 'bg-red-50 text-red-700 hover:bg-red-100'
          }`}
        >
          {isRTL ? 'تنبيهات الضغط الحرج' : 'Critical BP Alerts'}
        </button>
        <button
          onClick={() => setFilterStatus('stable')}
          className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            filterStatus === 'stable'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
          }`}
        >
          {isRTL ? 'الحالات المستقرة' : 'Stable Cases'}
        </button>
        <button
          onClick={() => setFilterStatus('heart-failure')}
          className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            filterStatus === 'heart-failure'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
          }`}
        >
          {isRTL ? 'قصور عضلة القلب (HFrEF)' : 'Heart Failure (HFrEF)'}
        </button>
      </div>

      {/* Desktop / Tablet Table View (hidden on mobile) */}
      <div className="hidden md:block overflow-x-auto">
        <table className={`w-full ${isRTL ? 'text-right' : 'text-left'} text-xs`}>
          <thead>
            <tr className="text-slate-400 border-b border-slate-100 text-[11px] font-bold uppercase">
              <th className={`pb-3 ${isRTL ? 'pr-2' : 'pl-2'}`}>{isRTL ? 'المريض والسن' : 'Patient & Age'}</th>
              <th className="pb-3">{isRTL ? 'التشخيص القلبي' : 'Cardiovascular Diagnosis'}</th>
              <th className="pb-3 text-center">{isRTL ? 'كفاءة القلب (EF%)' : 'Cardiac EF%'}</th>
              <th className="pb-3">{isRTL ? 'الحالة والمتابعة' : 'Status & Follow-up'}</th>
              <th className={`pb-3 ${isRTL ? 'text-left pl-2' : 'text-right pr-2'}`}>{isRTL ? 'الإجراء السريري' : 'Action'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredPatients.map((patient) => {
              const isAlert = patient.status?.includes('تنبيه') || patient.status?.includes('Alert');
              const displayName = (language === 'en' && patient.nameEn) ? patient.nameEn : patient.name;
              return (
                <tr key={patient.id} className="hover:bg-slate-50/80 transition-colors group">
                  <td className={`py-3.5 ${isRTL ? 'pr-2' : 'pl-2'}`}>
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs border border-blue-100">
                        <User size={16} />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                          {displayName}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {patient.dob} {patient.gender ? `• ${patient.gender}` : ''}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 max-w-xs text-slate-600">
                    <span className="line-clamp-1 font-medium">
                      {patient.diagnosis || (isRTL ? 'فحص دوري ومتابعة ضغط' : 'Routine exam & BP monitoring')}
                    </span>
                    {patient.riskTier && (
                      <span className="text-[10px] text-red-600 font-bold block mt-0.5">
                        {patient.riskTier}
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 text-center font-mono font-bold">
                    {patient.ef ? (
                      <span className={`px-2 py-0.5 rounded-md text-[11px] ${
                        patient.ef < 40 ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {patient.ef}%
                      </span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="py-3.5">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                      isAlert
                        ? 'bg-red-50 text-red-700 border border-red-200'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    }`}>
                      {isAlert ? <AlertTriangle size={12} /> : <CheckCircle2 size={12} />}
                      <span>{patient.status}</span>
                    </span>
                  </td>
                  <td className={`py-3.5 ${isRTL ? 'text-left pl-2' : 'text-right pr-2'}`}>
                    <button
                      onClick={() => onSelectPatient(patient.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-700 font-bold rounded-xl transition-all active:scale-95 text-xs border border-blue-200 hover:border-transparent cursor-pointer"
                    >
                      <span>{isRTL ? 'الملف السريري' : 'Clinical Profile'}</span>
                      <ChevronRight size={14} className={isRTL ? 'transform -scale-x-100' : ''} />
                    </button>
                  </td>
                </tr>
              );
            })}
            {filteredPatients.length === 0 && !loading && (
              <tr>
                <td colSpan={5} className="py-12 text-center">
                  <div className="max-w-md mx-auto space-y-3 p-4 bg-slate-50 border border-dashed border-slate-200 rounded-3xl">
                    <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mx-auto border border-blue-200">
                      <Stethoscope size={24} />
                    </div>
                    <h3 className="font-black text-sm text-slate-900">
                      {doctorName ? `أهلاً بك يا د/ ${doctorName}` : 'سجل عيادتك الطبية المعزولة'}
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
                      لا يوجد مرضى مسجلين في حسابك السريري بعد. سجل عيادتك معزول تماماً ومحمي ولا يستطيع أي طبيب آخر بالمنصة الإطلاع عليه.
                    </p>
                    {onOpenNewPatientModal && (
                      <button
                        onClick={onOpenNewPatientModal}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all inline-flex items-center gap-1.5"
                      >
                        <Sparkles size={14} className="text-blue-200" />
                        <span>فتح أول ملف مريض في عيادتك الآن</span>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View (< md) */}
      <div className="block md:hidden space-y-3">
        {filteredPatients.map((patient) => {
          const isAlert = patient.status?.includes('تنبيه') || patient.status?.includes('Alert');
          return (
            <div
              key={patient.id}
              className="bg-slate-50/70 border border-slate-200 rounded-2xl p-4 transition-all hover:bg-slate-50 active:bg-blue-50/40"
            >
              <div className="flex items-start justify-between gap-2 mb-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-blue-100/70 text-blue-700 flex items-center justify-center font-bold text-sm border border-blue-200/60 shrink-0">
                    <User size={18} />
                  </div>
                  <div>
                    <h3 className="font-black text-sm text-slate-900 leading-snug">
                      {patient.name}
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {patient.dob} {patient.gender ? `• ${patient.gender}` : ''}
                      {patient.phone ? ` • ${patient.phone}` : ''}
                    </p>
                  </div>
                </div>

                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold shrink-0 ${
                    isAlert
                      ? 'bg-red-100 text-red-800 border border-red-200'
                      : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  }`}
                >
                  {isAlert ? <AlertTriangle size={11} /> : <CheckCircle2 size={11} />}
                  <span>{isAlert ? 'تنبيه ضغط' : 'مستقر'}</span>
                </span>
              </div>

              {/* Diagnosis and Risk */}
              <div className="bg-white rounded-xl p-2.5 border border-slate-200/70 mb-3 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-slate-700 line-clamp-1">
                    {patient.diagnosis || 'فحص دوري ومتابعة ضغط'}
                  </span>
                  {patient.ef && (
                    <span
                      className={`px-2 py-0.5 rounded-md font-mono text-[11px] font-black shrink-0 ${
                        patient.ef < 40 ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      EF: {patient.ef}%
                    </span>
                  )}
                </div>
                {patient.riskTier && (
                  <span className="text-[10px] text-red-600 font-bold block mt-1">
                    {patient.riskTier}
                  </span>
                )}
              </div>

              {/* Action Button */}
              <button
                onClick={() => onSelectPatient(patient.id)}
                className="w-full py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all active:scale-[0.98]"
              >
                <span>فتح الملف السريري والروشتة</span>
                <ChevronRight size={15} className="transform -scale-x-100" />
              </button>
            </div>
          );
        })}

        {filteredPatients.length === 0 && !loading && (
          <div className="py-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-3xl p-5 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mx-auto border border-blue-200">
              <Stethoscope size={22} />
            </div>
            <h3 className="font-black text-sm text-slate-900">
              {doctorName ? `أهلاً بك يا د/ ${doctorName}` : 'سجل عيادتك الطبية المعزولة'}
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
              لا يوجد مرضى مسجلين في حسابك السريري بعد. يمكنك إضافة مريض جديد للبدء.
            </p>
            {onOpenNewPatientModal && (
              <button
                onClick={onOpenNewPatientModal}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5"
              >
                <Sparkles size={14} className="text-blue-200" />
                <span>إضافة أول مريض الآن</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
