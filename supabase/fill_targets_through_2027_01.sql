-- Fill monthly_target rows from a source month through 2027-01 (inclusive)
-- Update SOURCE_MONTH if needed.

with params as (
  select
    '2026-02'::text as source_month,
    '2027-01'::text as end_month
),
source_targets as (
  select
    mt.rep_id,
    mt.tqr_target,
    mt.nl_target
  from monthly_target mt
  join params p on p.source_month = mt.month
),
month_series as (
  select to_char(m, 'YYYY-MM') as month
  from params p
  cross join generate_series(
    to_date(p.source_month || '-01', 'YYYY-MM-DD'),
    to_date(p.end_month || '-01', 'YYYY-MM-DD'),
    interval '1 month'
  ) as m
)
insert into monthly_target (rep_id, month, tqr_target, nl_target)
select
  st.rep_id,
  ms.month,
  st.tqr_target,
  st.nl_target
from source_targets st
cross join month_series ms
join rep r on r.id = st.rep_id
where r.active = true
on conflict (rep_id, month) do update
set
  tqr_target = excluded.tqr_target,
  nl_target = excluded.nl_target;
