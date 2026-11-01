import React, {useState, useEffect} from 'react';
import {
  Activity,
  FileText,
  ClipboardList,
  Stethoscope,
  CheckCircle2,
  XCircle,
  Sparkles,
  QrCode,
  HeartPulse,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  TrendingUp,
  FlaskConical,
  User,
  Pill,
  Check,
  Award,
  ChevronDown,
  Layers,
  Search,
  Lock,
  ArrowLeft
} from 'lucide-react';
import {trackPageView, trackDemoTrial} from '../lib/analytics';
import {useLanguage, LanguageSwitcher} from '../context/LanguageContext';

export default function LandingPage({
  onLaunch,
  onOpenLabPortal,
  onOpenPatientPortal,
  onOpenAuthModal,
  onOpenAdminPortal
}: {
  onLaunch: () => void;
  onOpenLabPortal?: () => void;
  onOpenPatientPortal?: (patientId?: string) => void;
  onOpenAuthModal?: (role?: 'doctor' | 'lab' | 'patient', mode?: 'login' | 'signup') => void;
  onOpenAdminPortal?: () => void;
}) {
  const { language, direction, isRTL, t } = useLanguage();
  const [selectedFaq, setSelectedFaq] = useState<number | null>(null);

  useEffect(() => {
    trackPageView('/');
  }, []);

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
    }
  ];

  const clinicalFeatures = [
    {
      icon: <Stethoscope className="w-6 h-6 text-teal-600" />,
      badgeBg: 'bg-teal-50',
      title: 'السجل الطبي القلبي المتخصص (EHR)',
      desc: 'توثيق كفاءة العضلة (EF%)، قياسات الإيكو، رسم القلب، وتصنيف خطورة أمراض الشرايين بسهولة ونظام.'
    },
    {
      icon: <FlaskConical className="w-6 h-6 text-blue-600" />,
      badgeBg: 'bg-blue-50',
      title: 'بوابة معامل التحاليل المتزامنة',
      desc: 'إرسال طلبات الفحوصات مباشرة للمعمل واستقبال النتائج والتقارير لتتزامن فوراً مع ملف المريض.'
    },
    {
      icon: <HeartPulse className="w-6 h-6 text-rose-600" />,
      badgeBg: 'bg-rose-50',
      title: 'المراقبة الحيوية عن بُعد (RPM)',
      desc: 'تسجيل قياسات الضغط والنبض من منزل المريض مع إشعارات فورية عند ارتفاع الضغط لمرحلة الخطر.'
    },
    {
      icon: <Pill className="w-6 h-6 text-amber-600" />,
      badgeBg: 'bg-amber-50',
      title: 'الروشتة الذكية وأمان الجرعات',
      desc: 'قاعدة بيانات أدوية القلب في مصر، فحص تعارضات الجرعات، ومزامنة الجدول الدوائي على هاتف المريض.'
    },
    {
      icon: <QrCode className="w-6 h-6 text-emerald-600" />,
      badgeBg: 'bg-emerald-50',
      title: 'كارت المتابعة المشفر (QR Card)',
      desc: 'دخول المريض فورياً برمز QR مطبوع بدون تعقيد البريد وكلمات المرور لسهولة الاستخدام لكبار السن.'
    },
    {
      icon: <Sparkles className="w-6 h-6 text-indigo-600" />,
      badgeBg: 'bg-indigo-50',
      title: 'المساعد السريري بالذكاء الاصطناعي',
      desc: 'صياغة تقارير الإيكو، فحص الجرعات، وتلخيص حالة المريض السريرية بثوانٍ معدودة.'
    }
  ];

  const faqs = [
    {
      q: 'لماذا يحتاج طبيب القلب إلى منظومة Cardios بدلاً من البرامج العامة؟',
      a: 'معظم البرامج مصممة لعيادات عامة، بينما Cardios بُنيت على بروتوكولات القلب العالمية (ESC & AHA)، وتحتوي على حقول دقيقة للإيكو، رسم القلب، ومتابعة ضغط الدم والربط المباشر مع المعامل.'
    },
    {
      q: 'كيف يدخل المريض لملفه ومتابعة روشتته؟',
      a: 'حرصاً على السلاسة، لا يُطلب من المريض إنشاء حساب؛ يسلمه الطبيب كارت متابعة بـ QR ورقم ملف، بمجرد مسحه بكاميرا الهاتف يفتح ملفه المشفر فوراً.'
    },
    {
      q: 'كيف يستفيد معمل التحاليل من الانضمام للمنظومة؟',
      a: 'يحصل المعمل على بوابة استقبال فحوصات مباشرة من عيادات القلب المعتمدة، ويسهل رفع النتائج وإشعار الطبيب فوراً مما يعزز ثقة العيادات والإحالات.'
    },
    {
      q: 'هل المنظومة متوافقة مع قانون حماية البيانات الشخصية؟',
      a: 'نعم 100%، تم تصميم بنية السجلات وفق معايير قانون حماية البيانات الشخصية رقم 151 لسنة 2020 بتشفير كامل وعزل تام لبيانات المرضى.'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-teal-500 selection:text-white" dir={direction}>
      {/* 1. TOP NAVBAR (Clean 3-Zone Contract) */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/60 transition-all">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between gap-6">
          {/* Zone 1: Clean Brand Wordmark */}
          <a href="/" className="flex items-center gap-2.5 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-sm">
              <HeartPulse size={20} />
            </div>
            <span className="text-xl font-black tracking-tight text-slate-900 whitespace-nowrap">
              {isRTL ? 'منظومة كارديوس' : 'CardioSaaS Cloud'}
            </span>
          </a>

          {/* Zone 2: Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <a href="#how-it-works" className="hover:text-teal-600 transition-colors whitespace-nowrap">
              {isRTL ? 'كيف تعمل المنظومة' : 'How It Works'}
            </a>
            <a href="#features" className="hover:text-teal-600 transition-colors whitespace-nowrap">
              {isRTL ? 'المميزات السريرية' : 'Clinical Features'}
            </a>
            <a href="#comparison" className="hover:text-teal-600 transition-colors whitespace-nowrap">
              {isRTL ? 'المقارنة التنافسية' : 'Comparison'}
            </a>
            <a href="#faq" className="hover:text-teal-600 transition-colors whitespace-nowrap">
              {isRTL ? 'الأسئلة الشائعة' : 'FAQ'}
            </a>
          </nav>

          {/* Zone 3: Single Primary Action & Language Switcher */}
          <div className="flex items-center gap-2.5 shrink-0">
            <LanguageSwitcher />

            <button
              onClick={() => {
                if (onOpenAuthModal) onOpenAuthModal('doctor', 'login');
              }}
              className="px-4 py-2 text-xs sm:text-sm font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {isRTL ? 'تسجيل الدخول' : 'Sign In'}
            </button>
            <button
              onClick={() => {
                trackDemoTrial('doctor', 'دخول مباشر لديمو كارديوس');
                onLaunch();
              }}
              className="px-4 py-2 text-xs sm:text-sm font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl transition-colors shadow-sm whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer"
            >
              <span>{isRTL ? 'تجربة الديمو' : 'Live Demo'}</span>
              <ArrowLeft size={16} className={isRTL ? '' : 'transform -scale-x-100'} />
            </button>
          </div>
        </div>
      </header>

      {/* 2. HERO SECTION (Spacious, Minimalist, Inspired by elzatona.tech style) */}
      <section className="pt-12 pb-16 sm:pt-20 sm:pb-24 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          {/* Hero Top Header Block */}
          <div className="text-center max-w-3xl mx-auto mb-12">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-50 border border-teal-200/80 text-teal-800 text-xs font-semibold mb-6">
              <span className="w-2 h-2 rounded-full bg-teal-500" />
              <span>المنصة الطبية البسيطة لأطباء القلب والمعامل</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight mb-6">
              كل ما تحتاجه لإدارة عيادة القلب والمريض <br />
              <span className="text-teal-600">في مكان واحد بدون زحمة</span>
            </h1>

            <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto mb-8">
              سجل طبي سريري مخصص لأمراض القلب، ربط لحظي مع معامل التحاليل، ومتابعة قراءات الضغط عن بُعد عبر كارت المريض الذكي.
            </p>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={() => {
                  trackDemoTrial('doctor', 'دخول ديمو العيادة من الهيرو');
                  onLaunch();
                }}
                className="px-6 py-3.5 bg-teal-600 hover:bg-teal-700 text-white rounded-2xl font-bold text-sm shadow-sm transition-all flex items-center gap-2"
              >
                <span>ابدأ تجربة المنظومة مجاناً</span>
                <ArrowLeft size={16} />
              </button>

              <button
                onClick={() => {
                  if (onOpenAuthModal) onOpenAuthModal('doctor', 'signup');
                }}
                className="px-6 py-3.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-2xl font-bold text-sm transition-all shadow-sm"
              >
                انضم كعيادة أو معمل جديد
              </button>
            </div>
          </div>

          {/* Hero Preview Card / Split Interactive Showcase */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-sm hover:shadow-md transition-all">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Gate 1: Doctor */}
              <div className="bg-slate-50/80 border border-slate-200/60 rounded-2xl p-6 flex flex-col justify-between transition-all hover:bg-white hover:border-teal-300">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center mb-4">
                    <Stethoscope size={20} />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mb-1.5">بوابة أطباء القلب</h3>
                  <p className="text-xs text-slate-600 leading-relaxed mb-6">
                    توثيق الإيكو والقسطرة، كتابة الروشتات، ومتابعة السجل المرضي بدقة.
                  </p>
                </div>
                <button
                  onClick={onLaunch}
                  className="w-full py-2.5 bg-white hover:bg-teal-50 border border-slate-200 hover:border-teal-300 text-teal-700 rounded-xl text-xs font-bold transition-all text-center"
                >
                  دخول عيادة ديمو
                </button>
              </div>

              {/* Gate 2: Lab */}
              <div className="bg-slate-50/80 border border-slate-200/60 rounded-2xl p-6 flex flex-col justify-between transition-all hover:bg-white hover:border-blue-300">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center mb-4">
                    <FlaskConical size={20} />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mb-1.5">بوابة معامل التحاليل</h3>
                  <p className="text-xs text-slate-600 leading-relaxed mb-6">
                    استقبال طلبات الفحوصات ورفع النتائج لتصل لملف المريض فورياً.
                  </p>
                </div>
                <button
                  onClick={() => {
                    trackDemoTrial('lab', 'دخول ديمو المعمل');
                    if (onOpenLabPortal) onOpenLabPortal();
                    else if (onOpenAuthModal) onOpenAuthModal('lab', 'login');
                  }}
                  className="w-full py-2.5 bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 text-blue-700 rounded-xl text-xs font-bold transition-all text-center"
                >
                  بوابة المعمل (PIN: 8888)
                </button>
              </div>

              {/* Gate 3: Patient */}
              <div className="bg-slate-50/80 border border-slate-200/60 rounded-2xl p-6 flex flex-col justify-between transition-all hover:bg-white hover:border-emerald-300">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-4">
                    <QrCode size={20} />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mb-1.5">بوابة المريض الذكية</h3>
                  <p className="text-xs text-slate-600 leading-relaxed mb-6">
                    دخول المريض بكارت QR ورقم الملف لمتابعة الضغط والروشتة بدون بريد.
                  </p>
                </div>
                <button
                  onClick={() => {
                    trackDemoTrial('patient', 'تجربة مسح كارت المريض');
                    if (onOpenAuthModal) onOpenAuthModal('patient', 'login');
                    else if (onOpenPatientPortal) onOpenPatientPortal('1');
                  }}
                  className="w-full py-2.5 bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 text-emerald-700 rounded-xl text-xs font-bold transition-all text-center"
                >
                  تجربة كارت المريض (#1)
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. 3-STEP WORKFLOW SECTION (Directly matching elzatona.tech style in image_7756bcb9.png) */}
      <section id="how-it-works" className="py-16 sm:py-24 bg-white border-y border-slate-200/60">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-bold text-teal-700 bg-teal-50 border border-teal-200/80 px-3.5 py-1 rounded-full">
              ببساطة كده
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-slate-900 mt-3 mb-3">
              ٣ خطوات لتنظيم العيادة والتشخيص
            </h2>
            <p className="text-slate-600 text-sm">
              دورة عمل سلسة ومحكمة تضمن سلامة المريض وسرعة توثيق الفحوصات والروشتات.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Step 1 */}
            <div className="bg-slate-50/80 border border-slate-200/60 rounded-3xl p-8 hover:bg-white hover:shadow-md transition-all text-right">
              <div className="w-10 h-10 rounded-2xl bg-teal-100 text-teal-800 font-bold flex items-center justify-center mb-5 text-sm">
                ٠١
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">أنشئ حساب العيادة أو المعمل</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                سجل بيانات العيادة لتصلك الموافقة وتفعيل الباقة السريرية للبدء مباشرة بدون تعقيدات.
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-slate-50/80 border border-slate-200/60 rounded-3xl p-8 hover:bg-white hover:shadow-md transition-all text-right">
              <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-800 font-bold flex items-center justify-center mb-5 text-sm">
                ٠٢
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">ربط الفحوصات والنتائج</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                أرسل طلب التحاليل للمعمل الشريك لتظهر النتائج في ملف المريض فور رفعها بدون ورق مفقود.
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-slate-50/80 border border-slate-200/60 rounded-3xl p-8 hover:bg-white hover:shadow-md transition-all text-right">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center mb-5 text-sm">
                ٠٣
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">سلم كارت المريض المشفر</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                اعط المريض كارت QR لمتابعة قياسات الضغط اليومية والالتزام بالروشتة من منزله بسهولة.
              </p>
            </div>
          </div>

          {/* Clean Callout Box (Inspired by bottom card in image_7756bcb9.png) */}
          <div className="mt-12 bg-amber-50/80 border border-amber-200/80 rounded-3xl p-8 text-center max-w-3xl mx-auto">
            <span className="text-xs font-bold text-amber-800 bg-amber-100 px-3 py-1 rounded-full mb-3 inline-block">
              يلا نبدأ على نظافة
            </span>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 mb-2">
              جرّب المنظومة الآن بنفسك في أجزاء من الثانية
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 mb-6 max-w-xl mx-auto">
              يمكنك الدخول كطبيب، معمل تحاليل، أو تجربة مسح كارت المريض لمعاينة السرعة والتنظيم المريح.
            </p>
            <button
              onClick={onLaunch}
              className="px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-xs sm:text-sm transition-all shadow-sm"
            >
              دخول الحساب التجريبي المباشر
            </button>
          </div>
        </div>
      </section>

      {/* 4. CLINICAL FEATURES */}
      <section id="features" className="py-16 sm:py-24 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200/80 px-3.5 py-1 rounded-full">
              المميزات السريرية
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-slate-900 mt-3 mb-3">
              منظومة متكاملة بدون حشو أو تعقيد
            </h2>
            <p className="text-slate-600 text-sm">
              مصممة لخدمة طبيب القلب والمعمل والمريض بدون شاشات مزدحمة أو قوائم عشوائية.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {clinicalFeatures.map((feat, index) => (
              <div
                key={index}
                className="bg-white border border-slate-200/80 rounded-3xl p-6 hover:shadow-md transition-all text-right"
              >
                <div className={`w-12 h-12 rounded-2xl ${feat.badgeBg} flex items-center justify-center mb-4`}>
                  {feat.icon}
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-2">{feat.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. COMPETITIVE COMPARISON MATRIX */}
      <section id="comparison" className="py-16 sm:py-24 bg-white border-t border-slate-200/60">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-3.5 py-1 rounded-full">
              المقارنة التنافسية
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-slate-900 mt-3 mb-3">
              لماذا تختار كارديوس لعيادتك؟
            </h2>
            <p className="text-slate-600 text-sm">
              مقارنة بين منظومة كارديوس المخصصة للقلب والبرامج الطبية العامة والأساليب الورقية.
            </p>
          </div>

          <div className="overflow-x-auto">
            <div className="bg-slate-50/80 border border-slate-200/80 rounded-3xl overflow-hidden shadow-sm min-w-[700px]">
              <table className="w-full text-right border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-white text-slate-700">
                    <th className="p-4 font-bold w-2/5">الميزة السريرية</th>
                    <th className="p-4 font-black text-teal-700 bg-teal-50/80 text-center w-1/5">
                      منظومة كارديوس
                    </th>
                    <th className="p-4 font-bold text-slate-500 text-center w-1/5">البرامج العامة</th>
                    <th className="p-4 font-bold text-slate-500 text-center w-1/5">الأسلوب الورقي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/60">
                  {competitorComparison.map((row, idx) => (
                    <tr key={idx} className="hover:bg-white transition-colors">
                      <td className="p-4">
                        <strong className="text-slate-900 block text-sm font-bold">{row.feature}</strong>
                        <span className="text-[11px] text-slate-500 mt-0.5 block">{row.note}</span>
                      </td>

                      <td className="p-4 text-center bg-teal-50/40 font-bold text-teal-700">
                        {row.cardios ? (
                          <span className="inline-flex items-center gap-1 text-teal-700 bg-teal-100/80 px-2.5 py-1 rounded-full text-xs font-medium">
                            <CheckCircle2 size={14} />
                            <span>متاح بالكامل</span>
                          </span>
                        ) : null}
                      </td>

                      <td className="p-4 text-center text-slate-500">
                        {row.genericEhr === true ? (
                          <Check size={16} className="mx-auto text-teal-600" />
                        ) : row.genericEhr === false ? (
                          <XCircle size={16} className="mx-auto text-rose-400" />
                        ) : (
                          <span className="text-[11px] text-slate-600 bg-slate-200/60 px-2 py-0.5 rounded-full">
                            {row.genericEhr}
                          </span>
                        )}
                      </td>

                      <td className="p-4 text-center text-slate-400">
                        {row.paperWhatsapp === false ? (
                          <XCircle size={16} className="mx-auto text-rose-400" />
                        ) : (
                          <span className="text-[11px] text-slate-500">{row.paperWhatsapp}</span>
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

      {/* 6. FAQ ACCORDION */}
      <section id="faq" className="py-16 sm:py-24 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mb-2">الأسئلة الشائعة</h2>
            <p className="text-slate-600 text-xs sm:text-sm">إجابات حول الخصوصية وطريقة العمل والمزايا.</p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => {
              const isOpen = selectedFaq === idx;
              return (
                <div key={idx} className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden transition-all shadow-sm">
                  <button
                    onClick={() => setSelectedFaq(isOpen ? null : idx)}
                    className="w-full p-4 sm:p-5 text-right font-bold text-slate-900 text-sm flex items-center justify-between gap-3 hover:text-teal-600 transition-colors"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown size={18} className={`transform transition-transform shrink-0 ${isOpen ? 'rotate-180 text-teal-600' : 'text-slate-400'}`} />
                  </button>
                  {isOpen && (
                    <div className="p-4 sm:p-5 pt-0 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 7. QUIET MINIMALIST FOOTER */}
      <footer className="py-12 bg-white border-t border-slate-200/80 text-center text-xs text-slate-500">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-4">
          <div className="flex items-center justify-center gap-2 text-slate-900 font-bold text-base">
            <HeartPulse size={18} className="text-teal-600" />
            <span>منظومة كارديوس الطبية الشاملة</span>
          </div>

          <p className="max-w-md mx-auto text-slate-500 text-xs">
            سجل طبي سريري متخصص لأمراض القلب، ربط فوري مع معامل التحاليل الطبية، ومتابعة هادئة وبسيطة للمرضى.
          </p>

          <div className="pt-4 flex flex-wrap items-center justify-center gap-3 text-[11px] text-slate-500">
            <span>© 2026 Cardios Platform</span>
            <span>·</span>
            <span className="text-slate-400">مشفرة ومحمية وفق قانون 151 لسنة 2020</span>
            {onOpenAdminPortal && (
              <>
                <span>·</span>
                <button
                  onClick={onOpenAdminPortal}
                  className="text-slate-500 hover:text-slate-900 transition-colors font-medium underline underline-offset-4"
                >
                  لوحة المشرف العام (Super Admin)
                </button>
              </>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
