-- Feature Pack Migration: 12 new backend features for Withly
-- This migration is idempotent: uses IF NOT EXISTS, CREATE OR REPLACE, etc.

------------------------------------------------------------------------
-- ENUMS
------------------------------------------------------------------------

do $$ begin create type public.check_in_status as enum ('ok','missed','sos'); exception when duplicate_object then null; end $$;
do $$ begin create type public.notification_kind as enum (
  'join_request_received','join_request_accepted','join_request_declined',
  'message_received','check_in_due','check_in_missed',
  'session_completed','meet_again_mutual','sos_triggered',
  'verification_upgraded','community_invite','moderation_flag'
); exception when duplicate_object then null; end $$;
do $$ begin create type public.verification_tier as enum ('email','phone','id_verified'); exception when duplicate_object then null; end $$;
do $$ begin create type public.sos_status as enum ('active','resolved','false_alarm'); exception when duplicate_object then null; end $$;
do $$ begin create type public.moderation_verdict as enum ('safe','flagged','rejected'); exception when duplicate_object then null; end $$;
do $$ begin create type public.community_role as enum ('owner','moderator','member'); exception when duplicate_object then null; end $$;

------------------------------------------------------------------------
-- 1. SAFETY CHECK-INS
------------------------------------------------------------------------

create table if not exists public.session_check_ins (
  id bigint generated always as identity primary key,
  request_id uuid not null references public.requests(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status public.check_in_status not null default 'ok',
  note text not null default '' check (char_length(note) <= 300),
  created_at timestamptz not null default now()
);

create index if not exists idx_session_check_ins_request on public.session_check_ins (request_id, created_at desc);
create index if not exists idx_session_check_ins_user on public.session_check_ins (user_id, created_at desc);

alter table public.session_check_ins enable row level security;
alter table public.session_check_ins force row level security;

drop policy if exists session_check_ins_select_participants on public.session_check_ins;
create policy session_check_ins_select_participants on public.session_check_ins
  for select to authenticated
  using (
    exists (
      select 1 from public.requests
      where requests.id = session_check_ins.request_id
        and (requests.created_by = auth.uid() or requests.matched_user_id = auth.uid() or public.is_admin(auth.uid()))
    )
  );

grant select on public.session_check_ins to authenticated;

create or replace function public.submit_check_in(
  request_id_input uuid,
  status_input public.check_in_status default 'ok',
  note_input text default ''
)
returns bigint
language plpgsql security definer set search_path = public as $$
declare
  target public.requests%rowtype;
  checkin_id bigint;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;

  select * into target from public.requests where id = request_id_input;
  if not found then raise exception 'Session not found.'; end if;
  if target.status <> 'matched' then raise exception 'Check-ins are only for active sessions.'; end if;
  if target.created_by <> auth.uid() and target.matched_user_id <> auth.uid() then
    raise exception 'Only session participants can check in.';
  end if;

  insert into public.session_check_ins (request_id, user_id, status, note)
  values (request_id_input, auth.uid(), status_input, trim(coalesce(note_input, '')))
  returning id into checkin_id;

  -- Create notification for the partner
  insert into public.notifications (user_id, kind, title, body, ref_id)
  values (
    case when target.created_by = auth.uid() then target.matched_user_id else target.created_by end,
    case when status_input = 'ok' then 'check_in_due'::public.notification_kind
         when status_input = 'missed' then 'check_in_missed'::public.notification_kind
         else 'sos_triggered'::public.notification_kind end,
    case when status_input = 'ok' then 'Partner checked in'
         when status_input = 'missed' then 'Missed check-in'
         else 'SOS alert triggered' end,
    case when status_input = 'ok' then 'Your companion confirmed they are OK.'
         when status_input = 'missed' then 'Your companion missed a scheduled check-in.'
         else 'Your companion triggered an emergency alert.' end,
    request_id_input
  );

  return checkin_id;
end;
$$;

create or replace function public.get_session_check_ins(request_id_input uuid)
returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', id, 'requestId', request_id, 'userId', user_id,
        'status', status, 'note', note, 'createdAt', created_at
      ) order by created_at desc
    ), '[]'::jsonb
  )
  from public.session_check_ins
  where request_id = request_id_input
    and (
      exists (
        select 1 from public.requests r
        where r.id = request_id_input
          and (r.created_by = auth.uid() or r.matched_user_id = auth.uid() or public.is_admin(auth.uid()))
      )
    );
