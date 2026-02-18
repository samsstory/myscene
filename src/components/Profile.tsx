import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogOut, User, Camera, Loader2, Share2, Users, Gift, Sparkles, Navigation, Download, Bell, BellOff, UserSearch, UserPlus, Heart } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { usePushSubscription } from "@/hooks/usePushSubscription";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import WelcomeCarousel from "@/components/onboarding/WelcomeCarousel";
import { useFollowers } from "@/hooks/useFollowers";
import FindFriendsSheet from "@/components/profile/FindFriendsSheet";

const Profile = ({ onStartTour, onAddShow }: { onStartTour?: () => void; onAddShow?: () => void }) => {
  const [showWelcomeCarousel, setShowWelcomeCarousel] = useState(false);
  const [findFriendsOpen, setFindFriendsOpen] = useState(false);
  const { state: pushState, subscribe: pushSubscribe, unsubscribe: pushUnsubscribe } = usePushSubscription();
  const { following, followers } = useFollowers();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referralCount, setReferralCount] = useState(0);
  
  // Form state
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      // Set email from auth user
      setEmail(user.email || "");

      // Fetch profile data including referral code
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("avatar_url, referral_code, username, full_name")
        .eq("id", user.id)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Error fetching profile:", error);
      }

      if (profile) {
        setAvatarUrl(profile.avatar_url);
        setReferralCode(profile.referral_code);
        setUsername(profile.username || "");
        setFullName(profile.full_name || "");
      }

      // Fetch referral count
      const { count, error: countError } = await supabase
        .from("referrals")
        .select("*", { count: "exact", head: true })
        .eq("referrer_id", user.id);

      if (!countError && count !== null) {
        setReferralCount(count);
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      toast.error("Please upload a JPG, PNG, or WEBP image");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be smaller than 5MB");
      return;
    }

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Upload to storage
      const fileExt = file.name.split(".").pop();
      const filePath = `${user.id}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("show-photos")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("show-photos")
        .getPublicUrl(filePath);

      // Update profile
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", user.id);

      if (updateError) throw updateError;

      setAvatarUrl(publicUrl);
      toast.success("Profile picture updated!");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload profile picture");
    } finally {
      setUploading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out successfully");
    navigate("/auth");
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Update profile table
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ 
          username: username.trim() || null,
          full_name: fullName.trim() || null
        })
        .eq("id", user.id);

      if (profileError) throw profileError;

      // Update email if changed
      if (email !== user.email) {
        const { error: emailError } = await supabase.auth.updateUser({ email });
        if (emailError) throw emailError;
        toast.success("Profile updated! Check your email to confirm the new address.");
      } else {
        toast.success("Profile updated! 🎉");
      }
    } catch (error: any) {
      console.error("Update error:", error);
      toast.error(error.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const copyReferralLink = async () => {
    if (!referralCode) return;
    const link = `${window.location.origin}/?ref=${referralCode}`;
    await navigator.clipboard.writeText(link);
    toast.success("Referral link copied!");
  };

  return (
    <>
      {showWelcomeCarousel && (
        <WelcomeCarousel onComplete={() => { setShowWelcomeCarousel(false); onAddShow?.(); }} />
      )}
      
      <div className="space-y-6 max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Profile Settings</h2>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>

        {/* Welcome to Scene Card */}
        <Card className="border-border shadow-card bg-gradient-to-br from-primary/10 via-transparent to-secondary/10">
          <CardContent className="p-4 space-y-1">
            <Button 
              onClick={() => setShowWelcomeCarousel(true)}
              variant="ghost"
              className="w-full justify-start gap-3 h-auto py-3"
            >
              <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div className="text-left">
                <p className="font-semibold">Welcome to Scene</p>
                <p className="text-sm text-muted-foreground">View the intro again</p>
              </div>
            </Button>
            
            <Button 
              onClick={() => onStartTour?.()}
              variant="ghost"
              className="w-full justify-start gap-3 h-auto py-3"
            >
              <div className="h-10 w-10 rounded-full bg-secondary/20 flex items-center justify-center">
                <Navigation className="h-5 w-5 text-secondary" />
              </div>
              <div className="text-left">
                <p className="font-semibold">Interactive Tour</p>
                <p className="text-sm text-muted-foreground">Learn your way around</p>
              </div>
            </Button>

            <Button 
              onClick={() => navigate("/install")}
              variant="ghost"
              className="w-full justify-start gap-3 h-auto py-3"
            >
              <div className="h-10 w-10 rounded-full bg-accent/20 flex items-center justify-center">
                <Download className="h-5 w-5 text-accent" />
              </div>
              <div className="text-left">
                <p className="font-semibold">Install App</p>
                <p className="text-sm text-muted-foreground">Add SCENE to your home screen</p>
              </div>
            </Button>
          </CardContent>
        </Card>

      {/* Profile Picture Card */}
      <Card className="border-border shadow-card">
        <CardHeader>
          <CardTitle>Profile Picture</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <div className="relative group">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-white/[0.05] border-2 border-white/[0.1] flex items-center justify-center">
              {loading ? (
                <Loader2 className="h-8 w-8 animate-spin text-white/40" />
              ) : avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-3xl text-white/40 select-none" style={{ textShadow: "0 0 12px rgba(255,255,255,0.4)" }}>✦</span>
              )}
            </div>
            
            {/* Upload overlay */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="absolute inset-0 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
            >
              {uploading ? (
                <Loader2 className="h-6 w-6 animate-spin text-white" />
              ) : (
                <Camera className="h-6 w-6 text-white" />
              )}
            </button>
          </div>
          
          <p className="text-sm text-muted-foreground text-center">
            Click to upload a new profile picture
          </p>
          
          <Input
            ref={fileInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.webp"
            className="hidden"
            onChange={handleAvatarUpload}
          />
        </CardContent>
      </Card>

      {/* Referral Stats Card */}
      <Card className="border-border shadow-card bg-gradient-to-br from-primary/10 to-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-primary" />
            Invite Friends
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Stats */}
          <div className="flex items-center gap-4 p-4 rounded-lg bg-white/[0.05] border border-white/[0.1]">
            <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{referralCount}</p>
              <p className="text-sm text-muted-foreground">
                {referralCount === 1 ? "Friend invited" : "Friends invited"}
              </p>
            </div>
          </div>

          {/* Share Button */}
          <Button onClick={copyReferralLink} className="w-full" disabled={!referralCode}>
            <Share2 className="h-4 w-4 mr-2" />
            Copy Invite Link
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Share your link with friends. When they sign up, you'll get credit!
          </p>
        </CardContent>
      </Card>

      {/* Social Card */}
      <Card className="border-border shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-primary" />
            Friends on Scene
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Follower / Following counts */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col items-center justify-center p-4 rounded-lg bg-white/[0.04] border border-white/[0.08]">
              <p className="text-2xl font-bold">{following.length}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Following</p>
            </div>
            <div className="flex flex-col items-center justify-center p-4 rounded-lg bg-white/[0.04] border border-white/[0.08]">
              <p className="text-2xl font-bold">{followers.length}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Followers</p>
            </div>
          </div>

          {/* Find Friends CTA */}
          <Button
            onClick={() => setFindFriendsOpen(true)}
            className="w-full gap-2"
            variant="outline"
          >
            <UserSearch className="h-4 w-4" />
            Find Friends by Username
          </Button>

          {following.length === 0 && (
            <p className="text-xs text-muted-foreground text-center">
              Follow friends to see their upcoming shows on your calendar
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="border-border shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Account Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Your username"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fullname">Full Name</Label>
              <Input
                id="fullname"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your full name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
              />
            </div>

            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Update Profile"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-border shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                {pushState === 'subscribed' ? (
                  <Bell className="h-5 w-5 text-primary" />
                ) : (
                  <BellOff className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <div>
                <p className="font-medium">Push Notifications</p>
                <p className="text-sm text-muted-foreground">
                  {pushState === 'unsupported'
                    ? "Not supported on this browser"
                    : pushState === 'denied'
                    ? "Blocked — enable in browser settings"
                    : pushState === 'subscribed'
                    ? "You'll receive updates about your shows"
                    : "Get notified about your shows"}
                </p>
              </div>
            </div>
            <Switch
              checked={pushState === 'subscribed'}
              disabled={pushState === 'unsupported' || pushState === 'denied' || pushState === 'loading'}
              onCheckedChange={(checked) => {
                if (checked) {
                  pushSubscribe();
                } else {
                  pushUnsubscribe();
                }
              }}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border shadow-card">
        <CardHeader>
          <CardTitle>Privacy Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Public Profile</p>
              <p className="text-sm text-muted-foreground">
                Allow others to see your show history
              </p>
            </div>
            <Button variant="outline" size="sm">
              Coming Soon
            </Button>
          </div>
        </CardContent>
      </Card>
      </div>

      <FindFriendsSheet open={findFriendsOpen} onOpenChange={setFindFriendsOpen} />
    </>
  );
};

export default Profile;
