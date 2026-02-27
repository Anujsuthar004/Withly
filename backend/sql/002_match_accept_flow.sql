alter table requests
  add column if not exists matched_companion_id uuid references companions(id) on delete set null,
  add column if not exists matched_at timestamptz;

alter table requests
  drop constraint if exists requests_status_check;

alter table requests
  add constraint requests_status_check
  check (status in ('open', 'matched', 'closed', 'cancelled'));

create index if not exists idx_requests_matched_companion_id on requests (matched_companion_id);
