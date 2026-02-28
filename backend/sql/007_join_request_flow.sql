alter table requests
  add column if not exists description text not null default '';

create table if not exists request_join_requests (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references requests(id) on delete cascade,
  joiner_user_id uuid not null references users(id) on delete cascade,
  intro_message text not null default '',
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint request_join_requests_status_check check (status in ('pending', 'accepted', 'declined', 'cancelled')),
  constraint request_join_requests_unique_joiner unique (request_id, joiner_user_id)
);

create index if not exists idx_request_join_requests_request_status
  on request_join_requests (request_id, status, created_at desc);

create index if not exists idx_request_join_requests_joiner_status
  on request_join_requests (joiner_user_id, status, created_at desc);
