import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

const buildInviteUrl = () => {
  // Use localStorage so invite context survives magic link clicks (new tab)
  const showId = localStorage.getItem("invite_show_id");
  const showType = localStorage.getItem("invite_show_type");
  const refCode = localStorage.getItem("invite_ref");
  if (showId && showType) {
    return `/dashboard?invite=true&show=${showId}&type=${showType}${refCode ? `&ref=${refCode}` : ""}`;
  }
  return "/dashboard";
};

const AuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Magic links put the token in the URL hash. Supabase exchanges it async,
    // so we must listen for the SIGNED_IN event rather than calling getSession()
    // immediately (which races against the token exchange).
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        subscription.unsubscribe();
        navigate(buildInviteUrl(), { replace: true });
      } else if (event === "INITIAL_SESSION") {
        // Already have a session (e.g. user was already logged in)
        if (session) {
          subscription.unsubscribe();
          navigate(buildInviteUrl(), { replace: true });
        }
        // If no session on INITIAL_SESSION, wait for SIGNED_IN from token exchange
      } else if (event === "SIGNED_OUT") {
        subscription.unsubscribe();
        navigate("/auth", { replace: true });
      }
    });

    // Safety fallback: if no auth event fires in 8s, redirect to auth
    const timeout = setTimeout(() => {
      subscription.unsubscribe();
      navigate("/auth", { replace: true });
    }, 8000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-foreground/30" />
    </div>
  );
};

export default AuthCallback;
