
# Social Follow Infrastructure + Friend Avatars on Calendar Ghost Tiles

## What We're Building

Three interconnected layers:

1. **Database** — A `followers` table with proper RLS and a helper DB function for mutual-follow checks
2. **Follow/Unfollow Hook** — A `useFollowers` hook exposing follow, unfollow, and follower list data
3. **Calendar Integration** — Wire real friend avatar stacks onto ghost tiles in the calendar, replacing the mock data currently used in `WhatsNextStrip`

---

## Current State

- `WhatsNextStrip.tsx` has `getMockFriends()` with hard-coded `pravatar.cc` URLs and a comment `// Mock friend avatars — replace with real friend data when social layer ships`
- `FriendTeaser.tsx` shows a static `"Friends coming soon"` label
- Calendar ghost tiles (`Home.tsx` lines 792–828) render RSVP dots and artist images but have **no friend presence** at all
- `profiles` table has `id`, `username`, `full_name`, and `avatar_url` — all we need for friend avatars
- No `followers` table exists yet

---

## Architecture Decision: Asymmetric Follow (Not Mutual-Only)

Based on the "Follow + Close Friends" hybrid model stored in memory, we start with **asymmetric following** (Twitter-style):

- Anyone can follow any other user
- A "close friends" layer (mutual follows) can be added later without schema changes — we just need to check if `follower_id` and `following_id` both exist in each direction

---

## Layer 1: Database

### New Table: `public.followers`

```sql
CREATE TABLE public.followers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (follower_id, following_id)
);

ALTER TABLE public.followers ENABLE ROW LEVEL SECURITY;
```

### RLS Policies

| Policy | Command | Rule |
|--------|---------|------|
| Users can follow others | INSERT | `auth.uid() = follower_id` |
| Users can unfollow | DELETE | `auth.uid() = follower_id` |
| Users can see who they follow | SELECT | `auth.uid() = follower_id` |
| Users can see their followers | SELECT | `auth.uid() = following_id` |

Two SELECT policies (permissive) cover both directions — you can see who you follow AND who follows you.

### Helper DB Function: `get_mutual_followers(user_id uuid)`

A `SECURITY DEFINER` function that returns profile rows for users who **mutually follow** the given user. This is used later for the "Close Friends" layer and avoids RLS complexity in application code:

```sql
CREATE OR REPLACE FUNCTION public.get_mutual_followers(_user_id uuid)
RETURNS TABLE(profile_id uuid, username text, full_name text, avatar_url text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.username, p.full_name, p.avatar_url
  FROM followers f1
  JOIN followers f2 ON f2.follower_id = f1.following_id AND f2.following_id = f1.follower_id
  JOIN profiles p ON p.id = f1.following_id
  WHERE f1.follower_id = _user_id
$$;
```

Also update `upcoming_shows` SELECT policy to allow followers to **read** upcoming shows of users they follow — needed so the calendar can show friend ghost tiles.

```sql
-- New policy: followers can view upcoming shows of people they follow
CREATE POLICY "Followers can view upcoming shows of followed users"
  ON public.upcoming_shows FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.followers
      WHERE follower_id = auth.uid()
        AND following_id = upcoming_shows.created_by_user_id
    )
  );
```

---

## Layer 2: `useFollowers` Hook

**New file: `src/hooks/useFollowers.ts`**

Exposes:

| Export | Type | Description |
|--------|------|-------------|
| `following` | `FollowerProfile[]` | People the current user follows (with avatar, username) |
| `followers` | `FollowerProfile[]` | People who follow the current user |
| `isFollowing(userId)` | `(id: string) => boolean` | Fast Set-based lookup |
| `follow(userId)` | `async fn` | Insert row + optimistic update |
| `unfollow(userId)` | `async fn` | Delete row + optimistic update |
| `isLoading` | `boolean` | |

The hook also fetches each followed user's `profile` (avatar_url, username, full_name) via a join so we have avatars ready without extra round-trips.

**Query pattern:**
```ts
supabase
  .from("followers")
  .select("following_id, profiles!following_id(id, username, full_name, avatar_url)")
  .eq("follower_id", user.id)
```

---

## Layer 3: Friend Avatars on Calendar Ghost Tiles

### New utility hook: `useFriendUpcomingShows`

**New file: `src/hooks/useFriendUpcomingShows.ts`**

Fetches upcoming shows from **all followed users** grouped by date. The result is a `Map<string, FollowerProfile[]>` keyed by ISO date string (e.g. `"2026-03-15"`), mapping to the list of friends attending that date.

This lets the calendar do a simple `friendsOnDate.get(isoDate) ?? []` lookup — no filtering loops in render.

### Calendar Ghost Tile Changes (`src/components/Home.tsx`)

The existing ghost tile block (lines 792–828) gets a friend avatar micro-stack in the **top-left corner** of the 32×32 tile — same pattern as `WhatsNextStrip` chips but sized for a tiny tile:

```
┌────────────────┐
│ 🟢 [img]       │  ← RSVP dot stays bottom-right
│                │
│ [av][av]       │  ← Friend avatars top-left (max 2, then +N)
│           •    │
└────────────────┘
```

- Each avatar: `w-3 h-3 rounded-full` with `-ml-1` overlap
- Max 2 visible + count badge if more
- Only shown when `friends.length > 0` — no empty space wasted

### `WhatsNextStrip` Cleanup

Remove `getMockFriends()` and the `MOCK_FRIEND_POOLS` array. Replace with real data from `useFriendUpcomingShows` passed as a prop or consumed directly in the chip.

### `FriendTeaser` Update

Replace the static "Friends coming soon" label with a live count: `"X friends following you"` once the `followers` hook is in place.

---

## Implementation Order

```text
Step 1 — Database migration
  ├── Create followers table + RLS
  ├── Create get_mutual_followers() function
  └── Add followers can view upcoming_shows policy

Step 2 — useFollowers hook
  ├── follow() / unfollow() actions
  ├── following[] + followers[] state
  └── isFollowing() set-based lookup

Step 3 — useFriendUpcomingShows hook
  ├── Fetch upcoming_shows for all followed user IDs
  └── Return Map<isoDate, FollowerProfile[]>

Step 4 — Wire into Home.tsx calendar
  ├── Call useFriendUpcomingShows()
  ├── Add friendsOnDate lookup to ghost tile render
  └── Render micro-avatar stack on tiles with friends

Step 5 — Clean up WhatsNextStrip + FriendTeaser
  ├── Remove mock friend data
  └── Replace with real data from hooks
```

---

## Files Changed

| File | Change |
|------|--------|
| `supabase/migrations/[new].sql` | `followers` table, RLS, `get_mutual_followers` fn, `upcoming_shows` policy |
| `src/hooks/useFollowers.ts` | New — follow/unfollow actions and state |
| `src/hooks/useFriendUpcomingShows.ts` | New — friend show map keyed by date |
| `src/components/Home.tsx` | Add micro-avatar stack to calendar ghost tiles |
| `src/components/home/WhatsNextStrip.tsx` | Remove mocks, use real friend data |
| `src/components/home/FriendTeaser.tsx` | Show live follower count |

---

## What This Does NOT Include (Yet)

- A "Find Friends" / user search UI — users can't yet discover each other to follow. This would be a natural next step: a search sheet in Profile that queries `profiles` by username and exposes a Follow button.
- Notifications when someone follows you
- The "Close Friends" approval layer (mutual-follow gate for sensitive data) — the DB function is already built for it; just needs a UI gate later
