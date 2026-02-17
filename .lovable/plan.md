
# Proactive Bug Recognition System (Two-Tier Approach)

## Overview
Build a smart bug detection and reporting system that proactively helps users when things go wrong. Uses a **two-tier timing model** for slow loads, catches known API errors, and handles unhandled React crashes -- all feeding into the existing bug report drawer.

---

## Two-Tier Slow Load Detection

**Tier 1 -- 2 seconds**: A subtle "Still loading..." indicator fades in below the branded loader. This reassures the user that the app is working without being alarming. No action required from the user.

**Tier 2 -- 3.5 seconds**: A slide-up banner appears prompting the user to report the issue. Pre-fills the bug report with timing data (e.g., "Dashboard took 4.2s to load"). Auto-dismisses after 15 seconds if the page finishes loading or the user ignores it.

---

## Error Handling Strategy

| Scenario | Detection | Timing | UX | Auto-captured data |
|---|---|---|---|---|
| Slow load (reassurance) | Timer in loading state | 2s | Subtle text under loader | -- |
| Slow load (prompt) | Timer in loading state | 3.5s | Slide-up banner | Duration, page URL |
| API/DB error | Catch in data hooks | Immediate | Slide-up banner | Endpoint, status, error msg |
| React crash | Error Boundary | Immediate | Full-screen fallback | Stack trace, component info |
| User-initiated | Tap bug button | Manual | Drawer (existing) | Device info, page URL |

---

## Technical Details

### 1. Database Migration
Add two columns to the existing `bug_reports` table:
- `type` (text, default `'manual'`): one of `manual`, `slow_load`, `api_error`, `crash`
- `error_context` (jsonb, nullable): auto-captured metadata like stack traces, failed endpoints, load duration

### 2. New File: `src/hooks/useSlowLoadDetector.ts`
A hook that manages the two-tier timer system:
- Accepts a `loading` boolean
- At 2s, sets `showReassurance = true`
- At 3.5s, sets `showPrompt = true` and records elapsed time
- Both timers clear when `loading` becomes false (page loaded successfully)
- Returns `{ showReassurance, showPrompt, elapsedMs, dismiss }`

### 3. New File: `src/components/BugPromptBanner.tsx`
A small slide-up banner component for slow-load and API-error triggers:
- Appears above the bottom nav bar with a fade/slide animation
- Contextual message based on trigger type (slow load vs API error)
- Two buttons: "Report" (opens bug drawer with pre-filled context) and "Dismiss"
- Auto-dismisses after 15 seconds if ignored
- Uses framer-motion for smooth entry/exit

### 4. Updated: `src/components/ui/BrandedLoader.tsx`
- Accept an optional `showReassurance` prop
- When true, fade in a small "Still loading..." message below the quote with a subtle animation
- Keeps the existing branded aesthetic; the text is muted and unobtrusive

### 5. Updated: `src/components/BugReportButton.tsx`
Extend to accept optional pre-filled context from external triggers:
- New props: `externalOpen`, `onExternalClose`, `prefillDescription`, `errorContext`, `reportType`
- When opened externally, the description textarea is pre-filled (e.g., "Page took 4.2s to load on /dashboard")
- The `type` and `error_context` fields are included in the database insert
- Falls back to current manual behavior when no external props are provided

### 6. New File: `src/components/ErrorBoundary.tsx`
A React Error Boundary component:
- Catches unhandled render errors anywhere in the component tree
- Shows a branded fallback screen with the Scene logo, "Something broke" message, and a "Send Report and Reload" button
- Captures the error stack trace and component info automatically
- On submit: saves to `bug_reports` with `type: 'crash'` and reloads the page

### 7. New File: `src/hooks/useBugReportPrompt.ts`
A lightweight context/hook for triggering bug report prompts from anywhere:
- Exposes `promptBugReport(type, context)` function
- Holds current prompt state (open/closed, type, pre-filled context)
- Used by the slow-load detector, error handlers, and ErrorBoundary
- Wrapped around the app via a small provider in App.tsx

### 8. Updated: `src/pages/Dashboard.tsx`
- Use `useSlowLoadDetector(loading)` during the loading phase
- Pass `showReassurance` to `BrandedLoader`
- Render `BugPromptBanner` when the slow-load prompt triggers
- Pass external open/prefill props to `BugReportButton`

### 9. Updated: `src/App.tsx`
- Wrap the `Routes` block with the new `ErrorBoundary` component
- Add `BugReportPromptProvider` around the app

### 10. API Error Interception (Lightweight)
Add error handling to `useHomeStats` (and other key hooks over time):
- On catch, call `promptBugReport("api_error", { endpoint, status, message })`
- Opt-in per hook to avoid noise from non-critical failures

---

## File Summary

| File | Action |
|---|---|
| Database migration (bug_reports) | Add `type` and `error_context` columns |
| `src/hooks/useSlowLoadDetector.ts` | Create -- two-tier timer hook |
| `src/hooks/useBugReportPrompt.ts` | Create -- context + hook for proactive prompts |
| `src/components/BugPromptBanner.tsx` | Create -- slide-up prompt banner |
| `src/components/ErrorBoundary.tsx` | Create -- React crash catcher with branded fallback |
| `src/components/ui/BrandedLoader.tsx` | Update -- add "Still loading..." reassurance text |
| `src/components/BugReportButton.tsx` | Update -- accept external open + prefill + type |
| `src/pages/Dashboard.tsx` | Update -- integrate slow load detector + banner |
| `src/App.tsx` | Update -- wrap with ErrorBoundary + prompt provider |
| `src/hooks/useHomeStats.ts` | Update -- add API error prompt trigger |
