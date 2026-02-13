## ✅ Clean Up Legacy Rating Components — COMPLETE

All tasks from this phase have been completed:

1. **CompactRatingBar** — Deleted (no remaining references)
2. **IncompleteRatingsSheet** → Renamed to `IncompleteTagsSheet`, repurposed to use tag system with `show_tags` table
3. **DemoIncompleteRatingsSheet** → Renamed to `DemoIncompleteTagsSheet`, repurposed for demo mode tags
4. **All state variables** renamed from `incompleteRatings*` → `incompleteTags*` across Home.tsx, DemoHome.tsx, useHomeStats.ts, useDemoData.ts, and get-demo-data edge function
5. **Insight copy** updated: "Shows Need Ratings" → "Shows Need Moments" / "Shows Need Tags"
6. **Legacy score/rating references** removed from PhotoOverlayEditor, ShowReviewSheet, RankingCard, DemoRank, smart-pairing, and all add-show flows