$$;

------------------------------------------------------------------------
-- 2. NOTIFICATIONS
------------------------------------------------------------------------

create table if not exists public.notifications (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind public.notification_kind not null,
  title text not null check (char_length(title) between 1 and 120),
  body text not null default '' check (char_length(body) <= 400),
  ref_id uuid,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_user on public.notifications (user_id, read, created_at desc);

alter table public.notifications enable row level security;
alter table public.notifications force row level security;

drop policy if exists notifications_select_owner on public.notifications;
create policy notifications_select_owner on public.notifications
  for select to authenticated using (user_id = auth.uid());

drop policy if exists notifications_update_owner on public.notifications;
create policy notifications_update_owner on public.notifications
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select, update on public.notifications to authenticated;

create or replace function public.get_my_notifications(limit_count integer default 30)
returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', id, 'kind', kind, 'title', title, 'body', body,
        'refId', ref_id, 'read', read, 'createdAt', created_at
      ) order by created_at desc
    ), '[]'::jsonb
  )
  from (
    select * from public.notifications
    where user_id = auth.uid()
    order by created_at desc
    limit greatest(1, least(limit_count, 100))
  ) n;
$$;

create or replace function public.mark_notifications_read(notification_ids bigint[])
returns integer
language plpgsql security definer set search_path = public as $$
declare
  updated_count integer;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  update public.notifications set read = true where id = any(notification_ids) and user_id = auth.uid() and not read;
  get diagnostics updated_count = row_count;
  return updated_count;
end;
$$;

-- Trigger: auto-create notification when a join request is submitted
create or replace function public.notify_on_join_request()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  owner_id uuid;
  req_title text;
  joiner_name text;
begin
  select created_by, title into owner_id, req_title from public.requests where id = new.request_id;
  select display_name into joiner_name from public.profiles where id = new.joiner_id;
  insert into public.notifications (user_id, kind, title, body, ref_id)
  values (
    owner_id,
    'join_request_received',
    'New join request',
    format('%s wants to join "%s"', coalesce(joiner_name, 'Someone'), left(coalesce(req_title, 'your request'), 60)),
    new.request_id
  );
  return new;
end;
$$;

drop trigger if exists trg_notify_on_join_request on public.join_requests;
create trigger trg_notify_on_join_request
after insert on public.join_requests for each row execute function public.notify_on_join_request();

