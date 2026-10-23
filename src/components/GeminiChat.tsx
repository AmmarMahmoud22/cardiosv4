import React, {useState, useRef, useEffect} from 'react';
import {Sparkles, X, Send, RotateCcw, ChevronDown, Bot, HeartPulse, UserCheck, ShieldAlert} from 'lucide-react';

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  time?: string;
}

export interface PatientContext {
  id?: string;
  name: string;
  dob?: string;
  status?: string;
  vitals?: any[];
  medications?: any[];
}

interface Props {
  patientContext?: PatientContext;
}

const GENERAL_PROMPTS = [
  'Hypertension Stage 2 guideline recommendations',
  'Statin & Beta-blocker combination precautions',
  'Management of HFrEF (EF < 40%) first-line drugs',
  'Atrial Fibrillation rate vs rhythm control criteria'
];

export default function GeminiChat({patientContext}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
        `قيّم حالة المريض (${patientContext.name}) بناءً على آخر قراءة ضغط وسجل أدويته`,
        `هل توجد أي تحذيرات أو تعارضات دوائية في أدوية ${patientContext.name}؟`,
        `ما هو التعديل العلاجي المقترح لضبط ضغط ${patientContext.name} الحالي؟`,
        `ما هي الفحوصات الدورية أو التحاليل القادمة الموصى بها لحالته؟`
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
            name: patientContext.name,
            dob: patientContext.dob,
            status: patientContext.status,
            vitals: patientContext.vitals?.slice(-5) || [],
            medications: patientContext.medications || []
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
        {role: 'model', text: data.response || 'No response generated.', time: replyTime}
      ]);
    } catch (e) {
      setMessages([
        ...newMessages,
        {
          role: 'model',
          text: '⚠️ Unable to connect to the Cardiology AI service. Please ensure the server is active.',
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

  const clearChat = () => {
    setMessages([]);
  };

  return (
    <>
      {/* Floating Chat Drawer Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-4 sm:right-6 z-50 w-[92vw] sm:w-[430px] h-[560px] max-h-[82vh] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white p-3.5 flex items-center justify-between select-none">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-white/15 backdrop-blur-xs flex items-center justify-center text-white border border-white/20">
                <Sparkles size={18} className="text-amber-300 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-sm tracking-wide">Cardios AI Assistant</h3>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                </div>
                <p className="text-[11px] text-blue-100/90 flex items-center gap-1 font-normal">
                  Clinical Guidelines & Triage Support
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button
                  onClick={clearChat}
                  title="Clear chat history"
                  className="p-1.5 text-blue-100 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                >
                  <RotateCcw size={16} />
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                title="Minimize assistant"
                className="p-1.5 text-blue-100 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <ChevronDown size={18} />
              </button>
            </div>
          </div>

          {/* Active Patient Context Banner (if inside patient profile) */}
          {patientContext?.name && (
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-200/80 px-3.5 py-2 flex items-center justify-between text-xs text-emerald-950">
              <div className="flex items-center gap-2 truncate">
                <UserCheck size={15} className="text-emerald-700 shrink-0" />
                <span className="truncate">
                  ملف نشط: <strong className="font-bold text-emerald-900">{patientContext.name}</strong>
                  {latestVital && (
                    <span className="text-[11px] text-emerald-700 ml-1">
                      (آخر ضغط: {latestVital.systolic}/{latestVital.diastolic})
                    </span>
                  )}
                </span>
              </div>
              <span className="text-[10px] bg-emerald-200/60 text-emerald-800 font-bold px-2 py-0.5 rounded-full shrink-0">
                AI ملم بالحالة
              </span>
            </div>
          )}

          {/* Conversation Thread */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/50">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col justify-center text-center p-3">
                <div className="w-12 h-12 mx-auto mb-2.5 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center shadow-xs">
                  <HeartPulse size={26} className="text-blue-600" />
                </div>
                <h4 className="font-bold text-gray-800 text-base mb-1">
                  {patientContext?.name ? `استشارة سريرية لـ ${patientContext.name}` : 'Cardiology Decision Support'}
                </h4>
                <p className="text-xs text-gray-500 mb-4 max-w-xs mx-auto leading-relaxed">
                  {patientContext?.name
                    ? 'المساعد ملم ببيانات المريض الحالية (الضغط، النبض، والأدوية). اسأل مباشرة دون الحاجة لشرح الحالة.'
                    : 'Ask clinical questions, review drug interactions, or get protocol summaries in real-time.'}
                </p>

                <div className="space-y-1.5 text-right" dir="rtl">
                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1 px-1">
                    أسئلة مقترحة للحالة:
                  </p>
                  {dynamicPrompts.map((prompt, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(prompt)}
                      className="w-full text-right text-xs bg-white border border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 p-2.5 rounded-xl text-gray-700 transition-all duration-150 flex items-center justify-between group shadow-2xs"
                    >
                      <span className="truncate pl-2">{prompt}</span>
                      <Send size={12} className="text-gray-400 group-hover:text-blue-600 shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((m, i) => (
                <div
                  key={i}
                  className={`flex flex-col ${
                    m.role === 'user' ? 'items-end' : 'items-start'
                  }`}
                >
                  <div
                    className={`p-3 rounded-2xl text-xs sm:text-sm max-w-[85%] leading-relaxed ${
                      m.role === 'user'
                        ? 'bg-blue-600 text-white rounded-tr-xs shadow-xs'
                        : 'bg-white border border-gray-200 text-gray-800 rounded-tl-xs shadow-2xs'
                    }`}
                  >
                    {m.role === 'model' && (
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-indigo-600 mb-1 pb-1 border-b border-gray-100">
                        <Bot size={13} />
                        <span>Cardios AI Assistant</span>
                      </div>
                    )}
                    <div className="whitespace-pre-wrap">{m.text}</div>
                  </div>
                  {m.time && (
                    <span className="text-[10px] text-gray-400 mt-1 px-1">
                      {m.time}
                    </span>
                  )}
                </div>
              ))
            )}

            {loading && (
              <div className="flex items-center gap-2 p-3 bg-white border border-gray-200 rounded-2xl rounded-tl-xs w-fit text-xs text-gray-500 shadow-2xs">
                <Sparkles size={14} className="text-blue-600 animate-spin" />
                <span>Cardios AI is analyzing patient record...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Footer */}
          <div className="p-3 bg-white border-t border-gray-200">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={loading}
                className="flex-1 px-3.5 py-2 text-sm bg-gray-50 border border-gray-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all disabled:opacity-60"
                placeholder={patientContext?.name ? `اسأل عن خطة علاج ${patientContext.name}...` : "Ask about guidelines, dosages..."}
              />
              <button
                onClick={() => handleSendMessage()}
                disabled={!input.trim() || loading}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-40 text-white p-2.5 rounded-xl shadow-xs transition-all active:scale-95 flex items-center justify-center shrink-0"
                title="Send message"
              >
                <Send size={16} />
              </button>
            </div>
            <p className="text-[10px] text-gray-400 text-center mt-2">
              Cardiology AI support • Verify with official clinical protocols
            </p>
          </div>
        </div>
      )}

      {/* Floating Action Button (FAB) */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-2.5 px-4 py-3.5 rounded-full shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95 text-white ${
            isOpen
              ? 'bg-gray-800 hover:bg-gray-900 ring-4 ring-gray-300/50'
              : patientContext?.name
                ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-blue-700 hover:from-emerald-700 hover:to-blue-800 ring-4 ring-emerald-400/40 shadow-emerald-500/30'
                : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 ring-4 ring-blue-400/30 shadow-blue-500/30'
          }`}
          title={isOpen ? 'Close AI Assistant' : 'Open Cardiology AI Assistant'}
          aria-label="Cardiology AI Assistant"
        >
          {isOpen ? (
            <>
              <X size={20} className="text-white" />
              <span className="text-xs font-semibold tracking-wide hidden sm:inline">Close</span>
            </>
          ) : (
            <>
              <div className="relative">
                <Sparkles size={20} className="text-amber-300 animate-pulse" />
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-blue-600 animate-ping" />
              </div>
              <span className="text-xs font-semibold tracking-wide">
                {patientContext?.name ? `AI: ${patientContext.name}` : 'AI Assistant'}
              </span>
            </>
          )}
        </button>
      </div>
    </>
  );
}
