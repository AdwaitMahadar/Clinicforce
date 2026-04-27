# 04 — API Specification

Server actions and route handlers: session-scoped `clinicId`, RBAC via `requireRole`, Zod validation from `lib/validators/`. Full error-handling pattern: `docs/09` / `skills/api-and-validation/SKILL.md`.

## Auth Validators (`lib/validators/auth.ts`)

`loginSchema` and `LoginFormValues` live in `lib/validators/auth.ts`. The login client module imports from there — it does not define inline schemas.

## Public route handlers (no session)

| Handler | Contract |
|--------|----------|
| `GET /api/clinic?subdomain=` | Query param `subdomain` required. Resolves an **active** clinic row (`getActiveClinicBySubdomain`). **200:** `{ clinicId, name }`. **400** if `subdomain` missing. **404** if unknown or inactive. No auth — for tooling or external clients; the login page resolves branding server-side instead of calling this. |

## React Hook Form + Zod (client)

When using `zodResolver(schema)` with fields that use Zod `.default()` (e.g. `rememberMe: z.boolean().default(false)`):

1. **Do not** set `defaultValues` in `useForm` for those keys — the schema already supplies the default.
2. **Do not** combine `useForm<z.infer<typeof schema>>()` with that pattern unless you also align input vs output types (e.g. `z.input`). Prefer **`useForm({ resolver: zodResolver(schema) })` without an explicit generic** so `react-hook-form` infers from the resolver, and keep a separate `z.infer<typeof schema>` alias for the submit handler (see `app/(auth)/login/login-page-client.tsx`).

Duplicating defaults in `useForm` or forcing `z.infer` as the form generic while the resolver’s input type still treats optional keys can produce a TypeScript mismatch (`boolean | undefined` vs `boolean`).

## String IDs in Zod

- **Postgres UUIDs** (e.g. `patientId`, appointment `id`): validate with `z.string().uuid()` where the value is always a UUID.
- **Better-Auth user ids** (e.g. appointment `doctorId`): validate with `z.string().min(1)` only — Better-Auth `user.id` is not guaranteed to be UUID-shaped.
- **Document `assignedToId`:** validate with `z.string().min(1)` — it is a patient row UUID when `assignedToType` is `patient`, or a Better-Auth user id when `assignedToType` is `user` (see `lib/validators/document.ts`).

## Documents (S3 presigned flow)

| Action | Purpose |
|--------|---------|
| `getUploadPresignedUrl` | Validates file meta; returns `{ uploadUrl, fileKey }` — no DB write. Object key: `{subdomain}/docs/patients|users/{id}/…` from `session.user.clinicSubdomain` and `assignedToType` / `assignedToId` (`lib/storage/document-object-key.ts`). Schema: `getUploadPresignedUrlSchema` in `lib/validators/document.ts`. |
| `confirmDocumentUpload` | After client PUT to storage; validates `assignedToType` (`"patient" \| "user"`) and `assignedToId` from input; verifies `assignedToId` belongs to the session `clinicId` before insert (clinic-boundary check). Inserts `documents` row using the client-supplied `assignedToType`. Calls `revalidatePath` for patient and (if set) appointment detail routes. Schema: `confirmDocumentUploadSchema`. |
| `getViewPresignedUrl` | Returns `{ url }` presigned GET for opening in a new tab. |
| `deleteDocument` | Deletes S3 object then DB row (doctor/admin only). |

**RBAC:** `getUploadPresignedUrl`, `confirmDocumentUpload`, and `getViewPresignedUrl` call `requireRole(session, ["admin", "doctor"])`. `deleteDocument` is also admin/doctor only. Staff cannot presign upload, persist metadata, or open files via these actions.

See `docs/09-File-Upload-Flow.md` for the browser sequence and Minio env vars.

## Global search

