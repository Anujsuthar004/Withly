-- Admin RPC: fetch paginated user list with trust score and request counts
create or replace function public.get_admin_users(limit_count integer default 50)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_admin(auth.uid()) then
    raise exception 'Admin privileges required';
  end if;

  return coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'id',               p.id,
          'displayName',      p.display_name,
          'homeArea',         p.home_area,
          'verificationTier', coalesce(p.verification_tier::text, 'email'),
          'role',             p.role,
          'createdAt',        p.created_at,
          'trustScore',       coalesce(ts.score, 50),
          'requestCount',     coalesce(rc.total, 0),
          'openRequestCount', coalesce(rc.open_count, 0)
        )
        order by p.created_at desc
      )
      from public.profiles p
      left join public.trust_scores ts on ts.user_id = p.id
      left join lateral (
        select
          count(*)::int                                          as total,
          count(*) filter (where r.status = 'open')::int        as open_count
        from public.requests r
        where r.created_by = p.id
      ) rc on true
      limit greatest(1, least(limit_count, 200))
    ),
    '[]'::jsonb
  );
end;
$$;
