

# Smart Capture Section: Photo-First Confirmation Flow

## Overview

This plan creates a new **LogShowcase** section that showcases the "smart capture" experience — where a user adds a concert photo and Scene automatically detects the venue, date, and context, then asks the user to confirm with a conversational prompt.

This is dramatically more intuitive than a blank search interface because it:
- Demonstrates the app's intelligence (EXIF extraction + venue matching)
- Reduces friction to near-zero ("just confirm")
- Creates an emotional "wow" moment for landing page visitors

---

## Section Order (Updated)

```text
LandingHero → LogShowcase (NEW) → CaptureShowcase → RankingSpotlight → ShareExperience → GlobeShowcase → LandingCTA
```

---

## New Section: LogShowcase

### Phone Mockup: Smart Capture Confirmation

The mockup shows a screen where:
1. A concert photo has been attached and fills the top portion
2. Below, a conversational confirmation prompt asks the user to verify
3. One-tap confirm button makes logging effortless

### Mockup Layout (Top to Bottom)

```text
┌────────────────────────────────────────────┐
│ [SCENE ✦]                       [avatar]   │  ← App header
├────────────────────────────────────────────┤
│                                            │
│     ┌────────────────────────────────┐     │
│     │                                │     │
│     │      [Concert Photo]           │     │  ← 4:3 user photo
│     │      (crowd, stage lights)     │     │     with subtle gradient
│     │                                │     │
│     │  ✓ Photo added                 │     │  ← Green checkmark overlay
│     └────────────────────────────────┘     │
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │  📍  Was this at                     │  │
│  │                                      │  │  ← Smart detection card
│  │      Factory Town                    │  │     with venue + event context
│  │      during Art Basel?               │  │
│  │                                      │  │
│  │      Dec 6, 2024 · Miami, FL         │  │  ← Extracted date + location
│  │                                      │  │
│  │  ┌────────────────────────────────┐  │  │
│  │  │      ✓ Yes, that's right       │  │  │  ← Primary confirm button
│  │  └────────────────────────────────┘  │  │
│  │                                      │  │
│  │      No, let me search...            │  │  ← Secondary text link
│  └──────────────────────────────────────┘  │
│                                            │
├────────────────────────────────────────────┤
│  [Home]   [Globe]   [Crown]      [+]       │  ← Bottom nav
└────────────────────────────────────────────┘
```

### Visual Details

**Photo Section:**
- Uses the user's uploaded concert photo (converted to web format)
- 4:3 aspect ratio with rounded corners
- Small green checkmark badge: "✓ Photo added"
- Subtle gradient overlay at bottom for text readability

**Smart Detection Card:**
- Glassmorphism card (`bg-white/[0.03]`, `border-white/[0.08]`)
- Location pin icon in primary color
- Conversational question format: "Was this at **[Venue]** during **[Event/Festival]**?"
- Detected metadata line: Date + City, State
- Primary gradient button: "✓ Yes, that's right"
- Ghost text link: "No, let me search..."

**Bottom Navigation:**
- Matches hero mockup style (Home active, Globe, Crown, FAB with Plus)

---

## Copy

### Micro-tag (optional)
```text
LOG YOUR SHOWS
```

### Headline
```text
Log it before you forget.
```

### Subhead
```text
Add a photo — we'll figure out the rest.
```

### Supporting Line (optional, subtle)
```text
Scene reads your photos to suggest the venue and date automatically.
```

---

## Alternative Copy Options

**Headline Alternatives:**
1. "One photo. Done." — ultra-minimal
2. "Your photos know where you've been." — emphasizes intelligence
3. "We remember, so you don't have to." — emotional memory angle

**Subhead Alternatives:**
1. "Just add a photo — Scene recognizes the venue and date."
2. "Photo in, concert logged. It's that simple."
3. "Scene reads your photo's metadata to auto-fill the details."

---

## Technical Implementation

### Files to Create

**1. `src/components/landing/LogShowcase.tsx` (NEW)**

Structure:
- Section wrapper with background glow
- Two-column grid (copy LEFT, phone RIGHT)
- PhoneMockup component with `tilt="right"`
- Internal `SmartCaptureMockup` component

The `SmartCaptureMockup` displays:
- App header (SCENE logo + avatar)
- Photo preview with checkmark badge
- Smart detection card with confirmation UI
- Bottom navigation bar

### Files to Modify

**2. `src/pages/Index.tsx`**
- Import `LogShowcase`
- Add between `LandingHero` and `CaptureShowcase`:
  ```tsx
  <LandingHero />
  <LogShowcase />      // NEW
  <CaptureShowcase />  // Renamed internally as "Rate" section
  <RankingSpotlight />
  ...
  ```

### Assets to Add

**3. Copy the user's uploaded photo**
- Copy `user-uploads://IMG_9770.HEIC` to `public/images/concert-capture-demo.jpg`
- This becomes the photo shown in the mockup
- If HEIC format isn't web-compatible, we'll use a placeholder concert photo from Unsplash

