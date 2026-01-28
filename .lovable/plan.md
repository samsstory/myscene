

# ShowReviewSheet Redesign: Scene Aesthetic & Viral Optimization

## Overview
Completely redesign the ShowReviewSheet to match the "Scene" brand aesthetic (luminous glow effects, glass morphism, wide tracking typography) while optimizing for viral sharing. The sheet will become a "share-ready preview" that immediately celebrates the experience.

## Current Issues Identified

1. **Photo Sync Bug**: `photoUrl` state doesn't update when switching shows (needs `useEffect`)
2. **Missing Scene Branding**: No SceneLogo, no glow effects, no glass pill styling
3. **Cluttered Layout**: Separate sections with heavy separators, collapsible sections add friction
4. **CTA Hierarchy**: Share button buried below photo, not prominent enough
5. **Dense Information**: Too much scrolling, not immediately "Instagrammable"

## New Design Architecture

```text
┌─────────────────────────────────────────────┐
│  [X Close]               [Edit] (ghost)     │  ← Minimal header
├─────────────────────────────────────────────┤
│                                             │
│  ┌───────────────────────────────────────┐  │
│  │                                       │  │
│  │         HERO PHOTO (60% height)       │  │  ← Dominant visual
│  │                                       │  │
│  │   ┌─────┐                 ┌────────┐  │  │
│  │   │#2   │                 │ 9.2/10 │  │  │  ← Floating badges
│  │   └─────┘                 └────────┘  │  │
│  │                                       │  │
│  │   ┌─────────────────────────────────┐ │  │
│  │   │  ARTIST NAME                    │ │  │  ← Glass overlay bar
│  │   │  Venue · Date                   │ │  │
│  │   └─────────────────────────────────┘ │  │
│  │                         Scene ✦       │  │  ← Watermark
│  └───────────────────────────────────────┘  │
│                                             │
│  ┌───────────────────────────────────────┐  │
│  │ 🎤 Performance  ████████░░░  Great    │  │  ← Compact rating bars
│  │ 🔊 Sound        ██████████░  Amazing  │  │
│  │ 💡 Lighting     ██████░░░░░  Okay     │  │
│  └───────────────────────────────────────┘  │
│                                             │
│  ┌───────────────────────────────────────┐  │
│  │ "The energy was unreal..."            │  │  ← My Take (quote style)
│  └───────────────────────────────────────┘  │
│                                             │
│  ┌───────────────────────────────────────┐  │
│  │   ✦ Share to Instagram (gradient)     │  │  ← Primary CTA (glowing)
│  └───────────────────────────────────────┘  │
│  [+ Add Photo]   [Upload New]   [Remove]    │  ← Secondary actions (ghost)
│                                             │
└─────────────────────────────────────────────┘
```

## Implementation Details

### 1. Fix Photo Sync Bug
Add `useEffect` to sync `photoUrl` state when show changes:

```typescript
useEffect(() => {
  setPhotoUrl(show?.photo_url || null);
}, [show?.id, show?.photo_url]);
```

### 2. Hero Photo Section
Replace current photo section with immersive hero layout:

- **Photo container**: `aspect-[4/3]` with rounded corners, full bleed
- **Gradient overlay**: `bg-gradient-to-t from-black/80 via-black/20 to-transparent`
- **Floating rank badge**: Top-left using ShowRankBadge component
- **Floating score badge**: Top-right with gradient pill matching score color
- **Glass metadata bar**: Bottom overlay with artist, venue, date
- **SceneLogo watermark**: Bottom-right corner

### 3. No-Photo State
When no photo exists, show an inviting upload prompt:

- Gradient background based on score
- Large "Add a Photo" button with camera icon
- Subtle pulsing glow effect to draw attention

### 4. Compact Rating Display
Replace collapsible sections with always-visible compact bars:

- Single-line per rating: icon + label + progress bar + text
- Gradient-filled bars matching score colors
- Use glass pill container with subtle border

### 5. Notes Section ("My Take")
Style as a quotation card:

- Glass pill background (`bg-white/5 backdrop-blur-sm`)
- Quotation marks icon or typography
- Wide tracking on header text

### 6. Rank Display (Simplified)
Remove complex toggle groups, show inline rank:

- When rank exists: "Ranked #X of Y · Top Z%"
- Single glass pill, not a collapsible section
- Time filter as a simple dropdown (tap to change)

### 7. Primary CTA: Share to Instagram
Make this the dominant action:

- Full-width gradient button (pink-purple-indigo)
- Glow shadow effect
- Instagram icon with "Share to Instagram" text
- Positioned prominently after content

### 8. Secondary Actions
Consolidate photo management into a compact row:

- Ghost/outline style buttons
- "Add Photo", "Change", "Remove" as icon buttons or small text links
- Edit button moves to header (top-right, ghost style)

### 9. Scene Typography & Effects
Apply consistent Scene aesthetic:

- Headers: `font-black tracking-[0.15em] uppercase`
- Glow effects: `textShadow: "0 0 8px rgba(255,255,255,0.3)"`
- Glass containers: `bg-white/5 backdrop-blur-sm border border-white/10`

## Files to Edit

| File | Changes |
|------|---------|
| `src/components/ShowReviewSheet.tsx` | Complete redesign with Scene aesthetic |

## Technical Implementation

### New Component Structure

```typescript
// Key sections in order:
1. useEffect for photoUrl sync (BUG FIX)
2. HeroPhotoSection (new sub-component or inline)
   - Photo with overlays
   - Floating badges (rank, score)
   - Glass metadata bar
   - SceneLogo watermark
3. CompactRatingsSection
   - Horizontal gradient bars
   - No collapsible wrapper
4. NotesQuoteCard
   - Glass pill with quote styling
5. ShareCTA
   - Gradient Instagram button (primary)
6. SecondaryActions
   - Photo management (ghost buttons)
```

### Imports to Add

```typescript
import SceneLogo from "@/components/ui/SceneLogo";
import { ShowRankBadge } from "@/components/feed/ShowRankBadge";
import { cn } from "@/lib/utils";
```

### Removed Elements

- SheetTitle "Show Review" (replace with minimal close button)
- Collapsible ranking section (simplify to inline badge)
- Verbose labels with icons (Artists, Venue, Date sections)
- Heavy Separator components (use spacing instead)
- Duplicate ShareShowSheet component (keep for fallback only)

## Visual Styling Reference

### Glass Pill Container
```typescript
className={cn(
  "rounded-xl overflow-hidden",
  "bg-white/[0.03] backdrop-blur-sm",
  "border border-white/[0.08]"
)}
```

### Glowing Text
```typescript
style={{ textShadow: "0 0 12px rgba(255,255,255,0.4)" }}
className="font-bold tracking-wide"
```

### Gradient Share Button
```typescript
className={cn(
  "w-full py-4 rounded-xl font-semibold",
  "bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500",
  "shadow-lg shadow-purple-500/30",
  "hover:shadow-purple-500/50 transition-all"
)}
```

## Viral Loop Optimization

1. **Share-Ready Preview**: Photo hero with overlays mirrors what gets shared
2. **Prominent CTA**: Instagram button is impossible to miss
3. **SceneLogo Watermark**: Brand awareness on every shared image
4. **Quick Path**: Tap card → See beautiful review → One tap to share
5. **FOMO Trigger**: Rank badge ("Top 5%") encourages sharing achievements

