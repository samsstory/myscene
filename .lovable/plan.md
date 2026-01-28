

# Add Native Smooth Scroll to Card List

## Summary

Enhance the stacked card list with native CSS smooth scroll behavior so that swiping, dragging, and all scroll interactions feel fluid and natural on both desktop and mobile.

---

## Current State

The container currently has:
- `overflow-y-auto` - enables scrolling
- `snap-y snap-mandatory` - snaps to card boundaries
- `scrollbar-hide` - hides the scrollbar visually
- Programmatic `scrollIntoView({ behavior: "smooth" })` on tap

**What's Missing:**
- Native `scroll-behavior: smooth` for manual scroll interactions
- iOS momentum scrolling (`-webkit-overflow-scrolling: touch`)
- Smoother snap behavior with `scroll-snap-stop`

---

## Changes

### 1. Add Smooth Scroll Utility Class

**File:** `src/index.css`

Add a new utility class for smooth scrolling with iOS momentum:

```css
/* Smooth scrolling for card stacks */
.scroll-smooth-momentum {
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch;
}
```

### 2. Apply Smooth Scroll to Container

**File:** `src/components/home/StackedShowList.tsx`

Add the new utility class to the scroll container:

```tsx
<div
  ref={containerRef}
  className="overflow-y-auto snap-y snap-mandatory max-h-[70vh] scrollbar-hide scroll-smooth-momentum"
  style={{ scrollSnapType: "y mandatory" }}
>
```

### 3. Add Scroll Snap Stop for Better Control

**File:** `src/components/home/StackedShowList.tsx`

Update card wrapper to use `scroll-snap-stop: always` so the scroll always stops at each card (prevents skipping):

```tsx
<div
  key={show.id}
  className="snap-center will-change-transform isolate"
  style={{
    marginTop: index === 0 ? 0 : "-20px",
    zIndex: getZIndex(index, expandedIndex, shows.length),
    position: "relative",
    pointerEvents: "auto",
    scrollSnapStop: "always",
  }}
>
```

---

## Files to Modify

| File | Change |
|------|--------|
| `src/index.css` | Add `.scroll-smooth-momentum` utility class with smooth scroll and iOS momentum |
| `src/components/home/StackedShowList.tsx` | Apply smooth scroll class to container, add `scrollSnapStop` to cards |

---

## Technical Details

**Why These Properties:**

| Property | Purpose |
|----------|---------|
| `scroll-behavior: smooth` | Native CSS smooth scrolling for all scroll actions (swipe, drag, programmatic) |
| `-webkit-overflow-scrolling: touch` | iOS Safari momentum/inertia scrolling (feels native) |
| `scroll-snap-stop: always` | Forces scroll to stop at each card, preventing fast-swipe skip-overs |

**Browser Support:**
- `scroll-behavior: smooth` - 95%+ support
- `-webkit-overflow-scrolling: touch` - iOS Safari (gracefully ignored elsewhere)
- `scroll-snap-stop` - 93%+ support

