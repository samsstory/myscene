import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

const AuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        const showId = sessionStorage.getItem("invite_show_id");
        const showType = sessionStorage.getItem("invite_show_type");
        const refCode = sessionStorage.getItem("invite_ref");

        if (showId && showType) {
          // invite=true signals Dashboard to open the compare flow
          navigate(
            `/dashboard?invite=true&show=${showId}&type=${showType}${refCode ? `&ref=${refCode}` : ""}`,
            { replace: true }
          );
        } else {
          navigate("/dashboard", { replace: true });
        }
      } else {
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
