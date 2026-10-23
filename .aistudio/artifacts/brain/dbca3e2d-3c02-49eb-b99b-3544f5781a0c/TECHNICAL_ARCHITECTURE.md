# Technical Architecture: Cardios Platform

## 1. High-Level Architecture
Cardios utilizes a cloud-native, secure architecture designed for scalability and data integrity in the healthcare domain.

- **Frontend (Web/Mobile-Responsive)**: React 19 + TypeScript + Vite. Tailwind CSS for responsive UI.
- **Backend (API Layer)**: Express (Node.js) acting as the secure gateway.
- **Database**: PostgreSQL (Cloud SQL) for structured, relational health data (EHR, Appointments, RPM logs).
- **Integrations**: Secure RESTful/HL7 FHIR API wrappers for Lab/Radiology connectivity.
- **Security**: Firebase Authentication (Auth/Role-based Access Control), TLS encryption for all data in transit.

## 2. Data Schema Overview (Cardiology Focus)
- `Patients`: ID, Personal Info, Medical History.
- `Doctors`: ID, Clinic Details, Credentials.
- `Encounters`: Encounter ID, Date, Doctor ID, Patient ID, Notes, Diagnosis.
- `LabResults`: Result ID, Patient ID, Provider ID, Data (JSON/PDF), Timestamp.
- `Vitals`: Vital ID, Patient ID, Type (BP, HR), Value, Timestamp.
- `Medications`: Med ID, Patient ID, Dosage, Frequency, Adherence Status.

## 3. Security & Compliance
- Role-Based Access Control (RBAC): Differentiate roles for Doctor, Patient, and Clinical Staff.
- Audit Logging: Immutable log of all data access and modifications.
- Localized Data Residency: Ensure compliance with Egyptian data regulations (hosting in closest available cloud region).
