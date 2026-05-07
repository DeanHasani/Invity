import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string,
);

// New Supabase projects require an active auth session for PostgREST access.
// Sign in anonymously on first visit so all data requests have a valid token.
supabase.auth.getSession().then(({ data: { session } }) => {
  if (!session) supabase.auth.signInAnonymously();
});
