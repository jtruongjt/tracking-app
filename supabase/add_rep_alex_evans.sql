with updated_rep as (
  update rep
  set
    team = 'new_logo',
    sub_team = 'team_justin',
    active = true
  where name = 'Alex Evans'
  returning id
),
inserted_rep as (
  insert into rep (name, team, sub_team, active)
  select
    'Alex Evans',
    'new_logo',
    'team_justin',
    true
  where not exists (select 1 from updated_rep)
  returning id
),
target_rep as (
  select id from updated_rep
  union all
  select id from inserted_rep
),
month_value as (
  select to_char(current_date, 'YYYY-MM') as month
),
template_target as (
  select
    mt.tqr_target,
    mt.nl_target
  from monthly_target mt
  join rep r on r.id = mt.rep_id
  join month_value mv on mv.month = mt.month
  where r.active = true
    and r.team = 'new_logo'
    and r.sub_team = 'team_justin'
    and r.name <> 'Alex Evans'
  order by r.name
  limit 1
)
insert into monthly_target (rep_id, month, tqr_target, nl_target)
select
  r.id,
  mv.month,
  tt.tqr_target,
  tt.nl_target
from target_rep r
cross join month_value mv
cross join template_target tt
on conflict (rep_id, month) do update
set
  tqr_target = excluded.tqr_target,
  nl_target = excluded.nl_target;
