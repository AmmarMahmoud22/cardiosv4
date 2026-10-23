import React from 'react';
import {
  Activity,
  FileText,
  ClipboardList,
  Stethoscope,
  CheckCircle,
  CheckCircle2,
  X,
  Sparkles,
  QrCode,
  HeartPulse,
  ShieldCheck,
  Phone,
  ArrowRight,
  TrendingUp,
  Cpu,
  Lock
} from 'lucide-react';

const CLINIC_HOTLINE = '01146963589';

export default function LandingPage({onLaunch}: {onLaunch: () => void}) {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans selection:bg-blue-600 selection:text-white" dir="rtl">
      {/* Top Navbar */}
      <nav className="p-4 sm:p-6 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-emerald-500 flex items-center justify-center text-white shadow-lg">
              <Stethoscope size={22} />
            </div>
            <div>
              <span className="text-xl font-black tracking-tight text-white">Cardios</span>
              <span className="text-[10px] text-blue-400 block font-mono">Cardiology EHR & RPM</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 text-xs text-slate-300 bg-slate-800/80 px-3.5 py-1.5 rounded-full border border-slate-700">
              <Phone size={13} className="text-emerald-400" />
              <span>خط العيادة المعتمد:</span>
              <strong className="text-white font-mono">{CLINIC_HOTLINE}</strong>
            </div>

            <button
              onClick={onLaunch}
              className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 text-white px-5 py-2.5 rounded-2xl font-bold text-xs sm:text-sm shadow-lg shadow-blue-600/30 transition-all active:scale-95 flex items-center gap-2"
            >
              <span>دخول لوحة تحكم الطبيب</span>
              <ArrowRight size={16} className="transform -scale-x-100" />
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="relative pt-16 pb-24 px-4 sm:px-6 overflow-hidden">
        {/* Glow ambient background */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-blue-600/15 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute top-1/3 right-1/4 w-[400px] h-[300px] bg-emerald-500/10 blur-[100px] rounded-full pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-950/80 border border-blue-500/30 text-blue-300 text-xs font-semibold mb-6 shadow-inner">
            <Sparkles size={14} className="text-amber-400 animate-pulse" />
            <span>مدعوم بمساعد القلب الذكي Gemini والربط التلقائي بالهواتف المحمولة</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-tight mb-6">
            منظومة إدارة عيادات القلب <br />
            <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-emerald-400 bg-clip-text text-transparent">
              والمتابعة السريرية الذكية في مصر
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-300 mb-10 max-w-3xl mx-auto leading-relaxed">
            المنصة الأولى المتخصصة لأطباء القلب: تجمع بين السجل الطبي السريري (EHR)، مراقبة ضغط الدم ونبض المريض عن بعد (RPM)، والروشتة الذكية المتزامنة مع هاتف المريض عبر كارت QR الآمن.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={onLaunch}
              className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 text-white px-8 py-4 rounded-2xl font-bold text-sm sm:text-base shadow-xl shadow-blue-500/25 transition-all hover:scale-105 active:scale-95 flex items-center gap-2.5"
            >
              <Stethoscope size={18} />
              <span>بدء تجربة لوحة طبيب القلب (EHR Demo)</span>
            </button>
            <a
              href="?portal=true&patientId=1"
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-6 py-4 rounded-2xl font-bold text-sm sm:text-base transition-all hover:border-slate-500 flex items-center gap-2"
            >
              <QrCode size={18} className="text-emerald-400" />
              <span>تجربة مسح كارت المريض (QR Portal)</span>
            </a>
          </div>

          {/* Quick Stats Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-16 max-w-4xl mx-auto text-right">
            <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-4">
              <span className="text-xs text-slate-400 block mb-1">الالتزام ببروتوكولات القلب</span>
              <span className="text-2xl font-black text-white font-mono">100%</span>
              <span className="text-[11px] text-emerald-400 block mt-0.5">ESC & AHA Guidelines</span>
            </div>
            <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-4">
              <span className="text-xs text-slate-400 block mb-1">سرعة تحليل الذكاء الاصطناعي</span>
              <span className="text-2xl font-black text-white font-mono">&lt; 2s</span>
              <span className="text-[11px] text-blue-400 block mt-0.5">Gemini Clinical Engine</span>
            </div>
            <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-4">
              <span className="text-xs text-slate-400 block mb-1">خصوصية بيانات المرضى</span>
              <span className="text-2xl font-black text-white font-mono">عزل تام</span>
              <span className="text-[11px] text-emerald-400 block mt-0.5">Tokenized QR Access</span>
            </div>
            <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-4">
              <span className="text-xs text-slate-400 block mb-1">مزامنة الروشتة والأدوية</span>
              <span className="text-2xl font-black text-white font-mono">لحظية</span>
              <span className="text-[11px] text-purple-400 block mt-0.5">Real-time Cloud Sync</span>
            </div>
          </div>
        </div>
      </header>

      {/* Feature Showcase Grid */}
      <section className="py-20 bg-slate-950 border-t border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-black text-white mb-3">
              مميزات صممت خصيصاً لاحتياجات طبيب القلب المصري
            </h2>
            <p className="text-slate-400 text-sm">
              تجربة سريرية متكاملة تضمن دقة التشخيص، سلامة الجرعات، وتواصل مباشر مع المريض في الطوارئ.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1 */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 hover:border-blue-500/50 transition-all group">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-5 border border-blue-500/20 group-hover:scale-110 transition-transform">
                <HeartPulse size={24} />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">متابعة الضغط والنبض عن بعد (RPM)</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                يسجل المريض قياساته من المنزل عبر هاتفه، وتظهر مباشرة في مخطط بياني ملون للطبيب مع تنبيهات فورية عند تخطي حاجز 140/90 mmHg.
              </p>
            </div>

            {/* Card 2 */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 hover:border-emerald-500/50 transition-all group">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-5 border border-emerald-500/20 group-hover:scale-110 transition-transform">
                <FileText size={24} />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">الروشتة الذكية ومزامنة الهاتف</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                قائمة جاهزة بأشهر أدوية القلب في مصر (Concor, Lipitor, Tareg, Eliquis) مع مزامنة لحظية في تطبيق المريض بمجرد مسح كارت QR.
              </p>
            </div>

            {/* Card 3 */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 hover:border-purple-500/50 transition-all group">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center mb-5 border border-purple-500/20 group-hover:scale-110 transition-transform">
                <Sparkles size={24} />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">مساعد القلب السريري Gemini</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                زر عائم في كل ملف مريض ملم ببياناته الحالية (الضغط، الأدوية، والتشخيص) يقدم توصيات فورية ويفحص تعارضات الأدوية دون إعادة الشرح.
              </p>
            </div>

            {/* Card 4 */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 hover:border-amber-500/50 transition-all group">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mb-5 border border-amber-500/20 group-hover:scale-110 transition-transform">
                <ClipboardList size={24} />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">تقارير الإيكو ورسم القلب (ECG)</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                نماذج تقارير إيكو جاهزة وقابلة للطباعة مع قياسات كفاءة البطين الأيسر (EF%) والصمامات، وحساب مؤشرات خطورة الجلطات.
              </p>
            </div>

            {/* Card 5 */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 hover:border-red-500/50 transition-all group">
              <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-400 flex items-center justify-center mb-5 border border-red-500/20 group-hover:scale-110 transition-transform">
                <Phone size={24} />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">تواصل مباشر في الطوارئ</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                شات مباشر بين الطبيب والمريض ورقم هاتف العيادة الموحد ({CLINIC_HOTLINE}) متاح على كارت المريض وبوابته الذكية.
              </p>
            </div>

            {/* Card 6 */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 hover:border-teal-500/50 transition-all group">
              <div className="w-12 h-12 rounded-2xl bg-teal-500/10 text-teal-400 flex items-center justify-center mb-5 border border-teal-500/20 group-hover:scale-110 transition-transform">
                <ShieldCheck size={24} />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">أمان وعزل كامل للمريض</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                بوابة المريض معزولة تماماً برمز أمان مشفر؛ لا يمكن للمريض بأي شكل رؤية بيانات المرضى الآخرين أو الدخول للوحة الطبيب.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison Table Section */}
      <section className="py-20 bg-slate-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl sm:text-3xl font-black text-white text-center mb-10">
            مقارنة Cardios بالحلول الطبية العامة
          </h2>

          <div className="bg-slate-800/80 border border-slate-700 rounded-3xl overflow-hidden shadow-2xl">
            <table className="w-full text-right text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-800 border-b border-slate-700 text-slate-300">
                  <th className="p-4 sm:p-5">المعيار والميزة السريرية</th>
                  <th className="p-4 sm:p-5 text-center text-blue-400 font-bold">منظومة Cardios</th>
                  <th className="p-4 sm:p-5 text-center text-slate-400">البرامج العامة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/60">
                {[
                  {f: 'سجل إلكتروني مخصص لأمراض القلب (EHR)', c: true, a: false},
                  {f: 'مراقبة منزلية للضغط والنبض عن بعد (RPM)', c: true, a: false},
                  {f: 'روشتة ذكية تتزامن تلقائياً مع هاتف المريض', c: true, a: false},
                  {f: 'مساعد ذكاء اصطناعي ملم بحالة المريض والتعارضات', c: true, a: false},
                  {f: 'كارت مريض ذكي برمز QR مشفر ومعزول الأمان', c: true, a: false},
                  {f: 'تقارير إيكو متوافقة مع الجمعية الأوروبية للقلب', c: true, a: false},
                  {f: 'دعم كامل للغة العربية والمصطلحات الدوائية بمصر', c: true, a: true},
                ].map((row, i) => (
                  <tr key={i} className="hover:bg-slate-700/30 transition-colors">
                    <td className="p-4 sm:p-5 font-medium text-slate-200">{row.f}</td>
                    <td className="p-4 sm:p-5 text-center">
                      {row.c ? (
                        <CheckCircle2 className="text-emerald-400 mx-auto w-5 h-5" />
                      ) : (
                        <X className="text-red-400 mx-auto w-5 h-5" />
                      )}
                    </td>
                    <td className="p-4 sm:p-5 text-center">
                      {row.a ? (
                        <CheckCircle2 className="text-emerald-400 mx-auto w-5 h-5" />
                      ) : (
                        <X className="text-slate-500 mx-auto w-5 h-5" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <footer className="py-12 px-4 sm:px-6 border-t border-slate-800 text-center text-xs text-slate-400 bg-slate-950">
        <p className="mb-3 text-slate-300 font-bold">
          منظومة Cardios • عيادة القلب والأوعية الدموية والقسطرة
        </p>
        <p className="font-mono">خط الطوارئ والاستعلام: {CLINIC_HOTLINE}</p>
        <p className="mt-4 text-slate-500 text-[11px]">
          Designed for modern cardiology practices in Egypt • Compliant with ESC & AHA 2024 protocols
        </p>
      </footer>
    </div>
  );
}