| Action | Purpose |
|--------|---------|
| `searchGlobal` | Accepts a trimmed query string (min 2 characters). Runs up to four parallel scoped reads (`LIMIT 5` each), all scoped by `clinicId`: patients (name/email/phone/chart id; `phone` on hits), active appointments (title / patient / doctor; `category`, `visitType`, nullable `title` for `formatAppointmentHeading`). **Medicines:** queried only when **`session.user.type !== "staff"`**; **staff** receive **`medicines: []`** (no medicines query). **Documents:** queried only when the user has `viewDocuments` (admin/doctor); **staff** skip the documents query and receive **`documents: []`**. Document hits (when run): title / file name / description; `mimeType` for list icons; optional patient join. Returns `GroupedSearchResults` (`types/search.ts`). Schema: `searchGlobalQuerySchema` in `lib/validators/search.ts`. Client: `UniversalSearch` (Medicines group: `usePermission("viewMedicines")`; Documents: `usePermission("viewDocuments")`). |

## Prescriptions (`lib/actions/prescriptions.ts`)

**Business rules (draft/publish, soft deletes, lazy-create, patient list):** `docs/08-Business-Rules.md` §6.

**RBAC:** All actions call **`requireRole(session, ["admin", "doctor"])`** — staff are excluded (parallel to documents). **`clinicId`** is always taken from the session; queries join through **`prescriptions`** / **`appointments`** / **`medicines`** with clinic scope.

**Draft vs published:** **`published_at`** on **`prescriptions`** — **`null`** = draft (mutations allowed); non-null = published (all mutations that change data reject). **`medicine_name`** on **`prescription_items`** is **`null`** in draft and filled only by **`publishPrescription`** from **`medicines.name`**. **`medicines.last_prescribed_date`** is updated **only** at publish (distinct active **`medicine_id`** values), not on add.

| Action | Schema (`lib/validators/prescription.ts`) | Behaviour summary |
|--------|-------------------------------------------|---------------------|
| **`addPrescriptionItem`** | `addPrescriptionItemSchema` | **Lazy-create:** if no **`prescriptions`** row for the **`appointmentId`** in the clinic, inserts one with the next per-clinic **`chart_id`** (same random retry pattern as patient chart IDs), **`patient_id`** / **`doctor_id`** from **`appointments`** (never from client), **`published_at = null`**, **`created_by`** from session. Rejects if appointment missing/inactive, medicine missing/inactive, prescription already **published**, or prescription row **`is_active = false`**. Inserts an active line with **`medicine_name = null`** and **`sort_order = max(active)+1`**. If a **soft-deleted** line already exists for the same **`(prescription_id, medicine_id)`** (unique constraint), **reactivates** that row and overwrites dosage fields instead of inserting. Returns full **`PrescriptionWithItemsPayload`**. |
| **`updatePrescriptionItem`** | `updatePrescriptionItemSchema` | Partial update by **`id`**; optional **`medicineId`** (clears **`medicine_name`** to **`null`** when the medicine changes). Rejects if item missing/inactive, prescription published/inactive, or target **`medicine_id`** already used on another line for that prescription (including inactive rows — client should re-add via **`addPrescriptionItem`**). |
| **`reorderPrescriptionItems`** | `reorderPrescriptionItemsSchema` | **`{ prescriptionId, items: [{ id, sortOrder }] }`**. Verifies prescription clinic + draft; every **`id`** must be an **active** item on that prescription; bulk-updates **`sort_order`**. |
| **`removePrescriptionItem`** | `removePrescriptionItemSchema` | Soft-deletes one item (**`is_active = false`**). Draft only. |
| **`clearPrescriptionItems`** | `clearPrescriptionItemsSchema` | Soft-deletes **all active** items for a prescription. Draft only. Prescription row remains (empty draft allowed). |
| **`updatePrescriptionNotes`** | `updatePrescriptionNotesSchema` | Sets **`prescriptions.notes`** (transform clears null/blank). Draft only. |
| **`publishPrescription`** | `publishPrescriptionSchema` | Requires ≥1 **active** item; writes **`medicine_name`** from **`medicines`** for each active line; sets **`last_prescribed_date = now()`** per distinct medicine; sets **`published_at = now()`**. **Irreversible.** |
| **`getPrescriptionByAppointment`** | `{ appointmentId }` (UUID) | **`{ success, data }`** where **`data`** is **`null`** if there is no **active** (`prescriptions.is_active = true`) prescription for that appointment in the clinic (including after appointment soft-delete deactivates the prescription), else **`PrescriptionWithItemsPayload`**: header fields (no **`clinic_id`** in payload) + **`items`** (active only, ordered by **`sort_order`**). Each item includes **`displayMedicineName`**: use stored **`medicine_name`** when set (published), else current catalog name from join. |
| **`getPrescriptionsByPatient`** | `{ patientId }` (UUID) | **`{ success, data: PatientPrescriptionSummary[] }`** — only **published** active prescriptions (**`prescriptions.is_active = true`** and **`prescriptions.published_at IS NOT NULL`**; drafts are excluded), joined appointment **`scheduled_at`** descending. Each row: **`id`**, **`chartId`**, **`appointmentId`**, **`scheduledAt`**, **`doctorName`**, **`activeItemCount`**, **`publishedAt`**. |

