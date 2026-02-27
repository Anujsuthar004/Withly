alter table requests
  add column if not exists matched_user_id uuid references users(id) on delete set null;

create index if not exists idx_requests_matched_user_id
  on requests (matched_user_id);
