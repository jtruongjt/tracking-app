# AGENTS.md

## Purpose
- This repo is a sales tracking web app for monthly attainment and daily rep activity.
- The primary user-facing areas are:
  - `/` for the dashboard
  - `/update` for monthly total overwrites
  - `/activity` for daily activity views
  - `/activity/update` for daily activity submission/editing
  - `/activity/manager` for weekly manager review
  - `/reps/[repId]` for rep detail/history

## Stack
- Next.js with the App Router and TypeScript.
- `package.json` currently pins `next` `^16.1.6`, `react` `^18`, and `@supabase/supabase-js` `^2.49.1`.
- `tsconfig.json` enables `strict` mode and the `@/*` path alias.
- `next.config.mjs` enables experimental `typedRoutes`.
- `README.md` says "Next.js 14"; this is likely outdated because `package.json` shows Next 16.

## Commands
- Install: `npm install`
- Dev server: `npm run dev`
- Production build: `npm run build`
- Start built app: `npm run start`
- Lint: `npm run lint`

## Repo Layout
- [`app`](C:\Users\jtruong\Sales\tracking-app\app): App Router pages, layout, global CSS, and API routes.
- [`components`](C:\Users\jtruong\Sales\tracking-app\components): interactive UI pieces and forms.
- [`lib`](C:\Users\jtruong\Sales\tracking-app\lib): shared data access, date/scoring logic, feature flags, team/type definitions, and Supabase helpers.
- [`supabase`](C:\Users\jtruong\Sales\tracking-app\supabase): schema, seed data, and additive SQL migrations/scripts.
- [`scripts`](C:\Users\jtruong\Sales\tracking-app\scripts): local data import/normalization utilities.
- [`imports`](C:\Users\jtruong\Sales\tracking-app\imports): likely used for CSV inputs and generated import artifacts.

## App Conventions
- Prefer server components for pages and data loading. The route pages in `app/` are async server components by default.
- Use client components only for interactive form workflows. Current examples include [`components/update-form.tsx`](C:\Users\jtruong\Sales\tracking-app\components\update-form.tsx) and [`components/activity-form.tsx`](C:\Users\jtruong\Sales\tracking-app\components\activity-form.tsx).
- Current top-level pages that read live data set `export const dynamic = "force-dynamic"`. Follow that pattern for pages that must always reflect fresh Supabase state.
- Use the `@/*` import alias instead of deep relative paths.
- Keep route strings compatible with typed routes when using `next/link`; the app already imports `Route` from `next` in route-heavy pages.

## Data And Supabase
- Supabase is the system of record.
- Read operations generally use the anon server client from [`lib/supabase/server.ts`](C:\Users\jtruong\Sales\tracking-app\lib\supabase\server.ts).
- Write operations go through the service-role client in [`lib/supabase/server.ts`](C:\Users\jtruong\Sales\tracking-app\lib\supabase\server.ts), usually via helpers in [`lib/data.ts`](C:\Users\jtruong\Sales\tracking-app\lib\data.ts).
- Prefer adding shared DB access logic to [`lib/data.ts`](C:\Users\jtruong\Sales\tracking-app\lib\data.ts) rather than embedding Supabase queries directly in many components.
- Existing write endpoints live under [`app/api`](C:\Users\jtruong\Sales\tracking-app\app\api) and validate payloads before calling `lib/data.ts`.

## Feature Flags And Access Control
- Daily activity is gated by `NEXT_PUBLIC_ENABLE_DAILY_ACTIVITY`. The code treats any value other than `"false"` as enabled.
- Basic Auth is enforced in [`middleware.ts`](C:\Users\jtruong\Sales\tracking-app\middleware.ts) when both `BASIC_AUTH_USERNAME` and `BASIC_AUTH_PASSWORD` are set.
- `README.md` explicitly says this MVP has no auth/RLS restrictions in Supabase. Do not assume row-level security exists unless you add it deliberately.

## Database Rules Visible In The Repo
- `rep.team` is `expansion` or `new_logo`.
- `rep.sub_team` is constrained and must match the team grouping.
- Monthly totals are keyed by `(rep_id, month)` and are overwrite/upsert based.
- Daily activity is keyed by `(rep_id, activity_date)` and is upsert based.
- Daily activity exemptions are keyed by `(rep_id, activity_date)`.
- API validation enforces:
  - non-negative totals
  - non-negative integer activity counts
  - `YYYY-MM` month format
  - `YYYY-MM-DD` activity date format
  - no weekend daily activity submissions

## Team And Scoring Rules
- Expansion scoring is TQR-only.
- New Logo scoring is weighted: 70% NL + 30% TQR.
- Pace tolerance is 10% according to `README.md`, which matches the thresholds used in [`lib/data.ts`](C:\Users\jtruong\Sales\tracking-app\lib\data.ts) for `at_risk` vs `behind`.
- Current sub-teams are defined in [`lib/teams.ts`](C:\Users\jtruong\Sales\tracking-app\lib\teams.ts).

## When Editing
- Preserve the current split of responsibilities:
  - pages orchestrate params and loading
  - `lib/*` holds business/data logic
  - client components manage form state and submit to API routes
- Keep validation mirrored across client forms and API handlers when changing submission rules.
- If you add a new DB-backed feature, update both:
  - the SQL in [`supabase`](C:\Users\jtruong\Sales\tracking-app\supabase)
  - the TypeScript types/helpers in [`lib/types.ts`](C:\Users\jtruong\Sales\tracking-app\lib\types.ts) and related files
- Be careful with environment-variable-dependent behavior. Missing Supabase env vars throw immediately in [`lib/supabase/server.ts`](C:\Users\jtruong\Sales\tracking-app\lib\supabase\server.ts).

## Likely But Not Fully Guaranteed
- The repo appears intended for internal/shared use behind Basic Auth rather than per-user authentication.
- The `scripts/` and `imports/` flow appears to support one-off CSV normalization/import work for FY27 activity data.
