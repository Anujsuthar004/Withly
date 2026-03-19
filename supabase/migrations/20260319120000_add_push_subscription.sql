-- Add push_subscription column to profiles for web push notifications.
-- Stores the full PushSubscription JSON from the browser (endpoint + keys).
-- Only readable/writable by the owning user via the API route.

alter table public.profiles
  add column if not exists push_subscription jsonb;
