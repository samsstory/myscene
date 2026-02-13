

## Updated Welcome Screen: Hero Mockup + New Copy

### What Changes

Replace the current `StackedCardsMockup` in the welcome screen with the **V2 hero mockup** from `LandingHeroV2.tsx` (the "ceremonial reveal" design with emotional tags and faded runner-ups). Update the subheadline copy.

### New Welcome Screen Layout

1. **Scene logo** at top
2. **Mockup visual** -- The V2 hero `MockShowCard` design featuring:
   - "That show." quiet caption
   - Fred again.. #1 card with moody photo treatment and vignette
   - Three emotional tag pills ("Emotional..", "Crowd went off", "Venue was insane!")
   - Faded runner-up stack (ODESZA, Rufus Du Sol, Jamie xx) with opacity decay
3. **Headline**: "Your live music journey starts here"
4. **Subheadline**: "Log shows, rank them against each other, and compare with friends."
5. **Primary CTA**: "Log Your First Show"
6. **Secondary link**: "Take a quick tour first"

### Technical Changes

**`src/components/onboarding/WelcomeCarousel.tsx`**

- Remove the multi-slide carousel, pagination dots, `Carousel`/`CarouselContent`/`CarouselItem` imports, and `CarouselApi` state
- Remove `StackedCardsMockup`, `ShowReviewMockup`, `StoryShareMockup`, `CarouselSlide`, `collapsedCards`, and `slides` constants
- Add a new `HeroMockup` component ported from `LandingHeroV2.tsx`'s `MockShowCard`:
  - "That show." caption
  - Fred again.. hero card (16/11 aspect, moody filter, vignette, artist/venue/date overlay)
  - Emotional tag pills row (`emotionalTags` array)
  - Runner-up faded stack (`runnerUps` array with opacity/blur fade)
- Render a single static screen with:
  - Mesh gradient background (keep existing)
  - SceneLogo at top (keep existing)
  - `HeroMockup` in a 4:3 rounded container
  - Headline + updated subheadline
  - "Log Your First Show" button calling `onComplete`
  - "Take a quick tour first" text button calling new `onTakeTour` prop
- Add `onTakeTour` prop to `WelcomeCarouselProps`

**`src/pages/Dashboard.tsx`**

- Update `handleOnboardingComplete` to skip the spotlight tour, set `onboarding_step` to `"completed"`, and open the unified add flow (`setShowUnifiedAdd(true)`)
- Add a new `handleTakeTour` handler that sets `onboarding_step` to `"spotlight_tour"` and starts the tour (existing behavior)
- Pass both `onComplete={handleOnboardingComplete}` and `onTakeTour={handleTakeTour}` to `WelcomeCarousel`

### Files Modified

| File | Change |
|------|--------|
| `src/components/onboarding/WelcomeCarousel.tsx` | Replace carousel with single screen using V2 hero mockup; update subheadline; add `onTakeTour` prop |
| `src/pages/Dashboard.tsx` | Split onboarding completion into two paths: direct-to-add-flow and take-tour |

