

# Replace ShareExperience with CaptureShowcase Section

## Goal
Replace the current "Made for stories" section with a new "Capture every show" spotlight section that showcases the Top Ranked Shows list UI, matching the visual pattern of other spotlight sections on the landing page.

---

## Current Page Structure
```text
LandingHero → ValuePillars → RankingSpotlight → ShareExperience → LandingCTA
```

## New Page Structure
```text
LandingHero → ValuePillars → RankingSpotlight → CaptureShowcase → LandingCTA
```

---

## New Section Design

### Layout (mirrors RankingSpotlight)
- Two-column grid on desktop (lg:grid-cols-2)
- Phone mockup on one side, copy on the other
- Phone tilted left for visual variety
- Background glow accent

### Phone Mockup Content: "Top Ranked Shows" List

```text
┌─────────────────────────────────┐
│  SCENE ✦                   [👤] │  ← Header
├─────────────────────────────────┤
│  ← Top Ranked Shows             │  ← Page title with back arrow
├─────────────────────────────────┤
│  [All Time ▼]        [↕ Best]   │  ← Filter bar
├─────────────────────────────────┤
│ ┌─────────────────────────────┐ │
│ │ [📷]  Rufus Du Sol         │ │  ← Photo thumbnail
│ │       Red Rocks            │ │  ← Venue
│ │       Sep 2024        #1   │ │  ← Date + Rank
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │ [📷]  Odesza               │ │  ← Photo thumbnail
│ │       The Gorge            │ │
│ │       Jul 2024        #2   │ │
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │ [📷]  Disclosure           │ │
│ │       Brooklyn Mirage      │ │
│ │       Aug 2024        #3   │ │
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │ [📷]  Bonobo               │ │
│ │       Hollywood Bowl       │ │
│ │       Oct 2024        #4   │ │
│ └─────────────────────────────┘ │
├─────────────────────────────────┤
│  [🏠]    [🌐]    [👑]    [➕]   │  ← Bottom nav
└─────────────────────────────────┘
```

**Key clarification:** Every show will have a concert photo thumbnail (no music note placeholders). Using demo concert images from Unsplash.

---

## Technical Implementation

### File Changes

**1. Create new file: `src/components/landing/CaptureShowcase.tsx`**

New component with:
- `TopRankedMockup` - Phone screen showing the list UI
- Similar structure to `RankingSpotlight` component
- Uses `PhoneMockup` component with `tilt="left"`

**Mock show data (all with photos):**
```tsx
const mockShows = [
  { 
    artist: "Rufus Du Sol", 
    venue: "Red Rocks", 
    date: "Sep 2024", 
    rank: 1,
    photo: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=100&q=80"
  },
  { 
    artist: "Odesza", 
    venue: "The Gorge", 
    date: "Jul 2024", 
    rank: 2,
    photo: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=100&q=80"
  },
  { 
    artist: "Disclosure", 
    venue: "Brooklyn Mirage", 
    date: "Aug 2024", 
    rank: 3,
    photo: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=100&q=80"
  },
  { 
    artist: "Bonobo", 
    venue: "Hollywood Bowl", 
    date: "Oct 2024", 
    rank: 4,
    photo: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=100&q=80"
  },
];
```

**Component structure:**
- Header bar with SCENE logo and avatar
- "Top Ranked Shows" title with back arrow icon
- Filter bar: glass pill with "All Time" dropdown and "Best" sort toggle
- Show list cards with:
  - 56x56px rounded photo thumbnail (left)
  - Artist name (bold white)
  - Venue (white/60, smaller)
  - Date (white/40, smaller)
  - Rank badge "#1" (right-aligned, white/50)
- Bottom nav with Home, Globe, Crown, and Plus FAB

**Styling details:**
- Cards: `bg-white/[0.03] border border-white/[0.08] rounded-xl`
- Glassmorphism filter bar
- Photo thumbnails: `rounded-lg object-cover`
- Consistent with Scene aesthetic

**2. Update `src/pages/Index.tsx`**
- Replace `ShareExperience` import with `CaptureShowcase`
- Update component usage in the page

**3. Delete `src/components/landing/ShareExperience.tsx`**
- No longer needed after replacement

---

## Copy Content

**Headline:** "Your concert history, ranked."

**Subheadline:** "Every show you've ever been to, beautifully organized and instantly searchable. Scene becomes your personal concert archive."

**Feature list (using bullet points or inline):**
- Log artists, venues, dates, and your ratings
- Add photos to remember the night
- Filter by time period, sort by rank or date
- Your complete concert timeline in one place

---

## Visual Styling

- Background glow: Primary color, positioned to complement RankingSpotlight
- Phone tilt: "left" 
- Glassmorphism cards matching Scene aesthetic
- All shows have photo thumbnails (no placeholder icons)
- Consistent spacing and typography with other sections

