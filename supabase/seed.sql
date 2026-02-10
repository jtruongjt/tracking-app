insert into rep (name, team, sub_team)
values
  ('Alex Kim', 'expansion', 'team_lucy'),
  ('Jamie Fox', 'expansion', 'team_ryan'),
  ('Taylor Reed', 'new_logo', 'team_justin'),
  ('Morgan Lee', 'new_logo', 'team_kyra')
on conflict do nothing;

with rep_rows as (
  select id, name, team from rep
),
month_value as (
  select to_char(current_date, 'YYYY-MM') as month
)
insert into monthly_target (rep_id, month, tqr_target, nl_target)
select
  r.id,
  m.month,
  case when r.team = 'expansion' then 120000 else 90000 end,
  case when r.team = 'new_logo' then 12 else null end
from rep_rows r
cross join month_value m
on conflict (rep_id, month) do nothing;
