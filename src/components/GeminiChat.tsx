import React, {useState, useRef, useEffect} from 'react';
import {Sparkles, X, Send, RotateCcw, ChevronDown, Bot, HeartPulse, UserCheck, Check, Copy, Activity, ShieldCheck, Stethoscope} from 'lucide-react';

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  time?: string;
}

export interface PatientContext {
  id?: string;
  name: string;
  nameEn?: string;
  dob?: string;
  age?: number;
  gender?: string;
  status?: string;
  diagnosis?: string;
  riskTier?: string;
  ef?: number;
  vitals?: any[];
  medications?: any[];
  labs?: any;
  echo?: any;
}

interface Props {
  patientContext?: PatientContext;
  externalOpenTrigger?: number;
}

const GENERAL_PROMPTS = [
  'توصيات إرشادات ESC 2024 لعلاج ضغط الدم المرتفع (Stage 2)',
  'الجرعات الآمنة لحاصرات بيتا في مرضى قصور عضلة القلب (HFrEF)',
  'احتياطات الجمع بين مضادات التجلط والأسبرين بعد القسطرة',
  'قواعد تعديل جرعات أدوية القلب وفق وظائف الكلى و eGFR'
];

export default function GeminiChat({patientContext, externalOpenTrigger}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // If external open trigger changes, auto open
  useEffect(() => {
    if (externalOpenTrigger && externalOpenTrigger > 0) {
      setIsOpen(true);
    }
  }, [externalOpenTrigger]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({behavior: 'smooth'});
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      inputRef.current?.focus();
    }
  }, [isOpen, messages, loading]);

  const latestVital = patientContext?.vitals && patientContext.vitals.length > 0
    ? patientContext.vitals[patientContext.vitals.length - 1]
    : null;

  const dynamicPrompts = patientContext?.name
    ? [
        `قيّم حالة ${patientContext.name} بناءً على آخر قراءة ضغط (${latestVital ? `${latestVital.systolic}/${latestVital.diastolic}` : 'المسجلة'}) وسجل أدويته`,
        `هل توجد أي تعارضات دوائية في أدوية ${patientContext.name} الحالية؟`,
        `ما هو التعديل العلاجي المقترح لضبط ضغط دم ${patientContext.name} وخفض الخطورة؟`,
        `ما هي الفحوصات والتحاليل الدورية القادمة الموصى بها لحالته؟`
      ]
    : GENERAL_PROMPTS;

  const handleSendMessage = async (textToSend?: string) => {
    const messageContent = (textToSend ?? input).trim();
    if (!messageContent || loading) return;

    const time = new Date().toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
    const newMessages: ChatMessage[] = [
      ...messages,
      {role: 'user', text: messageContent, time}
    ];

    setMessages(newMessages);
    if (!textToSend) setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          history: newMessages.map(m => ({
            role: m.role,
            parts: [{text: m.text}]
          })),
          message: messageContent,
          patientContext: patientContext ? {
            id: patientContext.id,
            name: patientContext.name,
            dob: patientContext.dob,
            age: patientContext.age,
            diagnosis: patientContext.diagnosis,
            riskTier: patientContext.riskTier,
            status: patientContext.status,
            vitals: patientContext.vitals?.slice(-7) || [],
            medications: patientContext.medications || [],
            labs: patientContext.labs,
            echo: patientContext.echo
          } : undefined
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();
      const replyTime = new Date().toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
      setMessages([
        ...newMessages,
        {role: 'model', text: data.response || 'تم استلام الاستشارة ولكن لم يتم إنشاء نص.', time: replyTime}
      ]);
    } catch (e) {
      setMessages([
        ...newMessages,
        {
          role: 'model',
          text: '⚠️ تعذر الاتصال بمحرك الذكاء الاصطناعي السريري. يرجى التحقق من الخادم وإعادة المحاولة.',
          time: new Date().toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const clearChat = () => {
    setMessages([]);
  };

  return (
    <>
      {/* Floating Chat Drawer Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-4 sm:right-6 z-50 w-[94vw] sm:w-[460px] h-[600px] max-h-[85vh] bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200 font-sans">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 text-white p-4 flex items-center justify-between select-none shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-xs flex items-center justify-center text-white border border-white/20 shadow-inner">
                <Sparkles size={20} className="text-amber-300 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm tracking-wide">Cardios AI Clinical Assistant</h3>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-emerald-300/40 animate-ping" />
                </div>
                <p className="text-[11px] text-blue-100/90 flex items-center gap-1 font-normal">
                  مساعد طبيب القلب • إرشادات ESC & AHA السريرية
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button
                  onClick={clearChat}
                  title="مسح المحادثة"
                  className="p-1.5 text-blue-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                >
                  <RotateCcw size={16} />
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                title="تصغير المساعد"
                className="p-1.5 text-blue-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <ChevronDown size={20} />
              </button>
            </div>
          </div>

          {/* Active Patient Context Clinical Banner */}
          {patientContext?.name ? (
            <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 border-b border-emerald-200/80 px-4 py-2.5 flex items-center justify-between text-xs text-emerald-950" dir="rtl">
              <div className="flex items-center gap-2 truncate">
                <UserCheck size={16} className="text-emerald-700 shrink-0" />
                <div className="truncate">
                  <div className="font-bold text-emerald-900 truncate">
                    ملف نشط: {patientContext.name}
                  </div>
                  <div className="text-[11px] text-emerald-700 flex items-center gap-2 mt-0.5">
                    {latestVital && (
                      <span className="font-mono font-semibold">
                        آخر ضغط: {latestVital.systolic}/{latestVital.diastolic}
                      </span>
                    )}
                    {patientContext.ef && (
                      <span>• كفاءة القلب: {patientContext.ef}%</span>
                    )}
                    {patientContext.medications && (
                      <span>• {patientContext.medications.length} أدوية</span>
                    )}
                  </div>
                </div>
              </div>
              <span className="text-[10px] bg-emerald-200/80 text-emerald-900 font-bold px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1">
                <ShieldCheck size={12} className="text-emerald-700" />
                ملم بالحالة
              </span>
            </div>
          ) : (
            <div className="bg-slate-100 border-b border-slate-200 px-4 py-2 text-xs text-slate-600 flex items-center justify-between" dir="rtl">
              <span className="flex items-center gap-1.5">
                <Stethoscope size={14} className="text-blue-600" />
                استشارة عامة في أمراض القلب والبروتوكولات السريرية
              </span>
            </div>
          )}

          {/* Conversation Thread */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/60" dir="rtl">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col justify-center text-center p-2">
                <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-blue-100/80 text-blue-600 flex items-center justify-center shadow-xs border border-blue-200/60">
                  <HeartPulse size={28} className="text-blue-600 animate-pulse" />
                </div>
                <h4 className="font-bold text-slate-800 text-base mb-1">
                  {patientContext?.name ? `استشارة سريرية فورية لـ ${patientContext.name}` : 'استشارة الذكاء الاصطناعي السريرية'}
                </h4>
                <p className="text-xs text-slate-500 mb-4 max-w-sm mx-auto leading-relaxed">
                  {patientContext?.name
                    ? 'الذكاء الاصطناعي ملم ببيانات المريض الحالية (تاريخ الضغط، الأدوية، والتشخيص). يمكنك سؤاله مباشرة دون إعادة شرح الحالة.'
                    : 'اسأل عن بروتوكولات القلب، التعارضات الدوائية، وإرشادات علاج قصور الشرايين وارتفاع الضغط.'}
                </p>

                <div className="space-y-2 text-right">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">
                    أسئلة مقترحة للحالة:
                  </p>
                  {dynamicPrompts.map((prompt, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(prompt)}
                      className="w-full text-right text-xs bg-white border border-slate-200 hover:border-blue-400 hover:bg-blue-50/70 p-3 rounded-2xl text-slate-700 transition-all duration-150 flex items-center justify-between group shadow-xs active:scale-99"
                    >
                      <span className="truncate pl-2 leading-relaxed font-medium">{prompt}</span>
                      <Send size={13} className="text-slate-400 group-hover:text-blue-600 shrink-0 transform -scale-x-100" />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((m, i) => (
                <div
                  key={i}
                  className={`flex flex-col ${
                    m.role === 'user' ? 'items-start' : 'items-end'
                  }`}
                >
                  <div
                    className={`p-3.5 rounded-2xl text-xs sm:text-sm max-w-[90%] leading-relaxed ${
                      m.role === 'user'
                        ? 'bg-blue-600 text-white rounded-tl-xs shadow-xs text-right'
                        : 'bg-white border border-slate-200 text-slate-800 rounded-tr-xs shadow-xs text-right'
                    }`}
                  >
                    {m.role === 'model' && (
                      <div className="flex items-center justify-between gap-2 text-[11px] font-bold text-indigo-700 mb-2 pb-1.5 border-b border-slate-100">
                        <div className="flex items-center gap-1.5">
                          <Bot size={14} className="text-indigo-600" />
                          <span>Cardios AI Clinical Advice</span>
                        </div>
                        <button
                          onClick={() => handleCopy(m.text, i)}
                          title="نسخ التوصية للسجل الطبي"
                          className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-indigo-600 px-1.5 py-0.5 rounded-md hover:bg-slate-100 transition-colors"
                        >
                          {copiedIndex === i ? (
                            <>
                              <Check size={12} className="text-emerald-600" />
                              <span className="text-emerald-600">تم النسخ</span>
                            </>
                          ) : (
                            <>
                              <Copy size={12} />
                              <span>نسخ للسجل</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                    <div className="whitespace-pre-wrap font-sans">{m.text}</div>
                  </div>
                  {m.time && (
                    <span className="text-[10px] text-slate-400 mt-1 px-1 font-mono">
                      {m.time}
                    </span>
                  )}
                </div>
              ))
            )}

            {loading && (
              <div className="flex items-center gap-2.5 p-3.5 bg-white border border-slate-200 rounded-2xl rounded-tr-xs w-fit text-xs text-slate-600 shadow-xs">
                <Sparkles size={16} className="text-blue-600 animate-spin" />
                <span>Cardios AI يقوم بتحليل سجل المريض وفق إرشادات القلب...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Footer */}
          <div className="p-3 bg-white border-t border-slate-200" dir="rtl">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={loading}
                className="flex-1 px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all disabled:opacity-60 text-right"
                placeholder={patientContext?.name ? `اسأل عن علاج أو خطة ${patientContext.name}...` : "اسأل عن إرشادات علاج القلب، الجرعات، والتعارضات..."}
              />
              <button
                onClick={() => handleSendMessage()}
                disabled={!input.trim() || loading}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-40 text-white p-2.5 rounded-xl shadow-xs transition-all active:scale-95 flex items-center justify-center shrink-0"
                title="إرسال السؤال"
              >
                <Send size={16} className="transform -scale-x-100" />
              </button>
            </div>
            <p className="text-[10px] text-slate-400 text-center mt-2">
              مساعد طبيب القلب الذكي • داعم للقرار السريري وفق أحدث المعايير الطبية
            </p>
          </div>
        </div>
      )}

      {/* Floating Action Button (FAB) */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-2.5 px-4.5 py-3.5 rounded-full shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95 text-white ${
            isOpen
              ? 'bg-slate-900 hover:bg-black ring-4 ring-slate-300/50'
              : patientContext?.name
                ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-blue-700 hover:from-emerald-700 hover:to-blue-800 ring-4 ring-emerald-400/40 shadow-emerald-500/30'
                : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 ring-4 ring-blue-400/30 shadow-blue-500/30'
          }`}
          title={isOpen ? 'إغلاق مساعد الذكاء الاصطناعي' : 'فتح مساعد القلب الذكي'}
          aria-label="Cardiology AI Assistant"
        >
          {isOpen ? (
            <>
              <X size={20} className="text-white" />
              <span className="text-xs font-bold tracking-wide hidden sm:inline">إغلاق</span>
            </>
          ) : (
            <>
              <div className="relative">
                <Sparkles size={20} className="text-amber-300 animate-pulse" />
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-blue-600 animate-ping" />
              </div>
              <span className="text-xs font-bold tracking-wide">
                {patientContext?.name ? `AI: ${patientContext.name}` : 'مساعد القلب الذكي (AI)'}
              </span>
            </>
          )}
        </button>
      </div>
    </>
  );
}