**Cache:** Successful mutating actions call **`revalidatePath`** on **`/appointments/dashboard`**, **`/patients/dashboard`**, **`/appointments/view/[appointmentId]`**, and **`/patients/view/[patientId]`** for the linked entities (shared helper in **`lib/actions/prescriptions.ts`** — covers intercepting + full-page appointment detail cache). The appointment **`PrescriptionsTab`** also calls **`router.refresh()`** after **Publish** so **`prescriptionHistory`** on the client matches SSR immediately.

## Appointments (`lib/actions/appointments.ts`)

Create/update payloads use **`scheduledDate`** (`YYYY-MM-DD`) and **`scheduledTime`** (`HH:mm`). **Create** requires both; **`updateAppointment`** may send either field to recompute `scheduled_at`. Server actions merge them into **`scheduled_at`** using a full `YYYY-MM-DDTHH:mm:ss` string before `new Date()` — never parse a bare time string alone. Payloads use **`category`** and **`visitType`** (camelCase; DB column `visit_type`) from `lib/constants/appointment.ts`. The same module exports **`FOLLOW_UP_WINDOW_DAYS`** (`60`) for follow-up-style **create** defaults (e.g. form prefill); see `docs/08-Business-Rules.md`. **`title`** is optional (nullable in DB).

**`/appointments/new` prefill (no new server actions):** Modal and full-page **`page.tsx`** read **`searchParams`** and build **`AppointmentCreateInitialValues`** via **`parseNewAppointmentSearchParams`** (`app/(app)/appointments/_lib/parse-new-appointment-search-params.ts`), passed into **`AppointmentDetailPanel`** as **`initialValues`**. See `docs/07-Page-Specifications.md` (section 5 — New Appointment; query keys). **`fee`** is optional (`numeric(10,2)` nullable); omitted or empty on create → `null`; on update, empty string / explicit clear → `null`. **`actualCheckIn`** in the payload is **time-only**; the action combines it with the server’s current calendar day (`new Date()`) when setting `actual_check_in`. Schemas: `createAppointmentSchema` / `updateAppointmentSchema` in `lib/validators/appointment.ts`.

`updateAppointment` does **not** update `patientId`. If the client sends `patientId` and it differs from the stored row, the action returns an error. The UI omits `patientId` on update and keeps the patient select disabled in edit mode.

After a successful **`createAppointment`**, **`updateAppointment`**, or **`deleteAppointment`** (soft cancel), the action calls **`revalidatePath("/appointments/dashboard")`** so the appointments calendar server cache matches the database. Detail/create UIs call **`router.refresh()`** via **`useDetailExit`** after mutations: **intercepting modal** wraps **`onClose`** (e.g. **`router.back()`**) and **`router.refresh()`** in React **`startTransition`**; **full-page** refreshes immediately after **`router.replace`**.

**`deleteAppointment`:** Runs in a **single DB transaction**: sets **`appointments.is_active = false`**, then if a **`prescriptions`** row exists for that **`appointment_id`** in the clinic, sets **`prescriptions.is_active = false`** and **`prescription_items.is_active = false`** for all items on that prescription. There is **no** hard-delete path for appointments in app code — soft cancel only.

**Picker helpers:** `getActiveDoctors()` — `lib/actions/appointments.ts` (appointment form doctor `<Select />`). **`searchPatientsForPicker({ query })`** — `lib/actions/patients.ts`: returns up to **8** active patients; search matches the same columns as directory `getPatients` (name, email, phone, chart id); empty `query` returns the first 8 active patients by name. Used by the appointment **patient** combobox (`AsyncSearchCombobox` + `AppointmentPatientCombobox`). **`getActivePatients()`** remains in `lib/actions/patients.ts` for other bulk-picker needs but is **not** used to preload the appointment form. RBAC: `requireRole(session, ["admin", "doctor", "staff"])` on these actions.

