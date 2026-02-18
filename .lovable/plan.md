
# Redesign: Logged Show Invite Page

## Problems to Fix

1. **Full address exposed** — `venue_location` returns the raw street address. Strip to city/state only using a simple parser.
2. **Artist face cropped** — The hero image is 224px tall with `object-top`. Increasing to ~280-300px and using `object-[center_20%]` gives more control over face framing vs. `object-top` which cuts from the very top.
3. **"Were you there?" flow lacks urgency** — Generic buttons with no emotional hook. Replace entirely with a blurred highlights teaser + "What did YOU think?" framing.
4. **Three equal-weight options** — Reduces decisiveness. Replace with a prominent primary CTA ("Log what I thought") and a single ghost "I didn't make it" escape option.

---

## New Design Concept: "Blurred Highlights Teaser"

### Visual Hierarchy (top to bottom inside one card)

```text
┌─────────────────────────────────┐
│  [SCENE wordmark]               │ ← top-left watermark
│                                 │
│   Artist full-face photo        │ ← taller hero ~290px, face centered
│                                 │
│  Artist Name                    │ ← bottom-left, bold
│  Venue Name · City   •  Date    │ ← single muted line below name
└─────────────────────────────────┘
│                                 │
│  [inviter avatar initial]       │
│  Sam left their review          │ ← attribution line
│                                 │
│  ── THEIR HIGHLIGHTS ──         │ ← section label, muted caps
│  [blurred pill] [blurred pill]  │ ← 3-5 fake/static blurred pills
│  [blurred pill] [blurred pill]  │   with a frosted overlay + lock icon
│                                 │
│  [  Log what I thought  →  ]    │ ← primary CTA, full width gradient btn
│  [  I wasn't there              │ ← ghost text link below, small, muted
└─────────────────────────────────┘
```

---

## Implementation Details

### 1. Address Stripping
The `venue_location` field contains full street addresses like "8509 Burleson Rd, Building 1, #100, Austin, TX 78719". Parse out just the city + state abbreviation using a simple string utility:

```ts
// Extract "Austin, TX" from a full address string
function extractCityState(location: string | null): string | null {
  if (!location) return null;
  // Addresses tend to end with "City, ST ZIPCODE" — grab last two comma-segments before zip
  const parts = location.split(",").map(s => s.trim());
  // Find the part that looks like a US state abbreviation pattern
  const stateZipIdx = parts.findIndex(p => /^[A-Z]{2}\s+\d{5}/.test(p));
  if (stateZipIdx >= 1) {
    const city = parts[stateZipIdx - 1];
    const stateCode = parts[stateZipIdx].split(" ")[0];
    return `${city}, ${stateCode}`;
  }
  // Fallback: return venue_name only
  return parts[0];
}
```

The venue line then becomes: `Venue Name · City, ST` — a single clean line.

### 2. Artist Image Framing
- Increase hero height from `h-56` (224px) to `h-[280px]`
- Change `object-top` → `object-[center_15%]` to show face/head rather than the very top of the image
- Keep existing gradient overlay (`from-black/80 via-black/20 to-transparent`)

### 3. Blurred Highlights Section (the hook)

Use a **static set of 4-5 real highlight pill labels** from `TAG_CATEGORIES` (e.g. "Core memory", "Took me somewhere", "Chills", "Crowd went off", "Sound was dialed"). These are displayed as frosted glass pills with a heavy blur + opacity reduction, overlaid with a lock icon and the message "Unlock after you log yours". This communicates:
- The inviter left a real review with real tags
- You can see them — but only after you log yours
- Creates genuine curiosity/FOMO

Implementation:
```tsx
const TEASER_HIGHLIGHTS = ["Core memory", "Took me somewhere", "Chills", "Crowd went off", "Sound was dialed"];

// Rendered as blurred pills
<div className="flex flex-wrap gap-2 relative">
  {TEASER_HIGHLIGHTS.map((tag) => (
    <span key={tag} className="px-3 py-1.5 rounded-full text-xs font-medium bg-white/[0.08] border border-white/[0.10] text-white/80"
      style={{ filter: "blur(5px)", userSelect: "none" }}>
      {tag}
    </span>
  ))}
  {/* Frosted overlay */}
  <div className="absolute inset-0 flex items-center justify-center gap-1.5 rounded-xl">
    <Lock className="h-3 w-3 text-foreground/40" />
    <span className="text-[11px] text-foreground/40">Unlocks after you log yours</span>
  </div>
</div>
```

### 4. CTA Restructure
Remove the "Were you there?" label entirely. Replace with:

- **Primary button** (full-width, gradient): "Log what I thought →"
- **Ghost escape** (text link below, small): "I wasn't there" — this triggers the signup with `rsvp: "no"` param, same as before

This creates clear intent hierarchy: the primary action is logging, the escape valve is de-emphasized.

### 5. Signup Form Copy Update
When the user taps "Log what I thought →":
- Heading: "Your review stays hidden until {inviterDisplay} sees it"
- Sub: "Create a free account to log {artistName} and compare notes"

When user taps "I wasn't there":
- Heading: "No worries — join Scene anyway"  
- Sub: "Track shows you've been to and discover what your friends think"

---

## Files to Change

**`src/components/landing/ShowInviteHero.tsx`** — all changes are contained here:
- Add `extractCityState()` utility function
- Increase hero height + adjust image positioning
- Add `TEASER_HIGHLIGHTS` constant (static pills, no DB change needed)
- Replace RSVP section with blurred highlights block + two-tier CTA
- Update signup form copy per path
- Remove `RSVP_OPTIONS` array and `RsvpChoice` type (no longer needed for logged flow)
- Keep the upcoming show RSVP path unchanged

No database migrations or new RPC functions required — the static blurred pills approach avoids needing to fetch actual inviter tags (which should stay private server-side anyway).
