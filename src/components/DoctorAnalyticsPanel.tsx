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
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
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
  CartesianGrid
} from 'recharts';

const COLORS = ['#0d9488', '#0284c7', '#d97706', '#f43f5e', '#8b5cf6'];

const WEEKDAYS_AR = [
  { dayOfWeek: 6, day: 'السبت' },
  { dayOfWeek: 0, day: 'الأحد' },
  { dayOfWeek: 1, day: 'الإثنين' },
  { dayOfWeek: 2, day: 'الثلاثاء' },
  { dayOfWeek: 3, day: 'الأربعاء' },
  { dayOfWeek: 4, day: 'الخميس' },
  { dayOfWeek: 5, day: 'الجمعة' },
];

const EMPTY_DAILY = WEEKDAYS_AR.map((w) => ({ day: w.day, count: 0, capacity: 0, qrBookings: 0 }));

const EMPTY_AGES = [
  { ageGroup: 'أقل من 18', count: 0, percentage: '0%' },
  { ageGroup: '18 - 35', count: 0, percentage: '0%' },
  { ageGroup: '36 - 50', count: 0, percentage: '0%' },
  { ageGroup: '51 - 65', count: 0, percentage: '0%' },
  { ageGroup: 'أكثر من 65', count: 0, percentage: '0%' },
];

