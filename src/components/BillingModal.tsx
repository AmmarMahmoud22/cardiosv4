import React, { useEffect, useRef, useState } from 'react';
import { collection, doc, getDoc, getDocs, query, where, writeBatch } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { describeWriteError } from '../lib/writeDiagnostics';
import { ClinicContract, ClinicInvoice, StaffRole } from '../types/clinic';
import { Receipt, X, CheckCircle2, CreditCard, Banknote, Smartphone, ShieldCheck } from 'lucide-react';

interface BillingModalProps {
  patientId: string;
  patientName?: string;
  patientPhone?: string;
  doctorId?: string;
  staffUids?: string[];
  staffRole?: StaffRole;
  staffName?: string;
  onClose: () => void;
  onSaved?: () => void;
}

const SERVICE_PRESETS: Array<{
  type: ClinicInvoice['serviceType'];
  label: string;
  defaultPrice: number;
}> = [
  { type: 'consultation', label: 'كشف قلب جديد', defaultPrice: 500 },
  { type: 'followup', label: 'استشارة / متابعة', defaultPrice: 200 },
  { type: 'echo', label: 'موجات صوتية على القلب (Echo)', defaultPrice: 800 },
  { type: 'ecg', label: 'رسم قلب عادي (ECG)', defaultPrice: 150 },
  { type: 'other', label: 'خدمة / إجراء آخر', defaultPrice: 300 }
];

