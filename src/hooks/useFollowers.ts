import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface FollowerProfile {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
}

interface UseFollowersReturn {
  following: FollowerProfile[];
  followers: FollowerProfile[];
  isFollowing: (userId: string) => boolean;
  follow: (userId: string) => Promise<void>;
  unfollow: (userId: string) => Promise<void>;
  isLoading: boolean;
}

export function useFollowers(): UseFollowersReturn {
  const [following, setFollowing] = useState<FollowerProfile[]>([]);
  const [followers, setFollowers] = useState<FollowerProfile[]>([]);
  const [followingSet, setFollowingSet] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setIsLoading(false); return; }

      // Fetch both directions in parallel
      const [followingRes, followersRes] = await Promise.all([
        supabase.from("followers").select("following_id").eq("follower_id", user.id),
        supabase.from("followers").select("follower_id").eq("following_id", user.id),
      ]);

      if (cancelled) return;

      const followingIds = (followingRes.data ?? []).map((r: any) => r.following_id);
      const followerIds  = (followersRes.data ?? []).map((r: any) => r.follower_id);

      const allIds = [...new Set([...followingIds, ...followerIds])];

      let profileMap = new Map<string, FollowerProfile>();
      if (allIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, username, full_name, avatar_url")
          .in("id", allIds);

        if (!cancelled) {
          for (const p of (profiles ?? [])) {
            profileMap.set(p.id, p as FollowerProfile);
          }
        }
      }

      if (cancelled) return;

      const followingProfiles = followingIds.map((id: string) => profileMap.get(id)).filter(Boolean) as FollowerProfile[];
      const followerProfiles  = followerIds.map((id: string) => profileMap.get(id)).filter(Boolean) as FollowerProfile[];

      setFollowing(followingProfiles);
      setFollowingSet(new Set(followingProfiles.map(p => p.id)));
      setFollowers(followerProfiles);
      setIsLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, []);

  const isFollowing = useCallback(
    (userId: string) => followingSet.has(userId),
    [followingSet]
  );

  const follow = useCallback(async (userId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Optimistic update
    setFollowingSet(prev => new Set([...prev, userId]));

    const { error } = await supabase
      .from("followers")
      .insert({ follower_id: user.id, following_id: userId });

    if (error) {
      // Rollback
      setFollowingSet(prev => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
      console.error("Follow error:", error);
    }
  }, []);

  const unfollow = useCallback(async (userId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Optimistic update
    setFollowingSet(prev => {
      const next = new Set(prev);
      next.delete(userId);
      return next;
    });
    setFollowing(prev => prev.filter(p => p.id !== userId));

    const { error } = await supabase
      .from("followers")
      .delete()
      .eq("follower_id", user.id)
      .eq("following_id", userId);

    if (error) {
      console.error("Unfollow error:", error);
    }
  }, []);

  return { following, followers, isFollowing, follow, unfollow, isLoading };
}
