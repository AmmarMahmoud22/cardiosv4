import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  collection,
  onSnapshot,
  doc,
  setDoc,
  arrayUnion
} from 'firebase/firestore';
import { db, createSecondaryAuthUser } from '../lib/firebase';
import {
  deleteUserEverywhere,
  getSeedFlags,
  markSeedFlags,
  reconcileOrphanedSeedsWithSystemUsers,
  syncDoctorScheduleSummary,
  syncStatusFromSystemUser
} from '../lib/adminSync';
import { generatePatientToken } from '../lib/patientAuth';
import { useLanguage } from '../context/LanguageContext';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { PaginationControls } from './PaginationControls';
import {
  Shield,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Stethoscope,
  FlaskConical,
  User,
  Heart,
  X,
  AlertCircle,
  UserCheck
} from 'lucide-react';

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  role: 'Cardiologist' | 'System Administrator' | 'Lab / Imaging Center' | 'Patient' | 'Clinic Staff';
  status: 'Active' | 'Inactive';
  lastLogin: string;
  licenseNumber?: string;
  facilityName?: string;
  clinicCode?: string;
  labCode?: string;
  doctorId?: string;
  doctorName?: string;
  roleTitle?: string;
  patientFileId?: string;
  patientToken?: string;
  isCurrentUser?: boolean;
}

interface DoctorDirectoryItem {
  id: string;
  name: string;
  clinicName?: string;
  clinicCode: string;
  status?: string;
  staffUids?: string[];
}

interface ClinicStaffDirectoryItem {
  id: string;
  doctorId: string;
  doctorName?: string;
  clinicCode?: string;
  roleTitle?: string;
}

