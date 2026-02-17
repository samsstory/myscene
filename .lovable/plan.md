

## Floating Bug Report Button for Beta Launch

### Overview
A small, always-visible bug report button that lets your first 50 beta users instantly flag issues. Tapping it opens a lightweight sheet with a text field, while we silently capture technical context (page, device, user) behind the scenes. Reports go straight to a new database table and appear in your Admin Dashboard.

### UX Recommendations for Beta

- **Placement**: Bottom-left corner, offset from the existing FAB (bottom-right). Small enough to stay out of the way but always reachable.
- **Appearance**: A subtle glass-style circle with a small bug icon, matching the Scene aesthetic (dark glass, white/cyan icon). Not loud -- beta users will know it's there.
- **Interaction**: Single tap opens a bottom sheet (Drawer) with:
  - A friendly headline: "Spotted a bug?"
  - A single text area: "What went wrong?"
  - A "Send Report" button
  - Auto-captured context shown as a small muted line ("We'll include your device and page info") so users know you're gathering useful data without overwhelming them.
- **Feedback**: On submit, a toast confirmation ("Thanks! We're on it.") and the sheet closes.
- **Visibility**: Only shown to authenticated users on the Dashboard (not on landing/auth pages).

### Technical Plan

**1. Database: Create `bug_reports` table**

```text
bug_reports
-----------
id           uuid (PK, default gen_random_uuid())
user_id      uuid (NOT NULL, references auth.users -- via RLS, not FK)
description  text (NOT NULL)
page_url     text
user_agent   text
device_info  jsonb
status       text (default 'new') -- for admin tracking
created_at   timestamptz (default now())
```

RLS policies:
- Users can INSERT their own reports (auth.uid() = user_id)
- Only admins can SELECT all reports (using existing `has_role` function)

**2. New Component: `src/components/BugReportButton.tsx`**

- Fixed-position button, bottom-left, z-50
- Uses Drawer (vaul) for the report sheet
- Form with a single Textarea + Submit button
- On submit: inserts into `bug_reports` with auto-captured context:
  - `window.location.pathname` for page URL
  - `navigator.userAgent` for user agent
  - Screen size, platform, and standalone mode in device_info JSON
  - User ID from the Supabase session
- Shows a success toast via sonner
- Input validation: description required, max 2000 chars (via zod)

**3. Mount in `src/pages/Dashboard.tsx`**

- Import and render `<BugReportButton />` inside the Dashboard layout
- No props needed -- it reads the session internally

**4. Admin Dashboard: Add "Bug Reports" tab in `src/pages/Admin.tsx`**

- New tab alongside "Waitlist" and "Users"
- New component `src/components/admin/BugReportsTab.tsx`
- Lists reports in a table: date, user email (from user_id), description snippet, page, status
- Ability to mark reports as "resolved" (updates status column)

### Files to Create
- `src/components/BugReportButton.tsx` -- floating button + drawer form
- `src/components/admin/BugReportsTab.tsx` -- admin view of reports

### Files to Modify
- `src/pages/Dashboard.tsx` -- add `<BugReportButton />`
- `src/pages/Admin.tsx` -- add Bug Reports tab
- Database migration -- create `bug_reports` table with RLS

