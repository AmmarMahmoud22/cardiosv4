import React, { useState, useEffect, useRef } from 'react';
import {
  collection,
  onSnapshot,
  doc,
  setDoc
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { SEED_DOCTORS, SEED_LABS } from '../lib/seed';
import {
  deleteUserEverywhere,
  getLocalDeletedIds,
  getLocalSeedFlags,
  getSeedFlags,
  markSeedFlags,
  reconcileOrphanedSeedsWithSystemUsers,
  syncStatusFromSystemUser
} from '../lib/adminSync';
import { generatePatientToken } from '../lib/patientAuth';
import { useLanguage } from '../context/LanguageContext';
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
  Check,
  X,
  AlertCircle,
  Building2,
  Mail,
  UserCheck
} from 'lucide-react';

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  role: 'Cardiologist' | 'System Administrator' | 'Lab / Imaging Center' | 'Patient';
  status: 'Active' | 'Inactive';
  lastLogin: string;
  licenseNumber?: string;
  facilityName?: string;
  clinicCode?: string;
  labCode?: string;
  patientFileId?: string;
  patientToken?: string;
  password?: string;
  isCurrentUser?: boolean;
}

// Generate default real system users from the platform's actual data seeds
const REAL_SYSTEM_USERS: UserRecord[] = [
  {
    id: 'admin-1',
    name: 'م. أحمد كمال (مدير النظام)',
    email: 'admin@cardios.med',
    role: 'System Administrator',
    status: 'Active',
    lastLogin: '11/1/2026',
    isCurrentUser: true
  },
  ...SEED_DOCTORS.map((d) => ({
    id: d.id,
    name: d.name,
    email: d.email || `${d.clinicCode.toLowerCase()}@cardios.eg`,
    role: 'Cardiologist' as const,
    status: (d.status === 'active' ? 'Active' : 'Inactive') as 'Active' | 'Inactive',
    lastLogin: '11/1/2026',
    licenseNumber: `EGY-MED-${d.id.replace('doc-', '8400')}`
  })),
  ...SEED_LABS.map((l) => ({
    id: l.id,
    name: l.name,
    email: l.email || `lab-${l.id}@cardios.eg`,
    role: 'Lab / Imaging Center' as const,
    status: 'Active' as const,
    lastLogin: '11/1/2026',
    facilityName: l.branch || 'الفرع الرئيسي'
  })),
  {
    id: 'pat-1',
    name: 'أحمد حسن (مريض)',
    email: 'patient@cardios.med',
    role: 'Patient',
    status: 'Active',
    lastLogin: '11/1/2026'
  }
];

