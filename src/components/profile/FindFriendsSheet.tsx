import { Search, Loader2, UserPlus, UserCheck, Users, BookUser, Share2, PhoneCall } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useProfileSearch, type ProfileResult } from "@/hooks/useProfileSearch";
import { useFollowers } from "@/hooks/useFollowers";
import { useContactsLookup, contactsApiSupported } from "@/hooks/useContactsLookup";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface FindFriendsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ─── Shared profile row ────────────────────────────────────────────────────────
function ProfileRow({
  profile,
  isFollowing,
  onFollow,
  onUnfollow,
  subtitle,
}: {
  profile: ProfileResult;
  isFollowing: boolean;
  onFollow: () => void;
  onUnfollow: () => void;
  subtitle?: string;
}) {
  const initials = (profile.username ?? profile.full_name ?? "?")[0].toUpperCase();

  return (
    <div className="flex items-center gap-3 py-3 px-1">
      <div className="flex-shrink-0 w-10 h-10 rounded-full overflow-hidden bg-primary/[0.12] border border-primary/[0.20] flex items-center justify-center">
        {profile.avatar_url ? (
          <img src={profile.avatar_url} alt={profile.username ?? "User"} className="w-full h-full object-cover" />
        ) : (
          <span className="text-sm font-bold text-primary/80" style={{ textShadow: "0 0 8px rgba(255,255,255,0.2)" }}>
            {initials}
          </span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white/90 truncate">
          {profile.full_name ?? profile.username ?? "Unknown"}
        </p>
        <p className="text-xs text-white/35 truncate mt-0.5">
          {subtitle ?? (profile.username ? `@${profile.username}` : null)}
        </p>
      </div>

      {isFollowing ? (
        <button
          onClick={onUnfollow}
          className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.10] text-white/50 text-xs hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400 transition-all"
        >
          <UserCheck className="h-3.5 w-3.5" />
          Following
        </button>
      ) : (
        <button
          onClick={onFollow}
          className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/[0.12] border border-primary/[0.28] text-primary/90 text-xs font-medium hover:bg-primary/[0.20] transition-all"
        >
          <UserPlus className="h-3.5 w-3.5" />
          Follow
        </button>
      )}
    </div>
  );
}

// ─── Invite row (not-on-Scene contact) ────────────────────────────────────────
function InviteRow({ name, tel, referralCode }: { name: string; tel: string; referralCode: string | null }) {
  const inviteUrl = referralCode
    ? `${window.location.origin}/?ref=${referralCode}`
    : window.location.origin;

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join me on Scene",
          text: `Hey ${name}! I use Scene to track and rank every concert I go to. Join me — ${inviteUrl}`,
        });
      } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(inviteUrl);
      toast.success("Invite link copied!");
    }
  };

  const initials = name[0]?.toUpperCase() ?? "?";

  return (
    <div className="flex items-center gap-3 py-3 px-1">
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
        <span className="text-sm font-bold text-white/30">{initials}</span>
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white/60 truncate">{name}</p>
        <p className="text-xs text-white/25 mt-0.5">Not on Scene yet</p>
      </div>

      <button
        onClick={handleShare}
        className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white/45 text-xs hover:bg-white/[0.07] hover:text-white/65 transition-all"
      >
        <Share2 className="h-3.5 w-3.5" />
        Invite
      </button>
    </div>
  );
}

// ─── Section label ─────────────────────────────────────────────────────────────
function SectionDivider({ label }: { label: string }) {
  return (
    <p className="text-[10px] uppercase tracking-[0.2em] text-white/30 pt-4 pb-1 px-1">{label}</p>
  );
}