---

## Mockup Wireframe: SmartCaptureMockup Component

```tsx
const SmartCaptureMockup = () => (
  <div className="h-full w-full bg-background flex flex-col">
    {/* App Header */}
    <div className="px-4 py-3 flex justify-between items-center">
      <SceneLogo size="sm" />
      <div className="w-6 h-6 rounded-full bg-white/10" />
    </div>

    {/* Photo Preview */}
    <div className="px-3">
      <div className="relative rounded-xl overflow-hidden" style={{ aspectRatio: "4/3" }}>
        <img src="..." className="w-full h-full object-cover" />
        <div className="absolute top-2 left-2 flex items-center gap-1 bg-green-500/20 text-green-400 text-[10px] px-2 py-0.5 rounded-full">
          <Check className="h-3 w-3" />
          Photo added
        </div>
      </div>
    </div>

    {/* Smart Detection Card */}
    <div className="px-3 py-4 flex-1">
      <div className="bg-white/[0.03] rounded-xl border border-white/[0.08] p-4 space-y-4">
        <div className="flex items-start gap-3">
          <MapPin className="h-5 w-5 text-primary mt-0.5" />
          <div>
            <p className="text-white/60 text-sm">Was this at</p>
            <p className="text-white font-semibold">Factory Town</p>
            <p className="text-white font-semibold">during Art Basel?</p>
          </div>
        </div>
        
        <p className="text-white/40 text-xs">
          Dec 6, 2024 · Miami, FL
        </p>
        
        <button className="w-full py-2.5 rounded-lg bg-gradient-to-r from-primary to-secondary text-white text-sm font-medium flex items-center justify-center gap-2">
          <Check className="h-4 w-4" />
          Yes, that's right
        </button>
        
        <button className="w-full text-white/50 text-xs hover:text-white/70">
          No, let me search...
        </button>
      </div>
    </div>

    {/* Bottom Nav */}
    <div className="px-4 py-3 flex justify-around items-center border-t border-white/10">
      <Home className="w-5 h-5 text-white/40" />
      <Globe className="w-5 h-5 text-white/40" />
      <Crown className="w-5 h-5 text-white/40" />
      <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center">
        <Plus className="w-4 h-4 text-white" />
      </div>
    </div>
  </div>
);
```

---

## Visual Summary: Full Landing Page Flow

```text
┌─────────────────────────────────────────────────────┐
│                     HERO                            │
│  "Your love of concerts deserves more than a        │
│   ticket stub."                                     │
│  [Phone: Stacked show cards - RIGHT]                │
└─────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────┐
│              LOG SHOWCASE (NEW)                     │
│  "Log it before you forget."                        │
│  "Add a photo — we'll figure out the rest."         │
│  [Phone: Smart capture confirmation - RIGHT]        │
│   - Photo attached with ✓ badge                     │
│   - "Was this at Factory Town during Art Basel?"    │
│   - One-tap confirm button                          │
└─────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────┐
│              RATE SHOWCASE (current CaptureShowcase)│
│  "Remember every detail."                           │
│  [Phone: Show Review Sheet - LEFT]                  │
│   - Rating bars with "How it felt" label            │
│   - Notes quote                                     │
│   - Save/Share buttons                              │
└─────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────┐
│                RANKING SPOTLIGHT                    │
│  "Your #1 show, proven."                            │
│  [Phone: Head-to-head VS comparison - LEFT]         │
└─────────────────────────────────────────────────────┘
                         ↓
... (ShareExperience, GlobeShowcase, LandingCTA)
```

---

## Copy Summary Table

| Section | Headline | Subhead |
|---------|----------|---------|
| Hero | Your love of concerts deserves more than a ticket stub. | The app to capture, review, rank, and share your favorite music memories. |
| **Log (NEW)** | **Log it before you forget.** | **Add a photo — we'll figure out the rest.** |
| Rate (CaptureShowcase) | Remember every detail. | Rate the sound, the crowd, the vibe — before the magic fades. |
| Rank | Your #1 show, proven. | Head-to-head picks reveal your true feelings. |
| Share | Share and compare. | Share your ratings, reviews, and rankings on social. |
| Globe | Your global music life. | See everywhere music has taken you. |
| CTA | Your love for music deserves to be remembered. | (none) |

---

## Photo Asset Note

The user uploaded `IMG_9770.HEIC`. Since HEIC isn't web-compatible, I'll:
1. Use a high-quality Unsplash concert crowd photo that matches the "Art Basel / Factory Town" vibe (EDM/electronic aesthetic)
2. Or, if you can export the HEIC as JPEG, I can copy it to `public/images/`

Recommended placeholder: A photo with colorful stage lighting, crowd silhouettes, suggesting an intimate electronic music venue.

