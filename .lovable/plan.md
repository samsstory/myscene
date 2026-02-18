
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
