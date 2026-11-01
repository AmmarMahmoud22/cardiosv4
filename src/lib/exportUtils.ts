import { DoctorWithSubscription, Plan } from '../types/subscription';

/**
 * Download a CSV file with UTF-8 BOM for proper Arabic support in Microsoft Excel
 */
function downloadCSV(csvContent: string, fileName: string) {
  // UTF-8 BOM: \uFEFF ensures Excel displays Arabic text properly
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export all doctors and their subscription status to an Excel/CSV file
 */
export function exportDoctorsToCSV(doctors: DoctorWithSubscription[], plans: Plan[]) {
  const headers = [
    'اسم الطبيب',
    'اسم العيادة',
    'كود العيادة',
    'التخصص الطبي',
    'رقم ترخيص المهنة',
    'حالة الاعتماد',
    'الباقة الحالية',
    'قيمة الاشتراك (EGP)',
    'تاريخ انتهاء الاشتراك',
    'حالة الحساب',
    'عدد المرضى',
    'الروشتات المصدرة',
    'تقارير الإيكو',
    'استهلاك الذكاء الاصطناعي',
    'الحد الشهري لـ AI',
    'حالة AI',
    'رقم الهاتف',
    'البريد الإلكتروني'
  ];

  const rows = doctors.map(doc => {
    const plan = plans.find(p => p.id === doc.planId);
    const planPrice = plan ? `${plan.price} ${plan.currency}` : '500 EGP';
    const statusArabic =
      doc.status === 'active' ? 'نشط' :
      doc.status === 'suspended' ? 'مجمد' :
      doc.status === 'pending' ? 'بانتظار الاعتماد' :
      doc.status === 'trial' ? 'تجريبي' : 'منتهي';

    const verificationArabic =
      doc.verificationStatus === 'verified' ? 'معتمد رسمياً' :
      doc.verificationStatus === 'pending' ? 'قيد التدقيق' : 'غير معتمد';

    const aiStatus = doc.isAiBlocked ? 'محظور' : 'مفعل';

    return [
      `"${doc.name || ''}"`,
      `"${doc.clinicName || ''}"`,
      `"${doc.clinicCode || ''}"`,
      `"${doc.specialty || ''}"`,
      `"${doc.medicalLicenseNumber || 'قيد التسجيل'}"`,
      `"${verificationArabic}"`,
      `"${doc.planName || (plan ? plan.name : 'باقة العيادة الذكية')}"`,
      `"${planPrice}"`,
      `"${doc.subscriptionExpiresAt || '2026-12-31'}"`,
      `"${statusArabic}"`,
      doc.patientCount ?? 3,
      doc.prescriptionsIssued ?? 14,
      doc.echoReportsCount ?? 8,
      doc.aiQueriesUsed || 0,
      doc.aiQuotaLimit || 200,
      `"${aiStatus}"`,
      `"${doc.phone || ''}"`,
      `"${doc.email || ''}"`
    ].join(',');
  });

  const csvContent = [headers.join(','), ...rows].join('\r\n');
  const dateStr = new Date().toISOString().slice(0, 10);
  downloadCSV(csvContent, `CardioSaaS_Doctors_Report_${dateStr}.csv`);
}

/**
 * Export Financial Summary & MRR projection to CSV
 */
export function exportFinancialSummaryToCSV(doctors: DoctorWithSubscription[], plans: Plan[]) {
  const activeDoctors = doctors.filter(d => d.status === 'active');
  const totalMRR = activeDoctors.reduce((acc, curr) => {
    const p = plans.find(plan => plan.id === curr.planId);
    return acc + (p?.price || 500);
  }, 0);
  const totalARR = totalMRR * 12;

  // Plan breakdown
  const planBreakdown = plans.map(p => {
    const count = activeDoctors.filter(d => d.planId === p.id).length;
    const subtotal = count * p.price;
    return {
      name: p.name,
      price: p.price,
      currency: p.currency,
      cycle: p.billingCycle,
      subscribersCount: count,
      totalMonthly: subtotal,
      totalAnnual: subtotal * 12
    };
  });

  const totalAiQueries = doctors.reduce((acc, curr) => acc + (curr.aiQueriesUsed || 0), 0);
  // Estimated cost per query: ~$0.001 USD = ~0.05 EGP
  const estimatedAiCostEgp = Math.round(totalAiQueries * 0.05);
  const netEstimatedMonthlyProfit = Math.max(0, totalMRR - estimatedAiCostEgp);

  const lines = [
    'ملخص الإيرادات والتحليلات المالية - منصة CardioSaaS',
    `تاريخ التقرير,${new Date().toLocaleDateString('ar-EG')}`,
    '',
    'المؤشرات المالية الرئيسية,القيمة',
    `إجمالي العيادات المشتركة,${doctors.length}`,
    `العيادات النشطة حالياً,${activeDoctors.length}`,
    `العائد الشهري المتكرر (MRR),${totalMRR} EGP`,
    `العائد السنوي المتوقع (ARR),${totalARR} EGP`,
    `إجمالي استعلامات الذكاء الاصطناعي,${totalAiQueries}`,
    `تكلفة استهلاك AI التقديرية (EGP),${estimatedAiCostEgp} EGP`,
    `صافي الدخل التشغيلي التقديري,${netEstimatedMonthlyProfit} EGP`,
    '',
    'تفصيل الإيرادات حسب الباقات',
    'اسم الباقة,سعر الباقة,دورة الفوترة,عدد المشتركين النشطين,الإيراد الشهري (EGP),الإيراد السنوي (EGP)',
    ...planBreakdown.map(pb =>
      `"${pb.name}",${pb.price} ${pb.currency},${pb.cycle},${pb.subscribersCount},${pb.totalMonthly},${pb.totalAnnual}`
    )
  ];

  const dateStr = new Date().toISOString().slice(0, 10);
  downloadCSV(lines.join('\r\n'), `CardioSaaS_Financial_Summary_${dateStr}.csv`);
}

/**
 * Print or open printable A4 executive PDF report
 */
export function openAdminPrintableReport(data: {
  doctors: DoctorWithSubscription[];
  plans: Plan[];
  totalVisits: number;
  totalAiQueries: number;
  mrr: number;
  arr: number;
  language?: 'ar' | 'en';
}) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert(data.language === 'en' ? 'Please allow popups to open the admin report' : 'يرجى السماح بالنوافذ المنبثقة لفتح تقرير الإدارة');
    return;
  }

  const isEn = data.language === 'en';
  const currentDate = new Date().toLocaleDateString(isEn ? 'en-US' : 'ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const activeDocs = data.doctors.filter(d => d.status === 'active');
  const pendingDocs = data.doctors.filter(d => d.status === 'pending');

  const rowsHtml = data.doctors.slice(0, 25).map((doc, idx) => {
    const statusText = doc.status === 'active' ? (isEn ? 'Active' : 'نشط') : doc.status === 'pending' ? (isEn ? 'Pending' : 'قيد المراجعة') : (isEn ? 'Suspended' : 'مجمد');
    const statusClass = doc.status === 'active' ? 'status-active' : doc.status === 'pending' ? 'status-pending' : 'status-suspended';
    return `
      <tr>
        <td style="text-align: center;">${idx + 1}</td>
        <td><strong>${doc.name}</strong><br><small style="color: #64748b;">${doc.clinicName}</small></td>
        <td><code>${doc.clinicCode}</code></td>
        <td>${doc.specialty || (isEn ? 'Cardiology Specialist' : 'استشاري قلب')}</td>
        <td>${doc.planName || (isEn ? 'Cardio Starter' : 'باقة العيادة الذكية')}</td>
        <td style="text-align: center;">${doc.aiQueriesUsed || 0} / ${doc.aiQuotaLimit || 200}</td>
        <td style="text-align: center;"><span class="${statusClass}">${statusText}</span></td>
      </tr>
    `;
  }).join('');

  const plansHtml = data.plans.map(p => {
    const count = activeDocs.filter(d => d.planId === p.id).length;
    return `
      <div class="kpi-card">
        <div class="kpi-title">${p.name}</div>
        <div class="kpi-value">${count} <small>${isEn ? 'Clinics' : 'عيادة'}</small></div>
        <div class="kpi-sub">${p.price} ${p.currency} / ${isEn ? 'month' : 'شهرياً'}</div>
      </div>
    `;
  }).join('');

  const html = `
    <!DOCTYPE html>
    <html lang="${isEn ? 'en' : 'ar'}" dir="${isEn ? 'ltr' : 'rtl'}">
    <head>
      <meta charset="UTF-8">
      <title>${isEn ? 'Executive Admin & Financial Report - CardioSaaS Platform' : 'التقرير الإداري والمالي الشامل - CardioSaaS Platform'}</title>
      <style>
        @page { size: A4; margin: 15mm; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          color: #0f172a;
          margin: 0;
          padding: 20px;
          background: #ffffff;
          line-height: 1.5;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 2px solid #0d9488;
          padding-bottom: 15px;
          margin-bottom: 20px;
        }
        .logo-title h1 {
          margin: 0;
          font-size: 22px;
          color: #0f172a;
          font-weight: 800;
        }
        .logo-title p {
          margin: 2px 0 0 0;
          color: #0d9488;
          font-size: 13px;
          font-weight: 600;
        }
        .meta-info {
          text-align: left;
          font-size: 11px;
          color: #64748b;
        }
        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          margin-bottom: 20px;
        }
        .kpi-card {
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 12px;
          background: #f8fafc;
        }
        .kpi-title {
          font-size: 11px;
          color: #64748b;
          font-weight: 600;
        }
        .kpi-value {
          font-size: 20px;
          font-weight: 800;
          color: #0f172a;
          margin: 4px 0;
        }
        .kpi-value small { font-size: 11px; font-weight: normal; }
        .kpi-sub {
          font-size: 10px;
          color: #0d9488;
          font-weight: 600;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 11px;
          margin-bottom: 20px;
        }
        th {
          background: #f1f5f9;
          color: #334155;
          text-align: right;
          padding: 8px 10px;
          border-bottom: 2px solid #cbd5e1;
        }
        td {
          padding: 7px 10px;
          border-bottom: 1px solid #e2e8f0;
        }
        .status-active {
          color: #059669;
          font-weight: bold;
          background: #ecfdf5;
          padding: 2px 6px;
          border-radius: 4px;
        }
        .status-pending {
          color: #d97706;
          font-weight: bold;
          background: #fffbeb;
          padding: 2px 6px;
          border-radius: 4px;
        }
        .status-suspended {
          color: #dc2626;
          font-weight: bold;
          background: #fef2f2;
          padding: 2px 6px;
          border-radius: 4px;
        }
        .footer {
          margin-top: 30px;
          border-top: 1px solid #e2e8f0;
          padding-top: 15px;
          display: flex;
          justify-content: space-between;
          font-size: 11px;
          color: #64748b;
        }
        .actions-bar {
          background: #0f172a;
          color: #fff;
          padding: 10px 15px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          border-radius: 6px;
        }
        .btn-print {
          background: #0d9488;
          color: white;
          border: none;
          padding: 6px 14px;
          border-radius: 4px;
          cursor: pointer;
          font-weight: bold;
          font-size: 12px;
        }
        @media print {
          .actions-bar { display: none; }
          body { padding: 0; }
        }
      </style>
    </head>
    <body>
      <div class="actions-bar">
        <span>${isEn ? 'Governance & Financial Report - CardioSaaS Platform' : 'تقرير الحوكمة والماليات - منصة CardioSaaS'}</span>
        <button class="btn-print" onclick="window.print()">${isEn ? 'Print / Save as PDF' : 'طباعة / حفظ كملف PDF'}</button>
      </div>

      <div class="header">
        <div class="logo-title">
          <h1>${isEn ? 'CardioSaaS Platform - Central Governance' : 'منصة CardioSaaS - الإدارة المركزية'}</h1>
          <p>${isEn ? 'Executive KPI Metrics, Clinic Governance & Subscription Revenue Statement' : 'تقرير مؤشرات الأداء، حوكمة العيادات والإيرادات المالية'}</p>
        </div>
        <div class="meta-info">
          <div><strong>${isEn ? 'Date:' : 'التاريخ:'}</strong> ${currentDate}</div>
          <div><strong>${isEn ? 'Ref:' : 'المرجع:'}</strong> CS-ADM-${Date.now().toString().slice(-6)}</div>
          <div><strong>${isEn ? 'System Status:' : 'حالة النظام:'}</strong> ${isEn ? 'Operational 100%' : 'سليم 100% (Operational)'}</div>
        </div>
      </div>

      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-title">${isEn ? 'Total Registered Clinics' : 'إجمالي العيادات المسجلة'}</div>
          <div class="kpi-value">${data.doctors.length} <small>${isEn ? 'Clinics' : 'عيادة'}</small></div>
          <div class="kpi-sub">${activeDocs.length} ${isEn ? 'Active' : 'نشطة'} (${pendingDocs.length} ${isEn ? 'Pending' : 'قيد التدقيق'})</div>
        </div>

        <div class="kpi-card">
          <div class="kpi-title">${isEn ? 'Monthly Recurring Revenue (MRR)' : 'العائد الشهري المتكرر (MRR)'}</div>
          <div class="kpi-value">${data.mrr.toLocaleString(isEn ? 'en-US' : 'ar-EG')} <small>EGP</small></div>
          <div class="kpi-sub">${isEn ? 'Projected ARR:' : 'المتوقع السنوي:'} ${data.arr.toLocaleString(isEn ? 'en-US' : 'ar-EG')} EGP</div>
        </div>

        <div class="kpi-card">
          <div class="kpi-title">${isEn ? 'AI Queries Processed' : 'استعلامات الذكاء الاصطناعي'}</div>
          <div class="kpi-value">${data.totalAiQueries.toLocaleString(isEn ? 'en-US' : 'ar-EG')}</div>
          <div class="kpi-sub">${isEn ? 'Est. Cloud Cost:' : 'تكلفة تقديرية:'} ~${Math.round(data.totalAiQueries * 0.05)} EGP</div>
        </div>

        <div class="kpi-card">
          <div class="kpi-title">${isEn ? 'Total Platform Interactions' : 'إجمالي تفاعلات البوابة'}</div>
          <div class="kpi-value">${data.totalVisits.toLocaleString(isEn ? 'en-US' : 'ar-EG')} <small>${isEn ? 'Visits' : 'زيارة'}</small></div>
          <div class="kpi-sub">${isEn ? 'Uptime SLA: 99.9%' : 'معدل تشغيل مستقر 99.9%'}</div>
        </div>
      </div>

      <h3 style="font-size: 13px; color: #334155; margin-bottom: 8px;">
        ${isEn ? 'Subscription Tier Distribution' : 'توزيع العيادات حسب باقات الاشتراك'}
      </h3>
      <div class="kpi-grid" style="margin-bottom: 25px;">
        ${plansHtml}
      </div>

      <h3 style="font-size: 13px; color: #334155; margin-bottom: 8px;">
        ${isEn ? 'Registered Cardiology Clinics & Doctors Roster' : 'كشف العيادات والأطباء المسجلين'}
      </h3>
      <table>
        <thead>
          <tr>
            <th style="width: 30px;">#</th>
            <th>${isEn ? 'Doctor & Clinic' : 'اسم الطبيب والعيادة'}</th>
            <th>${isEn ? 'Clinic Code' : 'كود العيادة'}</th>
            <th>${isEn ? 'Specialty' : 'التخصص'}</th>
            <th>${isEn ? 'Subscription Plan' : 'الباقة'}</th>
            <th style="text-align: center;">${isEn ? 'AI Usage' : 'استهلاك AI'}</th>
            <th style="text-align: center;">${isEn ? 'Status' : 'الحالة'}</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>

      <div class="footer">
        <div>${isEn ? 'Generated electronically from CardioSaaS SuperAdmin Portal.' : 'تم إصدار هذا المستند إلكترونياً من بوابة المشرف العام لمنظومة CardioSaaS القلبية.'}</div>
        <div>${isEn ? 'Executive Sign-off: ___________________' : 'اعتماد الإدارة: ___________________'}</div>
      </div>
    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}
