create extension if not exists pgcrypto;

create table if not exists rep (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  team text not null check (team in ('expansion', 'new_logo')),
  sub_team text not null check (sub_team in ('team_lucy', 'team_ryan', 'team_mike', 'team_bridger', 'team_justin', 'team_kyra', 'team_sydney')),
  active boolean not null default true
);

alter table rep add column if not exists sub_team text;
update rep
set sub_team = case
  when team = 'expansion' then 'team_lucy'
  when team = 'new_logo' then 'team_justin'
  else null
end
where sub_team is null;
alter table rep alter column sub_team set not null;
alter table rep drop constraint if exists rep_sub_team_check;
alter table rep add constraint rep_sub_team_check check (sub_team in ('team_lucy', 'team_ryan', 'team_mike', 'team_bridger', 'team_justin', 'team_kyra', 'team_sydney'));
alter table rep drop constraint if exists rep_team_sub_team_check;
alter table rep add constraint rep_team_sub_team_check check (
  (team = 'expansion' and sub_team in ('team_lucy', 'team_ryan', 'team_mike', 'team_bridger'))
  or (team = 'new_logo' and sub_team in ('team_justin', 'team_kyra', 'team_sydney'))
);

create table if not exists monthly_target (
  rep_id uuid not null references rep(id),
  month text not null check (month ~ '^\d{4}-\d{2}$'),
  tqr_target numeric not null default 0 check (tqr_target >= 0),
  nl_target numeric check (nl_target >= 0),
  primary key (rep_id, month)
);

create table if not exists current_totals (
  rep_id uuid not null references rep(id),
  month text not null check (month ~ '^\d{4}-\d{2}$'),
  tqr_actual numeric not null default 0 check (tqr_actual >= 0),
  nl_actual numeric check (nl_actual >= 0),
  updated_at timestamptz not null default now(),
  primary key (rep_id, month)
);

create table if not exists daily_activity (
  rep_id uuid not null references rep(id),
  activity_date date not null,
  sdr_events integer not null default 0 check (sdr_events >= 0),
  events_created integer not null default 0 check (events_created >= 0),
  events_held integer not null default 0 check (events_held >= 0),
  notes text,
  updated_at timestamptz not null default now(),
  primary key (rep_id, activity_date)
);

create index if not exists idx_rep_team on rep(team);
create index if not exists idx_target_month on monthly_target(month);
create index if not exists idx_totals_month on current_totals(month);
create index if not exists idx_daily_activity_date on daily_activity(activity_date);

create or replace function set_current_totals_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_set_current_totals_updated_at on current_totals;
create trigger trg_set_current_totals_updated_at
before update on current_totals
for each row
execute procedure set_current_totals_updated_at();

create or replace function set_daily_activity_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_set_daily_activity_updated_at on daily_activity;
create trigger trg_set_daily_activity_updated_at
before update on daily_activity
for each row
execute procedure set_daily_activity_updated_at();
