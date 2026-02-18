
# Redesign Highlight Reel: Horizontal Swipe Carousel

## What's Changing and Why

The current `HighlightReel` is a full-bleed, edge-to-edge hero that swaps shows in place. It has two problems:
1. The photo fills the full width with no visual cues that more cards exist — navigation relies on hidden arrows or knowing to swipe
2. Cards appear misaligned (tilted) due to `object-cover` on portrait photos in a landscape aspect ratio

The new design transforms it into an inset horizontal scroll carousel — matching the browsing feel of the `StackedShowList` below it, creating a cohesive "memory shelf" aesthetic across the whole dashboard.

## Visual Design

```text
┌──────────────────────────────────────────────────────┐
│  px-4 inset from screen edges                        │
│                                                      │
│  ┌──────────────────────┐  ┌─ peek ─┐               │
│  │                      │  │        │               │
│  │   Active Card        │  │  Next  │               │
│  │   (85vw wide)        │  │  Card  │               │
│  │                      │  │  peek  │               │
│  │  [#1 All Time]       │  │        │               │
│  │                      │  │        │               │
│  │  Artist Name         │  │        │               │
│  │  Venue · Date        │  │        │               │
│  └──────────────────────┘  └────────┘               │
│                                                      │
│              ●  ○  ○  ○  ○   (dots)                 │
└──────────────────────────────────────────────────────┘
```

- Cards are **85vw wide** with `12px` horizontal inset from screen edges
- **~15vw peek** of the next card is always visible on the right
- Aspect ratio changes from `3/4` (portrait) to `4/5` — tall but not as extreme, more natural for landscape concert photos
- No arrow buttons — navigation is swipe-only (and auto-rotate)
- Dots move to below the carousel track, not inside the photo

## Implementation: Rewrite `HighlightReel.tsx`

### Core Approach: CSS Scroll Snap (no library needed)

Use a horizontally scrollable container with `scroll-snap-type: x mandatory`, where each card snaps to center/start. This gives native-feel momentum scrolling and doesn't require Embla or any new dependency.

```
scrollContainer (overflow-x: scroll, snap-type: x mandatory, flex)
  └── card wrapper × N  (snap-align: start, flex-shrink: 0, width: 85vw, px: 6px)
        └── card (rounded-2xl, overflow-hidden, aspect-[4/5])
              └── image / gradient background
              └── gradient overlay
              └── rank badge (top-left)
              └── bottom text block
```

### Auto-Rotation

- Uses `scrollRef.current.scrollTo({ left: targetX, behavior: 'smooth' })` on a 5-second interval
- Pauses when the user touches the scroll container (`onTouchStart` sets `isPaused = true`)
- Resumes after 10 seconds of inactivity (matching current behavior)

### Tracking Active Index

Instead of manually tracking swipe deltas, use an `IntersectionObserver` (or a `scroll` event listener with debounce) on the scroll container to detect which card is most visible — updating `activeIndex` automatically. This is the same pattern used in `StackedShowList`.

### Tap vs Scroll Disambiguation

The `onClick` on each card will only fire `onShowTap` if the scroll position hasn't changed significantly since `touchStart` — uses a `didScroll` ref similar to the current `isSwiping` ref.

## Changes Required

### 1. `src/components/home/HighlightReel.tsx` — Full rewrite

Key structural changes:
- Remove: `touchStartX`, `touchStartY`, `isSwiping` refs (replaced by native scroll)
- Remove: `ChevronLeft`, `ChevronRight` arrow buttons
- Add: `scrollRef` pointing at the scroll container
- Add: scroll event listener → debounced `activeIndex` update
- Add: auto-rotate using `scrollTo` instead of `setActiveIndex` with state-swap
- Change: outer container from `-mx-4` (full bleed) to `mx-0` (inset, with `px-4` on scroll container)
- Change: card width from `w-full` to `w-[85vw] max-w-sm flex-shrink-0`
- Change: aspect ratio from `aspect-[3/4]` to `aspect-[4/5]`
- Change: dots position from `absolute bottom-2` (inside photo) to below the scroll container
- Add: `gap-2` between cards in the flex row for subtle card separation

### 2. `src/components/Home.tsx` — No changes needed

The `HighlightReel` component API (`shows`, `getRankInfo`, `onShowTap`) remains identical. The parent doesn't need updating.

## What Stays the Same

