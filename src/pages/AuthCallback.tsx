import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

const AuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      // Give Supabase a moment to parse the hash fragment and set the session
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        // Read any invite context stored before the OTP was sent
        const showId = sessionStorage.getItem("invite_show_id");
        const showType = sessionStorage.getItem("invite_show_type");
        const refCode = sessionStorage.getItem("invite_ref");

        if (showId && showType) {
          navigate(
            `/dashboard?show=${showId}&type=${showType}&action=log${refCode ? `&ref=${refCode}` : ""}`,
            { replace: true }
          );
        } else {
          navigate("/dashboard", { replace: true });
        }
      } else {
        // No session found — fall back to auth page
        navigate("/auth", { replace: true });
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-foreground/30" />
    </div>
  );
};

export default AuthCallback;
