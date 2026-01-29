import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import SceneLogo from "@/components/ui/SceneLogo";

const Auth = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

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

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`
        }
      });

      if (error) throw error;

      toast.success("Sign up successful! Welcome to Scene 🎵");
      navigate("/dashboard");
    } catch (error: any) {
      toast.error(error.message || "Failed to sign up");
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
      navigate("/dashboard");
    } catch (error: any) {
      toast.error(error.message || "Failed to sign in");
    } finally {
      setIsLoading(false);
    }
  };

  const inputClassName = "bg-white/[0.04] border-white/[0.08] placeholder:text-white/30 focus:border-primary/50 focus:ring-primary/20 text-base transition-all duration-200 focus:shadow-[0_0_12px_hsl(var(--primary)/0.15)]";

  return (
    <div className="min-h-screen relative overflow-hidden bg-background flex items-center justify-center p-4">
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

      {/* Content container */}
      <div className="relative z-10 w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <SceneLogo size="lg" className="text-2xl mb-3" />
          <p 
            className="text-muted-foreground text-sm"
            style={{
              textShadow: "0 0 20px rgba(255,255,255,0.1)"
            }}
          >
            Track every show, live every moment
          </p>
        </div>

        {/* Glassmorphism card */}
        <div className="bg-white/[0.03] backdrop-blur-md border border-white/[0.08] rounded-2xl p-6 shadow-2xl shadow-black/20">
          <Tabs defaultValue="signin" className="w-full">
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
              </form>
            </TabsContent>

            <TabsContent value="signup" className="mt-0">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-username" className="text-white/70">Username</Label>
                  <Input
                    id="signup-username"
                    name="username"
                    type="text"
                    placeholder="musiclover"
                    required
                    className={inputClassName}
                  />
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
                    required
                    minLength={6}
                    className={inputClassName}
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-primary to-primary/80 shadow-glow hover:scale-[1.02] active:scale-[0.98] transition-transform duration-200" 
                  disabled={isLoading}
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
            Join 1,200+ music lovers
          </span>
        </div>
      </div>
    </div>
  );
};

export default Auth;
