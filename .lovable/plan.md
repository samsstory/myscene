
# Announcements Tab Redesign

## Overview
Redesign the Announcements tab in the Admin Dashboard to support multiple announcement channels (Email, SMS, App) with a template management system inspired by the reference screenshot. SMS and App channels will be placeholder-only for now.

## Layout Structure

### 1. Header Section
- "Announcements" title with subtitle "Manage announcements for the community."

### 2. Channel Selector (toggle buttons)
- Three pill/chip buttons: **Email** (active), **SMS** (disabled/coming soon), **App** (disabled/coming soon)
- SMS and App buttons show a "Coming Soon" tooltip or badge and are visually muted

### 3. Email Channel Content (two sections)

**A. Saved Templates List**
- Card listing existing templates (Approval Email, Resend Email) with name, subject preview, and edit/delete actions
- Each template is expandable or opens inline for editing
- "Create New Template" button to add a custom template

**B. Template Editor (shown when creating or editing)**
- Title/Name input field
- Subject input field
- Body textarea (plain text with placeholder support like `{{email}}`, `{{password}}`)
- Placeholder reference hint below the body
- Save / Cancel / Reset Defaults buttons

### 4. SMS and App Placeholder Panels
- When SMS or App is selected, show a centered placeholder state with an icon, "Coming Soon" message, and a brief description

## Technical Details

### Files to modify
- **`src/components/admin/EmailTemplateEditor.tsx`** -- Replace entirely with new `AnnouncementsPanel` component (or rename and rewrite)

### New component: `src/components/admin/AnnouncementsPanel.tsx`
- Manages channel selection state (`email` | `sms` | `app`)
- Renders channel toggle buttons at the top
- For `email`: renders the saved templates list and template editor
- For `sms`/`app`: renders a "Coming Soon" placeholder

### Template storage changes
- Extend localStorage schema to support multiple named templates (array of `{ id, name, subject, body, type }`)
- Migrate existing approve/resend templates into this new format on first load
- Keep the exported `getStoredTemplate()` function working for backward compatibility with the approve/resend edge functions

### Updated `src/pages/Admin.tsx`
- Replace `<EmailTemplateEditor />` import with `<AnnouncementsPanel />`
- No other tab changes needed

### Component breakdown inside AnnouncementsPanel
1. **ChannelToggle** -- row of styled buttons for Email / SMS / App
2. **TemplateList** -- lists saved templates with edit and delete actions
3. **TemplateEditor** -- form for creating/editing a single template (title, subject, body, save/cancel)
4. **ComingSoonPlaceholder** -- centered icon + text for SMS and App channels

### Design notes
- Use existing shadcn components: `Button` (toggle style via variant), `Input`, `Textarea`, `Label`, `Card`
- Channel toggles use `outline` variant for inactive, `default` for active
- SMS/App buttons get `opacity-60` styling with a small "Soon" badge
- Maintain the Scene dark theme aesthetic throughout
