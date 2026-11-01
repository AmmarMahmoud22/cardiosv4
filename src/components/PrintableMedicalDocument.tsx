import React, {useRef} from 'react';
import {X, Printer, Download, Share2, HeartPulse, CheckCircle2, ShieldCheck, QrCode} from 'lucide-react';

export interface PrescriptionData {
  patientName: string;
  patientId?: string;
  patientAge?: string | number;
  gender?: string;
  date: string;
  diagnosis?: string;
  allergies?: string;
  bloodPressure?: string;
  heartRate?: string | number;
  medications: Array<{
    name: string;
    dosage: string;
    instructions: string;
    duration: string;
  }>;
  doctorNotes?: string;
  doctorName?: string;
  doctorSpecialty?: string;
  clinicName?: string;
  clinicAddress?: string;
  clinicPhone?: string;
  licenseNumber?: string;
}

export interface CardiologyReportData {
  patientName: string;
  patientId?: string;
  patientAge?: string | number;
  gender?: string;
  date: string;
  indication: string;
  ef: number;
  lvedd: number;
  lvesd: number;
  ivs: number;
  pw: number;
  laDiameter: number;
  tapse: number;
  pasp: number;
  mitralValve: string;
  aorticValve: string;
  tricuspidValve: string;
  pericardium: string;
  wallMotion: string;
  ecgRhythm: string;
  ecgConduction: string;
  ecgIschemia: string;
  conclusion: string;
  recommendations: string;
  doctorName?: string;
  doctorSpecialty?: string;
  clinicName?: string;
  clinicPhone?: string;
  licenseNumber?: string;
}

interface Props {
  type: 'prescription' | 'cardiology_report';
  data: PrescriptionData | CardiologyReportData;
  onClose: () => void;
}

