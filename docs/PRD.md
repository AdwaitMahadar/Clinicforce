Description:
Clinicforce is a clinic management system (web app only) for small clinics that helps them manage their patients, appointments, and documents (prescriptions, reports, etc.). Basically a digital version of a paper-based clinic management system.

Clarifications:
The app does not support any booking or scheduling of appointments. 
The only users to the app are the ones in the 'User' table, the patients cannot see or use the app. 
The prescription and other documents are not generated in the app, they are only uploaded to the app. 
ChartId is a 3-6 digit unique user-friendly identifier within that table (entity) works pretty much the same as _id but is visible to users in the UI. (e.g. 1001)
Documents can be  attached to any user or patient, their type can range from prescription, reports, x-rays, identifaction, contact, etc. 
Medicines are only for reference and data building for now, later when prescription generation is supported in the app, then it will be shown in there for doctor to add medicines to the prescription (type of document) in one click.
Medicines and its fields can we viewed, created, edited and deleted from the UI for now, the relations and usage is in future scope for now. The lastPrescribedDate field is manually updated for now.

Roles-based persmissions:
1. Staff (Receptionist):
    - Can view, add, edit and delete appointments.
    - Can view, add and edit patients.
    - Can view, and add documents.
    - Can view, and add medicines.
2. Doctor:
    - Can view, add, edit and delete appointments.
    - Can view, add, edit and delete patients.
    - Can view, add, edit and delete documents.
    - Can view, add, edit and delete medicines.
3. Admin:
    - Can view, add, edit and delete users.
    - Can view, add, edit and delete appointments.
    - Can view, add, edit and delete patients.
    - Can view, add, edit and delete documents.
    - Can view, add, edit and delete medicines.

Main Entities:
1. Users (Admin, Doctor, Staff)
2. Patients
3. Appointments
4. Documents
5. Medicines

Entity Relationships:
- Users (type = Doctor, specifically) can have multiple appointments (staff and Admin do not have appointments).
- Patients can have multiple appointments.
- Patients can have multiple documents.
- Users can have multiple documents attached to them.

Entities in Detail:
1. Users:
    - _id
    - firstName
    - lastName
    - email
    - phone
    - address
    - chartId
    - Type (Admin, Doctor, Staff)
    - isActive 
    - createdAt
    - updatedAt 
    - createdBy 

2. Patients:
    - _id
    - firstName
    - lastName
    - email
    - phone
    - address
    - chartId
    - DateOfBirth
    - Gender
    - BloodGroup
    - EmergencyContact
    - EmergencyContactPhone
    - Allergies
    - notes
    - isActive 
    - createdAt
    - updatedAt 
    - createdBy 
 
3. Documents:
    - _id
    - title
    - description
    - Type (prescription, lab-report, x-ray, scan (ct, mri, etc.), identifaction, insurance, consent-form, other)
    - PresignedUrl
    - AssignedToId (_id of user or patient)
    - AssignedToType (user or patient)
    - AppointmentId
    - docObj (fileName, fileSize, mimeType)
    - createdAt
    - updatedAt 
    - uploadedBy 

4. Appointment:
    - _id
    - title
    - description
    - status (pending, completed, cancelled, no-show)
    - Type (general, follow-up, emergency)
    - DoctorId
    - PatientId
    - Date (with time)
    - duration
    - notes
    - actualCheckInTime
    - actualCheckOutTime
    - isActive 
    - createdAt
    - updatedAt 
    - createdBy 

5. Medicines:
    - _id
    - Name
    - Description
    - Brand
    - lastPrescribedDate
    - form
    - isActive 
    - createdAt
    - updatedAt 
    - createdBy 
    
