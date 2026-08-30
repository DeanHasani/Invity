import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";

const LG_FONT = "'Luckiest Guy', cursive";

/**
 * Matches the not-found screen in InvitationView, since someone who mistypes an
 * invite link can land on either, and having them look like two different
 * sites was worse than having no design at all.
 */
const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname,
    );
  }, [location.pathname]);

  return (
    <div
      className="min-h-screen w-full flex flex-col items-center justify-center text-center p-8 gap-6"
      style={{ background: "#F05A28", color: "#fff", fontFamily: "'Montserrat', sans-serif" }}
    >
      <img src="/brand/invity-mark-white.svg" alt="" width={56} height={56} />

      <h1 className="text-5xl md:text-6xl uppercase leading-none" style={{ fontFamily: LG_FONT }}>
        404: Not Found
      </h1>

      <p className="text-base md:text-lg opacity-75 max-w-md leading-relaxed">
        This page doesn't exist. If you were opening an invitation, the link may
        have been mistyped, or it may have expired.
      </p>

      <Link
        to="/"
        className="mt-2 px-8 py-3.5 text-sm uppercase tracking-wider bg-white transition-opacity hover:opacity-90"
        style={{ fontFamily: LG_FONT, color: "#F05A28" }}
      >
        Make an Invitation
      </Link>
    </div>
  );
};

export default NotFound;
