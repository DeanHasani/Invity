-- 0003_rls_lockdown.sql  (BREAKING — apply only after the SPA deploy that routes
-- invitation creation and RSVPs through edge functions is live on invity.cards)
--
-- Revokes all direct client writes. From here on:
--   * invitations are created only by the create-invitation edge function (service role)
--   * rsvps are inserted only by the notify-rsvp edge function (service role)
--   * guests read invitations only through the invitation_public view
--   * hosts read their own invitations + rsvps (guest-list page)

-- Drop every existing policy on the three tables (names were dashboard-managed)
do $$
declare p record;
begin
  for p in
    select policyname, tablename from pg_policies
    where schemaname = 'public'
      and tablename in ('invitations','creation_log','rsvps')
  loop
    execute format('drop policy %I on public.%I', p.policyname, p.tablename);
  end loop;
end $$;

alter table public.invitations  enable row level security;
alter table public.creation_log enable row level security;
alter table public.rsvps        enable row level security;

-- Hosts read their own invitations (guest-list page). Anonymous sessions have
-- no email claim, so they match nothing. Guests use invitation_public instead.
create policy "owner reads own invitations" on public.invitations
  for select to authenticated
  using (user_email = (auth.jwt() ->> 'email'));

-- Hosts read RSVPs of their own invitations. No client INSERT (notify-rsvp only).
create policy "host reads rsvps of own invitations" on public.rsvps
  for select to authenticated
  using (exists (
    select 1 from public.invitations i
    where i.id = rsvps.invitation_id
      and i.user_email = (auth.jwt() ->> 'email')
  ));

-- creation_log: RLS enabled with zero policies — service-role only. Intentional.