export default function UserManagement() {
  const { isRTL, t } = useLanguage();

  const [users, setUsers] = useState<UserRecord[]>([]);
  const [allDoctors, setAllDoctors] = useState<DoctorDirectoryItem[]>([]);
  const [availableDoctors, setAvailableDoctors] = useState<Array<{ id: string; name: string; clinicCode: string }>>([]);
  const [staffDirectory, setStaffDirectory] = useState<Record<string, ClinicStaffDirectoryItem>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const debouncedSearch = useDebouncedValue(searchQuery, 250);
  const [selectedRole, setSelectedRole] = useState<string>('All');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const reconciledRef = useRef<boolean>(false);

  // Modal States
  const [isProvisionModalOpen, setIsProvisionModalOpen] = useState<boolean>(false);
  const [isProvisioning, setIsProvisioning] = useState<boolean>(false);
  const [deleteTargetUser, setDeleteTargetUser] = useState<UserRecord | null>(null);
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [formError, setFormError] = useState<string>('');

  // Form State
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRole, setFormRole] = useState<UserRecord['role']>('Cardiologist');
  const [formStatus, setFormStatus] = useState<'Active' | 'Inactive'>('Active');
  const [formLicense, setFormLicense] = useState('');
  const [formFacility, setFormFacility] = useState('');
  const [formDoctorId, setFormDoctorId] = useState('');

  // Real-time synchronization with Firestore
  useEffect(() => {
    let unsubDoctors = () => {};
    let unsubStaff = () => {};
    try {
      unsubDoctors = onSnapshot(collection(db, 'doctors'), (snap) => {
        const allList: DoctorDirectoryItem[] = [];
        const activeList: Array<{ id: string; name: string; clinicCode: string }> = [];
        snap.forEach((d) => {
          const data = d.data() as any;
          const item: DoctorDirectoryItem = {
            id: d.id,
            name: data.name || d.id,
            clinicName: data.clinicName || '',
            clinicCode: data.clinicCode || '',
            status: data.status || 'active',
            staffUids: Array.isArray(data.staffUids) ? data.staffUids : []
          };
          allList.push(item);
          if (data.status !== 'suspended') {
            activeList.push({
              id: d.id,
              name: item.name,
              clinicCode: item.clinicCode
            });
          }
        });
        setAllDoctors(allList);
        setAvailableDoctors(activeList);
      });
    } catch {}

    try {
      unsubStaff = onSnapshot(collection(db, 'clinic_staff'), (snap) => {
        const map: Record<string, ClinicStaffDirectoryItem> = {};
        snap.forEach((d) => {
          const data = d.data() as any;
          map[d.id] = {
            id: d.id,
            doctorId: data.doctorId || '',
            doctorName: data.doctorName || '',
            clinicCode: data.clinicCode || '',
            roleTitle: data.roleTitle || ''
          };
        });
        setStaffDirectory(map);
      });
    } catch {}

    try {
      const unsubscribe = onSnapshot(
        collection(db, 'system_users'),
        async (snapshot) => {
          if (!snapshot.empty) {
            const fetched: UserRecord[] = [];
            snapshot.forEach((docSnap) => {
              fetched.push({ id: docSnap.id, ...docSnap.data() } as UserRecord);
            });
            setUsers(fetched);
            if (!reconciledRef.current) {
              reconciledRef.current = true;
              const sysIds = new Set(fetched.map((u) => u.id));
              await reconcileOrphanedSeedsWithSystemUsers(sysIds);
            }
          } else {
            const flags = await getSeedFlags();
            if (!flags.systemUsersSeeded) {
              await markSeedFlags({ systemUsersSeeded: true });
            }
            setUsers([]);
          }
          setLoading(false);
        },
        (err) => {
          console.warn('Firestore subscription warning for system users:', err);
          setLoading(false);
        }
      );
      return () => {
        unsubscribe();
        unsubDoctors();
        unsubStaff();
      };
    } catch (e) {
      console.warn('Error setting up Firestore listener:', e);
      setLoading(false);
      return () => {
        unsubDoctors();
        unsubStaff();
      };
    }
  }, []);

  // Build resilient lookup maps across all doctors (by ID, clinicCode, and staffUids)
  const doctorsLookup = useMemo(() => {
    const byId: Record<string, DoctorDirectoryItem> = {};
    const byCode: Record<string, DoctorDirectoryItem> = {};
    const byStaffUid: Record<string, DoctorDirectoryItem> = {};

    for (const d of allDoctors) {
      byId[d.id] = d;
      if (d.clinicCode) {
        byCode[d.clinicCode.trim().toUpperCase()] = d;
      }
      if (Array.isArray(d.staffUids)) {
        for (const sUid of d.staffUids) {
          byStaffUid[sUid] = d;
        }
      }
    }

    // Fallback: also allow resolving a Cardiologist directly from system_users if doctors doc is missing
    for (const u of users) {
      if (u.role === 'Cardiologist') {
        if (!byId[u.id]) {
          byId[u.id] = {
            id: u.id,
            name: u.name,
            clinicCode: u.clinicCode || ''
          };
        }
        if (u.clinicCode && !byCode[u.clinicCode.trim().toUpperCase()]) {
          byCode[u.clinicCode.trim().toUpperCase()] = byId[u.id];
        }
      }
    }

    return { byId, byCode, byStaffUid };
  }, [allDoctors, users]);

  const resolveAffiliation = (u: UserRecord) => {
    if (
      u.role === 'Cardiologist' ||
      u.role === 'System Administrator' ||
      u.role === 'Lab / Imaging Center'
    ) {
      return { doctorId: '', doctorName: '', clinicCode: u.clinicCode || '', roleTitle: '' };
    }
    const staffFallback = staffDirectory[u.id];
    const resolvedDocId = u.doctorId || staffFallback?.doctorId || '';
    const docFromId = resolvedDocId ? doctorsLookup.byId[resolvedDocId] : undefined;
    const docFromStaffUid = doctorsLookup.byStaffUid[u.id];
    const resolvedClinicCode =
      u.clinicCode || staffFallback?.clinicCode || docFromId?.clinicCode || docFromStaffUid?.clinicCode || '';
    const docFromCode = resolvedClinicCode
      ? doctorsLookup.byCode[resolvedClinicCode.trim().toUpperCase()]
      : undefined;
    const matchedDoc = docFromId || docFromStaffUid || docFromCode;
    const resolvedDoctorName =
      u.doctorName || staffFallback?.doctorName || matchedDoc?.name || '';
    const resolvedRoleTitle = u.roleTitle || staffFallback?.roleTitle || '';

    return {
      doctorId: resolvedDocId || matchedDoc?.id || '',
      doctorName: resolvedDoctorName,
      clinicCode: resolvedClinicCode,
      roleTitle: resolvedRoleTitle
    };
  };

  // Count how many accounts are affiliated with each Cardiologist
  const affiliatedCountByDoctorId = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const u of users) {
      if (u.role === 'Cardiologist' || u.role === 'System Administrator') continue;
      const aff = resolveAffiliation(u);
      if (aff.doctorId) {
        counts[aff.doctorId] = (counts[aff.doctorId] || 0) + 1;
      }
    }
    return counts;
  }, [users, doctorsLookup, staffDirectory]);

  // Filtered Users
  const filteredUsers = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    return users.filter((u) => {
      const aff = resolveAffiliation(u);
      const matchesSearch =
        !q ||
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.licenseNumber && u.licenseNumber.toLowerCase().includes(q)) ||
        (u.facilityName && u.facilityName.toLowerCase().includes(q)) ||
        (u.clinicCode && u.clinicCode.toLowerCase().includes(q)) ||
        (u.labCode && u.labCode.toLowerCase().includes(q)) ||
        (aff.doctorName && aff.doctorName.toLowerCase().includes(q)) ||
        (aff.clinicCode && aff.clinicCode.toLowerCase().includes(q)) ||
        (aff.roleTitle && aff.roleTitle.toLowerCase().includes(q));

      const matchesRole = selectedRole === 'All' || u.role === selectedRole;
      return matchesSearch && matchesRole;
    });
  }, [users, debouncedSearch, selectedRole, doctorsLookup, staffDirectory]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, selectedRole, pageSize]);

  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredUsers.slice(start, start + pageSize);
  }, [filteredUsers, currentPage, pageSize]);

  // Metric Counts
  const totalCount = users.length;
  const doctorCount = users.filter((u) => u.role === 'Cardiologist').length;
  const labCount = users.filter((u) => u.role === 'Lab / Imaging Center').length;
  const patientCount = users.filter((u) => u.role === 'Patient').length;
  const adminCount = users.filter((u) => u.role === 'System Administrator').length;
  const activeCount = users.filter((u) => u.status === 'Active').length;
  const inactiveCount = users.filter((u) => u.status === 'Inactive').length;

  // Handle Provision Staff User (Real Firebase Auth via Secondary App, NO plaintext passwords in Firestore)
  const handleProvisionUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    const cleanEmail = formEmail.trim().toLowerCase();
    if (!formName.trim() || !cleanEmail || isProvisioning) return;

    if (formRole !== 'Patient' && formPassword.trim().length < 6) {
      setFormError(isRTL ? 'كلمة المرور مطلوبة (6 أحرف على الأقل).' : 'Password is required (min 6 characters).');
      return;
    }

    const assignedDoc =
      formRole === 'Patient' || formRole === 'Clinic Staff'
        ? availableDoctors.find((d) => d.id === formDoctorId) || availableDoctors[0]
        : undefined;

    if ((formRole === 'Patient' || formRole === 'Clinic Staff') && !assignedDoc) {
      setFormError(
        isRTL
          ? 'يجب تسجيل واعتماد عيادة طبيب أولاً قبل إضافة مريض أو موظف استقبال.'
          : 'A registered doctor clinic is required before provisioning a patient or clinic staff.'
      );
      return;
    }

    setIsProvisioning(true);

    try {
      const stamp = Date.now();
      let newId = formRole === 'Patient' ? `P${stamp.toString().slice(-6)}` : '';

      if (formRole !== 'Patient') {
        newId = await createSecondaryAuthUser(cleanEmail, formPassword.trim(), formName.trim());
      }

      const clinicCode =
        formRole === 'Cardiologist'
          ? `CLINIC-${stamp.toString().slice(-4)}`
          : assignedDoc?.clinicCode;
      const labCode = formRole === 'Lab / Imaging Center' ? `LAB-${stamp.toString().slice(-4)}` : undefined;
      const patientToken = formRole === 'Patient' ? generatePatientToken(newId) : undefined;

      const newUser: UserRecord = {
        id: newId,
        name: formName.trim(),
        email: cleanEmail,
        role: formRole,
        status: formStatus,
        lastLogin: new Date().toLocaleDateString('en-US'),
        ...(formRole === 'Cardiologist'
          ? { licenseNumber: formLicense.trim() || 'EGY-MED-NEW', clinicCode }
          : {}),
        ...(formRole === 'Lab / Imaging Center'
          ? { facilityName: formFacility.trim() || 'الفرع الرئيسي', labCode }
          : {}),
        ...(formRole === 'Clinic Staff' && assignedDoc
          ? {
              doctorId: assignedDoc.id,
              doctorName: assignedDoc.name,
              clinicCode: assignedDoc.clinicCode,
              roleTitle: 'سكرتيرة'
            }
          : {}),
        ...(formRole === 'Patient' && assignedDoc
          ? {
              doctorId: assignedDoc.id,
              doctorName: assignedDoc.name,
              clinicCode: assignedDoc.clinicCode,
              patientFileId: newId,
              patientToken
            }
          : {})
      };

      const writes: Promise<any>[] = [
        setDoc(doc(db, 'system_users', newUser.id), newUser),
        markSeedFlags({ systemUsersSeeded: true })
      ];

      if (formRole === 'Cardiologist' && clinicCode) {
        const opStatus = formStatus === 'Active' ? 'active' : 'suspended';
        writes.push(
          setDoc(
            doc(db, 'doctors', newUser.id),
            {
              id: newUser.id,
              uid: newUser.id,
              name: newUser.name,
              clinicCode,
              clinicName: `عيادة ${newUser.name}`,
              specialty: 'استشاري أمراض القلب',
              planId: 'plan-starter',
              planName: 'باقة العيادة الذكية (Cardio Starter)',
              status: opStatus,
              subscriptionExpiresAt: '2026-12-31',
              aiQueriesUsed: 0,
              aiQuotaLimit: 120,
              isAiBlocked: false,
              maxPatientsLimit: 50,
              phone: '',
              email: newUser.email,
              medicalLicenseNumber: newUser.licenseNumber || 'EGY-MED-NEW',
              verificationStatus: formStatus === 'Active' ? 'verified' : 'pending',
              staffUids: [],
              patientCount: 0,
              prescriptionsIssued: 0,
              echoReportsCount: 0,
              lastActiveAt: 'مسجل حديثاً'
            },
            { merge: true }
          ),
          setDoc(
            doc(db, 'users', newUser.id),
            {
              uid: newUser.id,
              name: newUser.name,
              email: newUser.email,
              role: 'doctor',
              clinicCode,
              status: opStatus,
              createdAt: new Date().toISOString()
            },
            { merge: true }
          ),
          syncDoctorScheduleSummary({
            doctorId: newUser.id,
            doctorName: newUser.name,
            clinicName: `عيادة ${newUser.name}`,
            clinicCode,
            specialty: 'استشاري أمراض القلب',
            status: opStatus
          })
        );
      } else if (formRole === 'Lab / Imaging Center' && labCode) {
        const opStatus = formStatus === 'Active' ? 'active' : 'suspended';
        writes.push(
          setDoc(
            doc(db, 'labs', newUser.id),
            {
              id: newUser.id,
              uid: newUser.id,
              name: newUser.name,
              labCode,
              technicianName: newUser.name,
              phone: '',
              branch: newUser.facilityName || 'الفرع الرئيسي',
              accreditation: 'معتمد الجودة السريرية',
              linkedClinics: [],
              status: opStatus,
              email: newUser.email,
              testsProcessed: 0
            },
            { merge: true }
          ),
          setDoc(
            doc(db, 'users', newUser.id),
            {
              uid: newUser.id,
              name: newUser.name,
              email: newUser.email,
              role: 'lab',
              labCode,
              status: opStatus,
              createdAt: new Date().toISOString()
            },
            { merge: true }
          )
        );
      } else if (formRole === 'Clinic Staff' && assignedDoc) {
        const opStatus = formStatus === 'Active' ? 'active' : 'suspended';
        writes.push(
          setDoc(
            doc(db, 'clinic_staff', newUser.id),
            {
              id: newUser.id,
              uid: newUser.id,
              doctorId: assignedDoc.id,
              doctorName: assignedDoc.name,
              clinicCode: assignedDoc.clinicCode,
              name: newUser.name,
              email: newUser.email,
              roleTitle: 'سكرتيرة',
              status: opStatus,
              createdAt: new Date().toISOString(),
              createdBy: 'super_admin'
            },
            { merge: true }
          ),
          setDoc(
            doc(db, 'users', newUser.id),
            {
              uid: newUser.id,
              name: newUser.name,
              email: newUser.email,
              role: 'receptionist',
              doctorId: assignedDoc.id,
              doctorName: assignedDoc.name,
              clinicCode: assignedDoc.clinicCode,
              status: opStatus,
              createdAt: new Date().toISOString()
            },
            { merge: true }
          ),
          setDoc(
            doc(db, 'doctors', assignedDoc.id),
            { staffUids: arrayUnion(newUser.id) },
            { merge: true }
          )
        );
      } else if (formRole === 'System Administrator') {
        writes.push(
          setDoc(
            doc(db, 'admins', newUser.id),
            {
              uid: newUser.id,
              name: newUser.name,
              email: newUser.email,
              role: 'super_admin',
              active: formStatus === 'Active',
              createdAt: new Date().toISOString()
            },
            { merge: true }
          )
        );
      } else if (formRole === 'Patient' && patientToken && assignedDoc) {
        writes.push(
          setDoc(
            doc(db, 'patients', newId),
            {
              id: newId,
              doctorId: assignedDoc.id,
              doctorName: assignedDoc.name,
              clinicCode: assignedDoc.clinicCode,
              name: newUser.name,
              nameEn: newUser.name,
              email: newUser.email,
              status: 'تحت المتابعة الدورية',
              diagnosis: 'متابعة قلبية دورية',
              securityToken: patientToken,
              accessToken: patientToken,
              createdAt: new Date().toISOString()
            },
            { merge: true }
          )
        );
      }

      await Promise.all(writes);

      setUsers((prev) => (prev.some((u) => u.id === newUser.id) ? prev : [newUser, ...prev]));
      setIsProvisionModalOpen(false);
      setFormName('');
      setFormEmail('');
      setFormPassword('');
      setFormLicense('');
      setFormFacility('');
      setFormDoctorId('');

      const credentialInfo =
        formRole === 'Patient'
          ? ` | رقم الملف: #${newId} | رمز الأمان: ${patientToken}`
          : formRole === 'Cardiologist'
          ? ` | كود العيادة: ${clinicCode}`
          : formRole === 'Lab / Imaging Center'
          ? ` | كود المعمل: ${labCode}`
          : formRole === 'Clinic Staff' && assignedDoc
          ? ` | العيادة: ${assignedDoc.name}`
          : '';

      setSuccessMessage(`${t('accountCreatedSuccess')}${credentialInfo}`);
      setTimeout(() => setSuccessMessage(''), 8000);
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/email-already-in-use') {
        setFormError(isRTL ? 'هذا البريد الإلكتروني مسجل مسبقاً في Firebase Auth.' : 'This email is already registered in Firebase Auth.');
      } else if (code === 'auth/operation-not-allowed') {
        setFormError(isRTL ? 'توفير الحسابات بالبريد وكلمة المرور يتطلب تفعيل Email/Password في Firebase Authentication.' : 'Email/Password sign-up must be enabled in Firebase Authentication.');
      } else {
        setFormError(err?.message || (isRTL ? 'تعذر إنشاء الحساب.' : 'Failed to provision user.'));
      }
    } finally {
      setIsProvisioning(false);
    }
  };

  // Confirm Delete User (Synchronized across system_users, doctors, labs, users & localStorage)
  const confirmDelete = async () => {
    if (!deleteTargetUser) return;
    const target = deleteTargetUser;
    setDeleteTargetUser(null);
    setUsers((prev) => prev.filter((u) => u.id !== target.id));

    await deleteUserEverywhere(target);

    setSuccessMessage(
      isRTL
        ? `تم حذف حساب (${target.name}) ومزامنة الحذف مع العيادات والمعامل بنجاح`
        : `Deleted (${target.name}) and synchronized across all platform collections`
    );
    setTimeout(() => setSuccessMessage(''), 4000);
  };

  // Toggle user status (Active / Inactive) and sync with doctors/labs
  const toggleUserStatus = async (user: UserRecord) => {
    const newStatus: UserRecord['status'] = user.status === 'Active' ? 'Inactive' : 'Active';
    const updatedUser = { ...user, status: newStatus };
    setUsers((prev) => prev.map((u) => (u.id === user.id ? updatedUser : u)));
    try {
      await setDoc(doc(db, 'system_users', user.id), updatedUser);
      await syncStatusFromSystemUser({
        id: user.id,
        role: user.role,
        email: user.email,
        name: user.name,
        isActive: newStatus === 'Active'
      });
    } catch (err) {
      console.warn('Local toggle status fallback:', err);
    }
  };

  // Role Badge Styling
  const getRoleBadge = (role: UserRecord['role']) => {
    switch (role) {
      case 'Cardiologist':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-600 text-white shadow-xs">
            <Stethoscope className="w-3.5 h-3.5" />
            {t('roleCardiologist')}
          </span>
        );
      case 'System Administrator':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-600 text-white shadow-xs">
            <Shield className="w-3.5 h-3.5" />
            {t('roleSystemAdmin')}
          </span>
        );
      case 'Lab / Imaging Center':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-teal-600 text-white shadow-xs">
            <FlaskConical className="w-3.5 h-3.5" />
            {t('roleLabCenter')}
          </span>
        );
      case 'Patient':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-600 text-white shadow-xs">
            <Heart className="w-3.5 h-3.5" />
            {t('rolePatient')}
          </span>
        );
      case 'Clinic Staff':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-600 text-white shadow-xs">
            <UserCheck className="w-3.5 h-3.5" />
            {isRTL ? 'سكرتارية / تمريض' : 'Clinic Staff'}
          </span>
        );
    }
  };

  // Role Avatar Icon / Initials Badge (Clean & Professional without random photo stock)
  const renderUserAvatar = (user: UserRecord) => {
    const initial = user.name.replace(/^(د\/|م\/|أ\/)\s*/, '').charAt(0) || 'U';

    let bgColor = 'bg-slate-100 text-slate-700 border-slate-300';

    if (user.role === 'Cardiologist') {
      bgColor = 'bg-rose-100 text-rose-700 border-rose-300';
    } else if (user.role === 'System Administrator') {
      bgColor = 'bg-indigo-100 text-indigo-700 border-indigo-300';
    } else if (user.role === 'Lab / Imaging Center') {
      bgColor = 'bg-teal-100 text-teal-700 border-teal-300';
    } else if (user.role === 'Patient') {
      bgColor = 'bg-blue-100 text-blue-700 border-blue-300';
    } else if (user.role === 'Clinic Staff') {
      bgColor = 'bg-amber-100 text-amber-700 border-amber-300';
    }

    return (
      <div className={`w-10 h-10 rounded-full flex items-center justify-center border font-bold text-sm shadow-xs ${bgColor}`}>
        <span className="uppercase">{initial}</span>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Top Header */}
      <div className="bg-white/80 backdrop-blur-md rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shadow-inner">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              {t('userManagementTitle')}
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {t('userManagementSub')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={() => setIsProvisionModalOpen(true)}
            className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-medium text-sm transition-all shadow-sm hover:shadow active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            {t('provisionStaffUser')}
          </button>

          <button
            onClick={() => setLoading(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-sm transition-all cursor-pointer"
            title={t('refresh')}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-purple-600' : ''}`} />
            <span className="hidden sm:inline">{t('refresh')}</span>
          </button>
        </div>
      </div>

      {/* Toast Notification */}
      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-emerald-600" />
            <span className="text-sm font-medium">{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage('')} className="text-emerald-600 hover:text-emerald-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 7 Summary Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {/* Total */}
        <div className="bg-slate-900 text-white rounded-xl p-4 shadow-sm border border-slate-800 flex flex-col justify-between">
          <div className="text-3xl font-extrabold tracking-tight">{totalCount}</div>
          <div className="text-xs font-semibold text-slate-300 mt-1 uppercase tracking-wider">
            {t('totalUsers')}
          </div>
        </div>

        {/* Doctors */}
        <div className="bg-rose-50/80 border border-rose-200/80 text-rose-800 rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <div className="text-3xl font-extrabold tracking-tight text-rose-700">{doctorCount}</div>
          <div className="text-xs font-semibold text-rose-600 mt-1 uppercase tracking-wider">
            {t('totalDoctors')}
          </div>
        </div>

        {/* Labs */}
        <div className="bg-emerald-50/80 border border-emerald-200/80 text-emerald-800 rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <div className="text-3xl font-extrabold tracking-tight text-emerald-700">{labCount}</div>
          <div className="text-xs font-semibold text-emerald-600 mt-1 uppercase tracking-wider">
            {t('totalLabs')}
          </div>
        </div>

        {/* Patients */}
        <div className="bg-sky-50/80 border border-sky-200/80 text-sky-800 rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <div className="text-3xl font-extrabold tracking-tight text-sky-700">{patientCount}</div>
          <div className="text-xs font-semibold text-sky-600 mt-1 uppercase tracking-wider">
            {t('totalPatients')}
          </div>
        </div>

        {/* Admins */}
        <div className="bg-purple-50/80 border border-purple-200/80 text-purple-800 rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <div className="text-3xl font-extrabold tracking-tight text-purple-700">{adminCount}</div>
          <div className="text-xs font-semibold text-purple-600 mt-1 uppercase tracking-wider">
            {t('totalAdmins')}
          </div>
        </div>

        {/* Active */}
        <div className="bg-green-50/80 border border-green-200/80 text-green-800 rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <div className="text-3xl font-extrabold tracking-tight text-green-700">{activeCount}</div>
          <div className="text-xs font-semibold text-green-600 mt-1 uppercase tracking-wider">
            {t('totalActive')}
          </div>
        </div>

        {/* Inactive */}
        <div className="bg-amber-50/80 border border-amber-200/80 text-amber-800 rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <div className="text-3xl font-extrabold tracking-tight text-amber-700">{inactiveCount}</div>
          <div className="text-xs font-semibold text-amber-600 mt-1 uppercase tracking-wider">
            {t('totalInactive')}
          </div>
        </div>
      </div>

      {/* Search and Role Filter Bar */}
      <div className="bg-white/80 backdrop-blur-md rounded-2xl p-4 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-96">
          <Search className={`w-4 h-4 absolute top-1/2 -translate-y-1/2 ${isRTL ? 'right-3' : 'left-3'} text-slate-400`} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('searchUserPlaceholder')}
            className={`w-full ${isRTL ? 'pr-9 pl-4' : 'pl-9 pr-4'} py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all text-slate-900`}
          />
        </div>

        <div className="w-full sm:w-auto flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-500 whitespace-nowrap">
            {t('roleLabel')}:
          </label>
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="w-full sm:w-56 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
          >
            <option value="All">{t('allRoles')}</option>
            <option value="Cardiologist">{t('roleCardiologist')}</option>
            <option value="Clinic Staff">{isRTL ? 'سكرتارية / تمريض' : 'Clinic Staff'}</option>
            <option value="Lab / Imaging Center">{t('roleLabCenter')}</option>
            <option value="Patient">{t('rolePatient')}</option>
          </select>
        </div>
      </div>

      {/* User Data Table */}
      <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-6">{t('tableColUser')}</th>
                <th className="py-3.5 px-6">{t('tableColRole')}</th>
                <th className="py-3.5 px-6">{t('tableColStatus')}</th>
                <th className="py-3.5 px-6">{t('tableColLastLogin')}</th>
                <th className="py-3.5 px-6 text-left">{t('tableColActions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <User className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="font-medium">{t('search')} - لم يتم العثور على أي مستخدمين</p>
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((user) => {
                  const affiliation = resolveAffiliation(user);
                  const affiliatedStaffCount =
                    user.role === 'Cardiologist' ? affiliatedCountByDoctorId[user.id] || 0 : 0;

                  return (
                  <tr
                    key={user.id}
                    className="hover:bg-slate-50/60 transition-colors group"
                  >
                    {/* User Profile */}
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        {renderUserAvatar(user)}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900">{user.name}</span>
                            {user.isCurrentUser && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700 border border-purple-200">
                                You
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 font-mono mt-0.5">{user.email}</div>
                          {user.licenseNumber && (
                            <div className="text-[11px] text-slate-400 mt-0.5 font-mono">
                              License: {user.licenseNumber} {user.clinicCode ? `• ${user.clinicCode}` : ''}
                            </div>
                          )}
                          {user.facilityName && (
                            <div className="text-[11px] text-teal-600 mt-0.5">
                              {user.facilityName} {user.labCode ? `(${user.labCode})` : ''}
                            </div>
                          )}
                          {user.patientToken && (
                            <div className="text-[11px] text-blue-700 mt-0.5 font-mono">
                              ملف #{user.patientFileId || user.id} • رمز QR: {user.patientToken}
                            </div>
                          )}
                          {(affiliation.doctorName || affiliation.clinicCode) && (
                            <div className="mt-1.5 inline-flex flex-wrap items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200/80 text-[11px] font-semibold text-amber-900">
                              <Stethoscope className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                              <span>
                                {isRTL ? 'تابع للدكتور:' : 'Affiliated to:'}{' '}
                                <strong className="font-bold text-slate-900">
                                  {affiliation.doctorName
                                    ? isRTL
                                      ? `د. ${affiliation.doctorName}`
                                      : `Dr. ${affiliation.doctorName}`
                                    : isRTL
                                    ? 'عيادة مرتبطة'
                                    : 'Linked Clinic'}
                                </strong>
                              </span>
                              {affiliation.clinicCode && (
                                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-white/90 border border-amber-200 text-amber-800">
                                  {affiliation.clinicCode}
                                </span>
                              )}
                              {affiliation.roleTitle && (
                                <span className="text-[10px] text-amber-700">
                                  ({affiliation.roleTitle})
                                </span>
                              )}
                            </div>
                          )}
                          {user.role === 'Cardiologist' && affiliatedStaffCount > 0 && (
                            <div className="mt-1 text-[11px] font-semibold text-amber-700 flex items-center gap-1">
                              <UserCheck className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                              <span>
                                {isRTL
                                  ? `يتبع هذه العيادة ${affiliatedStaffCount} حساب موظف/تابع`
                                  : `${affiliatedStaffCount} affiliated clinic account(s)`}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Role Badge */}
                    <td className="py-4 px-6 whitespace-nowrap">
                      <div className="flex flex-col items-start gap-1.5">
                        {getRoleBadge(user.role)}
                        {affiliation.doctorName && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600">
                            <Stethoscope className="w-3 h-3 text-rose-500 shrink-0" />
                            <span>
                              {isRTL
                                ? `تابع لـ د. ${affiliation.doctorName}`
                                : `Under Dr. ${affiliation.doctorName}`}
                            </span>
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Status Pill */}
                    <td className="py-4 px-6 whitespace-nowrap">
                      <button
                        onClick={() => toggleUserStatus(user)}
                        title="اضغط لتعديل حالة الحساب"
                        className="group/status inline-block cursor-pointer"
                      >
                        {user.status === 'Active' ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            {t('active')}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors">
                            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                            {t('totalInactive')}
                          </span>
                        )}
                      </button>
                    </td>

                    {/* Last Login */}
                    <td className="py-4 px-6 whitespace-nowrap text-xs text-slate-500 font-mono">
                      {user.lastLogin}
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-6 whitespace-nowrap text-left">
                      {user.isCurrentUser ? (
                        <span className="text-slate-300 font-mono text-xs">—</span>
                      ) : (
                        <button
                          onClick={() => setDeleteTargetUser(user)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title={t('delete')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="px-6 pb-4">
          <PaginationControls
            currentPage={currentPage}
            totalItems={filteredUsers.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
            itemLabelAr="مستخدم"
            itemLabelEn="users"
          />
        </div>
      </div>

      {/* Modal: Provision Staff User */}
      {isProvisionModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                  <UserCheck className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">
                  {t('modalProvisionTitle')}
                </h3>
              </div>
              <button
                onClick={() => setIsProvisionModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleProvisionUser} className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t('fullNameLabel')} *
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="د. خالد منصور"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                />
              </div>

              {/* Email Address */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t('email')} *
                </label>
                <input
                  type="email"
                  required
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="doctor@cardios.eg"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                />
              </div>

              {/* Role Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t('roleLabel')} *
                </label>
                <select
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value as UserRecord['role'])}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-medium"
                >
                  <option value="Cardiologist">{t('roleCardiologist')}</option>
                  <option value="Clinic Staff">{isRTL ? 'سكرتارية / تمريض العيادة' : 'Clinic Staff (Reception/Nurse)'}</option>
                  <option value="Lab / Imaging Center">{t('roleLabCenter')}</option>
                  <option value="Patient">{t('rolePatient')}</option>
                </select>
              </div>

              {/* Password Field */}
              {formRole !== 'Patient' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {isRTL ? 'كلمة المرور للدخول (6 أحرف على الأقل) *' : 'Account Password (min 6 chars) *'}
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    placeholder="••••••••"
                    dir="ltr"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                  />
                </div>
              )}

              {/* Doctor selector for Patient or Clinic Staff */}
              {(formRole === 'Patient' || formRole === 'Clinic Staff') && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {isRTL ? 'العيادة المرتبطة *' : 'Assigned Clinic *'}
                  </label>
                  <select
                    value={formDoctorId || availableDoctors[0]?.id || ''}
                    onChange={(e) => setFormDoctorId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 font-medium"
                  >
                    {availableDoctors.length === 0 ? (
                      <option value="">{isRTL ? 'لا توجد عيادات مسجلة بعد' : 'No clinics registered yet'}</option>
                    ) : (
                      availableDoctors.map((docItem) => (
                        <option key={docItem.id} value={docItem.id}>
                          {docItem.name} ({docItem.clinicCode})
                        </option>
                      ))
                    )}
                  </select>
                </div>
              )}

              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Dynamic Field: License for Doctor */}
              {formRole === 'Cardiologist' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t('licenseNumberLabel')}
                  </label>
                  <input
                    type="text"
                    value={formLicense}
                    onChange={(e) => setFormLicense(e.target.value)}
                    placeholder="EGY-MED-99421"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                  />
                </div>
              )}

              {/* Dynamic Field: Facility for Lab */}
              {formRole === 'Lab / Imaging Center' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t('facilityNameLabel')}
                  </label>
                  <input
                    type="text"
                    value={formFacility}
                    onChange={(e) => setFormFacility(e.target.value)}
                    placeholder="مختبر الفحوصات المتقدمة"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                  />
                </div>
              )}

              {/* Status Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t('initialStatusLabel')}
                </label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as 'Active' | 'Inactive')}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 font-medium"
                >
                  <option value="Active">{t('active')}</option>
                  <option value="Inactive">{t('totalInactive')}</option>
                </select>
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsProvisionModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium transition-colors cursor-pointer"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isProvisioning}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-semibold shadow-sm transition-all cursor-pointer"
                >
                  {isProvisioning ? (isRTL ? 'جاري الحفظ...' : 'Saving...') : t('confirm')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Delete Confirmation */}
      {deleteTargetUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                {t('confirm')} {t('delete')}
              </h3>
            </div>

            <p className="text-sm text-slate-600">
              {t('confirmDeleteUser')}
              <br />
              <strong className="text-slate-900 font-semibold mt-1 block">
                {deleteTargetUser.name} ({deleteTargetUser.email})
              </strong>
            </p>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                onClick={() => setDeleteTargetUser(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium cursor-pointer"
              >
                {t('cancel')}
              </button>
              <button
                onClick={confirmDelete}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold shadow-sm cursor-pointer"
              >
                {t('delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
