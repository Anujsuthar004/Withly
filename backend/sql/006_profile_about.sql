alter table users
  add column if not exists about_me text not null default '';
