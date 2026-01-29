
# Update Rate Section Copy

## Overview
Update the "Every show. One place." section in `CaptureShowcase.tsx` to align with the "Rate" step in the Capture - Rate - Rank - Share narrative framework.

## Changes to `src/components/landing/CaptureShowcase.tsx`

### 1. Add imports
- Import `Badge` component from `@/components/ui/badge`
- Import `Star` icon from `lucide-react`

### 2. Add Rate badge chip
Add above the headline:
```
[⭐ Rate]
```
Using the same styling pattern as LogShowcase (border-primary/30, bg-primary/5, text-primary)

### 3. Update headline
**From:** "Every show. One place."
**To:** "Rate it while it's fresh."

### 4. Update subhead
**From:** "Never forget who opened for who, which venue had the best sound, or what night changed everything."
**To:** "Capture how the show, sound, lighting, crowd, and vibe actually felt."

### 5. Add emotional payoff line
Add a third paragraph in italics:
*"Every detail. Your perspective."*

## Technical Details

Lines affected: 1-3 (imports), 136-148 (copy section)

The badge will use consistent styling with the LogShowcase section to maintain visual rhythm across the landing page narrative.
