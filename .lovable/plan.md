
# Plan: Vertical Right-Side Stats Panel for Globe/Map View

## Overview

Rework the Globe page layout to replace the current horizontal bottom stats bar with a vertical stats pill on the right side, positioned below the minimized location notification pin. This creates a more mobile-friendly, cohesive UI that keeps all right-side controls together.

## Current Issues

1. **Horizontal stats card** at bottom-right gets cut off or extends off-screen on mobile
2. **Two separate floating elements** (location pin + stats) compete for attention
3. **Visual clutter** with overlays in multiple corners of the map

## Proposed Layout

```text
┌────────────────────────────────────────────────────────────────┐
│  ┌─────────────────────┐                    ┌──┬──┐            │
│  │ World > USA > NYC   │ (breadcrumb)       │ + │- │ (zoom)    │
│  └─────────────────────┘                    └──┴──┘            │
│                                                                │
│                                                                │
│                                              ┌─────────────┐   │
│        ┌──────────┐                          │ 📍    (3)   │   │
│        │ New York │ (hover card)             ├─────────────┤   │
│        │ 5 shows  │                          │             │   │
│        └──────────┘                          │   ♫  17     │   │
│                                              │  Shows      │   │
│                                              │             │   │
│                                              │   🌍  4     │   │
│                                              │ Countries   │   │
│                                              │             │   │
│                                              │   🏙️  8     │   │
│                                              │  Cities     │   │
│                                              │             │   │
│                                              │   📍 12     │   │
│                                              │  Venues     │   │
│                                              │             │   │
│                                              └─────────────┘   │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

## Implementation Details

### 1. Create New Unified Right Panel Component

Create `src/components/map/MapRightPanel.tsx` that combines:
- Location notification indicator (when shows need location)
- Vertical stats display

```typescript
interface MapRightPanelProps {
  totalShows: number;
  totalCountries: number;
  totalCities: number;
  totalVenues: number;
  showsWithoutLocation: number;
  isMinimized: boolean;
  onToggleLocationCard: () => void;
}
```

### 2. Vertical Stats Layout

Replace the horizontal flex layout with a vertical stack:

```typescript
const stats = [
  { icon: Music, value: totalShows, label: "Shows" },
  { icon: Globe, value: totalCountries, label: "Countries" },
  { icon: Building2, value: totalCities, label: "Cities" },
  { icon: MapPin, value: totalVenues, label: "Venues" },
];

// Vertical layout
<div className="flex flex-col gap-3">
  {stats.map((stat) => (
    <div className="flex flex-col items-center text-center">
      <div className="p-2 rounded-lg bg-primary/20">
        <stat.icon className="h-4 w-4 text-primary" />
      </div>
      <span className="text-lg font-bold text-white">{stat.value}</span>
      <span className="text-[9px] text-white/60 uppercase tracking-wider">
        {stat.label}
      </span>
    </div>
  ))}
</div>
```

### 3. Integrated Location Notification

When there are shows without location, display a subtle notification section at the top of the panel:

```typescript
{showsWithoutLocation > 0 && (
  <button
    onClick={onToggleLocationCard}
    className="flex items-center justify-center gap-2 p-2 rounded-lg bg-destructive/20 border border-destructive/30 mb-3 transition-colors hover:bg-destructive/30"
  >
    <MapPin className="h-4 w-4 text-destructive" />
    <span className="text-sm font-semibold text-destructive">
      {showsWithoutLocation}
    </span>
  </button>
)}
```

### 4. Panel Positioning

Position the unified panel on the right side, vertically centered:

```typescript
<div className="absolute right-4 top-1/2 -translate-y-1/2 z-10">
  <div className="backdrop-blur-xl bg-black/40 border border-white/10 rounded-2xl p-3 shadow-2xl">
    {/* Location notification (if needed) */}
    {/* Vertical stats stack */}
  </div>
</div>
```

### 5. Update MapView.tsx

- Remove the current `MapStatsCard` import and usage
- Remove the separate minimized location pin element
- Add the new `MapRightPanel` component
- Pass the required props including `showsWithoutLocation.length` and toggle handler

### 6. Responsive Considerations

The vertical layout naturally works better on mobile:
- Narrow width (fits in right margin)
- Scrollable if needed on very small screens
- Consistent with native mobile map controls pattern (right-side controls)

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/map/MapRightPanel.tsx` | **New file** - Unified right panel component |
| `src/components/map/MapStatsCard.tsx` | Can be deleted or kept for reference |
| `src/components/MapView.tsx` | Replace stats card + minimized pin with new unified panel |

## Visual Specifications

| Property | Value |
|----------|-------|
| Panel background | `bg-black/40 backdrop-blur-xl` |
| Border | `border border-white/10` |
| Border radius | `rounded-2xl` |
| Position | `right-4 top-1/2 -translate-y-1/2` |
| Icon size | `h-4 w-4` |
| Value text | `text-lg font-bold text-white` |
| Label text | `text-[9px] uppercase tracking-wider text-white/60` |

## Interaction Behavior

1. **Location notification tap**: Opens the full "Shows without location" card (existing behavior)
2. **Stats display**: Static display only (no interactivity needed)
3. **Panel visibility**: Always visible as an overlay on the map
4. **When location card is expanded**: Hide the notification badge from the panel (since the full card is visible)

## Edge Cases

1. **No shows**: Panel still shows with all zeros
2. **All shows have locations**: Location notification section is hidden, only stats shown
3. **Very small screens**: Panel maintains minimum width, may need scroll on extremely constrained viewports
