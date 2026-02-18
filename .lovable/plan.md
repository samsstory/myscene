
# "Upcoming Shows" Strip — Toggle Design Plan

## Recommendation: Segmented Toggle in the Header (not a second row)

A second full row of equal-height chips would consume ~160px of extra vertical space every time the user loads the home screen, regardless of whether they care about social plans that day. That's a meaningful cost.

However, a plain toggle that hides friends' shows behind a tap means the social signal is never passively discoverable — which defeats the whole purpose of the feature.

The right approach is a **header-level segmented control** that replaces the current "What's Next" label. It gives friends' shows a permanent, prominent home without costing any vertical space. The chip row beneath simply swaps content when toggled. This pattern is familiar (similar to how Spotify separates "My Library" from "Following"), feels intentional, and preserves the real estate budget.

---

## Visual Design

```text
┌─────────────────────────────────────────────┐
│  [Mine]  [Friends · 3]          + Add        │  ← segmented pill toggle in header
├─────────────────────────────────────────────┤
│  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐    │
│  │ chip │  │ chip │  │ chip │  │  +   │    │  ← scrollable row (content swaps)
│  └──────┘  └──────┘  └──────┘  └──────┘    │
└─────────────────────────────────────────────┘
```

- "Mine" tab: current personal upcoming shows + AddShowChip at end
- "Friends" tab: friend show chips (read-only, no add chip)
- A subtle badge/count on the "Friends" tab shows how many friends have upcoming shows (e.g. "Friends · 3") — this makes the tab itself a passive signal that something is there
- The "+ Add" button in the top-right only appears on the "Mine" tab
- If the user has zero friends with upcoming shows, the "Friends" tab still appears but shows a soft empty state inside the chip row (e.g. "No friends have shows planned yet")

---

## What Changes

### `src/hooks/useFriendUpcomingShows.ts`
Extend the existing Supabase SELECT to pull full show fields per row:
- Add `id`, `artist_name`, `artist_image_url`, `venue_name`, `venue_location` to the SELECT
- Keep the existing `friendsByDate` Map (used by the calendar ghost tiles — no breakage)
- Add a new `friendShows[]` flat array sorted by `show_date` ascending, each entry containing the show fields plus the owning `friend: FollowerProfile`

### `src/components/home/WhatsNextStrip.tsx`
- Rename internal section label from "What's Next" to use the segmented toggle
- Add local state: `activeTab: 'mine' | 'friends'` defaulting to `'mine'`
- Replace the plain `<h3>What's Next</h3>` header with two pill tabs side by side:
  - Left pill: "Mine" 
  - Right pill: "Friends" with a count badge if `friendShows.length > 0`
- The `+ Add` button in the top-right conditionally renders only when `activeTab === 'mine'`
- Below the header, conditionally render either:
  - **Mine tab**: existing `UpcomingChip` list + `AddShowChip` (exactly as today)
  - **Friends tab**: a new `FriendChip` sub-component displaying friend show cards (read-only, with friend avatar overlaid top-left)
- The empty state for Friends tab: a simple inline message ("No friends have planned shows yet") styled as a soft single-line pill — not a full-height button
- The strip pulls `friendShows` from the upgraded `useFriendUpcomingShows` hook

### `FriendChip` sub-component (inside WhatsNextStrip.tsx)
Same `w-32 h-36` dimensions as `UpcomingChip`. Shows:
- Blurred artist image background (or gradient fallback)
- Friend avatar + truncated username in top-left (replaces the RSVP badge)
- Artist name + date + venue in the bottom overlay
- Tapping opens a read-only bottom sheet (reuse `UpcomingShowDetailSheet` in view-only mode, or a simple `Sheet` with the info — phase 2 can add "I'm going too" CTA)

---

## Files to Create / Modify

| File | Action | Summary |
|---|---|---|
| `src/hooks/useFriendUpcomingShows.ts` | Edit | Broaden SELECT to include full show fields; expose `friendShows[]` flat array alongside existing `friendsByDate` Map |
| `src/components/home/WhatsNextStrip.tsx` | Edit | Add segmented toggle header; add `FriendChip` sub-component; wire `friendShows` from hook; conditional tab rendering |

No changes needed to `Home.tsx` — `WhatsNextStrip` is self-contained and already receives `onPlanShow` from there.

---

## Why Not a Second Row?

- Costs ~160px of vertical space on every home screen load
- Friends' data is only interesting when timely (soonest shows first) — a second row with 0 entries would leave a blank gap
- The toggle pattern keeps the layout stable regardless of how many friends have plans
- It also sets up future tabs cleanly (e.g. a "Nearby" tab later)

## Why Not Just a Toggle Button (icon only)?

An icon-only toggle (e.g. a people icon in the corner) is too easy to miss and doesn't communicate that friends have upcoming shows. The count badge on the "Friends" pill is the passive social signal that makes users curious to tap it.