-- Trigger: notify joiner when their join request is accepted or declined
create or replace function public.notify_on_join_review()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  req_title text;
begin
  if old.status = 'pending' and new.status in ('accepted', 'declined') then
    select title into req_title from public.requests where id = new.request_id;
    insert into public.notifications (user_id, kind, title, body, ref_id)
    values (
      new.joiner_id,
      case new.status when 'accepted' then 'join_request_accepted'::public.notification_kind
                      else 'join_request_declined'::public.notification_kind end,
      case new.status when 'accepted' then 'Match confirmed!' else 'Join request declined' end,
      case new.status when 'accepted' then format('You were accepted for "%s". Open the session to start chatting.', left(coalesce(req_title, 'a request'), 60))
                      else format('Your request to join "%s" was declined.', left(coalesce(req_title, 'a request'), 60)) end,
      new.request_id
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notify_on_join_review on public.join_requests;
create trigger trg_notify_on_join_review
after update on public.join_requests for each row execute function public.notify_on_join_review();

-- Trigger: notify on new message
create or replace function public.notify_on_message()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  target public.requests%rowtype;
  recipient_id uuid;
begin
  if new.sender_type = 'system' then return new; end if;
  select * into target from public.requests where id = new.request_id;
  if not found then return new; end if;
  recipient_id := case when new.sender_id = target.created_by then target.matched_user_id else target.created_by end;
  if recipient_id is null then return new; end if;
  insert into public.notifications (user_id, kind, title, body, ref_id)
  values (
    recipient_id,
    'message_received',
    format('New message from %s', left(coalesce(new.sender_name, 'your companion'), 40)),
    left(new.body, 120),
    new.request_id
  );
  return new;
end;
$$;

drop trigger if exists trg_notify_on_message on public.request_messages;
create trigger trg_notify_on_message
after insert on public.request_messages for each row execute function public.notify_on_message();

------------------------------------------------------------------------
-- 3. TRUST & REPUTATION SCORING
------------------------------------------------------------------------

create table if not exists public.trust_scores (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  sessions_completed integer not null default 0,
  sessions_with_issues integer not null default 0,
  meet_again_yes integer not null default 0,
  meet_again_no integer not null default 0,
  reports_received integer not null default 0,
  no_show_count integer not null default 0,
  score numeric(5,2) not null default 50.00,
  updated_at timestamptz not null default now()
);

alter table public.trust_scores enable row level security;
alter table public.trust_scores force row level security;

drop policy if exists trust_scores_select_authenticated on public.trust_scores;
create policy trust_scores_select_authenticated on public.trust_scores
  for select to authenticated using (true);

grant select on public.trust_scores to authenticated;

create or replace function public.recalculate_trust_score(target_user_id uuid)
returns numeric
language plpgsql security definer set search_path = public as $$
declare
  completed_count integer;
  issue_count integer;
  yes_count integer;
  no_count integer;
  report_count integer;
  raw_score numeric;
begin
  select count(*) into completed_count
  from public.requests
  where status = 'completed'
    and (created_by = target_user_id or matched_user_id = target_user_id);

  select count(*) into issue_count
  from public.requests
  where status = 'completed'
    and (
      (created_by = target_user_id and poster_outcome = 'issue')
      or (matched_user_id = target_user_id and peer_outcome = 'issue')
    );

  select
    count(*) filter (where
      (created_by = target_user_id and peer_meet_again = true)
      or (matched_user_id = target_user_id and poster_meet_again = true)
    ),
    count(*) filter (where
      (created_by = target_user_id and peer_meet_again = false)
      or (matched_user_id = target_user_id and poster_meet_again = false)
    )
  into yes_count, no_count
  from public.requests
  where status = 'completed'
    and (created_by = target_user_id or matched_user_id = target_user_id);

  select count(*) into report_count
  from public.reports
  where target_user_id = target_user_id and status in ('open', 'reviewing', 'resolved');

  -- Score formula: start at 50, gain for completions & meet-agains, lose for issues & reports
  raw_score := 50.0
    + least(completed_count * 2.0, 30.0)        -- up to +30 for completions
    + least(yes_count * 3.0, 15.0)               -- up to +15 for meet-again
    - least(issue_count * 5.0, 20.0)             -- up to -20 for issues
    - least(no_count * 2.0, 10.0)                -- up to -10 for no-meet-again
    - least(report_count * 8.0, 25.0);           -- up to -25 for reports

  raw_score := greatest(0, least(raw_score, 100));

  insert into public.trust_scores (user_id, sessions_completed, sessions_with_issues, meet_again_yes, meet_again_no, reports_received, score)
  values (target_user_id, completed_count, issue_count, yes_count, no_count, report_count, raw_score)
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

-- Trigger: recalculate trust score after session completion
create or replace function public.recalculate_trust_on_completion()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'completed' and old.status <> 'completed' then
    perform public.recalculate_trust_score(new.created_by);
    if new.matched_user_id is not null then
      perform public.recalculate_trust_score(new.matched_user_id);
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_recalculate_trust_on_completion on public.requests;
create trigger trg_recalculate_trust_on_completion
after update on public.requests for each row execute function public.recalculate_trust_on_completion();

------------------------------------------------------------------------
-- 4. EPHEMERAL "GOING OUT NOW" REQUESTS
------------------------------------------------------------------------

alter table public.requests add column if not exists expires_at timestamptz;

create index if not exists idx_requests_expires_at on public.requests (expires_at) where expires_at is not null and status = 'open';

create or replace function public.expire_stale_requests()
returns integer
language plpgsql security definer set search_path = public as $$
declare
  expired_count integer;
begin
  update public.requests
  set status = 'cancelled', updated_at = now()
  where status = 'open' and expires_at is not null and expires_at < now();
  get diagnostics expired_count = row_count;
  return expired_count;
end;
$$;

------------------------------------------------------------------------
-- 5. MUTUAL AVAILABILITY WINDOWS
------------------------------------------------------------------------

create table if not exists public.availability_windows (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  day_of_week integer not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null,
  label text not null default '' check (char_length(label) <= 80),
  created_at timestamptz not null default now(),
  constraint availability_time_order check (start_time < end_time),
  unique (user_id, day_of_week, start_time)
);

create index if not exists idx_availability_windows_user on public.availability_windows (user_id, day_of_week);

alter table public.availability_windows enable row level security;
alter table public.availability_windows force row level security;

drop policy if exists availability_windows_select_authenticated on public.availability_windows;
create policy availability_windows_select_authenticated on public.availability_windows
  for select to authenticated using (true);

drop policy if exists availability_windows_modify_owner on public.availability_windows;
create policy availability_windows_modify_owner on public.availability_windows
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select, insert, update, delete on public.availability_windows to authenticated;

create or replace function public.set_availability_window(
  day_input integer,
  start_time_input time,
  end_time_input time,
  label_input text default ''
)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  window_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  insert into public.availability_windows (user_id, day_of_week, start_time, end_time, label)
  values (auth.uid(), day_input, start_time_input, end_time_input, trim(coalesce(label_input, '')))
  on conflict (user_id, day_of_week, start_time) do update set
    end_time = excluded.end_time,
    label = excluded.label
  returning id into window_id;
  return window_id;
end;
$$;

create or replace function public.get_my_availability()
returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', id, 'dayOfWeek', day_of_week, 'startTime', start_time,
        'endTime', end_time, 'label', label
      ) order by day_of_week, start_time
    ), '[]'::jsonb
  )
  from public.availability_windows where user_id = auth.uid();