- The `Show` and `RankInfo` interface types — identical props
- Auto-rotation logic (5s interval, 10s pause on interaction)
- Rank badge, tag pill, artist name, venue/date text overlays
- SceneLogo watermark
- Dots indicator (repositioned but same logic)
- `onShowTap` callback behavior

---

# Shared Concert Calendar: Social Layer V1

## Vision

A frictionless way to track shows you're planning to attend, share them with friends, and coordinate who's going — with a post-show comparison nudge to close the social loop.

## Design: "What's Next" Strip

A horizontally-scrollable strip of upcoming show chips, positioned **between the stat pills and the Highlight Reel** on the dashboard. Always above the fold.

```text
┌──────────────────────────────────────────────────────┐
│  What's Next                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────┐  │
│  │ Fred Again   │  │ Boiler Room  │  │  + Plan   │  │
│  │ Feb 22 · MSG │  │ Mar 5 · NYC  │  │  a Show   │  │
│  └──────────────┘  └──────────────┘  └───────────┘  │
└──────────────────────────────────────────────────────┘
```

- Each chip shows: artist name, date, venue/city
- Friend RSVP avatars stack on the chip when close friends are also going
- "+" CTA at the end opens the "Plan a Show" flow
- Empty state: 2–3 faded placeholder chips + "Add your first →" to sell the feature
- The "Calendar" stat pill becomes "Upcoming" — deep-links to full calendar view

## Social Model: Follow + Close Friends

- **Follow (public)**: One-way. See their public activity feed ("Jake is going to Fred Again"). Lays groundwork for ambassador/curator calendars.
- **Close Friends (private)**: Mutual opt-in. Shared upcoming calendar, RSVP coordination, group post-show comparison access.

## Event Input: Paste → AI Parse (Gemini Flash)

User pastes any text blob or URL (Ticketmaster, Resident Advisor, Instagram caption). Gemini Flash extracts:
```json
{ "artist": "Fred Again", "venue": "MSG", "city": "New York", "date": "2026-02-22", "ticket_url": "..." }
```
Presented as a confirmation card. One tap to add. Manual artist/venue search as fallback.

## Phased Build Plan

### Phase 1A — Upcoming Shows + AI Import *(self-contained, no social needed)*

**New table: `upcoming_shows`**
```sql
upcoming_shows (
  id uuid PK,
  created_by_user_id uuid,
  artist_name text,
  venue_name text,
  venue_location text,
  show_date date,
  ticket_url text nullable,
  source_url text nullable,       -- original pasted URL
  raw_input text nullable,        -- original pasted text
  linked_show_id uuid nullable,   -- filled when logged post-show
  created_at timestamptz
)
```

**Features:**
- "Plan a Show" button → paste box → Gemini parses → confirm card → saved
- "What's Next" strip on dashboard (empty state sells feature)
- Manual fallback using existing UnifiedSearchStep components

### Phase 1B — Follow Graph *(parallel to 1A)*

**New table: `follows`**
```sql
follows (
  follower_id uuid,
  following_id uuid,
  type text CHECK (type IN ('public', 'close')),
  created_at timestamptz,
  PRIMARY KEY (follower_id, following_id)
)
```

- Find friends by username search
- Send/accept close friend requests
- Friends tab in Profile

### Phase 1C — RSVP + Social Layer *(after 1A + 1B)*

**New table: `show_attendees`**
```sql
show_attendees (
  upcoming_show_id uuid FK,
  user_id uuid,
  rsvp_status text CHECK (status IN ('going', 'maybe', 'not_going')),
  created_at timestamptz,
  PRIMARY KEY (upcoming_show_id, user_id)
)
```

- Share an upcoming show to close friends → they see it in their strip
- RSVP: Going / Maybe / Can't Make It
- "Who's Going" avatars on each chip
- Activity feed item: "3 friends are going to Bicep at Brixton Academy"

### Phase 2 — Post-Show Nudge

- 24h after `show_date`, push notification fires for all attendees
- If 2+ close friends RSVPed `going` → "Compare your ratings with Jake + Maria →"
- Group comparison card: score breakdown side-by-side

### Phase 3 — Discovery + Ambassador Calendars

- Spotify integration: suggest upcoming shows based on logged artists
- Bandsintown API: pull event dates
- Public curator calendars (follow model feeds into this)

## Stat Pill Update

- Keep: "All Shows" (→ rankings), "Finish Up" (→ todo sheet)
- Change: "Calendar" → "Upcoming" (→ full upcoming shows calendar view)
- The pill is a *gateway*; the What's Next strip is the at-a-glance preview
