create extension if not exists pgcrypto;

do $$
begin
  create type public.app_role as enum ('member', 'admin');
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.request_lane as enum ('social', 'errand');
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.request_status as enum ('open', 'matched', 'completed', 'cancelled');
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.join_request_status as enum ('pending', 'accepted', 'declined');
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.report_status as enum ('open', 'reviewing', 'resolved', 'dismissed');
exception
  when duplicate_object then null;
end
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 60),
  about_me text not null default '' check (char_length(about_me) <= 300),
  home_area text not null default '' check (char_length(home_area) <= 120),
  role public.app_role not null default 'member',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.requests (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles(id) on delete cascade,
  lane public.request_lane not null,
  title text not null check (char_length(title) between 6 and 120),
  description text not null check (char_length(description) between 24 and 600),
  area_label text not null check (char_length(area_label) between 3 and 120),
  meetup_at timestamptz,
  radius_km integer not null default 5 check (radius_km between 1 and 25),
  tags text[] not null default '{}',
  verified_only boolean not null default true,
  check_in_enabled boolean not null default true,
  status public.request_status not null default 'open',
  matched_user_id uuid references public.profiles(id) on delete set null,
  completed_at timestamptz,
  poster_outcome text,
  poster_meet_again boolean,
  peer_outcome text,
  peer_meet_again boolean,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_activity_at timestamptz not null default now(),
  constraint request_outcome_values_check check (
    poster_outcome is null or poster_outcome in ('completed', 'issue')
  ),
  constraint request_peer_outcome_values_check check (
    peer_outcome is null or peer_outcome in ('completed', 'issue')
  )
);

create table if not exists public.join_requests (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests(id) on delete cascade,
  joiner_id uuid not null references public.profiles(id) on delete cascade,
  intro_message text not null default '' check (char_length(intro_message) <= 220),
  status public.join_request_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (request_id, joiner_id)
);

create table if not exists public.request_messages (
  id bigint generated always as identity primary key,
  request_id uuid not null references public.requests(id) on delete cascade,
  sender_type text not null check (sender_type in ('user', 'system')),
  sender_id uuid references public.profiles(id) on delete set null,
  sender_name text not null,
  body text not null check (char_length(body) between 1 and 700),
  created_at timestamptz not null default now()
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references public.requests(id) on delete set null,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  target_user_id uuid references public.profiles(id) on delete set null,
  reason text not null check (char_length(reason) between 4 and 80),
  details text not null default '' check (char_length(details) <= 1200),
  status public.report_status not null default 'open',
  resolution_note text not null default '' check (char_length(resolution_note) <= 1200),
  resolved_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (blocker_id, blocked_id),
  constraint user_blocks_not_self check (blocker_id <> blocked_id)
);

create table if not exists public.account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null default '' check (char_length(reason) <= 600),
  status text not null default 'pending' check (status in ('pending', 'resolved', 'cancelled')),
  resolution_note text not null default '' check (char_length(resolution_note) <= 1200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references public.profiles(id) on delete set null
);

