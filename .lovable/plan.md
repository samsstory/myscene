
# Plan: Critical Globe UX Fixes

## Overview

Implement three high-priority fixes to improve the Globe/Map view experience:
1. Convert venue details from a Card overlay to a mobile-friendly bottom sheet (Drawer)
2. Add responsive height to the map container instead of fixed 600px
3. Fix mobile tap interactions for map markers

---

## Fix 1: Convert Venue Details to Bottom Sheet

### Problem
Currently, when you tap a venue marker, the venue details appear as a Card positioned at `bottom-4 left-4`. This overlay:
- Gets obscured by fingers on touch devices
- Competes with the map for limited screen space
- Has an awkward "Close" button that requires precise tapping

### Solution
Replace the Card-based venue details with the existing Drawer component (vaul-based bottom sheet). This provides:
- Native swipe-to-dismiss gesture
- Proper mobile touch interaction
- Better screen real estate usage
- Consistent with other detail views in the app

### Implementation

**Update MapView.tsx:**

1. Import the Drawer components:
```typescript
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
```

2. Replace the Card-based venue details (lines 1054-1099) with a Drawer:
```typescript
<Drawer 
  open={!!selectedVenue} 
  onOpenChange={(open) => !open && setSelectedVenue(null)}
>
  <DrawerContent className="max-h-[60vh]">
    <DrawerHeader>
      <DrawerTitle>{selectedVenue?.venueName}</DrawerTitle>
      <DrawerDescription>{selectedVenue?.location}</DrawerDescription>
    </DrawerHeader>
    <div className="px-4 pb-6">
      <p className="text-sm mb-3 text-muted-foreground">
        {selectedVenue?.count} {selectedVenue?.count === 1 ? "show" : "shows"}
      </p>
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {selectedVenue?.shows.map((show) => (
          <div
            key={show.id}
            className="text-sm p-3 bg-muted rounded-lg flex items-center justify-between gap-2"
          >
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">
                {show.artists.map(a => a.name).join(", ")}
              </div>
              <div className="text-xs text-muted-foreground">
                {new Date(show.date).toLocaleDateString()}
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onEditShow(show)}
            >
              <Edit className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  </DrawerContent>
</Drawer>
```

---

## Fix 2: Responsive Map Height

### Problem
The map container uses a fixed height of `h-[600px]` (line 931). This causes:
- Cut-off content on smaller mobile devices
- Wasted space on larger tablets/desktops
- No adaptation to device orientation changes

### Solution
Use CSS viewport-relative units combined with `calc()` to account for the header and navigation elements.

### Implementation

**Update MapView.tsx line 931:**

Change from:
```typescript
<div className="relative w-full h-[600px]">
```

To:
```typescript
<div className="relative w-full h-[calc(100vh-180px)] min-h-[400px]">
```

This calculates:
- `100vh` = full viewport height
- Minus `180px` = space for header (~56px), sub-view header (~48px), and bottom padding (~76px)
- `min-h-[400px]` = ensures map doesn't become unusably small

---

## Fix 3: Mobile Tap Interactions for Markers

### Problem
Mapbox's click/hover events are optimized for mouse interactions. On mobile:
- `mouseenter`/`mouseleave` events may not trigger reliably
- Tap targets might be too small for touch
- No visual feedback on tap

### Solution
Enhance the existing event handlers to better support touch interactions:

1. Add `touchstart` event handling alongside click
2. Increase minimum tap target size for mobile
3. Add visual feedback on tap (opacity pulse)

### Implementation

**Update marker layer paint properties (country, city, venue):**

Increase minimum circle radius for better touch targets:
```typescript
// Country dots (lines 532-538)
'circle-radius': [
  'interpolate', ['linear'], ['get', 'showCount'],
  1, 22,  // Increased from 18
  5, 28,  // Increased from 24
  10, 34, // Increased from 30
  50, 44  // Increased from 40
],

// City dots (lines 680-686)
'circle-radius': [
  'interpolate', ['linear'], ['get', 'showCount'],
  1, 18,  // Increased from 14
  5, 24,  // Increased from 20
  10, 30, // Increased from 26
  25, 36  // Increased from 32
],

// Venue dots (lines 838-844)
'circle-radius': [
  'interpolate', ['linear'], ['get', 'showCount'],
  1, 16,  // Increased from 12
  3, 20,  // Increased from 16
  5, 24,  // Increased from 20
  10, 30  // Increased from 26
],
```

**Add touch event listeners alongside mouse events:**

For each marker type, add explicit touch handling:
```typescript
// Add alongside existing click handler
map.current.on('touchstart', 'venue-dots', (e) => {
  e.preventDefault();
  if (e.features && e.features.length > 0) {
    const venueName = e.features[0].properties?.name;
    const venue = venueData.find(v => v.name === venueName);
    if (venue) {
      // Set hovered state briefly for visual feedback
      setHoveredVenue(venueName);
      setTimeout(() => setHoveredVenue(null), 300);
      
      setSelectedVenue({
        venueName: venue.name,
        location: venue.location,
        count: venue.shows.length,
        shows: venue.shows
      });
    }
  }
});
```

**Apply same pattern to country and city markers.**

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/MapView.tsx` | All three fixes: Drawer for venue details, responsive height, touch handlers |

---

## Visual Summary

```text
BEFORE                           AFTER
┌────────────────────────┐      ┌────────────────────────┐
│ h-[600px] fixed        │      │ h-[calc(100vh-180px)]  │
│                        │      │ (responsive)           │
│     [Map]              │      │                        │
│                        │      │      [Map]             │
│  ┌──────────┐          │      │                        │
│  │Card      │ ← Overlay│      │                        │
│  │Venue Info│          │      └────────────────────────┤
│  └──────────┘          │      │ ═══════════════════ ━━ │
└────────────────────────┘      │ Venue Name             │
                                │ Location               │
                                │ Shows list...          │
                                │ (Swipe down to close)  │
                                └────────────────────────┘
                                     ↑ Bottom Sheet (Drawer)
```

---

## Technical Details

### Drawer Component Integration
- The Drawer component from vaul is already installed and configured in the project
- Uses `shouldScaleBackground` for a native iOS-like feel
- The handle bar is already styled in DrawerContent

### Responsive Height Calculation
- 56px: Main navigation/header
- 48px: Sub-view header ("Show Globe" + back button)
- 76px: Bottom padding and safe area
- Total: ~180px reserved, rest goes to map

### Touch Event Considerations
- `touchstart` fires before `click` on mobile
- Using `e.preventDefault()` prevents ghost clicks
- Brief hover state (300ms) provides visual feedback
- Larger tap targets (4-6px increase per tier) improve accuracy

### Cleanup
- Remove the explicit "Close" button from venue details (swipe-to-dismiss replaces it)
- Hover cards can remain for desktop users
- The MapRightPanel (stats) remains unchanged
