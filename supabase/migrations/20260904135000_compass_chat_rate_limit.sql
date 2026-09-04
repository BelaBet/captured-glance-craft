create table if not exists public.compass_chat_rate_limits (
  user_id uuid not null references auth.users(id) on delete cascade,
  window_start timestamptz not null,
  request_count integer not null default 0,
  primary key (user_id, window_start)
);

alter table public.compass_chat_rate_limits enable row level security;

revoke all on public.compass_chat_rate_limits from anon, authenticated;

drop policy if exists "No direct access to Compass rate limits" on public.compass_chat_rate_limits;

create or replace function public.check_compass_chat_rate_limit(
  p_window_seconds integer default 60,
  p_max_requests integer default 20
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_window_start timestamptz;
  v_count integer;
begin
  if v_user_id is null then
    return false;
  end if;

  if p_window_seconds < 1 or p_window_seconds > 3600 then
    raise exception 'invalid rate limit window';
  end if;

  if p_max_requests < 1 or p_max_requests > 1000 then
    raise exception 'invalid rate limit threshold';
  end if;

  v_window_start := to_timestamp(
    floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds
  );

  insert into public.compass_chat_rate_limits (user_id, window_start, request_count)
  values (v_user_id, v_window_start, 1)
  on conflict (user_id, window_start)
  do update set request_count = public.compass_chat_rate_limits.request_count + 1
  returning request_count into v_count;

  delete from public.compass_chat_rate_limits
  where user_id = v_user_id
    and window_start < v_window_start - interval '2 hours';

  return v_count <= p_max_requests;
end;
$$;

revoke all on function public.check_compass_chat_rate_limit(integer, integer) from public, anon;
grant execute on function public.check_compass_chat_rate_limit(integer, integer) to authenticated;
