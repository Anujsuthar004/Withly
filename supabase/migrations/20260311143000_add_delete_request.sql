create or replace function public.delete_request(request_id_input uuid)
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
    raise exception 'Request not found.';
  end if;

  if target_request.created_by <> auth.uid() and not public.is_admin(auth.uid()) then
    raise exception 'You do not have permission to delete this request.';
  end if;

  delete from public.requests where id = request_id_input;

  return true;
end;
$$;
