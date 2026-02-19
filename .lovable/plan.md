

# Mini Bar Chart on My Shows Page

## What We're Building
A minimal, rounded bar chart (inspired by the reference image) showing the number of shows per month, positioned between the "needs attention" banner and the search bar on the My Shows (rankings) page. The chart updates dynamically based on the selected timeline filter (All Time, This Year, Last Year, This Month).

## Design
- Pure CSS/HTML bars (no charting library) for minimal footprint
- Rounded-pill shaped bars matching the reference image aesthetic
- Count labels above each bar
- Month abbreviations below (Feb, Mar, Apr, etc.)
- Uses the app's primary color for bars with subtle opacity variations
- Compact height (~100px chart area)
- Horizontal scroll if many months are shown
- Smooth transitions when the timeline filter changes

## Implementation

### 1. New Component: `src/components/rankings/ShowsBarChart.tsx`
- Accepts `shows` array and `timeFilter` as props
- Groups shows by month using `date-fns` (`format(date, 'yyyy-MM')`), then counts per month
- Determines the visible month range based on the active time filter:
  - **All Time**: all months from first show to current month
  - **This Year / Last Year**: Jan-Dec of the relevant year
  - **This Month**: just the current month (chart hidden since single bar is not useful)
- Renders a row of flex items, each containing: count label, a rounded bar (height proportional to max count), and month abbreviation
- Bars use `bg-primary` with rounded-full styling to match the pill shape in the reference
- Zero-count months render as a tiny dot/stub

### 2. Integration in `Home.tsx`
- Import `ShowsBarChart`
- Place it in the rankings view, directly after the attention banner block (around line 557) and before the search bar (line 560)
- Pass the `shows` array and `topRatedFilter` value
- Also respect `showTypeFilter` so the chart reflects the active type filter

### Technical Details
- No new dependencies needed -- pure Tailwind CSS bars
- Bar height calculated as `(count / maxCount) * maxBarHeight` where `maxBarHeight` is ~64px
- Months with zero shows get a 4px minimum height bar (the dot effect from the reference)
- The chart container has `overflow-x-auto` for long timelines with horizontal scroll
- Wrapped in a subtle card-like container: `bg-white/[0.03] border border-white/[0.06] rounded-xl p-3`

