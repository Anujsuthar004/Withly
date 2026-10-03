-- Public launch hardening.
-- Closes privilege-escalation paths, protects operational data, and aligns
-- request/feed RPCs with the fields used by the application.

------------------------------------------------------------------------
-- Protect server-only operational tables
------------------------------------------------------------------------

alter table public.rate_limit_events enable row level security;
alter table public.rate_limit_events force row level security;
alter table public.app_event_logs enable row level security;
alter table public.app_event_logs force row level security;

revoke all on table public.rate_limit_events from anon, authenticated;
revoke all on table public.app_event_logs from anon, authenticated;
grant all on table public.rate_limit_events to service_role;
grant all on table public.app_event_logs to service_role;
grant usage, select on sequence public.rate_limit_events_id_seq to service_role;
grant usage, select on sequence public.app_event_logs_id_seq to service_role;

create or replace function public.consume_rate_limit(
  action_input text,
  key_hash_input text,
  limit_input integer,
  window_seconds_input integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  event_count integer;
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then
    raise exception 'Service-role privileges required';
  end if;
  if limit_input < 1 or window_seconds_input < 1 then
    raise exception 'Invalid rate-limit configuration';
  end if;

  perform pg_advisory_xact_lock(hashtext(action_input || ':' || key_hash_input));

  delete from public.rate_limit_events
  where action = action_input
    and key_hash = key_hash_input
    and created_at < now() - make_interval(secs => window_seconds_input);

  select count(*) into event_count
  from public.rate_limit_events
  where action = action_input
    and key_hash = key_hash_input
    and created_at >= now() - make_interval(secs => window_seconds_input);

  if event_count >= limit_input then
    return false;
  end if;

  insert into public.rate_limit_events (action, key_hash, context)
  values (action_input, key_hash_input, '{}'::jsonb);
  return true;
end;
$$;

revoke execute on function public.consume_rate_limit(text, text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text, text, integer, integer)
  to service_role;

------------------------------------------------------------------------
-- Prevent members from changing privileged profile columns
------------------------------------------------------------------------

revoke update on table public.profiles from authenticated;
grant update (display_name, about_me, home_area)
  on table public.profiles to authenticated;

-- Verification must be performed by a trusted backend/provider, not by the
-- member being verified. Keep the old function unavailable for compatibility
-- with already-applied migrations.
revoke execute on function public.upgrade_verification_tier(public.verification_tier, text)
  from public, anon, authenticated;
grant execute on function public.upgrade_verification_tier(public.verification_tier, text)
  to service_role;

------------------------------------------------------------------------
-- Restrict privileged maintenance/moderation functions
------------------------------------------------------------------------

revoke execute on function public.recalculate_trust_score(uuid)
  from public, anon, authenticated;
grant execute on function public.recalculate_trust_score(uuid) to service_role;

revoke execute on function public.expire_stale_requests()
  from public, anon, authenticated;
grant execute on function public.expire_stale_requests() to service_role;

create or replace function public.submit_moderation_review(
  content_type_input text,
  content_id_input text,
  content_text_input text,
  verdict_input public.moderation_verdict default 'safe',
  confidence_input numeric default 0.0,
  flags_input text[] default '{}'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  review_id uuid;
  caller_role text := coalesce(auth.jwt() ->> 'role', '');
begin
  if caller_role <> 'service_role'
     and (auth.uid() is null or not public.is_admin(auth.uid())) then
    raise exception 'Admin or service-role privileges required';
  end if;

  if content_type_input not in ('request', 'message', 'profile', 'report') then
    raise exception 'Unsupported moderation content type';
  end if;

  insert into public.moderation_reviews (
    content_type, content_id, content_text, verdict, confidence, flags
  )
  values (
    content_type_input,
    left(content_id_input, 200),
    left(content_text_input, 2000),
    verdict_input,
    greatest(0, least(coalesce(confidence_input, 0), 1)),
    coalesce(flags_input, '{}')
  )
  returning id into review_id;

  if verdict_input in ('flagged', 'rejected') then
    insert into public.notifications (user_id, kind, title, body)
    select
      id,
      'moderation_flag',
      'Content flagged by moderation',
      format('A %s item requires review.', content_type_input)
    from public.profiles
    where role = 'admin';
  end if;

  return review_id;
end;
$$;

revoke execute on function public.submit_moderation_review(
  text, text, text, public.moderation_verdict, numeric, text[]
) from public, anon;
grant execute on function public.submit_moderation_review(
  text, text, text, public.moderation_verdict, numeric, text[]
) to authenticated, service_role;

------------------------------------------------------------------------
-- Correct trust-score calculation and keep member-controlled inputs scoped
------------------------------------------------------------------------

create or replace function public.recalculate_trust_score(target_user_id uuid)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  subject_user_id alias for $1;
  completed_count integer;
  issue_count integer;
  yes_count integer;
  no_count integer;
  report_count integer;
  raw_score numeric;
begin
  if subject_user_id is null then
    raise exception 'A target user is required';
  end if;

  select count(*) into completed_count
  from public.requests r
  where r.status = 'completed'
    and (r.created_by = subject_user_id or r.matched_user_id = subject_user_id);

  select count(*) into issue_count
  from public.requests r
  where r.status = 'completed'
    and (
      (r.created_by = subject_user_id and r.poster_outcome = 'issue')
      or (r.matched_user_id = subject_user_id and r.peer_outcome = 'issue')
    );

  select
    count(*) filter (where
      (r.created_by = subject_user_id and r.peer_meet_again = true)
      or (r.matched_user_id = subject_user_id and r.poster_meet_again = true)
    ),
    count(*) filter (where
      (r.created_by = subject_user_id and r.peer_meet_again = false)
      or (r.matched_user_id = subject_user_id and r.poster_meet_again = false)
    )
  into yes_count, no_count
  from public.requests r
  where r.status = 'completed'
    and (r.created_by = subject_user_id or r.matched_user_id = subject_user_id);

  select count(*) into report_count
  from public.reports rep
  where rep.target_user_id = subject_user_id
    and rep.status in ('open', 'reviewing', 'resolved');

  raw_score := 50.0
    + least(completed_count * 2.0, 30.0)
    + least(yes_count * 3.0, 15.0)
    - least(issue_count * 5.0, 20.0)
    - least(no_count * 2.0, 10.0)
    - least(report_count * 8.0, 25.0);

  raw_score := greatest(0, least(raw_score, 100));

  insert into public.trust_scores (
    user_id, sessions_completed, sessions_with_issues,
    meet_again_yes, meet_again_no, reports_received, score
  )
  values (
    subject_user_id, completed_count, issue_count,
    yes_count, no_count, report_count, raw_score
  )
  on conflict (user_id) do update set
    sessions_completed = excluded.sessions_completed,
    sessions_with_issues = excluded.sessions_with_issues,
    meet_again_yes = excluded.meet_again_yes,
    meet_again_no = excluded.meet_again_no,
    reports_received = excluded.reports_received,
    score = excluded.score,
    updated_at = now();

  return raw_score;
end;
$$;

revoke execute on function public.recalculate_trust_score(uuid)
  from public, anon, authenticated;
grant execute on function public.recalculate_trust_score(uuid) to service_role;

------------------------------------------------------------------------
-- Persist request expiry and expose the enriched, privacy-aware feed
------------------------------------------------------------------------

create or replace function public.create_request(
  lane_input public.request_lane,
  title_input text,
  description_input text,
  area_label_input text,
  meetup_at_input timestamptz,
  radius_km_input integer,
  tags_input text[],
  verified_only_input boolean,
  check_in_enabled_input boolean,
  expires_at_input timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_request_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  if not public.current_user_verified() then
    raise exception 'Verify your email before posting.';
  end if;
  if expires_at_input is not null
     and (expires_at_input <= now() or expires_at_input > now() + interval '7 days') then
    raise exception 'Expiry must be within the next 7 days.';
  end if;

  insert into public.requests (
    created_by, lane, title, description, area_label, meetup_at,
    radius_km, tags, verified_only, check_in_enabled, expires_at,
    max_companions
  )
  values (
    auth.uid(), lane_input, trim(title_input), trim(description_input),
    trim(area_label_input), meetup_at_input,
    greatest(1, least(radius_km_input, 25)),
    coalesce(tags_input, array['clear-plan']::text[]),
    coalesce(verified_only_input, true),
    coalesce(check_in_enabled_input, true),
    expires_at_input,
    1
  )
  returning id into new_request_id;

  return new_request_id;
end;
$$;

grant execute on function public.create_request(
  public.request_lane, text, text, text, timestamptz, integer,
  text[], boolean, boolean, timestamptz
) to authenticated;

create or replace function public.get_public_request_feed_v2(limit_count integer default 12)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  viewer_tags text[];
  viewer_area text;
begin
  if auth.uid() is not null then
    select p.home_area into viewer_area
    from public.profiles p
    where p.id = auth.uid();

    select array_agg(distinct request_tag)
    into viewer_tags
    from public.requests r,
         unnest(r.tags) as request_tag
    where r.created_by = auth.uid();
  end if;

  return coalesce(
    (
      select jsonb_agg(feed_row order by feed_row->>'createdAt' desc)
      from (
        select jsonb_build_object(
          'id', r.id,
          'lane', r.lane,
          'title', r.title,
          'description', r.description,
          'areaLabel', case when auth.uid() is null then null else r.area_label end,
          'meetupAt', case when auth.uid() is null then null else r.meetup_at end,
          'expiresAt', r.expires_at,
          'createdAt', r.created_at,
          'verifiedOnly', r.verified_only,
          'hostDisplayName', case when auth.uid() is null then null else p.display_name end,
          'hostVerified', exists (
            select 1 from auth.users u
            where u.id = r.created_by and u.email_confirmed_at is not null
          ),
          'tags', r.tags,
          'hostTrustScore', case when auth.uid() is null then 50 else coalesce(ts.score, 50) end,
          'hostVerificationTier', case when auth.uid() is null then 'email' else p.verification_tier::text end,
          'maxCompanions', 1,
          'compatibilityScore', case
            when auth.uid() is null then null
            else round((
              coalesce((
                select count(*)::numeric * 10
                from unnest(r.tags) t
                where viewer_tags is not null and t = any(viewer_tags)
              ), 0)
              + case when viewer_area <> '' and r.area_label ilike '%' || viewer_area || '%' then 20 else 0 end
              + coalesce(ts.score / 5.0, 10)
              + case when exists (
                  select 1 from auth.users u
                  where u.id = r.created_by and u.email_confirmed_at is not null
                ) then 10 else 0 end
              + greatest(0, 10 - extract(epoch from now() - r.created_at) / 3600)
            ), 1)
          end
        ) as feed_row
        from public.requests r
        join public.profiles p on p.id = r.created_by
        left join public.trust_scores ts on ts.user_id = r.created_by
        where r.status = 'open'
          and (r.expires_at is null or r.expires_at > now())
          and (auth.uid() is null or not public.users_are_blocked(auth.uid(), r.created_by))
        order by r.created_at desc
        limit greatest(1, least(limit_count, 50))
      ) feed_rows
    ),
    '[]'::jsonb
  );
end;
$$;

grant execute on function public.get_public_request_feed_v2(integer) to anon, authenticated;

create or replace function public.get_public_request_detail(request_id_input uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'id', r.id,
    'lane', r.lane,
    'title', r.title,
    'description', r.description,
    'areaLabel', case when auth.uid() is null then null else r.area_label end,
    'meetupAt', case when auth.uid() is null then null else r.meetup_at end,
    'expiresAt', r.expires_at,
    'createdAt', r.created_at,
    'verifiedOnly', r.verified_only,
    'hostDisplayName', case when auth.uid() is null then null else p.display_name end,
    'hostVerified', exists (
      select 1 from auth.users u
      where u.id = r.created_by and u.email_confirmed_at is not null
    ),
    'tags', r.tags,
    'hostTrustScore', case when auth.uid() is null then 50 else coalesce(ts.score, 50) end,
    'hostVerificationTier', case when auth.uid() is null then 'email' else p.verification_tier::text end,
    'maxCompanions', 1,
    'compatibilityScore', null
  )
  from public.requests r
  join public.profiles p on p.id = r.created_by
  left join public.trust_scores ts on ts.user_id = r.created_by
  where r.id = request_id_input
    and r.status = 'open'
    and (r.expires_at is null or r.expires_at > now())
    and (auth.uid() is null or not public.users_are_blocked(auth.uid(), r.created_by))
  limit 1;
$$;

grant execute on function public.get_public_request_detail(uuid) to anon, authenticated;

------------------------------------------------------------------------
-- Existing SOS is an in-product alert. Keep it scoped and avoid implying an
-- external emergency-service or emergency-contact dispatch at the DB layer.
------------------------------------------------------------------------

comment on function public.trigger_sos_alert(uuid, text) is
  'Creates an in-product safety alert and notifies the matched participant. It does not contact emergency services or external emergency contacts.';

-- Load the requested session, not whichever matched session is most recent.
create or replace function public.get_request_session(request_id_input uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'requestId', r.id, 'requestTitle', r.title, 'lane', r.lane,
    'areaLabel', r.area_label, 'meetupAt', r.meetup_at,
    'checkInEnabled', r.check_in_enabled,
    'partnerId', case when r.created_by = auth.uid() then r.matched_user_id else r.created_by end,
    'partnerDisplayName', coalesce(p.display_name, ''),
    'messages', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', m.id, 'requestId', m.request_id, 'senderType', m.sender_type,
        'senderId', m.sender_id, 'senderName', m.sender_name,
        'body', m.body, 'createdAt', m.created_at
      ) order by m.created_at, m.id)
      from (select * from public.request_messages where request_id = r.id order by created_at desc, id desc limit 200) m
    ), '[]'::jsonb)
  )
  from public.requests r
  left join public.profiles p on p.id = case when r.created_by = auth.uid() then r.matched_user_id else r.created_by end
  where r.id = request_id_input and r.status = 'matched'
    and auth.uid() is not null
    and (r.created_by = auth.uid() or r.matched_user_id = auth.uid());
