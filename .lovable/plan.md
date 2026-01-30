# Plan: Fix Step 5 to Focus on "Shows" Stat Pill with Floating Target

## Status: ✅ COMPLETED

## Summary of Changes Made

| File | Change |
|------|--------|
| `StatPills.tsx` | Fixed `data-tour` condition from `stat.id === 'shows'` to `stat.id === 'total-shows'`; added `showsTourActive` + `showsRef` props; hides original pill during Step 5 |
| `Home.tsx` | Added `showsTourActive` and `showsRef` props to interface; forwarded to StatPills |
| `Dashboard.tsx` | Added `showsStatRef` ref; computed `showsTourActive` for Step 5; rendered `FloatingTourTarget` with bright cyan-glowing Shows pill clone |
| `SpotlightTour.tsx` | No changes needed (Step 5 config was already correct) |

## Technical Pattern Used
Used the proven **FloatingTourTarget + React Portal** pattern:
- Portal renders to `document.body` escaping stacking contexts
- Clone positioned at `z-index: 10002` above Joyride overlay (`z-10000`)
- Double-layered `drop-shadow` with `--primary` HSL for visibility
- Original pill hidden (`opacity-0`) during Step 5
