import {collection, doc, getDoc, getDocsFromServer, limit, orderBy, query} from 'firebase/firestore';
import {auth, db} from './firebase';

/**
 * Builds a short, non-secret explanation for a failed save: the Firebase error code plus
 * read-only checks of the identity link the security rules depend on. It never writes data
 * and never prints tokens. It prints the patient document id (not a secret).
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
    parts.push('رقم الملف: ' + patientId);
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
  if (patientId && code === 'فحص بدون حفظ') {
    try {
      const q = query(collection(db, 'patients', patientId, 'prescriptions'), orderBy('createdAt', 'desc'), limit(3));
      const snap: any = await Promise.race([
        getDocsFromServer(q),
        new Promise((_, rej) => setTimeout(() => rej({ code: 'مهلة 8 ثوان بدون رد' }), 8000)),
      ]);
      if (snap.empty) {
        parts.push('الروشتات من السيرفر: 0');
      } else {
        const d: any = snap.docs[0].data();
        const first = Array.isArray(d.medications) && d.medications[0] ? String(d.medications[0].name || '-').slice(0, 30) : '-';
        parts.push('الروشتات من السيرفر: ' + snap.size + '، الأحدث ' + String(d.createdAt || '-') + '، أول دواء: ' + first);
      }
    } catch (e: any) {
      parts.push('الروشتات من السيرفر: تعذر القراءة (' + String(e?.code || 'خطأ').replace('firestore/', '') + ')');
    }
  }
  return parts.join(' | ');
}
