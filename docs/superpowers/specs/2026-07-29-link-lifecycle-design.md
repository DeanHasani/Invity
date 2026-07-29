# Link lifecycle, data retention, and contrast — design

**Date:** 2026-07-29
**Status:** approved

Six changes, grouped. Nothing touches Paddle — prices, products, webhooks and the
client token are unchanged. The expiry picker is entirely app-side.

## 1. Data lifecycle

Rows are never deleted today. `invitations` grows forever, and `creation_log`
grows one row per creation while being queried on every creation for rate
limiting — the only part of the system that degrades with success.

New `daily_stats` table preserves the numbers the owner cares about without
keeping the rows:

| column | meaning |
|---|---|
| `day` (PK) | UTC date |
| `invitations_created` | total that day |
| `free_count` / `pro_count` | split by plan at creation time |
| `rsvps_received` | RSVPs recorded that day |

Nightly `pg_cron` job, ~03:00 UTC, in this order:

1. Roll the previous day's counts into `daily_stats` (idempotent upsert)
2. Delete `invitations` where `expires_at < now() - interval '48 hours'` — RSVPs
   cascade
3. Delete `creation_log` older than 3 days

**48-hour grace, not immediate:** an expired-but-present row renders the
"THIS ONE'S GONE" page. Deleting it gives guests a hard 404 instead. Two days
keeps the friendly message for anyone opening a link shortly after it lapsed.

**`creation_log` at 3 days:** rate limiting only ever queries today. Three days
is margin for timezones and clock skew.

Migrations are applied by the owner pasting SQL into the Supabase dashboard, so
the migration must be self-contained and safe to re-run.

## 2. Expiry model

`EXPIRY_OPTIONS` in `supabase/functions/_shared/premium.ts` becomes the single
source of truth, re-exported to the client via `shared/premium.ts`.

| Option | Free | Pro |
|---|---|---|
| 5 hours | default, locked | available |
| 10 hours | — | available |
| 24 hours | — | available |
| 7 days | — | available |
| 30 days | — | **default** |

Free drops from 8h to 5h. Pro keeps 30 days as its default and maximum, so the
advertised "30-day links" claim stays true — that claim appears in 18 files
including `terms.html` and `privacy.html` and the Paddle product description.

`create-invitation` re-validates the requested expiry against `EXPIRY_OPTIONS`
and forces 5h for non-Pro regardless of what the client sends. The dropdown is
UI; the edge function is enforcement.

## 3. Builder dropdown

Sits under date/location in step 1. Free users see it disabled at 5 hours with
the hint "Choose how long your link lasts with Pro." Reuses the existing
Pro-locked affordance rather than blocking the interaction.

## 4. Link management

`/guests` already lists each invitation with `expires_at` and `created_at`, so
this extends that page rather than adding one:

- live countdown per link
- Delete button with confirmation — hard delete, cascades RSVPs, kills the link
  immediately

Also fixes a live bug: `client/pages/Guests.tsx` carries its own `THEME_COLORS`
copy with no `black` entry, so `/guests` renders orange on the black theme.
Folded into the shared `client/lib/theme.ts`.

## 5. Error boundary

A themed `ErrorBoundary` wraps the routes in `App.tsx`. A render crash currently
produces a blank white page. Matters most on `InvitationView`: that's a guest who
was sent a link and would otherwise conclude the invitation is broken.

## 6. Preview panel contrast

The current rule flips the step 3/4 preview panel to a light backdrop whenever
the chosen font colour has luminance < 0.35. That fires on every theme, which is
wrong — but gating on `theme === "black"` would also be wrong. Measured contrast
of `#1a1a1a` text against the composited `bg-white/5` panel:

| theme | contrast | needs flip |
|---|---|---|
| orange | 5.42:1 | no |
| sky | 4.57:1 | no |
| teal | 7.32:1 | no |
| warmgray | 3.75:1 | **yes** |
| black | 1.04:1 | **yes** |

**Contrast-ratio gating was tried and rejected.** Measured across all 14 swatches
× 5 themes, it fired on every theme at every sensible threshold (4.5, 3.0, 2.5,
2.0) — mid-tone swatches like gold, magenta and rose score below all of them
against mid-tone panels too, so the panel strobed while clicking through
colours. It also over-reaches conceptually: the invitation renders on the step-2
*design* background, not the theme background, so the panel was never simulating
final contrast — it just shows the colour choice.

Final rule: flip only when **both** the panel and the chosen title colour are
near-black (relative luminance < 0.05). Verified across all 70 combinations —
orange/sky/teal/warmgray flip for 0 of 14 swatches (behaviour unchanged from
before this feature existed), black flips for `#1a1a1a` alone. No explanatory
modal needed.

## 7. Copy sweep

`FREE_EXPIRY_MS` → 5h, then every "8 hours" claim updated across the static
pages, React pages, terms, privacy, and the 7 SEO landing pages. Sitemap
`lastmod` bumped. No URL, canonical, or schema changes, so no reindexing risk —
only the homepage is currently indexed.
