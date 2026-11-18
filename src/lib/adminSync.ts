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
import { BOOTSTRAP_ADMIN_EMAIL, db } from './firebase';
import { SEED_DOCTORS, SEED_LABS } from './seed';

export const DEMO_DOCTOR_IDS = ['doc-1', 'doc-2', 'doc-3'];
export const DEMO_LAB_IDS = ['lab-1', 'lab-2', 'lab-3'];
export const DEMO_PATIENT_IDS = ['1', '2', '3', '4', '5'];
export const DEMO_SYSTEM_USER_IDS = [...DEMO_DOCTOR_IDS, ...DEMO_LAB_IDS, 'pat-1'];
export const DEMO_ORDER_IDS = ['ord-101', 'ord-102', 'ord-103'];
export const DEMO_CLINIC_CODES = ['CLINIC-AMMAR-101', 'CLINIC-SHERIF-202', 'CLINIC-TAREK-303'];
export const DEMO_LAB_CODES = ['LAB-AZHARI-88', 'LAB-ALBORG-99', 'LAB-CAIRO-55'];

export interface SeedFlags {
  doctorsSeeded: boolean;
  labsSeeded: boolean;
  systemUsersSeeded: boolean;
  demoPurged: boolean;
  primaryAdminOnlyPurged_v1?: boolean;
  deletedIds: string[];
}

const KEYS = {
  doctorsSeeded: 'cardios_doctors_seeded',
  labsSeeded: 'cardios_labs_seeded',
  systemUsersSeeded: 'cardios_system_users_seeded',
  demoPurged: 'cardios_demo_purged_v1',
  primaryAdminOnlyPurged: 'cardios_primary_admin_purged_v1',
  deletedIds: 'cardios_deleted_ids'
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
      demoPurged: localStorage.getItem(KEYS.demoPurged) === 'true',
      primaryAdminOnlyPurged_v1: localStorage.getItem(KEYS.primaryAdminOnlyPurged) === 'true',
      deletedIds: getLocalDeletedIds()
    };
  } catch {
    return {
      doctorsSeeded: false,
      labsSeeded: false,
      systemUsersSeeded: false,
      demoPurged: false,
      primaryAdminOnlyPurged_v1: false,
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
        demoPurged: Boolean(local.demoPurged || data.demoPurged),
        primaryAdminOnlyPurged_v1: Boolean(local.primaryAdminOnlyPurged_v1 || data.primaryAdminOnlyPurged_v1),
        deletedIds: mergedDeleted
      };
      try {
        if (result.doctorsSeeded) localStorage.setItem(KEYS.doctorsSeeded, 'true');
        if (result.labsSeeded) localStorage.setItem(KEYS.labsSeeded, 'true');
        if (result.systemUsersSeeded) localStorage.setItem(KEYS.systemUsersSeeded, 'true');
        if (result.demoPurged) localStorage.setItem(KEYS.demoPurged, 'true');
        if (result.primaryAdminOnlyPurged_v1) localStorage.setItem(KEYS.primaryAdminOnlyPurged, 'true');
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
  demoPurged?: boolean;
  primaryAdminOnlyPurged_v1?: boolean;
  addDeletedIds?: string[];
}): Promise<void> {
  try {
    if (update.doctorsSeeded) localStorage.setItem(KEYS.doctorsSeeded, 'true');
    if (update.labsSeeded) localStorage.setItem(KEYS.labsSeeded, 'true');
    if (update.systemUsersSeeded) localStorage.setItem(KEYS.systemUsersSeeded, 'true');
    if (update.demoPurged) localStorage.setItem(KEYS.demoPurged, 'true');
    if (update.primaryAdminOnlyPurged_v1) localStorage.setItem(KEYS.primaryAdminOnlyPurged, 'true');
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
        demoPurged: Boolean(existingData.demoPurged || update.demoPurged),
        primaryAdminOnlyPurged_v1: Boolean(existingData.primaryAdminOnlyPurged_v1 || update.primaryAdminOnlyPurged_v1),
        deletedIds: allDeleted,
        updatedAt: new Date().toISOString()
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('Error updating seed_flags:', err);
  }
}

