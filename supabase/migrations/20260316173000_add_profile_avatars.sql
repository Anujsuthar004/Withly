alter table public.profiles
add column if not exists avatar_path text
check (avatar_path is null or char_length(avatar_path) <= 255);

insert into storage.buckets (id, name, public)
values ('profile-avatars', 'profile-avatars', false)
on conflict (id) do update
set public = excluded.public;
