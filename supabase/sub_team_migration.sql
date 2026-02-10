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
alter table rep add constraint rep_sub_team_check
check (sub_team in ('team_lucy', 'team_ryan', 'team_justin', 'team_kyra'));
