import "./global.css";

import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import InvitationView from "./pages/InvitationView";
import AuthCallback from "./pages/AuthCallback";
import NotFound from "./pages/NotFound";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import RefundPolicy from "./pages/RefundPolicy";
import Pricing from "./pages/Pricing";
import AboutUs from "./pages/AboutUs";
import Guests from "./pages/Guests";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { RouteMeta } from "./components/RouteMeta";
import { Analytics } from "./components/Analytics";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <RouteMeta />
        <Analytics />
        <ErrorBoundary>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/refunds" element={<RefundPolicy />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/about" element={<AboutUs />} />
          <Route path="/guests" element={<Guests />} />
          <Route path="/:id" element={<InvitationView />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        </ErrorBoundary>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

createRoot(document.getElementById("root")!).render(<App />);
