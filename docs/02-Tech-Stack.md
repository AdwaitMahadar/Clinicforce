# Technology Stack - Clinicforce

This document outlines the enterprise-grade technical foundation for the Clinicforce SaaS platform. The stack is optimized for maximum type safety, scalability, and developer control, moving away from "magic" platforms in favor of explicit, portable architecture.

## 1. Core Frameworks & Language
*   **Framework:** [Next.js 15](https://nextjs.org/) (App Router; `pnpm dev` / `pnpm build` use Turbopack)
*   **UI:** [React 19](https://react.dev/)
*   **Language:** [TypeScript](https://www.typescriptlang.org/) (Strict mode enabled)
*   **Runtime:** Node.js 20+

## 2. Backend & Data Management
*   **Database:** PostgreSQL (Local development via Docker Compose)
*   **ORM:** [Drizzle ORM](https://orm.drizzle.team/)
    *   *Rationale:* Lightweight, type-safe, and provides a "thin" wrapper over raw SQL for maximum performance and explicit migrations.
*   **Authentication:** [Better-Auth](https://www.better-auth.com/)
    *   *Strategy:* Database-session based.
    *   *Integration:* Drizzle-adapter.
*   **Validation:** [Zod 4](https://zod.dev/)
    *   Used for form validation, server action input, and shared schemas under `lib/validators/`.
    *   **Shared enums:** String lists that must match PostgreSQL enums and UI types live in `lib/constants/` (`as const`, no Zod). Validators import them for `z.enum()`; Drizzle `pgEnum()` uses the same arrays — avoids drift between DB, Zod, and `types/`.
*   **File Storage:** S3 Compatible Storage
    *   *Local:* [Minio](https://min.io/) (via Docker Compose)
    *   *Client SDK:* AWS SDK v3 (S3 Client)

## 3. UI & Frontend
*   **Styling:** [Tailwind CSS 4](https://tailwindcss.com/)
*   **Component Library:** [Shadcn/UI](https://ui.shadcn.com/) (Radix UI)
*   **Icons:** [Lucide React](https://lucide.dev/)
*   **Command palette:** [cmdk](https://cmdk.paco.me/) (global search dialog)
*   **Motion:** [Framer Motion](https://www.framer.com/motion/) (select transitions)
*   **Drag-and-drop:** [`@dnd-kit/core`](https://dndkit.com/) + [`@dnd-kit/sortable`](https://dndkit.com/) — sortable lists (e.g. prescription line items on the appointment **Prescriptions** tab)
*   **Calendar:** [FullCalendar React](https://fullcalendar.io/docs/react); date pickers via **react-day-picker** / Shadcn Calendar
*   **Forms:** [React Hook Form](https://react-hook-form.com/) + Zod integration.
*   **Color picker (settings):** [react-colorful](https://github.com/omgovich/react-colorful) — lightweight hex picker used inside popovers on the Settings **General** tab (`HexColorPicker`).
*   **Toasts:** [Sonner](https://sonner.emilkowal.ski/)

## 4. Development Environment (Local)
*   **Containerization:** `docker-compose.yml` for PostgreSQL and Minio.
*   **Package Manager:** `pnpm`
*   **Linting/Formatting:** ESLint + Prettier.

## 5. SaaS Multi-tenancy Architecture
*   **Pattern:** Multi-tenant Column-based isolation.
*   **Isolation Logic:** 
    *   A central `clinics` table serves as the "Tenant" record.
    *   Every business entity (Users, Patients, Appointments, etc.) includes a `clinicId` foreign key.
    *   Middleware-level context or Repository-level filters ensure that cross-tenant data leakage is impossible.
*   **Scalability:** Designed to move from a single-clinic local instance to a global multi-tenant SaaS with zero architectural changes.
