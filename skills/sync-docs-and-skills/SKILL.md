---
name: sync-docs-and-skills
description: Context-routing skill to keep documentation and skills up to date. You MUST trigger this skill whenever you have just made, or are about to make, a code change in Clinicforce that affects a documented rule, database schema, UI component, page layout, API route/server action, RBAC permission, or business rule. This skill guides you to correctly propagate that change to prevent drift between code, docs, and skills.
---

# Sync Docs and Skills

This skill is the source of truth for keeping Clinicforce's documentation and skill files perfectly synchronized with the codebase. Documentation drift is not allowed in this project. 

Whenever you change code that affects the system architecture, business logic, UI, or database, you must propagate that change immediately in the same task.

## 🗺️ Change Mapping Table

Use this table to determine exactly which files need to be updated based on the type of code you changed.

| If you change... | Update these Docs... | Update these Skills... |
| --- | --- | --- |
| A schema, table, field, or enum relation | `docs/03-Database-Schema.md` | `skills/schema-and-data/SKILL.md` |
| Auth flow or RBAC permissions | `docs/05-Authentication.md` | `skills/auth-and-rbac/SKILL.md` |
| A component, navigation, or page layout | `docs/06-UI-Design-System.md`, `docs/07-Page-Specifications.md` | `skills/ui-and-components/SKILL.md` |
| A server action or Zod schema pattern | `docs/04-API-Specification.md` | `skills/api-and-validation/SKILL.md` |
| A business rule, status enum, or validation rule | `docs/08-Business-Rules.md` | `skills/business-rules/SKILL.md` |
| The file upload or pre-signed URL flow | `docs/09-File-Upload-Flow.md` | `skills/file-upload/SKILL.md` |
| Environments, migrations, seed, hosting, env vars | `docs/10-Environments-and-Dev-Workflow.md` | `skills/schema-and-data/SKILL.md`, `skills/auth-and-rbac/SKILL.md` |
| Project structure, built/planned status, or component inventory | `CLAUDE.md` | `skills/ui-and-components/SKILL.md` |

## 🔄 Step-by-Step Propagation Process

When applying a change, follow this exact sequence:

1. **Read the Changed Code**: Understand exactly what was altered in the codebase (e.g., adding a new field to a form, changing a status enum, modifying a Zod validator).
2. **Identify Affected Files**: Look at the mapping table above and pinpoint which doc files and skill files govern the changed area.
3. **Update Docs First**: Open the affected `docs/*.md` files and apply the updates. Documentation is the detailed, canonical source of truth.
4. **Update Skills Second**: Open the affected `skills/*/SKILL.md` files and apply the updates based on the new documentation.
5. **Verify Consistency**: Perform a final sweep to ensure no contradictory information remains across the project files.

## 🎯 Quality Rules for Updating Skills

Skills are meant to be quick-reference guides loaded into the context window. They must remain highly compressed. When updating them:
- **Keep skills distilled**: Never copy long paragraphs or detailed tables verbatim from docs into skills. Summarize the core rule instead.
- **Update the affected section only**: Leave unrelated sections perfectly intact. Do not rewrite the whole skill just to update one bullet point.
- **Preserve `DO NOT` sections**: Always keep the "DO NOT" rules exactly as they are unless the code change explicitly overturned that specific constraint.
- **Keep enums consistent**: Always verify that enum values are spelled exactly the same way across all skills that reference them.
- **Preserve References**: Do not touch or remove the document pointer links at the bottom of the skill files. Ensure they stay intact and accurate.

## 📄 Quality Rules for Updating Docs

Docs are complete architectural records.
- **Update the relevant section only**: Use targeted edits to adjust the specific field, route, or paragraph that changed.
- **Preserve structure and formatting**: Stick to the markdown headers, bolding patterns, and table structures already established in the document.
- **Never remove detail (unless deprecated)**: Only add or update information. Do not trim down descriptions or context unless that feature was explicitly removed from the application.

## 🔎 Final Consistency Check

After completing all edits, **scan all skills** using a simple keyword search to check for cross-references. 

*Example:* If you add or rename a value in the `appointment_status` enum, check `skills/business-rules/SKILL.md`, `skills/schema-and-data/SKILL.md`, and `skills/ui-and-components/SKILL.md` so `StatusBadge`, validators, and docs stay aligned.

## ❌ DO NOT

- **Do not** treat documentation syncing as an optional follow-up task. Do it in the exact same conversational turn/task as the code change.
- **Do not** update a skill without updating its parent document first.
- **Do not** write bloated skill files. If a skill update starts looking like a 50-line addition, stop and distill it to 3 bullet points.
- **Do not** introduce new formatting styles into docs or skills; mirror the surrounding text.
