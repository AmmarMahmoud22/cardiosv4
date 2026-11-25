import React, { useState, useEffect, useRef } from 'react';
import {
  BookOpen,
  Upload,
  FileText,
  Trash2,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Eye,
  X,
  Search,
  Sparkles,
  Lock,
  Power,
  Send,
  Loader2,
  BookmarkCheck,
  Ban,
  Quote
} from 'lucide-react';
import {
  KnowledgeSource,
  KnowledgeChunk,
  KnowledgeSettings,
  CitationEvidence
} from '../types/knowledge';
import {
  subscribeToKnowledgeSources,
  ingestKnowledgeFile,
  toggleKnowledgeSourceActive,
  deleteKnowledgeSource,
  getSourceChunks,
  getKnowledgeSettings,
  saveKnowledgeSettings,
  retrieveRelevantChunks,
  DEFAULT_KNOWLEDGE_SETTINGS,
  IngestionProgress
} from '../lib/knowledgeBase';
import { useLanguage } from '../context/LanguageContext';
import { authedFetch } from '../lib/apiClient';

const CATEGORIES = [
  { value: 'إرشادات ESC للقلب', labelAr: 'إرشادات الجمعية الأوروبية للقلب (ESC)', labelEn: 'ESC Cardiology Guidelines' },
  { value: 'إرشادات AHA / ACC', labelAr: 'إرشادات القلب الأمريكية (AHA / ACC)', labelEn: 'AHA / ACC Guidelines' },
  { value: 'أدوية القلب والتعارضات', labelAr: 'دليل أدوية القلب والتعارضات الدوائية', labelEn: 'Cardiovascular Pharmacology & DDI' },
  { value: 'بروتوكول العيادة المعتمد', labelAr: 'بروتوكول العيادة أو المستشفى الداخلي', labelEn: 'Internal Clinic Protocol' }
];