export default function DoctorAnalyticsPanel({
  doctorId = '',
  clinicCode = ''
}: {
  doctorId?: string;
  clinicCode?: string;
}) {
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'quarter'>('week');
  const [loading, setLoading] = useState(false);

  const [dailyPatientsData, setDailyPatientsData] = useState(EMPTY_DAILY);
  const [bookingStatusData, setBookingStatusData] = useState<Array<{ name: string; value: number; color: string }>>([]);
  const [ageDemographicsData, setAgeDemographicsData] = useState(EMPTY_AGES);
  const [kpiStats, setKpiStats] = useState({
    totalAppointments: 0,
    successRate: 0,
    qrBookings: 0,
    qrRate: 0,
    avgAge: 0,
    topAgeLabel: '—',
    peakDaysLabel: ''
  });

  useEffect(() => {
    const fetchRealAnalytics = async () => {
      if (!doctorId && !clinicCode) {
        setDailyPatientsData(EMPTY_DAILY);
        setBookingStatusData([]);
        setAgeDemographicsData(EMPTY_AGES);
        setKpiStats({
          totalAppointments: 0,
          successRate: 0,
          qrBookings: 0,
          qrRate: 0,
          avgAge: 0,
          topAgeLabel: '—',
          peakDaysLabel: ''
        });
        return;
      }

      setLoading(true);
      try {
        const appQuery = doctorId
          ? query(collection(db, 'appointments'), where('doctorId', '==', doctorId))
          : query(collection(db, 'appointments'), where('clinicCode', '==', clinicCode));
        const patQuery = doctorId
          ? query(collection(db, 'patients'), where('doctorId', '==', doctorId))
          : query(collection(db, 'patients'), where('clinicCode', '==', clinicCode));

        const [appSnap, patSnap, schedSnap] = await Promise.all([
          getDocs(appQuery),
          getDocs(patQuery),
          doctorId ? getDoc(doc(db, 'doctor_schedules', doctorId)) : Promise.resolve(null)
        ]);

        const now = Date.now();
        const daysWindow = timeRange === 'week' ? 7 : timeRange === 'month' ? 30 : 90;
        const cutoffMs = now - daysWindow * 24 * 60 * 60 * 1000;

        const clinicApps = appSnap.docs
          .map(d => d.data())
          .filter((a: any) =>
            (doctorId && a.doctorId === doctorId) ||
            (clinicCode && a.clinicCode === clinicCode)
          );

        const rangedApps = clinicApps.filter((a: any) => {
          const rawDate = a.date || a.startTime || a.createdAt;
          if (!rawDate) return true;
          const ts = new Date(rawDate).getTime();
          return Number.isNaN(ts) || ts >= cutoffMs;
        });

        const total = rangedApps.length;
        const completed = rangedApps.filter((a: any) => a.status === 'Completed').length;
        const scheduled = rangedApps.filter((a: any) => a.status === 'Scheduled' || !a.status).length;
        const waitlist = rangedApps.filter((a: any) => a.status === 'Waitlist').length;
        const cancelled = rangedApps.filter((a: any) => a.status === 'Cancelled' || a.status === 'No-Show').length;
        const qrBookings = rangedApps.filter((a: any) => Boolean(a.clinicCode)).length;
        const successRate = total > 0 ? Math.round(((completed + scheduled) / total) * 100) : 0;
        const qrRate = total > 0 ? Math.round((qrBookings / total) * 100) : 0;

        if (total > 0) {
          setBookingStatusData(
            [
              { name: 'حضور ومكتمل', value: Math.round((completed / total) * 100), color: '#0d9488' },
              { name: 'مجدول قائم', value: Math.round((scheduled / total) * 100), color: '#0284c7' },
              { name: 'قائمة انتظار', value: Math.round((waitlist / total) * 100), color: '#d97706' },
              { name: 'ملغي / لم يحضر', value: Math.round((cancelled / total) * 100), color: '#f43f5e' },
            ].filter((item) => item.value > 0)
          );
        } else {
          setBookingStatusData([]);
        }

        const schedWorkingDays: Array<{ dayOfWeek: number; enabled?: boolean; maxCapacity?: number }> =
          schedSnap && schedSnap.exists() ? (schedSnap.data().workingDays || []) : [];

        const dailyComputed = WEEKDAYS_AR.map((wd) => {
          const dayApps = rangedApps.filter((a: any) => {
            const rawDate = a.date || a.startTime;
            if (!rawDate) return false;
            const parsed = new Date(rawDate);
            return !Number.isNaN(parsed.getTime()) && parsed.getDay() === wd.dayOfWeek;
          });
          const schedDay = schedWorkingDays.find((w) => w.dayOfWeek === wd.dayOfWeek && w.enabled);
          return {
            day: wd.day,
            count: dayApps.length,
            capacity: schedDay?.maxCapacity || 0,
            qrBookings: dayApps.filter((a: any) => Boolean(a.clinicCode)).length
          };
        });
        setDailyPatientsData(dailyComputed);

        const maxDayCount = Math.max(...dailyComputed.map((d) => d.count), 0);
        const peakDaysLabel =
          maxDayCount > 0
            ? dailyComputed
                .filter((d) => d.count === maxDayCount)
                .map((d) => d.day)
                .join(' و')
            : '';

        // Strict patient isolation
        const clinicPatients = patSnap.docs
          .map(d => d.data())
          .filter((p: any) => doctorId && p.doctorId === doctorId);

        let u18 = 0, y35 = 0, m50 = 0, s65 = 0, g65 = 0;
        let ageSum = 0;
        let ageCount = 0;

        clinicPatients.forEach((p: any) => {
          let age = parseInt(p.age, 10);
          if (Number.isNaN(age) && p.dob) {
            const birthYear = new Date(p.dob).getFullYear();
            if (!Number.isNaN(birthYear)) {
              age = new Date().getFullYear() - birthYear;
            }
          }
          if (!Number.isNaN(age) && age > 0) {
            ageSum += age;
            ageCount++;
            if (age < 18) u18++;
            else if (age <= 35) y35++;
            else if (age <= 50) m50++;
            else if (age <= 65) s65++;
            else g65++;
          }
        });

        const pTotal = ageCount > 0 ? ageCount : 0;
        const computedAges = [
          { ageGroup: 'أقل من 18', count: u18, percentage: pTotal > 0 ? `${Math.round((u18 / pTotal) * 100)}%` : '0%' },
          { ageGroup: '18 - 35', count: y35, percentage: pTotal > 0 ? `${Math.round((y35 / pTotal) * 100)}%` : '0%' },
          { ageGroup: '36 - 50', count: m50, percentage: pTotal > 0 ? `${Math.round((m50 / pTotal) * 100)}%` : '0%' },
          { ageGroup: '51 - 65', count: s65, percentage: pTotal > 0 ? `${Math.round((s65 / pTotal) * 100)}%` : '0%' },
          { ageGroup: 'أكثر من 65', count: g65, percentage: pTotal > 0 ? `${Math.round((g65 / pTotal) * 100)}%` : '0%' },
        ];
        setAgeDemographicsData(computedAges);

        const topAgeGroup = computedAges.reduce(
          (best, cur) => (cur.count > best.count ? cur : best),
          computedAges[0]
        );

        setKpiStats({
          totalAppointments: total,
          successRate,
          qrBookings,
          qrRate,
          avgAge: ageCount > 0 ? Math.round(ageSum / ageCount) : 0,
          topAgeLabel: topAgeGroup.count > 0 ? `${topAgeGroup.ageGroup} سنة (${topAgeGroup.percentage})` : '—',
          peakDaysLabel
        });
      } catch (err) {
        console.warn('Error computing analytics:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRealAnalytics();
  }, [doctorId, clinicCode, timeRange]);

  const hasAnyAnalytics = kpiStats.totalAppointments > 0 || ageDemographicsData.some((a) => a.count > 0);

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
                Live Clinic Metrics
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              متابعة حجم المرضى الفعلي، كفاءة حجوزات QR، والتوزيع الديموغرافي للفئات العمرية
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
            <span className="text-xs font-bold text-teal-800">إجمالي الحجوزات</span>
            <span className="p-1.5 bg-teal-100 text-teal-700 rounded-lg">
              <Users size={16} />
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-teal-950 font-mono">
              {loading ? '...' : kpiStats.totalAppointments}
            </span>
          </div>
          <p className="text-[10px] text-teal-700">حجوزات الفترة المحددة</p>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-indigo-50/60 border border-blue-200/80 p-4 rounded-2xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-800">معدل الحجوزات النشطة</span>
            <span className="p-1.5 bg-blue-100 text-blue-700 rounded-lg">
              <CheckCircle2 size={16} />
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-blue-950 font-mono">
              {loading ? '...' : `${kpiStats.successRate}%`}
            </span>
          </div>
          <p className="text-[10px] text-blue-700">نسبة الحضور والمواعيد القائمة</p>
        </div>

        <div className="bg-gradient-to-br from-amber-50 to-orange-50/60 border border-amber-200/80 p-4 rounded-2xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-900">حجوزات بوابة الـ QR</span>
            <span className="p-1.5 bg-amber-100 text-amber-700 rounded-lg">
              <QrCode size={16} />
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-amber-950 font-mono">
              {loading ? '...' : kpiStats.qrBookings}
            </span>
            <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded font-bold">
              {kpiStats.qrRate}% من الإجمالي
            </span>
          </div>
          <p className="text-[10px] text-amber-800">حجز أونلاين مباشر عبر كود العيادة</p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-pink-50/60 border border-purple-200/80 p-4 rounded-2xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-purple-900">متوسط عمر المرضى</span>
            <span className="p-1.5 bg-purple-100 text-purple-700 rounded-lg">
              <UserCheck size={16} />
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-purple-950 font-mono">
              {loading ? '...' : kpiStats.avgAge > 0 ? `${kpiStats.avgAge} سنة` : '—'}
            </span>
          </div>
          <p className="text-[10px] text-purple-700">بناءً على السجلات الفعلية بالعيادة</p>
        </div>
      </div>

      {!hasAnyAnalytics && !loading ? (
        <div className="py-12 text-center bg-slate-50 border border-dashed border-slate-200 rounded-3xl space-y-2">
          <BarChart3 size={32} className="mx-auto text-slate-400" />
          <p className="text-sm font-black text-slate-800">لا توجد بيانات تحليلية مسجلة لهذه العيادة بعد</p>
          <p className="text-xs text-slate-500">ستظهر المخططات والرسوم البيانية تلقائياً بمجرد إضافة مرضى أو استقبال حجوزات فعلية.</p>
        </div>
      ) : (
        <>
          {/* CHARTS GRID SECTION */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* CHART 1: DAILY PATIENTS & CAPACITY UTILIZATION */}
            <div className="bg-slate-50/60 border border-slate-200 p-5 rounded-3xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                    <BarChart3 size={16} className="text-teal-600" />
                    <span>حجم الكشوفات اليومي واستغلال السعة</span>
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">عدد الحجوزات الفعلية مقابل السعة المحددة في جدول العيادة</p>
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
                    <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
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
                    <span>توزيع وتصنيف حالات الحجوزات (Booking Status)</span>
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">نسب الحضور الفعلي، المواعيد القائمة، وقوائم الانتظار</p>
                </div>
                <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full">
                  معدل الحضور والمواعيد {kpiStats.successRate}%
                </span>
              </div>

              <div className="h-64 w-full flex items-center justify-center">
                {bookingStatusData.length > 0 ? (
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
                ) : (
                  <p className="text-xs text-slate-400 font-medium">لا توجد مواعيد مسجلة في الفترة المختارة</p>
                )}
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
                <p className="text-[10px] text-slate-400 mt-0.5">تصنيف المراجعين حسب المراحل العمرية المسجلة</p>
              </div>
              <span className="text-[10px] text-purple-700 bg-purple-50 border border-purple-200 font-bold px-2.5 py-1 rounded-xl">
                أعلى فئة: {kpiStats.topAgeLabel}
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

          {/* Live Summary */}
          <div className="bg-gradient-to-r from-teal-50 via-emerald-50 to-blue-50 border border-teal-200 rounded-2xl p-4 text-xs space-y-2">
            <div className="flex items-center gap-2 text-teal-900 font-black">
              <Sparkles size={16} className="text-teal-600" />
              <span>ملخص الأداء الفعلي للعيادة:</span>
            </div>
            <ul className="text-slate-700 space-y-1 text-[11px] leading-relaxed font-medium pr-5 list-disc">
              {kpiStats.peakDaysLabel ? (
                <li>أكثر أيام الحجز نشاطاً خلال الفترة المحددة: <strong>{kpiStats.peakDaysLabel}</strong>.</li>
              ) : (
                <li>لم يتم تسجيل مواعيد كافية لتحديد أيام الذروة بعد.</li>
              )}
              <li>نسبة الحجوزات القادمة عبر كود العيادة (QR): <strong>{kpiStats.qrRate}%</strong> من إجمالي المواعيد المسجلة.</li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
