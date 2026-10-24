import React, {useState} from 'react';
import {
  Activity,
  FileText,
  ClipboardList,
  Stethoscope,
  CheckCircle2,
  XCircle,
  Minus,
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
  Users,
  Pill,
  Clock,
  Check,
  Layers,
  Zap,
  Award,
  ChevronDown
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
  const [selectedFaq, setSelectedFaq] = useState<number | null>(null);

  const competitorComparison = [
    {
      feature: 'تخصص سريري مخصص لأمراض القلب والقسطرة',
      cardios: true,
      genericEhr: 'جزئي / عام',
      paperWhatsapp: false,
      note: 'حقول مخصصة للإيكو (EF%, Wall Motion)، رسم القلب، وتصنيفات خطورة القلب (ESC/AHA)'
    },
    {
      feature: 'الربط المباشر مع معامل التحاليل الطبية',
      cardios: true,
      genericEhr: false,
      paperWhatsapp: false,
      note: 'يصل طلب التحليل للمعمل ويرفع الفني النتائج لتظهر فوراً في ملف المريض'
    },
    {
      feature: 'متابعة ضغط الدم والنبض عن بُعد (RPM) من المنزل',
      cardios: true,
      genericEhr: false,
      paperWhatsapp: 'عشوائي / رسائل واتساب',
      note: 'مخططات بيانية ملونة وتنبيه فوري للطبيب عند تخطي 140/90 mmHg'
    },
    {
      feature: 'كارت المريض الذكي (Tokenized QR Card)',
      cardios: true,
      genericEhr: false,
      paperWhatsapp: false,
      note: 'دخول المريض فوري دون تعقيد إنشاء حساب أو بريد وكلمة مرور'
    },
    {
      feature: 'الروشتة الذكية والتدقيق في تعارضات أدوية القلب',
      cardios: true,
      genericEhr: 'بدون تدقيق سريري',
      paperWhatsapp: false,
      note: 'فحص تعارضات مضادات التجلط والستاتينات ومثبطات بيتا مع قائمة جاهزة للأدوية'
    },
    {
      feature: 'مساعد سريري بالذكاء الاصطناعي (Gemini AI Engine)',
      cardios: true,
      genericEhr: false,
      paperWhatsapp: false,
      note: 'تحليل فوري لتاريخ المريض والضغط والنتائج وتقديم توصيات بروتوكولية'
    },
    {
      feature: 'تشفير وحماية البيانات وفق قانون 151 لسنة 2020',
      cardios: true,
      genericEhr: 'غير معلن',
      paperWhatsapp: false,
      note: 'عزل تام لبيانات المرضى وسجلات طبية مشفرة سحابياً'
    },
    {
      feature: 'تزامن الروشتة اللحظي على هاتف المريض',
      cardios: true,
      genericEhr: false,
      paperWhatsapp: 'صور ورقية تضيع',
      note: 'جدول مواعيد الأدوية التفاعلي ومعدل الالتزام الدوائي اليومي'
    }
  ];

  const clinicalFeatures = [
    {
      icon: <Stethoscope className="w-6 h-6 text-blue-400" />,
      color: 'blue',
      title: 'السجل الطبي القلبي المتخصص (Cardiology EHR)',
      desc: 'سجل سريري مصمم خصيصاً لأطباء القلب: توثيق كفاءة العضلة (EF%)، قياسات الإيكو، رسم القلب، وقسطرة الشرايين، مع حفظ تاريخ الزيارات بشكل منظم.'
    },
    {
      icon: <FlaskConical className="w-6 h-6 text-teal-400" />,
      color: 'teal',
      title: 'بوابة معامل التحاليل المتزامنة (Lab Portal)',
      desc: 'وداعاً للأوراق ونتائج الواتساب المبعثرة؛ يرسل الطبيب طلب الفحص، ويقوم المعمل برفع النتائج والتقارير لتتزامن فوراً مع ملف المريض في أجزاء من الثانية.'
    },
    {
      icon: <HeartPulse className="w-6 h-6 text-emerald-400" />,
      color: 'emerald',
      title: 'المراقبة الحيوية عن بعد (RPM Dashboard)',
      desc: 'يسجل المريض قياسات الضغط والنبض من منزله، ويحللها النظام فورياً بمخططات بيانية وتنبيهات حرجة للطبيب عند ارتفاع الضغط لمرحلة الخطر.'
    },
    {
      icon: <Pill className="w-6 h-6 text-purple-400" />,
      color: 'purple',
      title: 'الروشتة الذكية وأمان الجرعات (Smart Rx)',
      desc: 'قاعدة بيانات بأشهر أدوية القلب في مصر (Concor, Lipitor, Tareg, Plavix, Eliquis)، مع فحص تعارضات الأدوية ومزامنة فورية على هاتف المريض.'
    },
    {
      icon: <QrCode className="w-6 h-6 text-amber-400" />,
      color: 'amber',
      title: 'كارت المتابعة المشفر (Tokenized QR Card)',
      desc: 'لا حاجة للمريض لإنشاء حساب أو بريد معقد؛ يسلمه الطبيب كارت متابعة بـ QR مشفر ليمسحه بهاتفه ويفتح ملفه الصحي وروشتته فوراً.'
    },
    {
      icon: <Sparkles className="w-6 h-6 text-rose-400" />,
      color: 'rose',
      title: 'المساعد السريري الذكي (Gemini Clinical AI)',
      desc: 'محرك ذكاء اصطناعي سريري ملم بسجل المريض، يساعد الطبيب في صياغة تقارير الإيكو، فحص الجرعات، وتلخيص الحالة الطبية المعقدة بثوانٍ.'
    }
  ];

  const faqs = [
    {
      q: 'لماذا يحتاج طبيب القلب إلى منظومة Cardios بدلاً من البرامج الطبية العامة؟',
      a: 'معظم البرامج في السوق مصممة كـ (عيادة عامة / باطنة)، بينما Cardios بُنيت من الأساس على بروتوكولات القلب العالمية (ESC & AHA)، وتحتوي على حقول دقيقة للإيكو والقسطرة ورسم القلب ومتابعة ضغط الدم اللحظية مع الربط المباشر مع معامل التحاليل.'
    },
    {
      q: 'كيف يدخل المريض إلى ملفه لمتابعة ضغطه وروشتاته؟',
      a: 'حرصاً على السلاسة وبساطة التجربة لكبار السن ومرضى القلب، لا يُطلب من المريض إنشاء حساب أو إدخال بريد إلكتروني؛ يسلمه الطبيب كارت متابعة مطبوعاً به رمز QR ورقم الملف، بمجرد مسحه بكاميرا هاتفه يفتح ملفه الطبي المشفر فوراً.'
    },
    {
      q: 'كيف يستفيد معمل التحاليل من الانضمام للمنظومة؟',
      a: 'يحصل المعمل على بوابة متطورة تستقبل طلبات الفحوصات مباشرة من عيادات القلب المعتمدة، ويسهل رفع النتائج وإشعار الطبيب فوراً، مما يعزز الثقة ويزيد من حجم الإحالات الطبية للمعمل.'
    },
    {
      q: 'هل المنظومة متوافقة مع قانون حماية البيانات الشخصية؟',
      a: 'نعم 100%، تم تصميم بنية السجلات السحابية وفق معايير قانون حماية البيانات الشخصية المصري رقم 151 لسنة 2020 بتشفير كامل للبيانات وعزل تام بين ملفات المرضى.'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans selection:bg-blue-600 selection:text-white" dir="rtl">
      {/* 1. TOP NAVBAR */}
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
                  EHR & Diagnostic
                </span>
              </span>
              <span className="text-[10px] text-slate-400 block font-mono">المنصة الطبية السريرية الموحدة</span>
            </div>
          </div>

          {/* Nav Portals Quick Switcher */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => {
                if (onOpenAuthModal) onOpenAuthModal('patient');
                else if (onOpenPatientPortal) onOpenPatientPortal('1');
              }}
              className="bg-slate-800 hover:bg-slate-700 text-emerald-300 hover:text-white border border-emerald-500/40 px-3.5 py-2.5 rounded-2xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2"
              title="دخول المريض برقم الملف أو كارت QR"
            >
              <QrCode size={15} className="text-emerald-400" />
              <span className="hidden sm:inline">دخول المريض (QR)</span>
              <span className="sm:hidden">المريض</span>
            </button>

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

      {/* 2. HERO SECTION */}
      <header className="relative pt-16 pb-20 px-4 sm:px-6 overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-blue-600/15 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute top-1/3 right-1/4 w-[400px] h-[300px] bg-emerald-500/10 blur-[100px] rounded-full pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-950/80 border border-blue-500/30 text-blue-300 text-xs font-semibold mb-6 shadow-inner">
            <Sparkles size={14} className="text-amber-400 animate-pulse" />
            <span>المنظومة الأولى في مصر لربط أطباء القلب، معامل التحاليل، ومتابعة المرضى عن بعد</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-tight mb-6">
            منظومة Cardios السريرية <br />
            <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-emerald-400 bg-clip-text text-transparent">
              لإدارة عيادات القلب والربط التشخيصي الشامل
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-300 mb-10 max-w-3xl mx-auto leading-relaxed">
            منصة متكاملة تجمع بين السجل الطبي السريري لأمراض القلب (EHR)، استقبال نتائج معامل التحاليل فورياً، ومراقبة ضغط دم المريض من بيته عبر كارت الـ QR الذكي.
          </p>

          {/* 3 Entry Gate Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-4xl mx-auto text-right mb-12">
            {/* Gate 1: Doctor */}
            <div className="bg-slate-900/90 border border-blue-500/30 hover:border-blue-400 rounded-3xl p-6 transition-all shadow-xl group">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-4 border border-blue-500/20 group-hover:scale-110 transition-transform">
                <Stethoscope size={24} />
              </div>
              <h3 className="text-lg font-bold text-white mb-1.5">بوابة أطباء القلب (EHR)</h3>
              <p className="text-xs text-slate-400 leading-relaxed mb-5">
                سجل طبي متخصص، فتح ملفات شاملة، توثيق الإيكو والقسطرة، كتابة الروشتات، ومتابعة قراءات الضغط.
              </p>
              <button
                onClick={onLaunch}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-md"
              >
                <span>دخول لوحة الطبيب</span>
                <ArrowRight size={15} className="transform -scale-x-100" />
              </button>
            </div>

            {/* Gate 2: Lab */}
            <div className="bg-slate-900/90 border border-teal-500/30 hover:border-teal-400 rounded-3xl p-6 transition-all shadow-xl group">
              <div className="w-12 h-12 rounded-2xl bg-teal-500/10 text-teal-400 flex items-center justify-center mb-4 border border-teal-500/20 group-hover:scale-110 transition-transform">
                <FlaskConical size={24} />
              </div>
              <h3 className="text-lg font-bold text-white mb-1.5">بوابة معامل التحاليل</h3>
              <p className="text-xs text-slate-400 leading-relaxed mb-5">
                استقبال طلبات الفحوصات، رفع واعتماد نتائج التحاليل، ومقارنة التطور الزمني وتنبيه الطبيب فورياً.
              </p>
              <button
                onClick={onOpenLabPortal}
                className="w-full py-3 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-md"
              >
                <span>دخول بوابة المعمل</span>
                <ArrowRight size={15} className="transform -scale-x-100" />
              </button>
            </div>

            {/* Gate 3: Patient */}
            <div className="bg-slate-900/90 border border-emerald-500/30 hover:border-emerald-400 rounded-3xl p-6 transition-all shadow-xl group">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4 border border-emerald-500/20 group-hover:scale-110 transition-transform">
                <QrCode size={24} />
              </div>
              <h3 className="text-lg font-bold text-white mb-1.5">بوابة المريض الذكية</h3>
              <p className="text-xs text-slate-400 leading-relaxed mb-5">
                دخول فوري برقم الملف أو كارت المتابعة دون تسجيل؛ لتسجيل قراءات الضغط، مواعيد الأدوية، والتحاليل.
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

          {/* Quick Demo QR Links */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <a
              href="?portal=true&patientId=1"
              className="bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 px-5 py-3 rounded-2xl font-bold text-xs transition-all hover:border-slate-500 flex items-center gap-2"
            >
              <QrCode size={16} className="text-emerald-400" />
              <span>تجربة مسح كارت المريض المعتمد (#1 أحمد حسن)</span>
            </a>
          </div>

          {/* Fast Stats Bar */}
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
              <span className="text-xs text-slate-400 block mb-1">حماية البيانات المشفرة</span>
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

      {/* 3. CLINICAL FEATURES DEEP-DIVE */}
      <section className="py-20 bg-slate-950 border-t border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-mono font-bold text-blue-400 bg-blue-950/70 border border-blue-500/30 px-3 py-1 rounded-full uppercase">
              Core Clinical Capabilities • المميزات الأساسية
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-white mt-4 mb-3">
              منظومة سريرية متكاملة تخدم أطراف الرعاية الصحية
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed">
              صممت خصيصاً لتواكب التحديات اليومية لأطباء القلب في مصر: القضاء على الأوراق المفقودة، سرعة تلقي نتائج التحاليل، ومراقبة المريض في بيته قبل حدوث الأزمات.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {clinicalFeatures.map((feat, index) => (
              <div
                key={index}
                className="bg-slate-900 border border-slate-800 rounded-3xl p-6 hover:border-slate-700 hover:shadow-xl transition-all group"
              >
                <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center mb-5 border border-slate-700 group-hover:scale-110 transition-transform">
                  {feat.icon}
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{feat.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. COMPETITIVE COMPARISON MATRIX (المقارنة مع المنافسين والأنظمة التقليدية) */}
      <section className="py-20 bg-slate-900 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-3 py-1 rounded-full uppercase">
              Competitive Advantage • المقارنة التنافسية
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-white mt-4 mb-3">
              لماذا تختار Cardios مقارنة بالحلول التقليدية في السوق؟
            </h2>
            <p className="text-slate-400 text-sm">
              مقارنة تفصيلية بين منظومة Cardios المتخصصة والبرامج الطبية العامة والأساليب الورقية المعتادة.
            </p>
          </div>

          {/* Comparison Table */}
          <div className="overflow-x-auto">
            <div className="bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl min-w-[760px]">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/90 text-xs text-slate-300">
                    <th className="p-4 sm:p-5 font-bold w-2/5">المعيار السريري / الميزة</th>
                    <th className="p-4 sm:p-5 font-black text-blue-400 text-sm bg-blue-950/40 border-x border-blue-500/20 text-center w-1/5">
                      <div className="flex items-center justify-center gap-1.5">
                        <Award size={16} className="text-amber-400" />
                        <span>منظومة Cardios</span>
                      </div>
                    </th>
                    <th className="p-4 sm:p-5 font-bold text-slate-400 text-center w-1/5">
                      البرامج الطبية العامة (Generic EMR)
                    </th>
                    <th className="p-4 sm:p-5 font-bold text-slate-500 text-center w-1/5">
                      الملفات الورقية ورسائل الواتساب
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 text-xs">
                  {competitorComparison.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-900/50 transition-colors">
                      <td className="p-4 sm:p-5">
                        <strong className="text-white block text-sm font-semibold">{row.feature}</strong>
                        <span className="text-[11px] text-slate-400 mt-0.5 block">{row.note}</span>
                      </td>

                      {/* Cardios Column */}
                      <td className="p-4 sm:p-5 text-center bg-blue-950/20 border-x border-blue-500/20 font-bold text-emerald-400">
                        {row.cardios ? (
                          <div className="inline-flex items-center gap-1 text-emerald-400 bg-emerald-950/50 border border-emerald-500/30 px-2.5 py-1 rounded-full text-xs">
                            <CheckCircle2 size={14} />
                            <span>مدعوم بالكامل</span>
                          </div>
                        ) : null}
                      </td>

                      {/* Generic EMR Column */}
                      <td className="p-4 sm:p-5 text-center text-slate-400">
                        {row.genericEhr === true ? (
                          <Check size={16} className="mx-auto text-emerald-400" />
                        ) : row.genericEhr === false ? (
                          <XCircle size={16} className="mx-auto text-red-400/80" />
                        ) : (
                          <span className="text-[11px] text-amber-300 bg-amber-950/30 px-2 py-0.5 rounded-full border border-amber-500/20">
                            {row.genericEhr}
                          </span>
                        )}
                      </td>

                      {/* Paper & WhatsApp Column */}
                      <td className="p-4 sm:p-5 text-center text-slate-500">
                        {row.paperWhatsapp === false ? (
                          <XCircle size={16} className="mx-auto text-red-500/60" />
                        ) : (
                          <span className="text-[11px] text-slate-400">{row.paperWhatsapp}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* 5. HOW IT WORKS (سير العمل السريري ثلاثي الأطراف) */}
      <section className="py-20 bg-slate-950 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-mono font-bold text-purple-400 bg-purple-950/70 border border-purple-500/30 px-3 py-1 rounded-full uppercase">
              Clinical Workflow • آلية العمل
            </span>
            <h2 className="text-3xl font-black text-white mt-4 mb-3">
              دورة رعاية قلبية مغلقة بدون فقدان أي بيانات
            </h2>
            <p className="text-slate-400 text-sm">
              ثلاث خطوات متزامنة تضمن سلامة المريض وسرعة اتخاذ القرار الطبي.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Step 1 */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 relative">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white font-mono font-black flex items-center justify-center mb-4 text-base shadow-lg shadow-blue-600/30">
                1
              </div>
              <h3 className="text-base font-bold text-white mb-2">الكشف وفتح الملف السريري الشامل</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                يقوم الطبيب بتسجيل التاريخ القلبي، قياسات الإيكو المبدئية، الأدوية، وإصدار كارت المتابعة المشفر للمريض.
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 relative">
              <div className="w-10 h-10 rounded-xl bg-teal-600 text-white font-mono font-black flex items-center justify-center mb-4 text-base shadow-lg shadow-teal-600/30">
                2
              </div>
              <h3 className="text-base font-bold text-white mb-2">الربط اللحظي مع معمل التحاليل</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                يصل طلب الفحص لبوابة المعمل؛ يُدخل الفني النتائج لتظهر فوراً على شاشة الطبيب مع إشعار بالقيم الحرجة.
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 relative">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white font-mono font-black flex items-center justify-center mb-4 text-base shadow-lg shadow-emerald-600/30">
                3
              </div>
              <h3 className="text-base font-bold text-white mb-2">متابعة المريض عن بعد (RPM)</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                يمسح المريض كارت QR الخاص به من منزله، ويسجل قراءات الضغط اليومية مع التزامه بالأدوية، وتصل للطبيب أولاً بأول.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. FAQ ACCORDION */}
      <section className="py-20 bg-slate-900 border-t border-slate-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-black text-white mb-3">الأسئلة الشائعة</h2>
            <p className="text-slate-400 text-xs sm:text-sm">إجابات شاملة حول الخصوصية، طريقة عمل المنظومة، وتكامل المعامل.</p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => {
              const isOpen = selectedFaq === idx;
              return (
                <div key={idx} className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden transition-all">
                  <button
                    onClick={() => setSelectedFaq(isOpen ? null : idx)}
                    className="w-full p-4 sm:p-5 text-right font-bold text-white text-sm flex items-center justify-between gap-3 hover:text-blue-400 transition-colors"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown size={18} className={`transform transition-transform shrink-0 ${isOpen ? 'rotate-180 text-blue-400' : 'text-slate-500'}`} />
                  </button>
                  {isOpen && (
                    <div className="p-4 sm:p-5 pt-0 text-xs sm:text-sm text-slate-300 leading-relaxed border-t border-slate-900">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 7. FOOTER */}
      <footer className="py-12 bg-slate-950 border-t border-slate-800/80 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-4">
          <div className="flex items-center justify-center gap-2 text-white font-bold text-base">
            <HeartPulse size={20} className="text-emerald-400" />
            <span>منظومة Cardios للرعاية القلبية والتشخيصية</span>
          </div>
          <p className="max-w-xl mx-auto text-slate-500 text-xs">
            سجل طبي سريري متخصص لأمراض القلب والقسطرة، ربط فوري مع معامل التحاليل الطبية، ومتابعة منزلية متطورة لضغط الدم.
          </p>
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-[11px] text-emerald-400 font-medium">
            <ShieldCheck size={14} />
            <span>مشفرة ومتوافقة مع قانون حماية البيانات الشخصية المصري رقم 151 لسنة 2020</span>
          </div>
          <p className="text-[11px] text-slate-600 pt-4">© 2026 Cardios Platform • جميع الحقوق محفوظة</p>
        </div>
      </footer>
    </div>
  );
}