**`searchMedicinesForPicker({ query?, excludeIds? })`** — `lib/actions/medicines.ts`; schema **`searchMedicinesForPickerInputSchema`** in **`lib/validators/medicine.ts`**. Returns up to **8** active medicines per clinic; search matches **name**, **brand**, and **category** (case-insensitive); empty **`query`** returns the first 8 active medicines ordered by **name**. Optional **`excludeIds`** (UUID array) excludes rows — e.g. medicines already on the current prescription draft. Each row: **`id`**, **`name`**, **`category`**, **`brand`**, **`form`**, **`lastPrescribedDate`**. Query: **`searchActiveMedicinesForPicker`** in **`lib/db/queries/medicines.ts`**. RBAC: **`requireRole(session, ["admin", "doctor"])`** (staff have no medicines access).

## Patients (`lib/actions/patients.ts`)

**`getPatients`** (via `lib/db/queries/patients.ts`): each list row includes **`status: "active" | "inactive"`** derived from `patients.is_active`. The list payload does **not** include `isActive`; dashboard and other consumers must map **`row.status`** into UI types (`types/patient.ts` `PatientRow`). **`lastVisit`**, **`assignedDoctor`**, **`lastVisitCategory`**, and **`lastVisitDoctorId`** are derived only from **completed** appointments with **`scheduled_at < now()`** (DB time) and `is_active` on the appointment row — see `docs/08-Business-Rules.md` (Patient Rules — patients directory “Last visit”). **`lastVisitCategory`** is the DB enum string; **`lastVisitDoctorId`** is the appointment’s `doctor_id`. The dashboard also maps a **`lastVisitAt`** ISO string on **`PatientRow`** (from the same raw `lastVisit` timestamp) for client-only logic (e.g. `/appointments/new` prefill visit type vs **`FOLLOW_UP_WINDOW_DAYS`**). **`getPatientDetail`** / `getPatientById` expose **`isActive`** on the action aggregate; **`buildPatientDetail`** maps both **`isActive`** and **`status`** on **`PatientDetail`**. Full column contract: `docs/07-Page-Specifications.md` (Patients dashboard).

**`updatePatient`:** `updatePatientSchema` allows optional **`isActive: true`** (`z.literal(true).optional()`). When present, the action sets **`is_active = true`** (reactivation) together with any other allowed field updates. Normal saves omit this key. Deactivation remains **`deactivatePatient`** only.

**`deactivatePatient`:** `id` (UUID); **`requireRole(session, ["admin", "doctor", "staff"])`**; sets **`patients.is_active = false`**; **`revalidatePath("/patients/dashboard")`** on success (same pattern as **`deactivateMedicine`**).

**List cache:** After a successful **`createPatient`**, **`updatePatient`**, or **`deactivatePatient`**, the action calls **`revalidatePath("/patients/dashboard")`** so the patients directory server cache matches the database (same pattern as appointment mutations). Detail UIs also call **`router.refresh()`** via **`useDetailExit`** after mutations.

**Sensitive narrative fields (RBAC):** For **staff**, `getPatientDetail` returns `pastHistoryNotes: null`; `getAppointmentDetail` and list **`getAppointments`** return `notes: null`; **`getAppointmentDetail`** also returns **`patientPastHistoryNotes: null`** (joined patient field used for the appointment sidebar summary). **`createPatient`** / **`updatePatient`** do not persist `past_history_notes` from staff; **`createAppointment`** / **`updateAppointment`** do not persist `notes` from staff (and updates from staff omit `notes` even if tampered). Admin and doctor receive full values.

**Documents (RBAC):** For **staff**, `getPatientDetail` returns **`documents: []`** and `getAppointmentDetail` returns **`patientDocuments: []`** (response-only; DB unchanged). Admin and doctor receive full lists from the query layer.

