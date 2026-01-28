

# Empty State for Map View (Photos-First Approach)

## Overview
Add an empty state when the map has zero shows, with "Add from Photos" as the primary CTA (since bulk upload is the fastest path for users with existing concert photos) and a secondary "or add manually" link for the single show flow.

## Implementation Details

### 1. Dashboard.tsx Changes

Pass two separate callbacks to Home:

```typescript
<Home 
  onNavigateToRank={() => setActiveTab("rank")} 
  onAddFromPhotos={() => setShowBulkUpload(true)}
  onAddSingleShow={() => setShowAddDialog(true)}
/>
```

### 2. Home.tsx Changes

Accept the new props and pass them to MapView:

```typescript
interface HomeProps {
  onNavigateToRank?: () => void;
  onAddFromPhotos?: () => void;
  onAddSingleShow?: () => void;
}

// In the globe view:
<MapView 
  shows={shows} 
  onEditShow={...}
  onAddFromPhotos={onAddFromPhotos}
  onAddSingleShow={onAddSingleShow}
/>
```

### 3. MapView.tsx Changes

**Add new props:**
```typescript
interface MapViewProps {
  shows: Show[];
  onEditShow: (show: Show) => void;
  onAddFromPhotos?: () => void;
  onAddSingleShow?: () => void;
}
```

**Add imports:**
- `Globe`, `Camera`, `Plus` from lucide-react
- `Button` from ui/button

**Add empty state UI when `shows.length === 0`:**

```text
┌─────────────────────────────────────┐
│                                     │
│        ┌───────────────────┐        │
│        │   ◯ Globe Icon    │        │
│        │   with pulsing    │        │
│        │   decorative dots │        │
│        └───────────────────┘        │
│                                     │
│      Your Show Globe is empty       │
│                                     │
│   Start logging shows to see them   │
│   appear on your personal map       │
│                                     │
│   ┌─────────────────────────────┐   │
│   │  📷  Add from Photos        │   │  ← Primary CTA
│   └─────────────────────────────┘   │
│                                     │
│        or add manually              │   ← Secondary link
│                                     │
└─────────────────────────────────────┘
```

**Empty state component structure:**
- Centered overlay with subtle gradient background
- Decorative globe illustration with pulsing animation
- Decorative mini-dots in marker colors (purple, cyan, amber) as preview
- Headline: "Your Show Globe is empty"
- Description: "Start logging shows to see them appear on your personal concert map"
- Primary button: Camera icon + "Add from Photos" (triggers onAddFromPhotos)
- Secondary text link: "or add manually" (triggers onAddSingleShow)

## Visual Design

- Glassmorphism overlay consistent with existing map UI
- Primary purple accent color for the globe illustration
- Pulsing animation on decorative circle for visual interest
- Camera icon on primary button reinforces the photos-first approach
- Ghost-style secondary link to de-emphasize manual entry

## Files to Edit

| File | Changes |
|------|---------|
| `src/pages/Dashboard.tsx` | Pass `onAddFromPhotos` and `onAddSingleShow` callbacks to Home |
| `src/components/Home.tsx` | Accept new props, pass to MapView |
| `src/components/MapView.tsx` | Add empty state UI with photos-first CTA, add new props and imports |

