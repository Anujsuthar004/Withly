-- Disposable database only. All fixture changes are rolled back.
begin;
insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values
('30000000-0000-4000-8000-000000000001','host@example.test',now(),'{"display_name":"Host"}'),
('30000000-0000-4000-8000-000000000002','peer@example.test',now(),'{"display_name":"Peer"}'),
('30000000-0000-4000-8000-000000000003','other@example.test',now(),'{"display_name":"Other"}');
insert into public.requests(id,created_by,matched_user_id,lane,title,description,area_label,status) values
('40000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000002','social','Coffee session','A clear plan for a public cafe session.','Cafe','matched'),
('40000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000003','social','Study session','A clear plan for a public study session.','Library','matched');
set local role authenticated;
set local request.jwt.claims = '{"role":"authenticated"}';
set local request.jwt.claim.sub = '30000000-0000-4000-8000-000000000002';
select public.send_request_message('40000000-0000-4000-8000-000000000001','Message before blocking');
set local request.jwt.claim.sub = '30000000-0000-4000-8000-000000000001';
select public.block_user('30000000-0000-4000-8000-000000000002');
reset role;
do $$ begin
  assert (select status = 'cancelled' from public.requests where id = '40000000-0000-4000-8000-000000000001'), 'Block did not end session';
  assert (select status = 'matched' from public.requests where id = '40000000-0000-4000-8000-000000000002'), 'Unrelated session was ended';
end $$;
set local role authenticated;
set local request.jwt.claim.sub = '30000000-0000-4000-8000-000000000002';
do $$ begin
  begin
    perform public.send_request_message('40000000-0000-4000-8000-000000000001','Must not arrive');
    raise exception 'Blocked message succeeded';
  exception when raise_exception then
    if sqlerrm <> 'Messaging is only available for matched sessions.' then raise; end if;
  end;
  begin
    perform public.trigger_sos_alert('40000000-0000-4000-8000-000000000001','Must not notify');
    raise exception 'Blocked SOS succeeded';
  exception when raise_exception then
    if sqlerrm <> 'SOS is only available during active sessions.' then raise; end if;
  end;
end $$;
-- Report-and-block must go through the same DB protections.
set local request.jwt.claim.sub = '30000000-0000-4000-8000-000000000001';
select public.create_report('40000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000003','Harassment','Fixture report',true);
reset role;
do $$ begin
  assert (select status = 'cancelled' from public.requests where id = '40000000-0000-4000-8000-000000000002'), 'Report-and-block did not end session';
end $$;
reset role;
-- Hard deletion cascades profile data and redacts surviving messages.
delete from auth.users where id = '30000000-0000-4000-8000-000000000002';
do $$ begin
  assert not exists(select 1 from public.profiles where id = '30000000-0000-4000-8000-000000000002'), 'Deleted profile survived';
  assert exists(select 1 from public.request_messages where request_id = '40000000-0000-4000-8000-000000000001' and sender_type = 'user' and sender_id is null and sender_name = 'Deleted member' and body = '[Message removed following account deletion]'), 'Deleted member message was not redacted';
end $$;
rollback;
