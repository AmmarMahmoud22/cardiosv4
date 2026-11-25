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
import {trackPageView} from '../lib/analytics';
import {useLanguage, LanguageSwitcher} from '../context/LanguageContext';
import {PWAInstallButton} from './PWAInstallButton';

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
  const L = (ar: string, en: string) => (isRTL ? ar : en);
  const [selectedFaq, setSelectedFaq] = useState<number | null>(null);

  useEffect(() => {
    trackPageView('/');
  }, []);

  const competitorComparison = [
    {
      feature: L('تخصص سريري مخصص لأمراض القلب والقسطرة', 'Clinical specialty built for cardiology and catheterization'),
      cardios: true,
      genericEhr: L('جزئي / عام', 'Partial / generic'),
      paperWhatsapp: false,
      note: L('حقول مخصصة للإيكو (EF%, Wall Motion)، رسم القلب، وتصنيفات خطورة القلب (ESC/AHA)', 'Dedicated fields for echo (EF%, Wall Motion), ECG, and cardiac risk categories (ESC/AHA)')
    },
    {
      feature: L('الربط المباشر مع معامل التحاليل الطبية', 'Direct link with medical labs'),
      cardios: true,
      genericEhr: false,
      paperWhatsapp: false,
      note: L('يصل طلب التحليل للمعمل ويرفع الفني النتائج لتظهر فوراً في ملف المريض', 'The lab receives the test request and the technician uploads results, which appear in the patient file right away')
    },
    {
      feature: L('متابعة ضغط الدم والنبض عن بُعد (RPM) من المنزل', 'Remote blood pressure and pulse monitoring (RPM) from home'),
      cardios: true,
      genericEhr: false,
      paperWhatsapp: L('عشوائي / رسائل واتساب', 'Ad hoc / WhatsApp messages'),
      note: L('مخططات بيانية ملونة وتنبيه فوري للطبيب عند تخطي 140/90 mmHg', 'Colour charts and an instant alert to the doctor when 140/90 mmHg is exceeded')
    },
    {
      feature: L('كارت المريض الذكي (Tokenized QR Card)', 'Smart patient card (tokenized QR card)'),
      cardios: true,
      genericEhr: false,
      paperWhatsapp: false,
      note: L('دخول المريض فوري دون تعقيد إنشاء حساب أو بريد وكلمة مرور', 'Patient access is instant, with no account, email, or password to set up')
    },
    {
      feature: L('الروشتة الذكية وتنبيهات مبدئية لتعارض الأدوية', 'Smart prescription with preliminary drug-interaction alerts'),
      cardios: true,
      genericEhr: L('بدون تدقيق سريري', 'No clinical checking'),
      paperWhatsapp: false,
      note: L('تنبيه مبدئي لبعض تعارضات أدوية القلب مع قائمة جاهزة للأدوية؛ لا يغني عن مراجعة الطبيب والصيدلي', 'A preliminary alert for some cardiac drug interactions against a ready drug list; it does not replace review by the doctor and pharmacist')
    },
    {
      feature: L('مساعد سريري بالذكاء الاصطناعي (Gemini AI Engine)', 'AI clinical assistant (Gemini AI Engine)'),
      cardios: true,
      genericEhr: false,
      paperWhatsapp: false,
      note: L('تحليل فوري لتاريخ المريض والضغط والنتائج وتقديم توصيات بروتوكولية', 'Instant analysis of patient history, blood pressure, and results, with protocol-based suggestions')
    },
    {
      feature: L('حماية البيانات وصلاحيات وصول لكل دور', 'Data protection and role-based access'),
      cardios: true,
      genericEhr: L('غير معلن', 'Not stated'),
      paperWhatsapp: false,
      note: L('بيانات كل عيادة معزولة بقواعد صلاحيات؛ الامتثال القانوني مسؤولية العيادة ويتطلب مراجعة قانونية', 'Each clinic\'s data is separated by access rules; legal compliance is the clinic\'s responsibility and needs legal review')
    }
  ];

  const clinicalFeatures = [
    {
      icon: <Stethoscope className="w-6 h-6 text-teal-600" />,
      badgeBg: 'bg-teal-50',
      title: L('السجل الطبي القلبي المتخصص (EHR)', 'Specialized cardiac medical record (EHR)'),
      desc: L('توثيق كفاءة العضلة (EF%)، قياسات الإيكو، رسم القلب، وتصنيف خطورة أمراض الشرايين بسهولة ونظام.', 'Document ejection fraction (EF%), echo measurements, ECG, and arterial disease risk class in an orderly way.')
    },
    {
      icon: <FlaskConical className="w-6 h-6 text-blue-600" />,
      badgeBg: 'bg-blue-50',
      title: L('بوابة معامل التحاليل المتزامنة', 'Connected lab portal'),
      desc: L('إرسال طلبات الفحوصات مباشرة للمعمل واستقبال النتائج والتقارير لتتزامن فوراً مع ملف المريض.', 'Send test requests straight to the lab and receive results and reports that sync to the patient file at once.')
    },
    {
      icon: <HeartPulse className="w-6 h-6 text-rose-600" />,
      badgeBg: 'bg-rose-50',
      title: L('المراقبة الحيوية عن بُعد (RPM)', 'Remote vital monitoring (RPM)'),
      desc: L('تسجيل قياسات الضغط والنبض من منزل المريض مع إشعارات فورية عند ارتفاع الضغط لمرحلة الخطر.', 'Record blood pressure and pulse from the patient\'s home, with instant alerts when pressure reaches a danger level.')
    },
    {
      icon: <Pill className="w-6 h-6 text-amber-600" />,
      badgeBg: 'bg-amber-50',
      title: L('الروشتة الذكية وأمان الجرعات', 'Smart prescription and dose safety'),
      desc: L('قاعدة بيانات أدوية القلب في مصر، فحص تعارضات الجرعات، ومزامنة الجدول الدوائي على هاتف المريض.', 'A database of cardiac drugs in Egypt, dose interaction checks, and the medication schedule synced to the patient\'s phone.')
    },
    {
      icon: <QrCode className="w-6 h-6 text-emerald-600" />,
      badgeBg: 'bg-emerald-50',
      title: L('كارت المتابعة (QR Card)', 'Follow-up card (QR card)'),
      desc: L('دخول المريض فورياً برمز QR مطبوع بدون تعقيد البريد وكلمات المرور لسهولة الاستخدام لكبار السن.', 'Patients sign in instantly with a printed QR code, with no email or password, which is easy for older people.')
    },
    {
      icon: <Sparkles className="w-6 h-6 text-indigo-600" />,
      badgeBg: 'bg-indigo-50',
      title: L('المساعد السريري بالذكاء الاصطناعي', 'AI clinical assistant'),
      desc: L('صياغة تقارير الإيكو، فحص الجرعات، وتلخيص حالة المريض السريرية بثوانٍ معدودة.', 'Draft echo reports, check doses, and summarize the patient\'s clinical status in seconds.')
    }
  ];

  const faqs = [
    {
      q: L('لماذا يحتاج طبيب القلب إلى منظومة Cardios بدلاً من البرامج العامة؟', 'Why does a cardiologist need Cardios instead of general software?'),
      a: L('معظم البرامج مصممة لعيادات عامة، بينما Cardios بُنيت على بروتوكولات القلب العالمية (ESC & AHA)، وتحتوي على حقول دقيقة للإيكو، رسم القلب، ومتابعة ضغط الدم والربط المباشر مع المعامل.', 'Most software is built for general clinics, while Cardios is built on international cardiology protocols (ESC & AHA), with precise fields for echo, ECG, blood pressure follow-up, and a direct link to labs.')
    },
    {
      q: L('كيف يدخل المريض لملفه ومتابعة روشتته؟', 'How does a patient open their file and follow their prescription?'),
      a: L('حرصاً على السلاسة، لا يُطلب من المريض إنشاء حساب؛ يسلمه الطبيب كارت متابعة بـ QR ورقم ملف، بمجرد مسحه بكاميرا الهاتف يفتح ملفه بعد التحقق من رمز الكارت.', 'To keep it simple, patients do not create an account. The doctor gives them a follow-up card with a QR code and file number. Scanning it with the phone camera opens their file after the card code is verified.')
    },
    {
      q: L('كيف يستفيد معمل التحاليل من الانضمام للمنظومة؟', 'How does a lab benefit from joining?'),
      a: L('يحصل المعمل على بوابة استقبال فحوصات مباشرة من عيادات القلب المعتمدة، ويسهل رفع النتائج وإشعار الطبيب فوراً مما يعزز ثقة العيادات والإحالات.', 'The lab gets a portal that receives test requests directly from approved cardiology clinics, and makes it easy to upload results and notify the doctor right away, which builds trust with clinics and referrals.')
    },
    {
      q: L('هل المنظومة متوافقة مع قانون حماية البيانات الشخصية؟', 'Does the system comply with the personal data protection law?'),
      a: L('صُمّمت الصلاحيات لعزل بيانات كل عيادة، لكن المنصة لم تخضع بعد لمراجعة امتثال رسمية لقانون 151 لسنة 2020. يجب على كل عيادة التأكد من التزاماتها القانونية بنفسها.', 'Access rules are designed to separate each clinic\'s data, but the platform has not yet had a formal compliance review against Law 151 of 2020. Each clinic must check its own legal obligations.')
    }
  ];

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-50 text-slate-800 font-sans selection:bg-teal-500 selection:text-white" dir={direction}>
      {/* 1. TOP NAVBAR (Clean 3-Zone Contract) */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/60 transition-all">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 h-16 sm:h-20 flex items-center justify-between gap-2 sm:gap-6">
          {/* Zone 1: Clean Brand Wordmark */}
          <a href="/" className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-sm">
              <HeartPulse size={18} />
            </div>
            <span className="hidden min-[400px]:inline text-sm sm:text-xl font-black tracking-tight text-slate-900 whitespace-nowrap">
              {isRTL ? 'Cardios' : 'Cardios'}
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
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            <div className="hidden sm:block">
              <PWAInstallButton />
            </div>
            <LanguageSwitcher />

            <button
              onClick={() => {
                if (onOpenAuthModal) onOpenAuthModal('doctor', 'login');
                else onLaunch();
              }}
              className="px-2.5 sm:px-4 py-2 text-[11px] sm:text-sm font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {isRTL ? 'دخول' : 'Sign In'}
            </button>
            <button
              onClick={() => {
                if (onOpenAuthModal) onOpenAuthModal('doctor', 'signup');
              }}
              className="px-2.5 sm:px-4 py-2 text-[11px] sm:text-sm font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl transition-colors shadow-sm whitespace-nowrap shrink-0 flex items-center gap-1 sm:gap-1.5 cursor-pointer"
            >
              <span>{isRTL ? 'تسجيل' : 'Sign up'}</span>
              <ArrowLeft size={14} className={isRTL ? '' : 'transform -scale-x-100'} />
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
              <span>{L('المنصة الطبية البسيطة لأطباء القلب والمعامل', 'The simple medical platform for cardiologists and labs')}</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight mb-6">
              {L('كل ما تحتاجه لإدارة عيادة القلب والمريض', 'Everything you need to run a cardiology clinic and its patients')} <br />
              <span className="text-teal-600">{L('في مكان واحد بدون زحمة', 'in one place, without the clutter')}</span>
            </h1>

            <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto mb-8">
              {L('سجل طبي سريري مخصص لأمراض القلب، ربط لحظي مع معامل التحاليل، ومتابعة قراءات الضغط عن بُعد عبر كارت المريض الذكي.', 'A clinical record built for heart disease, instant links to labs, and remote blood pressure follow-up through the smart patient card.')}
            </p>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={() => {
                  if (onOpenAuthModal) onOpenAuthModal('doctor', 'signup');
                }}
                className="px-6 py-3.5 bg-teal-600 hover:bg-teal-700 text-white rounded-2xl font-bold text-sm shadow-sm transition-all flex items-center gap-2 cursor-pointer"
              >
                <span>{L('تسجيل عيادة أو معمل جديد', 'Register a new clinic or lab')}</span>
                <ArrowLeft size={16} />
              </button>

              <button
                onClick={() => {
                  if (onOpenAuthModal) onOpenAuthModal('doctor', 'login');
                  else onLaunch();
                }}
                className="px-6 py-3.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-2xl font-bold text-sm transition-all shadow-sm cursor-pointer"
              >
                {L('تسجيل الدخول', 'Sign in')}
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
                  <h3 className="text-base font-bold text-slate-900 mb-1.5">{L('بوابة أطباء القلب', 'Cardiologist portal')}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed mb-6">
                    {L('توثيق الإيكو والقسطرة، كتابة الروشتات، ومتابعة السجل المرضي بدقة.', 'Document echo and catheterization, write prescriptions, and follow the patient record accurately.')}
                  </p>
                </div>
                <button
                  onClick={() => {
                    if (onOpenAuthModal) onOpenAuthModal('doctor', 'login');
                    else onLaunch();
                  }}
                  className="w-full py-2.5 bg-white hover:bg-teal-50 border border-slate-200 hover:border-teal-300 text-teal-700 rounded-xl text-xs font-bold transition-all text-center cursor-pointer"
                >
                  {L('دخول بوابة الطبيب', 'Open doctor portal')}
                </button>
              </div>

              {/* Gate 2: Lab */}
              <div className="bg-slate-50/80 border border-slate-200/60 rounded-2xl p-6 flex flex-col justify-between transition-all hover:bg-white hover:border-blue-300">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center mb-4">
                    <FlaskConical size={20} />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mb-1.5">{L('بوابة معامل التحاليل', 'Lab portal')}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed mb-6">
                    {L('استقبال طلبات الفحوصات ورفع النتائج لتصل لملف المريض فورياً.', 'Receive test requests and upload results so they reach the patient file right away.')}
                  </p>
                </div>
                <button
                  onClick={() => {
                    if (onOpenAuthModal) onOpenAuthModal('lab', 'login');
                    else if (onOpenLabPortal) onOpenLabPortal();
                  }}
                  className="w-full py-2.5 bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 text-blue-700 rounded-xl text-xs font-bold transition-all text-center cursor-pointer"
                >
                  {L('دخول بوابة المعمل', 'Open lab portal')}
                </button>
              </div>

              {/* Gate 3: Patient */}
              <div className="bg-slate-50/80 border border-slate-200/60 rounded-2xl p-6 flex flex-col justify-between transition-all hover:bg-white hover:border-emerald-300">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-4">
                    <QrCode size={20} />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mb-1.5">{L('بوابة المريض الذكية', 'Smart patient portal')}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed mb-6">
                    {L('دخول المريض بكارت QR ورقم الملف لمتابعة الضغط والروشتة بدون بريد.', 'Patients sign in with a QR card and file number to follow their pressure and prescription, with no email.')}
                  </p>
                </div>
                <button
                  onClick={() => {
                    if (onOpenAuthModal) onOpenAuthModal('patient', 'login');
                  }}
                  className="w-full py-2.5 bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 text-emerald-700 rounded-xl text-xs font-bold transition-all text-center cursor-pointer"
                >
                  {L('دخول بوابة المريض (QR)', 'Open patient portal (QR)')}
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
              {L('ببساطة كده', 'Simply put')}
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-slate-900 mt-3 mb-3">
              {L('٣ خطوات لتنظيم العيادة والتشخيص', '3 steps to organize your clinic and diagnosis')}
            </h2>
            <p className="text-slate-600 text-sm">
              {L('دورة عمل سلسة ومحكمة تضمن سلامة المريض وسرعة توثيق الفحوصات والروشتات.', 'A smooth, tight workflow that keeps patients safe and speeds up documenting tests and prescriptions.')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Step 1 */}
            <div className="bg-slate-50/80 border border-slate-200/60 rounded-3xl p-8 hover:bg-white hover:shadow-md transition-all text-start">
              <div className="w-10 h-10 rounded-2xl bg-teal-100 text-teal-800 font-bold flex items-center justify-center mb-5 text-sm">
                {L('٠١', '01')}
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">{L('أنشئ حساب العيادة أو المعمل', 'Create the clinic or lab account')}</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {L('سجل بيانات العيادة لتصلك الموافقة وتفعيل الباقة السريرية للبدء مباشرة بدون تعقيدات.', 'Enter the clinic details to get approval and activate the clinical plan, and start right away.')}
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-slate-50/80 border border-slate-200/60 rounded-3xl p-8 hover:bg-white hover:shadow-md transition-all text-start">
              <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-800 font-bold flex items-center justify-center mb-5 text-sm">
                {L('٠٢', '02')}
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">{L('ربط الفحوصات والنتائج', 'Link tests and results')}</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {L('أرسل طلب التحاليل للمعمل الشريك لتظهر النتائج في ملف المريض فور رفعها بدون ورق مفقود.', 'Send the test request to the partner lab so results appear in the patient file as soon as they are uploaded, with no lost paper.')}
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-slate-50/80 border border-slate-200/60 rounded-3xl p-8 hover:bg-white hover:shadow-md transition-all text-start">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center mb-5 text-sm">
                {L('٠٣', '03')}
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">{L('سلم كارت المريض', 'Hand over the patient card')}</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {L('اعط المريض كارت QR لمتابعة قياسات الضغط اليومية والالتزام بالروشتة من منزله بسهولة.', 'Give the patient a QR card to follow daily blood pressure readings and prescription adherence from home.')}
              </p>
            </div>
          </div>

          {/* Clean Callout Box */}
          <div className="mt-12 bg-amber-50/80 border border-amber-200/80 rounded-3xl p-8 text-center max-w-3xl mx-auto">
            <span className="text-xs font-bold text-amber-800 bg-amber-100 px-3 py-1 rounded-full mb-3 inline-block">
              {L('انضم إلى الشبكة الطبية', 'Join the medical network')}
            </span>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 mb-2">
              {L('انضم كعيادة قلب أو معمل تحاليل معتمد', 'Join as a cardiology clinic or an approved lab')}
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 mb-6 max-w-xl mx-auto">
              {L('سجّل حساب عيادتك أو معملك الآن، ليتم مراجعته واعتماده من إدارة المنصة وبدء العمل مباشرة.', 'Register your clinic or lab now. The platform team reviews and approves it, then you can start working.')}
            </p>
            <button
              onClick={() => {
                if (onOpenAuthModal) onOpenAuthModal('doctor', 'signup');
              }}
              className="px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-xs sm:text-sm transition-all shadow-sm cursor-pointer"
            >
              {L('إنشاء حساب عيادة أو معمل', 'Create a clinic or lab account')}
            </button>
          </div>
        </div>
      </section>

      {/* 4. CLINICAL FEATURES */}
      <section id="features" className="py-16 sm:py-24 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200/80 px-3.5 py-1 rounded-full">
              {L('المميزات السريرية', 'Clinical features')}
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-slate-900 mt-3 mb-3">
              {L('منظومة متكاملة بدون حشو أو تعقيد', 'A complete system with no filler or complexity')}
            </h2>
            <p className="text-slate-600 text-sm">
              {L('مصممة لخدمة طبيب القلب والمعمل والمريض بدون شاشات مزدحمة أو قوائم عشوائية.', 'Built for the cardiologist, the lab, and the patient, without crowded screens or random menus.')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {clinicalFeatures.map((feat, index) => (
              <div
                key={index}
                className="bg-white border border-slate-200/80 rounded-3xl p-6 hover:shadow-md transition-all text-start"
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
              {L('المقارنة التنافسية', 'Comparison')}
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-slate-900 mt-3 mb-3">
              {L('لماذا تختار كارديوس لعيادتك؟', 'Why choose Cardios for your clinic?')}
            </h2>
            <p className="text-slate-600 text-sm">
              {L('مقارنة بين منظومة كارديوس المخصصة للقلب والبرامج الطبية العامة والأساليب الورقية.', 'A comparison between Cardios, built for cardiology, general medical software, and paper methods.')}
            </p>
          </div>

          <div className="overflow-x-auto">
            <div className="bg-slate-50/80 border border-slate-200/80 rounded-3xl overflow-hidden shadow-sm min-w-[700px]">
              <table className="w-full text-start border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-white text-slate-700">
                    <th className="p-4 font-bold w-2/5">{L('الميزة السريرية', 'Clinical feature')}</th>
                    <th className="p-4 font-black text-teal-700 bg-teal-50/80 text-center w-1/5">
                      {L('منظومة كارديوس', 'Cardios')}
                    </th>
                    <th className="p-4 font-bold text-slate-500 text-center w-1/5">{L('البرامج العامة', 'General software')}</th>
                    <th className="p-4 font-bold text-slate-500 text-center w-1/5">{L('الأسلوب الورقي', 'Paper-based')}</th>
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
                            <span>{L('متاح', 'Available')}</span>
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
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mb-2">{L('الأسئلة الشائعة', 'Frequently asked questions')}</h2>
            <p className="text-slate-600 text-xs sm:text-sm">{L('إجابات حول الخصوصية وطريقة العمل والمزايا.', 'Answers about privacy, how it works, and benefits.')}</p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => {
              const isOpen = selectedFaq === idx;
              return (
                <div key={idx} className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden transition-all shadow-sm">
                  <button
                    onClick={() => setSelectedFaq(isOpen ? null : idx)}
                    className="w-full p-4 sm:p-5 text-start font-bold text-slate-900 text-sm flex items-center justify-between gap-3 hover:text-teal-600 transition-colors"
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
            <span>{L('منظومة كارديوس الطبية الشاملة', 'Cardios clinical system')}</span>
          </div>

          <p className="max-w-md mx-auto text-slate-500 text-xs">
            {L('سجل طبي سريري متخصص لأمراض القلب، ربط فوري مع معامل التحاليل الطبية، ومتابعة هادئة وبسيطة للمرضى.', 'A clinical record specialized for heart disease, instant links to medical labs, and calm, simple patient follow-up.')}
          </p>

          <div className="pt-4 flex flex-wrap items-center justify-center gap-3 text-[11px] text-slate-500">
            <span>© 2026 Cardios Platform</span>
            <span>·</span>
            <span className="text-slate-400">{L('المساعد الذكي يدعم الطبيب ولا يقدّم تشخيصاً أو بديلاً عن القرار الطبي', 'The AI assistant supports the doctor. It does not give a diagnosis or replace medical judgment.')}</span>
            {onOpenAdminPortal && (
              <>
                <span>·</span>
                <button
                  onClick={onOpenAdminPortal}
                  className="text-slate-500 hover:text-slate-900 transition-colors font-medium underline underline-offset-4"
                >
                  {L('لوحة المشرف العام (Super Admin)', 'Super Admin panel')}
                </button>
              </>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
