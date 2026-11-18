import React, { useEffect, useMemo, useState } from 'react';
import { addDoc, collection, deleteDoc, doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { PatientAttachment, StaffRole } from '../types/clinic';
import {
  FileImage,
  Upload,
  Eye,
  Trash2,
  X,
  AlertCircle,
  CheckCircle2,
  HeartPulse,
  FileText
} from 'lucide-react';

interface PatientAttachmentsPanelProps {
  patientId: string;
  doctorId: string;
  staffUids: string[];
  staffRole?: StaffRole;
  staffName?: string;
  readOnly?: boolean;
}

const CATEGORIES: Array<{ id: PatientAttachment['category']; label: string }> = [
  { id: 'ECG', label: 'رسم قلب (ECG)' },
  { id: 'Echo', label: 'إيكو القلب (Echo)' },
  { id: 'X-Ray', label: 'أشعة صدر (X-Ray)' },
  { id: 'Cath', label: 'تقرير قسطرة (Cath)' },
  { id: 'Other', label: 'مرفق طبي آخر' }
];

async function compressImageDataUrl(file: File): Promise<{ dataUrl: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 1400;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          const ratio = Math.min(maxDim / width, maxDim / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas unavailable'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);

        let quality = 0.8;
        let output = canvas.toDataURL('image/jpeg', quality);
        while (output.length > 580_000 && quality > 0.35) {
          quality -= 0.12;
          output = canvas.toDataURL('image/jpeg', quality);
        }
        if (output.length > 620_000) {
          reject(new Error('حجم الصورة كبير جداً بعد الضغط، يرجى اختيار صورة أوضح أو أصغر.'));
          return;
        }
        resolve({ dataUrl: output, mimeType: 'image/jpeg' });
      };
      img.onerror = () => reject(new Error('تعذر قراءة ملف الصورة.'));
      img.src = String(reader.result);
    };
    reader.onerror = () => reject(new Error('تعذر قراءة الملف المختار.'));
    reader.readAsDataURL(file);
  });
}