$$;

------------------------------------------------------------------------
-- Remove PostgreSQL's default PUBLIC function execution and allow only the
-- client RPC surface the application actually uses. Function owners and the
-- service role retain access for triggers and trusted server operations.
------------------------------------------------------------------------

revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on all functions in schema public to service_role;
-- RLS predicates execute as the querying role and need this helper.
grant execute on function public.is_admin(uuid) to authenticated;

grant execute on function public.get_public_request_feed(integer) to anon, authenticated;
grant execute on function public.get_public_request_feed_v2(integer) to anon, authenticated;
grant execute on function public.get_public_request_detail(uuid) to anon, authenticated;

grant execute on function public.get_workspace_snapshot() to authenticated;
grant execute on function public.get_request_session(uuid) to authenticated;
grant execute on function public.create_request(
  public.request_lane, text, text, text, timestamptz, integer,
  text[], boolean, boolean, timestamptz
) to authenticated;
grant execute on function public.submit_join_request(uuid, text) to authenticated;
grant execute on function public.review_join_request(uuid, text) to authenticated;
grant execute on function public.send_request_message(uuid, text) to authenticated;
grant execute on function public.complete_request_session(uuid, text, boolean) to authenticated;
grant execute on function public.block_user(uuid) to authenticated;
grant execute on function public.create_report(uuid, uuid, text, text, boolean) to authenticated;
grant execute on function public.resolve_report(uuid, public.report_status, text) to authenticated;
grant execute on function public.submit_account_deletion_request(text) to authenticated;
grant execute on function public.resolve_account_deletion_request(uuid, text, text) to authenticated;
grant execute on function public.get_account_export() to authenticated;
grant execute on function public.get_admin_dashboard() to authenticated;
grant execute on function public.delete_request(uuid) to authenticated;
grant execute on function public.hide_request_thread(uuid) to authenticated;
grant execute on function public.submit_check_in(uuid, public.check_in_status, text) to authenticated;
grant execute on function public.get_session_check_ins(uuid) to authenticated;
grant execute on function public.get_my_notifications(integer) to authenticated;
grant execute on function public.mark_notifications_read(bigint[]) to authenticated;
grant execute on function public.set_availability_window(integer, time, time, text) to authenticated;
grant execute on function public.get_my_availability() to authenticated;
grant execute on function public.delete_availability_window(uuid) to authenticated;
grant execute on function public.get_trusted_companions() to authenticated;
grant execute on function public.set_emergency_contact(text, text, text) to authenticated;
grant execute on function public.trigger_sos_alert(uuid, text) to authenticated;
grant execute on function public.resolve_sos_alert(uuid, public.sos_status) to authenticated;
grant execute on function public.create_community(text, text, boolean) to authenticated;
grant execute on function public.join_community(uuid) to authenticated;
grant execute on function public.get_my_communities() to authenticated;
grant execute on function public.submit_moderation_review(
  text, text, text, public.moderation_verdict, numeric, text[]
) to authenticated;
grant execute on function public.get_pending_moderation(integer) to authenticated;
grant execute on function public.get_admin_users(integer) to authenticated;

