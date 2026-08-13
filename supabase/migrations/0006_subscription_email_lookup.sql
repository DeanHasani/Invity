-- 0006_subscription_email_lookup.sql  (non-breaking — safe to apply while live)
--
-- Email sign-in means one person can end up behind more than one auth.users
-- row for the same address (Google identity + email identity), depending on
-- whether Supabase links them. Everything else in this schema already keys
-- ownership off the verified JWT email — invitations.user_email, creation_log,
-- and the RLS policy in 0003 — but subscriptions was keyed on user_id alone.
--
-- The failure that caused: buy Pro with Google, sign in later with an email
-- code, land on a different user_id, and Pro silently disappears while you are
-- still being billed. This adds the email read path so the entitlement follows
-- the address, matching how the rest of the app already resolves ownership.
--
-- The existing user_id policy stays — this is additive, not a replacement.
-- Writes remain service-role only (the paddle-webhook edge function).

create policy "user reads own subscription by email" on public.subscriptions
  for select to authenticated
  using (user_email = (auth.jwt() ->> 'email'));

-- The lookup is now by email, so it needs its own index.
create index if not exists subscriptions_email on public.subscriptions (user_email);
