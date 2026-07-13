-- 0002_grants_fix.sql — run right after 0002_billing.sql.
-- Tables created via the SQL editor in this project don't inherit the usual
-- role grants (discovered when paddle-webhook got 42501 "permission denied
-- for table subscriptions"). Grant explicitly:

grant all    on table public.subscriptions to service_role;  -- paddle-webhook, create-invitation, delete-account
grant select on table public.subscriptions to authenticated; -- useSubscription hook (RLS still restricts to own row)
