

## Plan: Update WelcomeCarousel Copy and Visual Layout

### File: `src/components/onboarding/WelcomeCarousel.tsx`

**Text Changes (lines ~22–141):**

1. **Calendar label** (line ~24): `"Your shared concert calendar"` → `"Your concert timeline"`
2. **Main headline** (line ~128): `"See who's going"` → `"Track, rank, and share every concert"`
3. **Subcopy** (line ~132): `"Log shows, share your calendar, and never miss a concert your friends are at"` → `"Build your concert history, power-rank your favorite sets, and see which shows your friends are hitting."`
4. **Button** (line ~137): `"Add My First Show"` → `"Log My First Show"`

**Visual Asset Update (HeroMockup component):**

Replace the current single Fred again.. card with a composite layout:
- Keep the Fred again.. photo but apply stronger blur/fade as a background layer
- Add a foreground mock of the ranking interface (two concert cards side-by-side with a "Which was better?" prompt, mimicking a swipe-compare UI)
- Move the friend avatar row from below the card to overlay the top-right corner of the hero card (small, semi-transparent)
- Remove the `Calendar` icon + label row and replace with the new `"Your concert timeline"` label using a `Clock` or `ListMusic` icon

### Technical Details

All changes are in `src/components/onboarding/WelcomeCarousel.tsx`. The `HeroMockup` internal component will be restructured:

- Background: Fred again.. image with `brightness(0.6) blur(2px)` for atmospheric depth
- Foreground: Two mini cards (e.g. "Fred again.." vs "ODESZA") with a "Which was better?" label, styled as a compact compare UI
- Friend avatars: Repositioned to absolute top-right of the card with a subtle backdrop blur pill
- The `"3 friends going"` badge is removed (no longer calendar-focused)

No database or backend changes needed. Single file edit.

