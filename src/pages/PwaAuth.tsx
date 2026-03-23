import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import SceneLogo from "@/components/ui/SceneLogo";
import BrandTagline from "@/components/ui/BrandTagline";
import { getStoredReferralCode, clearStoredReferralCode } from "@/hooks/useReferralCapture";
import { useRef, useEffect } from "react";

type DrawerMode = null | "signin" | "signup";

const PwaAuth = () => {
  const navigate = useNavigate();
  const [drawerMode, setDrawerMode] = useState<DrawerMode>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetSent, setResetSent] = useState(false);

  // Signup fields
  const [signupFullName, setSignupFullName] = useState("");
  const [signupUsername, setSignupUsername] = useState("");
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const usernameCheckRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const USERNAME_REGEX = /^[a-z0-9_]+$/;

  const inputClassName = "bg-white/[0.06] border-white/[0.08] placeholder:text-white/30 focus:border-primary/50 focus:ring-primary/20 text-base transition-all duration-200";

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

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
      if (data) setUsernameError("Username already taken");
      setCheckingUsername(false);
    }, 400);
  };

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast.success("Welcome back! 🎶");
      navigate("/dashboard");
    } catch (error: any) {
      toast.error(error.message || "Failed to sign in");
    } finally {
      setIsLoading(false);
    }
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
    const referralCode = getStoredReferralCode();

    try {
      const { data, error } = await supabase.auth.signUp({
        email, password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
          data: { full_name: trimmedName, username: trimmedUsername },
        }
      });
      if (error) throw error;

      if (data.user && referralCode) {
        try {
          const { data: referrerProfile } = await supabase
            .from('profiles').select('id').eq('referral_code', referralCode).single();
          if (referrerProfile) {
            await supabase.from('referrals').insert({
              referrer_id: referrerProfile.id, referred_id: data.user.id,
              referral_code: referralCode, status: 'completed',
              converted_at: new Date().toISOString()
            });
          }
          clearStoredReferralCode();
        } catch (refError) { console.error('Referral tracking error:', refError); }
      }

      if (data.user && !data.session) {
        setVerificationEmail(email);
      } else if (data.session) {
        toast.success("Sign up successful! Welcome to Scene 🎵");
        navigate("/dashboard");
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to sign up";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!resetEmail) { toast.error("Please enter your email address"); return; }
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

  const handleResendVerification = async () => {
    if (!verificationEmail || resendCooldown > 0) return;
    try {
      const { error } = await supabase.auth.resend({
        type: "signup", email: verificationEmail,
        options: { emailRedirectTo: `${window.location.origin}/dashboard` },
      });
      if (error) {
        const msg = error.message || "";
        if (msg.toLowerCase().includes("security purposes") || msg.toLowerCase().includes("rate") || error.status === 429) {
          const match = msg.match(/(\d+)\s*second/i);
          setResendCooldown(match ? parseInt(match[1], 10) : 60);
          return;
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

  const closeDrawer = () => {
    setDrawerMode(null);
    setShowForgotPassword(false);
    setResetSent(false);
    setResetEmail("");
    setVerificationEmail(null);
  };

  // Verification screen inside drawer
  if (verificationEmail) {
    return (
      <div className="fixed inset-0 bg-background flex flex-col">
        <BackgroundImage />
        <div className="relative z-10 flex flex-col h-full">
          <LogoSection />
          <div className="flex-1" />
        </div>
        {/* Verification drawer */}
        <div className="fixed inset-x-0 bottom-0 z-30">
          <div className="bg-background border-t border-white/[0.08] rounded-t-3xl px-6 pt-6 pb-10 space-y-5">
            <div className="w-10 h-1 rounded-full bg-white/20 mx-auto" />
            <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-3xl">📧</span>
            </div>
            <h2 className="text-xl font-bold text-foreground text-center">Check your inbox</h2>
            <p className="text-sm text-muted-foreground leading-relaxed text-center">
              We sent a verification link to{" "}
              <span className="text-primary font-medium">{verificationEmail}</span>.
              <br />Click the link to activate your account.
            </p>
            <Button onClick={handleResendVerification} variant="glass" className="w-full" disabled={resendCooldown > 0}>
              {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend verification email"}
            </Button>
            <button type="button" onClick={closeDrawer}
              className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors text-center">
              ← Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-background flex flex-col">
      <BackgroundImage />

      {/* Content layer */}
      <div className="relative z-10 flex flex-col h-full">
        <LogoSection />
        <div className="flex-1" />

        {/* Bottom CTA area — visible when drawer is closed */}
        <AnimatePresence>
          {drawerMode === null && (
            <motion.div
              className="flex-shrink-0 px-6 pb-10 space-y-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.3 }}
            >
              <Button
                onClick={() => setDrawerMode("signin")}
                className="w-full h-12 rounded-full bg-primary text-primary-foreground text-base font-semibold hover:bg-primary/90 transition-colors"
              >
                Log In
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                New to Scene?{" "}
                <button onClick={() => setDrawerMode("signup")}
                  className="text-white font-medium hover:underline transition-colors">
                  Sign Up
                </button>
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Auth drawer */}
      <AnimatePresence>
        {drawerMode !== null && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 z-20 bg-black/40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeDrawer}
            />
            {/* Drawer panel */}
            <motion.div
              className="fixed inset-x-0 bottom-0 z-30 max-h-[85vh] overflow-y-auto"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
            >
              <div className="bg-background border-t border-white/[0.08] rounded-t-3xl px-6 pt-5 pb-10">
                {/* Drag handle */}
                <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-5" />

                {/* Drawer header */}
                <h2 className="text-xl font-bold text-foreground mb-1">
                  {drawerMode === "signin" ? "Log In" : "Sign Up"}
                </h2>
                <p className="text-sm text-muted-foreground mb-5">
                  {drawerMode === "signin"
                    ? "Welcome back to Scene."
                    : "Create your Scene account."}
                </p>

                {drawerMode === "signin" ? (
                  <form onSubmit={handleSignIn} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="pwa-signin-email" className="text-white/70">Email</Label>
                      <Input id="pwa-signin-email" name="email" type="email" placeholder="your@email.com" required className={inputClassName} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pwa-signin-password" className="text-white/70">Password</Label>
                      <Input id="pwa-signin-password" name="password" type="password" placeholder="••••••••" required className={inputClassName} />
                    </div>
                    <Button type="submit" className="w-full h-12 rounded-full bg-primary text-primary-foreground text-base font-semibold" disabled={isLoading}>
                      {isLoading ? "Signing in..." : "Log In"}
                    </Button>
                    <button type="button" onClick={() => setShowForgotPassword(prev => !prev)}
                      className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors">
                      Forgot password?
                    </button>
                    {showForgotPassword && (
                      <div className="p-4 rounded-xl bg-white/[0.04] border border-white/[0.08] space-y-3">
                        {resetSent ? (
                          <div className="text-center space-y-2">
                            <p className="text-sm text-foreground">Reset link sent to <span className="text-primary">{resetEmail}</span></p>
                            <p className="text-xs text-muted-foreground">Check your inbox and click the link to set a new password.</p>
                            <button type="button" onClick={() => { setResetSent(false); setShowForgotPassword(false); }} className="text-sm text-primary hover:underline">Back to sign in</button>
                          </div>
                        ) : (
                          <>
                            <Label htmlFor="pwa-reset-email" className="text-white/70">Enter your email to reset</Label>
                            <Input id="pwa-reset-email" type="email" placeholder="your@email.com" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} className={inputClassName} />
                            <Button type="button" onClick={handleForgotPassword} className="w-full" variant="glass" disabled={isLoading}>
                              {isLoading ? "Sending..." : "Send Reset Link"}
                            </Button>
                          </>
                        )}
                      </div>
                    )}
                    <p className="text-center text-sm text-muted-foreground">
                      New to Scene?{" "}
                      <button type="button" onClick={() => { setDrawerMode("signup"); setShowForgotPassword(false); }}
                        className="text-white font-medium hover:underline">Sign Up</button>
                    </p>
                  </form>
                ) : (
                  <form onSubmit={handleSignUp} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="pwa-signup-fullname" className="text-white/70">Full Name</Label>
                      <Input id="pwa-signup-fullname" value={signupFullName} onChange={(e) => setSignupFullName(e.target.value)} placeholder="Your name" maxLength={50} required className={inputClassName} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pwa-signup-username" className="text-white/70">Username</Label>
                      <Input id="pwa-signup-username" value={signupUsername} onChange={(e) => handleUsernameChange(e.target.value)} placeholder="yourname" maxLength={30} required className={inputClassName} />
                      {usernameError && <p className="text-xs text-destructive">{usernameError}</p>}
                      {checkingUsername && <p className="text-xs text-muted-foreground">Checking availability…</p>}
                      {signupUsername.length >= 3 && !usernameError && !checkingUsername && <p className="text-xs text-primary">Username available ✓</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pwa-signup-email" className="text-white/70">Email</Label>
                      <Input id="pwa-signup-email" name="email" type="email" placeholder="your@email.com" required className={inputClassName} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pwa-signup-password" className="text-white/70">Password</Label>
                      <Input id="pwa-signup-password" name="password" type="password" placeholder="••••••••" minLength={6} required className={inputClassName} />
                    </div>
                    <Button type="submit" className="w-full h-12 rounded-full bg-primary text-primary-foreground text-base font-semibold" disabled={isLoading || !!usernameError || checkingUsername}>
                      {isLoading ? "Creating account..." : "Create Account"}
                    </Button>
                    <p className="text-center text-sm text-muted-foreground">
                      Already have an account?{" "}
                      <button type="button" onClick={() => setDrawerMode("signin")}
                        className="text-white font-medium hover:underline">Log In</button>
                    </p>
                  </form>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

/* ── Extracted sub-components ── */

function BackgroundImage() {
  return (
    <div className="absolute inset-0">
      <img
        src="/images/fred-again-msg-mobile.webp"
        alt="Concert crowd with stage lights"
        className="w-full h-full object-cover"
      />
      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(to bottom, hsl(var(--background)) 15%, hsl(var(--background) / 0.6) 35%, transparent 50%)"
        }}
      />
      <div
        className="absolute inset-x-0 bottom-0 h-32"
        style={{
          background: "linear-gradient(to top, hsl(var(--background)) 0%, transparent 100%)"
        }}
      />
    </div>
  );
}

function LogoSection() {
  return (
    <div className="pt-[22vh] flex flex-col items-center">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <SceneLogo size="lg" className="text-2xl" />
      </motion.div>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.2 }} className="mt-3">
        <BrandTagline />
      </motion.div>
    </div>
  );
}

export default PwaAuth;