**Prescriptions (RBAC):** For **staff**, **`getPatientDetail`** returns **`prescriptions: []`** and **`getAppointmentDetail`** returns **`prescriptionHistory: []`** (and **`prescription: null`** — not fetched). Admin and doctor receive **`prescriptions`** / **`prescriptionHistory`** from **`getPrescriptionsByPatient`** embedded in **`getPatientDetail`** / **`getAppointmentDetail`** (published rows only — drafts are excluded server-side; appointment detail loads history by the appointment’s **`patientId`**).

**Appointment title (RBAC):** For **staff**, **`createAppointment`** always persists `title` as null (ignores any client-supplied title). **`updateAppointment`** removes `title` from the parsed payload for staff so existing titles are not updated or cleared via the API. **Read redaction (DB unchanged):** for **staff**, `getAppointmentDetail`, **`getAppointments`**, **`getPatientDetail`** (each nested appointment row’s `title`), **`searchGlobal`** (appointment hits), and **`getRecentAppointments`** return `title: null`. Admin and doctor receive stored titles.

**Appointment summaries (detail Appointments tab):** **`getPatientDetailAppointmentsTab`** and **`getAppointmentDetailAppointmentsTab`** read **`getPatientAppointmentSummaries`** (includes **`fee`**, **`description`**, **`notes`**). Tab actions apply the same read redaction as elsewhere: **`title`** without **`viewAppointmentTitle`**; **`notes`** without **`viewClinicalNotes`**; staff **`fee`** null unless **`status === 'completed'`**. **`mapAppointmentSummaryRowsToPatientAppointments`** maps rows to **`PatientAppointment`** (UI field **`clinicalNotes`** from **`notes`**).

**`getAppointmentDetail` aggregate:** Same outward contract as before: **`patientDocuments`**, **`patientAppointments`**, **`prescriptionHistory`**, **`prescription`**, joined **patient** demographics for **`patientSummary`**, and **`activityLog`** / **`activityLogHasMore`** (staff: empty lists / null redaction as documented above). Internally the action **`await`s `getAppointmentDetailCore`** (single appointment read + activity + field redaction), then runs the tab slice actions in parallel and merges **tab** fields into the result — no duplicate core query. **View routes** await **`loadAppointmentDetailViewData`** / **`loadPatientDetailViewData`** for the blocking shell, compose **`AppointmentDetailPrefetchGroup`** / **`PatientDetailPrefetchGroup`**, and pass **`Appointment*TabLoader`** / **`Patient*TabLoader`** nodes that call **`lib/detail-tab-fetch-cache.ts`** (see **`docs/07-Page-Specifications.md`** §4 / §8). **Prefetch:** those groups skip the prescriptions prefetch when the session lacks **`viewPrescriptions`**. DB: **`getAppointmentById`** remains a convenience that composes core + documents + summaries from `lib/db/queries/patients.ts` / `documents.ts`.

**`getAppointmentDetailCore` / `getPatientDetailCore`:** Return only the **blocking** detail payload (appointment or patient row + joined fields used by the Details form / header / summary card, plus **`activityLog`** / **`activityLogHasMore`** with the same staff skip as the monolithic actions). They omit **`patientDocuments`**, **`patientAppointments`**, **`prescription`**, **`prescriptionHistory`** on appointments and omit **`documents`**, **`appointments`**, **`prescriptions`** on patients — use tab slice actions (or the full **`getAppointmentDetail`** / **`getPatientDetail`**) when those lists are needed. The full **`getAppointmentDetail`** / **`getPatientDetail`** actions **`await` their `*Core` counterpart** and merge tab slices in one follow-up `Promise.all` (no second core query). UI types: **`AppointmentDetailCore`** / **`PatientDetailCore`** in `types/`; mappers **`buildAppointmentDetailCore`** / **`buildPatientDetailCore`** in each entity’s `_lib/*-detail-mapper.ts`.

