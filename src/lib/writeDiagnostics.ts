import {doc, getDoc} from 'firebase/firestore';
import {auth, db} from './firebase';

/**
 * Builds a short, non-secret explanation for a failed save: the Firebase error code plus
 * read-only checks of the identity link the security rules depend on. It never writes data
 * and never prints tokens or full ids.
 */
export async function describeWriteError(err: any, patientId?: string): Promise<string> {
  const code = String(err?.code || err?.name || 'unknown').replace('firestore/', '');
  const short = (v: string) => (v ? v.slice(0, 6) + '…' : '-');
  const parts: string[] = ['رمز الخطأ: ' + code];
  const uid = auth.currentUser?.uid || '';
  parts.push('الدخول: ' + (uid ? short(uid) : 'لا توجد جلسة'));
  if (uid) {
    try {
      parts.push('سجل الطبيب: ' + ((await getDoc(doc(db, 'doctors', uid))).exists() ? 'موجود' : 'غير موجود'));
    } catch (e: any) {
      parts.push('سجل الطبيب: تعذر قراءته (' + String(e?.code || 'خطأ').replace('firestore/', '') + ')');
    }
  }
  if (patientId) {
    try {
      const snap = await getDoc(doc(db, 'patients', patientId));
      if (!snap.exists()) {
        parts.push('ملف المريض: غير موجود');
      } else {
        const owner = String((snap.data() as any)?.doctorId || '');
        parts.push('ملف المريض: موجود، المالك ' + (owner && owner === uid ? 'مطابق للدخول' : 'مختلف (' + short(owner) + ')'));
      }
    } catch (e: any) {
      parts.push('ملف المريض: تعذر قراءته (' + String(e?.code || 'خطأ').replace('firestore/', '') + ')');
    }
  }
  return parts.join(' | ');
}