create table if not exists public.rate_limit_events (
  id bigint generated always as identity primary key,
  action text not null,
  key_hash text not null,
  context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.app_event_logs (
  id bigint generated always as identity primary key,
  level text not null check (level in ('info', 'warn', 'error')),
  category text not null,
  message text not null,
  context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_requests_created_by on public.requests (created_by, created_at desc);
create index if not exists idx_requests_matched_user on public.requests (matched_user_id, last_activity_at desc);
create index if not exists idx_requests_public_feed on public.requests (status, lane, created_at desc);
create index if not exists idx_join_requests_owner on public.join_requests (request_id, status, created_at asc);
create index if not exists idx_join_requests_joiner on public.join_requests (joiner_id, created_at desc);
create index if not exists idx_request_messages_request on public.request_messages (request_id, created_at asc);
create index if not exists idx_reports_reporter on public.reports (reporter_id, created_at desc);
create index if not exists idx_reports_status on public.reports (status, created_at desc);
create index if not exists idx_user_blocks_blocker on public.user_blocks (blocker_id, created_at desc);
create index if not exists idx_user_blocks_blocked on public.user_blocks (blocked_id, created_at desc);
create index if not exists idx_account_deletion_requests_user on public.account_deletion_requests (user_id, created_at desc);
create index if not exists idx_account_deletion_requests_status on public.account_deletion_requests (status, created_at desc);
create index if not exists idx_rate_limit_events_lookup on public.rate_limit_events (action, key_hash, created_at desc);
create index if not exists idx_app_event_logs_lookup on public.app_event_logs (category, created_at desc);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_profiles_updated_at on public.profiles;
create trigger touch_profiles_updated_at
before update on public.profiles
for each row
execute function public.touch_updated_at();

drop trigger if exists touch_requests_updated_at on public.requests;
create trigger touch_requests_updated_at
before update on public.requests
for each row
execute function public.touch_updated_at();

drop trigger if exists touch_join_requests_updated_at on public.join_requests;
create trigger touch_join_requests_updated_at
before update on public.join_requests
for each row
execute function public.touch_updated_at();

drop trigger if exists touch_reports_updated_at on public.reports;
create trigger touch_reports_updated_at
before update on public.reports
for each row
execute function public.touch_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  fallback_display_name text;
begin
  fallback_display_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    split_part(coalesce(new.email, 'member'), '@', 1),
    'Member'
  );

  insert into public.profiles (id, display_name)
  values (new.id, left(fallback_display_name, 60))
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

insert into public.profiles (id, display_name)
select
  users.id,
  left(
    coalesce(
      nullif(trim(users.raw_user_meta_data ->> 'display_name'), ''),
      nullif(trim(users.raw_user_meta_data ->> 'full_name'), ''),
      split_part(coalesce(users.email, 'member'), '@', 1),
      'Member'
    ),
    60
  )
from auth.users as users
on conflict (id) do nothing;

create or replace function public.is_admin(check_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = check_user
      and role = 'admin'
  );
$$;

create or replace function public.current_user_verified()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from auth.users
    where id = auth.uid()
      and email_confirmed_at is not null
  );
$$;

alter table public.profiles enable row level security;
alter table public.requests enable row level security;
alter table public.join_requests enable row level security;
alter table public.request_messages enable row level security;
alter table public.reports enable row level security;
alter table public.user_blocks enable row level security;
alter table public.account_deletion_requests enable row level security;

alter table public.profiles force row level security;
alter table public.requests force row level security;
alter table public.join_requests force row level security;
alter table public.request_messages force row level security;
alter table public.reports force row level security;
alter table public.user_blocks force row level security;
alter table public.account_deletion_requests force row level security;

drop policy if exists profiles_select_authenticated on public.profiles;
create policy profiles_select_authenticated
on public.profiles
for select
to authenticated
using (id = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists requests_select_participants on public.requests;
create policy requests_select_participants
on public.requests
for select
to authenticated
using (
  created_by = auth.uid()
  or matched_user_id = auth.uid()
  or public.is_admin(auth.uid())
);

drop policy if exists request_messages_select_participants on public.request_messages;
create policy request_messages_select_participants
on public.request_messages
for select
to authenticated
using (
  exists (
    select 1
    from public.requests
    where id = request_messages.request_id
      and (
        created_by = auth.uid()
        or matched_user_id = auth.uid()
        or public.is_admin(auth.uid())
      )
  )
);

drop policy if exists join_requests_select_owner_or_joiner on public.join_requests;
create policy join_requests_select_owner_or_joiner
on public.join_requests
for select
to authenticated
using (
  joiner_id = auth.uid()
  or exists (
    select 1
    from public.requests
    where id = join_requests.request_id
      and (created_by = auth.uid() or public.is_admin(auth.uid()))
  )
);

drop policy if exists reports_select_owner_or_admin on public.reports;
create policy reports_select_owner_or_admin
on public.reports
for select
to authenticated
using (
  reporter_id = auth.uid()
  or public.is_admin(auth.uid())
);

drop policy if exists user_blocks_select_owner_or_admin on public.user_blocks;
create policy user_blocks_select_owner_or_admin
on public.user_blocks
for select
to authenticated
using (
  blocker_id = auth.uid()
  or blocked_id = auth.uid()
  or public.is_admin(auth.uid())
);

drop policy if exists user_blocks_insert_owner on public.user_blocks;
create policy user_blocks_insert_owner
on public.user_blocks
for insert
to authenticated
with check (blocker_id = auth.uid());

drop policy if exists account_deletion_requests_select_owner_or_admin on public.account_deletion_requests;
create policy account_deletion_requests_select_owner_or_admin
on public.account_deletion_requests
for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_admin(auth.uid())
);

