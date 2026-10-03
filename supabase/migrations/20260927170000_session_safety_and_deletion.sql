-- Apply after public_launch_hardening. Do not edit already-applied migrations.

-- Blocking applies to existing conversations as well as discovery/new matches.
-- A trigger covers both block_user(), report-and-block, and direct allowed inserts.
create or replace function public.end_blocked_sessions()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.requests
  set status = 'cancelled', last_activity_at = now()
  where status = 'matched'
    and ((created_by = new.blocker_id and matched_user_id = new.blocked_id)
      or (created_by = new.blocked_id and matched_user_id = new.blocker_id));
  return new;
end;
$$;
revoke execute on function public.end_blocked_sessions() from public, anon, authenticated;
create trigger end_blocked_sessions after insert on public.user_blocks
  for each row execute function public.end_blocked_sessions();

-- Also deny contact through check-ins and SOS, including stale clients or direct RPCs.
create or replace function public.guard_session_actor()
returns trigger language plpgsql security definer set search_path = public as $$
declare target public.requests%rowtype;
begin
  if tg_table_name = 'request_messages' then
    if new.sender_type = 'system' then return new; end if;
  end if;
  if coalesce(auth.jwt() ->> 'role', '') = 'service_role' then return new; end if;
  select * into target from public.requests where id = new.request_id;
  if auth.uid() is null or (
    target.created_by is distinct from auth.uid()
    and target.matched_user_id is distinct from auth.uid()
    and not public.is_admin(auth.uid())
  ) then
    raise exception 'Only session participants can perform this action.';
  end if;
  if public.users_are_blocked(target.created_by, target.matched_user_id) then
    raise exception 'Contact is unavailable between blocked members.';
  end if;
  return new;
end;
$$;
revoke execute on function public.guard_session_actor() from public, anon, authenticated;

-- Close pre-existing blocked matches too; retain history for reporting.
update public.requests r set status = 'cancelled', last_activity_at = now()
where r.status = 'matched' and public.users_are_blocked(r.created_by, r.matched_user_id);

-- Auth hard deletion cascades into profiles. Redact denormalized message data
-- that would otherwise survive via sender_id ON DELETE SET NULL.
create or replace function public.redact_deleted_member_messages()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.request_messages
  set sender_name = 'Deleted member', body = '[Message removed following account deletion]'
  where sender_id = old.id;
  return old;
end;
$$;
revoke execute on function public.redact_deleted_member_messages() from public, anon, authenticated;
create trigger redact_deleted_member_messages before delete on public.profiles
  for each row execute function public.redact_deleted_member_messages();