-- Stop direct REST/RPC callers bypassing the application's rate limiter.
create or replace function public.limit_member_writes()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  event_action text := 'db:' || tg_table_name;
  event_limit integer := tg_argv[0]::integer;
  window_seconds integer := tg_argv[1]::integer;
  event_count integer;
begin
  if actor_id is null or coalesce(auth.jwt() ->> 'role', '') = 'service_role' then
    return new;
  end if;
  if tg_table_name = 'request_messages' then
    if new.sender_type = 'system' then
      return new;
    end if;
  end if;
  perform pg_advisory_xact_lock(hashtext(event_action || ':' || actor_id::text));
  delete from public.rate_limit_events
  where action = event_action and key_hash = actor_id::text
    and created_at < now() - make_interval(secs => window_seconds);
  select count(*) into event_count from public.rate_limit_events
  where action = event_action and key_hash = actor_id::text;
  if event_count >= event_limit then
    raise exception 'Too many attempts. Please try again later.';
  end if;
  insert into public.rate_limit_events(action, key_hash)
  values (event_action, actor_id::text);
  return new;
end;
$$;
revoke execute on function public.limit_member_writes() from public, anon, authenticated;

create trigger limit_request_creation before insert on public.requests
  for each row execute function public.limit_member_writes('10', '600');
