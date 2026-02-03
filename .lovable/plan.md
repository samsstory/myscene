
# Redesign: Tag-Based Memory Capture Screen

## Overview
Transform the phone mockup in `CaptureShowcaseV2.tsx` from a numerical rating system to an expressive, tag-based memory capture experience. The redesign shifts the tone from "reviewing" to "remembering."

---

## Visual Structure

```text
┌─────────────────────────────────────┐
│  [Dynamic Island Spacer]            │
├─────────────────────────────────────┤
│  ┌─────────────────────────────────┐│
│  │                                 ││
│  │     [PHOTO - Rufus Du Sol]      ││
│  │                                 ││
│  │  ┌─Scene Logo─┐                 ││
│  │  └────────────┘                 ││
│  │                                 ││
│  │  ┌─────────────────────────────┐││
│  │  │ Rufus Du Sol                │││
│  │  │ Red Rocks Amphitheatre      │││  ← No score, no rank
│  │  │ September 14, 2024          │││
│  │  └─────────────────────────────┘││
│  └─────────────────────────────────┘│
├─────────────────────────────────────┤
│  What stood out?                    │  ← Friendly, conversational
│  Pick what made the night.          │  ← Subtle helper
├─────────────────────────────────────┤
│  The Show                           │  ← Lightweight category label
│  ┌─────────┐ ┌───────────────┐     │
│  │Surprise │ │Played classics│     │  ← Pill tags
│  │ song ✓  │ └───────────────┘     │
│  └─────────┘ ┌────────────┐        │
│              │Extended    │        │
│              │encore      │        │
│              └────────────┘        │
├─────────────────────────────────────┤
│  The Moment                         │
│  ┌─────────┐ ┌───────────┐         │
│  │Emotional│ │Crowd went │         │
│  │   ✓     │ │off  ✓     │         │
│  └─────────┘ └───────────┘         │
│  ┌─────────────┐ ┌──────────┐      │
│  │Front row    │ │ Mid tbh  │      │
│  │energy       │ └──────────┘      │
│  └─────────────┘                   │
├─────────────────────────────────────┤
│  The Space                          │
│  ┌──────────┐ ┌─────────────┐      │
│  │Sweaty    │ │Perfect      │      │
│  │basement  │ │sound ✓      │      │
│  └──────────┘ └─────────────┘      │
│  ┌───────────────┐                 │
│  │Beautiful      │                 │
│  │production     │                 │
│  └───────────────┘                 │
├─────────────────────────────────────┤
│  The People                         │
│  ┌──────────┐ ┌─────────────┐      │
│  │Went with │ │Everyone     │      │
│  │friends ✓ │ │sang         │      │
│  └──────────┘ └─────────────┘      │
├─────────────────────────────────────┤
│  ┌─────────────────────────────────┐│
│  │ "The sunrise set was unreal."  ││  ← Freeform note
│  │  My take (optional)            ││
│  └─────────────────────────────────┘│
├─────────────────────────────────────┤
│  ┌─────────────────────────────────┐│
│  │      Save this memory           ││  ← Primary CTA
│  └─────────────────────────────────┘│
│  ┌─────────────────────────────────┐│
│  │   Share to Instagram (subtle)   ││  ← De-emphasized
│  └─────────────────────────────────┘│
│  Logged on Oct 12, 2024            │
├─────────────────────────────────────┤
│        [Bottom Navigation]          │
└─────────────────────────────────────┘
```

---

## Implementation Details

### 1. Show Card (Top Anchor) - Simplified
**Remove:**
- Numeric score badge (9.4)
- "#1 All Time" ranking text
- Right-aligned score section

**Keep:**
- Photo with gradient overlay
- Scene watermark
- Glass metadata bar with artist, venue, date only

### 2. Replace Rating Section with Tag System

**Section Header:**
- "What stood out?" - friendly, not bold (`text-white/60 text-[10px] font-normal`)
- Helper text: "Pick what made the night." - subtle (`text-white/40 text-[8px]`)

**Tag Categories (4 total):**

| Category | Example Tags |
|----------|-------------|
| The Show | Surprise song, Played the classics, Extended encore |
| The Moment | Emotional, Crowd went off, Mid tbh, Front row energy |
| The Space | Sweaty basement, Perfect sound, Beautiful production |
| The People | Went with friends, Everyone sang, Met someone new, Felt connected |

**Tag Styling:**

```text
Unselected:
- bg-white/[0.03]
- border border-white/[0.08]
- text-white/50
- text-[8px]
- rounded-full px-2 py-0.5

Selected:
- background: linear-gradient (primary to secondary at 20% opacity)
- border-primary/40
- text-white/80
- slight scale transform (scale-[1.02])
- subtle glow shadow
```

**Pre-selected tags for mockup visual:**
- "Emotional" (The Moment)
- "Crowd went off" (The Moment)  
- "Perfect sound" (The Space)
- "Went with friends" (The People)

### 3. Freeform Note Section
- Remove italic styling and quotes
- Label: "My take (optional)" - subtle text-white/40
- Placeholder visible: "The sunrise set was unreal."
- Simple glass container, same as current

### 4. CTAs
**Primary:**
- Text: "Save this memory"
- Keep gradient background
- Emotion-forward styling

**Secondary:**
- "Share to Instagram" 
- More subtle: reduce opacity, smaller text
- Remove from primary visual flow

### 5. Remove Instagram Emphasis
- Keep the button but make it more subtle
- text-white/40 instead of text-white/70
- Optional: remove icon or shrink it

---

## File Changes

### `src/components/landing/v2/CaptureShowcaseV2.tsx`

1. **Define tag data structure** at top of file with categories and selection states
2. **Modify ShowReviewMockup component:**
   - Remove score badge and ranking from metadata bar
   - Replace rating bars with tag grid system
   - Update note section styling
   - Update CTA text
   - De-emphasize share button

---

## Styling Approach

The design follows Scene's brand aesthetic:
- Dark background with subtle glass containers
- Cyan-to-coral gradient for selected states (at low opacity)
- White text with varying opacity levels for hierarchy
- Rounded pill shapes for tags
- No bold dividers - subtle category labels only

---

## Technical Notes

- This is a **static mockup** - no actual state management needed
- Pre-select ~4 tags visually to show the "filled" state
- Keep layout compact to fit within phone mockup viewport
- Maintain existing bottom navigation and FAB styling