export default function BillingModal({
  patientId,
  patientName = '',
  patientPhone = '',
  doctorId = '',
  staffUids = [],
  staffRole = 'doctor',
  staffName = '',
  onClose,
  onSaved
}: BillingModalProps) {
  const [serviceType, setServiceType] = useState<ClinicInvoice['serviceType']>('consultation');
  const [serviceLabel, setServiceLabel] = useState('كشف قلب جديد');
  const [baseAmount, setBaseAmount] = useState<string>('500');
  const [contracts, setContracts] = useState<ClinicContract[]>([]);
  const [selectedContractId, setSelectedContractId] = useState<string>('cash');
  const [customDiscount, setCustomDiscount] = useState<string>('0');
  const [paymentMethod, setPaymentMethod] = useState<ClinicInvoice['paymentMethod']>('Cash');
  const [status, setStatus] = useState<ClinicInvoice['status']>('Paid');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  // Only the invoice id and number are remembered (never clinical data), so an uncertain save
  // can be resumed with the same id after the modal is closed and reopened.
  const pendingKey = `cardios_pending_invoice_${patientId}`;
  const readPending = (): { id: string; number: string } | null => {
    try {
      const v = JSON.parse(sessionStorage.getItem(pendingKey) || 'null');
      return v && typeof v.id === 'string' && typeof v.number === 'string' ? v : null;
    } catch {
      return null;
    }
  };
  const sessionRef = useRef<{ id: string; number: string; at: string; resumed: boolean } | null>(null);
  if (!sessionRef.current) {
    const pending = readPending();
    const rnd = Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
    sessionRef.current = {
      id: pending?.id ?? 'inv_' + rnd,
      number: pending?.number ?? `INV-${Date.now().toString().slice(-6)}`,
      at: new Date().toISOString(),
      resumed: !!pending
    };
  }
  const [outcome, setOutcome] = useState<'idle' | 'failed' | 'unknown' | 'resumed'>('idle');
  const [failText, setFailText] = useState('');
  const [closeWarn, setCloseWarn] = useState(false);
  const [savedInfo, setSavedInfo] = useState<{ number: string; id: string; amount: unknown; label: string; recovered: boolean } | null>(null);
  const locked = outcome === 'unknown';
  const clearPending = () => {
    try { sessionStorage.removeItem(pendingKey); } catch { /* ignore */ }
  };
  const showSaved = (data: any, recovered: boolean) => {
    const { id, number } = sessionRef.current!;
    setSavedInfo({ number: data?.invoiceNumber || number, id, amount: data?.patientPayable ?? data?.amount, label: data?.serviceLabel || '', recovered });
    clearPending();
    onSaved?.();
  };
  const requestClose = () => {
    if (outcome === 'unknown' && !closeWarn) {
      setCloseWarn(true);
      return;
    }
    onClose();
  };

  // Reopened after an uncertain attempt: check whether that invoice was actually saved.
  useEffect(() => {
    if (!sessionRef.current?.resumed) return;
    const { id } = sessionRef.current;
    getDoc(doc(db, 'patients', patientId, 'invoices', id))
      .then((snap) => {
        if (snap.exists()) showSaved(snap.data(), true);
        else setOutcome('resumed');
      })
      .catch(() => setOutcome('unknown'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!doctorId) return;
    const uid = auth.currentUser?.uid;
    const contractsQuery =
      staffRole === 'receptionist' && uid
        ? query(collection(db, 'clinic_contracts'), where('staffUids', 'array-contains', uid))
        : query(collection(db, 'clinic_contracts'), where('doctorId', '==', doctorId));

    getDocs(contractsQuery)
      .then((snap) => {
        const list = snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as any) } as ClinicContract))
          .filter((c) => c.isActive !== false);
        setContracts(list);
      })
      .catch(() => {});
  }, [doctorId, staffRole]);

  const handleSelectService = (preset: (typeof SERVICE_PRESETS)[number]) => {
    setServiceType(preset.type);
    setServiceLabel(preset.label);
    setBaseAmount(String(preset.defaultPrice));
  };

  const chosenContract = contracts.find((c) => c.id === selectedContractId);
  const numericBase = Math.max(0, Number(baseAmount) || 0);
  const discountPct = chosenContract
    ? Math.min(100, Math.max(0, Number(chosenContract.discountPercent) || 0))
    : Math.min(100, Math.max(0, Number(customDiscount) || 0));
  const coveragePct = chosenContract
    ? Math.min(100, Math.max(0, Number(chosenContract.coveragePercent) || 0))
    : 0;

  const discountAmount = Math.round((numericBase * discountPct) / 100);
  const afterDiscount = Math.max(0, numericBase - discountAmount);
  const entityShare = Math.round((afterDiscount * coveragePct) / 100);
  const patientPayable = Math.max(0, afterDiscount - entityShare);

  const saveInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (numericBase <= 0 || !serviceLabel.trim()) {
      setError('يرجى إدخال قيمة ووصف الخدمة الطبية.');
      return;
    }
    setSaving(true);
    setError('');
    setCloseWarn(false);
    try {
      const { id: invoiceId, number: invoiceNumber, at: now } = sessionRef.current!;
      const patientInvoiceRef = doc(db, 'patients', patientId, 'invoices', invoiceId);
      try { sessionStorage.setItem(pendingKey, JSON.stringify({ id: invoiceId, number: invoiceNumber })); } catch { /* ignore */ }
      // If an earlier attempt actually committed (lost response), do not write again.
      let existing: any = null;
      try {
        const snap = await getDoc(patientInvoiceRef);
        existing = snap.exists() ? snap.data() : null;
      } catch {
        existing = null;
      }
      if (existing) {
        showSaved(existing, true);
        return;
      }

      const invoicePayload: Omit<ClinicInvoice, 'id'> = {
        invoiceNumber,
        doctorId,
        staffUids,
        patientId,
        patientName: patientName || `مريض #${patientId}`,
        patientPhone,
        serviceType,
        serviceLabel: serviceLabel.trim(),
        baseAmount: numericBase,
        contractId: chosenContract?.id || 'cash',
        contractName: chosenContract?.name || 'نقدي (كشف خاص)',
        discountPercent: discountPct,
        discountAmount,
        patientPayable,
        entityShare,
        paymentMethod,
        status,
        date: now,
        createdAt: now,
        ...(status === 'Paid' ? { paidAt: now } : {}),
        createdBy: staffName || 'إدارة العيادة',
        createdByRole: staffRole,
        notes: notes.trim()
      };

      // One atomic batch: both invoice copies are written together or not at all.
      const batch = writeBatch(db);
      batch.set(patientInvoiceRef, {
        ...invoicePayload,
        amount: patientPayable,
        description: `${serviceLabel.trim()} (${invoicePayload.contractName})`
      });
      if (doctorId) batch.set(doc(db, 'clinic_invoices', invoiceId), invoicePayload);
      await batch.commit();

      clearPending();
      onSaved?.();
      onClose();
    } catch (err: any) {
      console.error('Error saving invoice:', err);
      const code = String(err?.code || '').replace('firestore/', '');
      // Only an explicit server rejection proves nothing was written. Anything else may have committed.
      const definite = ['permission-denied', 'invalid-argument', 'failed-precondition', 'not-found', 'already-exists', 'unauthenticated', 'out-of-range'].includes(code);
      const diag = await describeWriteError(err, patientId);
      setFailText(diag);
      if (definite) {
        clearPending();
        setOutcome('failed');
      } else {
        setOutcome('unknown');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4" dir="rtl">
      <div className="absolute inset-0" onClick={requestClose} />
      <div className="relative z-10 bg-white rounded-3xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden max-h-[94vh] flex flex-col">
        <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center">
              <Receipt size={20} />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900">إصدار فاتورة كشف / خدمة طبية</h2>
              <p className="text-xs text-slate-500">
                {patientName ? `المريض: ${patientName}` : `ملف #${patientId}`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={requestClose}
            className="w-8 h-8 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-slate-900 flex items-center justify-center cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {savedInfo ? (
          <div className="p-5 space-y-3 text-xs" data-testid="saved-panel">
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl font-bold space-y-1">
              <div>تم حفظ الفاتورة.</div>
              <div>رقم الفاتورة: <span className="font-mono">{savedInfo.number}</span></div>
              <div>المعرّف: <span className="font-mono break-all">{savedInfo.id}</span></div>
              <div>المبلغ المحفوظ: <span className="font-mono">{String(savedInfo.amount ?? '-')}</span> ج.م {savedInfo.label ? `(${savedInfo.label})` : ''}</div>
            </div>
            {savedInfo.recovered && (
              <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl font-semibold">
                الفاتورة دي اتحفظت من محاولة سابقة رغم ظهور رسالة خطأ. القيم المحفوظة هي الموضّحة فوق، وأي تعديل عملته بعد كده في الشاشة لم يتم تطبيقه ولم يتم إنشاء فاتورة جديدة. لو محتاج تعديل، افتح الفاتورة المحفوظة من سجل الفواتير.
              </div>
            )}
            <div className="flex justify-end">
              <button type="button" onClick={onClose} className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold cursor-pointer">إغلاق</button>
            </div>
          </div>
        ) : (
        <form onSubmit={saveInvoice} className="p-5 overflow-y-auto space-y-4 text-xs">
          {outcome === 'failed' && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl font-semibold" data-testid="fail-definite">
              تعذر حفظ الفاتورة: الخادم رفض العملية ولم يتم حفظ أي شيء. رقم الفاتورة المحجوز {sessionRef.current!.number}. يمكنك المحاولة مرة أخرى. [{failText}]
            </div>
          )}
          {outcome === 'unknown' && (
            <div className="p-2.5 bg-amber-50 border border-amber-300 text-amber-900 rounded-xl font-semibold space-y-1" data-testid="fail-unknown">
              <div>مش متأكدين إن الفاتورة اتحفظت. ممكن تكون اتحفظت فعلاً رغم ظهور الخطأ، فلا تفتح فاتورة جديدة.</div>
              <div>رقم الفاتورة: <span className="font-mono">{sessionRef.current!.number}</span> | المعرّف: <span className="font-mono break-all">{sessionRef.current!.id}</span></div>
              <div>اتقفل التعديل عشان ما يحصلش تكرار. اضغط "تأكيد حالة الفاتورة" وهنتحقق، ولو لم نجدها هنحفظها بنفس الرقم. {failText ? `[${failText}]` : ''}</div>
              {closeWarn && <div className="text-rose-700">لسه الحالة غير مؤكدة. لو أغلقت وفتحت الفاتورة تاني هنكمل بنفس الرقم. اضغط إغلاق مرة تانية للخروج.</div>}
            </div>
          )}
          {outcome === 'resumed' && (
            <div className="p-2.5 bg-amber-50 border border-amber-300 text-amber-900 rounded-xl font-semibold" data-testid="resumed">
              فيه محاولة سابقة غير مؤكدة بالرقم {sessionRef.current!.number}. لم نجد فاتورة محفوظة بها، وهنستخدم نفس الرقم عشان ما تتكررش.
            </div>
          )}
          {error && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl font-semibold">
              {error}
            </div>
          )}
          <fieldset disabled={locked} className="space-y-4 min-w-0 border-0 p-0 m-0">

          {/* Service Presets */}
          <div>
            <label className="block font-bold text-slate-700 mb-1.5">نوع الخدمة السريرية:</label>
            <div className="flex flex-wrap gap-1.5">
              {SERVICE_PRESETS.map((preset) => (
                <button
                  key={preset.type}
                  type="button"
                  onClick={() => handleSelectService(preset)}
                  className={`px-3 py-1.5 rounded-xl font-bold border transition-all cursor-pointer ${
                    serviceType === preset.type
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {preset.label} ({preset.defaultPrice} ج.م)
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">بيان الخدمة *</label>
              <input
                type="text"
                required
                value={serviceLabel}
                onChange={(e) => setServiceLabel(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:bg-white focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">سعر الخدمة الأساسي (EGP) *</label>
              <input
                type="number"
                required
                min={1}
                value={baseAmount}
                onChange={(e) => setBaseAmount(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-mono font-bold focus:bg-white focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Contract / Syndicate Selector */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">التعاقد / النقابة / التأمين:</label>
              <select
                value={selectedContractId}
                onChange={(e) => setSelectedContractId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold focus:bg-white focus:border-emerald-500 focus:outline-none"
              >
                <option value="cash">نقدي (كشف خاص بدون تعاقد)</option>
                {contracts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} (خصم {c.discountPercent}%{c.coveragePercent ? ` · تحمل ${c.coveragePercent}%` : ''})
                  </option>
                ))}
              </select>
            </div>

            {selectedContractId === 'cash' ? (
              <div>
                <label className="block font-bold text-slate-700 mb-1">خصم إضافي (%):</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={customDiscount}
                  onChange={(e) => setCustomDiscount(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-mono focus:bg-white focus:border-emerald-500 focus:outline-none"
                />
              </div>
            ) : (
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-2.5 flex items-center gap-2 text-indigo-800">
                <ShieldCheck size={16} className="shrink-0" />
                <div className="text-[11px]">
                  <div className="font-bold">{chosenContract?.name}</div>
                  <div>تحمل الجهة: {entityShare} ج.م</div>
                </div>
              </div>
            )}
          </div>

          {/* Payment Method & Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1.5">وسيلة الدفع:</label>
              <div className="grid grid-cols-3 gap-1">
                {[
                  { id: 'Cash', label: 'كاش', icon: Banknote },
                  { id: 'InstaPay', label: 'InstaPay', icon: Smartphone },
                  { id: 'Card', label: 'فيزا', icon: CreditCard }
                ].map((m) => {
                  const Icon = m.icon;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPaymentMethod(m.id as any)}
                      className={`py-2 px-1 rounded-xl border font-bold flex flex-col items-center gap-1 cursor-pointer ${
                        paymentMethod === m.id
                          ? 'bg-teal-600 text-white border-teal-600'
                          : 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      <Icon size={13} />
                      <span className="text-[10px]">{m.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1.5">حالة التحصيل:</label>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setStatus('Paid')}
                  className={`py-2.5 rounded-xl border font-bold cursor-pointer ${
                    status === 'Paid'
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-slate-50 text-slate-700 border-slate-200'
                  }`}
                >
                  تم التحصيل
                </button>
                <button
                  type="button"
                  onClick={() => setStatus('Unpaid')}
                  className={`py-2.5 rounded-xl border font-bold cursor-pointer ${
                    status === 'Unpaid'
                      ? 'bg-amber-500 text-white border-amber-500'
                      : 'bg-slate-50 text-slate-700 border-slate-200'
                  }`}
                >
                  آجل / مستحق
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">ملاحظات الإيصال (اختياري):</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="مثال: رقم كارنيه النقابة أو تحويل شركة التأمين"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:bg-white focus:border-emerald-500 focus:outline-none"
            />
          </div>

          {/* Financial Summary Box */}
          <div className="bg-slate-900 text-white rounded-2xl p-4 space-y-1.5">
            <div className="flex justify-between text-slate-300">
              <span>إجمالي الخدمة الأساسي:</span>
              <span className="font-mono">{numericBase} EGP</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-amber-300">
                <span>قيمة الخصم ({discountPct}%):</span>
                <span className="font-mono">- {discountAmount} EGP</span>
              </div>
            )}
            {entityShare > 0 && (
              <div className="flex justify-between text-sky-300">
                <span>حصة جهة التعاقد ({coveragePct}%):</span>
                <span className="font-mono">{entityShare} EGP</span>
              </div>
            )}
            <div className="flex justify-between text-base font-black pt-2 border-t border-slate-700">
              <span>المطلوب تحصيله من المريض:</span>
              <span className="font-mono text-emerald-400">{patientPayable} EGP</span>
            </div>
          </div>

          </fieldset>
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={requestClose}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-xl font-bold shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 size={15} />
              <span>{saving ? 'جاري الحفظ...' : locked ? 'تأكيد حالة الفاتورة' : 'اعتماد وحفظ الفاتورة'}</span>
            </button>
          </div>
        </form>
        )}
      </div>
    </div>
  );
}
