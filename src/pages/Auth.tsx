import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import SceneLogo from "@/components/ui/SceneLogo";
import { useReferralCapture, getStoredReferralCode, clearStoredReferralCode } from "@/hooks/useReferralCapture";
import { ArrowLeft } from "lucide-react";
import DynamicIslandOverlay from "@/components/ui/DynamicIslandOverlay";


const Auth = () => {
  const navigate = useNavigate();
  const [authSearchParams] = useState(() => new URLSearchParams(window.location.search));
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  const handleForgotPassword = async () => {
    if (!resetEmail) {
      toast.error("Please enter your email address");
      return;
    }
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setResetSent(true);
      toast.success("Reset link sent! Check your inbox.");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to send reset link";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  // Capture referral code from URL if present
  useReferralCapture();

  // Redirect if already authenticated
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/dashboard");
      }
    };
    checkSession();
  }, [navigate]);

  const [signupFullName, setSignupFullName] = useState("");
  const [signupUsername, setSignupUsername] = useState("");
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const usernameCheckRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const USERNAME_REGEX = /^[a-z0-9_]+$/;

  const handleUsernameChange = (val: string) => {
    const lower = val.toLowerCase().replace(/[^a-z0-9_]/g, "");
    setSignupUsername(lower);
    setUsernameError(null);

    if (usernameCheckRef.current) clearTimeout(usernameCheckRef.current);
    if (lower.length < 3) {
      if (lower.length > 0) setUsernameError("Username must be at least 3 characters");
      return;
    }
    if (!USERNAME_REGEX.test(lower)) {
      setUsernameError("Only lowercase letters, numbers, and underscores");
      return;
    }

    setCheckingUsername(true);
    usernameCheckRef.current = setTimeout(async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", lower)
        .maybeSingle();
      if (data) {
        setUsernameError("Username already taken");
      }
      setCheckingUsername(false);
    }, 400);
  };

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const trimmedName = signupFullName.trim();
    const trimmedUsername = signupUsername.trim();

    if (!trimmedName) { toast.error("Please enter your name"); return; }
    if (trimmedUsername.length < 3) { toast.error("Username must be at least 3 characters"); return; }
    if (!USERNAME_REGEX.test(trimmedUsername)) { toast.error("Username can only contain lowercase letters, numbers, and underscores"); return; }
    if (usernameError) { toast.error(usernameError); return; }

    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    
    // Get stored referral code
    const referralCode = getStoredReferralCode();

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
          data: {
            full_name: trimmedName,
            username: trimmedUsername,
          },
        }
      });

      if (error) throw error;

      // If signup successful and we have a referral code, create referral record
      if (data.user && referralCode) {
        try {
          const { data: referrerProfile } = await supabase
            .from('profiles')
            .select('id')
            .eq('referral_code', referralCode)
            .single();

          if (referrerProfile) {
            await supabase.from('referrals').insert({
              referrer_id: referrerProfile.id,
              referred_id: data.user.id,
              referral_code: referralCode,
              status: 'completed',
              converted_at: new Date().toISOString()
            });
          }
          
          clearStoredReferralCode();
        } catch (refError) {
          console.error('Referral tracking error:', refError);
        }
      }

      // With email confirmation required, show the verification screen
      // Supabase returns a user but no session until email is confirmed
      if (data.user && !data.session) {
        setVerificationEmail(email);
      } else if (data.session) {
        // Auto-confirm is on (shouldn't happen in prod, but handle gracefully)
        toast.success("Sign up successful! Welcome to Scene 🎵");
        const showParam = authSearchParams.get("show");
        const typeParam = authSearchParams.get("type");
        if (showParam && typeParam) {
          const rsvpParam = authSearchParams.get("rsvp");
          const refParam = authSearchParams.get("ref");
          const qs = new URLSearchParams({ invite: "true", show: showParam, type: typeParam });
          if (rsvpParam) qs.set("rsvp", rsvpParam);
          if (refParam) qs.set("ref", refParam);
          navigate(`/dashboard?${qs.toString()}`);
        } else {
          navigate("/dashboard");
        }
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to sign up";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      toast.success("Welcome back! 🎶");
      // Forward invite params if present
      const showParam = authSearchParams.get("show");
      const typeParam = authSearchParams.get("type");
      if (showParam && typeParam) {
        const rsvpParam = authSearchParams.get("rsvp");
        const refParam = authSearchParams.get("ref");
        const qs = new URLSearchParams({ invite: "true", show: showParam, type: typeParam });
        if (rsvpParam) qs.set("rsvp", rsvpParam);
        if (refParam) qs.set("ref", refParam);
        navigate(`/dashboard?${qs.toString()}`);
      } else {
        navigate("/dashboard");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to sign in");
    } finally {
      setIsLoading(false);
    }
  };

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleResendVerification = async () => {
    if (!verificationEmail || resendCooldown > 0) return;
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: verificationEmail,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      });
      if (error) {
        const msg = error.message || "";
        if (msg.toLowerCase().includes("security purposes") || msg.toLowerCase().includes("rate") || error.status === 429) {
          // Extract seconds from message like "...after 50 seconds"
          const match = msg.match(/(\d+)\s*second/i);
          const secs = match ? parseInt(match[1], 10) : 60;
          setResendCooldown(secs);
          return; // No toast — the countdown on the button is feedback enough
        }
        throw error;
      }
      setResendCooldown(60);
      toast.success("Verification email resent!");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to resend";
      toast.error(message);
    }
  };

  const inputClassName = "bg-white/[0.04] border-white/[0.08] placeholder:text-white/30 focus:border-primary/50 focus:ring-primary/20 text-base transition-all duration-200 focus:shadow-[0_0_12px_hsl(var(--primary)/0.15)]";

  // ─── Verification screen ───
  if (verificationEmail) {
    return (
      <div className="min-h-screen relative overflow-hidden bg-background flex items-center justify-center p-4 pt-safe">
        <div
          className="absolute top-0 left-0 w-[60%] h-[60%] opacity-[0.15] blur-3xl animate-pulse"
          style={{
            background: "radial-gradient(circle at center, hsl(var(--primary)), transparent 70%)",
            animationDuration: "4s",
          }}
        />
        <div className="relative z-10 w-full max-w-md text-center space-y-6">
          <SceneLogo size="lg" className="text-2xl mb-3" />
          <div className="bg-white/[0.03] backdrop-blur-md border border-white/[0.08] rounded-2xl p-8 shadow-2xl shadow-black/20 space-y-5">
            <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-3xl">📧</span>
            </div>
            <h2 className="text-xl font-bold text-foreground">Check your inbox</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We sent a verification link to{" "}
              <span className="text-primary font-medium">{verificationEmail}</span>.
              <br />
              Click the link to activate your account.
            </p>
            <div className="pt-2 space-y-3">
              <Button
                onClick={handleResendVerification}
                variant="glass"
                className="w-full"
                disabled={resendCooldown > 0}
              >
                {resendCooldown > 0
                  ? `Resend in ${resendCooldown}s`
                  : "Resend verification email"}
              </Button>
              <button
                type="button"
                onClick={() => setVerificationEmail(null)}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                ← Back to sign in
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-background flex items-center justify-center p-4 pt-safe">
      {/* Dev overlay */}
      {import.meta.env.DEV && <DynamicIslandOverlay />}
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
      
      {/* Noise texture overlay */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`
        }}
      />

      {/* Back to website link — hidden in standalone PWA mode */}
      {!(window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone) && (
        <Link 
          to="/" 
          className="absolute top-4 left-4 z-20 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to website
        </Link>
      )}

      {/* Content container */}
      <div className="relative z-10 w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <SceneLogo size="lg" className="text-2xl mb-3" />
        </div>

        {/* Glassmorphism card */}
        <div className="bg-white/[0.03] backdrop-blur-md border border-white/[0.08] rounded-2xl p-6 shadow-2xl shadow-black/20">
          <Tabs defaultValue={new URLSearchParams(window.location.search).get("tab") === "signup" ? "signup" : "signin"} className="w-full">
            {/* Glass pill tabs */}
            <TabsList className="grid w-full grid-cols-2 bg-white/[0.06] backdrop-blur-sm border border-white/[0.08] rounded-full p-1 mb-6">
              <TabsTrigger 
                value="signin" 
                className="rounded-full data-[state=active]:bg-white/[0.12] data-[state=active]:text-white data-[state=active]:shadow-sm transition-all"
              >
                Sign In
              </TabsTrigger>
              <TabsTrigger 
                value="signup"
                className="rounded-full data-[state=active]:bg-white/[0.12] data-[state=active]:text-white data-[state=active]:shadow-sm transition-all"
              >
                Sign Up
              </TabsTrigger>
            </TabsList>

            <TabsContent value="signin" className="mt-0">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email" className="text-white/70">Email</Label>
                  <Input
                    id="signin-email"
                    name="email"
                    type="email"
                    placeholder="your@email.com"
                    required
                    className={inputClassName}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password" className="text-white/70">Password</Label>
                  <Input
                    id="signin-password"
                    name="password"
                    type="password"
                    placeholder="••••••••"
                    required
                    className={inputClassName}
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-primary to-primary/80 shadow-glow hover:scale-[1.02] active:scale-[0.98] transition-transform duration-200" 
                  disabled={isLoading}
                >
                  {isLoading ? "Signing in..." : "Sign In"}
                </Button>
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(prev => !prev)}
                  className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Forgot password?
                </button>
              </form>
              {showForgotPassword && (
                <div className="mt-4 p-4 rounded-xl bg-white/[0.04] border border-white/[0.08] space-y-3">
                  {resetSent ? (
                    <div className="text-center space-y-2">
                      <p className="text-sm text-foreground">Reset link sent to <span className="text-primary">{resetEmail}</span></p>
                      <p className="text-xs text-muted-foreground">Check your inbox and click the link to set a new password.</p>
                      <button
                        type="button"
                        onClick={() => { setResetSent(false); setShowForgotPassword(false); }}
                        className="text-sm text-primary hover:underline"
                      >
                        Back to sign in
                      </button>
                    </div>
                  ) : (
                    <>
                      <Label htmlFor="reset-email" className="text-white/70">Enter your email to reset</Label>
                      <Input
                        id="reset-email"
                        type="email"
                        placeholder="your@email.com"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        className={inputClassName}
                      />
                      <Button
                        type="button"
                        onClick={handleForgotPassword}
                        className="w-full"
                        variant="glass"
                        disabled={isLoading}
                      >
                        {isLoading ? "Sending..." : "Send Reset Link"}
                      </Button>
                    </>
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="signup" className="mt-0">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-fullname" className="text-white/70">Full Name</Label>
                  <Input
                    id="signup-fullname"
                    value={signupFullName}
                    onChange={(e) => setSignupFullName(e.target.value)}
                    placeholder="Your name"
                    maxLength={50}
                    required
                    className={inputClassName}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-username" className="text-white/70">Username</Label>
                  <Input
                    id="signup-username"
                    value={signupUsername}
                    onChange={(e) => handleUsernameChange(e.target.value)}
                    placeholder="yourname"
                    maxLength={30}
                    required
                    className={inputClassName}
                  />
                  {usernameError && (
                    <p className="text-xs text-destructive">{usernameError}</p>
                  )}
                  {checkingUsername && (
                    <p className="text-xs text-muted-foreground">Checking availability…</p>
                  )}
                  {signupUsername.length >= 3 && !usernameError && !checkingUsername && (
                    <p className="text-xs text-primary">Username available ✓</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email" className="text-white/70">Email</Label>
                  <Input
                    id="signup-email"
                    name="email"
                    type="email"
                    placeholder="your@email.com"
                    required
                    className={inputClassName}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password" className="text-white/70">Password</Label>
                  <Input
                    id="signup-password"
                    name="password"
                    type="password"
                    placeholder="••••••••"
                    minLength={6}
                    required
                    className={inputClassName}
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-primary to-primary/80 shadow-glow hover:scale-[1.02] active:scale-[0.98] transition-transform duration-200" 
                  disabled={isLoading || !!usernameError || checkingUsername}
                >
                  {isLoading ? "Creating account..." : "Create Account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>

        {/* Social proof */}
        <div className="flex items-center justify-center gap-3 mt-6">
          <div className="flex -space-x-2">
            <img 
              src="/images/waitlist-1.png" 
              alt="" 
              className="w-8 h-8 rounded-full border-2 border-background object-cover"
            />
            <img 
              src="/images/waitlist-2.png" 
              alt="" 
              className="w-8 h-8 rounded-full border-2 border-background object-cover"
            />
            <img 
              src="/images/waitlist-3.png" 
              alt="" 
              className="w-8 h-8 rounded-full border-2 border-background object-cover"
            />
          </div>
          <span className="text-sm text-muted-foreground">
            Join the beta
          </span>
        </div>
      </div>
    </div>
  );
};

export default Auth;
