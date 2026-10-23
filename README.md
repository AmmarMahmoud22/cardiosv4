# Cardios: Advanced Cardiology Practice Management Platform

Cardios is an all-in-one specialized medical platform designed specifically for cardiology practices in Egypt. It modernizes clinical workflows through digital cardiology EHR, real-time remote patient monitoring (RPM), structured echocardiography reporting, and clinical AI decision support.

## Key Clinical Features

*   **Unified Cardiology EHR**: Dynamic patient records with structured intake for cardiovascular risk factors, medical history, lab values, and referral notes.
*   **Structured Echocardiography & ECG Engine**:
    *   Comprehensive 2D & M-mode chamber measurements (LVEDD, LVESD, IVS, PW, EF%, LA, TAPSE, PASP).
    *   Instant clinical presets (Normal Study, Hypertensive Heart Disease, Ischemic / Reduced EF, Atrial Fibrillation).
    *   Valvular morphology, wall motion assessment, and 12-lead ECG rhythm analysis.
    *   Official clinic letterhead print & PDF formatting with physician signature stamp.
    *   Direct WhatsApp export with structured Arabic clinical summary for patients and referring physicians.
*   **Smart Cardiology Prescription Engine**:
    *   Cardiology drug auto-complete database (Statins, Beta-blockers, ACEi, ARBs, ARNI, SGLT2i, Antiplatelets, DOACs).
    *   Standard dosage presets and patient instructions.
    *   Professional printable Rx sheet with clinic branding.
    *   One-click WhatsApp prescription export.
*   **Remote Patient Monitoring (RPM)**:
    *   Daily home vitals tracking (Systolic/Diastolic BP and Heart Rate).
    *   Interactive clinical trend visualization powered by Recharts.
    *   Real-time critical safety alerts panel for hypertensive crises and abnormal pulse.
*   **Appointment Management & WhatsApp Reminders**:
    *   Interactive weekly appointment calendar.
    *   One-click WhatsApp reminder generator for patients.
*   **Floating Cardiology AI Clinical Assistant (FAB)**:
    *   Always-accessible floating action button widget powered by Google Gemini (`gemini-3.1-flash-lite`).
    *   Multi-turn conversational clinical decision support for guidelines (AHA/ACC, ESC), drug interactions, and acute triage.
*   **Patient Mobile View**: Dedicated patient portal for logging daily vitals and checking active prescriptions.
*   **Bilingual Localization**: Seamless Arabic / English support with full RTL/LTR dynamic layout switching.

## Tech Stack

*   **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Recharts, Lucide Icons, Date-fns, i18next.
*   **AI Engine**: Google GenAI SDK (`@google/genai`) with `gemini-3.1-flash-lite`.
*   **Database**: Firebase Firestore (Enterprise Cloud NoSQL) with real-time listeners.
*   **Backend**: Node.js & Express server-side proxy (`server.ts`) for secure API integration.