$$;

create or replace function public.delete_availability_window(window_id_input uuid)
returns uuid
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  delete from public.availability_windows where id = window_id_input and user_id = auth.uid();
  if not found then raise exception 'Availability window not found.'; end if;
  return window_id_input;
end;
$$;

------------------------------------------------------------------------
-- 6. PROGRESSIVE VERIFICATION TIERS
------------------------------------------------------------------------

alter table public.profiles add column if not exists verification_tier public.verification_tier not null default 'email';
alter table public.profiles add column if not exists phone_number_hash text;

create or replace function public.upgrade_verification_tier(
  new_tier public.verification_tier,
  phone_hash_input text default null
)
returns public.verification_tier
language plpgsql security definer set search_path = public as $$
declare
  current_tier public.verification_tier;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;

  select verification_tier into current_tier from public.profiles where id = auth.uid();

  -- Enforce progression: email -> phone -> id_verified
  if new_tier = 'phone' and current_tier <> 'email' then
    raise exception 'Already at or beyond phone verification.';
  end if;
  if new_tier = 'id_verified' and current_tier <> 'phone' then
    raise exception 'Phone verification is required before ID verification.';
  end if;

  update public.profiles
  set verification_tier = new_tier,
      phone_number_hash = case when new_tier = 'phone' then phone_hash_input else phone_number_hash end
  where id = auth.uid();

  -- Create notification
  insert into public.notifications (user_id, kind, title, body)
  values (
    auth.uid(),
    'verification_upgraded',
    'Verification upgraded',
    format('Your verification level is now %s.', new_tier)
  );

  return new_tier;
end;
$$;

------------------------------------------------------------------------
-- 7. COMPANION COMPATIBILITY SCORE (computed in feed query)
------------------------------------------------------------------------

create or replace function public.get_public_request_feed_v2(limit_count integer default 12)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  viewer_tags text[];
  viewer_area text;
  viewer_lane_counts jsonb;