export default function PatientAttachmentsPanel({
  patientId,
  doctorId,
  staffUids,
  staffRole = 'doctor',
  staffName = 'فريق العيادة',
  readOnly = false
}: PatientAttachmentsPanelProps) {
  const [attachments, setAttachments] = useState<PatientAttachment[]>([]);
  const [filterCat, setFilterCat] = useState<'ALL' | PatientAttachment['category']>('ALL');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<PatientAttachment['category']>('ECG');
  const [studyDate, setStudyDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [previewItem, setPreviewItem] = useState<PatientAttachment | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (!patientId) return;
    const unsub = onSnapshot(
      collection(db, 'patients', patientId, 'attachments'),
      (snap) => {
        const list = snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as any) } as PatientAttachment))
          .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        setAttachments(list);
      },
      (err) => {
        console.warn('Attachments listener notice:', err);
      }
    );
    return () => unsub();
  }, [patientId]);

  const filteredAttachments = useMemo(() => {
    if (filterCat === 'ALL') return attachments;
    return attachments.filter((a) => a.category === filterCat);
  }, [attachments, filterCat]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly || !selectedFile || !patientId) return;

    setError('');
    setSuccess('');
    setUploading(true);

    try {
      let dataUrl = '';
      let mimeType = selectedFile.type || 'application/octet-stream';

      if (mimeType.startsWith('image/')) {
        const compressed = await compressImageDataUrl(selectedFile);
        dataUrl = compressed.dataUrl;
        mimeType = compressed.mimeType;
      } else if (mimeType === 'application/pdf') {
        if (selectedFile.size > 450 * 1024) {
          setError('ملف PDF يجب ألا يتعدى 450 كيلوبايت لضمان سرعة المزامنة السحابية.');
          setUploading(false);
          return;
        }
        dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(new Error('تعذر قراءة ملف PDF.'));
          reader.readAsDataURL(selectedFile);
        });
      } else {
        setError('الصيغ المدعومة هي صور رسم القلب والأشعة (JPG / PNG / WebP) أو ملفات PDF حتى 450KB.');
        setUploading(false);
        return;
      }

      const payload: Omit<PatientAttachment, 'id'> = {
        patientId,
        doctorId,
        staffUids,
        title: title.trim() || `${CATEGORIES.find((c) => c.id === category)?.label || category}`,
        category,
        mimeType,
        fileName: selectedFile.name,
        fileSizeBytes: dataUrl.length,
        dataUrl,
        studyDate,
        notes: notes.trim(),
        uploadedBy: staffName || 'طاقم العيادة',
        uploadedByRole: staffRole,
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'patients', patientId, 'attachments'), payload);
      setTitle('');
      setNotes('');
      setSelectedFile(null);
      setSuccess('تم حفظ مرفق الفحص ومزامنته مع ملف المريض.');
      setTimeout(() => setSuccess(''), 3500);
    } catch (err: any) {
      setError(err?.message || 'تعذر رفع المرفق، يرجى المحاولة مرة أخرى.');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteAttachment = async (attId: string) => {
    if (readOnly) return;
    try {
      await deleteDoc(doc(db, 'patients', patientId, 'attachments', attId));
      setConfirmDeleteId(null);
    } catch (err) {
      console.warn('Error deleting attachment:', err);
    }
  };

  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-5" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <HeartPulse size={18} className="text-rose-600" />
            <span>مرفقات رسم القلب والأشعة والتقارير ({attachments.length})</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            أرشفة صور ECG و Echo والأشعة وتظهر للمريض بصيغة للقراءة فقط في تطبيقه
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setFilterCat('ALL')}
            className={`px-2.5 py-1 rounded-xl text-[11px] font-bold cursor-pointer ${
              filterCat === 'ALL' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
            }`}
          >
            الكل
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setFilterCat(c.id)}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold cursor-pointer ${
                filterCat === c.id ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {!readOnly && (
        <form onSubmit={handleUpload} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3 text-xs">
          {error && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 font-semibold flex items-center gap-2">
              <AlertCircle size={14} />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 font-semibold flex items-center gap-2">
              <CheckCircle2 size={14} />
              <span>{success}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">تصنيف الفحص</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as PatientAttachment['category'])}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 font-semibold"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">عنوان المرفق</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="مثال: رسم قلب 12 وصلة"
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">تاريخ الفحص</label>
              <input
                type="date"
                value={studyDate}
                onChange={(e) => setStudyDate(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 font-mono"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">اختر ملف الصورة / PDF *</label>
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                className="w-full bg-white border border-slate-200 rounded-xl px-2 py-1.5 text-[11px]"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="ملاحظات سريرية أو تعليق الفني (اختياري)"
              className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2"
            />
            <button
              type="submit"
              disabled={!selectedFile || uploading}
              className="px-5 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl font-bold flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
            >
              <Upload size={14} />
              <span>{uploading ? 'جاري الضغط والرفع...' : 'رفع وأرشفة المرفق'}</span>
            </button>
          </div>
        </form>
      )}

      {filteredAttachments.length === 0 ? (
        <div className="py-10 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-xs text-slate-400">
          <FileImage size={28} className="mx-auto mb-2 text-slate-300" />
          لا توجد مرفقات رسم قلب أو أشعة مسجلة في هذا التصنيف حتى الآن.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredAttachments.map((att) => (
            <div
              key={att.id}
              className="border border-slate-200 rounded-2xl p-3 bg-slate-50/70 flex flex-col justify-between gap-2.5"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                    {att.category}
                  </span>
                  <h4 className="text-xs font-black text-slate-900 mt-1.5">{att.title}</h4>
                  <p className="text-[11px] text-slate-500 font-mono">{att.studyDate}</p>
                </div>
                {att.mimeType.startsWith('image/') ? (
                  <img
                    src={att.dataUrl}
                    alt={att.title}
                    className="w-16 h-16 object-cover rounded-xl border border-slate-200 shrink-0 cursor-pointer"
                    onClick={() => setPreviewItem(att)}
                  />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-rose-600 shrink-0">
                    <FileText size={24} />
                  </div>
                )}
              </div>

              {att.notes && <p className="text-[11px] text-slate-600 leading-relaxed">{att.notes}</p>}

              <div className="flex items-center justify-between pt-2 border-t border-slate-200/70 text-[11px]">
                <button
                  type="button"
                  onClick={() => setPreviewItem(att)}
                  className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 rounded-xl font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Eye size={13} />
                  <span>عرض المرفق</span>
                </button>

                {!readOnly && (
                  confirmDeleteId === att.id ? (
                    <button
                      type="button"
                      onClick={() => handleDeleteAttachment(att.id)}
                      className="px-2.5 py-1 bg-rose-600 text-white rounded-xl font-bold cursor-pointer"
                    >
                      تأكيد الحذف
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setConfirmDeleteId(att.id);
                        setTimeout(() => setConfirmDeleteId(null), 4000);
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl cursor-pointer"
                      title="حذف المرفق"
                    >
                      <Trash2 size={14} />
                    </button>
                  )
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox Preview */}
      {previewItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4" dir="rtl">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-5 space-y-3 shadow-2xl max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-black text-slate-900">{previewItem.title}</h3>
                <p className="text-xs text-slate-500 font-mono">
                  {previewItem.category} • {previewItem.studyDate} • رفع: {previewItem.uploadedBy}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewItem(null)}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-auto flex items-center justify-center bg-slate-900 rounded-2xl p-2 min-h-[300px]">
              {previewItem.mimeType.startsWith('image/') ? (
                <img src={previewItem.dataUrl} alt={previewItem.title} className="max-h-[70vh] object-contain rounded-lg" />
              ) : (
                <iframe
                  src={previewItem.dataUrl}
                  title={previewItem.title}
                  className="w-full h-[70vh] rounded-lg bg-white"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
