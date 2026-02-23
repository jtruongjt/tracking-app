create table if not exists daily_activity_exemption (
  rep_id uuid not null references rep(id),
  activity_date date not null,
  status text not null check (status in ('pto', 'ooo', 'holiday')),
  note text,
  updated_at timestamptz not null default now(),
  primary key (rep_id, activity_date)
);

create index if not exists idx_daily_activity_exemption_date on daily_activity_exemption(activity_date);

create or replace function set_daily_activity_exemption_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_set_daily_activity_exemption_updated_at on daily_activity_exemption;
create trigger trg_set_daily_activity_exemption_updated_at
before update on daily_activity_exemption
for each row
execute procedure set_daily_activity_exemption_updated_at();
