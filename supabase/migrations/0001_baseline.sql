-- 0001_baseline.sql
-- Codifies the tables that already exist in the Supabase dashboard.
-- IF NOT EXISTS makes this a no-op in production; it exists so the schema is
-- version-controlled and a fresh environment can be bootstrapped.
-- Verify column types against the dashboard before relying on this file.

create table if not exists public.invitations (
  id              text primary key,                -- nanoid(10), client/edge generated
  title           text not null,
  message         text not null,
  design_id       text not null,
  effect_id       text not null,
  font_id         text,
  font_color      text,
  date            text,
  location        text,
  creator_id      text,                            -- anonymous device id (localStorage)
  user_email      text,                            -- host's Google email
  expires_at      timestamptz not null,
  created_at      timestamptz not null default now(),
  accepted_tokens text[] default '{}'              -- legacy, pre-RSVP flow
);

create table if not exists public.creation_log (
  id         bigint generated always as identity primary key,
  user_email text,
  creator_id text,
  created_at timestamptz not null default now()
);

create table if not exists public.rsvps (
  id            bigint generated always as identity primary key,
  invitation_id text not null,
  name          text not null,
  status        text not null check (status in ('accepted','declined')),
  created_at    timestamptz not null default now()
);
