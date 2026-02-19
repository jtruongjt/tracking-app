# Tracking App (V1)

Web app to track monthly sales progress for two teams:
- Expansion: scored on TQR only
- New Logo: weighted score = 70% NL + 30% TQR
- Sub teams supported:
  - Expansion: Team Lucy, Team Ryan
  - New Logo: Team Justin, Team Kyra

Includes:
- Overwrite current totals (no login)
- Live dashboard with pace flags (`On Track`, `At Risk`, `Behind`)
- Daily activity tracking (`SDR events`, `events created`, `events held`) by rep and date
  - `/activity` for activity dashboard and submissions visibility
  - `/activity/update` for activity submission/editing

## Stack
- Next.js 14 (App Router + TypeScript)
- Supabase Postgres

## Environment
Copy `.env.example` to `.env.local` and set:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
NEXT_PUBLIC_ENABLE_DAILY_ACTIVITY=true
```

## Database Setup
1. Create a Supabase project.
2. Run SQL in `supabase/schema.sql`.
3. Optional sample data: run `supabase/seed.sql`.
4. If your DB was already created before sub-team support, run `supabase/sub_team_migration.sql`.
5. To pre-fill all months with same targets through January 2027, run `supabase/fill_targets_through_2027_01.sql`.
6. Optional cleanup for older installs: run `supabase/remove_snapshot_features.sql`.
7. For existing installs, run `supabase/add_daily_activity.sql` to enable daily activity tracking.

Note: this MVP intentionally has no auth/RLS restrictions so anyone can edit.

## Run
```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Behavior Rules
- Totals are overwrite-only per rep per month.
- No delete operation.
- Pace tolerance is 10%.
- Daily activity is upsert-only per rep per date (`rep_id + activity_date`).
- Set `NEXT_PUBLIC_ENABLE_DAILY_ACTIVITY=false` to hide and disable the Daily Activity feature quickly.
