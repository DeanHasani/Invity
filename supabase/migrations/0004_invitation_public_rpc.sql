-- 0004_invitation_public_rpc.sql  (safe to apply any time — no downtime)
--
-- Replaces the invitation_public VIEW with an ID-scoped FUNCTION.
--
-- Problem: a plain view granted to anon/authenticated has no row restriction,
-- so anyone could call the REST API without a WHERE filter and list every
-- invitation's title/message/date/location in bulk (not just the one they
-- were sent a link for). Supabase flags this as "Unrestricted".
--
-- Fix: a function that requires the exact id and returns at most one row
-- can't be "listed" — there is no way to call it without already knowing a
-- specific invitation id, so bulk enumeration becomes impossible while a
-- guest with a real link still gets exactly the same data as before.

revoke select on public.invitation_public from anon, authenticated;
drop view if exists public.invitation_public;

create or replace function public.get_invitation_public(p_id text)
returns table (
  id          text,
  title       text,
  message     text,
  design_id   text,
  effect_id   text,
  font_id     text,
  font_color  text,
  date        text,
  location    text,
  expires_at  timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select id, title, message, design_id, effect_id, font_id, font_color, date, location, expires_at
  from public.invitations
  where id = p_id
  limit 1;
$$;

revoke execute on function public.get_invitation_public(text) from public;
grant execute on function public.get_invitation_public(text) to anon, authenticated;
