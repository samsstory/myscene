

# Update Hero Phone Mockup with Specific Artist Cards

## Goal
Update the phone mockup in the hero section to showcase the stacked card UI with the requested artists: Fred Again.. (expanded), Mau P, Post Malone, The Blaze, and T-Pain (collapsed).

---

## Card Layout

```text
┌─────────────────────────────────┐
│  SCENE ✦                    [👤]│  ← App header
├─────────────────────────────────┤
│ ┌─────────────────────────────┐ │
│ │ #1                     [📷] │ │  ← Expanded card (Fred Again..)
│ │                             │ │
│ │     [Concert Photo]         │ │
│ │                             │ │
│ │ Fred again..                │ │  ← Artist name
│ │ Alexandra Palace  SCENE ✦   │ │  ← Venue + watermark
│ └─────────────────────────────┘ │
├─────────────────────────────────┤
│  Odesza                         │  ← Collapsed card 1
├─────────────────────────────────┤
│  Mau P                          │  ← Collapsed card 2
├─────────────────────────────────┤
│  Post Malone                    │  ← Collapsed card 3
├─────────────────────────────────┤
│  The Blaze                      │  ← Collapsed card 4
├─────────────────────────────────┤
│  T-Pain                         │  ← Collapsed card 5
└─────────────────────────────────┘
```

---

## Technical Changes

### File: `src/components/landing/LandingHero.tsx`

Update the `MockShowCard` component with:

1. **Expanded card** - Fred Again.. at Alexandra Palace (already present)
2. **Collapsed peek cards below** - Update to show: Odesza, Mau P, Post Malone, The Blaze, T-Pain

### Artist Data

| Position | Artist | Text Opacity | Z-Index |
|----------|--------|--------------|---------|
| **Expanded** | **Fred again..** | Full | z-0 |
| Collapsed 1 | Odesza | 80% | z-[-1] |
| Collapsed 2 | Mau P | 60% | z-[-2] |
| Collapsed 3 | Post Malone | 50% | z-[-3] |
| Collapsed 4 | The Blaze | 40% | z-[-4] |
| Collapsed 5 | T-Pain | 30% | z-[-5] |

---

## Visual Details

- Each collapsed card uses progressively lower opacity to create depth
- Negative z-index values layer cards behind the expanded view
- Cards use glassmorphism styling: `bg-white/[0.03] backdrop-blur-sm border-white/[0.08]`
- Negative margins create the stacked overlap effect

