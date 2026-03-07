import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import SceneLogo from "@/components/ui/SceneLogo";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);

  const [expired, setExpired] = useState(false);

  useEffect(() => {
    // Listen for the PASSWORD_RECOVERY event from the hash fragment
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsRecovery(true);
      }
    });

    // Check if the token was already exchanged before mount (303 redirect race)
    const checkExistingSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setIsRecovery(true);
      }
    };

    // Also check the URL hash for type=recovery as a secondary signal
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      setIsRecovery(true);
    }

    checkExistingSession();

    // Timeout fallback — if nothing triggers after 5s, show expired message
    const timeout = setTimeout(() => {
      setIsRecovery((prev) => {
        if (!prev) setExpired(true);
        return prev;
      });
    }, 5000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Password updated! Redirecting...");
      setTimeout(() => navigate("/dashboard"), 1500);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to update password";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const inputClassName = "bg-white/[0.04] border-white/[0.08] placeholder:text-white/30 focus:border-primary/50 focus:ring-primary/20 text-base transition-all duration-200 focus:shadow-[0_0_12px_hsl(var(--primary)/0.15)]";

  return (
    <div className="min-h-screen relative overflow-hidden bg-background flex items-center justify-center p-4 pt-safe">
      {/* Mesh gradient backgrounds */}
      <div 
        className="absolute top-0 left-0 w-[60%] h-[60%] opacity-[0.15] blur-3xl animate-pulse"
        style={{
          background: "radial-gradient(circle at center, hsl(var(--primary)), transparent 70%)",
          animationDuration: "4s"
        }}
      />
      <div 
        className="absolute bottom-0 right-0 w-[50%] h-[50%] opacity-[0.12] blur-3xl"
        style={{
          background: "radial-gradient(circle at center, hsl(25 95% 65%), transparent 70%)"
        }}
      />

      {/* Content container */}
      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8">
          <SceneLogo size="lg" className="text-2xl mb-3" />
          <p className="text-muted-foreground text-sm">Set your new password</p>
        </div>

        <div className="bg-white/[0.03] backdrop-blur-md border border-white/[0.08] rounded-2xl p-6 shadow-2xl shadow-black/20">
          {!isRecovery ? (
            <div className="text-center space-y-3">
              {expired ? (
                <>
                  <p className="text-sm text-foreground">
                    This reset link may have expired or already been used.
                  </p>
                  <a
                    href="/auth"
                    className="text-sm text-primary hover:underline"
                  >
                    Request a new reset link →
                  </a>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    Loading recovery session...
                  </p>
                  <p className="text-xs text-muted-foreground">
                    If this takes too long, try clicking the reset link from your email again.
                  </p>
                </>
              )}
            </div>
          ) : (
            <form onSubmit={handleReset} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password" className="text-white/70">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="••••••••"
                  minLength={6}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputClassName}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password" className="text-white/70">Confirm Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="••••••••"
                  minLength={6}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={inputClassName}
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-primary to-primary/80 shadow-glow hover:scale-[1.02] active:scale-[0.98] transition-transform duration-200"
                disabled={isLoading}
              >
                {isLoading ? "Updating..." : "Update Password"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
