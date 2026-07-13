# Database migrations

The live schema was originally created by hand in the Supabase dashboard — these
files bring it under version control going forward.

**How to apply:** open the Supabase dashboard → SQL Editor → paste the file →
Run. Apply files in numeric order, once each. Record what you've applied here:

| File | Applied |
|---|---|
| 0001_baseline.sql | (no-op — documents pre-existing tables) |
| 0002_billing.sql | ☐ |
| 0003_rls_lockdown.sql | ☐ **breaking — apply only after the SPA deploy that routes creation/RSVP through edge functions is live** |

`0001` uses `IF NOT EXISTS` throughout, so it does nothing on the production
database; it exists so a fresh environment can be bootstrapped and so the schema
is documented in-repo. Before trusting it, spot-check column types against the
dashboard.