create trigger limit_join_creation before insert on public.join_requests
  for each row execute function public.limit_member_writes('30', '600');
create trigger limit_message_creation before insert on public.request_messages
  for each row execute function public.limit_member_writes('60', '60');
create trigger limit_report_creation before insert on public.reports
  for each row execute function public.limit_member_writes('10', '3600');
create trigger limit_sos_creation before insert on public.sos_alerts
  for each row execute function public.limit_member_writes('5', '600');
create trigger limit_community_creation before insert on public.communities
  for each row execute function public.limit_member_writes('5', '86400');

-- Keep expiry enforcement authoritative even between scheduled cleanup runs.
create or replace function public.guard_joinable_request()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  target public.requests%rowtype;
begin
  select * into target from public.requests where id = new.request_id for update;
  if target.status <> 'open' or (target.expires_at is not null and target.expires_at <= now()) then
    raise exception 'This request is no longer open.';
  end if;
  return new;
end;
$$;
revoke execute on function public.guard_joinable_request() from public, anon, authenticated;
create trigger guard_joinable_request before insert on public.join_requests
  for each row execute function public.guard_joinable_request();

create or replace function public.guard_new_match()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.status = 'open' and new.status = 'matched' then
    if old.expires_at is not null and old.expires_at <= now() then
      raise exception 'This request has expired.';
    end if;
    if public.users_are_blocked(new.created_by, new.matched_user_id) then
      raise exception 'These members cannot be matched.';
    end if;
  end if;
  return new;
