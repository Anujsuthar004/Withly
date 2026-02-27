create table if not exists social_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  text text not null,
  tags text[] not null default '{}',
  visibility text not null default 'public',
  helpful_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint social_posts_visibility_check check (visibility in ('public', 'verified-only'))
);

create index if not exists idx_social_posts_created_at
  on social_posts (created_at desc);

create index if not exists idx_social_posts_user_id_created_at
  on social_posts (user_id, created_at desc);
