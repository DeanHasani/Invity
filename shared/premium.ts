// Client-side mirror of the plan rules. The real definitions live next to the
// edge functions (the enforcing side) — this file only re-exports them so the
// builder UI and the pricing page can't drift from what the server enforces.
export * from "../supabase/functions/_shared/premium.ts";