export default function UserManagement() {
  const { language, isRTL, t } = useLanguage();

  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>('All');
  const reconciledRef = useRef<boolean>(false);

  // Modal States
  const [isProvisionModalOpen, setIsProvisionModalOpen] = useState<boolean>(false);
  const [isProvisioning, setIsProvisioning] = useState<boolean>(false);
  const [deleteTargetUser, setDeleteTargetUser] = useState<UserRecord | null>(null);
  const [successMessage, setSuccessMessage] = useState<string>('');

  // Form State
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRole, setFormRole] = useState<UserRecord['role']>('Cardiologist');
  const [formStatus, setFormStatus] = useState<'Active' | 'Inactive'>('Active');
  const [formLicense, setFormLicense] = useState('');
  const [formFacility, setFormFacility] = useState('');

  // Real-time synchronization with Firestore
  useEffect(() => {
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
              const deletedSet = new Set(flags.deletedIds || []);
              const toSeed = REAL_SYSTEM_USERS.filter((u) => !deletedSet.has(u.id));
              await markSeedFlags({
                systemUsersSeeded: true,
                doctorsSeeded: true,
                labsSeeded: true
              });
              for (const u of toSeed) {
                await setDoc(doc(db, 'system_users', u.id), u).catch(() => {});
              }
              setUsers(toSeed);
            } else {
              setUsers([]);
            }
          }
          setLoading(false);
        },
        (err) => {
          console.warn('Firestore subscription fallback for system users:', err);
          const localFlags = getLocalSeedFlags();
          if (!localFlags.systemUsersSeeded) {
            const delSet = new Set(getLocalDeletedIds());
            setUsers(REAL_SYSTEM_USERS.filter((u) => !delSet.has(u.id)));
          }
          setLoading(false);
        }
      );
      return () => unsubscribe();
    } catch (e) {
      console.warn('Error setting up Firestore listener:', e);
      setLoading(false);
    }
  }, []);

  // Filtered Users
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.licenseNumber && u.licenseNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (u.facilityName && u.facilityName.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesRole = selectedRole === 'All' || u.role === selectedRole;
    return matchesSearch && matchesRole;
  });

  // Metric Counts
  const totalCount = users.length;
  const doctorCount = users.filter((u) => u.role === 'Cardiologist').length;
  const labCount = users.filter((u) => u.role === 'Lab / Imaging Center').length;
  const patientCount = users.filter((u) => u.role === 'Patient').length;
  const adminCount = users.filter((u) => u.role === 'System Administrator').length;
  const activeCount = users.filter((u) => u.status === 'Active').length;
  const inactiveCount = users.filter((u) => u.status === 'Inactive').length;

  // Handle Provision Staff User
  const handleProvisionUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formEmail.trim() || isProvisioning) return;
    setIsProvisioning(true);

    const stamp = Date.now();
    const idPrefix =
      formRole === 'Cardiologist'
        ? 'doc'
        : formRole === 'Lab / Imaging Center'
        ? 'lab'
        : formRole === 'Patient'
        ? 'P'
        : 'usr';
    const newId = formRole === 'Patient' ? `P${stamp.toString().slice(-6)}` : `${idPrefix}-${stamp}`;
    const clinicCode = formRole === 'Cardiologist' ? `CLINIC-${stamp.toString().slice(-4)}` : undefined;
    const labCode = formRole === 'Lab / Imaging Center' ? `LAB-${stamp.toString().slice(-4)}` : undefined;
    const patientToken = formRole === 'Patient' ? generatePatientToken(newId) : undefined;
    const cleanPassword = formPassword.trim() || '123456';

    const newUser: UserRecord = {
      id: newId,
      name: formName.trim(),
      email: formEmail.trim(),
      role: formRole,
      status: formStatus,
      lastLogin: new Date().toLocaleDateString('en-US'),
      ...(formRole !== 'Patient' ? { password: cleanPassword } : {}),
      ...(formRole === 'Cardiologist'
        ? { licenseNumber: formLicense.trim() || 'EGY-MED-NEW', clinicCode }
        : {}),
      ...(formRole === 'Lab / Imaging Center'
        ? { facilityName: formFacility.trim() || 'الفرع الرئيسي', labCode }
        : {}),
      ...(formRole === 'Patient'
        ? { patientFileId: newId, patientToken }
        : {})
    };

    try {
      const writes: Promise<any>[] = [
        setDoc(doc(db, 'system_users', newUser.id), newUser)
      ];

      // Keep operational collections (doctors / labs / patients) in sync
      if (formRole === 'Cardiologist' && clinicCode) {
        writes.push(
          setDoc(
            doc(db, 'doctors', newUser.id),
            {
              id: newUser.id,
              name: newUser.name,
              clinicCode,
              clinicName: `عيادة ${newUser.name}`,
              specialty: 'استشاري أمراض القلب',
              planId: 'plan-starter',
              planName: 'باقة العيادة الذكية (Cardio Starter)',
              status: formStatus === 'Active' ? 'active' : 'suspended',
              subscriptionExpiresAt: '2026-12-31',
              aiQueriesUsed: 0,
              aiQuotaLimit: 120,
              isAiBlocked: false,
              maxPatientsLimit: 50,
              phone: '01000000000',
              email: newUser.email,
              password: cleanPassword,
              medicalLicenseNumber: newUser.licenseNumber || 'EGY-MED-NEW',
              verificationStatus: formStatus === 'Active' ? 'verified' : 'pending',
              patientCount: 0,
              prescriptionsIssued: 0,
              echoReportsCount: 0,
              lastActiveAt: 'مسجل حديثاً'
            },
            { merge: true }
          ),
          markSeedFlags({ doctorsSeeded: true, systemUsersSeeded: true })
        );
      } else if (formRole === 'Lab / Imaging Center' && labCode) {
        writes.push(
          setDoc(
            doc(db, 'labs', newUser.id),
            {
              id: newUser.id,
              name: newUser.name,
              labCode,
              technicianName: newUser.name,
              phone: '01000000000',
              branch: newUser.facilityName || 'الفرع الرئيسي',
              accreditation: 'معتمد الجودة السريرية',
              linkedClinics: ['CLINIC-AMMAR-101'],
              status: formStatus === 'Active' ? 'active' : 'suspended',
              email: newUser.email,
              password: cleanPassword,
              testsProcessed: 0
            },
            { merge: true }
          ),
          markSeedFlags({ labsSeeded: true, systemUsersSeeded: true })
        );
      } else if (formRole === 'Patient' && patientToken) {
        writes.push(
          setDoc(
            doc(db, 'patients', newId),
            {
              id: newId,
              doctorId: 'doc-1',
              clinicCode: 'CLINIC-AMMAR-101',
              name: newUser.name,
              nameEn: newUser.name,
              email: newUser.email,
              dob: '1980-01-01',
              age: 45,
              gender: 'ذكر',
              status: 'مستقر (تحت المتابعة الدورية)',
              diagnosis: 'متابعة قلبية دورية',
              ef: 55,
              securityToken: patientToken,
              accessToken: patientToken,
              createdAt: new Date().toISOString(),
              labs: {
                ldl: '95 mg/dL',
                hdl: '45 mg/dL',
                creatinine: '0.9 mg/dL',
                egfr: '90 mL/min',
                potassium: '4.3 mmol/L',
                hba1c: '5.7%'
              }
            },
            { merge: true }
          ),
          markSeedFlags({ systemUsersSeeded: true })
        );
      } else {
        writes.push(markSeedFlags({ systemUsersSeeded: true }));
      }

      await Promise.all(writes);
    } catch (err) {
      console.warn('Local update fallback for provision:', err);
    } finally {
      setIsProvisioning(false);
    }

    setUsers((prev) => (prev.some((u) => u.id === newUser.id) ? prev : [newUser, ...prev]));
    setIsProvisionModalOpen(false);
    setFormName('');
    setFormEmail('');
    setFormPassword('');
    setFormLicense('');
    setFormFacility('');

    const credentialInfo =
      formRole === 'Patient'
        ? ` | رقم الملف: #${newId} | رمز الأمان: ${patientToken}`
        : formRole === 'Cardiologist'
        ? ` | كود العيادة: ${clinicCode} | كلمة المرور: ${cleanPassword}`
        : formRole === 'Lab / Imaging Center'
        ? ` | كود المعمل: ${labCode} | كلمة المرور: ${cleanPassword}`
        : '';

    setSuccessMessage(`${t('accountCreatedSuccess')}${credentialInfo}`);
    setTimeout(() => setSuccessMessage(''), 8000);
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
    }
  };

  // Role Avatar Icon / Initials Badge (Clean & Professional without random photo stock)
  const renderUserAvatar = (user: UserRecord) => {
    // Get initial letter
    const initial = user.name.replace(/^(د\/|م\/|أ\/)\s*/, '').charAt(0) || 'U';

    let bgColor = 'bg-slate-100 text-slate-700 border-slate-300';
    let IconComponent = User;

    if (user.role === 'Cardiologist') {
      bgColor = 'bg-rose-100 text-rose-700 border-rose-300';
      IconComponent = Stethoscope;
    } else if (user.role === 'System Administrator') {
      bgColor = 'bg-indigo-100 text-indigo-700 border-indigo-300';
      IconComponent = Shield;
    } else if (user.role === 'Lab / Imaging Center') {
      bgColor = 'bg-teal-100 text-teal-700 border-teal-300';
      IconComponent = FlaskConical;
    } else if (user.role === 'Patient') {
      bgColor = 'bg-blue-100 text-blue-700 border-blue-300';
      IconComponent = Heart;
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
            <option value="System Administrator">{t('roleSystemAdmin')}</option>
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
                filteredUsers.map((user) => (
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
                        </div>
                      </div>
                    </td>

                    {/* Role Badge */}
                    <td className="py-4 px-6 whitespace-nowrap">
                      {getRoleBadge(user.role)}
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
                ))
              )}
            </tbody>
          </table>
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
                  placeholder="khalid@cardios.med"
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
                  <option value="System Administrator">{t('roleSystemAdmin')}</option>
                  <option value="Lab / Imaging Center">{t('roleLabCenter')}</option>
                  <option value="Patient">{t('rolePatient')}</option>
                </select>
              </div>

              {/* Password Field for login testing */}
              {formRole !== 'Patient' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {isRTL ? 'كلمة المرور للدخول (اختياري - الافتراضي 123456)' : 'Account Password (default: 123456)'}
                  </label>
                  <input
                    type="text"
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    placeholder="123456"
                    dir="ltr"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                  />
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
