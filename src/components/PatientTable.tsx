import React, {useEffect, useState} from 'react';
import {collection, getDocs} from 'firebase/firestore';
import {db} from '../lib/firebase';
import {Search, User, Heart, AlertTriangle, CheckCircle2, ChevronRight, Stethoscope, Sparkles, Filter} from 'lucide-react';

interface Patient {
  id: string;
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

export default function PatientTable({onSelectPatient}: {onSelectPatient: (id: string) => void}) {
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

  const filteredPatients = patients.filter(patient => {
    const matchesSearch = 
      patient.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
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
    <div className="bg-white p-5 sm:p-6 rounded-3xl shadow-sm border border-slate-200 mt-6 font-sans" dir="rtl">
      {/* Table Header & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div>
          <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
            <Stethoscope size={20} className="text-blue-600" />
            <span>سجل مرضى عيادة القلب (Active Cardiology Patients)</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            إدارة السجلات السريرية ومتابعة قراءات الضغط والروشتات الذكية
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative min-w-[260px]">
          <Search size={16} className="absolute right-3.5 top-3 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="بحث بالاسم أو التشخيص أو الهاتف..."
            className="w-full pr-10 pl-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* Filter Chips */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
          <Filter size={12} />
          <span>تصفية:</span>
        </span>
        <button
          onClick={() => setFilterStatus('all')}
          className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
            filterStatus === 'all'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          كل المرضى ({patients.length})
        </button>
        <button
          onClick={() => setFilterStatus('alerts')}
          className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
            filterStatus === 'alerts'
              ? 'bg-red-600 text-white shadow-xs'
              : 'bg-red-50 text-red-700 hover:bg-red-100'
          }`}
        >
          تنبيهات الضغط الحرج
        </button>
        <button
          onClick={() => setFilterStatus('stable')}
          className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
            filterStatus === 'stable'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
          }`}
        >
          الحالات المستقرة
        </button>
        <button
          onClick={() => setFilterStatus('heart-failure')}
          className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
            filterStatus === 'heart-failure'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
          }`}
        >
          قصور عضلة القلب (HFrEF)
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-right text-xs">
          <thead>
            <tr className="text-slate-400 border-b border-slate-100 text-[11px] font-bold uppercase">
              <th className="pb-3 pr-2">المريض والسن</th>
              <th className="pb-3">التشخيص القلبي</th>
              <th className="pb-3 text-center">كفاءة القلب (EF%)</th>
              <th className="pb-3">الحالة والمتابعة</th>
              <th className="pb-3 text-left pl-2">الإجراء السريري</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredPatients.map((patient) => {
              const isAlert = patient.status?.includes('تنبيه') || patient.status?.includes('Alert');
              return (
                <tr key={patient.id} className="hover:bg-slate-50/80 transition-colors group">
                  <td className="py-3.5 pr-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs border border-blue-100">
                        <User size={16} />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                          {patient.name}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {patient.dob} {patient.gender ? `• ${patient.gender}` : ''}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 max-w-xs text-slate-600">
                    <span className="line-clamp-1 font-medium">
                      {patient.diagnosis || 'فحص دوري ومتابعة ضغط'}
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
                  <td className="py-3.5 text-left pl-2">
                    <button
                      onClick={() => onSelectPatient(patient.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-700 font-bold rounded-xl transition-all active:scale-95 text-xs border border-blue-200 hover:border-transparent"
                    >
                      <span>الملف السريري</span>
                      <ChevronRight size={14} className="transform -scale-x-100" />
                    </button>
                  </td>
                </tr>
              );
            })}
            {filteredPatients.length === 0 && !loading && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-slate-400 text-xs">
                  لا توجد نتائج تطابق البحث أو التصفية الحالية.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
