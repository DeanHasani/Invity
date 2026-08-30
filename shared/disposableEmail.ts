// Client-side mirror of the throwaway-inbox blocklist. The real definitions
// live next to the edge functions (the enforcing side), and this file only
// re-exports them so the sign-in UI can't drift from what the server enforces.
export * from "../supabase/functions/_shared/disposableEmail.ts";
