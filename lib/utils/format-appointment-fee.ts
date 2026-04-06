/**
 * Display-only INR label for appointment fee (DB `appointments.fee`).
 * Does not perform locale currency formatting — plain fixed decimals + ₹ prefix.
 */
export function formatAppointmentFeeInr(fee: number | null | undefined): string {
  if (fee == null || Number.isNaN(fee)) return "—";
  return `₹${fee.toFixed(2)}`;
}
