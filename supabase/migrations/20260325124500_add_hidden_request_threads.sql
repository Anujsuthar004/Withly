create table if not exists public.hidden_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  request_id uuid not null references public.requests(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, request_id)
);

create index if not exists idx_hidden_requests_user on public.hidden_requests (user_id, created_at desc);
create index if not exists idx_hidden_requests_request on public.hidden_requests (request_id, user_id);

alter table public.hidden_requests enable row level security;
alter table public.hidden_requests force row level security;

create or replace function public.hide_request_thread(request_id_input uuid)
returns boolean
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
    raise exception 'Chat not found.';
  end if;

  if target_request.status not in ('matched', 'completed', 'cancelled') then
    raise exception 'Only current or past chats can be deleted.';
  end if;

  if target_request.created_by <> auth.uid()
     and target_request.matched_user_id <> auth.uid()
     and not public.is_admin(auth.uid()) then
    raise exception 'Only chat participants can delete this conversation.';
  end if;

  insert into public.hidden_requests (user_id, request_id)
  values (auth.uid(), request_id_input)
  on conflict (user_id, request_id) do nothing;

  return true;
end;
$$;

grant execute on function public.hide_request_thread(uuid) to authenticated;

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
    where (requests.created_by = auth.uid() or requests.matched_user_id = auth.uid())
      and not exists (
        select 1
        from public.hidden_requests
        where hidden_requests.user_id = auth.uid()
          and hidden_requests.request_id = requests.id
      )
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
      and not exists (
        select 1
        from public.hidden_requests
        where hidden_requests.user_id = auth.uid()
          and hidden_requests.request_id = requests.id
      )
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

grant execute on function public.get_workspace_snapshot() to authenticated;

select pg_notify('pgrst', 'reload schema');
