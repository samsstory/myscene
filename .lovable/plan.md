

# PWA Retention Improvements Plan

Based on the analysis, there are 3 actionable improvements to maximize PWA installation without gating the experience.

---

## 1. Make PWA quest visually distinct ("Start here" treatment)

**File:** `src/components/home/SetupQuestsCard.tsx`

Give the PWA quest row (`install_pwa`) a differentiated visual treatment:
- Add a subtle cyan glow border (`border-primary/30` + `shadow-[0_0_12px_hsl(var(--primary)/0.15)]`) instead of the default `border-white/[0.06]`
- Add a small "Start here" badge/chip (tiny `text-[9px]` pill) next to the label
- Only apply this treatment when it's the first incomplete quest

This draws the eye without blocking anything.

## 2. Add PWA nudge to post-first-show success screen

**File:** `src/components/add-show-steps/SuccessStep.tsx`

After the user logs their first show (highest-motivation moment), add a lightweight PWA prompt:
- Only show if NOT already in standalone mode and on mobile
- Insert between the Install CTA section and the action buttons
- Simple single-line card: "Save Scene to your home screen to track your next one" with a tap target that navigates to `/install`
- Replace the existing `InstallCTA` logic in SuccessStep with this simpler, more contextual version (the current one already does something similar but uses the browser's `beforeinstallprompt` which is Android-only)

## 3. Smart re-prompt if PWA quest is skipped

**File:** `src/components/home/SceneView.tsx` (or new small component)

Add a one-time nudge when the user has completed 2+ other quests but skipped PWA:
- Check conditions in `SceneView` using the existing `useSetupQuests` hook data
- Show a dismissible inline banner above the quest card: "You're on a roll! Save Scene to your home screen so you never lose your streak."
- Persist dismissal with `scene_pwa_reprompt_dismissed` in localStorage
- Only triggers once, non-blocking

---

## Summary of changes

| File | Change |
|------|--------|
| `SetupQuestsCard.tsx` | Visual glow + "Start here" badge on PWA quest row |
| `SuccessStep.tsx` | Simplified PWA nudge card after first show log |
| `SceneView.tsx` | Smart re-prompt banner when 2+ quests done but PWA skipped |

All three changes are additive and non-blocking. No gating, no new routes, no schema changes.

