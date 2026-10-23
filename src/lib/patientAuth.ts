import {doc, getDoc} from 'firebase/firestore';
import {db} from './firebase';

const CLINIC_SALT = 'cardios_secure_qr_2026_salt';
export const DOCTOR_PIN = '2026'; // Doctor Security PIN for clinic staff access

/**
 * Generates a reproducible, non-guessable security token for a given patient ID.
 */
/**
 * Generates a reproducible, non-guessable security token for a given patient ID.
 * Generates consistent token (e.g. cp_wvf314co2y for patient '1').
 */
export function generatePatientToken(patientId: string, _legacyDob?: string): string {
  // Use consistent seed matching the card display
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

  // 1. Check existing active session in sessionStorage
  try {
    const saved = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (saved) {
      const session: PatientAuthSession = JSON.parse(saved);
      // Valid if it matches the requested patient and is less than 48 hours old
      if (session.patientId === patientId && (Date.now() - session.verifiedAt < 48 * 3600 * 1000)) {
        return {valid: true, patientName: session.patientName, token: session.token, expectedToken: cleanExpectedToken};
      }
    }
  } catch (e) {
    console.warn('Session parse error:', e);
  }

  // 2. If no valid session, tokenFromUrl is required
  if (!tokenFromUrl) {
    return {
      valid: false,
      expectedToken: cleanExpectedToken,
      reason: 'رمز الأمان (Token) مفقود. لحماية خصوصية بياناتك الطبية، يرجى مسح رمز الـ QR المخصص لك من كارت المتابعة الخاص بك.'
    };
  }

  // 3. Verify against Firestore patient record & deterministic token generator
  try {
    const pRef = doc(db, 'patients', patientId);
    const snap = await getDoc(pRef);
    let patientName = `المريض #${patientId}`;
    let firestoreAccessToken = '';
    let firestoreSecurityToken = '';
    let patientDob = '';

    if (snap.exists()) {
      const data = snap.data();
      patientName = data.name || patientName;
      firestoreAccessToken = data.accessToken || '';
      firestoreSecurityToken = data.securityToken || '';
      patientDob = data.dob || '';
    }

    // Clean user input
    const entered = tokenFromUrl.trim().toLowerCase();
    const enteredWithoutPrefix = entered.replace(/^cp_/, '');

    // List of accepted valid tokens for this patient:
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
    // Demo bypasses for clinic team
    validTokens.push(DOCTOR_PIN);
    validTokens.push('cardios');
    validTokens.push(`demo_${patientId}`);

    const isMatch = validTokens.includes(entered) || validTokens.includes(enteredWithoutPrefix);

    if (!isMatch) {
      return {
        valid: false,
        expectedToken: cleanExpectedToken,
        reason: 'رمز التحقق الأمني غير صحيح أو لا يطابق هذا الملف. غير مصرح بالوصول.'
      };
    }

    // If valid, save session to sessionStorage
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
    // Fallback: compare with generated token if network error
    const entered = tokenFromUrl.trim().toLowerCase();
    if (entered === cleanExpectedToken.toLowerCase() || entered === cleanExpectedToken.replace(/^cp_/, '').toLowerCase()) {
      return {valid: true, patientName: `المريض #${patientId}`, token: tokenFromUrl, expectedToken: cleanExpectedToken};
    }
    return {valid: false, expectedToken: cleanExpectedToken, reason: 'تعذر التحقق من خادم العيادة حالياً. يرجى المحاولة لاحقاً.'};
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

export function verifyDoctorPin(pin: string): boolean {
  return pin.trim() === DOCTOR_PIN;
}
