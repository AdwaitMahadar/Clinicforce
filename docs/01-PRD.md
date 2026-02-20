# Clinicforce Product Requirements Document (PRD)

## 1. Executive Summary
**Clinicforce** is a streamlined Clinic Management System (CMS) designed for small healthcare practices. It serves as a digital transition from paper-based systems, centralizing patient records, appointment tracking, and document management within a professional web application.

---

## 2. Project Scope & Constraints
To maintain a focused MVP (Minimum Viable Product), the following scope constraints are defined:

*   **Internal Access Only**: The application is strictly for clinic staff (Admin, Doctors, Staff). There is no patient-facing portal or self-service scheduling.
*   **Document Management**: The system does not generate prescriptions or reports. It provides a centralized repository for uploading and viewing externally generated digital files.
*   **Manual Scheduling**: Appointments are managed manually by staff; the system does not include automated booking logic or patient notifications at this stage.
*   **Medicine Library**: The Medicines module serves as a reference library and data builder for future automation.

---

## 3. Core Concepts & Business Logic

### 3.1 Identification System (ChartId)
Every User and Patient is assigned a **ChartId**, a unique 3-to-6 digit user-friendly identifier (e.g., `1001`). 
*   Unlike system-generated UUIDs, ChartIds are visible in the UI for ease of reference by staff.
*   They must be unique within their respective entities.

### 3.2 Document Attachment
Documents (Prescriptions, Lab Reports, X-Rays, etc.) are highly flexible:
*   They can be attached directly to a **Patient** or a **User**.
*   They can optionally be linked to a specific **Appointment**.
*   Documents are stored via Secure Presigned URLs.

### 3.3 Appointment Lifecycle
Appointments track the complete lifecycle of a patient visit, including scheduled time versus actual check-in/out times for operational auditing.

---

## 4. User Roles & Permissions

The system utilizes Role-Based Access Control (RBAC) across three primary personas:

| Feature | Staff (Receptionist) | Doctor | Admin |
| :--- | :---: | :---: | :---: |
| **Users Management** | - | - | Full CRUD |
| **Appointments** | Full CRUD | Full CRUD | Full CRUD |
| **Patients** | View / Add / Edit | Full CRUD | Full CRUD |
| **Documents** | View / Add | Full CRUD | Full CRUD |
| **Medicines** | View / Add | Full CRUD | Full CRUD |

*Note: "Full CRUD" includes Create, Read, Update, and Delete.*

---

## 5. Main Entities

### 5.1 Users
Authorized personnel who access the system.
*   **Core Fields**: Name, Email, Phone, Address, ChartId.
*   **Type**: Admin, Doctor, Staff.
*   **Metadata**: `isActive`, `createdAt`, `updatedAt`, `createdBy`.

### 5.2 Patients
Individual medical records for clinic clients.
*   **Medical Profile**: DOB, Gender, Blood Group, Allergies, Emergency Contact Info.
*   **Clinical Notes**: General background or medical history notes.
*   **Metadata**: `chartId`, `isActive`, `createdAt`, `updatedAt`, `createdBy`.

### 5.3 Appointments
Records of clinical consultations or procedures.
*   **Status**: Pending, Completed, Cancelled, No-Show.
*   **Types**: General, Follow-up, Emergency.
*   **Tracking**: Doctor/Patient links, Date/Time, Duration, Actual Check-in/out times.
*   **Notes**: Post-appointment summary or clinical notes.

### 5.4 Documents
Digital file repository associated with clinical activities.
*   **Classifications**: Prescription, Lab-report, X-ray, Scan (CT/MRI), Identification, Insurance, Consent-form, Other.
*   **Relational Data**: Linked to a User/Patient (`AssignedToId`) and optionally an `AppointmentId`.
*   **Storage**: Metadata stored in `docObj` (filename, size, mimetype) with a secure `PresignedUrl`.

### 5.5 Medicines
A reference directory for pharmacological data.
*   **Details**: Name, Description, Brand, Form.
*   **Usage Tracking**: `lastPrescribedDate` (manually updated at present).
*   **Purpose**: To facilitate one-click prescription generation in future iterations.

---

## 6. Future Roadmap
*   **In-App Prescription Generation**: Using the Medicine library to generate digital PDFs.
*   **Patient Portal**: Limited access for patients to view their own uploaded records.
*   **Automated Notifications**: SMS/Email reminders for upcoming appointments.
*   **Advanced Analytics**: Clinic performance reports and patient demographic trends.