// ─── Phone number fallback (iOS / desktop) ─────────────────────────────────────
function PhoneLookup({
  onFound,
  onNotFound,
}: {
  onFound: (profile: ProfileResult) => void;
  onNotFound: (tel: string) => void;
}) {
  const [tel, setTel] = useState("");
  const [checking, setChecking] = useState(false);

  const handleCheck = async () => {
    const digits = tel.replace(/\D/g, "");
    if (digits.length < 7) return;
    setChecking(true);
    const { data } = await supabase
      .from("profiles")
      .select("id, username, full_name, avatar_url")
      .eq("phone_number", digits)
      .maybeSingle();
    setChecking(false);
    if (data) onFound(data as ProfileResult);
    else onNotFound(tel);
  };

  return (
    <div className="flex gap-2">
      <div className="relative flex-1">
        <PhoneCall className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
        <input
          type="tel"
          value={tel}
          onChange={(e) => setTel(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCheck()}
          placeholder="+1 (555) 000-0000"
          className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.10] text-white/80 placeholder:text-white/25 text-sm focus:outline-none focus:border-primary/40 transition-colors"
        />
      </div>
      <button
        onClick={handleCheck}
        disabled={checking || tel.replace(/\D/g, "").length < 7}
        className="px-4 py-2.5 rounded-xl bg-primary/[0.12] border border-primary/[0.28] text-primary/90 text-sm font-medium hover:bg-primary/[0.20] transition-all disabled:opacity-40"
      >
        {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : "Find"}
      </button>
    </div>
  );
}

