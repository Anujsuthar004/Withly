-- Run only against the disposable test database after all migrations.
begin;
insert into auth.users(id, email, email_confirmed_at, raw_user_meta_data) values
  ('10000000-0000-4000-8000-000000000001', 'host@example.test', now(), '{"display_name":"Host"}'),
  ('10000000-0000-4000-8000-000000000002', 'peer@example.test', now(), '{"display_name":"Peer"}'),
  ('10000000-0000-4000-8000-000000000003', 'outsider@example.test', now(), '{"display_name":"Outsider"}');

set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-4000-8000-000000000001';
set local request.jwt.claims = '{"role":"authenticated"}';

do $$ begin
  update public.profiles set display_name = 'Updated Host' where id = auth.uid();
  assert (select display_name = 'Updated Host' from public.profiles where id = auth.uid()), 'Own profile editing failed';
  assert (select count(*) = 1 from public.profiles), 'Another member profile was exposed';
  begin
    update public.profiles set role = 'admin' where id = auth.uid();
    raise exception 'Role escalation succeeded';
  exception when insufficient_privilege then null; end;
  begin
    update public.profiles set verification_tier = 'id_verified' where id = auth.uid();
    raise exception 'Verification escalation succeeded';
  exception when insufficient_privilege then null; end;
  begin
    update public.profiles set avatar_path = 'someone-else/avatar.png' where id = auth.uid();
    raise exception 'Avatar path tampering succeeded';
  exception when insufficient_privilege then null; end;
  begin
    perform public.upgrade_verification_tier('id_verified', 'fake');
    raise exception 'Self-verification succeeded';
  exception when insufficient_privilege then null; end;
  begin
    perform * from public.app_event_logs;
    raise exception 'Operational logs exposed';
  exception when insufficient_privilege then null; end;
  begin
    perform * from public.rate_limit_events;
    raise exception 'Rate-limit records exposed';
  exception when insufficient_privilege then null; end;
  begin
    perform public.expire_stale_requests();
    raise exception 'Member executed maintenance';
  exception when insufficient_privilege then null; end;
  begin
    perform public.submit_moderation_review('request', 'fake', 'fake content');
    raise exception 'Member submitted moderation';
  exception when raise_exception then
    if sqlerrm <> 'Admin or service-role privileges required' then raise; end if;
  end;
end $$;

select set_config('test.request_id', public.create_request(
  'social', 'A public activity', 'A clear plan in a busy public place.',
  'Central park', now() + interval '1 hour', 5, array['coffee'], true, true,
  now() + interval '6 hours'
)::text, true);

reset role;
do $$ begin
  assert (select expires_at > now() and max_companions = 1 from public.requests where id = current_setting('test.request_id')::uuid), 'Expiry was not persisted';
end $$;

set local role anon;
set local request.jwt.claim.sub = '';
set local request.jwt.claims = '{"role":"anon"}';
do $$ declare item jsonb; begin
  item := public.get_public_request_feed_v2(12)->0;
  assert item is not null, 'Public feed is empty';
  assert item->>'areaLabel' is null and item->>'meetupAt' is null and item->>'hostDisplayName' is null, 'Public feed leaked meetup or identity';
  item := public.get_public_request_detail(current_setting('test.request_id')::uuid);
  assert item->>'areaLabel' is null and item->>'hostDisplayName' is null, 'Public detail leaked private fields';
end $$;

set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-4000-8000-000000000002';
set local request.jwt.claims = '{"role":"authenticated"}';
select set_config('test.join_id', public.submit_join_request(current_setting('test.request_id')::uuid, 'I would like to join')::text, true);
set local request.jwt.claim.sub = '10000000-0000-4000-8000-000000000001';
select public.review_join_request(current_setting('test.join_id')::uuid, 'accepted');
do $$ begin
  assert public.get_request_session(current_setting('test.request_id')::uuid)->>'requestId' = current_setting('test.request_id'), 'Requested session was not returned';