begin
  -- Gather viewer context for scoring
  if auth.uid() is not null then
    select home_area into viewer_area from public.profiles where id = auth.uid();
    select array_agg(distinct unnested_tag)
    into viewer_tags
    from public.requests, unnest(tags) as unnested_tag
    where created_by = auth.uid();
  end if;

  return coalesce(
    (
      select jsonb_agg(feed_row order by feed_row->>'compatibilityScore' desc nulls last, feed_row->>'createdAt' desc)
      from (
        select jsonb_build_object(
          'id', requests.id,
          'lane', requests.lane,
          'title', requests.title,
          'description', requests.description,
          'areaLabel', requests.area_label,
          'meetupAt', requests.meetup_at,
          'expiresAt', requests.expires_at,
          'createdAt', requests.created_at,
          'verifiedOnly', requests.verified_only,
          'hostDisplayName', profiles.display_name,
          'hostVerified', exists (
            select 1 from auth.users where auth.users.id = requests.created_by and auth.users.email_confirmed_at is not null
          ),
          'tags', requests.tags,
          'hostTrustScore', coalesce(ts.score, 50),
          'hostVerificationTier', profiles.verification_tier,
          'maxCompanions', requests.max_companions,
          'compatibilityScore', case
            when auth.uid() is null then null
            else round((
              -- Tag overlap (up to 40 points)
              coalesce(
                (select count(*)::numeric * 10 from unnest(requests.tags) t where t = any(viewer_tags)),
                0
              )
              -- Area match (20 points)
              + case when viewer_area is not null and requests.area_label ilike '%' || viewer_area || '%' then 20 else 0 end
              -- Trust score bonus (up to 20 points)
              + coalesce(ts.score / 5.0, 10)
              -- Verified host bonus (10 points)
              + case when exists (select 1 from auth.users where auth.users.id = requests.created_by and auth.users.email_confirmed_at is not null) then 10 else 0 end
              -- Recency bonus (up to 10 points)
              + greatest(0, 10 - extract(epoch from now() - requests.created_at) / 3600)
            ), 1)
          end
        ) as feed_row
        from public.requests
        join public.profiles on profiles.id = requests.created_by
        left join public.trust_scores ts on ts.user_id = requests.created_by
        where requests.status = 'open'
          and (requests.expires_at is null or requests.expires_at > now())
          and (auth.uid() is null or not public.users_are_blocked(auth.uid(), requests.created_by))
        order by requests.created_at desc
        limit greatest(1, least(limit_count, 50))
      ) sub
    ),
    '[]'::jsonb
  );
end;
$$;

------------------------------------------------------------------------
-- 8. POST-SESSION MEET-AGAIN NETWORK
------------------------------------------------------------------------

create table if not exists public.trusted_companions (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references public.profiles(id) on delete cascade,
  user_b uuid not null references public.profiles(id) on delete cascade,
  request_id uuid not null references public.requests(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_a, user_b, request_id),
  constraint companion_not_self check (user_a <> user_b)
);

create index if not exists idx_trusted_companions_a on public.trusted_companions (user_a, created_at desc);
create index if not exists idx_trusted_companions_b on public.trusted_companions (user_b, created_at desc);

alter table public.trusted_companions enable row level security;
alter table public.trusted_companions force row level security;

drop policy if exists trusted_companions_select_owner on public.trusted_companions;
create policy trusted_companions_select_owner on public.trusted_companions
  for select to authenticated using (user_a = auth.uid() or user_b = auth.uid());

grant select on public.trusted_companions to authenticated;

-- Trigger: create companion link when both parties say meet_again = true
create or replace function public.sync_meet_again_companions()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  pair_a uuid;
  pair_b uuid;
begin
  if new.status <> 'completed' or new.matched_user_id is null then return new; end if;
  if new.poster_meet_again is not true or new.peer_meet_again is not true then return new; end if;

  pair_a := least(new.created_by, new.matched_user_id);
  pair_b := greatest(new.created_by, new.matched_user_id);

  insert into public.trusted_companions (user_a, user_b, request_id)
  values (pair_a, pair_b, new.id)
  on conflict (user_a, user_b, request_id) do nothing;

  -- Notify both
  insert into public.notifications (user_id, kind, title, body, ref_id) values
    (new.created_by, 'meet_again_mutual', 'New trusted companion',
     'You and your companion both want to meet again. They have been added to your trusted network.',
     new.id),
    (new.matched_user_id, 'meet_again_mutual', 'New trusted companion',
     'You and your companion both want to meet again. They have been added to your trusted network.',
     new.id);

  return new;
end;
$$;