export default function AIKnowledgeBaseManager() {
  const { isRTL } = useLanguage();

  const [sources, setSources] = useState<KnowledgeSource[]>([]);
  const [settings, setSettings] = useState<KnowledgeSettings>(DEFAULT_KNOWLEDGE_SETTINGS);
  const [savingSettings, setSavingSettings] = useState(false);

  // Upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [customTitle, setCustomTitle] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(CATEGORIES[0].value);
  const [ingesting, setIngesting] = useState(false);
  const [progress, setProgress] = useState<IngestionProgress | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Page Inspector Modal
  const [inspectingSource, setInspectingSource] = useState<KnowledgeSource | null>(null);
  const [inspectedChunks, setInspectedChunks] = useState<KnowledgeChunk[]>([]);
  const [loadingChunks, setLoadingChunks] = useState(false);
  const [pageSearch, setPageSearch] = useState('');

  // Admin Live Sandbox Test
  const [testQuery, setTestQuery] = useState('');
  const [testingAi, setTestingAi] = useState(false);
  const [testResult, setTestResult] = useState<{
    answer: string;
    citations: CitationEvidence[];
    refused: boolean;
  } | null>(null);

  useEffect(() => {
    const unsub = subscribeToKnowledgeSources(setSources);
    getKnowledgeSettings().then(setSettings);
    return () => unsub();
  }, []);

  const handleToggleSetting = async (key: keyof Pick<KnowledgeSettings, 'strictCardiologyOnly' | 'strictKnowledgeOnly' | 'requirePageCitation'>) => {
    const next: KnowledgeSettings = { ...settings, [key]: !settings[key] };
    setSettings(next);
    setSavingSettings(true);
    await saveKnowledgeSettings(next);
    setSavingSettings(false);
  };

  const handleFileChange = (file: File | null) => {
    if (!file) return;
    setUploadError(null);
    setUploadSuccess(null);
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (!['pdf', 'txt', 'md'].includes(ext)) {
      setUploadError(isRTL ? 'يدعم النظام حالياً ملفات PDF أو TXT أو Markdown (.md) فقط.' : 'Only PDF, TXT, or MD files are supported.');
      return;
    }
    setSelectedFile(file);
    setCustomTitle(file.name.replace(/\.(pdf|txt|md)$/i, ''));
  };

  const handleUploadAndTrain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || ingesting) return;

    setIngesting(true);
    setUploadError(null);
    setUploadSuccess(null);

    try {
      const created = await ingestKnowledgeFile(
        selectedFile,
        {
          title: customTitle.trim() || selectedFile.name,
          category: selectedCategory,
          uploadedBy: 'Super Admin'
        },
        (prog) => setProgress(prog)
      );

      setUploadSuccess(
        isRTL
          ? `تمت فهرسة "${created.title}" بنجاح (${created.totalPages} صفحة • ${created.totalChunks} مقطع ${created.hasEmbeddings ? 'مع فهرسة دلالية AI' : 'فهرسة نصية'}).`
          : `Successfully indexed "${created.title}" (${created.totalPages} pages • ${created.totalChunks} chunks).`
      );
      setSelectedFile(null);
      setCustomTitle('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      setUploadError(err?.message || 'حدث خطأ أثناء معالجة الملف.');
    } finally {
      setIngesting(false);
    }
  };

  const handleInspectSource = async (source: KnowledgeSource) => {
    setInspectingSource(source);
    setLoadingChunks(true);
    setPageSearch('');
    const chunks = await getSourceChunks(source.id);
    setInspectedChunks(chunks);
    setLoadingChunks(false);
  };

  const handleDeleteSource = async (source: KnowledgeSource) => {
    await deleteKnowledgeSource(source.id);
    if (inspectingSource?.id === source.id) {
      setInspectingSource(null);
      setInspectedChunks([]);
    }
  };

  const handleRunTestQuery = async (preset?: string) => {
    const q = (preset ?? testQuery).trim();
    if (!q || testingAi) return;
    if (preset) setTestQuery(preset);

    setTestingAi(true);
    setTestResult(null);

    try {
      const { chunks, activeSourceCount } = await retrieveRelevantChunks(q, 7);
      const res = await authedFetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: q,
          history: [{ role: 'user', parts: [{ text: q }] }],
          retrievedChunks: chunks,
          knowledgeSettings: settings,
          activeSourceCount
        })
      });

      const data = await res.json();
      setTestResult({
        answer: data.response || '',
        citations: Array.isArray(data.citations) ? data.citations : [],
        refused: Boolean(data.refused)
      });
    } catch {
      setTestResult({
        answer: 'تعذر الاتصال بمحرك الذكاء الاصطناعي على الخادم.',
        citations: [],
        refused: true
      });
    } finally {
      setTestingAi(false);
    }
  };

  const activeSources = sources.filter((s) => s.isActive);
  const totalPagesCount = sources.reduce((acc, s) => acc + (s.totalPages || 0), 0);

  return (
    <div className="space-y-5 pt-4 border-t border-slate-200/80">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 text-white flex items-center justify-center shadow-sm shadow-teal-500/20">
            <BookOpen size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black text-slate-900">
                {isRTL ? 'مكتبة المعرفة ومصادر الذكاء الاصطناعي (Cardiology RAG)' : 'AI Medical Knowledge Base (RAG)'}
              </h3>
              <span className="text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200 px-2.5 py-0.5 rounded-full">
                {activeSources.length} {isRTL ? 'مصدر نشط' : 'Active'} · {totalPagesCount} {isRTL ? 'صفحة' : 'Pages'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {isRTL
                ? 'ارفع كتب وبروتوكولات القلب (PDF/TXT) ليتقيد المساعد الطبي بالإجابة منها بالدليل ورقم الصفحة ويرفض أي أسئلة خارج نطاق القلب.'
                : 'Upload Cardiology PDFs/Protocols so the AI responds strictly with page citations and rejects off-topic queries.'}
            </p>
          </div>
        </div>
      </div>

      {/* Strict Guardrails Switches */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <button
          type="button"
          onClick={() => handleToggleSetting('strictCardiologyOnly')}
          disabled={savingSettings}
          className={`p-3.5 rounded-2xl border text-right transition-all flex items-start justify-between gap-3 cursor-pointer ${
            settings.strictCardiologyOnly
              ? 'bg-teal-50/90 border-teal-300 shadow-xs'
              : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div>
            <div className="flex items-center gap-1.5 text-xs font-black text-slate-900">
              <Lock size={14} className={settings.strictCardiologyOnly ? 'text-teal-600' : 'text-slate-400'} />
              <span>{isRTL ? 'حصر الأسئلة في أمراض القلب فقط' : 'Cardiology-Only Restriction'}</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
              {isRTL ? 'يرفض الـ AI الإجابة على أي سؤال خارج تخصص القلب أو المراجع المرفوعة.' : 'Rejects any query outside cardiology or uploaded references.'}
            </p>
          </div>
          <span
            className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-black ${
              settings.strictCardiologyOnly ? 'bg-teal-600 text-white' : 'bg-slate-200 text-slate-600'
            }`}
          >
            {settings.strictCardiologyOnly ? (isRTL ? 'مفعّل' : 'ON') : isRTL ? 'معطّل' : 'OFF'}
          </span>
        </button>

        <button
          type="button"
          onClick={() => handleToggleSetting('strictKnowledgeOnly')}
          disabled={savingSettings}
          className={`p-3.5 rounded-2xl border text-right transition-all flex items-start justify-between gap-3 cursor-pointer ${
            settings.strictKnowledgeOnly
              ? 'bg-indigo-50/90 border-indigo-300 shadow-xs'
              : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div>
            <div className="flex items-center gap-1.5 text-xs font-black text-slate-900">
              <ShieldCheck size={14} className={settings.strictKnowledgeOnly ? 'text-indigo-600' : 'text-slate-400'} />
              <span>{isRTL ? 'الإجابة من الملفات المرفوعة فقط' : 'Strict Uploaded Sources Only'}</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
              {isRTL ? 'يمنع استخدام المعرفة العامة العشوائية ويلزم الموديل بمصادرك فقط.' : 'Prevents general guessing; answers exclusively from uploaded files.'}
            </p>
          </div>
          <span
            className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-black ${
              settings.strictKnowledgeOnly ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'
            }`}
          >
            {settings.strictKnowledgeOnly ? (isRTL ? 'مفعّل' : 'ON') : isRTL ? 'معطّل' : 'OFF'}
          </span>
        </button>

        <button
          type="button"
          onClick={() => handleToggleSetting('requirePageCitation')}
          disabled={savingSettings}
          className={`p-3.5 rounded-2xl border text-right transition-all flex items-start justify-between gap-3 cursor-pointer ${
            settings.requirePageCitation
              ? 'bg-emerald-50/90 border-emerald-300 shadow-xs'
              : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div>
            <div className="flex items-center gap-1.5 text-xs font-black text-slate-900">
              <BookmarkCheck size={14} className={settings.requirePageCitation ? 'text-emerald-600' : 'text-slate-400'} />
              <span>{isRTL ? 'إلزام الدليل ورقم الصفحة' : 'Require Page Number & Quote'}</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
              {isRTL ? 'يعرض اسم المرجع ورقم الصفحة الدقيق مع اقتباس الدليل تحت كل إجابة.' : 'Includes exact file name, page number, and quoted text under replies.'}
            </p>
          </div>
          <span
            className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-black ${
              settings.requirePageCitation ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
            }`}
          >
            {settings.requirePageCitation ? (isRTL ? 'مفعّل' : 'ON') : isRTL ? 'معطّل' : 'OFF'}
          </span>
        </button>
      </div>

      {/* Upload + List Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Upload New Reference Form */}
        <form
          onSubmit={handleUploadAndTrain}
          className="lg:col-span-5 bg-slate-50/90 border border-slate-200/90 rounded-2xl p-4 space-y-3.5"
        >
          <div className="flex items-center gap-2 text-xs font-black text-slate-800">
            <Upload size={15} className="text-teal-600" />
            <span>{isRTL ? 'رفع مرجع أو كتاب طبي جديد (PDF / TXT)' : 'Upload New Cardiology Reference'}</span>
          </div>

          <div
            onClick={() => !ingesting && fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-5 text-center transition-all cursor-pointer ${
              selectedFile
                ? 'border-teal-400 bg-teal-50/60'
                : 'border-slate-300 bg-white hover:border-teal-400 hover:bg-teal-50/30'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.txt,.md,application/pdf,text/plain"
              onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
              className="hidden"
              disabled={ingesting}
            />
            <FileText size={26} className={`mx-auto mb-2 ${selectedFile ? 'text-teal-600' : 'text-slate-400'}`} />
            {selectedFile ? (
              <div>
                <p className="text-xs font-bold text-teal-900 truncate px-2">{selectedFile.name}</p>
                <p className="text-[11px] text-teal-700 font-mono mt-0.5">
                  {(selectedFile.size / 1024).toFixed(1)} KB · {isRTL ? 'جاهز للاستخراج والفهرسة' : 'Ready to index'}
                </p>
              </div>
            ) : (
              <div>
                <p className="text-xs font-bold text-slate-700">
                  {isRTL ? 'اضغط لاختيار ملف PDF أو TXT من جهازك' : 'Click to choose PDF / TXT file'}
                </p>
                <p className="text-[10px] text-slate-400 mt-1">
                  {isRTL ? 'يتم استخراج النصوص صفحة بصفحة لحفظ أرقام الصفحات بدقة' : 'Pages are extracted with exact 1-based page numbers'}
                </p>
              </div>
            )}
          </div>

          <div className="space-y-2.5 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                {isRTL ? 'اسم المرجع (سيظهر في الاستشهادات):' : 'Reference Title:'}
              </label>
              <input
                type="text"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder={isRTL ? 'مثال: ESC Hypertension Guidelines 2024' : 'e.g. ESC Hypertension Guidelines 2024'}
                disabled={ingesting}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-teal-600"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                {isRTL ? 'التصنيف الطبي:' : 'Category:'}
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                disabled={ingesting}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-teal-600"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {isRTL ? cat.labelAr : cat.labelEn}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {ingesting && progress && (
            <div className="bg-white border border-teal-200 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-bold text-teal-800">
                <span className="flex items-center gap-1.5">
                  <Loader2 size={13} className="animate-spin text-teal-600" />
                  {progress.message}
                </span>
                <span className="font-mono">
                  {progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0}%
                </span>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-teal-600 h-full transition-all duration-200 rounded-full"
                  style={{
                    width: `${progress.total > 0 ? Math.min(100, Math.round((progress.current / progress.total) * 100)) : 10}%`
                  }}
                />
              </div>
            </div>
          )}

          {uploadError && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 text-[11px] font-bold p-2.5 rounded-xl flex items-start gap-2">
              <AlertTriangle size={14} className="shrink-0 mt-0.5 text-rose-600" />
              <span>{uploadError}</span>
            </div>
          )}

          {uploadSuccess && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold p-2.5 rounded-xl flex items-start gap-2">
              <CheckCircle2 size={14} className="shrink-0 mt-0.5 text-emerald-600" />
              <span>{uploadSuccess}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={!selectedFile || ingesting}
            className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-all shadow-sm shadow-teal-600/20 flex items-center justify-center gap-2 cursor-pointer"
          >
            {ingesting ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
            <span>
              {ingesting
                ? isRTL
                  ? 'جاري تحليل الصفحات وفهرستها...'
                  : 'Indexing Pages...'
                : isRTL
                ? 'استخراج الصفحات وتدريب المساعد الآن'
                : 'Extract Pages & Index Knowledge'}
            </span>
          </button>
        </form>

        {/* Right: Uploaded Knowledge Sources List */}
        <div className="lg:col-span-7 bg-white border border-slate-200/90 rounded-2xl p-4 flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h4 className="text-xs font-black text-slate-800">
              {isRTL ? `المصادر والملفات المرفوعة (${sources.length})` : `Uploaded References (${sources.length})`}
            </h4>
            <span className="text-[10px] text-slate-400">
              {isRTL ? 'يمكنك تفعيل/إيقاف أي مرجع أو معاينة صفحاته' : 'Toggle active status or inspect extracted pages'}
            </span>
          </div>

          {sources.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-10 text-center text-slate-400 space-y-2">
              <BookOpen size={32} className="opacity-30" />
              <p className="text-xs font-bold text-slate-500">
                {isRTL ? 'لم يتم رفع أي مراجع طبية بعد' : 'No medical references uploaded yet'}
              </p>
              <p className="text-[11px] max-w-sm leading-relaxed">
                {isRTL
                  ? 'ارفع ملف PDF لإرشادات القلب أو بروتوكول عيادتك من النموذج المجاور، وسيبدأ المساعد في استخدامه فوراً مع ذكر رقم الصفحة.'
                  : 'Upload a Cardiology PDF or protocol on the left to ground the AI assistant with exact page citations.'}
              </p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
              {sources.map((src) => (
                <div
                  key={src.id}
                  className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    src.isActive
                      ? 'bg-slate-50/70 border-slate-200 hover:border-teal-300'
                      : 'bg-slate-100/60 border-slate-200/70 opacity-65'
                  }`}
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-black text-slate-900 truncate max-w-[260px]">
                        {src.title}
                      </span>
                      <span className="text-[10px] font-mono uppercase bg-slate-200/80 text-slate-700 px-1.5 py-0.5 rounded font-bold">
                        {src.fileType}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          src.isActive
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}
                      >
                        {src.isActive ? (isRTL ? 'مفعل في AI' : 'Active') : isRTL ? 'موقوف' : 'Paused'}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-2 font-mono">
                      <span>{src.totalPages} {isRTL ? 'صفحة' : 'pages'}</span>
                      <span>•</span>
                      <span>{src.totalChunks} {isRTL ? 'مقطع' : 'chunks'}</span>
                      <span>•</span>
                      <span className={src.hasEmbeddings ? 'text-teal-700 font-bold' : 'text-amber-700'}>
                        {src.hasEmbeddings ? (isRTL ? 'بحث دلالي AI ✓' : 'Semantic Vector ✓') : isRTL ? 'بحث نصي' : 'Keyword Index'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleInspectSource(src)}
                      className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                      title={isRTL ? 'معاينة الصفحات المستخرجة' : 'Inspect Pages'}
                    >
                      <Eye size={13} className="text-indigo-600" />
                      <span>{isRTL ? 'الصفحات' : 'Pages'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleKnowledgeSourceActive(src)}
                      className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-bold flex items-center gap-1 cursor-pointer ${
                        src.isActive
                          ? 'bg-amber-50 hover:bg-amber-100 border-amber-200 text-amber-800'
                          : 'bg-emerald-600 hover:bg-emerald-700 border-emerald-600 text-white'
                      }`}
                    >
                      <Power size={13} />
                      <span>{src.isActive ? (isRTL ? 'إيقاف' : 'Pause') : isRTL ? 'تفعيل' : 'Enable'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteSource(src)}
                      className="p-1.5 rounded-lg bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                      title={isRTL ? 'حذف المرجع' : 'Delete'}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Admin Live RAG Test Console */}
      <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-2xl p-5 space-y-3.5 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sparkles size={17} className="text-amber-300" />
            <h4 className="text-xs font-black">
              {isRTL
                ? 'منصة اختبار الـ AI المقيّد (تأكد من رقم الصفحة ورفض الأسئلة غير الطبية)'
                : 'Strict RAG Verification Console'}
            </h4>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => handleRunTestQuery('ما هي طريقة عمل البيتزا بالجبن؟')}
              className="text-[10px] bg-white/10 hover:bg-rose-500/30 border border-white/15 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
            >
              {isRTL ? 'اختبار رفض (سؤال خارج القلب) ⛔' : 'Test Off-Topic Refusal ⛔'}
            </button>
          </div>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={testQuery}
            onChange={(e) => setTestQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleRunTestQuery();
              }
            }}
            placeholder={
              isRTL
                ? 'اسأل سؤالاً من الملفات المرفوعة أو جرب سؤالاً خارج أمراض القلب...'
                : 'Ask a cardiology question from your PDF or test an out-of-scope query...'
            }
            className="flex-1 bg-white/10 border border-white/20 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-300 focus:outline-none focus:border-teal-400"
          />
          <button
            type="button"
            onClick={() => handleRunTestQuery()}
            disabled={!testQuery.trim() || testingAi}
            className="px-4 py-2.5 bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-slate-950 font-black text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
          >
            {testingAi ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            <span>{isRTL ? 'اختبار' : 'Test'}</span>
          </button>
        </div>

        {testResult && (
          <div
            className={`p-4 rounded-xl border text-xs space-y-3 ${
              testResult.refused
                ? 'bg-rose-950/60 border-rose-400/40 text-rose-100'
                : 'bg-white/10 border-teal-400/40 text-slate-100'
            }`}
          >
            <div className="flex items-center justify-between">
              <span
                className={`inline-flex items-center gap-1.5 text-[11px] font-black px-2.5 py-0.5 rounded-full ${
                  testResult.refused
                    ? 'bg-rose-500/30 text-rose-200 border border-rose-400/40'
                    : 'bg-emerald-500/30 text-emerald-200 border border-emerald-400/40'
                }`}
              >
                {testResult.refused ? <Ban size={12} /> : <CheckCircle2 size={12} />}
                {testResult.refused
                  ? isRTL
                    ? 'تم الرفض (خارج نطاق القلب أو المصادر)'
                    : 'REFUSED (Out of Scope / No Source Evidence)'
                  : isRTL
                  ? 'إجابة موثقة من المصادر المعتمدة ✓'
                  : 'Grounded Answer with Page Evidence ✓'}
              </span>
            </div>

            <div className="whitespace-pre-wrap leading-relaxed">{testResult.answer}</div>

            {testResult.citations.length > 0 && (
              <div className="pt-2 border-t border-white/15 space-y-2">
                <span className="text-[11px] font-bold text-teal-300 block">
                  {isRTL ? 'الأدلة وأرقام الصفحات المستشهد بها:' : 'Page Citations & Evidence:'}
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {testResult.citations.map((cit, i) => (
                    <div key={i} className="bg-black/25 border border-white/15 rounded-xl p-2.5 space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-bold text-teal-200">
                        <span className="truncate max-w-[70%]">{cit.sourceTitle}</span>
                        <span className="bg-teal-500/30 border border-teal-400/40 px-2 py-0.5 rounded-md font-mono text-[10px]">
                          {isRTL ? `صفحة ${cit.pageNumber}` : `Page ${cit.pageNumber}`}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300 italic flex items-start gap-1">
                        <Quote size={11} className="shrink-0 mt-0.5 text-teal-400" />
                        <span>"{cit.quote}"</span>
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal: Inspect Extracted Pages of a Source */}
      {inspectingSource && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[85vh] border border-slate-200 shadow-2xl flex flex-col overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-sm font-black text-slate-900">{inspectingSource.title}</h3>
                <p className="text-[11px] text-slate-500 font-mono">
                  {inspectingSource.totalPages} {isRTL ? 'صفحة' : 'pages'} · {inspectedChunks.length} {isRTL ? 'مقطع مفهرس' : 'indexed segments'}
                </p>
              </div>
              <button
                onClick={() => setInspectingSource(null)}
                className="p-2 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-3 border-b border-slate-100 bg-white">
              <div className="relative">
                <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={pageSearch}
                  onChange={(e) => setPageSearch(e.target.value)}
                  placeholder={isRTL ? 'ابحث برقم الصفحة أو كلمة داخل المرجع...' : 'Search by page number or keyword...'}
                  className="w-full pr-9 pl-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-teal-500"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
              {loadingChunks ? (
                <div className="py-12 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                  <Loader2 size={16} className="animate-spin text-teal-600" />
                  <span>{isRTL ? 'جاري تحميل الصفحات...' : 'Loading pages...'}</span>
                </div>
              ) : (
                inspectedChunks
                  .filter(
                    (c) =>
                      !pageSearch.trim() ||
                      String(c.pageNumber) === pageSearch.trim() ||
                      c.text.toLowerCase().includes(pageSearch.toLowerCase())
                  )
                  .map((chunk) => (
                    <div key={chunk.id} className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2 shadow-2xs">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <span className="text-xs font-black text-teal-700 bg-teal-50 border border-teal-200 px-2.5 py-0.5 rounded-lg font-mono">
                          {isRTL ? `صفحة رقم ${chunk.pageNumber}` : `Page ${chunk.pageNumber}`}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          Chunk #{chunk.chunkIndex + 1}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                        {chunk.text}
                      </p>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
