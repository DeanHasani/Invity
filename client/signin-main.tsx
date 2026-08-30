// Entry for the standalone /signin page (second Vite input alongside index.html).
// Deliberately minimal: no router, no react-query, no toaster. SignInPanel
// needs none of them, and keeping this lean means the page loads far faster
// than pulling in the whole app bundle just to show two fields.
import "./global.css";

import { createRoot } from "react-dom/client";
import SignIn from "./pages/SignIn";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { capturePageview } from "./lib/analytics";

// This entry has no router, so the one pageview is recorded directly.
capturePageview("/signin");

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <SignIn />
  </ErrorBoundary>,
);
