import React, {useState, useEffect} from 'react';
import {collection, query, where, onSnapshot, updateDoc, doc} from 'firebase/firestore';
import {onAuthStateChanged} from 'firebase/auth';
import {db, auth} from '../lib/firebase';
import {StaffRole} from '../types/clinic';
import {AlertCircle, CheckCircle, ShieldCheck, MessageCircle} from 'lucide-react';

export default function AlertPanel({
  doctorId = '',
  staffRole = 'doctor'
}: {
  doctorId?: string;
  staffRole?: StaffRole;
}) {
  const [authUid, setAuthUid] = useState<string>(() => auth.currentUser?.uid || '');
  const [alerts, setAlerts] = useState<any[]>([]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setAuthUid(u?.uid || ''));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!doctorId || !authUid) {
      setAlerts([]);
      return;
    }
    const isRec = staffRole === 'receptionist';
    const q = isRec
      ? query(collection(db, 'vitals'), where('staffUids', 'array-contains', authUid))
      : query(collection(db, 'vitals'), where('doctorId', '==', doctorId));
    return onSnapshot(q, (snapshot) => {
      const allAlerts = snapshot.docs
        .map(d => ({id: d.id, ...d.data()}))
        .filter((a: any) => (Number(a.systolic) > 140 || Number(a.systolic) < 90 || Number(a.diastolic) < 60) && a.doctorId === doctorId);
      setAlerts(allAlerts);
    });
  }, [doctorId, staffRole, authUid]);

  // Unread patient messages (seen state is kept in this browser only)
  const [patientMsgs, setPatientMsgs] = useState<any[]>([]);
  const [seenMsgs, setSeenMsgs] = useState<Record<string, string>>(() => {
    try { return JSON.parse(localStorage.getItem('cardios_seen_msgs') || '{}'); } catch { return {}; }
  });

  useEffect(() => {
    if (!doctorId || !authUid || staffRole === 'receptionist') {
      setPatientMsgs([]);
      return;
    }
    const q = query(collection(db, 'messages'), where('doctorId', '==', doctorId));
    return onSnapshot(q, (snapshot) => {
      setPatientMsgs(snapshot.docs.map(d => ({id: d.id, ...d.data()})).filter((m: any) => m.sender === 'patient'));
    }, (err) => console.warn('Patient messages listener error:', err));
  }, [doctorId, staffRole, authUid]);

  const unreadByPatient = Object.values(
    patientMsgs.reduce((acc: Record<string, any>, m: any) => {
      const seen = seenMsgs[m.patientId] || '';
      if (String(m.timestamp || '') <= seen) return acc;
      const cur = acc[m.patientId] || {patientId: m.patientId, patientName: m.patientName, count: 0, last: '', text: ''};
      cur.count += 1;
      if (String(m.timestamp || '') > cur.last) { cur.last = String(m.timestamp || ''); cur.text = m.text; }
      acc[m.patientId] = cur;
      return acc;
    }, {})
  ) as any[];

  const markMsgsSeen = (patientId: string, last: string) => {
    const next = {...seenMsgs, [patientId]: last};
    setSeenMsgs(next);
    try { localStorage.setItem('cardios_seen_msgs', JSON.stringify(next)); } catch { /* ignore */ }
  };

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

      {unreadByPatient.length > 0 && (
        <div className="space-y-2.5 mb-4">
          {unreadByPatient.map((u: any) => (
            <div key={u.patientId} className="p-3.5 border-r-4 border-blue-500 bg-blue-50/80 rounded-2xl flex items-center justify-between gap-3">
              <div className="flex items-start gap-2">
                <MessageCircle className="text-blue-600 mt-0.5 shrink-0" size={16} />
                <div>
                  <p className="font-bold text-xs text-blue-900">رسالة جديدة من المريض: {u.patientName || u.patientId} ({u.count})</p>
                  <p className="text-[11px] text-slate-600 mt-0.5">{u.text} • افتح ملف المريض للرد</p>
                </div>
              </div>
              <button
                onClick={() => markMsgsSeen(u.patientId, u.last)}
                className="px-3 py-1.5 bg-white border border-blue-200 text-slate-700 font-bold text-xs rounded-xl shrink-0"
              >
                تم الاطلاع
              </button>
            </div>
          ))}
        </div>
      )}

      {activeAlerts.length > 0 ? (
        <div className="space-y-2.5">
          {activeAlerts.map(alert => (
            <div key={alert.id} className="p-3.5 border-r-4 border-red-500 bg-red-50/80 rounded-2xl flex items-center justify-between gap-3">
              <div>
                <p className="font-bold text-xs text-red-900">{(Number(alert.systolic) < 90 || Number(alert.diastolic) < 60) ? 'قراءة ضغط منخفضة' : 'قراءة ضغط مرتفعة'}: {alert.systolic}/{alert.diastolic} mmHg</p>
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

