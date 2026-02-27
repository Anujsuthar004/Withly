alter table users
  add column if not exists email_verified boolean not null default false,
  add column if not exists email_verified_at timestamptz;

update users
set email_verified = true,
    email_verified_at = coalesce(email_verified_at, now())
where email_verified = false;

create table if not exists email_verification_codes (
  id bigserial primary key,
  user_id uuid not null references users(id) on delete cascade,
  code text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists password_reset_codes (
  id bigserial primary key,
  user_id uuid not null references users(id) on delete cascade,
  code text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists request_messages (
  id bigserial primary key,
  request_id uuid not null references requests(id) on delete cascade,
  sender_type text not null,
  sender_user_id uuid references users(id) on delete set null,
  sender_name text not null,
  content text not null,
  created_at timestamptz not null default now(),
  constraint request_messages_sender_type_check check (sender_type in ('user', 'companion', 'system'))
);

create index if not exists idx_email_verification_codes_user_id_created_at
  on email_verification_codes (user_id, created_at desc);

create index if not exists idx_password_reset_codes_user_id_created_at
  on password_reset_codes (user_id, created_at desc);

create index if not exists idx_request_messages_request_id_created_at
  on request_messages (request_id, created_at asc);