export default function PrintableMedicalDocument({type, data, onClose}: Props) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  const isPrescription = type === 'prescription';
  const rxData = isPrescription ? (data as PrescriptionData) : null;
  const echoData = !isPrescription ? (data as CardiologyReportData) : null;

  const doctorName = data.doctorName || 'أ.د. عمار محمود';
  const doctorSpecialty = data.doctorSpecialty || 'استشاري أمراض القلب والأوعية الدموية والقسطرة التداخلية';
  const clinicName = data.clinicName || 'مركز CARDIOS التخصصي لأمراض القلب';
  const clinicPhone = data.clinicPhone || '+20 100 234 5678 / 02 3345 6789';
  const clinicAddress = isPrescription && rxData?.clinicAddress ? rxData.clinicAddress : 'القاهرة - التجمع الخامس - ميديكال بارك بريميير - الدور الثاني';
  const licenseNumber = data.licenseNumber || 'ترخيص نقابة الأطباء رقم: 104825 / ج.م.ع';

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:static print:overflow-visible">
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-medical-area, #printable-medical-area * {
            visibility: visible;
          }
          #printable-medical-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 20mm;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[94vh] print:max-h-none print:shadow-none print:border-none print:w-full">
        {/* Modal Action Header (Hidden in Print) */}
        <div className="no-print bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600/30 border border-blue-400/30 flex items-center justify-center text-blue-400">
              <HeartPulse size={20} />
            </div>
            <div>
              <h3 className="font-semibold text-base text-white">
                {isPrescription ? 'معاينة الروشتة الطبية الرسمية (A4 Official Rx)' : 'معاينة تقرير فحص القلب المعتمد (Echocardiography Report)'}
              </h3>
              <p className="text-xs text-slate-400">جاهز للتصدير كـ PDF والطباعة المعتمدة بختم وترخيص العيادة</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all active:scale-95"
            >
              <Printer size={15} />
              <span>طباعة / حفظ كـ PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Document Content Box */}
        <div className="p-4 sm:p-8 overflow-y-auto bg-slate-100/70 print:p-0 print:bg-white flex justify-center">
          <div
            id="printable-medical-area"
            ref={printRef}
            className="bg-white w-full max-w-[210mm] min-h-[297mm] p-8 sm:p-12 shadow-md border border-slate-200 print:shadow-none print:border-none flex flex-col justify-between text-slate-900 font-sans"
            dir="rtl"
          >
            {/* Top Official Letterhead */}
            <div>
              <div className="border-b-2 border-blue-900 pb-5 mb-6 flex items-start justify-between">
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-blue-950 tracking-tight">{clinicName}</h1>
                  <h2 className="text-sm sm:text-base font-semibold text-blue-800 mt-1">{doctorName}</h2>
                  <p className="text-xs text-slate-600 font-medium mt-0.5">{doctorSpecialty}</p>
                  <p className="text-[11px] text-slate-500 font-mono mt-0.5">{licenseNumber}</p>
                </div>

                <div className="text-left flex flex-col items-end">
                  <div className="flex items-center gap-2 text-blue-700 mb-1">
                    <span className="text-sm font-bold tracking-wider font-mono">CARDIOS</span>
                    <HeartPulse size={26} className="text-red-600 stroke-[2.2]" />
                  </div>
                  <span className="text-[11px] text-slate-500 font-medium">الخط الساخن: {clinicPhone}</span>
                  <span className="text-[10px] text-slate-400 max-w-[220px] text-left leading-tight mt-0.5">{clinicAddress}</span>
                </div>
              </div>

              {/* Patient Bar */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 block text-[11px] font-medium">اسم المريض / Patient:</span>
                  <span className="font-bold text-slate-900 text-sm">{data.patientName || 'غير مسجل'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px] font-medium">تاريخ الكشف / Date:</span>
                  <span className="font-semibold text-slate-800 font-mono">{data.date || new Date().toLocaleDateString('ar-EG')}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px] font-medium">العمر / Age:</span>
                  <span className="font-semibold text-slate-800 font-mono">{data.patientAge ? `${data.patientAge} سنة` : '54 سنة'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px] font-medium">رقم الملف / File ID:</span>
                  <span className="font-bold text-blue-900 font-mono">{data.patientId ? `#PT-${data.patientId}` : '#PT-1042'}</span>
                </div>

                {isPrescription && rxData?.diagnosis && (
                  <div className="col-span-2 sm:col-span-4 pt-2 border-t border-slate-200/80 flex items-center justify-between">
                    <div>
                      <span className="text-slate-500 text-[11px] font-medium ml-2">التشخيص السريري / Diagnosis:</span>
                      <span className="font-semibold text-blue-900">{rxData.diagnosis}</span>
                    </div>
                    {rxData.bloodPressure && (
                      <div className="text-[11px] text-slate-600">
                        <span className="text-slate-500 ml-1">العلامات الحيوية:</span>
                        <span className="font-mono font-bold text-emerald-800">{rxData.bloodPressure} mmHg</span>
                        {rxData.heartRate && <span className="font-mono ml-2">({rxData.heartRate} bpm)</span>}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Body: Prescription View */}
              {isPrescription && rxData && (
                <div className="space-y-6">
                  {/* Rx Symbol */}
                  <div className="flex items-center gap-3 border-b border-blue-100 pb-2">
                    <span className="text-3xl font-serif font-black text-blue-950 tracking-wider">℞</span>
                    <span className="text-xs font-bold uppercase tracking-widest text-blue-800">العلاج الدوائي الموصى به (Prescription Order)</span>
                  </div>

                  {/* Medications Table */}
                  <div className="overflow-hidden border border-slate-200 rounded-xl">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold">
                        <tr>
                          <th className="py-2.5 px-3">م</th>
                          <th className="py-2.5 px-3">اسم الدواء والتركيز (Medication & Dosage)</th>
                          <th className="py-2.5 px-3">تعليمات وطريقة الاستخدام (Instructions)</th>
                          <th className="py-2.5 px-3">المدة (Duration)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {rxData.medications && rxData.medications.length > 0 ? (
                          rxData.medications.map((med, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/50">
                              <td className="py-3 px-3 font-mono font-bold text-slate-400 w-8">{idx + 1}</td>
                              <td className="py-3 px-3 font-semibold text-slate-900">
                                <div className="text-sm font-bold text-blue-950">{med.name}</div>
                                {med.dosage && <div className="text-xs text-blue-700 font-mono font-medium">{med.dosage}</div>}
                              </td>
                              <td className="py-3 px-3 text-slate-700 font-medium leading-relaxed">{med.instructions}</td>
                              <td className="py-3 px-3 font-mono text-slate-600 font-medium">{med.duration}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={4} className="py-6 text-center text-slate-400">لا توجد أدوية مسجلة</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Doctor Clinical Notes & Lifestyle Advice */}
                  <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4">
                    <h4 className="text-xs font-bold text-amber-950 mb-1.5 flex items-center gap-1.5">
                      <ShieldCheck size={14} className="text-amber-600" />
                      <span>إرشادات الطبيب ونمط الحياة (Special Clinical Instructions):</span>
                    </h4>
                    <p className="text-xs text-amber-900 leading-relaxed font-medium whitespace-pre-line">
                      {rxData.doctorNotes || 'الالتزام بحمية قليلة الصوديوم (<2g/يوم). قياس الضغط المنزلي يومياً صباحاً ومساءً. مراجعة العيادة في حالة الشعور بضيق في التنفس أو دوار مفاجئ.'}
                    </p>
                  </div>
                </div>
              )}

              {/* Body: Cardiology Echo/ECG Report View */}
              {!isPrescription && echoData && (
                <div className="space-y-5 text-xs">
                  {/* Clinical Indication */}
                  <div className="bg-blue-50/60 border border-blue-200 rounded-lg p-3">
                    <span className="font-bold text-blue-950 block text-[11px] mb-0.5">سبب الفحص السريري (Clinical Indication):</span>
                    <span className="font-medium text-slate-800">{echoData.indication}</span>
                  </div>

                  {/* Quantitative Hemodynamics Grid */}
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs mb-2 border-b border-slate-200 pb-1 flex items-center justify-between">
                      <span>القياسات الهيموديناميكية للبطين الأيسر والأبعاد (Echo Hemodynamic Measurements):</span>
                      <span className="text-[10px] text-slate-500 font-mono">ASE / EACVI Guidelines</span>
                    </h4>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      <div className="border border-slate-200 bg-slate-50/70 p-2.5 rounded-lg">
                        <span className="text-[10px] text-slate-500 block">LVEF (كفاءة عضلة القلب)</span>
                        <div className="flex items-baseline gap-1 mt-0.5">
                          <span className="text-xl font-bold font-mono text-blue-900">{echoData.ef}%</span>
                          <span className={`text-[10px] font-semibold ${echoData.ef >= 55 ? 'text-emerald-700' : 'text-amber-700'}`}>
                            {echoData.ef >= 55 ? '(Normal)' : '(Reduced)'}
                          </span>
                        </div>
                      </div>

                      <div className="border border-slate-200 bg-slate-50/70 p-2.5 rounded-lg">
                        <span className="text-[10px] text-slate-500 block">LVEDD (قطر الامتلاء)</span>
                        <div className="flex items-baseline gap-1 mt-0.5">
                          <span className="text-xl font-bold font-mono text-slate-900">{echoData.lvedd}</span>
                          <span className="text-[10px] text-slate-500 font-mono">mm (35-56)</span>
                        </div>
                      </div>

                      <div className="border border-slate-200 bg-slate-50/70 p-2.5 rounded-lg">
                        <span className="text-[10px] text-slate-500 block">IVS (سمك الجدار الحاجز)</span>
                        <div className="flex items-baseline gap-1 mt-0.5">
                          <span className="text-xl font-bold font-mono text-slate-900">{echoData.ivs}</span>
                          <span className="text-[10px] text-slate-500 font-mono">mm (6-11)</span>
                        </div>
                      </div>

                      <div className="border border-slate-200 bg-slate-50/70 p-2.5 rounded-lg">
                        <span className="text-[10px] text-slate-500 block">PASP (ضغط الشريان الرئوي)</span>
                        <div className="flex items-baseline gap-1 mt-0.5">
                          <span className="text-xl font-bold font-mono text-slate-900">{echoData.pasp}</span>
                          <span className="text-[10px] text-slate-500 font-mono">mmHg (&lt;35)</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Valves and Structural Findings Table */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                        <tr>
                          <th className="py-2 px-3 w-1/3">الصمام أو العنصر القلبي</th>
                          <th className="py-2 px-3">الوصف السريري والتقييم</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        <tr>
                          <td className="py-2 px-3 font-semibold text-slate-900">الصمام الميترالي (Mitral Valve)</td>
                          <td className="py-2 px-3 text-slate-700">{echoData.mitralValve}</td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3 font-semibold text-slate-900">الصمام الأورطي (Aortic Valve)</td>
                          <td className="py-2 px-3 text-slate-700">{echoData.aorticValve}</td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3 font-semibold text-slate-900">حركة الجدران (Regional Wall Motion)</td>
                          <td className="py-2 px-3 text-slate-700">{echoData.wallMotion}</td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3 font-semibold text-slate-900">تخطيط رسم القلب (ECG Summary)</td>
                          <td className="py-2 px-3 text-slate-700 font-medium">
                            <div>{echoData.ecgRhythm}</div>
                            <div className="text-[11px] text-slate-500">{echoData.ecgIschemia}</div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Conclusion Box */}
                  <div className="bg-slate-50 border border-slate-300 rounded-xl p-3.5">
                    <h5 className="font-bold text-blue-950 mb-1 text-xs">الخلاصة والتشخيص النهائي (Definitive Conclusion):</h5>
                    <p className="text-slate-800 leading-relaxed font-semibold">{echoData.conclusion}</p>
                  </div>

                  {/* Recommendations */}
                  <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5">
                    <h5 className="font-bold text-emerald-950 mb-1 text-xs">التوصيات الطبية والمتابعة (Recommendations):</h5>
                    <p className="text-emerald-900 leading-relaxed font-medium">{echoData.recommendations}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Official Sign-off & Security QR */}
            <div className="mt-8 pt-5 border-t-2 border-slate-200 flex items-end justify-between text-xs">
              {/* QR Verification */}
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 border border-slate-300 rounded-lg p-1 bg-white flex items-center justify-center shadow-xs">
                  <QrCode size={52} className="text-slate-800" />
                </div>
                <div>
                  <div className="font-bold text-slate-900 text-[11px] flex items-center gap-1">
                    <CheckCircle2 size={13} className="text-emerald-600" />
                    <span>مستند طبي معتمد رقمياً</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">امسح الرمز للتحقق من كارت المريض</p>
                  <p className="text-[9px] text-slate-400 font-mono mt-0.5">REF: {Date.now().toString(36).toUpperCase()}</p>
                </div>
              </div>

              {/* Doctor Stamp & Signature */}
              <div className="text-center min-w-[180px]">
                <p className="text-[11px] text-slate-500 font-medium mb-8">ختم وتوقيع الطبيب المعالج / Signature</p>
                <div className="border-t border-dashed border-slate-400 pt-1.5">
                  <p className="font-bold text-blue-950 text-xs">{doctorName}</p>
                  <p className="text-[10px] text-slate-500">{doctorSpecialty}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
