import {doc, getDoc} from 'firebase/firestore';
import {db} from './firebase';

const CLINIC_SALT = 'cardios_secure_qr_2026_salt';

/**
 * Generates a reproducible, non-guessable security token for a given patient ID.
 */
export function generatePatientToken(patientId: string, _legacyDob?: string): string {
  const seed = `${patientId}_c_${CLINIC_SALT}`;
  let hash1 = 5381;
  let hash2 = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash1 = ((hash1 << 5) + hash1) + char;
    hash2 = ((hash2 << 7) - hash2) + char;
  }
  const part1 = Math.abs(hash1).toString(36).slice(0, 5);
  const part2 = Math.abs(hash2).toString(36).slice(0, 5);
  return `cp_${part1}${part2}`;
}

/**
 * Secondary helper for backwards compatibility with any tokens generated using dob
 */
function generateTokenWithDob(patientId: string, dob?: string): string {
  if (!dob) return generatePatientToken(patientId);
  const seed = `${patientId}_${dob}_${CLINIC_SALT}`;
  let hash1 = 5381;
  let hash2 = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash1 = ((hash1 << 5) + hash1) + char;
    hash2 = ((hash2 << 7) - hash2) + char;
  }
  const part1 = Math.abs(hash1).toString(36).slice(0, 5);
  const part2 = Math.abs(hash2).toString(36).slice(0, 5);
  return `cp_${part1}${part2}`;
}

const SESSION_STORAGE_KEY = 'cardios_patient_session';
const DOCTOR_SESSION_KEY = 'cardios_doctor_authenticated';

export interface PatientAuthSession {
  patientId: string;
  token: string;
  patientName: string;
  verifiedAt: number;
}

/**
 * Verifies if the current patient session or token from URL is valid.
 */
export async function verifyPatientAccess(
  patientId: string,
  tokenFromUrl?: string | null
): Promise<{
  valid: boolean;
  reason?: string;
  patientName?: string;
  token?: string;
  expectedToken?: string;
}> {
  if (!patientId) {
    return {valid: false, reason: 'معرف المريض مفقود.'};
  }

  const cleanExpectedToken = generatePatientToken(patientId);

  // 1. Verify active session only if the patient still exists in Firestore
  try {
    const saved = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (saved) {
      const session: PatientAuthSession = JSON.parse(saved);
      if (session.patientId === patientId && (Date.now() - session.verifiedAt < 48 * 3600 * 1000)) {
        const pSnap = await getDoc(doc(db, 'patients', patientId));
        if (pSnap.exists()) {
          return {
            valid: true,
            patientName: pSnap.data().name || session.patientName,
            token: session.token,
            expectedToken: cleanExpectedToken
          };
        }
        sessionStorage.removeItem(SESSION_STORAGE_KEY);
      }
    }
  } catch (e) {
    console.warn('Session check error:', e);
  }

  // 2. Token is required when no valid active session exists
  if (!tokenFromUrl) {
    return {
      valid: false,
      expectedToken: cleanExpectedToken,
      reason: 'رمز الأمان (Token) مفقود. لحماية خصوصية بياناتك الطبية، يرجى مسح رمز الـ QR المخصص لك من كارت المتابعة الخاص بك.'
    };
  }

  // 3. Strict verification against existing Firestore patient record
  try {
    const pRef = doc(db, 'patients', patientId);
    const snap = await getDoc(pRef);

    if (!snap.exists()) {
      return {
        valid: false,
        expectedToken: cleanExpectedToken,
        reason: `لا يوجد ملف طبي مسجل برقم (#${patientId}). يرجى مراجعة العيادة.`
      };
    }

    const data = snap.data();
    const patientName = data.name || `المريض #${patientId}`;
    const firestoreAccessToken = data.accessToken || '';
    const firestoreSecurityToken = data.securityToken || '';
    const patientDob = data.dob || '';

    const entered = tokenFromUrl.trim().toLowerCase();
    const enteredWithoutPrefix = entered.replace(/^cp_/, '');

    const validTokens: string[] = [
      cleanExpectedToken.toLowerCase(),
      cleanExpectedToken.replace(/^cp_/, '').toLowerCase(),
      generateTokenWithDob(patientId, patientDob).toLowerCase(),
      generateTokenWithDob(patientId, patientDob).replace(/^cp_/, '').toLowerCase()
    ];

    if (firestoreAccessToken) {
      validTokens.push(firestoreAccessToken.toLowerCase());
      validTokens.push(firestoreAccessToken.replace(/^cp_/, '').toLowerCase());
    }
    if (firestoreSecurityToken) {
      validTokens.push(firestoreSecurityToken.toLowerCase());
      validTokens.push(firestoreSecurityToken.replace(/^cp_/, '').toLowerCase());
    }

    const isMatch = validTokens.includes(entered) || validTokens.includes(enteredWithoutPrefix);

    if (!isMatch) {
      return {
        valid: false,
        expectedToken: cleanExpectedToken,
        reason: 'رمز التحقق الأمني غير صحيح أو لا يطابق هذا الملف. غير مصرح بالوصول.'
      };
    }

    const newSession: PatientAuthSession = {
      patientId,
      token: tokenFromUrl,
      patientName,
      verifiedAt: Date.now()
    };
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(newSession));

    return {valid: true, patientName, token: tokenFromUrl, expectedToken: cleanExpectedToken};
  } catch (err) {
    console.error('Verification error:', err);
    return {
      valid: false,
      expectedToken: cleanExpectedToken,
      reason: 'تعذر التحقق من خادم العيادة حالياً. يرجى المحاولة لاحقاً.'
    };
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
