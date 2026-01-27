
# Plan: Simplify BulkSuccessStep Multi-Show Display

## Overview
Streamline the multi-show success screen with 4 focused changes to reduce visual clutter and prioritize user ranking behavior.

---

## Changes

### 1. Remove venue name from ShowCard
**Current:** Artist name + venue name under each photo
**New:** Only artist name

```
Before:                    After:
┌──────────┐              ┌──────────┐
│  [photo] │              │  [photo] │
│Mind Agst │              │Mind Agst │
│Charlotte │              └──────────┘
└──────────┘
```

**File:** `BulkSuccessStep.tsx` lines 32-34
- Remove the venue `<p>` element

---

### 2. Center artist name under image
**Current:** `text-left` alignment on ShowCard
**New:** `text-center` alignment

**File:** `BulkSuccessStep.tsx` line 18
- Change `className="text-left space-y-1.5..."` to `className="text-center space-y-1.5..."`

---

### 3. Update helper text
**Current:** "Tap a show to create a shareable image"
**New:** "Tap to share your review on Instagram"

**File:** `BulkSuccessStep.tsx` line 117-119
- Update the text content

---

### 4. Prioritize Rank button over Share Summary
**Current order:**
1. Share Summary (secondary)
2. Rank These Shows (outline)

**New order:**
1. Rank These Shows (primary, size lg)
2. Share Summary (outline)

**File:** `BulkSuccessStep.tsx` lines 149-170
- Move Rank button above Share Summary for multi-show
- Change Rank button: `variant="default"` + `size="lg"` (primary style)
- Change Share Summary: `variant="outline"` (demoted)

---

## Summary of File Changes

| Location | Change |
|----------|--------|
| Line 18 | `text-left` → `text-center` |
| Lines 32-34 | Remove venue name paragraph |
| Line 118 | Update helper text |
| Lines 149-170 | Reorder buttons, promote Rank to primary |

---

## Final Multi-Show Layout

```
┌─────────────────────────────────┐
│         ✓ 2 shows added         │
├─────────────────────────────────┤
│                                 │
│   ┌────────┐   ┌────────┐      │
│   │ [photo]│   │ [photo]│      │
│   │Mind Agt│   │Anyma   │      │  ← Centered, no venue
│   └────────┘   └────────┘      │
│                                 │
│   Tap to share your review on   │
│          Instagram              │
├─────────────────────────────────┤
│  ┌─────────────────────────────┐│
│  │  ⚖️ Rank These Shows        ││  ← Primary CTA
│  └─────────────────────────────┘│
│  ┌─────────────────────────────┐│
│  │  📤 Share Summary           ││  ← Demoted to outline
│  └─────────────────────────────┘│
│                                 │
│   [Add More]        [Done]      │
└─────────────────────────────────┘
```
