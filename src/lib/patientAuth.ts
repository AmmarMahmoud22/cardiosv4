import {doc, getDoc} from 'firebase/firestore';
import {signInWithCustomToken} from 'firebase/auth';
import {auth, db} from './firebase';

const SESSION_STORAGE_KEY = 'cardios_patient_session';
const DOCTOR_SESSION_KEY = 'cardios_doctor_authenticated';

/**
 * Creates a random, unguessable card token (128 bits). It is stored on the
 * patient record and checked by the server. Nothing is derived from the patient id.
 */
export function generatePatientToken(_patientId?: string): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return 'cp_' + Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** A card token issued by this version is at least 20 characters long. */
export function isStrongPatientToken(token: unknown): token is string {
  return typeof token === 'string' && token.length >= 20;
}

export interface PatientAuthSession {
  patientId: string;
  patientName: string;
  verifiedAt: number;
}

export interface PatientAccessResult {
  valid: boolean;
  reason?: string;
  patientName?: string;
}

async function currentPatientClaim(): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;
  try {
    const res = await user.getIdTokenResult();
    return res.claims.role === 'patient' ? String(res.claims.patientId || '') : null;
  } catch {
    return null;
  }
}

/**
 * Opens a patient session. The card token is checked on the server, which
 * returns a sign-in token limited to this one patient. Firestore rules then
 * allow that session to read only this patient's own records.
 */
export async function verifyPatientAccess(
  patientId: string,
  tokenFromUrl?: string | null
): Promise<PatientAccessResult> {
  if (!patientId) {
    return {valid: false, reason: 'معرف المريض مفقود.'};
  }

  // 1. An already signed-in patient session for this same file.
  if ((await currentPatientClaim()) === patientId) {
    try {
      const snap = await getDoc(doc(db, 'patients', patientId));
      if (snap.exists()) return {valid: true, patientName: snap.data().name || ''};
    } catch (e) {
      console.warn('Session check error:', e);
    }
  }

  // 2. Otherwise a card token is required.
  const token = (tokenFromUrl || '').trim();
  if (!token) {
    return {
      valid: false,
      reason: 'رمز الأمان مفقود. لحماية خصوصية بياناتك الطبية، امسح رمز الـ QR المطبوع على كارت المتابعة أو أدخل الرمز المكتوب عليه.'
    };
  }

  try {
    const res = await fetch('/api/patient-login', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({patientId, token})
    });
    if (res.status === 429) {
      return {valid: false, reason: 'محاولات كثيرة. انتظر عدة دقائق ثم حاول مرة أخرى.'};
    }
    if (res.status === 400 || res.status === 401) {
      return {
        valid: false,
        reason: 'رقم الملف أو الرمز غير صحيح. إذا كان الكارت قديماً اطلب من العيادة إصدار كارت جديد.'
      };
    }
    if (!res.ok) {
      return {valid: false, reason: 'تعذر التحقق من خادم العيادة حالياً. يرجى المحاولة لاحقاً.'};
    }
    const data = await res.json();
    await signInWithCustomToken(auth, data.customToken);
    const session: PatientAuthSession = {
      patientId,
      patientName: data.patientName || '',
      verifiedAt: Date.now()
    };
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    return {valid: true, patientName: data.patientName || ''};
  } catch (err) {
    console.error('Verification error:', err);
    return {valid: false, reason: 'تعذر التحقق من خادم العيادة حالياً. يرجى المحاولة لاحقاً.'};
  }
}

/**
 * Doctor authentication helpers
 */
export function isDoctorAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  return sessionStorage.getItem(DOCTOR_SESSION_KEY) === 'true';
}

export function setDoctorAuthenticated(auth: boolean) {
  if (typeof window === 'undefined') return;
  if (auth) {
    sessionStorage.setItem(DOCTOR_SESSION_KEY, 'true');
  } else {
    sessionStorage.removeItem(DOCTOR_SESSION_KEY);
  }
}
