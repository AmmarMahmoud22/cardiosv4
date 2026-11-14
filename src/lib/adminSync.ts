import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where
} from 'firebase/firestore';
import { db } from './firebase';
import { SEED_DOCTORS, SEED_LABS } from './seed';

export interface SeedFlags {
  doctorsSeeded: boolean;
  labsSeeded: boolean;
  systemUsersSeeded: boolean;
  deletedIds: string[];
}

const KEYS = {
  doctorsSeeded: 'cardios_doctors_seeded',
  labsSeeded: 'cardios_labs_seeded',
  systemUsersSeeded: 'cardios_system_users_seeded',
  deletedIds: 'cardios_deleted_ids',
  pendingDoctors: 'cardios_local_pending_doctors',
  pendingLabs: 'cardios_local_pending_labs'
};

export function getLocalDeletedIds(): string[] {
  try {
    const raw = localStorage.getItem(KEYS.deletedIds);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function addLocalDeletedIds(ids: string[]): string[] {
  const existing = new Set(getLocalDeletedIds());
  ids.filter(Boolean).forEach((id) => existing.add(id));
  const merged = Array.from(existing);
  try {
    localStorage.setItem(KEYS.deletedIds, JSON.stringify(merged));
  } catch {
    // ignore storage quota errors
  }
  return merged;
}

export function getLocalSeedFlags(): SeedFlags {
  try {
    return {
      doctorsSeeded: localStorage.getItem(KEYS.doctorsSeeded) === 'true',
      labsSeeded: localStorage.getItem(KEYS.labsSeeded) === 'true',
      systemUsersSeeded: localStorage.getItem(KEYS.systemUsersSeeded) === 'true',
      deletedIds: getLocalDeletedIds()
    };
  } catch {
    return {
      doctorsSeeded: false,
      labsSeeded: false,
      systemUsersSeeded: false,
      deletedIds: []
    };
  }
}

export async function getSeedFlags(): Promise<SeedFlags> {
  const local = getLocalSeedFlags();
  try {
    const snap = await getDoc(doc(db, 'system_config', 'seed_flags'));
    if (snap.exists()) {
      const data = snap.data() as Partial<SeedFlags>;
      const mergedDeleted = Array.from(
        new Set([...(local.deletedIds || []), ...(Array.isArray(data.deletedIds) ? data.deletedIds : [])])
      );
      const result: SeedFlags = {
        doctorsSeeded: Boolean(local.doctorsSeeded || data.doctorsSeeded),
        labsSeeded: Boolean(local.labsSeeded || data.labsSeeded),
        systemUsersSeeded: Boolean(local.systemUsersSeeded || data.systemUsersSeeded),
        deletedIds: mergedDeleted
      };
      try {
        if (result.doctorsSeeded) localStorage.setItem(KEYS.doctorsSeeded, 'true');
        if (result.labsSeeded) localStorage.setItem(KEYS.labsSeeded, 'true');
        if (result.systemUsersSeeded) localStorage.setItem(KEYS.systemUsersSeeded, 'true');
        localStorage.setItem(KEYS.deletedIds, JSON.stringify(result.deletedIds));
      } catch {
        // ignore
      }
      return result;
    }
  } catch (err) {
    console.warn('Error fetching seed_flags:', err);
  }
  return local;
}

export async function markSeedFlags(update: {
  doctorsSeeded?: boolean;
  labsSeeded?: boolean;
  systemUsersSeeded?: boolean;
  addDeletedIds?: string[];
}): Promise<void> {
  try {
    if (update.doctorsSeeded) localStorage.setItem(KEYS.doctorsSeeded, 'true');
    if (update.labsSeeded) localStorage.setItem(KEYS.labsSeeded, 'true');
    if (update.systemUsersSeeded) localStorage.setItem(KEYS.systemUsersSeeded, 'true');
  } catch {
    // ignore
  }

  let mergedDeleted = getLocalDeletedIds();
  if (update.addDeletedIds && update.addDeletedIds.length > 0) {
    mergedDeleted = addLocalDeletedIds(update.addDeletedIds);
  }

  try {
    const ref = doc(db, 'system_config', 'seed_flags');
    const existing = await getDoc(ref);
    const existingData = existing.exists() ? (existing.data() as Partial<SeedFlags>) : {};
    const remoteDeleted = Array.isArray(existingData.deletedIds) ? existingData.deletedIds : [];
    const allDeleted = Array.from(new Set([...remoteDeleted, ...mergedDeleted]));

    try {
      localStorage.setItem(KEYS.deletedIds, JSON.stringify(allDeleted));
    } catch {
      // ignore
    }

    await setDoc(
      ref,
      {
        doctorsSeeded: Boolean(existingData.doctorsSeeded || update.doctorsSeeded),
        labsSeeded: Boolean(existingData.labsSeeded || update.labsSeeded),
        systemUsersSeeded: Boolean(existingData.systemUsersSeeded || update.systemUsersSeeded),
        deletedIds: allDeleted,
        updatedAt: new Date().toISOString()
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('Error updating seed_flags:', err);
  }
}

export function removeLocalPendingDoctor(id: string, email?: string, clinicCode?: string): void {
  try {
    localStorage.removeItem(`cardios_doctor_status_${id}`);
    const raw = localStorage.getItem(KEYS.pendingDoctors);
    if (!raw) return;
    const list = JSON.parse(raw);
    if (!Array.isArray(list)) return;
    const filtered = list.filter((item: any) => {
      if (item.id === id) return false;
      if (email && item.email && item.email.toLowerCase() === email.toLowerCase()) return false;
      if (clinicCode && item.clinicCode && item.clinicCode === clinicCode) return false;
      return true;
    });
    localStorage.setItem(KEYS.pendingDoctors, JSON.stringify(filtered));
  } catch {
    // ignore
  }
}

export function updateLocalPendingDoctorStatus(id: string, status: string, email?: string): void {
  try {
    localStorage.setItem(`cardios_doctor_status_${id}`, status);
    const raw = localStorage.getItem(KEYS.pendingDoctors);
    if (!raw) return;
    const list = JSON.parse(raw);
    if (!Array.isArray(list)) return;
    const updated = list.map((item: any) => {
      const match =
        item.id === id ||
        (email && item.email && item.email.toLowerCase() === email.toLowerCase());
      return match ? { ...item, status } : item;
    });
    localStorage.setItem(KEYS.pendingDoctors, JSON.stringify(updated));
  } catch {
    // ignore
  }
}

export function removeLocalPendingLab(id: string, email?: string, labCode?: string, name?: string): void {
  try {
    localStorage.removeItem(`cardios_lab_status_${id}`);
    const raw = localStorage.getItem(KEYS.pendingLabs);
    if (!raw) return;
    const list = JSON.parse(raw);
    if (!Array.isArray(list)) return;
    const filtered = list.filter((item: any) => {
      if (item.id === id) return false;
      if (email && item.email && item.email.toLowerCase() === email.toLowerCase()) return false;
      if (labCode && item.labCode && item.labCode === labCode) return false;
      if (name && item.name && item.name === name) return false;
      return true;
    });
    localStorage.setItem(KEYS.pendingLabs, JSON.stringify(filtered));
  } catch {
    // ignore
  }
}

export function updateLocalPendingLabStatus(id: string, status: string, email?: string): void {
  try {
    localStorage.setItem(`cardios_lab_status_${id}`, status);
    const raw = localStorage.getItem(KEYS.pendingLabs);
    if (!raw) return;
    const list = JSON.parse(raw);
    if (!Array.isArray(list)) return;
    const updated = list.map((item: any) => {
      const match =
        item.id === id ||
        (email && item.email && item.email.toLowerCase() === email.toLowerCase());
      return match ? { ...item, status } : item;
    });
    localStorage.setItem(KEYS.pendingLabs, JSON.stringify(updated));
  } catch {
    // ignore
  }
}

async function deleteMatchingDocs(
  colName: string,
  field: string,
  value: string | undefined,
  collectedIds: Set<string>
): Promise<void> {
  if (!value) return;
  try {
    const q = query(collection(db, colName), where(field, '==', value));
    const snap = await getDocs(q);
    for (const d of snap.docs) {
      collectedIds.add(d.id);
      await deleteDoc(doc(db, colName, d.id)).catch(() => {});
    }
  } catch (err) {
    console.warn(`Failed querying ${colName} by ${field}:`, err);
  }
}

export async function deleteDoctorEverywhere(params: {
  id: string;
  email?: string;
  clinicCode?: string;
  name?: string;
}): Promise<void> {
  const deletedIds = new Set<string>([params.id]);
  removeLocalPendingDoctor(params.id, params.email, params.clinicCode);
  addLocalDeletedIds([params.id]);

  await Promise.all([
    deleteDoc(doc(db, 'doctors', params.id)).catch(() => {}),
    deleteDoc(doc(db, 'system_users', params.id)).catch(() => {}),
    deleteDoc(doc(db, 'users', params.id)).catch(() => {})
  ]);

  await Promise.all([
    deleteMatchingDocs('doctors', 'email', params.email, deletedIds),
    deleteMatchingDocs('doctors', 'clinicCode', params.clinicCode, deletedIds),
    deleteMatchingDocs('system_users', 'email', params.email, deletedIds),
    deleteMatchingDocs('users', 'email', params.email, deletedIds)
  ]);

  await markSeedFlags({
    doctorsSeeded: true,
    systemUsersSeeded: true,
    addDeletedIds: Array.from(deletedIds)
  });
}

export async function deleteLabEverywhere(params: {
  id: string;
  email?: string;
  labCode?: string;
  name?: string;
}): Promise<void> {
  const deletedIds = new Set<string>([params.id]);
  removeLocalPendingLab(params.id, params.email, params.labCode, params.name);
  addLocalDeletedIds([params.id]);

  await Promise.all([
    deleteDoc(doc(db, 'labs', params.id)).catch(() => {}),
    deleteDoc(doc(db, 'system_users', params.id)).catch(() => {}),
    deleteDoc(doc(db, 'users', params.id)).catch(() => {})
  ]);

  await Promise.all([
    deleteMatchingDocs('labs', 'email', params.email, deletedIds),
    deleteMatchingDocs('labs', 'labCode', params.labCode, deletedIds),
    deleteMatchingDocs('labs', 'name', params.name, deletedIds),
    deleteMatchingDocs('system_users', 'email', params.email, deletedIds),
    deleteMatchingDocs('users', 'email', params.email, deletedIds)
  ]);

  await markSeedFlags({
    labsSeeded: true,
    systemUsersSeeded: true,
    addDeletedIds: Array.from(deletedIds)
  });
}

export async function deleteUserEverywhere(user: {
  id: string;
  role: string;
  email?: string;
  name?: string;
}): Promise<void> {
  if (user.role === 'Cardiologist') {
    await deleteDoctorEverywhere({
      id: user.id,
      email: user.email,
      name: user.name
    });
    return;
  }

  if (user.role === 'Lab / Imaging Center') {
    await deleteLabEverywhere({
      id: user.id,
      email: user.email,
      name: user.name
    });
    return;
  }

  const deletedIds = new Set<string>([user.id]);
  addLocalDeletedIds([user.id]);
  await Promise.all([
    deleteDoc(doc(db, 'system_users', user.id)).catch(() => {}),
    deleteDoc(doc(db, 'users', user.id)).catch(() => {}),
    deleteMatchingDocs('system_users', 'email', user.email, deletedIds),
    deleteMatchingDocs('users', 'email', user.email, deletedIds)
  ]);

  await markSeedFlags({
    systemUsersSeeded: true,
    addDeletedIds: Array.from(deletedIds)
  });
}

export async function syncStatusToSystemUser(params: {
  id: string;
  name: string;
  email?: string;
  role: 'Cardiologist' | 'Lab / Imaging Center' | 'Patient' | 'System Administrator';
  isActive: boolean;
  licenseNumber?: string;
  facilityName?: string;
}): Promise<void> {
  const userStatus = params.isActive ? 'Active' : 'Inactive';
  try {
    const ref = doc(db, 'system_users', params.id);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      await setDoc(ref, { status: userStatus }, { merge: true });
    } else {
      await setDoc(ref, {
        id: params.id,
        name: params.name,
        email: params.email || `${params.id}@cardios.eg`,
        role: params.role,
        status: userStatus,
        lastLogin: new Date().toLocaleDateString('en-US'),
        ...(params.licenseNumber ? { licenseNumber: params.licenseNumber } : {}),
        ...(params.facilityName ? { facilityName: params.facilityName } : {})
      });
    }
  } catch (err) {
    console.warn('Error syncing status to system_users:', err);
  }
}

export async function syncStatusFromSystemUser(params: {
  id: string;
  role: string;
  email?: string;
  name?: string;
  isActive: boolean;
}): Promise<void> {
  const operationalStatus = params.isActive ? 'active' : 'suspended';
  try {
    await setDoc(doc(db, 'users', params.id), { status: operationalStatus }, { merge: true }).catch(() => {});

    if (params.role === 'Cardiologist') {
      updateLocalPendingDoctorStatus(params.id, operationalStatus, params.email);
      const docRef = doc(db, 'doctors', params.id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        await setDoc(docRef, { status: operationalStatus }, { merge: true });
      } else if (params.email) {
        const q = query(collection(db, 'doctors'), where('email', '==', params.email));
        const qSnap = await getDocs(q);
        for (const d of qSnap.docs) {
          updateLocalPendingDoctorStatus(d.id, operationalStatus, params.email);
          await setDoc(doc(db, 'doctors', d.id), { status: operationalStatus }, { merge: true });
        }
      }
    } else if (params.role === 'Lab / Imaging Center') {
      updateLocalPendingLabStatus(params.id, operationalStatus, params.email);
      const labRef = doc(db, 'labs', params.id);
      const labSnap = await getDoc(labRef);
      if (labSnap.exists()) {
        await setDoc(labRef, { status: operationalStatus }, { merge: true });
      } else if (params.email) {
        const q = query(collection(db, 'labs'), where('email', '==', params.email));
        const qSnap = await getDocs(q);
        for (const l of qSnap.docs) {
          updateLocalPendingLabStatus(l.id, operationalStatus, params.email);
          await setDoc(doc(db, 'labs', l.id), { status: operationalStatus }, { merge: true });
        }
      }
    }
  } catch (err) {
    console.warn('Error syncing status from system_users:', err);
  }
}

/**
 * Reconciles orphaned SEED_DOCTORS and SEED_LABS records if system_users has
 * already been initialized and those seed records were deleted from system_users.
 * Also cleans up any IDs listed in seed_flags.deletedIds.
 */
export async function reconcileOrphanedSeedsWithSystemUsers(
  knownSystemUserIds?: Set<string>
): Promise<string[]> {
  try {
    let sysIds = knownSystemUserIds;
    let sysInitialized = false;

    if (sysIds) {
      sysInitialized = sysIds.size > 0;
    } else {
      const sysSnap = await getDocs(collection(db, 'system_users'));
      if (!sysSnap.empty) {
        sysInitialized = true;
        sysIds = new Set(sysSnap.docs.map((d) => d.id));
      }
    }

    const flags = await getSeedFlags();
    const toPurge = new Set<string>(flags.deletedIds || []);

    if (sysInitialized && sysIds) {
      for (const d of SEED_DOCTORS) {
        if (!sysIds.has(d.id)) {
          toPurge.add(d.id);
        }
      }
      for (const l of SEED_LABS) {
        if (!sysIds.has(l.id)) {
          toPurge.add(l.id);
        }
      }
    }

    const purgeList = Array.from(toPurge);
    if (purgeList.length === 0 && !sysInitialized) {
      return [];
    }

    if (purgeList.length > 0) {
      addLocalDeletedIds(purgeList);
      await Promise.all(
        purgeList.flatMap((id) => {
          removeLocalPendingDoctor(id);
          removeLocalPendingLab(id);
          return [
            deleteDoc(doc(db, 'doctors', id)).catch(() => {}),
            deleteDoc(doc(db, 'labs', id)).catch(() => {}),
            deleteDoc(doc(db, 'users', id)).catch(() => {})
          ];
        })
      );
    }

    await markSeedFlags({
      doctorsSeeded: sysInitialized || flags.doctorsSeeded,
      labsSeeded: sysInitialized || flags.labsSeeded,
      systemUsersSeeded: sysInitialized || flags.systemUsersSeeded,
      addDeletedIds: purgeList
    });

    return purgeList;
  } catch (err) {
    console.warn('Error reconciling orphaned seeds:', err);
    return getLocalDeletedIds();
  }
}
