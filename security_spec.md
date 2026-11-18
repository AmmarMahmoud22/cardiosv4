# CardioS Security Architecture & Payload-First TDD Specification

## 1. Phase 0: Core Data & Security Invariants

1. **Zero-Trust SuperAdmin Elevation (`admins/{uid}`)**:
   - SuperAdmin access is NEVER unlocked via client-side PINs or `sessionStorage`.
   - Only an authenticated user whose Firebase Auth `uid` has a matching document in `/admins/{uid}` OR whose verified token email (`request.auth.token.email_verified == true`) equals `12345865amar@gmail.com` has `isAdmin()` privileges.
2. **Strict Clinic Isolation (`doctors/{doctorId}`, `patients/{patientId}`, `appointments`, `vitals`, `clinic_invoices`, `clinic_contracts`, `attachments`, `lab_orders`)**:
   - A cardiologist (`request.auth.uid == doctorId`) can read/write ONLY their own clinic documents.
   - A cross-clinic doctor (`uid != doctorId`) receives `PERMISSION_DENIED` on any `get`, `list`, `create`, `update`, or `delete`.
3. **Receptionist / Nurse Bounded RBAC (`clinic_staff/{staffUid}`, `staffUids` propagation)**:
   - Receptionist access to clinic operational collections (`patients`, `appointments`, `clinic_invoices`, `clinic_contracts`, `attachments`, `vitals`) requires `request.auth.uid in resource.data.staffUids` (or parent patient's `staffUids`) AND `staffUids.size() <= 10`.
   - Receptionist accounts are **denied** from modifying clinical-only records (`prescriptions`, `cardiology_reports`, `referrals`, `doctors/{doctorId}` profile/quotas, `clinic_staff` roster management).
4. **Partner Lab Isolation (`labs/{labId}`)**:
   - Only active labs (`labs/{request.auth.uid}.status == 'active'`) whose `linkedClinics` includes the target `clinicCode` may read linked clinic `patients`, read `lab_orders`, write `patients/{patientId}/lab_results`, update `patients/{patientId}.labs`, or create `notifications`.
   - Unlinked labs or `pending`/`suspended` labs receive `PERMISSION_DENIED`.
5. **Registration Account Status Lock**:
   - Self-registered Doctors (`doctors/{uid}`) and Labs (`labs/{uid}`) on `create` MUST set `status == 'pending'`, `id == request.auth.uid`, and cannot inject `status: 'active'` or elevated AI quotas. Only `isAdmin()` can promote `status` to `'active'` or `'suspended'`.
6. **Public Non-PII Boundary (`doctor_schedules`, `slot_counts`, `plans`)**:
   - QR booking reads ONLY non-PII `doctor_schedules` + `slot_counts/{date}` and NEVER queries `doctors` or `appointments` publicly.
7. **Volumetric & Field Validation**:
   - Every string length, numeric boundary, enum, and document ID format (`^[a-zA-Z0-9_\-]+$`, max 128 chars) is enforced at rule level.

---

## 2. The "Dirty Dozen" Adversarial Test Payloads

| # | Attack Scenario | Target Path | Malicious Payload / Operation | Expected Result |
|---|-----------------|-------------|-------------------------------|-----------------|
| 1 | **Fake Admin Self-Creation** | `/admins/attackerUid` | `create` `{ uid: "attackerUid", email: "attacker@evil.com", role: "superadmin" }` signed in as non-bootstrap email | `PERMISSION_DENIED` |
| 2 | **Unverified Bootstrap Email Spoof** | `/admins/spoofUid` | `get`/`create` with `email: "12345865amar@gmail.com"` and `email_verified: false` | `PERMISSION_DENIED` |
| 3 | **Self-Activation Bypass on Doctor Signup** | `/doctors/newDocUid` | `create` `{ id: "newDocUid", name: "Dr Evil", clinicCode: "CL-1", status: "active", aiQuotaLimit: 999999 }` | `PERMISSION_DENIED` |
| 4 | **Shadow Field Injection on Patient Update** | `/patients/p123` | `update` `{ status: "مستقر", isVerifiedAdminBypass: true }` | `PERMISSION_DENIED` |
| 5 | **Cross-Clinic Patient Scraping (`list`)** | `/patients` | `list` `collection(db, 'patients')` without matching `doctorId == auth.uid` | `PERMISSION_DENIED` |
| 6 | **Receptionist Writing Doctor Prescription** | `/patients/p123/prescriptions/rx1` | `create` by receptionist UID (`uid in patient.staffUids`, `uid != doctorId`) | `PERMISSION_DENIED` |
| 7 | **Receptionist Elevating Role to Doctor** | `/users/recUid` | `update` `{ role: "doctor", status: "active" }` by receptionist UID | `PERMISSION_DENIED` |
| 8 | **Unlinked Lab Reading Clinic Patients** | `/patients` | `list` `where('clinicCode', '==', 'CLINIC-TARGET')` by active lab not linked to `'CLINIC-TARGET'` | `PERMISSION_DENIED` |
| 9 | **Pending Lab Writing Biomarkers** | `/patients/p123/lab_results/r1` | `create` by lab with `status == 'pending'` | `PERMISSION_DENIED` |
| 10 | **Immutable Doctor Ownership Hijack** | `/patients/p123` | `update` `{ doctorId: "attackerDocUid" }` by doctor or receptionist | `PERMISSION_DENIED` |
| 11 | **Oversized Payload / Denial-of-Wallet** | `/patients/p123/attachments/att1` | `create` `{ dataUrl: "<2MB string>", title: "x".repeat(500) }` | `PERMISSION_DENIED` |
| 12 | **Invalid ID Poisoning** | `/clinic_contracts/../../evil$id` | `create` with path traversal or >128 char doc ID | `PERMISSION_DENIED` |
