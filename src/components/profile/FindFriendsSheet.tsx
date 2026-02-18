import { Search, Loader2, UserPlus, UserCheck, Users } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
      <div className="flex-shrink-0 w-10 h-10 rounded-full overflow-hidden bg-primary/20 border border-white/10 flex items-center justify-center">
        {profile.avatar_url ? (
          <img src={profile.avatar_url} alt={profile.username ?? "User"} className="w-full h-full object-cover" />
        ) : (
          <span className="text-sm font-bold text-primary">{initials}</span>
        )}
      </div>

      {/* Name + username */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">
          {profile.full_name ?? profile.username ?? "Unknown"}
        </p>
        {profile.username && (
          <p className="text-xs text-muted-foreground truncate">@{profile.username}</p>
        )}
      </div>

      {/* Follow / Unfollow */}
      {isFollowing ? (
        <Button
          variant="outline"
          size="sm"
          onClick={onUnfollow}
          className="flex-shrink-0 gap-1.5 border-emerald-500/40 text-emerald-400 hover:bg-red-500/10 hover:border-red-500/40 hover:text-red-400 transition-colors"
        >
          <UserCheck className="h-3.5 w-3.5" />
          Following
        </Button>
      ) : (
        <Button
          size="sm"
          onClick={onFollow}
          className="flex-shrink-0 gap-1.5"
        >
          <UserPlus className="h-3.5 w-3.5" />
          Follow
        </Button>
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
      <SheetContent side="bottom" className="h-[85vh] flex flex-col rounded-t-2xl px-0">
        <SheetHeader className="px-6 pb-2">
          <SheetTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Find Friends
          </SheetTitle>
        </SheetHeader>

        {/* Search input */}
        <div className="px-6 pb-3">
          <div className="relative">
            {isSearching ? (
              <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
            ) : (
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            )}
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by username…"
              className="pl-9"
              autoFocus
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
            />
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto px-6 divide-y divide-white/[0.06]">

          {/* Prompt state */}
          {showPrompt && (
            <div className="flex flex-col items-center justify-center h-full gap-3 py-12 text-center">
              <div className="w-14 h-14 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Search className="h-6 w-6 text-primary/60" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground/70">Search for friends</p>
                <p className="text-xs text-muted-foreground mt-1">Enter a username to find people on Scene</p>
              </div>
            </div>
          )}

          {/* No results */}
          {showEmpty && (
            <div className="flex flex-col items-center justify-center h-full gap-3 py-12 text-center">
              <div className="w-14 h-14 rounded-full bg-white/[0.05] border border-white/10 flex items-center justify-center">
                <Users className="h-6 w-6 text-white/30" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground/70">No users found</p>
                <p className="text-xs text-muted-foreground mt-1">No one with username matching "{query}"</p>
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
