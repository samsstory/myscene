

## Reverse ShowsBarChart to newest-first

### What changes
**File:** `src/components/rankings/ShowsBarChart.tsx`

1. **Reverse the data array** — After building the chronological `data` array (line 36-44), call `.reverse()` so the most recent month is at index 0 (leftmost). This is the core fix.

2. **Remove auto-scroll-to-right** — Currently the `useEffect` (lines 73-83) scrolls to `scrollWidth` because newest data is at the far right. With reversed order, the newest month is already at the left, so remove the `scrollLeft = scrollWidth` logic.

3. **Fix year boundary detection** — The year separator check (line 116) compares `data[i-1].year !== data[i].year`. This still works correctly with reversed data (boundaries just appear in reverse order). No change needed.

4. **Update visible year fallback** — The initial `visibleYear` (line 75) defaults to `data[0].year`, which after reversal will be the most recent year. Correct behavior.

5. **Sticky year label position** — Move from `left-3` to `right-3` since the user now scrolls right to see older data, and the label should reflect what's entering the viewport from the right edge. Update `updateVisibleYear` to find the bar nearest the right edge instead of the left.

### Summary
One-file change. Reverse the array, remove the auto-scroll hack, and adjust the sticky year label to anchor on the right side of the viewport.

