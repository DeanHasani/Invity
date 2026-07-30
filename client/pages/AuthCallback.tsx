import { useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function AuthCallback() {
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        subscription.unsubscribe();
        if (window.opener) {
          window.opener.postMessage(
            { type: "INVITY_AUTH_DONE", email: session.user.email ?? "" },
            window.location.origin,
          );
          setTimeout(() => window.close(), 150);
        } else {
          window.location.replace("/");
        }
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  return (
    <div
      style={{
        background: "#F05A28",
        color: "#fff",
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Luckiest Guy', cursive",
        fontSize: "2rem",
        letterSpacing: "0.05em",
      }}
    >
      SIGNING IN...
    </div>
  );
}
