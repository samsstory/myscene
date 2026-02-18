
# Fix Show Invite Link — Two Bugs + RSVP Intent Flow

## Problems Being Fixed

### Bug 1 — Hardcoded Share URL (Critical for testing)
`useShareShow.ts` line 45 always generates `https://tryscene.app/?...`. In any non-production environment (preview URL, local dev), the link opens the wrong site entirely, so the `ShowInviteHero` never renders. Fix: replace with `window.location.origin`.

### Bug 2 — Missing RSVP Intent Before Signup (UX Gap)
The current CTA on `ShowInviteHero` navigates directly to a generic email/password form. The user described wanting invitees to **select their RSVP status** (Going / Maybe / Can't make it) before or during signup — this creates intent and personalises the experience. A new bottom-sheet modal captures the selection, then surfaces the email signup inline, keeping the user on the landing page throughout.

---

## What the Redesigned Flow Looks Like

```text
Non-user opens invite link
        │
        ▼
ShowInviteHero renders above landing page
  ├── Artist image blurred background
  ├── Glass card: artist · venue · date · inviter name
  └── Three RSVP intent buttons:
        [🎉 I'm going]   [🤔 Maybe]   [😢 Can't make it]
              │
              ▼  (tap any button)
    Compact bottom sheet slides up
      ├── Selected status shown ("You're going!")
      ├── Email input field
      ├── "Create account & save my spot" button
      └── Referral code + show + status all captured on submit
              │
              ▼
        Navigates to /auth pre-filled with email
        OR completes inline if we use email magic link
```

---

## Files Changed

| File | Change |
|---|---|
| `src/hooks/useShareShow.ts` | Replace hardcoded `tryscene.app` with `window.location.origin` |
| `src/components/landing/ShowInviteHero.tsx` | Replace single CTA button with three RSVP intent buttons + inline email sheet |

---

## Detailed Changes

### 1. `useShareShow.ts` — One-line fix

```ts
// Before
const url = `https://tryscene.app/?${params.toString()}`;

// After
const url = `${window.location.origin}/?${params.toString()}`;
```

Note: In production, `window.location.origin` will be `https://tryscene.app` — so production links remain correct.

---

### 2. `ShowInviteHero.tsx` — RSVP Intent + Inline Email Capture

Replace the current single "Create your Scene account →" button with a three-option RSVP intent row:

```
┌──────────────────────────────────────┐
│  [Blurred artist image background]   │
│                                      │
│  [J] Jake logged this show and       │
│      wants you to discover Scene     │
│                                      │
│  ┌────── Glass show card ──────────┐ │
│  │ [Artist image strip]            │ │
│  │                                 │ │
│  │ Fred again..                    │ │
│  │ 📍 Alexandra Palace · London    │ │
│  │ 📅 September 2023               │ │
│  │                                 │ │
│  │ ─────────────────────────────── │ │
│  │ Track shows you've been to:     │ │
│  │                                 │ │
│  │ [🎉 I went]  [🤔 Maybe]  [✕]   │ │  ← for logged shows
│  │                                 │ │
│  │  — or for upcoming shows: —     │ │
│  │ [🎉 I'm going] [🤔 Maybe] [✕]  │ │
│  └────────────────────────────────┘ │
│                                      │
│  ↓ scroll to learn more             │
└──────────────────────────────────────┘
```

When a button is tapped, a bottom sheet slides up from the bottom of the screen (using Vaul `Drawer` — already installed):

```
╔══════════════════════════════════════╗
║  ────── (drag handle) ──────────     ║
║                                      ║
║  🎉 You're going to Fred again..!    ║  (or "You went!" for logged)
║                                      ║
║  Create a free account to save       ║
║  your spot and track every show.     ║
║                                      ║
║  ┌──────────────────────────────┐    ║
║  │  your@email.com              │    ║
║  └──────────────────────────────┘    ║
║                                      ║
║  [Create account & save →]           ║
║                                      ║
║  Free · No credit card required      ║
╚══════════════════════════════════════╝
```

On submit, navigate to `/auth?ref=CODE&show=ID&type=TYPE&rsvp=going` with the email pre-captured in sessionStorage so the auth page can pre-fill it.

The RSVP status is stored in the URL param `rsvp=going|maybe|no` — after signup the dashboard can optionally use this to auto-set the RSVP on the linked upcoming show.

### Button styling for the three RSVP options

Consistent with the app's glass language. The selected button gets a luminous primary border; unselected are plain glass:

- Going: `bg-primary/[0.12] border-primary/[0.28] text-primary/90` (selected) / `bg-white/[0.06] border-white/[0.10]` (unselected)
- Maybe: same pattern with amber/warning tones
- Can't make it: muted glass

### Label copy by show type

| Show type | Button 1 | Button 2 | Button 3 |
|---|---|---|---|
| `logged` | "I was there too" | "Sounds amazing" | "Missed it" |
| `upcoming` | "I'm going!" | "Maybe..." | "Can't make it" |

---

## RSVP State in Auth Flow

The `rsvp` param is cosmetic at the auth page — no code change needed there. Post-signup, the Dashboard can read it from the URL if present and silently set the RSVP status on the invited show. This is a stretch goal and can be added later without changing any of the core invite infrastructure.

---

## What Does NOT Change

- The `ShowInviteHero` DB fetch logic (already working)
- The `useReferralCapture` attribution (already working on both `/` and `/auth`)
- The `Auth.tsx` page (unchanged)
- Referral record creation on signup (unchanged)
- All existing landing page sections below the hero
