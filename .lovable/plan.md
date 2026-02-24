

## Plan: Festival Invite Links

### Overview
Allow users to share their festival claim as an invite link. Recipients land on a public page showing the sharer's artist picks, can toggle artists on/off, then sign up (or log in) to claim the festival with their modified selections.

### Database

**New table: `festival_invites`**
```sql
CREATE TABLE festival_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL,           -- sharer's user id
  festival_lineup_id UUID NOT NULL,   -- FK to festival_lineups.id
  festival_name TEXT NOT NULL,
  selected_artists JSONB NOT NULL DEFAULT '[]',  -- array of {name, image_url?}
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

RLS policies:
- **INSERT**: `auth.uid() = created_by` (authenticated users create their own invites)
- **SELECT**: `true` (public read — anyone with the link can view)
- No UPDATE/DELETE needed

### Edge Function: `get-festival-invite`

Public endpoint (verify_jwt = false) that returns invite data + full festival lineup for the landing page. Fetches from `festival_invites` joined with `festival_lineups` and the inviter's `profiles` (name/username). Returns:
```json
{
  "invite": { "id", "festival_name", "selected_artists" },
  "lineup": { "artists", "venue_name", "venue_location", "date_start", "year" },
  "inviter": { "full_name", "username" }
}
```

### URL Pattern

Reuse the existing `?show=ID&type=TYPE&ref=CODE` pattern:
- **New type**: `festival-invite`
- **URL**: `tryscene.app/?show=INVITE_UUID&type=festival-invite&ref=REF_CODE`

### Frontend Flow

```text
IndexV2 ──?type=festival-invite──► FestivalInviteHero
                                      │
                                      ├─ Fetch invite via edge function
                                      ├─ Show header: "{Name} invited you to add {Festival} to Scene"
                                      ├─ Subtitle: "Here's the {N} sets {Name} saw — who did you see?"
                                      ├─ Reuse LineupSelectionGrid (pre-checked with sharer's picks)
                                      ├─ CTA: "Add to My Scene →"
                                      │     ├─ Logged in → run festival claim flow directly
                                      │     └─ Not logged in → persist selections in localStorage → /auth
                                      └─ "New here? Sign up free →"

Auth page (existing) ──► Dashboard ──► auto-detect invite_type=festival-invite
                                       → open BulkUploadFlow pre-loaded with festival + selections
```

### Files Modified

1. **Migration** — Create `festival_invites` table + RLS
2. **`supabase/functions/get-festival-invite/index.ts`** — New edge function
3. **`supabase/config.toml`** — Add `[functions.get-festival-invite]` with `verify_jwt = false`
4. **`src/components/landing/FestivalInviteHero.tsx`** — New component
   - Fetches invite data via edge function
   - Renders inviter attribution, festival name, subtitle with updated copy
   - Embeds `LineupSelectionGrid` with sharer's picks pre-selected
   - "Add to My Scene →" CTA (auth-gated)
   - Stores `invite_type=festival-invite`, `invite_festival_lineup_id`, `invite_selected_artists` in localStorage before redirecting to `/auth`
5. **`src/pages/IndexV2.tsx`** — Add `type=festival-invite` branch to render `FestivalInviteHero` instead of `ShowInviteHero`
6. **`src/components/bulk-upload/BulkSuccessStep.tsx`** — Wire "Share Festival" button
   - On tap: insert row into `festival_invites` with the user's selected artists, then trigger native share / clipboard with the invite URL
   - Requires `festivalLineupId` as a new prop (passed from `BulkUploadFlow`)
7. **`src/components/BulkUploadFlow.tsx`** — Pass `selectedFestival.id` (the lineup ID) down to `BulkSuccessStep`
8. **`src/pages/Dashboard.tsx`** — Handle `invite_type=festival-invite` in the existing invite detection `useEffect`
   - Read localStorage keys, open `BulkUploadFlow` pre-loaded at `lineup-grid` step with the festival data and pre-selected artists
9. **`src/hooks/useShareShow.ts`** — Add a `shareFestivalInvite` method alongside the existing `shareShow` for use from the show detail sheet entry point

### Component Reuse
- **`LineupSelectionGrid`** — used as-is inside `FestivalInviteHero` for the toggleable artist grid (pre-checking the sharer's picks via a new `initialSelected` prop)
- **`ShowInviteHero`** patterns — same glassmorphism card structure, inviter attribution, background gradient, OTP/auth flow
- **`useFestivalClaim`** — reused for the actual claim when a logged-in user taps "Add to My Scene"
- **`useShareShow`** — extended with festival invite creation logic
- **Existing URL routing** in `IndexV2` and `Dashboard` — minimal additions to handle the new `type`

### Technical Detail

```text
LineupSelectionGrid changes:
  + initialSelected?: Set<string>   — pre-check these artists on mount
  + ctaLabel?: string               — override button text ("Add to My Scene" vs "Add N Shows")

BulkSuccessStep changes:
  + festivalLineupId?: string       — needed to create the invite row
  handleShareAll():
    1. INSERT into festival_invites { created_by, festival_lineup_id, festival_name, selected_artists }
    2. Build URL: tryscene.app/?show={invite.id}&type=festival-invite&ref={refCode}
    3. navigator.share() or clipboard fallback

FestivalInviteHero:
  - Calls get-festival-invite edge function with invite ID
  - Merges sharer's picks + full lineup into LineupSelectionGrid
  - Pre-checks sharer's picks, user can toggle freely
  - CTA creates account or claims directly if logged in

Dashboard invite handling:
  - Detect localStorage invite_type === "festival-invite"
  - Fetch festival_lineups by stored lineup ID
  - Open BulkUploadFlow at lineup-grid step with pre-selected artists
```