**Detail tab slice actions (streaming / prefetch):** `lib/actions/appointments.ts` adds **`getAppointmentDetailDocumentsTab`**, **`getAppointmentDetailAppointmentsTab`**, and **`getAppointmentDetailPrescriptionsTab`** (input: appointment UUID; RBAC and response shapes aligned with the corresponding **`getAppointmentDetail`** fields — staff get empty document / Rx payloads where today’s monolithic action does). `lib/actions/patients.ts` adds **`getPatientDetailDocumentsTab`**, **`getPatientDetailAppointmentsTab`**, and **`getPatientDetailPrescriptionsTab`** (input: patient UUID; aligned with **`getPatientDetail`** tab payloads). **`lib/detail-tab-fetch-cache.ts`** exports **one `React.cache` wrapper per slice** (each wraps a call to the matching tab action); prefetch RSCs and real tab loaders must import **only** these cached exports — do not define `cache()` inline in other modules or per-request deduplication breaks silently. **`lib/detail-tab-ui-mappers.ts`** maps tab action rows to **`DocumentsTab`** / list / Rx UI shapes (shared with **`buildAppointmentDetail`** / **`buildPatientDetail`**). RSC entrypoints: **`app/(app)/appointments/_components/detail-tabs/`** (`AppointmentPrefetch*` + **`Appointment*TabLoader`**) and **`app/(app)/patients/_components/detail-tabs/`** (`PatientPrefetch*` + **`Patient*TabLoader`**). DB: **`getAppointmentPatientIdForClinic`** in `lib/db/queries/appointments.ts` and **`isPatientInClinic`** in `lib/db/queries/patients.ts` scope tab reads without loading the full **`getAppointmentById`** / **`getPatientById`** aggregates.

**View-route data helpers (not separate public APIs):** **`loadAppointmentDetailViewData(id)`** in **`appointments/_lib/appointment-detail-view-data.ts`** runs **`Promise.all([getAppointmentDetailCore(id), getActiveDoctors()])`**, returns **`null`** when core fails, otherwise **`{ appointment: buildAppointmentDetailCore(...), doctorOptions }`**. **`loadPatientDetailViewData(id)`** in **`patients/_lib/patient-detail-view-data.ts`** awaits **`getPatientDetailCore`**, maps with **`buildPatientDetailCore`**, or returns **`null`**. Full-page and intercepting **`view/[id]`** entrypoints use these helpers so the outer **`Suspense`** (modal shell) resolves after the **blocking shell** only; tab lists still hydrate via loaders + cache as documented in **`docs/06-UI-Design-System.md`**.

**`React.cache` lifetime:** Tab-slice deduplication applies **within a single RSC render / navigation**. A later full-page load, hard refresh, or new navigation issues new server work (expected); do not assume prefetch warms a separate request.

**`buildAppointmentDetail` → `patientSummary`:** UI mapper (`appointments/_lib/appointment-detail-mapper.ts`) trims string fields to **`null`** when blank; **`gender`** is **`PatientGender | null`** ( **`null`** when DB gender is missing or not one of `male` / `female` / `other` — no default label). **`AppointmentPatientSummaryCard`** uses **`InitialsBadge`** (`size="md"`, **`size-full`** in **`aspect-square`** stretch column) + name, compact horizontal Shadcn **`Badge`** (outline, shared `badgeClass`) for age/gender + **`PatientOpenPill`** (**`ExternalLink`** + “Open”) to **`/patients/view/[patientId]`**; **`AppointmentListTab`** mirrors the same **Open** **`button`** as **`PatientOpenPill`**; accordion **status** and expanded **category / visit / fee** use read-only **`span`** chips with the same **`px-2.5`** shell as **Open** (not patient **`badgeClass`**). **`patientId`** comes from the parent panel. Renders **—** for **`null`**, empty, or whitespace-only display values in those sections. **`bloodGroup`** is still mapped for consumers but not displayed on the sidebar card.

**`PatientRow.chartId`** is a **`number`** (raw integer from DB). The table display layer (`PatientsTable`) is responsible for calling `formatPatientChartId` — the dashboard page must not pre-format it to a string before passing to the row shape.

## Medicines (`lib/actions/medicines.ts`)

**`getMedicines`** (via `lib/db/queries/medicines.ts`): optional **`isActive`** boolean. When **omitted**, the query returns **both** active and deactivated (`is_active`) rows for the clinic (dashboard default). When **`true`** or **`false`**, results are restricted to that activation state. Other list inputs (`search`, `category`, `form`, pagination, sort) are unchanged. RBAC: `requireRole(session, ["admin", "doctor"])`.

**`updateMedicine`:** `updateMedicineSchema` allows optional **`isActive: true`** (`z.literal(true).optional()`). When present, the action sets **`is_active = true`** (reactivation) together with any other allowed field updates. Normal saves omit this key. Deactivation remains **`deactivateMedicine`** only.

