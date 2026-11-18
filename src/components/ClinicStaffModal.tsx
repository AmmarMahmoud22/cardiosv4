import React, { useEffect, useState } from 'react';
import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  deleteDoc,
  where,
  writeBatch
} from 'firebase/firestore';
import { db, createSecondaryAuthUser } from '../lib/firebase';
import { ClinicStaffMember } from '../types/clinic';
import {
  X,
  UserPlus,
  Users,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Power,
  Mail,
  Phone,
  Loader2
} from 'lucide-react';

interface ClinicStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  doctorId: string;
  doctorName: string;
  clinicCode: string;
  onStaffChanged?: (staffUids: string[]) => void;
}

export default function ClinicStaffModal({
  isOpen,
  onClose,
  doctorId,
  doctorName,
  clinicCode,
  onStaffChanged
}: ClinicStaffModalProps) {
  const [staffList, setStaffList] = useState<ClinicStaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [roleTitle, setRoleTitle] = useState<ClinicStaffMember['roleTitle']>('سكرتيرة');

  useEffect(() => {
    if (!isOpen || !doctorId) return;
    setLoading(true);
    const q = query(collection(db, 'clinic_staff'), where('doctorId', '==', doctorId));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as any) } as ClinicStaffMember))
          .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        setStaffList(list);
        setLoading(false);
      },
      (err) => {
        console.warn('Error loading clinic staff:', err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [isOpen, doctorId]);

  if (!isOpen) return null;

  const propagateStaffUidsToClinicDocs = async (nextStaffUids: string[]) => {
    await Promise.all([
      setDoc(
        doc(db, 'doctors', doctorId),
        { staffUids: nextStaffUids },
        { merge: true }
      ),
      setDoc(
        doc(db, 'doctor_schedules', doctorId),
        { staffUids: nextStaffUids },
        { merge: true }
      ).catch(() => {})
    ]);

    const targetCols = ['patients', 'appointments', 'clinic_invoices', 'clinic_contracts'];
    for (const colName of targetCols) {
      try {
        const snap = await getDocs(query(collection(db, colName), where('doctorId', '==', doctorId)));
        if (snap.empty) continue;
        let batch = writeBatch(db);
        let ops = 0;
        for (const d of snap.docs) {
          batch.set(doc(db, colName, d.id), { staffUids: nextStaffUids }, { merge: true });
          ops++;
          if (ops >= 400) {
            await batch.commit();
            batch = writeBatch(db);
            ops = 0;
          }
        }
        if (ops > 0) await batch.commit();
      } catch (err) {
        console.warn(`Failed propagating staffUids to ${colName}:`, err);
      }
    }

    onStaffChanged?.(nextStaffUids);
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const cleanEmail = email.trim().toLowerCase();
    if (!name.trim() || !cleanEmail || password.trim().length < 6) {
      setError('يرجى إدخال الاسم، البريد الإلكتروني، وكلمة مرور لا تقل عن 6 أحرف.');
      return;
    }

    const activeCount = staffList.filter((s) => s.status === 'active').length;
    if (activeCount >= 10) {
      setError('الحد الأقصى لطاقم العيادة هو 10 حسابات نشطة.');
      return;
    }

    setSubmitting(true);
    try {
      const uid = await createSecondaryAuthUser(cleanEmail, password.trim(), name.trim());
      const now = new Date().toISOString();

      const member: ClinicStaffMember = {
        id: uid,
        uid,
        doctorId,
        doctorName: doctorName || '',
        clinicCode,
        name: name.trim(),
        email: cleanEmail,
        phone: phone.trim(),
        roleTitle,
        status: 'active',
        createdAt: now,
        createdBy: doctorId
      };

      await Promise.all([
        setDoc(doc(db, 'clinic_staff', uid), member),
        setDoc(
          doc(db, 'users', uid),
          {
            uid,
            name: member.name,
            email: cleanEmail,
            phone: member.phone || '',
            role: 'receptionist',
            roleTitle,
            doctorId,
            doctorName: doctorName || '',
            clinicCode,
            status: 'active',
            createdAt: now
          },
          { merge: true }
        ),
        setDoc(
          doc(db, 'system_users', uid),
          {
            id: uid,
            name: member.name,
            email: cleanEmail,
            role: 'Clinic Staff',
            status: 'Active',
            doctorId,
            doctorName: doctorName || '',
            clinicCode,
            roleTitle,
            lastLogin: new Date().toLocaleDateString('en-US')
          },
          { merge: true }
        )
      ]);

      const nextActiveUids = Array.from(
        new Set([...staffList.filter((s) => s.status === 'active').map((s) => s.uid), uid])
      ).slice(0, 10);
      await propagateStaffUidsToClinicDocs(nextActiveUids);

      setName('');
      setEmail('');
      setPhone('');
      setPassword('');
      setSuccess(`تم إنشاء حساب (${member.name}) بنجاح وربطه بالعيادة.`);
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/email-already-in-use') {
        setError('هذا البريد الإلكتروني مستخدم بالفعل في حساب آخر.');
      } else if (code === 'auth/operation-not-allowed') {
        setError('إنشاء الحسابات بالبريد وكلمة المرور يتطلب تفعيل Email/Password في إعدادات Firebase Auth.');
      } else {
        setError(err?.message || 'حدث خطأ أثناء إنشاء حساب السكرتارية/التمريض.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStaffStatus = async (member: ClinicStaffMember) => {
    const nextStatus: 'active' | 'suspended' = member.status === 'active' ? 'suspended' : 'active';
    try {
      await Promise.all([
        setDoc(doc(db, 'clinic_staff', member.id), { status: nextStatus }, { merge: true }),
        setDoc(doc(db, 'users', member.id), { status: nextStatus }, { merge: true }).catch(() => {}),
        setDoc(
          doc(db, 'system_users', member.id),
          { status: nextStatus === 'active' ? 'Active' : 'Inactive' },
          { merge: true }
        ).catch(() => {})
      ]);

      const nextActiveUids = staffList
        .map((s) => (s.id === member.id ? { ...s, status: nextStatus } : s))
        .filter((s) => s.status === 'active')
        .map((s) => s.uid)
        .slice(0, 10);

      await propagateStaffUidsToClinicDocs(nextActiveUids);
      setSuccess(nextStatus === 'active' ? `تم تفعيل حساب ${member.name}` : `تم إيقاف دخول ${member.name} مؤقتاً`);
    } catch (err) {
      console.warn('Error toggling staff status:', err);
    }
  };

  const handleDeleteStaff = async (member: ClinicStaffMember) => {
    try {
      await Promise.all([
        deleteDoc(doc(db, 'clinic_staff', member.id)),
        deleteDoc(doc(db, 'users', member.id)).catch(() => {}),
        deleteDoc(doc(db, 'system_users', member.id)).catch(() => {})
      ]);
      const nextActiveUids = staffList
        .filter((s) => s.id !== member.id && s.status === 'active')
        .map((s) => s.uid)
        .slice(0, 10);
      await propagateStaffUidsToClinicDocs(nextActiveUids);
      setConfirmDeleteId(null);
      setSuccess(`تم حذف حساب ${member.name} وإزالة صلاحياته من العيادة.`);
    } catch (err) {
      console.warn('Error deleting clinic staff:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4" dir="rtl">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative z-10 bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Users size={20} />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">إدارة طاقم العيادة (السكرتارية والتمريض)</h3>
              <p className="text-xs text-slate-500">عيادة د/ {doctorName} • {clinicCode}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-slate-900 flex items-center justify-center cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-5">
          <div className="p-3.5 bg-indigo-50/80 border border-indigo-200 rounded-2xl text-xs text-indigo-900 flex items-start gap-2.5">
            <ShieldCheck size={18} className="shrink-0 text-indigo-600 mt-0.5" />
            <div className="leading-relaxed">
              <strong>نطاق صلاحيات السكرتارية والتمريض:</strong> تسجيل المرضى، المواعيد والحجز، قياسات العلامات الحيوية، رفع مرفقات رسم القلب والأشعة، وإدارة الخزينة والفواتير.{' '}
              <span className="text-indigo-700 font-semibold">
                (ممنوع من تعديل الروشتات، كتابة تقارير الإيكو، الذكاء الاصطناعي، أو حذف المرضى).
              </span>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-semibold flex items-center gap-2">
              <CheckCircle2 size={15} className="shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* Create Form */}
          <form onSubmit={handleCreateStaff} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-xs font-black text-slate-800">
              <UserPlus size={16} className="text-teal-600" />
              <span>إضافة موظف جديد للعيادة</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">الاسم بالكامل *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثال: أ. سارة محمود"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 focus:border-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">المسمى الوظيفي *</label>
                <select
                  value={roleTitle}
                  onChange={(e) => setRoleTitle(e.target.value as ClinicStaffMember['roleTitle'])}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 focus:border-teal-500 focus:outline-none font-semibold"
                >
                  <option value="سكرتيرة">سكرتيرة / استقبال</option>
                  <option value="تمريض">تمريض / قياسات حيوية</option>
                  <option value="إدارة استقبال">مدير عيادة / حسابات</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">البريد الإلكتروني للدخول *</label>
                <input
                  type="email"
                  required
                  dir="ltr"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="reception@clinic.eg"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 font-mono focus:border-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">كلمة المرور (6 أحرف+) *</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  dir="ltr"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 font-mono focus:border-teal-500 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">رقم الموبايل (اختياري)</label>
                <input
                  type="tel"
                  dir="ltr"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="010XXXXXXXX"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 font-mono text-right focus:border-teal-500 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white rounded-xl text-xs font-bold shadow-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              {submitting ? <Loader2 size={15} className="animate-spin" /> : <UserPlus size={15} />}
              <span>{submitting ? 'جاري إنشاء الحساب...' : 'إنشاء وتفعيل حساب الموظف'}</span>
            </button>
          </form>

          {/* Existing Staff List */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-black text-slate-800">
              طاقم العيادة المسجل ({staffList.length})
            </h4>

            {loading ? (
              <div className="p-6 text-center text-xs text-slate-400">جاري تحميل الطاقم...</div>
            ) : staffList.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                لا يوجد حسابات سكرتارية أو تمريض مضافة لهذه العيادة بعد.
              </div>
            ) : (
              staffList.map((member) => (
                <div
                  key={member.id}
                  className="p-3.5 bg-white border border-slate-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-slate-900">{member.name}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {member.roleTitle}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          member.status === 'active'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {member.status === 'active' ? 'نشط' : 'موقوف'}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 mt-1 font-mono">
                      <span className="inline-flex items-center gap-1">
                        <Mail size={11} />
                        {member.email}
                      </span>
                      {member.phone && (
                        <span className="inline-flex items-center gap-1">
                          <Phone size={11} />
                          {member.phone}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleToggleStaffStatus(member)}
                      className={`px-3 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1 border cursor-pointer ${
                        member.status === 'active'
                          ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                          : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                      }`}
                    >
                      <Power size={12} />
                      <span>{member.status === 'active' ? 'إيقاف' : 'تفعيل'}</span>
                    </button>

                    {confirmDeleteId === member.id ? (
                      <button
                        type="button"
                        onClick={() => handleDeleteStaff(member)}
                        className="px-3 py-1.5 rounded-xl text-[11px] font-bold bg-rose-600 text-white hover:bg-rose-700 cursor-pointer"
                      >
                        تأكيد الحذف
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setConfirmDeleteId(member.id);
                          setTimeout(() => setConfirmDeleteId(null), 4000);
                        }}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl border border-slate-200 cursor-pointer"
                        title="حذف الحساب"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
