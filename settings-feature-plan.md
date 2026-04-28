# Settings Feature — Implementation Plan

> Read `CLAUDE.md` first, then the docs referenced in each step. This document describes the full picture of what we are building — use it as your north star throughout. Where the expected behavior is clear, follow it. Where implementation details are not specified, explore the codebase and use your best judgment to stay consistent with existing patterns.

---

## What We Are Building

A **Settings modal** — the first surface in Clinicforce that breaks out of the standard top-nav × side-nav matrix layout.

**Two entry points** both trigger navigation to `/settings`:
1. A **three-dots menu** near the user avatar at the bottom-left of `SideNav`
2. The **Clinicforce logo/mark** at the top-right of `TopNav` (currently a static image — make it a clickable button)

The intercepting route catches `/settings` and opens the modal over the current page. Refreshing `/settings` directly renders a full-page fallback — same pattern as all other detail routes in the app.

**Three tabs:** General (fully implemented), Templates (coming soon placeholder), Integrations (coming soon placeholder).

The modal layout mirrors the existing detail page structure — left sidebar with tab list, right main panel with tab content. Same modal size as current detail modals for now.

---

## Data Model

### Two new jsonb columns

**`clinics.settings`** — clinic-wide configuration:
```ts
{
  primaryColor: string          // hex — current active primary
  secondaryColor: string        // hex — current active secondary
  defaultPrimaryColor: string   // hex — clinic's saved baseline primary
  defaultSecondaryColor: string // hex — clinic's saved baseline secondary
  logoUpdatedAt?: string        // ISO timestamp — cache buster for logo.png
}
```

**`users.preferences`** — per-user preferences:
```ts
{
  theme: 'light' | 'dark' | 'system'
}
```

### Logo storage
The logo S3 path convention already exists in the codebase. Logo upload uses a presigned PUT to that fixed path — same key for first upload and updates alike (S3 just overwrites). No DB file key needed. `logoUpdatedAt` in the jsonb is set after a successful upload and acts as a cache buster when the logo URL is built. On remove, the S3 object is deleted and `logoUpdatedAt` is cleared.

### Seeding
New clinics must always have `settings` pre-populated with all four color fields set to baseline values — the DB should never have a clinic row with null color settings. Update the seed script and the manual SQL snippet in the environments doc accordingly.

---

## General Tab — Expected Behavior

### Clinic Appearance section

**Colors** (admin + doctor can edit; staff sees read-only):
- Primary and secondary color pickers with live preview — as the user picks a color it applies to the app immediately via CSS variable update, before saving
- **Reset to Default** — sets current colors back to the stored defaults (admin + doctor)
- **Set as Default** — copies current colors into the default fields, making them the new baseline (admin only)
- When saving colors, merge into the existing jsonb — never overwrite the whole object

The color UI should feel premium and intentional — not just two raw color inputs. Show a small palette preview of primary + secondary together. A mini preview of how they look on a representative element (button, badge) would be a nice touch. Look at the existing design tokens and component style to make this feel native to Clinicforce.

**Logo** (admin only):
- Show current logo if one exists
- Upload: PNG only, 2MB max, presigned PUT to the fixed S3 logo path. Works for both first-time upload and replacing an existing logo
- Remove: deletes the S3 object and clears the cache buster timestamp

### My Preferences section

**Theme** (all roles):
- Three-way toggle: Light / Dark / System
- Applies immediately to the app
- Persisted to `users.preferences`

---

## RBAC

| Control | Staff | Doctor | Admin |
|---|---|---|---|
| View current colors | Read-only | Yes | Yes |
| Change current colors | No | Yes | Yes |
| Reset to default | No | Yes | Yes |
| Set as default | No | No | Yes |
| Logo upload / remove | No | No | Yes |
| Theme toggle | Yes | Yes | Yes |

Use existing `usePermission()` / `<RoleGate>` patterns for UI. Server actions must enforce roles via `requireRole()` — never rely on UI hiding alone.

---

## CSS Variable Injection

Colors from `clinics.settings` need to drive the app's color tokens globally:
- Load clinic settings in `(app)/layout.tsx` alongside the session
- A context provider (client component) wraps the app shell and injects `--color-primary` / `--color-secondary` as CSS custom properties on the document root at hydration
- Theme preference sets `data-theme` on `<html>` (handle `system` via `prefers-color-scheme`)
- Expose a hook so the settings UI can read current values and apply optimistic live updates while the user is picking colors

All components already consume colors via CSS variables per the design system rules — no component changes needed once the variables are wired up correctly.

---

## Implementation Steps

Work through these in order. Each step should be stable before moving to the next.

**Step 1 — Migrations**
Add `settings` jsonb to `clinics` and `preferences` jsonb to `users`. Update the seed script and manual SQL snippet to pre-populate color defaults on clinic creation. Run `pnpm db:generate` then `pnpm db:migrate` locally to verify.

**Step 2 — Server actions & validators**
Write the server actions and Zod validators for: updating clinic settings (colors + logo timestamp), updating user preferences, generating a presigned PUT URL for the logo, confirming a logo upload (sets cache buster), and deleting the logo. Follow existing action and validator patterns in the codebase.

**Step 3 — Settings context & CSS variable injection**
Wire up the context provider in the app layout. Inject CSS variables from clinic settings on mount. Handle theme via `data-theme`. Expose the hook for optimistic updates. Verify colors from the DB apply to the app on load.

**Step 4 — Modal shell & routing**
Create the intercepting modal route and full-page fallback. Add the two entry points (three-dots menu in SideNav, logo click in TopNav). Wire up the three-tab layout with General active and Templates / Integrations showing coming soon placeholders. Verify the modal opens from both entry points and the fallback works on direct URL access.

**Step 5 — General tab UI**
Build the Clinic Appearance section (color pickers with live preview, reset/set-default buttons, logo upload/remove) and My Preferences section (theme toggle). Apply RBAC gating throughout. Verify all interactions persist correctly and that live color preview works.

**Step 6 — Docs sync**
Per the `sync-docs-and-skills` rule in `CLAUDE.md`, update all affected docs: database schema, API spec, UI design system, page specifications, and the main CLAUDE.md "What's Built" section.
