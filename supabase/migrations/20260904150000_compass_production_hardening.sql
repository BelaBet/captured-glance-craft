-- Production hardening for Compass persistence, ownership and activity.

create index if not exists idx_conversations_user_created
  on public.conversations(user_id, created_at desc);
create index if not exists idx_messages_conversation_created
  on public.messages(conversation_id, created_at asc);
create index if not exists idx_messages_user_created
  on public.messages(user_id, created_at desc);
create index if not exists idx_goals_user_updated
  on public.goals(user_id, updated_at desc);
create index if not exists idx_goal_actions_goal
  on public.goal_actions(goal_id, created_at asc);
create index if not exists idx_goal_actions_user_done
  on public.goal_actions(user_id, done);
create index if not exists idx_insights_user_created
  on public.insights(user_id, created_at desc);

-- Explicit authenticated ownership policies. USING protects the old row;
-- WITH CHECK prevents changing user_id to another account during UPDATE.
drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own goals" on public.goals;
create policy "Users can update own goals"
  on public.goals for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own actions" on public.goal_actions;
create policy "Users can update own actions"
  on public.goal_actions for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Users must only be able to delete their own conversation/message history.
drop policy if exists "Users can delete own conversations" on public.conversations;
create policy "Users can delete own conversations"
  on public.conversations for delete
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can delete own messages" on public.messages;
create policy "Users can delete own messages"
  on public.messages for delete
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can delete own actions" on public.goal_actions;
create policy "Users can delete own actions"
  on public.goal_actions for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- Keep foreign ownership consistent: an action's goal must belong to the same user.
create or replace function public.validate_goal_action_owner()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.goals
    where id = new.goal_id and user_id = new.user_id
  ) then
    raise exception 'goal does not belong to user';
  end if;
  return new;
end;
$$;

drop trigger if exists validate_goal_action_owner on public.goal_actions;
create trigger validate_goal_action_owner
  before insert or update on public.goal_actions
  for each row execute function public.validate_goal_action_owner();

-- Keep progress bounded at the database boundary.
alter table public.goals drop constraint if exists goals_progress_range;
alter table public.goals add constraint goals_progress_range check (progress is null or progress between 0 and 100);

-- Atomically records a user's Compass activity and maintains the daily streak.
create or replace function public.record_compass_activity()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_today date := (now() at time zone 'utc')::date;
  v_streak integer;
  v_last date;
begin
  if v_user_id is null then raise exception 'not authenticated'; end if;

  select streak_days, last_active_date into v_streak, v_last
  from public.profiles where user_id = v_user_id for update;
  if not found then raise exception 'profile not found'; end if;

  v_streak := coalesce(v_streak, 0);
  if v_last = v_today then
    null;
  elsif v_last = v_today - 1 then
    v_streak := v_streak + 1;
  else
    v_streak := 1;
  end if;

  update public.profiles
     set streak_days = v_streak, last_active_date = v_today, updated_at = now()
   where user_id = v_user_id;
  return v_streak;
end;
$$;

revoke all on function public.record_compass_activity() from public, anon;
grant execute on function public.record_compass_activity() to authenticated;