grant select, update on public.profiles to authenticated;
grant select on public.request_messages to authenticated;
grant select on public.join_requests to authenticated;
grant select on public.reports to authenticated;
grant select, insert on public.user_blocks to authenticated;
grant select on public.account_deletion_requests to authenticated;

create or replace function public.users_are_blocked(left_user uuid, right_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_blocks
    where (blocker_id = left_user and blocked_id = right_user)
       or (blocker_id = right_user and blocked_id = left_user)
  );
$$;

create or replace function public.get_public_request_feed(limit_count integer default 12)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', feed.id,
        'lane', feed.lane,
        'title', feed.title,
        'description', feed.description,
        'areaLabel', feed.area_label,
        'meetupAt', feed.meetup_at,
        'createdAt', feed.created_at,
        'verifiedOnly', feed.verified_only,
        'hostDisplayName', feed.host_display_name,
        'hostVerified', feed.host_verified,
        'tags', feed.tags
      )
      order by feed.created_at desc
    ),
    '[]'::jsonb
  )
  from (
    select
      requests.id,
      requests.lane,
      requests.title,
      requests.description,
      requests.area_label,
      requests.meetup_at,
      requests.created_at,
      requests.verified_only,
      requests.tags,
      profiles.display_name as host_display_name,
      exists (
        select 1
        from auth.users
        where auth.users.id = requests.created_by
          and auth.users.email_confirmed_at is not null
      ) as host_verified
    from public.requests as requests
    join public.profiles on profiles.id = requests.created_by
    where requests.status = 'open'
      and (
        auth.uid() is null
        or not public.users_are_blocked(auth.uid(), requests.created_by)
      )
    order by requests.created_at desc
    limit greatest(1, least(limit_count, 24))
  ) as feed;
$$;

