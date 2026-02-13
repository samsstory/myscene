

## Replace Numerical Ratings with Tag-Based "Shareable Moments" System

This is a significant product change that replaces the 1-5 numerical rating categories (Artist Performance, Sound, Lighting, Crowd, Venue Vibe) with a tag-based emotional memory system organized into four categories.

---

### The New Tag System

The tags are organized into four categories with pre-defined options:

| Category | Tags |
|----------|------|
| **The Show** | "Didn't see that coming", "Mid tbh", "Played the classics", "Took me somewhere" |
| **The Moment** | "Got emotional", "Chills", "Was locked in", "Core memory", "Never hit for me" |
| **The Space** | "Space to dance", "Sound was dialed", "Lights went crazy", "Ubers were f**kd" |
| **The People** | "All time squad", "Crowd went off", "Felt connected", "Not the vibe" |

---

### Phase 1: Database Changes

**New table: `show_tags`**
- `id` (uuid, PK)
- `show_id` (uuid, FK to shows)
- `tag` (text) -- the tag string, e.g. "Got emotional"
- `category` (text) -- one of: "the_show", "the_moment", "the_space", "the_people"
- `created_at` (timestamptz)

RLS policies matching the `show_artists` pattern (access via join to `shows.user_id`).

**Existing columns preserved (not dropped):** The `artist_performance`, `sound`, `lighting`, `crowd`, `venue_vibe` columns on `shows` will be kept for now to avoid data loss for ~25+ shows that have existing ratings. They just won't be written to or displayed going forward.

---

### Phase 2: UI Component Changes

**A. RatingStep (Add Show Flow) -- Complete Rewrite**
- Replace the five 1-5 pill button groups with a tag picker UI
- Header: "What stood out?" 
- Four collapsible/visible category sections with frosted pill-style tags
- Multi-select within and across categories
- Keep the "My Take" text field
- Tags render as tappable pills with a glow effect when selected

**B. ShowReviewSheet -- "How It Felt" Section**
- Replace the five `CompactRatingBar` components with selected tags displayed as frosted pills
- Group by category with subtle category labels
- If no tags, show nothing (clean empty state)

**C. StackedShowCard -- Score Badge**
- Remove the numerical score badge (currently `calculateShowScore`)
- Replace with either the primary/first tag as a pill badge, or remove the score entirely and keep just rank position

**D. RankingCard (Show Ranker)**
- Replace the rating bar visualization with tag pills (show top 2-3 tags when collapsed, all when expanded)
- Remove the per-aspect gradient bars

**E. IncompleteRatingsSheet -- Repurpose or Remove**
- This sheet prompts users to fill missing 1-5 ratings
- Repurpose to prompt for missing tags, or remove entirely since tags are optional

**F. CompactRatingBar Component**
- Deprecate / remove (no longer needed)

---

### Phase 3: Data & Logic Changes

**A. `calculateShowScore` in `src/lib/utils.ts`**
- Remove or simplify. The score was derived from numerical ratings -- with tags, there's no numerical score to compute
- Show cards will rely on ELO ranking position instead of computed scores

**B. `getScoreGradient` in `src/lib/utils.ts`**
- Remove or keep only for backward compatibility with any remaining score references

**C. `useHomeStats` hook**
- Update `incompleteRatingsCount` logic: instead of checking for null rating columns, check for shows with zero tags (or remove this insight entirely)
- Remove references to `artist_performance`, `sound`, etc. from the query

**D. Home.tsx data fetching**
- Stop reading `artist_performance`, `sound`, `lighting`, `crowd`, `venue_vibe` from shows
- Fetch `show_tags` for each show instead

**E. AddShowFlow.tsx & DemoAddShowFlow.tsx**
- Replace `artistPerformance/sound/lighting/crowd/venueVibe` in `ShowData` interface with `tags: string[]`
- Update submit handler to insert into `show_tags` table instead of writing rating columns
- Update edit initialization to load existing tags

**F. DemoContext**
- Replace rating fields in `DemoLocalShow` with `tags: string[]`

---

### Phase 4: Demo Mode Sync

- Update `DemoHome`, `DemoAddShowFlow`, `DemoBulkUploadFlow`, `DemoRank` to use tags instead of numerical ratings
- Update the bulk upload `PhotoReviewCard` to show tag selection instead of rating pills

---

### Files Affected (Full List)

| File | Change Type |
|------|-------------|
| `src/components/add-show-steps/RatingStep.tsx` | **Rewrite** -- tag picker UI |
| `src/components/ShowReviewSheet.tsx` | **Modify** -- tags instead of rating bars |
| `src/components/show-review/CompactRatingBar.tsx` | **Remove** |
| `src/components/home/StackedShowCard.tsx` | **Modify** -- remove score badge |
| `src/components/rankings/RankingCard.tsx` | **Modify** -- tags instead of bars |
| `src/components/AddShowFlow.tsx` | **Modify** -- tag data flow |
| `src/components/DemoAddShowFlow.tsx` | **Modify** -- tag data flow |
| `src/components/Home.tsx` | **Modify** -- fetch tags, remove rating refs |
| `src/components/home/IncompleteRatingsSheet.tsx` | **Repurpose or Remove** |
| `src/components/home/StackedShowList.tsx` | **Modify** -- update Show interface |
| `src/hooks/useHomeStats.ts` | **Modify** -- update incomplete logic |
| `src/lib/utils.ts` | **Modify** -- remove/deprecate score calc |
| `src/contexts/DemoContext.tsx` | **Modify** -- tags in DemoLocalShow |
| `src/components/DemoHome.tsx` | **Modify** -- tags support |
| `src/components/DemoRank.tsx` | **Modify** -- tags support |
| `src/components/DemoBulkUploadFlow.tsx` | **Modify** -- tags support |
| `src/components/bulk-upload/PhotoReviewCard.tsx` | **Modify** -- tags instead of ratings |
| `src/components/home/DemoIncompleteRatingsSheet.tsx` | **Remove or Repurpose** |
| Database migration | **New table** `show_tags` + RLS |

---

### Migration Strategy for Existing Data

There are currently ~25-32 shows with numerical ratings. The plan:
1. Keep old columns in the database (no data loss)
2. Do NOT auto-convert numbers to tags (the mapping isn't meaningful)
3. Old shows will simply appear with no tags until the user edits them
4. The UI gracefully handles shows with zero tags (empty state)

---

### Implementation Order

1. Database migration (create `show_tags` table)
2. New tag picker component (RatingStep rewrite)
3. Update AddShowFlow data model and submit logic
4. Update ShowReviewSheet to display tags
5. Update StackedShowCard and RankingCard visuals
6. Update Home.tsx data fetching
7. Clean up utils (score calculation)
8. Update demo mode components
9. Update/remove IncompleteRatingsSheet