end $$;
select public.send_request_message(current_setting('test.request_id')::uuid, 'Meet at the entrance');
select public.submit_check_in(current_setting('test.request_id')::uuid, 'ok', 'Arrived');
select public.trigger_sos_alert(current_setting('test.request_id')::uuid, 'Test alert');
select public.complete_request_session(current_setting('test.request_id')::uuid, 'completed', true);
set local request.jwt.claim.sub = '10000000-0000-4000-8000-000000000002';
select public.complete_request_session(current_setting('test.request_id')::uuid, 'completed', true);
do $$ begin
  assert jsonb_array_length(public.get_trusted_companions()) = 1, 'Mutual feedback did not create a trusted companion';
  assert (select score > 50 from public.trust_scores where user_id = auth.uid()), 'Trust score did not update';
end $$;

-- Direct RPC writes are limited even when the caller bypasses server actions.
do $$ begin
  for attempt in 1..10 loop
    perform public.create_request('social', 'Rate limit test',
      'A clear plan to verify the database rate limit.', 'Public park', null,
      5, array['test'], true, true, null::timestamptz);
  end loop;
  begin
    perform public.create_request('social', 'Excess request',
      'This write must be rejected by the database.', 'Public park', null,
      5, array['test'], true, true, null::timestamptz);
    raise exception 'Direct RPC bypassed the write limit';
  exception when raise_exception then
    if sqlerrm <> 'Too many attempts. Please try again later.' then raise; end if;
  end;
end $$;

-- An expired request is inaccessible before the scheduler has cancelled it.
reset role;
set local request.jwt.claim.sub = '';
set local request.jwt.claims = '{}';
insert into public.requests(id, created_by, lane, title, description, area_label, expires_at)
values ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001',
  'social', 'Expired request', 'This should no longer accept any new members.', 'Park', now() - interval '1 minute');
set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-4000-8000-000000000002';
set local request.jwt.claims = '{"role":"authenticated"}';
do $$ begin
  assert public.get_public_request_detail('20000000-0000-4000-8000-000000000002') is null, 'Expired request remains visible';
  begin
    perform public.submit_join_request('20000000-0000-4000-8000-000000000002', 'Joining late');
    raise exception 'Expired request accepted a join';
  exception when raise_exception then
    if sqlerrm <> 'This request is no longer open.' then raise; end if;
  end;
end $$;

-- A deleted partner must not allow an unrelated user into the session.
reset role;
update public.requests set status = 'matched', matched_user_id = null where id = current_setting('test.request_id')::uuid;
set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-4000-8000-000000000003';
do $$ begin
  assert public.get_request_session(current_setting('test.request_id')::uuid) is null, 'Session leaked to outsider';
  begin
    perform public.send_request_message(current_setting('test.request_id')::uuid, 'Unauthorized');
    raise exception 'Outsider sent a message';
  exception when raise_exception then
    if sqlerrm <> 'Only session participants can perform this action.' then raise; end if;
  end;
  begin
    perform public.trigger_sos_alert(current_setting('test.request_id')::uuid, 'Unauthorized');
    raise exception 'Outsider triggered SOS';
  exception when raise_exception then
    if sqlerrm <> 'Only session participants can perform this action.' then raise; end if;
  end;
end $$;

reset role;
set local role service_role;
set local request.jwt.claim.sub = '';
set local request.jwt.claims = '{"role":"service_role"}';
do $$ begin
  assert public.consume_rate_limit('test', 'key', 2, 60), 'First attempt blocked';
  assert public.consume_rate_limit('test', 'key', 2, 60), 'Second attempt blocked';
  assert not public.consume_rate_limit('test', 'key', 2, 60), 'Limit failed';
  assert public.consume_rate_limit('another', 'key', 2, 60), 'Actions were not isolated';
end $$;
rollback;
