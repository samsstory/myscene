
# Social Follow Infrastructure + Friend Avatars on Calendar Ghost Tiles

## Status: ✅ COMPLETE

All layers implemented as of 2026-02-18.

---

## What Was Built

### Layer 1: Database ✅
- `public.followers` table with `follower_id`, `following_id`, unique constraint, CASCADE delete
- RLS: INSERT (own follows), DELETE (own follows), SELECT (both directions)
- Profile visibility policies for follower/following users
- `upcoming_shows` SELECT policy for followers to view followed users' plans
- `get_mutual_followers(_user_id)` SECURITY DEFINER function for Close Friends layer

### Layer 2: Hooks ✅
- `src/hooks/useFollowers.ts` — `following[]`, `followers[]`, `isFollowing()`, `follow()`, `unfollow()`
- `src/hooks/useFriendUpcomingShows.ts` — returns `Map<isoDate, FollowerProfile[]>` for O(1) calendar lookups

### Layer 3: UI ✅
- `src/components/Home.tsx` — micro-avatar stacks (max 2 + overflow badge) on ghost tiles
- `src/components/home/WhatsNextStrip.tsx` — mock data removed, real friend avatars per chip
- `src/components/home/FriendTeaser.tsx` — live follower count or "Find friends on Scene" CTA

---

## Architecture: Asymmetric Follow (Twitter-style)
- Anyone can follow anyone
- Close Friends (mutual-follow gate) ready via `get_mutual_followers()` — just needs UI gate

---

## What's NOT Done Yet (Next Steps)

1. **Find Friends UI** — A search sheet in Profile to discover users by username and follow them. Currently there's no entry point for following.
2. **Follow notifications** — Notify users when someone follows them
3. **Close Friends approval UI** — Use `get_mutual_followers()` to gate sensitive data sharing
4. **Public profile pages** — Shareable upcoming show calendars for curators/ambassadors