create or replace function public.get_workspace_snapshot()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  profile_payload jsonb;
  my_requests_payload jsonb;
  join_review_payload jsonb;
  active_session_payload jsonb;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not exists (select 1 from public.profiles where id = auth.uid()) then
    insert into public.profiles (id, display_name)
    select
      users.id,
      left(
        coalesce(
          nullif(trim(users.raw_user_meta_data ->> 'display_name'), ''),
          nullif(trim(users.raw_user_meta_data ->> 'full_name'), ''),
          split_part(coalesce(users.email, 'member'), '@', 1),
          'Member'
        ),
        60
      )
    from auth.users as users
    where users.id = auth.uid()
    on conflict (id) do nothing;
  end if;

  select jsonb_build_object(
    'id', profiles.id,
    'displayName', profiles.display_name,
    'aboutMe', profiles.about_me,
    'homeArea', profiles.home_area,
    'role', profiles.role
  )
  into profile_payload
  from public.profiles
  where profiles.id = auth.uid();

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', items.id,
        'lane', items.lane,
        'title', items.title,
        'areaLabel', items.area_label,
        'meetupAt', items.meetup_at,
        'status', items.status,
        'verifiedOnly', items.verified_only,
        'pendingJoinCount', items.pending_join_count,
        'partnerDisplayName', items.partner_display_name,
        'partnerId', items.partner_id,
        'createdAt', items.created_at,
        'lastActivityAt', items.last_activity_at,
        'completedAt', items.completed_at,
        'userOutcome', items.user_outcome,
        'userMeetAgain', items.user_meet_again
      )
      order by items.last_activity_at desc
    ),
    '[]'::jsonb
  )
  into my_requests_payload
  from (
    select
      requests.id,
      requests.lane,
      requests.title,
      requests.area_label,
      requests.meetup_at,
      requests.status,
      requests.verified_only,
      requests.created_at,
      requests.last_activity_at,
      requests.completed_at,
      coalesce(join_counts.pending_join_count, 0) as pending_join_count,
      case
        when requests.created_by = auth.uid() then matched.display_name
        else owners.display_name
      end as partner_display_name,
      case
        when requests.created_by = auth.uid() then requests.matched_user_id
        else requests.created_by
      end as partner_id,
      case
        when requests.created_by = auth.uid() then requests.poster_outcome
        else requests.peer_outcome
      end as user_outcome,
      case
        when requests.created_by = auth.uid() then requests.poster_meet_again
        else requests.peer_meet_again
      end as user_meet_again
    from public.requests
    join public.profiles as owners on owners.id = requests.created_by
    left join public.profiles as matched on matched.id = requests.matched_user_id
    left join (
      select request_id, count(*)::int as pending_join_count
      from public.join_requests
      where status = 'pending'
      group by request_id
    ) as join_counts on join_counts.request_id = requests.id
    where requests.created_by = auth.uid()
       or requests.matched_user_id = auth.uid()
  ) as items;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', join_requests.id,
        'requestId', requests.id,
        'requestTitle', requests.title,
        'requestLane', requests.lane,
        'joinerId', joiner.id,
        'joinerDisplayName', joiner.display_name,
        'joinerAboutMe', joiner.about_me,
        'introMessage', join_requests.intro_message,
        'createdAt', join_requests.created_at
      )
      order by join_requests.created_at asc
    ),
    '[]'::jsonb
  )
  into join_review_payload
  from public.join_requests
  join public.requests on requests.id = join_requests.request_id
  join public.profiles as joiner on joiner.id = join_requests.joiner_id
  where requests.created_by = auth.uid()
    and requests.status = 'open'
    and join_requests.status = 'pending';

  select
    case
      when session_data.request_id is null then null
      else jsonb_build_object(
        'requestId', session_data.request_id,
        'requestTitle', session_data.request_title,
        'lane', session_data.lane,
        'areaLabel', session_data.area_label,
        'meetupAt', session_data.meetup_at,
        'checkInEnabled', session_data.check_in_enabled,
        'partnerDisplayName', session_data.partner_display_name,
        'partnerId', session_data.partner_id,
        'messages', session_data.messages
      )
    end
  into active_session_payload
  from (
    select
      requests.id as request_id,
      requests.title as request_title,
      requests.lane,
      requests.area_label,
      requests.meetup_at,
      requests.check_in_enabled,
      case
        when requests.created_by = auth.uid() then matched.display_name
        else owners.display_name
      end as partner_display_name,
      case
        when requests.created_by = auth.uid() then requests.matched_user_id
        else requests.created_by
      end as partner_id,
      coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'id', request_messages.id,
              'requestId', request_messages.request_id,
              'senderType', request_messages.sender_type,
              'senderId', request_messages.sender_id,
              'senderName', request_messages.sender_name,
              'body', request_messages.body,
              'createdAt', request_messages.created_at
            )
            order by request_messages.created_at asc
          )
          from public.request_messages
          where request_messages.request_id = requests.id
        ),
        '[]'::jsonb
      ) as messages
    from public.requests
    join public.profiles as owners on owners.id = requests.created_by
    join public.profiles as matched on matched.id = requests.matched_user_id
    where requests.status = 'matched'
      and (requests.created_by = auth.uid() or requests.matched_user_id = auth.uid())
    order by requests.last_activity_at desc
    limit 1
  ) as session_data;

  return jsonb_build_object(
    'profile', profile_payload,
    'myRequests', my_requests_payload,
    'incomingJoinRequests', join_review_payload,
    'activeSession', active_session_payload
  );
end;
$$;

