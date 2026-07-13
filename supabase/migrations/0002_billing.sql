-- 0002_billing.sql  (non-breaking — safe to apply while the current app is live)
-- Adds the Paddle subscription state table, hardens rsvps, and creates the
-- guest-safe read view that stops leaking host emails to invitation viewers.

-- ── Subscriptions ─────────────────────────────────────────────────────────────
create table public.subscriptions (
  user_id                uuid primary key references auth.users(id) on delete cascade,
  user_email             text not null,
  paddle_subscription_id text not null unique,
  paddle_customer_id     text not null,
  status                 text not null check (status in ('active','trialing','past_due','paused','canceled')),
  price_id               text,
  billing_cycle          text check (billing_cycle in ('month','year')),
  current_period_end     timestamptz,
  scheduled_change       jsonb,          -- Paddle scheduled_change object (cancel/pause + effective_at)
  last_event_at          timestamptz,    -- occurred_at of last applied webhook event (out-of-order guard)
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

-- Users may read their own subscription row; only the service role (the
-- paddle-webhook edge function) ever writes.
create policy "user reads own subscription" on public.subscriptions
  for select to authenticated
  using (user_id = auth.uid());

create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger subscriptions_touch before update on public.subscriptions
  for each row execute function public.touch_updated_at();

-- ── rsvps hardening ───────────────────────────────────────────────────────────
alter table public.rsvps add column if not exists created_at timestamptz not null default now();
alter table public.rsvps add column if not exists viewer_token text;

-- Orphans from past account deletions must go before the FK lands
delete from public.rsvps r
  where not exists (select 1 from public.invitations i where i.id = r.invitation_id);

alter table public.rsvps
  add constraint rsvps_invitation_fk
  foreign key (invitation_id) references public.invitations(id) on delete cascade;

-- One RSVP per device per invitation (legacy rows with NULL token are exempt)
create unique index if not exists rsvps_dedupe
  on public.rsvps (invitation_id, viewer_token) where viewer_token is not null;

-- ── Guest-safe read surface ───────────────────────────────────────────────────
-- Security-definer view (owner = postgres, bypasses base-table RLS). Exposes
-- ONLY guest-safe columns — guests must never see user_email / creator_id.
create or replace view public.invitation_public as
  select id, title, message, design_id, effect_id, font_id, font_color,
         date, location, expires_at
  from public.invitations;

grant select on public.invitation_public to anon, authenticated;

-- ── Indexes for rate-limit counts and guest-list queries ──────────────────────
create index if not exists invitations_email_created   on public.invitations  (user_email, created_at desc);
create index if not exists creation_log_email_created   on public.creation_log (user_email, created_at desc);
create index if not exists creation_log_creator_created on public.creation_log (creator_id, created_at desc);
create index if not exists rsvps_invitation             on public.rsvps        (invitation_id);
