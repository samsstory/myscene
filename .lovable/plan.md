

## Clean Up Legacy Rating Components

Three changes: delete `CompactRatingBar`, repurpose both `IncompleteRatingsSheet` and `DemoIncompleteRatingsSheet` to use the tag system.

---

### 1. Delete `CompactRatingBar`

**File:** `src/components/show-review/CompactRatingBar.tsx` -- **Delete entirely**

No remaining imports reference this component. Safe to remove.

---

### 2. Repurpose `IncompleteRatingsSheet` (authenticated users)

**File:** `src/components/home/IncompleteRatingsSheet.tsx` -- **Rewrite**

Current behavior: Fetches shows missing numerical ratings (`artist_performance`, `sound`, etc.) and lets users fill 1-5 pills per category.

New behavior:
- Rename title to "Add Moments" 
- Fetch shows that have zero entries in `show_tags` table
- Expanded view shows the tag picker (four categories with frosted pill tags, matching `RatingStep` styling)
- Users can tap tags to add them; selecting any tag inserts into `show_tags`
- Completion indicator: shows with at least 1 tag = complete
- Save handler: batch insert selected tags into `show_tags` (delete existing + re-insert pattern)
- Remove all references to `artistPerformance`, `sound`, `lighting`, `crowd`, `venueVibe`

---

### 3. Repurpose `DemoIncompleteRatingsSheet` (demo mode)

**File:** `src/components/home/DemoIncompleteRatingsSheet.tsx` -- **Rewrite**

Same UI changes as above but for demo mode:
- Filter shows with no/empty `tags` array instead of checking null rating fields
- Replace `RatingPills` with tag picker pills per category
- Remove `RatingEdits` interface; replace with `Record<string, string[]>` for tag edits
- Keep the "Demo Mode -- Changes won't save" badge
- Done button just closes the sheet

---

### Technical Details

**Shared pattern for tag picker in expanded cards:**
- Import `TAG_CATEGORIES` from `@/lib/tag-constants`
- Render four category sections with frosted pill buttons
- Selected state: `bg-primary/20 border-primary/50 text-primary-foreground shadow-[0_0_12px_hsl(var(--primary)/0.3)]`
- Unselected state: `bg-white/[0.04] border-white/[0.1] text-white/60`

**IncompleteRatingsSheet database logic:**
- Query: `SELECT id FROM shows WHERE user_id = ? AND id NOT IN (SELECT DISTINCT show_id FROM show_tags)`
- Save: For each show with edits, delete existing `show_tags` rows, then insert new ones with tag + category from `getCategoryForTag()`

**Files affected:**
| File | Action |
|------|--------|
| `src/components/show-review/CompactRatingBar.tsx` | Delete |
| `src/components/home/IncompleteRatingsSheet.tsx` | Rewrite for tags |
| `src/components/home/DemoIncompleteRatingsSheet.tsx` | Rewrite for tags |

No changes needed to `Home.tsx` or `DemoHome.tsx` -- the props and open/close behavior remain the same.

