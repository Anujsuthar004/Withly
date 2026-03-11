-- Fix: explicit enum casts in review_join_request to prevent
-- "column status is of type join_request_status but expression is of type text"

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
    set status = (case when id = selected_join.id then 'accepted' else 'declined' end)::public.join_request_status,
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
    set status = 'declined'::public.join_request_status,
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
