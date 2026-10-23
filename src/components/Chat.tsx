import React, {useState, useEffect} from 'react';
import {collection, addDoc, query, orderBy, onSnapshot, where} from 'firebase/firestore';
import {db} from '../lib/firebase';
import {MessageCircle, Send, User, Stethoscope} from 'lucide-react';
import {handleFirestoreError, OperationType} from '../lib/firebase-error';

export default function Chat({patientId, patientName}: {patientId: string; patientName?: string}) {
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const q = query(
      collection(db, 'messages'),
      where('patientId', '==', patientId),
      orderBy('timestamp', 'asc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({id: doc.id, ...doc.data()})));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'messages');
    });
    return unsubscribe;
  }, [patientId]);

  const sendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!text.trim() || sending) return;

    setSending(true);
    try {
      await addDoc(collection(db, 'messages'), {
        patientId,
        patientName: patientName || 'Patient',
        sender: 'doctor',
        text: text.trim(),
        timestamp: new Date().toISOString()
      });
      setText('');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'messages');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mt-6">
      <div className="p-4 bg-gradient-to-r from-blue-900 to-indigo-900 text-white flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center">
            <MessageCircle size={18} className="text-blue-300" />
          </div>
          <div>
            <h3 className="font-bold text-sm">Direct Patient Communication</h3>
            <p className="text-[11px] text-blue-200">
              محادثة المتابعة المباشرة مع المريض {patientName ? `(${patientName})` : ''}
            </p>
          </div>
        </div>
        <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-full font-semibold">
          قناة مشفرة مع هاتف المريض
        </span>
      </div>

      <div className="h-64 overflow-y-auto p-4 space-y-3 bg-gray-50/50">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col justify-center items-center text-center text-gray-400 text-xs">
            <MessageCircle size={28} className="mb-2 text-gray-300" />
            <p>لا توجد رسائل سابقة مع المريض.</p>
            <p className="text-[11px] text-gray-400 mt-1">
              أي رسالة يرسلها المريض من هاتفه ستظهر هنا فورياً، ويمكنك الرد عليه مباشرة.
            </p>
          </div>
        ) : (
          messages.map(m => (
            <div
              key={m.id}
              className={`flex flex-col ${
                m.sender === 'doctor' ? 'items-end' : 'items-start'
              }`}
            >
              <div
                className={`p-3 rounded-2xl text-xs sm:text-sm max-w-[85%] leading-relaxed ${
                  m.sender === 'doctor'
                    ? 'bg-blue-600 text-white rounded-tr-xs shadow-xs'
                    : 'bg-white border border-gray-200 text-gray-900 rounded-tl-xs shadow-2xs'
                }`}
              >
                <div className="flex items-center gap-1.5 text-[10px] font-bold mb-1 opacity-80">
                  {m.sender === 'doctor' ? (
                    <>
                      <Stethoscope size={12} />
                      <span>أنت (طبيب القلب)</span>
                    </>
                  ) : (
                    <>
                      <User size={12} className="text-emerald-600" />
                      <span className="text-emerald-700">المريض: {m.patientName || patientName || 'Patient'}</span>
                    </>
                  )}
                </div>
                <p className="whitespace-pre-wrap">{m.text}</p>
              </div>
              {m.timestamp && (
                <span className="text-[10px] text-gray-400 mt-1 px-1">
                  {new Date(m.timestamp).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
                </span>
              )}
            </div>
          ))
        )}
      </div>

      <form onSubmit={sendMessage} className="p-3 bg-white border-t border-gray-200 flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="flex-1 text-xs p-2.5 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white"
          placeholder="اكتب ردك أو توجيهك للمريض ليظهر فوراً في هاتفه..."
        />
        <button
          type="submit"
          disabled={!text.trim() || sending}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 shrink-0"
        >
          <Send size={15} />
          <span>إرسال للمريض</span>
        </button>
      </form>
    </div>
  );
}