drop trigger if exists trg_sync_meet_again on public.requests;
create trigger trg_sync_meet_again
after update on public.requests for each row execute function public.sync_meet_again_companions();

create or replace function public.get_trusted_companions()
returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', tc.id,
        'companionId', case when tc.user_a = auth.uid() then tc.user_b else tc.user_a end,
        'companionName', p.display_name,
        'companionTrustScore', coalesce(ts.score, 50),
        'requestId', tc.request_id,
        'createdAt', tc.created_at
      ) order by tc.created_at desc
    ), '[]'::jsonb
  )
  from public.trusted_companions tc
  join public.profiles p on p.id = case when tc.user_a = auth.uid() then tc.user_b else tc.user_a end
  left join public.trust_scores ts on ts.user_id = p.id
  where tc.user_a = auth.uid() or tc.user_b = auth.uid();
$$;

------------------------------------------------------------------------
-- 9. EMERGENCY SOS
------------------------------------------------------------------------

create table if not exists public.emergency_contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade unique,
  contact_name text not null check (char_length(contact_name) between 2 and 60),
  contact_phone text not null check (char_length(contact_phone) between 6 and 20),
  contact_email text check (contact_email is null or char_length(contact_email) <= 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.emergency_contacts enable row level security;
alter table public.emergency_contacts force row level security;

drop policy if exists emergency_contacts_owner on public.emergency_contacts;
create policy emergency_contacts_owner on public.emergency_contacts
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select, insert, update, delete on public.emergency_contacts to authenticated;

create table if not exists public.sos_alerts (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests(id) on delete cascade,
  triggered_by uuid not null references public.profiles(id) on delete cascade,
  status public.sos_status not null default 'active',
  location_text text not null default '' check (char_length(location_text) <= 200),
  resolved_at timestamptz,
  resolved_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_sos_alerts_request on public.sos_alerts (request_id, created_at desc);
create index if not exists idx_sos_alerts_status on public.sos_alerts (status, created_at desc);

alter table public.sos_alerts enable row level security;
alter table public.sos_alerts force row level security;

drop policy if exists sos_alerts_select_participants on public.sos_alerts;
create policy sos_alerts_select_participants on public.sos_alerts
  for select to authenticated
  using (
    triggered_by = auth.uid()
    or exists (
      select 1 from public.requests r
      where r.id = sos_alerts.request_id
        and (r.created_by = auth.uid() or r.matched_user_id = auth.uid())
    )
    or public.is_admin(auth.uid())
  );

grant select on public.sos_alerts to authenticated;

create or replace function public.set_emergency_contact(
  name_input text,
  phone_input text,
  email_input text default null
)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  contact_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  insert into public.emergency_contacts (user_id, contact_name, contact_phone, contact_email)
  values (auth.uid(), trim(name_input), trim(phone_input), nullif(trim(coalesce(email_input, '')), ''))
  on conflict (user_id) do update set
    contact_name = excluded.contact_name,
    contact_phone = excluded.contact_phone,
    contact_email = excluded.contact_email,
    updated_at = now()
  returning id into contact_id;
  return contact_id;
end;
$$;

create or replace function public.trigger_sos_alert(
  request_id_input uuid,
  location_text_input text default ''
)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  target public.requests%rowtype;
  alert_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;

  select * into target from public.requests where id = request_id_input;
  if not found then raise exception 'Session not found.'; end if;
  if target.status <> 'matched' then raise exception 'SOS is only available during active sessions.'; end if;
  if target.created_by <> auth.uid() and target.matched_user_id <> auth.uid() then
    raise exception 'Only session participants can trigger SOS.';
  end if;

  insert into public.sos_alerts (request_id, triggered_by, location_text)
  values (request_id_input, auth.uid(), trim(coalesce(location_text_input, '')))
  returning id into alert_id;

  -- Notify partner
  insert into public.notifications (user_id, kind, title, body, ref_id)
  values (
    case when target.created_by = auth.uid() then target.matched_user_id else target.created_by end,
    'sos_triggered',
    'Emergency SOS triggered',
    'Your companion has triggered an emergency alert. Please check on them immediately.',
    request_id_input
  );

  return alert_id;
end;
$$;

create or replace function public.resolve_sos_alert(
  alert_id_input uuid,
  resolution_status public.sos_status default 'resolved'
)
returns uuid
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if resolution_status not in ('resolved', 'false_alarm') then
    raise exception 'Status must be resolved or false_alarm.';
  end if;

  update public.sos_alerts
  set status = resolution_status, resolved_at = now(), resolved_by = auth.uid()
  where id = alert_id_input
    and status = 'active'
    and (
      triggered_by = auth.uid()
      or public.is_admin(auth.uid())
    );

  if not found then raise exception 'SOS alert not found or already resolved.'; end if;
  return alert_id_input;
end;
$$;

------------------------------------------------------------------------
-- 10. GROUP COMPANIONSHIP
------------------------------------------------------------------------

alter table public.requests add column if not exists max_companions integer not null default 1 check (max_companions between 1 and 5);
alter table public.requests add column if not exists companion_ids uuid[] not null default '{}';

------------------------------------------------------------------------
-- 11. COMMUNITY-SCOPED TRUST NETWORKS
------------------------------------------------------------------------

create table if not exists public.communities (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 3 and 80) unique,
  description text not null default '' check (char_length(description) <= 400),
  is_private boolean not null default false,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.community_members (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.community_role not null default 'member',
  joined_at timestamptz not null default now(),
  unique (community_id, user_id)
);

create index if not exists idx_community_members_user on public.community_members (user_id, joined_at desc);
create index if not exists idx_community_members_community on public.community_members (community_id, role);

alter table public.communities enable row level security;
alter table public.communities force row level security;
alter table public.community_members enable row level security;
alter table public.community_members force row level security;

drop policy if exists communities_select_public on public.communities;
create policy communities_select_public on public.communities
  for select to authenticated using (
    not is_private
    or created_by = auth.uid()
    or exists (select 1 from public.community_members where community_id = communities.id and user_id = auth.uid())
    or public.is_admin(auth.uid())
  );

drop policy if exists community_members_select on public.community_members;
create policy community_members_select on public.community_members
  for select to authenticated using (
    user_id = auth.uid()
    or exists (select 1 from public.community_members cm2 where cm2.community_id = community_members.community_id and cm2.user_id = auth.uid())
    or public.is_admin(auth.uid())
  );

grant select on public.communities to authenticated;
grant select on public.community_members to authenticated;

create or replace function public.create_community(
  name_input text,
  description_input text default '',
  is_private_input boolean default false
)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  community_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;

  insert into public.communities (name, description, is_private, created_by)
  values (trim(name_input), trim(coalesce(description_input, '')), coalesce(is_private_input, false), auth.uid())
  returning id into community_id;

  insert into public.community_members (community_id, user_id, role)
  values (community_id, auth.uid(), 'owner');

  return community_id;
end;
$$;

create or replace function public.join_community(community_id_input uuid)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  target public.communities%rowtype;
  member_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;

  select * into target from public.communities where id = community_id_input;
  if not found then raise exception 'Community not found.'; end if;

  if target.is_private then
    raise exception 'This community is invite-only.';
  end if;

  insert into public.community_members (community_id, user_id, role)
  values (community_id_input, auth.uid(), 'member')
  on conflict (community_id, user_id) do nothing
  returning id into member_id;

  return coalesce(member_id, gen_random_uuid());
end;
$$;

create or replace function public.get_my_communities()
returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', c.id, 'name', c.name, 'description', c.description,
        'isPrivate', c.is_private, 'role', cm.role,
        'memberCount', (select count(*)::int from public.community_members where community_id = c.id),
        'joinedAt', cm.joined_at
      ) order by cm.joined_at desc
    ), '[]'::jsonb
  )
  from public.community_members cm
  join public.communities c on c.id = cm.community_id
  where cm.user_id = auth.uid();
