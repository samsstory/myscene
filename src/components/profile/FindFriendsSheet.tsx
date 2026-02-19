import { Search, Loader2, UserPlus, UserCheck, Users } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useProfileSearch, type ProfileResult } from "@/hooks/useProfileSearch";
import { useFollowers } from "@/hooks/useFollowers";

interface FindFriendsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function ProfileRow({ profile, isFollowing, onFollow, onUnfollow }: {
  profile: ProfileResult;
  isFollowing: boolean;
  onFollow: () => void;
  onUnfollow: () => void;
}) {
  const initials = (profile.username ?? profile.full_name ?? "?")[0].toUpperCase();

  return (
    <div className="flex items-center gap-3 py-3 px-1">
      {/* Avatar */}
      <div className="flex-shrink-0 w-10 h-10 rounded-full overflow-hidden bg-primary/[0.12] border border-primary/[0.20] flex items-center justify-center">
        {profile.avatar_url ? (
          <img src={profile.avatar_url} alt={profile.username ?? "User"} className="w-full h-full object-cover" />
        ) : (
          <span
            className="text-sm font-bold text-primary/80"
            style={{ textShadow: "0 0 8px rgba(255,255,255,0.2)" }}
          >
            {initials}
          </span>
        )}
      </div>

      {/* Name + username */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white/90 truncate">
          {profile.full_name ?? profile.username ?? "Unknown"}
        </p>
        {profile.username && (
          <p className="text-xs text-white/35 truncate mt-0.5">@{profile.username}</p>
        )}
      </div>

      {/* Follow / Unfollow */}
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

export default function FindFriendsSheet({ open, onOpenChange }: FindFriendsSheetProps) {
  const { results, isSearching, query, setQuery } = useProfileSearch();
  const { isFollowing, follow, unfollow } = useFollowers();

  const showEmpty = query.length >= 2 && !isSearching && results.length === 0;
  const showPrompt = query.length < 2 && !isSearching;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[85dvh] flex flex-col rounded-t-2xl px-0 bg-background/80 backdrop-blur-xl border-t border-white/[0.08]"
      >
        {/* Header */}
        <div className="px-6 pt-2 pb-4 border-b border-white/[0.06]">
          <p
            className="text-[11px] uppercase tracking-[0.2em] font-semibold text-white/50 mb-4"
            style={{ textShadow: "0 0 8px rgba(255,255,255,0.2)" }}
          >
            Find Friends
          </p>

          {/* Search input */}
          <div className="relative">
            {isSearching ? (
              <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30 animate-spin" />
            ) : (
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
            )}
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or @username…"
              
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.10] text-white/80 placeholder:text-white/25 text-sm focus:outline-none focus:border-primary/40 transition-colors"
            />
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto px-6 divide-y divide-white/[0.05]">

          {/* Prompt state */}
          {showPrompt && (
            <div className="flex flex-col items-center justify-center h-full gap-3 py-12 text-center">
              <div className="w-14 h-14 rounded-full bg-primary/[0.08] border border-primary/[0.15] flex items-center justify-center">
                <Search className="h-6 w-6 text-primary/50" />
              </div>
              <div>
                <p className="text-sm font-medium text-white/50">Search for friends</p>
                <p className="text-xs text-white/30 mt-1">Enter a name or @username to find people on Scene</p>
              </div>
            </div>
          )}

          {/* No results */}
          {showEmpty && (
            <div className="flex flex-col items-center justify-center h-full gap-3 py-12 text-center">
              <div className="w-14 h-14 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
                <Users className="h-6 w-6 text-white/25" />
              </div>
              <div>
                <p className="text-sm font-medium text-white/50">No users found</p>
                <p className="text-xs text-white/30 mt-1">No one matching "{query}"</p>
              </div>
            </div>
          )}

          {/* Result rows */}
          {results.map((profile) => (
            <ProfileRow
              key={profile.id}
              profile={profile}
              isFollowing={isFollowing(profile.id)}
              onFollow={() => follow(profile.id)}
              onUnfollow={() => unfollow(profile.id)}
            />
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
