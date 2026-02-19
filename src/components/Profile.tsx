import { useState, useEffect, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { LogOut, Camera, Loader2, Share2, Users, Sparkles, Navigation, Download, Bell, BellOff, UserSearch, ChevronRight, Lock, Trophy, Music2, Star } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { usePushSubscription } from "@/hooks/usePushSubscription";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import WelcomeCarousel from "@/components/onboarding/WelcomeCarousel";
import { useFollowers } from "@/hooks/useFollowers";
import FindFriendsSheet from "@/components/profile/FindFriendsSheet";
import { format, parseISO } from "date-fns";
import { motion } from "framer-motion";

// ─── Design system helpers ────────────────────────────────────────────────────
const SectionLabel = ({ children }: {children: React.ReactNode;}) =>
<p
  className="text-[11px] uppercase tracking-[0.2em] font-semibold text-white/50 mb-3"
  style={{ textShadow: "0 0 8px rgba(255,255,255,0.2)" }}>

    {children}
  </p>;


const GlassPanel = ({ children, className = "" }: {children: React.ReactNode;className?: string;}) =>
<div className={`rounded-2xl bg-white/[0.04] backdrop-blur-md border border-white/[0.07] px-5 py-4 ${className}`}>
    {children}
  </div>;


const GlassRow = ({
  icon, iconBg = "bg-primary/[0.12] border-primary/[0.20]", iconColor = "text-primary",
  title, subtitle, right, onClick, chevron = false




}: {icon: React.ReactNode;iconBg?: string;iconColor?: string;title: string;subtitle?: string;right?: React.ReactNode;onClick?: () => void;chevron?: boolean;}) => {
  const inner =
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
    </div>;

  if (onClick) return (
    <button onClick={onClick} className="w-full flex items-center gap-3 px-1 py-3 rounded-xl hover:bg-white/[0.04] transition-all">{inner}</button>);

  return <div className="w-full flex items-center gap-3 px-1 py-3">{inner}</div>;
};

// ─── Trophy card ─────────────────────────────────────────────────────────────
const MEDAL_COLORS = ["#FFD700", "#C0C0C0", "#CD7F32"]; // gold, silver, bronze

interface TrophyShow {
  id: string;
  artistName: string;
  artistImageUrl: string | null;
  venueName: string;
  showDate: string;
  photoUrl: string | null;
  rank: number;
  eloScore: number;
}

function TrophyCard({ show, index }: {show: TrophyShow;index: number;}) {
  const medalColor = MEDAL_COLORS[index] ?? "rgba(255,255,255,0.3)";
  const isTop3 = index < 3;

  const dateLabel = (() => {
    try {return format(parseISO(show.showDate), "MMM yyyy");} catch {return "";}
  })();

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.06, ease: "easeOut" }}
      className="relative flex-shrink-0 w-40 h-52 rounded-2xl overflow-hidden"
      style={{
        boxShadow: isTop3 ?
        `0 0 0 1.5px ${medalColor}55, 0 8px 24px rgba(0,0,0,0.5)` :
        "0 4px 16px rgba(0,0,0,0.4)"
      }}>

      {/* Background */}
      {show.photoUrl || show.artistImageUrl ?
      <>
          <img
          src={show.photoUrl ?? show.artistImageUrl!}
          alt={show.artistName}
          className="absolute inset-0 w-full h-full object-cover scale-110"
          style={{ filter: "blur(2px)" }} />

          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-black/10" />
        </> :

      <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-primary/10 to-transparent" />
      }

      {/* Rank badge — top left */}
      <div
        className="absolute top-2.5 left-2.5 w-8 h-8 rounded-full flex items-center justify-center"
        style={{
          background: isTop3 ? `${medalColor}22` : "rgba(255,255,255,0.08)",
          border: `1.5px solid ${isTop3 ? medalColor : "rgba(255,255,255,0.15)"}`,
          boxShadow: isTop3 ? `0 0 10px ${medalColor}55` : "none"
        }}>

        <span
          className="text-[11px] font-black leading-none"
          style={{ color: isTop3 ? medalColor : "rgba(255,255,255,0.5)" }}>

          #{show.rank}
        </span>
      </div>

      {/* Trophy icon for #1 */}
      {index === 0 &&
      <div className="absolute top-2.5 right-2.5">
          <Trophy className="h-4 w-4" style={{ color: medalColor, filter: `drop-shadow(0 0 6px ${medalColor})` }} />
        </div>
      }

      {/* Info */}
      <div className="absolute bottom-0 left-0 right-0 p-3">
        <p
          className="text-xs font-bold text-white leading-tight line-clamp-2"
          style={{ textShadow: "0 1px 6px rgba(0,0,0,0.9)" }}>

          {show.artistName}
        </p>
        <p className="text-[10px] text-white/55 mt-1 line-clamp-1" style={{ textShadow: "0 1px 4px rgba(0,0,0,0.9)" }}>
          {show.venueName}
        </p>
        <p className="text-[10px] text-white/40 mt-0.5">{dateLabel}</p>
      </div>
    </motion.div>);

}

