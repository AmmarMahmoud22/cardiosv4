import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  initializeFirestore,
  getFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  doc,
  getDocFromServer,
  waitForPendingWrites
} from 'firebase/firestore';
import {
  getAuth,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

export const BOOTSTRAP_ADMIN_EMAIL = '12345865amar@gmail.com';
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const databaseId = (firebaseConfig as any).firestoreDatabaseId;

function createFirestoreInstance() {
  try {
    return initializeFirestore(
      app,
      {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager()
        }),
        experimentalForceLongPolling: true
      },
      databaseId || undefined
    );
  } catch {
    try {
      return initializeFirestore(
        app,
        { experimentalForceLongPolling: true },
        databaseId || undefined
      );
    } catch {
      return databaseId ? getFirestore(app, databaseId) : getFirestore(app);
    }
  }
}

export const db = createFirestoreInstance();
export const auth = getAuth(app);

/**
 * Provisions a Firebase Auth account using an isolated secondary Firebase App
 * instance so the currently signed-in SuperAdmin or Doctor does not get logged out.
 */
export async function createSecondaryAuthUser(
  email: string,
  password: string,
  displayName?: string
): Promise<string> {
  const secondaryName = 'cardios-staff-provisioner';
  const existing = getApps().find((a) => a.name === secondaryName);
  const secondaryApp = existing || initializeApp(firebaseConfig, secondaryName);
  const secondaryAuth = getAuth(secondaryApp);
  try {
    const cred = await createUserWithEmailAndPassword(secondaryAuth, email.trim(), password);
    if (displayName && cred.user) {
      await updateProfile(cred.user, { displayName: displayName.trim() }).catch(() => {});
    }
    return cred.user.uid;
  } finally {
    await signOut(secondaryAuth).catch(() => {});
  }
}

export async function syncPendingOfflineWrites(): Promise<void> {
  if (typeof window === 'undefined' || !navigator.onLine) return;
  try {
    await waitForPendingWrites(db);
  } catch {
    // Ignore transient network interruption during reconnect
  }
}

export default app;
