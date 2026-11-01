import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Users,
  CheckCircle2,
  Calendar,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  ArrowUpRight,
  Filter,
  Sparkles,
  RefreshCw,
  QrCode,
  UserCheck
} from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid
} from 'recharts';

// Color Palette for Soft Minimalist Theme
const COLORS = ['#0d9488', '#0284c7', '#d97706', '#f43f5e', '#8b5cf6'];

export default function DoctorAnalyticsPanel({
  doctorId = 'doc-1',
  isDemoSession = true
}: {
  doctorId?: string;
  isDemoSession?: boolean;
}) {
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'quarter'>('week');
  const [loading, setLoading] = useState(false);

  // Analytics Data States
  const [dailyPatientsData, setDailyPatientsData] = useState([
    { day: 'السبت', count: 12, capacity: 12, qrBookings: 10 },
    { day: 'الأحد', count: 10, capacity: 12, qrBookings: 8 },
    { day: 'الإثنين', count: 6, capacity: 10, qrBookings: 5 },
    { day: 'الثلاثاء', count: 11, capacity: 12, qrBookings: 9 },
    { day: 'الأربعاء', count: 7, capacity: 10, qrBookings: 6 },
    { day: 'الخميس', count: 15, capacity: 15, qrBookings: 14 },
    { day: 'الجمعة', count: 4, capacity: 5, qrBookings: 3 },
  ]);

  const [bookingStatusData, setBookingStatusData] = useState([
    { name: 'حضور ومكتمل', value: 78, color: '#0d9488' },
    { name: 'مجدول قائم', value: 14, color: '#0284c7' },
    { name: 'قائمة انتظار', value: 5, color: '#d97706' },
    { name: 'ملغي / لم يحضر', value: 3, color: '#f43f5e' },
  ]);

  const [ageDemographicsData, setAgeDemographicsData] = useState([
    { ageGroup: 'أقل من 18', count: 15, percentage: '12%' },
    { ageGroup: '18 - 35', count: 32, percentage: '25%' },
    { ageGroup: '36 - 50', count: 48, percentage: '38%' },
    { ageGroup: '51 - 65', count: 22, percentage: '17%' },
    { ageGroup: 'أكثر من 65', count: 10, percentage: '8%' },
  ]);

  // Real data calculator from Firestore
  useEffect(() => {
    if (isDemoSession) return;

    const fetchRealAnalytics = async () => {
      setLoading(true);
      try {
        const appSnap = await getDocs(collection(db, 'appointments'));
        const allApps = appSnap.docs
          .map(d => d.data())
          .filter((a: any) => a.doctorId === doctorId);

        if (allApps.length > 0) {
          // Status breakdown
          const completed = allApps.filter((a: any) => a.status === 'Completed').length;
          const scheduled = allApps.filter((a: any) => a.status === 'Scheduled').length;
          const cancelled = allApps.filter((a: any) => a.status === 'Cancelled' || a.status === 'No-Show').length;
          const waitlist = allApps.filter((a: any) => a.status === 'Waitlist').length;
          const total = allApps.length;

          setBookingStatusData([
            { name: 'حضور ومكتمل', value: Math.round((completed / total) * 100) || 1, color: '#0d9488' },
            { name: 'مجدول قائم', value: Math.round((scheduled / total) * 100) || 1, color: '#0284c7' },
            { name: 'قائمة انتظار', value: Math.round((waitlist / total) * 100) || 0, color: '#d97706' },
            { name: 'ملغي / لم يحضر', value: Math.round((cancelled / total) * 100) || 0, color: '#f43f5e' },
          ]);

          // Age distribution
          const patSnap = await getDocs(collection(db, 'patients'));
          const patients = patSnap.docs.map(d => d.data());
          let u18 = 0, y35 = 0, m50 = 0, s65 = 0, g65 = 0;

          patients.forEach((p: any) => {
            const age = parseInt(p.age) || 40;
            if (age < 18) u18++;
            else if (age <= 35) y35++;
            else if (age <= 50) m50++;
            else if (age <= 65) s65++;
            else g65++;
          });

          const pTotal = patients.length || 1;
          setAgeDemographicsData([
            { ageGroup: 'أقل من 18', count: u18, percentage: `${Math.round((u18 / pTotal) * 100)}%` },
            { ageGroup: '18 - 35', count: y35, percentage: `${Math.round((y35 / pTotal) * 100)}%` },
            { ageGroup: '36 - 50', count: m50, percentage: `${Math.round((m50 / pTotal) * 100)}%` },
            { ageGroup: '51 - 65', count: s65, percentage: `${Math.round((s65 / pTotal) * 100)}%` },
            { ageGroup: 'أكثر من 65', count: g65, percentage: `${Math.round((g65 / pTotal) * 100)}%` },
          ]);
        }
      } catch (err) {
        console.warn('Error computing analytics:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRealAnalytics();
  }, [doctorId, isDemoSession]);

  return (
    <div className="bg-white p-5 sm:p-6 rounded-3xl shadow-xs border border-slate-200 space-y-6 font-sans text-slate-800" dir="rtl">
      {/* Top Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center font-bold">
            <BarChart3 size={22} />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
              <span>التحليلات والمؤشرات الإحصائية للعيادة</span>
              <span className="text-[10px] bg-teal-100 text-teal-800 font-bold px-2 py-0.5 rounded-full">
                Real-Time Analytics
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              متابعة حجم المرضى اليومي، كفاءة حجوزات QR، والتوزيع الديموغرافي للفئات العمرية
            </p>
          </div>
        </div>

        {/* Filter Time Range Buttons */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl border border-slate-200 self-start sm:self-auto">
          {(['week', 'month', 'quarter'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setTimeRange(r)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                timeRange === r
                  ? 'bg-white text-teal-800 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {r === 'week' ? 'هذا الأسبوع' : r === 'month' ? 'هذا الشهر' : 'الربع السنوي'}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-gradient-to-br from-teal-50 to-emerald-50/60 border border-teal-200/80 p-4 rounded-2xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-teal-800">إجمالي مرضى الأسبوع</span>
            <span className="p-1.5 bg-teal-100 text-teal-700 rounded-lg">
              <Users size={16} />
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-teal-950 font-mono">65</span>
            <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-0.5">
              <ArrowUpRight size={14} />
              <span>+18%</span>
            </span>
          </div>
          <p className="text-[10px] text-teal-700">مقارنة بالأسبوع الماضي</p>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-indigo-50/60 border border-blue-200/80 p-4 rounded-2xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-800">معدل الحجوزات الناجحة</span>
            <span className="p-1.5 bg-blue-100 text-blue-700 rounded-lg">
              <CheckCircle2 size={16} />
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-blue-950 font-mono">92%</span>
            <span className="text-[11px] font-bold text-blue-700 flex items-center gap-0.5">
              <ArrowUpRight size={14} />
              <span>+5%</span>
            </span>
          </div>
          <p className="text-[10px] text-blue-700">معدل حضور مباشر بدون إلغاء</p>
        </div>

        <div className="bg-gradient-to-br from-amber-50 to-orange-50/60 border border-amber-200/80 p-4 rounded-2xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-900">تحويلات مسح كود QR</span>
            <span className="p-1.5 bg-amber-100 text-amber-700 rounded-lg">
              <QrCode size={16} />
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-amber-950 font-mono">55</span>
            <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded font-bold">
              85% من الإجمالي
            </span>
          </div>
          <p className="text-[10px] text-amber-800">حجز أونلاين مباشر عبر البوستر</p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-pink-50/60 border border-purple-200/80 p-4 rounded-2xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-purple-900">متوسط العمر المراجع</span>
            <span className="p-1.5 bg-purple-100 text-purple-700 rounded-lg">
              <UserCheck size={16} />
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-purple-950 font-mono">46 سنة</span>
            <span className="text-[10px] text-purple-700 font-bold">الفئة الأكثر إقبالاً</span>
          </div>
          <p className="text-[10px] text-purple-700">مرضى متابعة الضغط والقلب</p>
        </div>
      </div>

      {/* CHARTS GRID SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* CHART 1: DAILY PATIENTS & CAPACITY UTILIZATION */}
        <div className="bg-slate-50/60 border border-slate-200 p-5 rounded-3xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                <BarChart3 size={16} className="text-teal-600" />
                <span>حجم الكشوفات اليومي واستغلال السعة القصوى</span>
              </h3>
              <p className="text-[10px] text-slate-400 mt-0.5">عدد الحجوزات الفعلية مقابل أقصى طاقة استيعابية</p>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-bold">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-teal-600 inline-block" />
                <span>الكشوفات الفعلية</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-300 inline-block" />
                <span>الطاقة القصوى</span>
              </span>
            </div>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyPatientsData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#64748b', fontWeight: 'bold' }} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', borderColor: '#cbd5e1', fontSize: '12px', fontWeight: 'bold' }}
                />
                <Bar dataKey="capacity" fill="#e2e8f0" radius={[6, 6, 0, 0]} name="الطاقة القصوى" />
                <Bar dataKey="count" fill="#0d9488" radius={[6, 6, 0, 0]} name="الكشوفات الفعلية" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CHART 2: SUCCESSFUL BOOKING STATUS CONVERSION RATE */}
        <div className="bg-slate-50/60 border border-slate-200 p-5 rounded-3xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                <PieChartIcon size={16} className="text-blue-600" />
                <span>توزيع وتصنيف حالات الحجوزات (Booking Conversion)</span>
              </h3>
              <p className="text-[10px] text-slate-400 mt-0.5">نسب الحضور الفعلي، المواعيد القائمة، وقوائم الانتظار</p>
            </div>
            <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full">
              معدل نجاح 92%
            </span>
          </div>

          <div className="h-64 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={bookingStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}%`}
                >
                  {bookingStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', borderColor: '#cbd5e1', fontSize: '12px', fontWeight: 'bold' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* CHART 3: AGE DEMOGRAPHICS DISTRIBUTION */}
      <div className="bg-slate-50/60 border border-slate-200 p-5 rounded-3xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
              <Users size={16} className="text-purple-600" />
              <span>توزيع الفئات العمرية للمراجعين بالعيادة (Age Demographics)</span>
            </h3>
            <p className="text-[10px] text-slate-400 mt-0.5">تصنيف المراجعين حسب المراحل العمرية لتوجيه الرعاية الطبية</p>
          </div>
          <span className="text-[10px] text-purple-700 bg-purple-50 border border-purple-200 font-bold px-2.5 py-1 rounded-xl">
            أعلى فئة: 36 - 50 سنة (38%)
          </span>
        </div>

        <div className="space-y-3 pt-2">
          {ageDemographicsData.map((demo, idx) => (
            <div key={demo.ageGroup} className="space-y-1">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-800">فئة {demo.ageGroup}</span>
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 font-mono text-[11px]">{demo.count} مريض</span>
                  <span className="text-teal-700 font-black font-mono">{demo.percentage}</span>
                </div>
              </div>
              <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: demo.percentage,
                    backgroundColor: COLORS[idx % COLORS.length]
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* AI Smart Summary & Recommendation */}
      <div className="bg-gradient-to-r from-teal-50 via-emerald-50 to-blue-50 border border-teal-200 rounded-2xl p-4 text-xs space-y-2">
        <div className="flex items-center gap-2 text-teal-900 font-black">
          <Sparkles size={16} className="text-teal-600 animate-pulse" />
          <span>توصيات الذكاء الاصطناعي لتحسين أداء العيادة:</span>
        </div>
        <ul className="text-slate-700 space-y-1 text-[11px] leading-relaxed font-medium pr-5 list-disc">
          <li>أيام الذروة هي <strong>الخميس والسبت</strong> (استغلال 100% من السعة). يُنصح برفع سعة الحجز لهذه الأيام بمقدار 2 كشوفات إضافةً لقائمة الانتظار.</li>
          <li>نسبة تحويل حجز كود الـ QR بلغت <strong>85%</strong> وهي ممتازة لتوفير وقت السكرتارية وتجنب ازدحام العيادة.</li>
        </ul>
      </div>
    </div>
  );
}
