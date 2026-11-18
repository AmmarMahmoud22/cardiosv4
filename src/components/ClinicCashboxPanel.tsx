import React, { useEffect, useMemo, useState } from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  setDoc,
  where
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '../lib/firebase';
import { ClinicContract, ClinicInvoice, StaffRole } from '../types/clinic';
import BillingModal from './BillingModal';
import {
  Wallet,
  Building2,
  Plus,
  Receipt,
  CheckCircle2,
  Clock,
  Printer,
  Trash2,
  X,
  TrendingUp,
  Coins
} from 'lucide-react';

interface ClinicCashboxPanelProps {
  doctorId: string;
  clinicName: string;
  clinicCode: string;
  staffUids: string[];
  staffRole?: StaffRole;
  staffName?: string;
  patients: Array<{ id: string; name: string; phone?: string }>;
}

export default function ClinicCashboxPanel({
  doctorId,
  clinicName,
  clinicCode,
  staffUids,
  staffRole = 'doctor',
  staffName = '',
  patients
}: ClinicCashboxPanelProps) {
  const [subTab, setSubTab] = useState<'invoices' | 'contracts'>('invoices');
  const [invoices, setInvoices] = useState<ClinicInvoice[]>([]);
  const [contracts, setContracts] = useState<ClinicContract[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | 'Paid' | 'Unpaid'>('all');
  const [selectedPatientForBilling, setSelectedPatientForBilling] = useState<string>('');
  const [showBillingModal, setShowBillingModal] = useState(false);
  const [receiptInvoice, setReceiptInvoice] = useState<ClinicInvoice | null>(null);

  // New Contract form state
  const [contractName, setContractName] = useState('');
  const [contractCategory, setContractCategory] = useState<ClinicContract['category']>('syndicate');
  const [discountPercent, setDiscountPercent] = useState('20');
  const [coveragePercent, setCoveragePercent] = useState('0');
  const [contractNotes, setContractNotes] = useState('');
  const [savingContract, setSavingContract] = useState(false);

  const [authUid, setAuthUid] = useState<string>(() => auth.currentUser?.uid || '');

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setAuthUid(u?.uid || '');
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!doctorId || !authUid) return;
    const isRec = staffRole === 'receptionist';
    const invQ = isRec
      ? query(collection(db, 'clinic_invoices'), where('staffUids', 'array-contains', authUid))
      : query(collection(db, 'clinic_invoices'), where('doctorId', '==', doctorId));
    const unsubInv = onSnapshot(invQ, (snap) => {
      const list = snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as any) } as ClinicInvoice))
        .filter((inv) => inv.doctorId === doctorId)
        .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      setInvoices(list);
    });

    const conQ = isRec
      ? query(collection(db, 'clinic_contracts'), where('staffUids', 'array-contains', authUid))
      : query(collection(db, 'clinic_contracts'), where('doctorId', '==', doctorId));
    const unsubCon = onSnapshot(conQ, (snap) => {
      const list = snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as any) } as ClinicContract))
        .filter((con) => con.doctorId === doctorId)
        .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      setContracts(list);
    });

    return () => {
      unsubInv();
      unsubCon();
    };
  }, [doctorId, staffRole, authUid]);

  const metrics = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const monthPrefix = todayStr.slice(0, 7);

    let todayCollected = 0;
    let monthCollected = 0;
    let unpaidPending = 0;
    let entityClaims = 0;

    for (const inv of invoices) {
      const invDate = (inv.date || inv.createdAt || '').slice(0, 10);
      if (inv.status === 'Paid') {
        if (invDate === todayStr) todayCollected += Number(inv.patientPayable || 0);
        if (invDate.startsWith(monthPrefix)) monthCollected += Number(inv.patientPayable || 0);
      } else {
        unpaidPending += Number(inv.patientPayable || 0);
      }
      entityClaims += Number(inv.entityShare || 0);
    }

    return { todayCollected, monthCollected, unpaidPending, entityClaims };
  }, [invoices]);

  const filteredInvoices = useMemo(() => {
    if (statusFilter === 'all') return invoices;
    return invoices.filter((i) => i.status === statusFilter);
  }, [invoices, statusFilter]);

  const handleMarkPaid = async (inv: ClinicInvoice) => {
    try {
      await setDoc(
        doc(db, 'clinic_invoices', inv.id),
        { status: 'Paid', paidAt: new Date().toISOString() },
        { merge: true }
      );
    } catch (err) {
      console.warn('Error marking invoice paid:', err);
    }
  };

  const handleAddContract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contractName.trim() || !doctorId) return;
    setSavingContract(true);
    try {
      await addDoc(collection(db, 'clinic_contracts'), {
        doctorId,
        staffUids,
        name: contractName.trim(),
        category: contractCategory,
        discountPercent: Math.min(100, Math.max(0, Number(discountPercent) || 0)),
        coveragePercent: Math.min(100, Math.max(0, Number(coveragePercent) || 0)),
        notes: contractNotes.trim(),
        isActive: true,
        createdAt: new Date().toISOString()
      });
      setContractName('');
      setDiscountPercent('20');
      setCoveragePercent('0');
      setContractNotes('');
    } catch (err) {
      console.warn('Error creating contract:', err);
    } finally {
      setSavingContract(false);
    }
  };

  const handleDeleteContract = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'clinic_contracts', id));
    } catch (err) {
      console.warn('Error deleting contract:', err);
    }
  };

  const chosenPatientObj = patients.find((p) => p.id === (selectedPatientForBilling || patients[0]?.id));

  return (
    <div className="space-y-5 font-sans" dir="rtl">
      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
            <Coins size={20} />
          </div>
          <div>
            <p className="text-[11px] text-slate-400 font-bold">تحصيل الخزينة اليوم</p>
            <p className="text-lg font-black text-slate-900 font-mono">{metrics.todayCollected} EGP</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="p-3 bg-teal-50 text-teal-600 rounded-2xl">
            <TrendingUp size={20} />
          </div>
          <div>
            <p className="text-[11px] text-slate-400 font-bold">إيراد الشهر المحصل</p>
            <p className="text-lg font-black text-slate-900 font-mono">{metrics.monthCollected} EGP</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
            <Clock size={20} />
          </div>
          <div>
            <p className="text-[11px] text-slate-400 font-bold">مستحقات / آجل غير محصل</p>
            <p className="text-lg font-black text-amber-700 font-mono">{metrics.unpaidPending} EGP</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
            <Building2 size={20} />
          </div>
          <div>
            <p className="text-[11px] text-slate-400 font-bold">مطالبات التعاقدات والشركات</p>
            <p className="text-lg font-black text-indigo-700 font-mono">{metrics.entityClaims} EGP</p>
          </div>
        </div>
      </div>

      {/* Main Card */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSubTab('invoices')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
                subTab === 'invoices'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Wallet size={15} />
              <span>سجل الخزينة والفواتير ({invoices.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setSubTab('contracts')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
                subTab === 'contracts'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Building2 size={15} />
              <span>التعاقدات والنقابات ({contracts.length})</span>
            </button>
          </div>

          {subTab === 'invoices' && (
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedPatientForBilling || patients[0]?.id || ''}
                onChange={(e) => setSelectedPatientForBilling(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800"
              >
                {patients.length === 0 ? (
                  <option value="">أضف مريضاً أولاً</option>
                ) : (
                  patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))
                )}
              </select>
              <button
                type="button"
                disabled={patients.length === 0}
                onClick={() => setShowBillingModal(true)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Plus size={15} />
                <span>إصدار فاتورة كشف</span>
              </button>
            </div>
          )}
        </div>

        {subTab === 'invoices' ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              {(['all', 'Paid', 'Unpaid'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${
                    statusFilter === st
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {st === 'all' ? 'الكل' : st === 'Paid' ? 'مدفوعة' : 'آجل / مستحقة'}
                </button>
              ))}
            </div>

            {filteredInvoices.length === 0 ? (
              <div className="py-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-xs text-slate-400">
                <Receipt size={28} className="mx-auto mb-2 text-slate-300" />
                لا توجد فواتير مسجلة حتى الآن.
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredInvoices.map((inv) => (
                  <div
                    key={inv.id}
                    className="p-4 bg-slate-50/70 border border-slate-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[11px] font-bold bg-white border border-slate-200 px-2 py-0.5 rounded-lg text-slate-700">
                          {inv.invoiceNumber}
                        </span>
                        <span className="text-xs font-black text-slate-900">{inv.patientName}</span>
                        <span className="text-xs font-bold text-teal-700">• {inv.serviceLabel}</span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            inv.status === 'Paid'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {inv.status === 'Paid' ? 'مدفوعة' : 'مستحقة'}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-3">
                        <span>الجهة: {inv.contractName || 'نقدي'}</span>
                        <span>• الدفع: {inv.paymentMethod}</span>
                        <span>• التاريخ: {new Date(inv.date).toLocaleDateString('ar-EG')}</span>
                        {inv.entityShare > 0 && (
                          <span className="text-indigo-700 font-bold">• حصة الجهة: {inv.entityShare} EGP</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black font-mono text-slate-900 ml-2">
                        {inv.patientPayable} EGP
                      </span>
                      {inv.status === 'Unpaid' && (
                        <button
                          type="button"
                          onClick={() => handleMarkPaid(inv)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <CheckCircle2 size={13} />
                          <span>تحصيل</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setReceiptInvoice(inv)}
                        className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Printer size={13} />
                        <span>إيصال</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-5">
            <form onSubmit={handleAddContract} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3 text-xs">
              <h3 className="font-black text-slate-900">إضافة جهة تعاقد أو نقابة طبية جديدة</h3>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">اسم النقابة / شركة التأمين *</label>
                  <input
                    type="text"
                    required
                    value={contractName}
                    onChange={(e) => setContractName(e.target.value)}
                    placeholder="مثال: نقابة المهندسين / أكسا للتأمين"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">التصنيف</label>
                  <select
                    value={contractCategory}
                    onChange={(e) => setContractCategory(e.target.value as any)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 font-semibold"
                  >
                    <option value="syndicate">نقابة مهنية</option>
                    <option value="insurance">شركة تأمين طبي</option>
                    <option value="corporate">تعاقد شركات</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">الخصم %</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={discountPercent}
                      onChange={(e) => setDiscountPercent(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-2 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">تحمل الجهة %</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={coveragePercent}
                      onChange={(e) => setCoveragePercent(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-2 font-mono"
                    />
                  </div>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={contractNotes}
                  onChange={(e) => setContractNotes(e.target.value)}
                  placeholder="شروط التعاقد أو خط الموافقات (اختياري)"
                  className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2"
                />
                <button
                  type="submit"
                  disabled={savingContract}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl cursor-pointer shrink-0"
                >
                  {savingContract ? 'جاري الحفظ...' : '+ حفظ التعاقد'}
                </button>
              </div>
            </form>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {contracts.map((c) => (
                <div key={c.id} className="p-4 bg-white border border-slate-200 rounded-2xl flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-slate-900">{c.name}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                        خصم {c.discountPercent}%
                      </span>
                      {c.coveragePercent > 0 && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
                          تحمل {c.coveragePercent}%
                        </span>
                      )}
                    </div>
                    {c.notes && <p className="text-[11px] text-slate-500 mt-1">{c.notes}</p>}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteContract(c.id)}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl cursor-pointer"
                    title="حذف التعاقد"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              {contracts.length === 0 && (
                <div className="md:col-span-2 py-8 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  لم تتم إضافة تعاقدات نقابات أو شركات تأمين بعد.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Billing Modal */}
      {showBillingModal && chosenPatientObj && (
        <BillingModal
          patientId={chosenPatientObj.id}
          patientName={chosenPatientObj.name}
          patientPhone={chosenPatientObj.phone}
          doctorId={doctorId}
          staffUids={staffUids}
          staffRole={staffRole}
          staffName={staffName}
          onClose={() => setShowBillingModal(false)}
        />
      )}

      {/* Printable Receipt Modal (uses window.print, no window.open) */}
      {receiptInvoice && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4" dir="rtl">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 print:hidden">
              <h3 className="text-sm font-black text-slate-900">معاينة إيصال السداد</h3>
              <button
                type="button"
                onClick={() => setReceiptInvoice(null)}
                className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:text-slate-900 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-4 border border-slate-200 rounded-2xl space-y-2 text-xs">
              <div className="text-center border-b border-dashed border-slate-300 pb-2.5">
                <div className="text-sm font-black text-slate-900">{clinicName}</div>
                <div className="text-[11px] text-slate-500 font-mono">{clinicCode} • {receiptInvoice.invoiceNumber}</div>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">المريض:</span>
                <span className="font-bold text-slate-900">{receiptInvoice.patientName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">الخدمة:</span>
                <span className="font-bold text-slate-900">{receiptInvoice.serviceLabel}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">التعاقد:</span>
                <span className="font-bold text-slate-900">{receiptInvoice.contractName || 'نقدي'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">وسيلة الدفع:</span>
                <span className="font-bold text-slate-900">{receiptInvoice.paymentMethod}</span>
              </div>
              <div className="flex justify-between text-sm font-black pt-2 border-t border-slate-200">
                <span>المبلغ المدفوع:</span>
                <span className="font-mono text-emerald-700">{receiptInvoice.patientPayable} EGP</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => window.print()}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 print:hidden cursor-pointer"
            >
              <Printer size={15} />
              <span>طباعة الإيصال</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