// ─── Trophy shelf ─────────────────────────────────────────────────────────────
function TrophyShelf({ userId }: {userId: string;}) {
  const [shows, setShows] = useState<TrophyShow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      // Fetch rankings sorted by ELO desc
      const { data: rankings } = await supabase.
      from("show_rankings").
      select("show_id, elo_score, comparisons_count").
      eq("user_id", userId).
      gt("comparisons_count", 0).
      order("elo_score", { ascending: false }).
      limit(8);

      if (cancelled || !rankings?.length) {setLoading(false);return;}

      const showIds = rankings.map((r) => r.show_id);

      const [showsRes, artistsRes] = await Promise.all([
      supabase.from("shows").select("id, venue_name, show_date, photo_url").in("id", showIds),
      supabase.from("show_artists").select("show_id, artist_name, artist_image_url, is_headliner").in("show_id", showIds)]
      );

      if (cancelled) return;

      const showMap = new Map((showsRes.data ?? []).map((s) => [s.id, s]));
      const artistMap = new Map<string, {name: string;image: string | null;}>();
      for (const a of artistsRes.data ?? []) {
        if (!artistMap.has(a.show_id) || a.is_headliner) {
          artistMap.set(a.show_id, { name: a.artist_name, image: a.artist_image_url });
        }
      }

      const result: TrophyShow[] = rankings.
      map((r, idx) => {
        const s = showMap.get(r.show_id);
        const a = artistMap.get(r.show_id);
        if (!s || !a) return null;
        return {
          id: r.show_id,
          artistName: a.name,
          artistImageUrl: a.image,
          venueName: s.venue_name,
          showDate: s.show_date,
          photoUrl: s.photo_url,
          rank: idx + 1,
          eloScore: r.elo_score
        };
      }).
      filter(Boolean) as TrophyShow[];

      if (!cancelled) {setShows(result);setLoading(false);}
    }
    load();
    return () => {cancelled = true;};
  }, [userId]);

  if (loading) {
    return (
      <div className="flex gap-3 overflow-hidden">
        {[1, 2, 3].map((i) =>
        <div key={i} className="flex-shrink-0 w-40 h-52 rounded-2xl bg-white/[0.05] animate-pulse" />
        )}
      </div>);

  }

  if (shows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/[0.10] bg-white/[0.02] py-10 flex flex-col items-center gap-2.5 text-center">
        <div className="w-10 h-10 rounded-full bg-white/[0.06] border border-white/[0.10] flex items-center justify-center">
          <Star className="h-5 w-5 text-white/25" />
        </div>
        <p className="text-sm font-medium text-white/35">No ranked shows yet</p>
        <p className="text-xs text-white/20 max-w-[180px]">Start comparing shows in the Rank tab to build your trophy shelf</p>
      </div>);

  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-1 -mx-4 px-4" style={{ scrollbarWidth: "none" }}>
      {shows.map((show, i) =>
      <TrophyCard key={show.id} show={show} index={i} />
      )}
    </div>);

}