**List cache:** After a successful **`createMedicine`**, **`updateMedicine`**, or **`deactivateMedicine`**, the action calls **`revalidatePath("/medicines/dashboard")`** (aligned with appointments). Detail UIs call **`router.refresh()`** via **`useDetailExit`** after mutations.

## Activity Log (`lib/activity-log/`)

### Sensitive Fields Config (`lib/activity-log/sensitive-fields.ts`)

`SENSITIVE_FIELDS: Record<string, string[]>` — single source of truth for which `changedFields[].field` values are sensitive per entity type.

```ts
{ patient: ["pastHistoryNotes"], appointment: ["notes"] }
```

Sensitivity is enforced **at read time on the server** — reader actions strip `oldValue`/`newValue` and replace with `{ sensitive: true }`. Raw values are always stored in the DB. Changing a field here applies universally to all historical log rows.

### Writer Helper (`lib/activity-log/append-activity-log.ts`)

**`appendActivityLog(params)`** — fire-and-forget insert into `activity_log`. Returns `Promise<void>`. Errors are caught and `console.error`'d; they never propagate to the calling server action.

**Params:**
| Field | Type | Description |
|---|---|---|
| `session` | `AppSession` | Derives `actorId`, `actorName`, `actorRole`, `clinicId` |
| `entityType` | `"patient" \| "appointment" \| "medicine" \| "document" \| "user"` | Primary affected entity type |
| `entityId` | `string` | UUID or better-auth id of the primary affected record |
| `action` | `"created" \| "updated" \| "deactivated" \| "reactivated" \| "deleted"` | Mutation type |
| `metadata?` | `{ entityDescriptor: string; changedFields?: ChangedField[] }` | Descriptor + field diffs (`updated`/`reactivated` only) |
| `subscribers?` | `Array<{ entityType, entityId }>` | Secondary entities for cross-entity fan-out |

**Import path:** `@/lib/activity-log`

**Call site convention:** call **after** the successful DB write and **before** `revalidatePath`.

#### `metadata.entityDescriptor` wording

Construct the `entityDescriptor` string from data already available at the call site. Convention per entity and action:

| Entity | created | updated | deactivated | reactivated | deleted |
|---|---|---|---|---|---|
| Patient | `Jane Doe (#PT-3821) added` | `Jane Doe (#PT-3821) updated` | `Jane Doe (#PT-3821) deactivated` | `Jane Doe (#PT-3821) reactivated` | — |
| Appointment | `General · First Visit added` | `General · First Visit updated` | — | — | `General · First Visit deleted` |
| Medicine | `Paracetamol (Tablet) added` | `Paracetamol (Tablet) updated` | `Paracetamol (Tablet) deactivated` | `Paracetamol (Tablet) reactivated` | — |
| Document | `Lab Report · filename.pdf uploaded to Jane Doe (#PT-3821)` | — | — | — | `Lab Report · filename.pdf deleted from Jane Doe (#PT-3821)` |

- Patient descriptor uses `firstName + ' ' + lastName + ' (#PT-' + chartId + ')'`.
- Appointment descriptor uses `category label + ' · ' + visitType label` (human-readable labels, not raw enum values).
- Medicine descriptor uses `name + ' (' + form + ')'`.
- Document descriptor includes the assigned patient's name and chart ID; fetch the patient if not already in scope.

### Reader Actions (`lib/actions/activity-log.ts`)

#### `getEntityActivity(input)`

- **RBAC:** `requireRole(session, ["admin", "doctor", "staff"])` (session presence for all roles) then `hasPermission(session.user.type, "viewActivityLog")` — staff receive `{ success: false, error: "FORBIDDEN" }` immediately
- **Input:** `{ entityType, entityId, page?: number, limit?: number }` (default limit 20)
- **Query:** `clinic_id = clinicId AND (entity_id = entityId AND entity_type = entityType OR subscribers @> [{entityType, entityId}])` — covers both primary and subscribed (cross-entity fan-out) entries
- **Sensitivity:** `applyFieldSensitivity` strips `oldValue`/`newValue` for fields in `SENSITIVE_FIELDS[entityType]`, replacing with `{ sensitive: true }`
- **Subscriber filter (read-time, `applySubscriberFilter`):** Runs after sensitivity stripping. An entry is a subscriber entry when `entry.entityType !== queriedEntityType` (e.g. an appointment log appearing on a patient page). Rules:
  - `created` / `deleted` / `deactivated` → included as-is (actionable events, no field noise)
  - `updated` / `reactivated` **with** a `status` changedField → included, but **only** the `status` field is returned (all other changedFields stripped)
  - `updated` / `reactivated` **without** a `status` changedField → **excluded entirely** (pure field-diff noise)
  - Primary entries (`entry.entityType === queriedEntityType`) are never filtered