$$;

------------------------------------------------------------------------
-- 12. AI-POWERED CONTENT MODERATION
------------------------------------------------------------------------

create table if not exists public.moderation_reviews (
  id uuid primary key default gen_random_uuid(),
  content_type text not null check (content_type in ('request', 'message', 'profile', 'report')),
  content_id text not null,
  content_text text not null check (char_length(content_text) <= 2000),
  verdict public.moderation_verdict not null default 'safe',
  confidence numeric(4,3) not null default 0.000 check (confidence between 0 and 1),
  flags text[] not null default '{}',
  reviewed_by text not null default 'auto' check (char_length(reviewed_by) <= 40),
  created_at timestamptz not null default now()
);

create index if not exists idx_moderation_reviews_content on public.moderation_reviews (content_type, content_id);
create index if not exists idx_moderation_reviews_verdict on public.moderation_reviews (verdict, created_at desc);

alter table public.moderation_reviews enable row level security;
alter table public.moderation_reviews force row level security;

drop policy if exists moderation_reviews_admin_only on public.moderation_reviews;
create policy moderation_reviews_admin_only on public.moderation_reviews
  for select to authenticated using (public.is_admin(auth.uid()));

grant select on public.moderation_reviews to authenticated;

create or replace function public.submit_moderation_review(
  content_type_input text,
  content_id_input text,
  content_text_input text,
  verdict_input public.moderation_verdict default 'safe',
  confidence_input numeric default 0.0,
  flags_input text[] default '{}'
)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  review_id uuid;
begin
  -- Can be called by service role or admin only
  insert into public.moderation_reviews (content_type, content_id, content_text, verdict, confidence, flags)
  values (content_type_input, content_id_input, left(content_text_input, 2000), verdict_input, confidence_input, coalesce(flags_input, '{}'))
  returning id into review_id;

  -- Flag for admin attention if flagged or rejected
  if verdict_input in ('flagged', 'rejected') then
    insert into public.notifications (user_id, kind, title, body)
    select id, 'moderation_flag', 'Content flagged by auto-moderation',
      format('A %s was flagged with verdict "%s" (confidence: %s).', content_type_input, verdict_input, confidence_input)
    from public.profiles where role = 'admin';
  end if;

  return review_id;
