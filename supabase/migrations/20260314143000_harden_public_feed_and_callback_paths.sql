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
        'id', requests.id,
        'lane', requests.lane,
        'title', requests.title,
        'description', requests.description,
        'areaLabel', null,
        'meetupAt', null,
        'createdAt', requests.created_at,
        'verifiedOnly', requests.verified_only,
        'hostDisplayName', null,
        'hostVerified', exists (
          select 1
          from auth.users
          where auth.users.id = requests.created_by
            and auth.users.email_confirmed_at is not null
        ),
        'tags', requests.tags
      )
      order by requests.created_at desc
    ),
    '[]'::jsonb
  )
  from (
    select requests.*
    from public.requests as requests
    where requests.status = 'open'
      and (
        auth.uid() is null
        or not public.users_are_blocked(auth.uid(), requests.created_by)
      )
    order by requests.created_at desc
    limit greatest(1, least(limit_count, 24))
  ) as requests;
$$;

create or replace function public.get_public_request_detail(request_id_input uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'id', requests.id,
    'lane', requests.lane,
    'title', requests.title,
    'description', requests.description,
    'areaLabel', null,
    'meetupAt', null,
    'createdAt', requests.created_at,
    'verifiedOnly', requests.verified_only,
    'hostDisplayName', null,
    'hostVerified', exists (
      select 1
      from auth.users
      where auth.users.id = requests.created_by
        and auth.users.email_confirmed_at is not null
    ),
    'tags', requests.tags
  )
  from public.requests as requests
  where requests.id = request_id_input
    and requests.status = 'open'
    and (
      auth.uid() is null
      or not public.users_are_blocked(auth.uid(), requests.created_by)
    )
  limit 1;
$$;
