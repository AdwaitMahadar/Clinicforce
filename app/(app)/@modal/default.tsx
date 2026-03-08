/**
 * app/(app)/@modal/default.tsx
 *
 * Required by Next.js parallel routes.
 * When no modal route is active, this renders null so the rest of the
 * layout (TopNav + SideNav + main content) is unaffected.
 */
export default function ModalDefault() {
  return null;
}