// ─── Main Profile component ───────────────────────────────────────────────────
const Profile = ({ onStartTour, onAddShow }: {onStartTour?: () => void;onAddShow?: () => void;}) => {
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
  const [referralRank, setReferralRank] = useState<{rank: number;total: number;} | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [totalShows, setTotalShows] = useState(0);

  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [bio, setBio] = useState("");

  useEffect(() => {fetchProfile();}, []);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {navigate("/auth");return;}
      setEmail(user.email || "");
      setUserId(user.id);

      const [profileRes, showCountRes, rankRes] = await Promise.all([
      supabase.from("profiles").select("avatar_url, referral_code, username, full_name, phone_number, bio").eq("id", user.id).single(),
      supabase.from("shows").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.rpc("get_referral_rank", { _user_id: user.id })]
      );

      if (profileRes.data) {
        setAvatarUrl(profileRes.data.avatar_url);
        setReferralCode(profileRes.data.referral_code);
        setUsername(profileRes.data.username || "");
        setFullName(profileRes.data.full_name || "");
        setPhoneNumber((profileRes.data as any).phone_number || "");
        setBio((profileRes.data as any).bio || "");
      }
      if (!showCountRes.error && showCountRes.count !== null) setTotalShows(showCountRes.count);
      if (rankRes.data?.[0]) {
        const row = rankRes.data[0];
        setReferralCount(Number(row.invite_count));
        if (Number(row.invite_count) > 0) {
          setReferralRank({ rank: Number(row.user_rank), total: Number(row.total_inviters) });
        }
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
    if (!["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Please upload a JPG, PNG, or WEBP image");return;
    }
    if (file.size > 5 * 1024 * 1024) {toast.error("Image must be smaller than 5MB");return;}
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const fileExt = file.name.split(".").pop();
      const filePath = `${user.id}/avatar.${fileExt}`;
      await supabase.storage.from("show-photos").upload(filePath, file, { upsert: true });
      const { data: { publicUrl } } = supabase.storage.from("show-photos").getPublicUrl(filePath);
      await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("id", user.id);
      setAvatarUrl(publicUrl);
      toast.success("Profile picture updated!");
    } catch {toast.error("Failed to upload profile picture");} finally
    {setUploading(false);}
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
      await supabase.from("profiles").update({
        username: username.trim() || null,
        full_name: fullName.trim() || null,
        phone_number: phoneNumber.trim() || null,
        bio: bio.trim() || null
      } as any).eq("id", user.id);
      if (email !== user.email) {
        await supabase.auth.updateUser({ email });
        toast.success("Profile updated! Check your email to confirm the new address.");
      } else {
        toast.success("Profile updated! 🎉");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to update profile");
    } finally {setSaving(false);}
  };

  const shareInviteLink = async () => {
    if (!referralCode) return;
    const url = `${window.location.origin}/?ref=${referralCode}`;
    const shareData = {
      title: "Join me on Scene",
      text: "I track every concert I go to and rank them. Come compare notes with me on Scene 🎶",
      url
    };
    if (navigator.share && navigator.canShare?.(shareData)) {
      try {
        await navigator.share(shareData);
      } catch {/* cancelled */}
    } else {
      await navigator.clipboard.writeText(url);
      toast.success("Invite link copied!");
    }
  };

  const displayName = fullName || username || email.split("@")[0];

  return (
    <>
      {showWelcomeCarousel &&
      <WelcomeCarousel onComplete={() => {setShowWelcomeCarousel(false);onAddShow?.();}} />
      }

      <div className="space-y-6 max-w-2xl mx-auto pb-8">

        {/* ── Hero identity row ── */}
        <div className="flex items-center gap-4 pt-2">
          {/* Avatar */}
          <div className="relative group flex-shrink-0">
            <div className="w-20 h-20 rounded-full overflow-hidden bg-white/[0.05] border-2 border-white/[0.12] flex items-center justify-center">
              {loading ?
              <Loader2 className="h-7 w-7 animate-spin text-white/30" /> :
              avatarUrl ?
              <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" /> :

              <span className="text-2xl text-white/30 select-none" style={{ textShadow: "0 0 12px rgba(255,255,255,0.3)" }}>✦</span>
              }
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="absolute inset-0 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">

              {uploading ? <Loader2 className="h-5 w-5 animate-spin text-white" /> : <Camera className="h-5 w-5 text-white" />}
            </button>
          </div>

          {/* Name + stats */}
          <div className="flex-1 min-w-0">
            <p className="text-lg font-bold text-white/90 leading-tight truncate" style={{ textShadow: "0 0 12px rgba(255,255,255,0.2)" }}>
              {displayName}
            </p>
            {username && fullName &&
            <p className="text-xs text-white/35 mt-0.5">@{username}</p>
            }
            {bio &&
            <p className="text-xs text-white/50 mt-1.5 leading-relaxed line-clamp-2">{bio}</p>
            }
            {/* Micro stats */}
            <div className="flex items-center gap-3 mt-2">
              <div className="text-center">
                <p className="text-sm font-bold text-white/80" style={{ textShadow: "0 0 10px rgba(255,255,255,0.2)" }}>{totalShows}</p>
                <p className="text-[9px] uppercase tracking-[0.15em] text-white/35">Shows</p>
              </div>
              <div className="w-px h-6 bg-white/10" />
              <div className="text-center">
                <p className="text-sm font-bold text-white/80" style={{ textShadow: "0 0 10px rgba(255,255,255,0.2)" }}>{following.length}</p>
                <p className="text-[9px] uppercase tracking-[0.15em] text-white/35">Following</p>
              </div>
              <div className="w-px h-6 bg-white/10" />
              <div className="text-center">
                <p className="text-sm font-bold text-white/80" style={{ textShadow: "0 0 10px rgba(255,255,255,0.2)" }}>{followers.length}</p>
                <p className="text-[9px] uppercase tracking-[0.15em] text-white/35">Followers</p>
              </div>
            </div>
          </div>

        </div>

        <Input ref={fileInputRef} type="file" accept=".jpg,.jpeg,.png,.webp" className="hidden" onChange={handleAvatarUpload} />

        {/* ── Trophy Shelf ── */}
        <div>
          <SectionLabel>Trophy Shelf</SectionLabel>
          {userId ?
          <TrophyShelf userId={userId} /> :

          <div className="flex gap-3 overflow-hidden">
              {[1, 2, 3].map((i) => <div key={i} className="flex-shrink-0 w-40 h-52 rounded-2xl bg-white/[0.05] animate-pulse" />)}
            </div>
          }
        </div>

        {/* ── Friends on Scene ── */}
        <div>
          <SectionLabel>Friends on Scene</SectionLabel>
          <GlassPanel className="space-y-3">
            <button
              onClick={() => setFindFriendsOpen(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.10] text-white/70 text-sm hover:bg-white/[0.07] hover:text-white/90 transition-all">

              <UserSearch className="h-4 w-4" />
              Find Friends by Name or Username
            </button>
            {following.length === 0 &&
            <p className="text-xs text-white/30 text-center">Follow friends to see their upcoming shows on your calendar</p>
            }
          </GlassPanel>
        </div>

        {/* ── Invite ── */}
        <div>
          <SectionLabel>Invite your squad</SectionLabel>
          {/* Hero invite card */}
          <div className="relative overflow-hidden rounded-2xl border border-primary/[0.25] bg-gradient-to-br from-primary/[0.15] via-primary/[0.08] to-transparent p-5">
            {/* Glow blob */}
            <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full bg-primary/[0.20] blur-2xl pointer-events-none" />

            <div className="relative space-y-3">
              <div className="space-y-1">
                <p className="text-base font-bold text-white/90" style={{ textShadow: "0 0 12px rgba(255,255,255,0.2)" }}>Recruit your crew
 to Scene
                </p>
                <p className="text-xs text-white/50 leading-relaxed">
                  The more friends who log shows, the better the compare game gets.
                </p>
              </div>

              {/* Stats row */}
              {referralCount > 0 &&
              <div className="flex items-stretch gap-2">
                  <div className="flex-1 flex flex-col items-center justify-center py-2.5 px-3 rounded-xl bg-white/[0.04] border border-white/[0.08]">
                    <span className="text-xl font-black text-white/90" style={{ textShadow: "0 0 12px rgba(255,255,255,0.3)" }}>
                      {referralCount}
                    </span>
                    <span className="text-[9px] uppercase tracking-[0.15em] text-white/35 mt-0.5">
                      {referralCount === 1 ? "Friend" : "Friends"} Recruited
                    </span>
                  </div>
                  {referralRank &&
                <div className="flex-1 flex flex-col items-center justify-center py-2.5 px-3 rounded-xl bg-primary/[0.08] border border-primary/[0.18]">
                      <span className="text-xl font-black text-primary" style={{ filter: "drop-shadow(0 0 8px hsl(var(--primary)/0.6))" }}>
                        #{referralRank.rank}
                      </span>
                      <span className="text-[9px] uppercase tracking-[0.15em] text-primary/50 mt-0.5">
                        All Time
                      </span>
                    </div>
                }
                </div>
              }

              <button
                onClick={shareInviteLink}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary/[0.18] border border-primary/[0.35] text-primary font-semibold text-sm hover:bg-primary/[0.28] active:scale-95 transition-all shadow-[0_0_16px_hsl(var(--primary)/0.25)]">

                <Share2 className="h-4 w-4" />
                Invite your squad
              </button>
            </div>
          </div>
        </div>

        {/* ── Explore ── */}
        <div>
          <SectionLabel>Explore</SectionLabel>
          <GlassPanel className="divide-y divide-white/[0.05]">
            <GlassRow icon={<Sparkles className="h-4 w-4" />} title="Welcome to Scene" subtitle="View the intro again" chevron onClick={() => setShowWelcomeCarousel(true)} />
            <GlassRow icon={<Navigation className="h-4 w-4" />} iconBg="bg-secondary/[0.15] border-secondary/[0.25]" iconColor="text-secondary" title="Interactive Tour" subtitle="Learn your way around" chevron onClick={() => onStartTour?.()} />
            <GlassRow icon={<Download className="h-4 w-4" />} iconBg="bg-accent/[0.12] border-accent/[0.20]" iconColor="text-accent" title="Install App" subtitle="Add SCENE to your home screen" chevron onClick={() => navigate("/install")} />
          </GlassPanel>
        </div>

        {/* ── Settings ── */}
        <div>
          <SectionLabel>Account</SectionLabel>
          <GlassPanel>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] uppercase tracking-wider text-white/40">Username</label>
                <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Your username" className="bg-white/[0.04] border-white/[0.10] text-white/80 placeholder:text-white/25 focus:border-primary/40" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] uppercase tracking-wider text-white/40">Full Name</label>
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your full name" className="bg-white/[0.04] border-white/[0.10] text-white/80 placeholder:text-white/25 focus:border-primary/40" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] uppercase tracking-wider text-white/40">Bio</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell the scene what you're about…"
                  maxLength={160}
                  rows={3}
                  className="w-full rounded-md bg-white/[0.04] border border-white/[0.10] text-white/80 placeholder:text-white/25 focus:border-primary/40 focus:outline-none px-3 py-2 text-sm resize-none transition-colors" />

                <p className="text-[10px] text-white/25 text-right">{bio.length}/160</p>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] uppercase tracking-wider text-white/40">Email</label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" className="bg-white/[0.04] border-white/[0.10] text-white/80 placeholder:text-white/25 focus:border-primary/40" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] uppercase tracking-wider text-white/40">Phone Number</label>
                <Input type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="+1 (555) 000-0000" className="bg-white/[0.04] border-white/[0.10] text-white/80 placeholder:text-white/25 focus:border-primary/40" />
              </div>
              <button
                type="submit"
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary/[0.12] border border-primary/[0.28] text-primary/90 text-sm font-medium hover:bg-primary/[0.20] transition-all disabled:opacity-50">

                {saving ? <><Loader2 className="h-4 w-4 animate-spin" />Saving…</> : "Update Profile"}
              </button>
            </form>
          </GlassPanel>
        </div>

        <div>
          <SectionLabel>Settings</SectionLabel>
          <GlassPanel className="divide-y divide-white/[0.05]">
            <GlassRow
              icon={pushState === "subscribed" ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
              iconBg={pushState === "subscribed" ? "bg-primary/[0.12] border-primary/[0.20]" : "bg-white/[0.06] border-white/[0.10]"}
              iconColor={pushState === "subscribed" ? "text-primary" : "text-white/40"}
              title="Push Notifications"
              subtitle={
              pushState === "unsupported" ? "Not supported on this browser" :
              pushState === "denied" ? "Blocked — enable in browser settings" :
              pushState === "subscribed" ? "You'll receive updates about your shows" :
              "Get notified about your shows"
              }
              right={
              <Switch
                checked={pushState === "subscribed"}
                disabled={pushState === "unsupported" || pushState === "denied" || pushState === "loading"}
                onCheckedChange={(checked) => {if (checked) pushSubscribe();else pushUnsubscribe();}} />

              } />

            <GlassRow
              icon={<Lock className="h-4 w-4" />}
              iconBg="bg-white/[0.06] border-white/[0.10]"
              iconColor="text-white/35"
              title="Public Profile"
              subtitle="Allow others to see your show history"
              right={<span className="text-[11px] text-white/25 italic">Coming Soon</span>} />

          </GlassPanel>
        </div>

        {/* Sign Out */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white/40 text-sm hover:bg-white/[0.07] hover:text-white/60 transition-all">

          <LogOut className="h-4 w-4" />
          Sign Out
        </button>

      </div>

      <FindFriendsSheet open={findFriendsOpen} onOpenChange={setFindFriendsOpen} />
    </>);

};

export default Profile;