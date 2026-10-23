import i18n from 'i18next';
import {initReactI18next} from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: {
          dashboard: "Doctor's Dashboard",
          activePatients: "Active Patients",
          pendingLab: "Pending Lab Results",
          rpmAlerts: "RPM Alerts",
          appointments: "Today's Appointments",
          patientOverview: "Patient Overview",
          viewProfile: "View Profile",
          back: "Back to Dashboard"
        }
      },
      ar: {
        translation: {
          dashboard: "لوحة تحكم الطبيب",
          activePatients: "المرضى النشطون",
          pendingLab: "نتائج التحاليل المعلقة",
          rpmAlerts: "تنبيهات المتابعة",
          appointments: "مواعيد اليوم",
          patientOverview: "نظرة عامة على المرضى",
          viewProfile: "عرض الملف",
          back: "العودة للوحة التحكم"
        }
      }
    },
    fallbackLng: 'en',
    interpolation: {escapeValue: false}
  });

export default i18n;
