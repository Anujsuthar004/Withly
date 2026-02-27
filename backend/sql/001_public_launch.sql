create extension if not exists pgcrypto;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  password_hash text not null,
  display_name text not null,
  role text not null default 'member',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint users_role_check check (role in ('member', 'admin'))
);

create table if not exists companions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  supports text[] not null,
  tags text[] not null,
  distance_km integer not null,
  reliability integer not null,
  verified boolean not null default false,
  completed integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint companions_distance_check check (distance_km >= 0),
  constraint companions_reliability_check check (reliability between 0 and 100)
);

create table if not exists requests (
  id uuid primary key default gen_random_uuid(),
  mode text not null,
  title text not null,
  category text not null,
  time timestamptz not null,
  location text not null,
  radius_km integer not null,
  tags text[] not null,
  verified_only boolean not null default true,
  check_in boolean not null default true,
  status text not null default 'open',
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint requests_mode_check check (mode in ('social', 'errand')),
  constraint requests_status_check check (status in ('open', 'closed', 'cancelled')),
  constraint requests_radius_check check (radius_km between 1 and 30)
);

create table if not exists request_events (
  id bigserial primary key,
  type text not null,
  request_id uuid references requests(id) on delete cascade,
  companion_id uuid references companions(id) on delete set null,
  actor_user_id uuid references users(id) on delete set null,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create table if not exists reports (
  id bigserial primary key,
  reporter_user_id uuid not null references users(id) on delete cascade,
  request_id uuid references requests(id) on delete set null,
  companion_id uuid references companions(id) on delete set null,
  reason text not null,
  details text,
  status text not null default 'open',
  resolution_note text,
  resolved_by_user_id uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reports_status_check check (status in ('open', 'reviewing', 'resolved', 'dismissed'))
);

create index if not exists idx_requests_mode_status_created_at on requests (mode, status, created_at desc);
create index if not exists idx_reports_status_created_at on reports (status, created_at desc);
create index if not exists idx_request_events_request_id_created_at on request_events (request_id, created_at desc);

insert into companions (id, name, supports, tags, distance_km, reliability, verified, completed)
values
  ('00000000-0000-0000-0000-0000000000c1', 'Rhea', array['social'], array['music', 'food', 'photos', 'chill'], 4, 93, true, 48),
  ('00000000-0000-0000-0000-0000000000c2', 'Karan', array['social', 'errand'], array['city-walk', 'paperwork', 'quick', 'calm'], 6, 89, true, 61),
  ('00000000-0000-0000-0000-0000000000c3', 'Ishita', array['errand'], array['hospital', 'calm', 'support', 'travel'], 3, 96, true, 73),
  ('00000000-0000-0000-0000-0000000000c4', 'Aman', array['social'], array['party', 'sports', 'food'], 9, 80, false, 21),
  ('00000000-0000-0000-0000-0000000000c5', 'Neha', array['social', 'errand'], array['explore', 'shopping', 'travel', 'new-friends'], 5, 91, true, 57),
  ('00000000-0000-0000-0000-0000000000c6', 'Dev', array['errand'], array['travel', 'paperwork', 'support', 'shopping'], 7, 88, true, 39)
on conflict (id) do update set
  name = excluded.name,
  supports = excluded.supports,
  tags = excluded.tags,
  distance_km = excluded.distance_km,
  reliability = excluded.reliability,
  verified = excluded.verified,
  completed = excluded.completed,
  updated_at = now();
