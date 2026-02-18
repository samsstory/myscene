import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LogOut, Camera, Loader2, Share2, Users, Sparkles, Navigation, Download, Bell, BellOff, UserSearch, ChevronRight, Lock } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { usePushSubscription } from "@/hooks/usePushSubscription";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import WelcomeCarousel from "@/components/onboarding/WelcomeCarousel";
import { useFollowers } from "@/hooks/useFollowers";
import FindFriendsSheet from "@/components/profile/FindFriendsSheet";

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <p
    className="text-[11px] uppercase tracking-[0.2em] font-semibold text-white/50 mb-3"
    style={{ textShadow: "0 0 8px rgba(255,255,255,0.2)" }}
  >
    {children}
  </p>
);

const GlassPanel = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`rounded-2xl bg-white/[0.04] backdrop-blur-md border border-white/[0.07] px-5 py-4 ${className}`}>
    {children}
  </div>
);

const GlassRow = ({
  icon,
  iconBg = "bg-primary/[0.12] border-primary/[0.20]",
  iconColor = "text-primary",
  title,
  subtitle,
  right,
  onClick,
  chevron = false,
}: {
  icon: React.ReactNode;
  iconBg?: string;
  iconColor?: string;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  onClick?: () => void;
  chevron?: boolean;
}) => {
  const inner = (
    <div className="flex items-center gap-3 w-full">
      <div className={`h-9 w-9 rounded-full border flex items-center justify-center shrink-0 ${iconBg}`}>
        <span className={iconColor}>{icon}</span>
      </div>
      <div className="flex-1 text-left">
        <p className="text-sm font-medium text-white/90">{title}</p>
        {subtitle && <p className="text-xs text-white/40 mt-0.5">{subtitle}</p>}
      </div>
      {right}
      {chevron && <ChevronRight className="h-4 w-4 text-white/25 shrink-0" />}
    </div>
  );

  if (onClick) {
    return (
      <button
        onClick={onClick}
        className="w-full flex items-center gap-3 px-1 py-3 rounded-xl hover:bg-white/[0.04] transition-all"
      >
        {inner}
      </button>
    );
  }

  return <div className="w-full flex items-center gap-3 px-1 py-3">{inner}</div>;
};

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
  
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");

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
      setEmail(user.email || "");
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("avatar_url, referral_code, username, full_name, phone_number")
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
        setPhoneNumber((profile as any).phone_number || "");
      }
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
      const fileExt = file.name.split(".").pop();
      const filePath = `${user.id}/avatar.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from("show-photos")
        .upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage
        .from("show-photos")
        .getPublicUrl(filePath);
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
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ 
          username: username.trim() || null,
          full_name: fullName.trim() || null,
          phone_number: phoneNumber.trim() || null,
        } as any)
        .eq("id", user.id);
      if (profileError) throw profileError;
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

  const displayName = fullName || username || email.split("@")[0];

  return (
    <>
      {showWelcomeCarousel && (
        <WelcomeCarousel onComplete={() => { setShowWelcomeCarousel(false); onAddShow?.(); }} />
      )}
      
      <div className="space-y-5 max-w-2xl mx-auto pb-8">

        {/* ── Hero Identity Row ── */}
        <div className="flex items-start justify-between pt-2">
          <div className="flex flex-col items-center gap-3">
            {/* Avatar */}
            <div className="relative group">
              <div className="w-20 h-20 rounded-full overflow-hidden bg-white/[0.05] border border-white/[0.12] flex items-center justify-center">
                {loading ? (
                  <Loader2 className="h-7 w-7 animate-spin text-white/30" />
                ) : avatarUrl ? (
                  <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl text-white/30 select-none" style={{ textShadow: "0 0 12px rgba(255,255,255,0.3)" }}>✦</span>
                )}
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute inset-0 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
              >
                {uploading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-white" />
                ) : (
                  <Camera className="h-5 w-5 text-white" />
                )}
              </button>
            </div>
            <div className="text-center">
              <p
                className="text-base font-semibold text-white/90 leading-tight"
                style={{ textShadow: "0 0 12px rgba(255,255,255,0.2)" }}
              >
                {displayName}
              </p>
              {username && fullName && (
                <p className="text-xs text-white/35 mt-0.5">@{username}</p>
              )}
            </div>
          </div>

          {/* Sign Out */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white/50 text-xs hover:bg-white/[0.07] hover:text-white/70 transition-all"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign Out
          </button>
        </div>

        <Input
          ref={fileInputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.webp"
          className="hidden"
          onChange={handleAvatarUpload}
        />

        {/* ── Quick Access ── */}
        <div>
          <SectionLabel>Explore</SectionLabel>
          <GlassPanel className="divide-y divide-white/[0.05]">
            <GlassRow
              icon={<Sparkles className="h-4 w-4" />}
              iconBg="bg-primary/[0.12] border-primary/[0.20]"
              iconColor="text-primary"
              title="Welcome to Scene"
              subtitle="View the intro again"
              chevron
              onClick={() => setShowWelcomeCarousel(true)}
            />
            <GlassRow
              icon={<Navigation className="h-4 w-4" />}
              iconBg="bg-secondary/[0.15] border-secondary/[0.25]"
              iconColor="text-secondary"
              title="Interactive Tour"
              subtitle="Learn your way around"
              chevron
              onClick={() => onStartTour?.()}
            />
            <GlassRow
              icon={<Download className="h-4 w-4" />}
              iconBg="bg-accent/[0.12] border-accent/[0.20]"
              iconColor="text-accent"
              title="Install App"
              subtitle="Add SCENE to your home screen"
              chevron
              onClick={() => navigate("/install")}
            />
          </GlassPanel>
        </div>

        {/* ── Friends on Scene ── */}
        <div>
          <SectionLabel>Friends on Scene</SectionLabel>
          <GlassPanel className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col items-center justify-center py-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <p
                  className="text-2xl font-bold text-white/90"
                  style={{ textShadow: "0 0 16px rgba(255,255,255,0.25)" }}
                >
                  {following.length}
                </p>
                <p className="text-[11px] uppercase tracking-[0.15em] text-white/40 mt-1">Following</p>
              </div>
              <div className="flex flex-col items-center justify-center py-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <p
                  className="text-2xl font-bold text-white/90"
                  style={{ textShadow: "0 0 16px rgba(255,255,255,0.25)" }}
                >
                  {followers.length}
                </p>
                <p className="text-[11px] uppercase tracking-[0.15em] text-white/40 mt-1">Followers</p>
              </div>
            </div>

            <button
              onClick={() => setFindFriendsOpen(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.10] text-white/70 text-sm hover:bg-white/[0.07] hover:text-white/90 transition-all"
            >
              <UserSearch className="h-4 w-4" />
              Find Friends by Name or Username
            </button>

            {following.length === 0 && (
              <p className="text-xs text-white/30 text-center">
                Follow friends to see their upcoming shows on your calendar
              </p>
            )}
          </GlassPanel>
        </div>

        {/* ── Invite Friends ── */}
        <div>
          <SectionLabel>Invite Friends</SectionLabel>
          <GlassPanel className="divide-y divide-white/[0.05]">
            {/* Referral count row */}
            <div className="flex items-center gap-3 px-1 py-3">
              <div className="h-9 w-9 rounded-full bg-primary/[0.12] border border-primary/[0.20] flex items-center justify-center shrink-0">
                <Users className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-white/90">
                  <span style={{ textShadow: "0 0 10px rgba(255,255,255,0.2)" }}>{referralCount}</span>{" "}
                  {referralCount === 1 ? "friend invited" : "friends invited"}
                </p>
                <p className="text-xs text-white/35 mt-0.5">Share your link to get credit</p>
              </div>
            </div>

            {/* Copy link row */}
            <GlassRow
              icon={<Share2 className="h-4 w-4" />}
              iconBg="bg-primary/[0.12] border-primary/[0.20]"
              iconColor="text-primary"
              title="Copy Invite Link"
              subtitle={referralCode ? `scene.app/?ref=${referralCode}` : "Loading…"}
              chevron
              onClick={copyReferralLink}
            />
          </GlassPanel>
        </div>

        {/* ── Account Information ── */}
        <div>
          <SectionLabel>Account</SectionLabel>
          <GlassPanel>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] uppercase tracking-wider text-white/40">Username</label>
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Your username"
                  className="bg-white/[0.04] border-white/[0.10] text-white/80 placeholder:text-white/25 focus:border-primary/40"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] uppercase tracking-wider text-white/40">Full Name</label>
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your full name"
                  className="bg-white/[0.04] border-white/[0.10] text-white/80 placeholder:text-white/25 focus:border-primary/40"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] uppercase tracking-wider text-white/40">Email</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="bg-white/[0.04] border-white/[0.10] text-white/80 placeholder:text-white/25 focus:border-primary/40"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] uppercase tracking-wider text-white/40">Phone Number</label>
                <Input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="bg-white/[0.04] border-white/[0.10] text-white/80 placeholder:text-white/25 focus:border-primary/40"
                />
              </div>
              <button
                type="submit"
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary/[0.12] border border-primary/[0.28] text-primary/90 text-sm font-medium hover:bg-primary/[0.20] transition-all disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  "Update Profile"
                )}
              </button>
            </form>
          </GlassPanel>
        </div>

        {/* ── Notifications & Privacy ── */}
        <div>
          <SectionLabel>Settings</SectionLabel>
          <GlassPanel className="divide-y divide-white/[0.05]">
            {/* Push notifications */}
            <GlassRow
              icon={pushState === "subscribed" ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
              iconBg={pushState === "subscribed" ? "bg-primary/[0.12] border-primary/[0.20]" : "bg-white/[0.06] border-white/[0.10]"}
              iconColor={pushState === "subscribed" ? "text-primary" : "text-white/40"}
              title="Push Notifications"
              subtitle={
                pushState === "unsupported"
                  ? "Not supported on this browser"
                  : pushState === "denied"
                  ? "Blocked — enable in browser settings"
                  : pushState === "subscribed"
                  ? "You'll receive updates about your shows"
                  : "Get notified about your shows"
              }
              right={
                <Switch
                  checked={pushState === "subscribed"}
                  disabled={pushState === "unsupported" || pushState === "denied" || pushState === "loading"}
                  onCheckedChange={(checked) => {
                    if (checked) pushSubscribe();
                    else pushUnsubscribe();
                  }}
                />
              }
            />

            {/* Privacy — coming soon */}
            <GlassRow
              icon={<Lock className="h-4 w-4" />}
              iconBg="bg-white/[0.06] border-white/[0.10]"
              iconColor="text-white/35"
              title="Public Profile"
              subtitle="Allow others to see your show history"
              right={
                <span className="text-[11px] text-white/25 italic">Coming Soon</span>
              }
            />
          </GlassPanel>
        </div>

      </div>

      <FindFriendsSheet open={findFriendsOpen} onOpenChange={setFindFriendsOpen} />
    </>
  );
};

export default Profile;