end;
$$;
revoke execute on function public.guard_new_match() from public, anon, authenticated;
create trigger guard_new_match before update on public.requests
  for each row execute function public.guard_new_match();

-- NULL partner IDs must never turn a participant check into a SQL NULL that
-- skips the rejection branch (for example after an account is deleted).
create or replace function public.guard_session_actor()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  target public.requests%rowtype;
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
  return new;
end;
$$;
revoke execute on function public.guard_session_actor() from public, anon, authenticated;
create trigger guard_message_actor before insert on public.request_messages
  for each row execute function public.guard_session_actor();
create trigger guard_checkin_actor before insert on public.session_check_ins
  for each row execute function public.guard_session_actor();
create trigger guard_sos_actor before insert on public.sos_alerts
  for each row execute function public.guard_session_actor();

-- Explicit enum casts keep completion working in PostgreSQL's UPDATE context.
create or replace function public.complete_request_session(
  request_id_input uuid, outcome_input text, meet_again_input boolean
)
returns uuid language plpgsql security definer set search_path = public as $$
declare target public.requests%rowtype;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if outcome_input not in ('completed', 'issue') or outcome_input is null then
    raise exception 'Invalid session outcome.';
  end if;
  select * into target from public.requests where id = request_id_input for update;
  if not found then raise exception 'Request not found.'; end if;
  if target.status not in ('matched', 'completed') then
    raise exception 'Only matched or recently completed sessions can be rated.';
  end if;
  if auth.uid() = target.created_by then
    update public.requests
    set poster_outcome = outcome_input, poster_meet_again = meet_again_input,
        completed_at = coalesce(completed_at, now()),
        status = (case when peer_outcome is not null then 'completed' else 'matched' end)::public.request_status,
        last_activity_at = now()
    where id = request_id_input;
  elsif auth.uid() = target.matched_user_id then
    update public.requests
    set peer_outcome = outcome_input, peer_meet_again = meet_again_input,
        completed_at = coalesce(completed_at, now()),
        status = (case when poster_outcome is not null then 'completed' else 'matched' end)::public.request_status,
        last_activity_at = now()
    where id = request_id_input;
  else
    raise exception 'Only session participants can complete this request.';
  end if;
  return request_id_input;
end;
$$;
