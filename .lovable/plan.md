

## Remove "Friend features dropping soon" Toast Notification

### Problem
When tapping the "See who else was there" teaser card at the bottom of the dashboard, it fires a toast notification saying "Friend features dropping soon" that is redundant with the teaser card itself. The card already communicates the "coming soon" message. The user also notes spacing around the teaser card is off.

### Changes

**1. `src/components/home/FriendTeaser.tsx`**
- Remove the `toast()` call and the `use-toast` import entirely
- Remove the `onClick` handler (or make the component non-interactive / just a static display)
- Review and tighten padding/spacing on the component to fix the spacing issue visible in the screenshot

**2. No other files affected**
- `FriendTeaser` is only imported in `src/components/Home.tsx` (line 28, rendered at line 417)
- The toast is only triggered from `FriendTeaser.tsx` — no other file fires this message

### Result
The redundant toast notification will be gone. The "See who else was there" teaser remains as a quiet, static hint at the bottom of the dashboard with corrected spacing.