export async function syncDoctorScheduleSummary(params: {
  doctorId: string;
  doctorName: string;
  clinicName?: string;
  clinicCode: string;
  specialty?: string;
  status?: string;
  schedule?: any;
  consultationFee?: number;
  followupFee?: number;
}): Promise<void> {
  if (!params.doctorId || !params.clinicCode) return;
  try {
    await setDoc(
      doc(db, 'doctor_schedules', params.doctorId),
      {
        doctorId: params.doctorId,
        doctorName: params.doctorName,
        clinicName: params.clinicName || `عيادة د. ${params.doctorName}`,
        clinicCode: params.clinicCode.trim(),
        clinicCodeUpper: params.clinicCode.trim().toUpperCase(),
        specialty: params.specialty || 'استشاري أمراض القلب والقسطرة',
        status: params.status || 'active',
        ...(params.schedule ? { schedule: params.schedule } : {}),
        ...(typeof params.consultationFee === 'number' ? { consultationFee: params.consultationFee } : {}),
        ...(typeof params.followupFee === 'number' ? { followupFee: params.followupFee } : {}),
        updatedAt: new Date().toISOString()
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('syncDoctorScheduleSummary warning:', err);
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
  addLocalDeletedIds([params.id]);

  await Promise.all([
    deleteDoc(doc(db, 'doctors', params.id)).catch(() => {}),
    deleteDoc(doc(db, 'doctor_schedules', params.id)).catch(() => {}),
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

  if (user.role === 'Clinic Staff') {
    const deletedIds = new Set<string>([user.id]);
    addLocalDeletedIds([user.id]);
    await Promise.all([
      deleteDoc(doc(db, 'clinic_staff', user.id)).catch(() => {}),
      deleteDoc(doc(db, 'system_users', user.id)).catch(() => {}),
      deleteDoc(doc(db, 'users', user.id)).catch(() => {}),
      deleteMatchingDocs('clinic_staff', 'email', user.email, deletedIds),
      deleteMatchingDocs('system_users', 'email', user.email, deletedIds),
      deleteMatchingDocs('users', 'email', user.email, deletedIds)
    ]);
    await markSeedFlags({
      systemUsersSeeded: true,
      addDeletedIds: Array.from(deletedIds)
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
  role: 'Cardiologist' | 'Lab / Imaging Center' | 'Patient' | 'System Administrator' | 'Clinic Staff';
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
      const docRef = doc(db, 'doctors', params.id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        await setDoc(docRef, { status: operationalStatus }, { merge: true });
        await setDoc(doc(db, 'doctor_schedules', params.id), { status: operationalStatus }, { merge: true }).catch(() => {});
      } else if (params.email) {
        const q = query(collection(db, 'doctors'), where('email', '==', params.email));
        const qSnap = await getDocs(q);
        for (const d of qSnap.docs) {
          await setDoc(doc(db, 'doctors', d.id), { status: operationalStatus }, { merge: true });
          await setDoc(doc(db, 'doctor_schedules', d.id), { status: operationalStatus }, { merge: true }).catch(() => {});
        }
      }
    } else if (params.role === 'Lab / Imaging Center') {
      const labRef = doc(db, 'labs', params.id);
      const labSnap = await getDoc(labRef);
      if (labSnap.exists()) {
        await setDoc(labRef, { status: operationalStatus }, { merge: true });
      } else if (params.email) {
        const q = query(collection(db, 'labs'), where('email', '==', params.email));
        const qSnap = await getDocs(q);
        for (const l of qSnap.docs) {
          await setDoc(doc(db, 'labs', l.id), { status: operationalStatus }, { merge: true });
        }
      }
    } else if (params.role === 'Clinic Staff') {
      const staffRef = doc(db, 'clinic_staff', params.id);
      const staffSnap = await getDoc(staffRef);
      if (staffSnap.exists()) {
        await setDoc(staffRef, { status: operationalStatus }, { merge: true });
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
          return [
            deleteDoc(doc(db, 'doctors', id)).catch(() => {}),
            deleteDoc(doc(db, 'doctor_schedules', id)).catch(() => {}),
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

export function cleanLocalDemoStorage(): void {
  if (typeof window === 'undefined') return;
  try {
    DEMO_DOCTOR_IDS.forEach((id) => {
      localStorage.removeItem(`cardios_doctor_status_${id}`);
      localStorage.removeItem(`cardios_ai_blocked_${id}`);
    });
    DEMO_LAB_IDS.forEach((id) => {
      localStorage.removeItem(`cardios_lab_status_${id}`);
      localStorage.removeItem(`cardios_lab_linked_clinics_${id}`);
    });
    localStorage.removeItem('cardios_lab_technician_authed');
    localStorage.removeItem('cardios_custom_doctor_phone');
    // Remove all legacy insecure local credential/pending caches
    localStorage.removeItem('cardios_local_pending_doctors');
    localStorage.removeItem('cardios_local_pending_labs');
    sessionStorage.removeItem('cardios_superadmin_auth');

    // Strip demo analytics events and zero demo trial counters
    const rawEvents = localStorage.getItem('cardios_real_analytics_v3_events');
    if (rawEvents) {
      const parsed = JSON.parse(rawEvents);
      if (Array.isArray(parsed)) {
        const filtered = parsed.filter(
          (evt: any) =>
            typeof evt?.id === 'string' &&
            !evt.id.startsWith('evt-init-') &&
            typeof evt?.type === 'string' &&
            !evt.type.startsWith('demo_')
        );
        localStorage.setItem('cardios_real_analytics_v3_events', JSON.stringify(filtered));
      }
    }

    const rawMetrics = localStorage.getItem('cardios_real_analytics_v3_metrics');
    if (rawMetrics) {
      const parsed = JSON.parse(rawMetrics);
      if (parsed && typeof parsed === 'object') {
        parsed.demoTrialsTotal = 0;
        parsed.demoDoctorTrials = 0;
        parsed.demoLabTrials = 0;
        parsed.demoPatientTrials = 0;
        localStorage.setItem('cardios_real_analytics_v3_metrics', JSON.stringify(parsed));
      }
    }

    // Clear demo sessionStorage states if they point to purged demo IDs
    const patSess = sessionStorage.getItem('cardios_patient_session');
    if (patSess) {
      const parsedSess = JSON.parse(patSess);
      if (parsedSess && DEMO_PATIENT_IDS.includes(String(parsedSess.patientId))) {
        sessionStorage.removeItem('cardios_patient_session');
      }
    }
  } catch {
    // ignore storage errors
  }
}

export async function purgeAllDemoData(force = false): Promise<void> {
  cleanLocalDemoStorage();

  try {
    const flags = await getSeedFlags();
    if (flags.demoPurged && !force) {
      return;
    }

    // 1. Delete seeded patients & their subcollections
    const patientSubcollections = ['vitals', 'prescriptions', 'lab_results', 'notifications', 'cardiology_reports'];
    for (const pId of DEMO_PATIENT_IDS) {
      for (const sub of patientSubcollections) {
        try {
          const subSnap = await getDocs(collection(db, 'patients', pId, sub));
          await Promise.all(subSnap.docs.map((d) => deleteDoc(doc(db, 'patients', pId, sub, d.id)).catch(() => {})));
        } catch {
          // ignore missing subcollections or rules
        }
      }
      await deleteDoc(doc(db, 'patients', pId)).catch(() => {});
    }

    // 2. Delete seeded doctors, labs, and demo system users
    await Promise.all([
      ...DEMO_DOCTOR_IDS.flatMap((id) => [
        deleteDoc(doc(db, 'doctors', id)).catch(() => {}),
        deleteDoc(doc(db, 'doctor_schedules', id)).catch(() => {}),
        deleteDoc(doc(db, 'users', id)).catch(() => {}),
        deleteDoc(doc(db, 'system_users', id)).catch(() => {})
      ]),
      ...DEMO_LAB_IDS.flatMap((id) => [
        deleteDoc(doc(db, 'labs', id)).catch(() => {}),
        deleteDoc(doc(db, 'users', id)).catch(() => {}),
        deleteDoc(doc(db, 'system_users', id)).catch(() => {})
      ]),
      deleteDoc(doc(db, 'system_users', 'pat-1')).catch(() => {}),
      deleteDoc(doc(db, 'users', 'pat-1')).catch(() => {}),
      ...DEMO_ORDER_IDS.map((ordId) => deleteDoc(doc(db, 'lab_orders', ordId)).catch(() => {}))
    ]);

    // 3. Delete any orphaned top-level records tied to demo IDs
    const tempIds = new Set<string>();
    for (const dId of DEMO_DOCTOR_IDS) {
      await Promise.all([
        deleteMatchingDocs('lab_orders', 'doctorId', dId, tempIds),
        deleteMatchingDocs('appointments', 'doctorId', dId, tempIds),
        deleteMatchingDocs('notifications', 'doctorId', dId, tempIds)
      ]);
    }
    for (const pId of DEMO_PATIENT_IDS) {
      await Promise.all([
        deleteMatchingDocs('lab_orders', 'patientId', pId, tempIds),
        deleteMatchingDocs('vitals', 'patientId', pId, tempIds),
        deleteMatchingDocs('appointments', 'patientId', pId, tempIds),
        deleteMatchingDocs('notifications', 'patientId', pId, tempIds),
        deleteMatchingDocs('messages', 'patientId', pId, tempIds)
      ]);
    }
    for (const lId of DEMO_LAB_IDS) {
      await deleteMatchingDocs('lab_orders', 'labId', lId, tempIds);
    }

    // 4. Delete demo analytics events & zero demo trial counters
    try {
      const evtSnap = await getDocs(collection(db, 'platform_analytics_events'));
      const demoEventDeletions = evtSnap.docs
        .filter((d) => {
          const dt = d.data();
          return (
            d.id.startsWith('evt-init-') ||
            dt?.type === 'demo_doctor' ||
            dt?.type === 'demo_lab' ||
            dt?.type === 'demo_patient'
          );
        })
        .map((d) => deleteDoc(doc(db, 'platform_analytics_events', d.id)).catch(() => {}));
      await Promise.all(demoEventDeletions);

      await setDoc(
        doc(db, 'platform_analytics', 'metrics'),
        {
          demoTrialsTotal: 0,
          demoDoctorTrials: 0,
          demoLabTrials: 0,
          demoPatientTrials: 0,
          updatedAt: new Date().toISOString()
        },
        { merge: true }
      ).catch(() => {});
    } catch {
      // ignore analytics cleanup errors
    }

    await markSeedFlags({
      doctorsSeeded: true,
      labsSeeded: true,
      systemUsersSeeded: true,
      demoPurged: true,
      addDeletedIds: [...DEMO_SYSTEM_USER_IDS, ...DEMO_PATIENT_IDS]
    });
  } catch (err) {
    console.warn('purgeAllDemoData error:', err);
  }
}

/**
 * Enforces single primary SuperAdmin (12345865amar@gmail.com) and wipes every other
 * admin/user/clinic/lab/patient account on first run or explicit purge.
 */
export async function purgeAllNonPrimaryAccounts(
  primaryAdminUid?: string,
  force = false
): Promise<{ deletedCount: number }> {
  let deletedCount = 0;
  const primaryLower = BOOTSTRAP_ADMIN_EMAIL.toLowerCase();

  cleanLocalDemoStorage();

  // Always prune any secondary/unauthorized admin entries
  try {
    const adminsSnap = await getDocs(collection(db, 'admins'));
    for (const d of adminsSnap.docs) {
      const email = String(d.data()?.email || '').toLowerCase();
      if (email !== primaryLower || (primaryAdminUid && d.id !== primaryAdminUid)) {
        await deleteDoc(doc(db, 'admins', d.id)).catch(() => {});
        deletedCount++;
      }
    }
  } catch {
    // ignore
  }

  try {
    const flags = await getSeedFlags();
    if (flags.primaryAdminOnlyPurged_v1 && !force) {
      return { deletedCount };
    }

    // 1. Delete all patients and their 8 clinical subcollections
    const patientSubs = [
      'vitals',
      'prescriptions',
      'lab_results',
      'notifications',
      'cardiology_reports',
      'referrals',
      'invoices',
      'attachments'
    ];
    try {
      const patSnap = await getDocs(collection(db, 'patients'));
      for (const pDoc of patSnap.docs) {
        for (const sub of patientSubs) {
          try {
            const subSnap = await getDocs(collection(db, 'patients', pDoc.id, sub));
            await Promise.all(
              subSnap.docs.map((sd) => deleteDoc(doc(db, 'patients', pDoc.id, sub, sd.id)).catch(() => {}))
            );
          } catch {
            // ignore
          }
        }
        await deleteDoc(doc(db, 'patients', pDoc.id)).catch(() => {});
        deletedCount++;
      }
    } catch {
      // ignore
    }

    // 2. Delete all doctor_schedules & slot_counts
    try {
      const schedSnap = await getDocs(collection(db, 'doctor_schedules'));
      for (const sDoc of schedSnap.docs) {
        try {
          const slotSnap = await getDocs(collection(db, 'doctor_schedules', sDoc.id, 'slot_counts'));
          await Promise.all(
            slotSnap.docs.map((sc) =>
              deleteDoc(doc(db, 'doctor_schedules', sDoc.id, 'slot_counts', sc.id)).catch(() => {})
            )
          );
        } catch {
          // ignore
        }
        await deleteDoc(doc(db, 'doctor_schedules', sDoc.id)).catch(() => {});
        deletedCount++;
      }
    } catch {
      // ignore
    }

    // 3. Delete all accounts in doctors, labs, clinic_staff, and operational collections
    const fullWipeCollections = [
      'doctors',
      'labs',
      'clinic_staff',
      'clinic_contracts',
      'clinic_invoices',
      'lab_orders',
      'appointments',
      'waitlists',
      'vitals',
      'messages',
      'notifications'
    ];
    for (const colName of fullWipeCollections) {
      try {
        const snap = await getDocs(collection(db, colName));
        await Promise.all(
          snap.docs.map(async (d) => {
            await deleteDoc(doc(db, colName, d.id)).catch(() => {});
            deletedCount++;
          })
        );
      } catch {
        // ignore
      }
    }

    // 4. Delete all system_users and users except the primary SuperAdmin email
    for (const dirCol of ['system_users', 'users'] as const) {
      try {
        const snap = await getDocs(collection(db, dirCol));
        for (const d of snap.docs) {
          const email = String(d.data()?.email || '').toLowerCase();
          if (email !== primaryLower) {
            await deleteDoc(doc(db, dirCol, d.id)).catch(() => {});
            deletedCount++;
          }
        }
      } catch {
        // ignore
      }
    }

    await markSeedFlags({
      doctorsSeeded: true,
      labsSeeded: true,
      systemUsersSeeded: true,
      demoPurged: true,
      primaryAdminOnlyPurged_v1: true
    });
  } catch (err) {
    console.warn('purgeAllNonPrimaryAccounts error:', err);
  }

  return { deletedCount };
}


