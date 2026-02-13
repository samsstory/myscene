

# Social Teaser: "Who else was there?" Friend Activity Preview

## Product Rationale

The strongest friend mechanic for a concert-tracking app is **shared experience discovery** -- showing that friends attended the same shows. This is compelling because:

- It's passive and low-friction (no messaging, no requests)
- It creates instant "no way, you were there too?!" moments
- It naturally extends the existing show-logging behavior into a social graph
- It teases future features (compare rankings, shared memories) without requiring them to be built yet

## What Gets Added

A subtle, glassmorphism-styled teaser card placed directly below the Recent Shows stack. It hints at a "friends who were there" feature with a coming-soon feel.

**Design:**
- Frosted glass card matching the Scene aesthetic (bg-white/[0.04], border-white/10)
- 2-3 overlapping placeholder avatar circles (ghost/silhouette style) on the left
- Text like **"See who else was there"** or **"Compare with friends"** as the headline
- Subtext: "Coming soon" in muted text with a subtle primary glow
- A small lock or sparkle icon to signal it's an upcoming feature
- Tapping it shows a brief toast: "Friend features dropping soon"

This approach avoids building any backend but creates anticipation and validates interest.

## Technical Details

### New Component
**`src/components/home/FriendTeaser.tsx`**
- A self-contained presentational component
- Renders overlapping avatar placeholders (3 circles with User silhouette icons)
- Headline text + "Coming soon" badge
- onClick fires a `toast()` message
- Matches existing glassmorphism patterns used throughout the app

### Modified File
**`src/components/Home.tsx`**
- Import `FriendTeaser`
- Place it directly after the `StackedShowList` block (after line 414), inside the same `space-y-3` wrapper, only rendering when the user has 1+ shows
- No backend changes, no new tables, no new API calls

### Styling
- Consistent with the frosted-glass pill and card aesthetic already in use
- Avatar circles use `bg-white/10` with a subtle border
- Primary color glow on the "Coming soon" text to draw the eye without being loud
