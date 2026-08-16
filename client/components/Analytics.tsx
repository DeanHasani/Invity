import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { capturePageview, identifyUser, resetAnalytics } from "@/lib/analytics";

/**
 * Records builder pageviews and ties them to an account once someone signs in.
 *
 * Invitation pages emit nothing — capturePageview ignores untracked paths, and
 * identify is a no-op until analytics has actually started, so a guest who
 * happens to hold a session still doesn't get profiled while viewing a link.
 */
export function Analytics() {
  const { pathname } = useLocation();

  useEffect(() => { capturePageview(pathname); }, [pathname]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const user = session?.user;
      if (event === "SIGNED_OUT") { resetAnalytics(); return; }
      if (user && !user.is_anonymous && user.email) identifyUser(user.id, user.email);
    });
    return () => subscription.unsubscribe();
  }, []);

  return null;
}
