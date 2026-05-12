with month_value as (
  select to_char(current_date, 'YYYY-MM') as month
),
active_reps_missing_target as (
  select r.id
  from rep r
  cross join month_value mv
  where r.active = true
    and not exists (
      select 1
      from monthly_target mt
      where mt.rep_id = r.id
        and mt.month = mv.month
    )
),
latest_target as (
  select distinct on (mt.rep_id)
    mt.rep_id,
    mt.tqr_target,
    mt.nl_target
  from monthly_target mt
  join active_reps_missing_target missing on missing.id = mt.rep_id
  order by mt.rep_id, mt.month desc
)
insert into monthly_target (rep_id, month, tqr_target, nl_target)
select
  lt.rep_id,
  mv.month,
  lt.tqr_target,
  lt.nl_target
from latest_target lt
cross join month_value mv
on conflict (rep_id, month) do nothing;
