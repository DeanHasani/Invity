-- 0005_retention_and_stats.sql  (safe to apply any time — no downtime, re-runnable)
--
-- Problem: nothing is ever deleted. `invitations` grows forever even though a
-- link is dead after `expires_at`, and `creation_log` grows one row per creation
-- while being COUNTed on every creation for rate limiting — the one part of the
-- system that gets slower the more it's used.
--
-- Fix: a nightly job that rolls the day's numbers into `daily_stats` and then
-- deletes the rows it just counted. Stats survive, rows don't.

-- ── 1. Record the plan at creation time ─────────────────────────────────────
-- Needed for an accurate free/pro split: joining to `subscriptions` later would
-- report today's plan, not the plan the invitation was created under.
alter table public.creation_log
  add column if not exists was_pro boolean not null default false;

-- ── 2. Rollup table ─────────────────────────────────────────────────────────
create table if not exists public.daily_stats (
  day                 date primary key,
  invitations_created integer not null default 0,
  free_count          integer not null default 0,
  pro_count           integer not null default 0,
  rsvps_received      integer not null default 0,
  rolled_up_at        timestamptz not null default now()
);

-- Owner-only: this is business data, never exposed to the app's users.
alter table public.daily_stats enable row level security;
revoke all on public.daily_stats from anon, authenticated;

comment on table public.daily_stats is
  'Daily rollup written by cleanup_expired_data() before it deletes the source rows.';

-- ── 3. The job ──────────────────────────────────────────────────────────────
create or replace function public.cleanup_expired_data()
returns table (
  stats_day        date,
  invitations_gone integer,
  rsvps_gone       integer,
  log_rows_gone    integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_day        date := (now() at time zone 'utc')::date - 1;
  v_inv_gone   integer := 0;
  v_rsvp_gone  integer := 0;
  v_log_gone   integer := 0;
begin
  -- 3a. Roll up yesterday BEFORE deleting anything. Idempotent: re-running the
  -- job on the same day overwrites the row rather than double counting.
  insert into public.daily_stats (day, invitations_created, free_count, pro_count, rsvps_received)
  select
    v_day,
    count(*) filter (where true),
    count(*) filter (where not was_pro),
    count(*) filter (where was_pro),
    coalesce((
      select count(*) from public.rsvps r
      where (r.created_at at time zone 'utc')::date = v_day
    ), 0)
  from public.creation_log c
  where (c.created_at at time zone 'utc')::date = v_day
  on conflict (day) do update set
    invitations_created = excluded.invitations_created,
    free_count          = excluded.free_count,
    pro_count           = excluded.pro_count,
    rsvps_received      = excluded.rsvps_received,
    rolled_up_at        = now();

  -- 3b. RSVPs first — there is no FK from rsvps to invitations, so nothing
  -- cascades. Deleting invitations first would strand these rows permanently.
  with dead as (
    select id from public.invitations
    where expires_at < now() - interval '48 hours'
  )
  delete from public.rsvps r using dead d where r.invitation_id = d.id;
  get diagnostics v_rsvp_gone = row_count;

  -- 3c. Expired invitations, with 48h grace: an expired-but-present row still
  -- renders the "THIS ONE'S GONE" page. Deleting immediately would give guests
  -- a hard 404 the moment their link lapsed.
  delete from public.invitations where expires_at < now() - interval '48 hours';
  get diagnostics v_inv_gone = row_count;

  -- 3d. Rate limiting only ever queries today. Three days is margin for
  -- timezones and clock skew.
  delete from public.creation_log where created_at < now() - interval '3 days';
  get diagnostics v_log_gone = row_count;

  return query select v_day, v_inv_gone, v_rsvp_gone, v_log_gone;
end;
$$;

revoke all on function public.cleanup_expired_data() from anon, authenticated;

-- ── 4. Schedule it ──────────────────────────────────────────────────────────
create extension if not exists pg_cron;

-- Re-runnable: unschedule any previous copy before scheduling.
do $$
begin
  perform cron.unschedule('invity-nightly-cleanup');
exception when others then
  null; -- not scheduled yet
end $$;

select cron.schedule(
  'invity-nightly-cleanup',
  '17 3 * * *',                       -- 03:17 UTC, off the top of the hour
  $$select public.cleanup_expired_data()$$
);

-- ── Verify ──────────────────────────────────────────────────────────────────
-- Run the job by hand once to confirm it works and to seed yesterday's row:
--   select * from public.cleanup_expired_data();
-- Check it's scheduled:
--   select jobname, schedule, active from cron.job where jobname = 'invity-nightly-cleanup';
-- Read your numbers any time:
--   select * from public.daily_stats order by day desc limit 30;
