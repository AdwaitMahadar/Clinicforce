/**
 * lib/detail-tab-fetch-cache.ts
 *
 * Single module-level `React.cache` wrappers for appointment/patient/settings **tab**
 * server actions. `lib/parallel-tab-data-prefetch.tsx` and real tab loaders must import **only** these
 * exports — never define `cache()` inline elsewhere or deduplication breaks silently.
 *
 * Server-only — import from async Server Components or other server modules only.
 */

import { cache } from "react";
import {
  getAppointmentDetailDocumentsTab,
  getAppointmentDetailAppointmentsTab,
  getAppointmentDetailPrescriptionsTab,
} from "@/lib/actions/appointments";
import {
  getPatientDetailDocumentsTab,
  getPatientDetailAppointmentsTab,
  getPatientDetailPrescriptionsTab,
} from "@/lib/actions/patients";
import {
  getSettingsDetailIntegrationsTab,
  getSettingsDetailTemplatesTab,
} from "@/lib/actions/settings";

export const fetchAppointmentDetailDocumentsTabCached = cache(
  async (appointmentId: string) => getAppointmentDetailDocumentsTab(appointmentId)
);

export const fetchAppointmentDetailAppointmentsTabCached = cache(
  async (appointmentId: string) => getAppointmentDetailAppointmentsTab(appointmentId)
);

export const fetchAppointmentDetailPrescriptionsTabCached = cache(
  async (appointmentId: string) => getAppointmentDetailPrescriptionsTab(appointmentId)
);

export const fetchPatientDetailDocumentsTabCached = cache(
  async (patientId: string) => getPatientDetailDocumentsTab(patientId)
);

export const fetchPatientDetailAppointmentsTabCached = cache(
  async (patientId: string) => getPatientDetailAppointmentsTab(patientId)
);

export const fetchPatientDetailPrescriptionsTabCached = cache(
  async (patientId: string) => getPatientDetailPrescriptionsTab(patientId)
);

export const fetchSettingsDetailTemplatesTabCached = cache(async () =>
  getSettingsDetailTemplatesTab()
);

export const fetchSettingsDetailIntegrationsTabCached = cache(async () =>
  getSettingsDetailIntegrationsTab()
);
