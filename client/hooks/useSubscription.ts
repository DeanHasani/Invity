import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { isProStatus } from "@shared/premium";
import type { Subscription } from "@shared/api";

/**
 * The signed-in user's subscription state, kept fresh across auth changes.
 * Guests and anonymous sessions always resolve to the free plan.
 * NOTE: this is UI state only — real enforcement lives in the
 * create-invitation edge function and RLS.
 */
export function useSubscription() {
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);

  useEffect(() => {
    const resolve = (session: { user?: any } | null) => {
      const u = session?.user;
      setUser(u && !u.is_anonymous && u.email ? { id: u.id, email: u.email } : null);
    };
    supabase.auth.getSession().then(({ data: { session } }) => resolve(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => resolve(session));
    return () => subscription.unsubscribe();
  }, []);

  const query = useQuery({
    queryKey: ["subscription", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return (data as Subscription | null) ?? null;
    },
  });

  const sub = query.data ?? null;
  const isPro = isProStatus(sub?.status);

  return {
    user,
    subscription: sub,
    plan: (isPro ? "pro" : "free") as "pro" | "free",
    isPro,
    status: sub?.status ?? null,
    currentPeriodEnd: sub?.current_period_end ?? null,
    cancelScheduled: !!sub?.scheduled_change,
    isLoading: !!user && query.isLoading,
    refetch: query.refetch,
  };
}

/**
 * After checkout.completed, waits for the webhook-written subscription row.
 * Resolves true once Pro is active; false after ~60s without it (payment is
 * still fine — the webhook is just slow; UI should say "activating shortly").
 */
export async function awaitProActivation(
  refetch: () => Promise<{ data?: Subscription | null | undefined }>,
): Promise<boolean> {
  for (let i = 0; i < 30; i++) {
    try {
      const { data } = await refetch();
      if (isProStatus(data?.status)) return true;
    } catch { /* transient — keep polling */ }
    await new Promise((r) => setTimeout(r, 2000));
  }
  return false;
}