// ─── Main sheet ────────────────────────────────────────────────────────────────
export default function FindFriendsSheet({ open, onOpenChange }: FindFriendsSheetProps) {
  const { results, isSearching, query, setQuery } = useProfileSearch();
  const { isFollowing, follow, unfollow } = useFollowers();
  const { state: contactsState, runNativeLookup, reset: resetContacts } = useContactsLookup();

  // Referral code for invite links
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [phoneLookupResult, setPhoneLookupResult] = useState<
    | { type: "found"; profile: ProfileResult }
    | { type: "not_found"; tel: string }
    | null
  >(null);

  // Load referral code once
  const loadReferral = async () => {
    if (referralCode) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("referral_code")
      .eq("id", user.id)
      .maybeSingle();
    if (data?.referral_code) setReferralCode(data.referral_code);
  };

  const handleOpen = (v: boolean) => {
    if (v) loadReferral();
    else {
      resetContacts();
      setPhoneLookupResult(null);
      setQuery("");
    }
    onOpenChange(v);
  };

  const showSearchPrompt = query.length < 2 && !isSearching && contactsState.status === "idle" && !phoneLookupResult;
  const showEmpty = query.length >= 2 && !isSearching && results.length === 0;
  const showContacts = contactsState.status === "done";

  return (
    <Sheet open={open} onOpenChange={handleOpen}>
      <SheetContent
        side="bottom"
        className="max-h-[80dvh] flex flex-col rounded-t-2xl px-0 bg-background/80 backdrop-blur-xl border-t border-white/[0.08] overflow-x-hidden w-full"
      >
        {/* Header */}
        <div className="px-4 pt-2 pb-4 border-b border-white/[0.06] w-full box-border space-y-3">
          <p className="text-[11px] uppercase tracking-[0.2em] font-semibold text-white/50" style={{ textShadow: "0 0 8px rgba(255,255,255,0.2)" }}>
            Find Friends
          </p>

          {/* Name/username search */}
          <div className="relative w-full">
            {isSearching ? (
              <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30 animate-spin" />
            ) : (
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
            )}
            <input
              value={query}
              onChange={(e) => { setQuery(e.target.value); resetContacts(); setPhoneLookupResult(null); }}
              placeholder="Search by name or @username…"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              className="w-full box-border pl-9 pr-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.10] text-white/80 placeholder:text-white/25 text-sm focus:outline-none focus:border-primary/40 transition-colors"
            />
          </div>

          {/* Contacts CTA — show native picker on Android Chrome, phone fallback otherwise */}
          {query.length === 0 && contactsState.status !== "done" && (
            contactsApiSupported ? (
              <button
                onClick={runNativeLookup}
                disabled={contactsState.status === "loading"}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.10] text-white/60 text-sm hover:bg-white/[0.07] hover:text-white/80 transition-all disabled:opacity-50"
              >
                {contactsState.status === "loading" ? (
                  <><Loader2 className="h-4 w-4 animate-spin" />Checking contacts…</>
                ) : (
                  <><BookUser className="h-4 w-4" />Find from Contacts</>
                )}
              </button>
            ) : (
              <div className="space-y-1.5">
                <p className="text-[10px] uppercase tracking-[0.15em] text-white/30 px-1">Find by phone number</p>
                <PhoneLookup
                  onFound={(profile) => { setPhoneLookupResult({ type: "found", profile }); }}
                  onNotFound={(tel) => { setPhoneLookupResult({ type: "not_found", tel }); }}
                />
              </div>
            )
          )}
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto px-4 divide-y divide-white/[0.05]">

          {/* Search results */}
          {query.length >= 2 && results.map((profile) => (
            <ProfileRow
              key={profile.id}
              profile={profile}
              isFollowing={isFollowing(profile.id)}
              onFollow={() => follow(profile.id)}
              onUnfollow={() => unfollow(profile.id)}
            />
          ))}

          {/* Empty search state */}
          {showEmpty && (
            <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
              <div className="w-12 h-12 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
                <Users className="h-5 w-5 text-white/25" />
              </div>
              <div>
                <p className="text-sm font-medium text-white/50">No users found</p>
                <p className="text-xs text-white/30 mt-1">No one matching "{query}"</p>
              </div>
            </div>
          )}

          {/* Phone lookup result */}
          {phoneLookupResult && query.length === 0 && (
            phoneLookupResult.type === "found" ? (
              <>
                <SectionDivider label="On Scene" />
                <ProfileRow
                  profile={phoneLookupResult.profile}
                  isFollowing={isFollowing(phoneLookupResult.profile.id)}
                  onFollow={() => follow(phoneLookupResult.profile.id)}
                  onUnfollow={() => unfollow(phoneLookupResult.profile.id)}
                  subtitle="Matched by phone number"
                />
              </>
            ) : (
              <div className="flex flex-col items-center gap-3 py-10 text-center">
                <p className="text-sm text-white/50">That number isn't on Scene yet</p>
                <button
                  onClick={async () => {
                    const url = referralCode ? `${window.location.origin}/?ref=${referralCode}` : window.location.origin;
                    if (navigator.share) {
                      await navigator.share({ title: "Join me on Scene", text: `Join me on Scene — ${url}` });
                    } else {
                      await navigator.clipboard.writeText(url);
                      toast.success("Invite link copied!");
                    }
                  }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white/50 text-sm hover:bg-white/[0.07] transition-all"
                >
                  <Share2 className="h-4 w-4" />
                  Send them an invite
                </button>
              </div>
            )
          )}

          {/* Contacts API results */}
          {showContacts && contactsState.result.onScene.length === 0 && contactsState.result.notOnScene.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <p className="text-sm text-white/50">No selected contacts are on Scene yet</p>
              <p className="text-xs text-white/30">Try inviting them below once you add a phone number to their contact</p>
            </div>
          )}

          {showContacts && contactsState.result.onScene.length > 0 && (
            <>
              <SectionDivider label={`On Scene · ${contactsState.result.onScene.length}`} />
              {contactsState.result.onScene.map(({ profile, contactName }) => (
                <ProfileRow
                  key={profile.id}
                  profile={profile}
                  isFollowing={isFollowing(profile.id)}
                  onFollow={() => follow(profile.id)}
                  onUnfollow={() => unfollow(profile.id)}
                  subtitle={`Saved as ${contactName}`}
                />
              ))}
            </>
          )}

          {showContacts && contactsState.result.notOnScene.length > 0 && (
            <>
              <SectionDivider label={`Not on Scene yet · ${contactsState.result.notOnScene.length}`} />
              {contactsState.result.notOnScene.map(({ name, tel }) => (
                <InviteRow key={tel} name={name} tel={tel} referralCode={referralCode} />
              ))}
            </>
          )}

          {/* Default prompt */}
          {showSearchPrompt && (
            <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
              <div className="w-14 h-14 rounded-full bg-primary/[0.08] border border-primary/[0.15] flex items-center justify-center">
                <Search className="h-6 w-6 text-primary/50" />
              </div>
              <div>
                <p className="text-sm font-medium text-white/50">Find your people</p>
                <p className="text-xs text-white/30 mt-1">Search by name, username, or import from contacts</p>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
