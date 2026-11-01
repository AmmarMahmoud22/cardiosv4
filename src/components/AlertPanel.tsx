import React, {useState, useEffect} from 'react';
import {collection, query, where, onSnapshot, updateDoc, doc} from 'firebase/firestore';
import {db} from '../lib/firebase';
import {AlertCircle, CheckCircle, ShieldCheck} from 'lucide-react';

export default function AlertPanel({
  doctorId = 'doc-1',
  isDemoSession = true
}: {
  doctorId?: string;
  isDemoSession?: boolean;
}) {
  const [alerts, setAlerts] = useState<any[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'vitals'), where('systolic', '>', 140));
    return onSnapshot(q, (snapshot) => {
      const allAlerts = snapshot.docs.map(d => ({id: d.id, ...d.data()}));
      if (!isDemoSession && doctorId) {
        setAlerts(allAlerts.filter((a: any) => a.doctorId === doctorId));
      } else {
        setAlerts(allAlerts);
      }
    });
  }, [doctorId, isDemoSession]);

  const acknowledgeAlert = async (id: string) => {
    await updateDoc(doc(db, 'vitals', id), {status: 'acknowledged'});
  };

  const activeAlerts = alerts.filter(a => !a.status);

  return (
    <div className="bg-white p-5 sm:p-6 rounded-3xl shadow-sm border border-slate-200 mt-6 font-sans" dir="rtl">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-black text-slate-800 flex items-center gap-2">
          <AlertCircle className="text-red-600" size={20} />
          <span>تنبيهات الضغط الحرجة والمراقبة المستمرة (Active RPM Alerts)</span>
        </h2>
        {activeAlerts.length > 0 && (
          <span className="text-xs font-bold bg-red-100 text-red-800 px-2.5 py-0.5 rounded-full">
            {activeAlerts.length} تنبيه حرج
          </span>
        )}
      </div>

      {activeAlerts.length > 0 ? (
        <div className="space-y-2.5">
          {activeAlerts.map(alert => (
            <div key={alert.id} className="p-3.5 border-r-4 border-red-500 bg-red-50/80 rounded-2xl flex items-center justify-between gap-3">
              <div>
                <p className="font-bold text-xs text-red-900">قراءة ضغط مرتفعة: {alert.systolic}/{alert.diastolic} mmHg</p>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  المريض: {alert.patientName || alert.patientId || 'غير محدد'} • {alert.timestamp || 'اليوم'}
                </p>
              </div>
              <button
                onClick={() => acknowledgeAlert(alert.id)}
                className="px-3 py-1.5 bg-white border border-red-200 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 font-bold text-xs rounded-xl transition-all shadow-xs flex items-center gap-1 shrink-0"
              >
                <CheckCircle className="text-emerald-600" size={14} />
                <span>تأكيد المراجعة</span>
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-4 bg-emerald-50/60 border border-emerald-200/60 rounded-2xl flex items-center gap-3 text-emerald-950 text-xs">
          <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-300">
            <ShieldCheck size={18} />
          </div>
          <div>
            <span className="font-bold block">لا توجد تنبيهات ضغط حرجة معلقة</span>
            <span className="text-[11px] text-emerald-800">جميع قراءات الضغط المرسلة من أجهزة المرضى بالعيادة ضمن النطاق الآمن المستقر.</span>
          </div>
        </div>
      )}
    </div>
  );
}

