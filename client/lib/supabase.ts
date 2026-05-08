import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string,
);

// Ensure every visitor has at least an anonymous session for PostgREST access.
// Creators replace this with a real Google session when they sign in.
// Skip on the OAuth callback page — a real session is already being set.
supabase.auth.getSession().then(({ data: { session } }) => {
  const isCallback = new URLSearchParams(window.location.search).has("code");
  if (!session && !isCallback) supabase.auth.signInAnonymously();
});

export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
      skipBrowserRedirect: true,
    },
  });
  if (error) throw error;
  if (data?.url) {
    const popup = window.open(data.url, "google-oauth", "width=520,height=650,left=200,top=100");
    // If popup blocked by browser, fall back to redirect
    if (!popup) window.location.href = data.url;
  }
}

export async function signOut() {
  await supabase.auth.signOut();
}
