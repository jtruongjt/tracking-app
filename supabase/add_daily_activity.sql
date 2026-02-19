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

create index if not exists idx_daily_activity_date on daily_activity(activity_date);

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
