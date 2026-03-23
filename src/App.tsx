import { lazy, Suspense, useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import IndexV2 from "./pages/IndexV2";
import InstallBanner from "./components/pwa/InstallBanner";
import ErrorBoundary from "./components/ErrorBoundary";
import { BugReportPromptProvider } from "./hooks/useBugReportPrompt";
import { supabase } from "@/integrations/supabase/client";

const Auth = lazy(() => import("./pages/Auth"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Demo = lazy(() => import("./pages/Demo"));
const Install = lazy(() => import("./pages/Install"));
const Admin = lazy(() => import("./pages/Admin"));
const NotFound = lazy(() => import("./pages/NotFound"));
const SpotifyCallback = lazy(() => import("./pages/SpotifyCallback"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const PwaSplash = lazy(() => import("./pages/PwaSplash"));
const PwaAuth = lazy(() => import("./pages/PwaAuth"));

const queryClient = new QueryClient();

const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  (navigator as any).standalone === true;

/** Wrapper for "/" — PWA standalone users who aren't logged in see the splash screen */
const RootRoute = () => {
  const [checked, setChecked] = useState(false);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setHasSession(!!session);
      setChecked(true);
    });
  }, []);

  if (!checked) return null;

  if (isStandalone() && !hasSession) {
    return <Navigate to="/pwa-splash" replace />;
  }

  if (isStandalone() && hasSession) {
    return <Navigate to="/dashboard" replace />;
  }

  return <IndexV2 />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BugReportPromptProvider>
        <BrowserRouter>
          <InstallBanner />
          <ErrorBoundary>
            <Suspense fallback={null}>
              <Routes>
                <Route path="/" element={<RootRoute />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/demo" element={<Demo />} />
                <Route path="/install" element={<Install />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="/auth/callback" element={<AuthCallback />} />
                <Route path="/auth/spotify/callback" element={<SpotifyCallback />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/pwa-splash" element={<PwaSplash />} />
                <Route path="/pwa-auth" element={<PwaAuth />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </BrowserRouter>
      </BugReportPromptProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