- **Pagination:** fetches `limit + 1` rows; if the extra row exists, `hasMore = true`
- **Returns:** `{ success: true, data: { entries: ActivityLogEntry[], hasMore: boolean } }`

#### `getRecentActivity(input?)`

- **RBAC:** all roles (`requireRole(session, ["admin", "doctor", "staff"])`)
- **Input:** `{ page?: number, limit?: number }` (default limit 20)
- **Scope:** staff → `actor_id = session.user.id AND clinic_id`; admin/doctor → full clinic feed
- **Sensitivity:** same stripping as `getEntityActivity`, applied per-entry based on each row's own `entityType`
- **Returns:** `{ success: true, data: { entries: ActivityLogEntry[], hasMore: boolean } }`

### `ActivityLogEntry` type (`types/activity-log.ts`)

```ts
type ChangedField =
  | { field: string; label: string; sensitive: true }
  | { field: string; label: string; sensitive: false; oldValue: string; newValue: string }

type ActivityLogEntry = {
  id: string
  entityType: string
  entityId: string
  action: 'created' | 'updated' | 'deactivated' | 'reactivated' | 'deleted'
  actorName: string
  actorRole: 'admin' | 'doctor' | 'staff'
  entityDescriptor: string
  changedFields: ChangedField[]   // empty array for created/deactivated/deleted
  createdAt: string               // ISO 8601 string
}
```

`changedFields` uses a discriminated union on `sensitive` — UI components check `entry.sensitive` to decide whether to render `oldValue → newValue` or a plain `"updated"` label.

### Phase 6 — Wired into Detail Actions

`getPatientDetail`, `getAppointmentDetail`, and `getMedicineDetail` now call `getEntityActivity` after the main query and include both `activityLog: ActivityLogEntry[]` and `activityLogHasMore: boolean` in their return payload. Staff path: `getEntityActivity` is skipped; `activityLog: []` + `activityLogHasMore: false` returned. **`getPatientDetail`** includes **`prescriptions`** (admin/doctor: **`getPrescriptionsByPatient`**, published only; staff: `[]`). **`getAppointmentDetail`** includes **`prescriptionHistory`** with the same query for the appointment’s patient (staff: `[]`). `DetailPanel` accepts `events?`, `hasMoreEvents?`, `entityType?`, `entityId?`, optional `sidebarTop?`, and optional **`documentsTab`** / **`appointmentsTab`** / **`prescriptionsTab`** bodies (typically async RSC loaders from route/modal shells); each optional tab slot is wrapped in **`React.Suspense`** with **`DetailPanelTabSkeleton`** as fallback. `DetailSidebar` receives `entries` / pagination props and optional `topSlot` for the appointment patient card.

### Phase 7 — Wired into Home Dashboard

`getRecentActivity()` is called in `app/(app)/home/dashboard/page.tsx`'s `Promise.all`. The returned `{ entries, hasMore }` is passed to `HomeDashboardActivityFeed` (`app/(app)/home/_components/HomeDashboardActivityFeed.tsx`) — a `"use client"` component using the same `pageRef`/`isFetchingRef`/`useEffect([entries])` pattern as `DetailSidebar` for subsequent-page fetches. Staff see only their own actions (enforced server-side).

### Phase 8 — Permissions

Two named permissions added to `lib/permissions.ts` (Activity Log section):

| Permission | Holders | Used by |
|---|---|---|
| `viewActivityLog` | `admin`, `doctor` | `getEntityActivity` — `hasPermission` gate after `requireRole` |
| `viewFullActivityLog` | `admin`, `doctor` | `getRecentActivity` — staff lacking this see only `actorId = userId` rows |
