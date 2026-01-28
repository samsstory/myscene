

# ShowReviewSheet UI Refinements

## Summary of Changes

Based on your feedback, I'll make the following adjustments to the ShowReviewSheet and HeroPhotoSection:

| Issue | Current | Fix |
|-------|---------|-----|
| 1. Share button missing | Button exists at line 343-355 but may not be visible | Verify it's rendering; check for conditional issues |
| 2. Scene logo placement | Bottom-right at `bottom-20 right-4` | Move to top-right corner |
| 3. Rank needs context | Shows only `#1` | Change to `#1 All Time` and reposition under venue/date |
| 4. "Performance" label | Says "Performance" | Change to "Show" |
| 5. Edit button on photo | Not present on photo | Add pencil icon button to top-left of photo |
| 6. Remove header | Has "Close" and "Edit" buttons | Delete the header row entirely (X exists on Sheet, edit moves to photo) |

## Implementation Details

### 1. Verify Share Button Rendering

The Share to Instagram button exists in ShowReviewSheet at lines 343-355. I'll verify it's properly positioned and visible. The button should render correctly as a full-width gradient CTA.

### 2. Move Scene Logo to Top-Right

**File:** `src/components/show-review/HeroPhotoSection.tsx`

Current (line 99-102):
```typescript
<div className="absolute bottom-20 right-4">
  <SceneLogo size="sm" />
</div>
```

New position - top-right (replacing score badge position, score moves elsewhere):
```typescript
<div className="absolute top-3 right-3">
  <SceneLogo size="sm" />
</div>
```

Since the score badge is currently at top-right, I'll move the score into the glass metadata bar at the bottom alongside the artist name.

### 3. Add Context to Rank Badge + Reposition

**File:** `src/components/show-review/HeroPhotoSection.tsx`

Current (line 59-66):
- Position: Top-left
- Display: Just `#1`

New approach:
- Position: Inside the bottom glass metadata bar, below venue/date
- Display: `#1 All Time` with the existing glow styling

Updated glass metadata bar:
```typescript
<div className="bg-white/[0.05] backdrop-blur-md rounded-xl border border-white/[0.1] p-4">
  <h2 className="font-black text-xl text-white tracking-wide truncate">
    {headliner?.name}
  </h2>
  <p className="text-white/60 text-sm mt-1 truncate">
    {venue.name} · {formattedDate}
  </p>
  {/* Rank with context */}
  <div className="mt-2 flex items-center gap-2">
    <span className="text-white/80 text-sm font-bold">#{position} All Time</span>
  </div>
</div>
```

The score badge will also move into this bar, creating a complete info section.

### 4. Change "Performance" to "Show"

**File:** `src/components/ShowReviewSheet.tsx`

Current (line 311-315):
```typescript
<CompactRatingBar 
  icon={<Mic2 className="h-4 w-4" />} 
  label="Performance" 
  value={show.artistPerformance} 
/>
```

Change to:
```typescript
<CompactRatingBar 
  icon={<Mic2 className="h-4 w-4" />} 
  label="Show" 
  value={show.artistPerformance} 
/>
```

### 5. Add Edit Pencil Button to Photo (Top-Left)

**File:** `src/components/show-review/HeroPhotoSection.tsx`

Add new prop `onEditPhoto` to open the PhotoOverlayEditor:
```typescript
interface HeroPhotoSectionProps {
  // ... existing props
  onEditPhoto?: () => void;
}
```

Add edit button at top-left when photo exists:
```typescript
{/* Top Left: Edit Photo Button */}
{photoUrl && onEditPhoto && (
  <button
    onClick={onEditPhoto}
    className="absolute top-3 left-3 h-8 w-8 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
  >
    <Pencil className="h-4 w-4 text-white/80" />
  </button>
)}
```

### 6. Remove Header Row

**File:** `src/components/ShowReviewSheet.tsx`

Delete lines 264-284 (the entire header div with "Close" and "Edit" buttons):
```typescript
// DELETE THIS ENTIRE BLOCK
<div className="flex items-center justify-between py-2 mb-4">
  <button onClick={() => onOpenChange(false)} ...>Close</button>
  <Button onClick={() => onEdit(show)} ...>Edit</Button>
</div>
```

The SheetContent already has a built-in X close button, and edit functionality moves to the photo's pencil icon.

## Updated Visual Layout

```text
┌─────────────────────────────────────────────┐
│  (Sheet's built-in X button in corner)      │
│                                             │
│  ┌───────────────────────────────────────┐  │
│  │                                       │  │
│  │         HERO PHOTO                    │  │
│  │                                       │  │
│  │   ┌─────┐                 ┌─────────┐ │  │
│  │   │ ✏️  │                 │Scene ✦  │ │  │  ← Edit (top-left), Logo (top-right)
│  │   └─────┘                 └─────────┘ │  │
│  │                                       │  │
│  │   ┌─────────────────────────────────┐ │  │
│  │   │  ARTIST NAME              9.2   │ │  │  ← Score moves here
│  │   │  Venue · Date                   │ │  │
│  │   │  #1 All Time                    │ │  │  ← Rank with context
│  │   └─────────────────────────────────┘ │  │
│  └───────────────────────────────────────┘  │
│                                             │
│  ┌───────────────────────────────────────┐  │
│  │ 🎤 Show         ████████░░░  Great    │  │  ← "Show" not "Performance"
│  │ 🔊 Sound        ██████████░  Amazing  │  │
│  │ ...                                   │  │
│  └───────────────────────────────────────┘  │
│                                             │
│  ┌───────────────────────────────────────┐  │
│  │   ✦ Share to Instagram                │  │  ← Gradient CTA
│  └───────────────────────────────────────┘  │
│                                             │
└─────────────────────────────────────────────┘
```

## Files to Edit

| File | Changes |
|------|---------|
| `src/components/show-review/HeroPhotoSection.tsx` | Move Scene logo to top-right, add edit pencil to top-left, move rank badge into metadata bar with "All Time" context, move score into metadata bar |
| `src/components/ShowReviewSheet.tsx` | Remove header row, change "Performance" to "Show", pass `onEditPhoto` callback to HeroPhotoSection |

## Technical Notes

1. **Edit button callback**: The `onEditPhoto` will call the existing `onShareToEditor` prop since that opens the PhotoOverlayEditor
2. **Rank display**: Will show "Unranked" if no comparisons, otherwise `#X All Time`
3. **Score placement**: Moving score into the glass bar keeps the visual hierarchy clean while freeing up space for the logo
4. **No-photo state**: Will maintain similar layout but without the edit pencil (no photo to edit)

