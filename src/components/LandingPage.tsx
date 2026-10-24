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
  Lock,
  FlaskConical,
  User,
  LogIn,
  Users
} from 'lucide-react';

export default function LandingPage({
  onLaunch,
  onOpenLabPortal,
  onOpenPatientPortal,
  onOpenAuthModal
}: {
  onLaunch: () => void;
  onOpenLabPortal?: () => void;
  onOpenPatientPortal?: (patientId?: string) => void;
  onOpenAuthModal?: (role?: 'doctor' | 'lab' | 'patient') => void;
}) {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans selection:bg-blue-600 selection:text-white" dir="rtl">
      {/* Top Navbar */}
      <nav className="p-4 sm:p-6 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-emerald-500 p-0.5 flex items-center justify-center text-white shadow-lg">
              <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center">
                <HeartPulse size={22} className="text-emerald-400" />
              </div>
            </div>
            <div>
              <span className="text-xl font-black tracking-tight text-white flex items-center gap-2">
                منظومة Cardios
                <span className="text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-full font-mono">
                  EHR & Labs
                </span>
              </span>
              <span className="text-[10px] text-slate-400 block font-mono">منصة الرعاية القلبية والتشخيصية المتكاملة</span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Patient File Direct Access */}
            <button
              onClick={() => {
                if (onOpenAuthModal) onOpenAuthModal('patient');
                else if (onOpenPatientPortal) onOpenPatientPortal('1');
              }}
              className="bg-slate-800 hover:bg-slate-700 text-emerald-300 hover:text-white border border-emerald-500/40 px-3.5 py-2.5 rounded-2xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2"
              title="دخول المريض برقم الملف أو كارت المتابعة"
            >
              <QrCode size={15} className="text-emerald-400" />
              <span>دخول المريض</span>
            </button>

            {/* Lab Portal Entrance */}
            {onOpenLabPortal && (
              <button
                onClick={onOpenLabPortal}
                className="bg-slate-800 hover:bg-slate-700 text-teal-300 border border-teal-500/40 hover:border-teal-400 px-3.5 py-2.5 rounded-2xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2"
              >
                <FlaskConical size={16} className="text-teal-400" />
                <span className="hidden sm:inline">بوابة المعامل</span>
                <span className="sm:hidden">المعمل</span>
              </button>
            )}

            {/* Doctor Entrance */}
            <button
              onClick={onLaunch}
              className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 text-white px-4 sm:px-5 py-2.5 rounded-2xl font-bold text-xs sm:text-sm shadow-lg shadow-blue-600/30 transition-all active:scale-95 flex items-center gap-2"
            >
              <Stethoscope size={16} />
              <span>لوحة الأطباء</span>
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
            <span>منظومة موحدة تربط الطبيب ومعامل التحاليل بملف المريض الذكي</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-tight mb-6">
            منصة Cardios السريرية <br />
            <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-emerald-400 bg-clip-text text-transparent">
              لإدارة عيادات القلب والربط التشخيصي المباشر
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-300 mb-10 max-w-3xl mx-auto leading-relaxed">
            منظومة سحابية متقدمة تدمج السجل الطبي السريري للقلب (EHR)، استقبال ورفع نتائج التحاليل من المعامل الطبية فوراً، ومتابعة قراءات ضغط الدم والنبض للمريض عن بعد عبر كارت المتابعة الذكي.
          </p>

          {/* 3 Main Portals Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto text-right mb-12">
            {/* 1. Doctor Portal Card */}
            <div className="bg-slate-900/90 border border-blue-500/30 hover:border-blue-500 rounded-3xl p-6 transition-all shadow-xl group">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-4 border border-blue-500/20 group-hover:scale-110 transition-transform">
                <Stethoscope size={24} />
              </div>
              <h3 className="text-lg font-bold text-white mb-1.5">بوابة الأطباء والعيادات</h3>
              <p className="text-xs text-slate-400 leading-relaxed mb-5">
                سجل طبي سريري شامل (EHR)، فتح ملفات المرضى وتوثيق السجل القلبي، كتابة الروشتات الذكية ومتابعة الضغط والنبض.
              </p>
              <button
                onClick={onLaunch}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-md"
              >
                <span>دخول لوحة الطبيب (EHR)</span>
                <ArrowRight size={15} className="transform -scale-x-100" />
              </button>
            </div>

            {/* 2. Laboratory Portal Card */}
            <div className="bg-slate-900/90 border border-teal-500/30 hover:border-teal-500 rounded-3xl p-6 transition-all shadow-xl group">
              <div className="w-12 h-12 rounded-2xl bg-teal-500/10 text-teal-400 flex items-center justify-center mb-4 border border-teal-500/20 group-hover:scale-110 transition-transform">
                <FlaskConical size={24} />
              </div>
              <h3 className="text-lg font-bold text-white mb-1.5">بوابة معامل التحاليل</h3>
              <p className="text-xs text-slate-400 leading-relaxed mb-5">
                استقبال طلبات الفحوصات من الأطباء، رفع واعتماد نتائج التحاليل الطبية وإرفاق التقارير وتنبيه الطبيب فوراً.
              </p>
              <button
                onClick={onOpenLabPortal}
                className="w-full py-3 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-md"
              >
                <span>دخول بوابة المعمل</span>
                <ArrowRight size={15} className="transform -scale-x-100" />
              </button>
            </div>

            {/* 3. Patient Portal Card */}
            <div className="bg-slate-900/90 border border-emerald-500/30 hover:border-emerald-500 rounded-3xl p-6 transition-all shadow-xl group">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4 border border-emerald-500/20 group-hover:scale-110 transition-transform">
                <QrCode size={24} />
              </div>
              <h3 className="text-lg font-bold text-white mb-1.5">بوابة المريض الذكية</h3>
              <p className="text-xs text-slate-400 leading-relaxed mb-5">
                دخول فوري برقم الملف أو كارت QR المسلم من الطبيب دون الحاجة لإنشاء حساب؛ لمتابعة الضغط والروشتات والتحاليل.
              </p>
              <button
                onClick={() => {
                  if (onOpenAuthModal) onOpenAuthModal('patient');
                  else if (onOpenPatientPortal) onOpenPatientPortal('1');
                }}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-md"
              >
                <span>دخول المريض برقم الملف / QR</span>
                <ArrowRight size={15} className="transform -scale-x-100" />
              </button>
            </div>
          </div>

          {/* Quick Demo QR Direct Link */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <a
              href="?portal=true&patientId=1"
              className="bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 px-5 py-3 rounded-2xl font-bold text-xs transition-all hover:border-slate-500 flex items-center gap-2"
            >
              <QrCode size={16} className="text-emerald-400" />
              <span>تجربة مسح كارت المريض المعتمد (#1 أحمد حسن)</span>
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
              <span className="text-[11px] text-emerald-400 block mt-0.5">قانون 151 لسنة 2020</span>
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
              منظومة سريرية متكاملة تخدم أطراف الرعاية الصحية
            </h2>
            <p className="text-slate-400 text-sm">
              تجربة سريرية تجمع بين دقة تشخيص طبيب القلب، كفاءة معمل التحاليل، وراحة المريض في بيته.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 hover:border-blue-500/50 transition-all group">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-5 border border-blue-500/20 group-hover:scale-110 transition-transform">
                <HeartPulse size={24} />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">متابعة الضغط والنبض عن بعد (RPM)</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                يسجل المريض قياساته من المنزل عبر هاتفه، وتظهر مباشرة في مخطط بياني ملون للطبيب مع تنبيهات فورية عند تخطي حاجز 140/90 mmHg.
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 hover:border-teal-500/50 transition-all group">
              <div className="w-12 h-12 rounded-2xl bg-teal-500/10 text-teal-400 flex items-center justify-center mb-5 border border-teal-500/20 group-hover:scale-110 transition-transform">
                <FlaskConical size={24} />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">الربط المباشر مع معامل التحاليل</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                يصل طلب الفحص للمعمل، ويقوم فني المعمل بإدخال النتائج ومقارنتها بالحدود المرجعية مع إشعار فوري لطبيب القلب.
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 hover:border-purple-500/50 transition-all group">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center mb-5 border border-purple-500/20 group-hover:scale-110 transition-transform">
                <Sparkles size={24} />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">مساعد القلب السريري Gemini</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                مساعد سريري ذكي ملم ببيانات المريض (الضغط، الأدوية، والتشخيص) يقدم توصيات فورية ويفحص تعارضات الأدوية دون إعادة الشرح.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-slate-950 border-t border-slate-900 text-center text-xs text-slate-500">
        <p>© 2026 منظومة Cardios للرعاية القلبية والتشخيصية - جميع الحقوق محفوظة</p>
        <p className="text-[11px] text-slate-600 mt-1">مشفرة ومحمية وفق معايير قانون حماية البيانات الشخصية رقم 151 لسنة 2020</p>
      </footer>
    </div>
  );
}
