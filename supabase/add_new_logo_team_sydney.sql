alter table rep drop constraint if exists rep_sub_team_check;
alter table rep add constraint rep_sub_team_check
check (sub_team in ('team_lucy', 'team_ryan', 'team_mike', 'team_bridger', 'team_justin', 'team_kyra', 'team_sydney'));

alter table rep drop constraint if exists rep_team_sub_team_check;
alter table rep add constraint rep_team_sub_team_check check (
  (team = 'expansion' and sub_team in ('team_lucy', 'team_ryan', 'team_mike', 'team_bridger'))
  or (team = 'new_logo' and sub_team in ('team_justin', 'team_kyra', 'team_sydney'))
);