end;
$$;

create or replace function public.get_pending_moderation(limit_count integer default 20)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if auth.uid() is null or not public.is_admin(auth.uid()) then
    raise exception 'Admin privileges required';
  end if;

  return coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'id', id, 'contentType', content_type, 'contentId', content_id,
          'contentText', content_text, 'verdict', verdict,
          'confidence', confidence, 'flags', flags,
          'reviewedBy', reviewed_by, 'createdAt', created_at
        ) order by created_at desc
      )
      from public.moderation_reviews
      where verdict in ('flagged', 'rejected')
      limit greatest(1, least(limit_count, 50))
    ),
    '[]'::jsonb
  );
end;
$$;

------------------------------------------------------------------------
-- GRANT EXECUTE on all new functions
------------------------------------------------------------------------

grant execute on function public.submit_check_in(uuid, public.check_in_status, text) to authenticated;
grant execute on function public.get_session_check_ins(uuid) to authenticated;
grant execute on function public.get_my_notifications(integer) to authenticated;
grant execute on function public.mark_notifications_read(bigint[]) to authenticated;
grant execute on function public.recalculate_trust_score(uuid) to authenticated;
grant execute on function public.expire_stale_requests() to authenticated;
grant execute on function public.set_availability_window(integer, time, time, text) to authenticated;
grant execute on function public.get_my_availability() to authenticated;
grant execute on function public.delete_availability_window(uuid) to authenticated;
grant execute on function public.upgrade_verification_tier(public.verification_tier, text) to authenticated;
grant execute on function public.get_public_request_feed_v2(integer) to anon, authenticated;
grant execute on function public.get_trusted_companions() to authenticated;
grant execute on function public.set_emergency_contact(text, text, text) to authenticated;
grant execute on function public.trigger_sos_alert(uuid, text) to authenticated;
grant execute on function public.resolve_sos_alert(uuid, public.sos_status) to authenticated;
grant execute on function public.create_community(text, text, boolean) to authenticated;
grant execute on function public.join_community(uuid) to authenticated;
grant execute on function public.get_my_communities() to authenticated;
grant execute on function public.submit_moderation_review(text, text, text, public.moderation_verdict, numeric, text[]) to authenticated;
grant execute on function public.get_pending_moderation(integer) to authenticated;

-- Add notifications to realtime publication
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.notifications;
    exception when duplicate_object then null;
    end;
  end if;
end $$;