create or replace function public.create_request(
  lane_input public.request_lane,
  title_input text,
  description_input text,
  area_label_input text,
  meetup_at_input timestamptz,
  radius_km_input integer,
  tags_input text[],
  verified_only_input boolean,
  check_in_enabled_input boolean
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

  insert into public.requests (
    created_by,
    lane,
    title,
    description,
    area_label,
    meetup_at,
    radius_km,
    tags,
    verified_only,
    check_in_enabled
  )
  values (
    auth.uid(),
    lane_input,
    trim(title_input),
    trim(description_input),
    trim(area_label_input),
    meetup_at_input,
    greatest(1, least(radius_km_input, 25)),
    coalesce(tags_input, array['clear-plan']::text[]),
    coalesce(verified_only_input, true),
    coalesce(check_in_enabled_input, true)
  )
  returning id into new_request_id;

  return new_request_id;
end;
$$;

create or replace function public.submit_join_request(
  request_id_input uuid,
  intro_message_input text default ''
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_request public.requests%rowtype;
  join_request_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not public.current_user_verified() then
    raise exception 'Verify your email before joining.';
  end if;

  select *
  into target_request
  from public.requests
  where id = request_id_input
  for update;

  if not found then
    raise exception 'Request not found.';
  end if;

  if target_request.created_by = auth.uid() then
    raise exception 'You cannot join your own request.';
  end if;

  if public.users_are_blocked(target_request.created_by, auth.uid()) then
    raise exception 'You cannot interact with this request.';
  end if;

  if target_request.status <> 'open' then
    raise exception 'This request is no longer open.';
  end if;

  insert into public.join_requests (request_id, joiner_id, intro_message)
  values (request_id_input, auth.uid(), trim(coalesce(intro_message_input, '')))
  on conflict (request_id, joiner_id)
  do update set
    intro_message = excluded.intro_message,
    status = 'pending',
    updated_at = now()
  returning id into join_request_id;

  update public.requests
  set last_activity_at = now()
  where id = request_id_input;

  return join_request_id;
end;
$$;

create or replace function public.complete_request_session(
  request_id_input uuid,
  outcome_input text,
  meet_again_input boolean
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_request public.requests%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select *
  into target_request
  from public.requests
  where id = request_id_input
  for update;

  if not found then
    raise exception 'Request not found.';
  end if;

  if target_request.status not in ('matched', 'completed') then
    raise exception 'Only matched or recently completed sessions can be rated.';
  end if;

  if auth.uid() = target_request.created_by then
    update public.requests
    set poster_outcome = outcome_input,
        poster_meet_again = meet_again_input,
        completed_at = coalesce(completed_at, now()),
        status = case when peer_outcome is not null then 'completed' else 'matched' end,
        last_activity_at = now()
    where id = request_id_input;
  elsif auth.uid() = target_request.matched_user_id then
    update public.requests
    set peer_outcome = outcome_input,
        peer_meet_again = meet_again_input,
        completed_at = coalesce(completed_at, now()),
        status = case when poster_outcome is not null then 'completed' else 'matched' end,
        last_activity_at = now()
    where id = request_id_input;
  else
    raise exception 'Only session participants can complete this request.';
  end if;

  return request_id_input;
end;
$$;

create or replace function public.block_user(
  blocked_user_id_input uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  block_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  insert into public.user_blocks (blocker_id, blocked_id)
  values (auth.uid(), blocked_user_id_input)
  on conflict (blocker_id, blocked_id) do update
  set blocked_id = excluded.blocked_id
  returning id into block_id;

  return block_id;
end;
$$;

create or replace function public.create_report(
  request_id_input uuid,
  target_user_id_input uuid,
  reason_input text,
  details_input text,
  block_target_input boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_request public.requests%rowtype;
  report_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if request_id_input is null then
    raise exception 'A request reference is required for reporting.';
  end if;

  select *
  into target_request
  from public.requests
  where id = request_id_input;

  if not found then
    raise exception 'Request not found.';
  end if;

  if target_request.created_by <> auth.uid()
     and target_request.matched_user_id is distinct from auth.uid()
     and not public.is_admin(auth.uid()) then
    raise exception 'Only participants can report this request.';
  end if;

  if target_user_id_input = auth.uid() then
    raise exception 'You cannot report yourself.';
  end if;

  if target_user_id_input is not null
     and target_user_id_input <> target_request.created_by
     and target_user_id_input <> target_request.matched_user_id then
    raise exception 'The reported user must be part of the request.';
  end if;

  insert into public.reports (request_id, reporter_id, target_user_id, reason, details)
  values (
    request_id_input,
    auth.uid(),
    target_user_id_input,
    trim(reason_input),
    trim(coalesce(details_input, ''))
  )
  returning id into report_id;

  if block_target_input and target_user_id_input is not null and target_user_id_input <> auth.uid() then
    insert into public.user_blocks (blocker_id, blocked_id)
    values (auth.uid(), target_user_id_input)
    on conflict (blocker_id, blocked_id) do nothing;
  end if;

  return report_id;
end;
$$;

create or replace function public.resolve_report(
  report_id_input uuid,
  status_input public.report_status,
  resolution_note_input text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_admin(auth.uid()) then
    raise exception 'Admin privileges required';
  end if;

  update public.reports
  set status = status_input,
      resolution_note = trim(coalesce(resolution_note_input, '')),
      resolved_by = auth.uid(),
      updated_at = now()
  where id = report_id_input;

  if not found then
    raise exception 'Report not found.';
  end if;

  return report_id_input;
end;
$$;

create or replace function public.submit_account_deletion_request(
  reason_input text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  request_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  insert into public.account_deletion_requests (user_id, reason)
  values (auth.uid(), trim(coalesce(reason_input, '')))
  returning id into request_id;

  return request_id;
end;
$$;

create or replace function public.resolve_account_deletion_request(
  request_id_input uuid,
  status_input text,
  resolution_note_input text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_admin(auth.uid()) then
    raise exception 'Admin privileges required';
  end if;

  if status_input not in ('resolved', 'cancelled') then
    raise exception 'Status must be resolved or cancelled.';
  end if;

  update public.account_deletion_requests
  set status = status_input,
      resolution_note = trim(coalesce(resolution_note_input, '')),
      resolved_by = auth.uid(),
      resolved_at = now(),
      updated_at = now()
  where id = request_id_input;

  if not found then
    raise exception 'Deletion request not found.';
  end if;

  return request_id_input;
end;
$$;

create or replace function public.get_account_export()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  return jsonb_build_object(
    'profile', (
      select to_jsonb(profiles)
      from public.profiles
      where id = auth.uid()
    ),
    'requests', (
      select coalesce(jsonb_agg(to_jsonb(requests) order by created_at desc), '[]'::jsonb)
      from public.requests
      where created_by = auth.uid() or matched_user_id = auth.uid()
    ),
    'joinRequests', (
      select coalesce(jsonb_agg(to_jsonb(join_requests) order by created_at desc), '[]'::jsonb)
      from public.join_requests
      where joiner_id = auth.uid()
         or exists (
           select 1
           from public.requests
           where requests.id = join_requests.request_id
             and requests.created_by = auth.uid()
         )
    ),
    'messages', (
      select coalesce(jsonb_agg(to_jsonb(request_messages) order by created_at desc), '[]'::jsonb)
      from public.request_messages
      where exists (
        select 1
        from public.requests
        where requests.id = request_messages.request_id
          and (requests.created_by = auth.uid() or requests.matched_user_id = auth.uid())
      )
    ),
    'reports', (
      select coalesce(jsonb_agg(to_jsonb(reports) order by created_at desc), '[]'::jsonb)
      from public.reports
      where reporter_id = auth.uid()
    ),
    'blocks', (
      select coalesce(jsonb_agg(to_jsonb(user_blocks) order by created_at desc), '[]'::jsonb)
      from public.user_blocks
      where blocker_id = auth.uid() or blocked_id = auth.uid()
    ),
    'deletionRequests', (
      select coalesce(jsonb_agg(to_jsonb(account_deletion_requests) order by created_at desc), '[]'::jsonb)
      from public.account_deletion_requests
      where user_id = auth.uid()
    )
  );
end;
$$;

create or replace function public.get_admin_dashboard()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_admin(auth.uid()) then
    raise exception 'Admin privileges required';
  end if;

  return jsonb_build_object(
    'overview', jsonb_build_object(
      'usersTotal', (select count(*)::int from public.profiles),
      'openRequests', (select count(*)::int from public.requests where status = 'open'),
      'matchedRequests', (select count(*)::int from public.requests where status = 'matched'),
      'reportsOpen', (select count(*)::int from public.reports where status = 'open'),
      'deletionRequestsOpen', (select count(*)::int from public.account_deletion_requests where status = 'pending')
    ),
    'reports', (
      select coalesce(
        jsonb_agg(
          jsonb_build_object(
            'id', reports.id,
            'requestId', reports.request_id,
            'reason', reports.reason,
            'details', reports.details,
            'status', reports.status,
            'createdAt', reports.created_at,
            'reporterId', reports.reporter_id,
            'targetUserId', reports.target_user_id,
            'reporterDisplayName', reporter.display_name,
            'targetDisplayName', target.display_name
          )
          order by reports.created_at desc
        ),
        '[]'::jsonb
      )
      from public.reports
      left join public.profiles as reporter on reporter.id = reports.reporter_id
      left join public.profiles as target on target.id = reports.target_user_id
    ),
    'deletionRequests', (
      select coalesce(
        jsonb_agg(
          jsonb_build_object(
            'id', account_deletion_requests.id,
            'userId', account_deletion_requests.user_id,
            'reason', account_deletion_requests.reason,
            'status', account_deletion_requests.status,
            'createdAt', account_deletion_requests.created_at,
            'displayName', profiles.display_name
          )
          order by account_deletion_requests.created_at desc
        ),
        '[]'::jsonb
      )
      from public.account_deletion_requests
      join public.profiles on profiles.id = account_deletion_requests.user_id
    )
  );
end;
$$;

create or replace function public.review_join_request(
  join_request_id_input uuid,
  decision_input text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_join public.join_requests%rowtype;
  selected_request public.requests%rowtype;
  owner_name text;
  joiner_name text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select *
  into selected_join
  from public.join_requests
  where id = join_request_id_input
  for update;

  if not found then
    raise exception 'Join request not found.';
  end if;

  select *
  into selected_request
  from public.requests
  where id = selected_join.request_id
  for update;

  if not found then
    raise exception 'Request not found.';
  end if;

  if selected_request.created_by <> auth.uid() and not public.is_admin(auth.uid()) then
    raise exception 'Only the request owner can review applicants.';
  end if;

  if selected_request.status <> 'open' then
    raise exception 'This request is no longer open.';
  end if;

  if decision_input = 'accepted' then
    update public.requests
    set status = 'matched',
        matched_user_id = selected_join.joiner_id,
        updated_at = now(),
        last_activity_at = now()
    where id = selected_request.id;

    update public.join_requests
    set status = case when id = selected_join.id then 'accepted' else 'declined' end,
        updated_at = now()
    where request_id = selected_request.id
      and status = 'pending';

    select display_name into owner_name from public.profiles where id = selected_request.created_by;
    select display_name into joiner_name from public.profiles where id = selected_join.joiner_id;

    insert into public.request_messages (request_id, sender_type, sender_id, sender_name, body)
    values (
      selected_request.id,
      'system',
      null,
      'Tag Along',
      format(
        'Match confirmed between %s and %s. Use this room to align the exact meeting point, ETA, and safety plan.',
        coalesce(owner_name, 'the request owner'),
        coalesce(joiner_name, 'the companion')
      )
    );
  elsif decision_input = 'declined' then
    update public.join_requests
    set status = 'declined',
        updated_at = now()
    where id = selected_join.id;

    update public.requests
    set last_activity_at = now()
    where id = selected_request.id;
  else
    raise exception 'Decision must be accepted or declined.';
  end if;

  return selected_request.id;
end;
$$;

create or replace function public.send_request_message(
  request_id_input uuid,
  body_input text
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  target_request public.requests%rowtype;
  sender_name text;
  message_id bigint;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not public.current_user_verified() then
    raise exception 'Verify your email before messaging.';
  end if;

  select *
  into target_request
  from public.requests
  where id = request_id_input
  for update;

  if not found then
    raise exception 'Request not found.';
  end if;

  if target_request.status <> 'matched' then
    raise exception 'Messaging is only available for matched sessions.';
  end if;

  if target_request.created_by <> auth.uid() and target_request.matched_user_id <> auth.uid() and not public.is_admin(auth.uid()) then
    raise exception 'Only session participants can send messages.';
  end if;

  select display_name into sender_name from public.profiles where id = auth.uid();

  insert into public.request_messages (request_id, sender_type, sender_id, sender_name, body)
  values (
    request_id_input,
    'user',
    auth.uid(),
    coalesce(sender_name, 'Member'),
    trim(body_input)
  )
  returning id into message_id;

  update public.requests
  set last_activity_at = now()
  where id = request_id_input;

  return message_id;
end;
$$;

grant execute on function public.get_public_request_feed(integer) to anon, authenticated;
grant execute on function public.get_workspace_snapshot() to authenticated;
grant execute on function public.create_request(public.request_lane, text, text, text, timestamptz, integer, text[], boolean, boolean) to authenticated;
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

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.request_messages;
    exception
      when duplicate_object then null;
    end;
  end if;
end
$$;
