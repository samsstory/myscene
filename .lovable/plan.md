
# Show-by-Show Invite with Referral Tracking

## What We're Building

A contextual invite system that lets users share a specific show — past or upcoming — via a personalized link (`tryscene.app/?ref=CODE&show=SHOW_ID`). When a non-user taps the link, they land on a special preview of the show (artist, venue, date + inviter name) above the existing sign-up CTA. Referral attribution is captured automatically on signup.

---

## Architecture Overview

```text
User taps "Invite to show"
        │
        ▼
useShareShow hook
  ├── Builds URL: tryscene.app/?ref=REFERRAL_CODE&show=SHOW_ID
  ├── navigator.share() → native OS sheet (iMessage, WhatsApp, etc.)
  └── clipboard fallback → toast "Link copied"
        │
        ▼
Non-user opens link
  └── IndexV2.tsx reads ?show= param
      └── Fetches public show preview from new DB view
          └── Renders ShowInviteHero above existing landing content
              (artist image + name, venue, date, inviter name)
                      │
                      ▼
              User signs up via /auth
                └── referral_code in localStorage → referral attributed
```

---

## Part 1 — Database: Public Show Preview View

### New RLS policy on `shows`
Currently `shows` is private (only owner can SELECT). We cannot make the whole table public. Instead we add a **security-definer database function** that returns safe, minimal fields for a given show ID — no rating, no notes, no private data.

```sql
-- New function: get_show_invite_preview(show_id uuid)
-- Returns: artist_name, venue_name, venue_location, show_date, 
--          artist_image_url, photo_url, inviter_full_name, inviter_username
-- Callable by anon role — no auth required
```

This keeps private data (rating, notes, tags, all other fields) completely hidden while enabling the public preview. The function joins `show_artists` for the headliner and `profiles` for the inviter name.

For **upcoming shows**, a parallel function `get_upcoming_show_invite_preview` does the same for `upcoming_shows`.

Both functions use `SECURITY DEFINER` and a `SET search_path = public` so they bypass RLS safely.

---

## Part 2 — `useShareShow` Hook (new file)

**`src/hooks/useShareShow.ts`**

Responsibilities:
- Accept a `show` object (either a logged `Show` or an `UpcomingShow`)
- Accept a `type: "logged" | "upcoming"` discriminator
- Read the user's `referral_code` from their profile (already fetched in `Profile.tsx` — we'll expose it via a small query or pass it as a prop)
- Build the canonical URL: `https://tryscene.app/?ref={referralCode}&show={showId}&type={type}`
- Call `navigator.share()` with a pre-composed message:
  > "I saw {Artist} at {Venue} and logged it on Scene 🎵 — check it out"  
  > or for upcoming:  
  > "I'm going to see {Artist} at {Venue} — come with me on Scene 🎵"
- Fall back to `navigator.clipboard.writeText()` if share API unavailable
- Show a `sonner` toast: "Link copied!" or "Shared!"

```typescript
// Public interface
export function useShareShow() {
  const shareShow: (params: ShareShowParams) => Promise<void>
}
```

No new dependencies needed — uses Web APIs only.

---

## Part 3 — Share Entry Points

### 3a. `StackedShowCard.tsx` — Logged Shows

The existing Instagram share button (`onShare` prop) already exists in the top-right corner of the expanded card. We will **add a second share action** — an invite icon below it, or better: we convert the existing share flow to offer both options.

The cleanest UX: the existing Instagram button remains for photo sharing. We add a separate **"Invite a friend"** button row inside the expanded card's bottom content area, styled as a slim glass pill:

```
┌─────────────────────────────────────┐
│  [Artist Photo / Gradient]           │
│  #1 All Time              [IG icon] │
│                                     │
│  Fred again..                       │
│  Alexandra Palace · Sep 2023        │
│  [Invite a friend →]  ← new pill   │
└─────────────────────────────────────┘
```

Styled: `bg-white/[0.08] border border-white/[0.12] rounded-full px-3 py-1.5 text-[11px] font-medium text-white/70 flex items-center gap-1.5`

This fires `useShareShow` with `type: "logged"`.

### 3b. `UpcomingShowDetailSheet.tsx` — Upcoming Shows

Below the RSVP buttons and above the "Remove from calendar" button, add an **"Invite someone"** glass row matching the Profile `GlassRow` pattern:

```
[UserPlus icon bubble]  Invite a friend
Invite them to join you at {Artist}    [>]
```

Styled identically to Profile quick-access rows. On tap, fires `useShareShow` with `type: "upcoming"`.

---

## Part 4 — Show-Specific Landing Page

**`src/pages/IndexV2.tsx`** — enhanced, no new page needed.

On mount, read `?show=` and `?type=` URL params. If present:
1. Call the public DB function to fetch the show preview
2. Render `ShowInviteHero` at the **top** of the page, before `LandingHeroV2`
3. The hero auto-scrolls away as user continues down to sign up

**`src/components/landing/ShowInviteHero.tsx`** — new component

Layout:
```
┌──────────────────────────────────────┐
│  [Artist image blurred bg]           │
│  ┌────────────────────────────────┐  │
│  │  [Avatar initials] Jake        │  │
│  │  invited you to see            │  │
│  │                                │  │
│  │  Fred again..          [photo] │  │
│  │  Alexandra Palace              │  │
│  │  September 2023                │  │
│  │                                │  │
│  │  [Create your Scene account →] │  │
│  └────────────────────────────────┘  │
└──────────────────────────────────────┘
```

Styled fully in the glassmorphism language:
- Blurred artist image as section background (same treatment as `UpcomingShowDetailSheet` hero)
- Glass panel (`bg-white/[0.06] backdrop-blur-md border border-white/[0.10]`) for the card
- Inviter name in `text-white/90 font-semibold`
- CTA button `→ /auth?ref=CODE&show=SHOW_ID` (re-captures params into the auth page)
- If show data can't be fetched (deleted/private), gracefully falls back to showing just the inviter name

**`src/pages/Auth.tsx`** — minor tweak

Auth page already calls `useReferralCapture()` which reads `?ref=` from the URL. The `?show=` param is cosmetic on the auth page — no change needed for referral attribution. The existing flow already works.

---

## Part 5 — Referral Code Access in Share Hook

`useShareShow` needs the current user's `referral_code`. The cleanest approach: a tiny `useCurrentProfile` hook (or inline query) that fetches `referral_code` from `profiles` where `id = auth.uid()`. This is a single-row SELECT that the user already has RLS permission to read.

We scope this to the hook so there's no prop drilling.

---

## Files Changed / Created

| File | Action | Description |
|---|---|---|
| `supabase/migrations/...sql` | Create | DB functions: `get_show_invite_preview` + `get_upcoming_show_invite_preview` (SECURITY DEFINER, anon-callable) |
| `src/hooks/useShareShow.ts` | Create | Core share logic — URL builder, native share, clipboard fallback |
| `src/components/landing/ShowInviteHero.tsx` | Create | Contextual show preview hero for landing page |
| `src/pages/IndexV2.tsx` | Edit | Read `?show=` & `?type=` params, conditionally render `ShowInviteHero` |
| `src/components/home/StackedShowCard.tsx` | Edit | Add "Invite a friend" pill in expanded card bottom content |
| `src/components/home/UpcomingShowDetailSheet.tsx` | Edit | Add "Invite someone" glass row above Remove button |

---

## Privacy Guarantees

- The DB functions only expose: `artist_name`, `venue_name`, `venue_location`, `show_date`, `artist_image_url` / `photo_url`, and the inviter's `full_name` / `username`
- **No rating, notes, tags, or any private review data** is ever returned
- `photo_url` is included because it's already a public URL in the `show-photos` bucket — sharing it is intentional and consistent with the existing Instagram share flow
- If the show is deleted, the DB function returns null and the landing page shows a graceful "This show is no longer available" fallback

---

## UX Details

- **Share message copy:**
  - Logged: *"Check out {Artist} at {Venue} on Scene — {inviter} logged this one 🎵"*
  - Upcoming: *"{inviter} is going to see {Artist} at {Venue} and wants you there 🎤"*
- **No new page route** — the landing page handles the preview inline, keeping the URL clean and SEO-friendly
- **Mobile-first** — `navigator.share()` triggers the native iOS/Android share sheet directly (iMessage, WhatsApp, IG DM, etc.); on desktop it silently falls back to clipboard
- **Referral attribution is zero-extra-step** — the `?ref=` is already in the URL and `useReferralCapture` on both `IndexV2` and `Auth` pages captures it automatically into localStorage
