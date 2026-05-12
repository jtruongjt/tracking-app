-- Fill missing monthly_target rows through 2026-12 (inclusive)
-- using each active rep's latest existing target row as the template.

with params as (
  select '2026-12'::text as end_month
),
active_reps as (
  select id
  from rep
  where active = true
),
latest_target as (
  select distinct on (mt.rep_id)
    mt.rep_id,
    mt.month as source_month,
    mt.tqr_target,
    mt.nl_target
  from monthly_target mt
  join active_reps ar on ar.id = mt.rep_id
  order by mt.rep_id, mt.month desc
),
month_series as (
  select
    lt.rep_id,
    to_char(m, 'YYYY-MM') as month,
    lt.tqr_target,
    lt.nl_target
  from latest_target lt
  join params p on true
  cross join generate_series(
    to_date(lt.source_month || '-01', 'YYYY-MM-DD'),
    to_date(p.end_month || '-01', 'YYYY-MM-DD'),
    interval '1 month'
  ) as m
)
insert into monthly_target (rep_id, month, tqr_target, nl_target)
select
  ms.rep_id,
  ms.month,
  ms.tqr_target,
  ms.nl_target
from month_series ms
join rep r on r.id = ms.rep_id
where r.active = true
on conflict (rep_id, month) do update
set
  tqr_target = excluded.tqr_target,
  nl_target = excluded.nl_target;
