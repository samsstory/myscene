

# Customizable Welcome Email in Admin Dashboard

## Overview

Add an expandable "Customize Email" section to the Approve Modal so you can preview and edit the welcome email subject and body before approving a user. The same customization will also appear when using the Resend/Send Email button.

## Changes

### 1. ApproveModal.tsx -- Add Email Customization Fields

- Add a collapsible "Customize Email" section below the password field using a `Collapsible` component
- Include two editable fields:
  - **Subject** (Input) -- pre-filled with `"You're in! Your Scene beta access is ready"`
  - **Body** (Textarea) -- pre-filled with a default plain-text version of the welcome message, with `{{email}}` and `{{password}}` placeholders that get replaced automatically
- A small info note explaining the `{{email}}` and `{{password}}` placeholder tokens
- Pass `emailSubject` and `emailBody` to the edge function alongside the existing fields

### 2. WaitlistTab.tsx -- Resend Flow Customization

- Replace the browser `prompt()` with a small dialog/sheet that includes:
  - Email address input (same as now)
  - Subject and body fields (pre-filled with defaults, same as above but without password placeholder)
- Pass `emailSubject` and `emailBody` to the `resend-notification` edge function

### 3. approve-waitlist Edge Function

- Accept optional `emailSubject` and `emailBody` parameters
- If provided, use them instead of the hardcoded HTML template
- Replace `{{email}}` and `{{password}}` tokens in the custom body
- Wrap the body in a basic HTML layout for email rendering

### 4. resend-notification Edge Function

- Accept optional `emailSubject` and `emailBody` parameters
- Same token replacement logic (minus password)
- Fall back to defaults if not provided

## Technical Details

- Default subject: `"You're in! Your Scene beta access is ready"`
- Default body template for approval:
  ```
  Welcome to Scene!

  Your beta access is ready. Here are your login details:

  Email: {{email}}
  Temporary Password: {{password}}

  Log in at myscene.lovable.app to start logging your shows.

  We recommend changing your password after your first login.
  ```
- Default body template for resend (no password):
  ```
  Welcome to Scene!

  Your beta access is ready! Log in with the credentials you were given.

  Head to myscene.lovable.app to start logging your shows.

  If you've forgotten your password, use the reset option on the login page.
  ```
- The textarea body is sent as plain text; the edge function wraps it in a styled HTML email container
- No database changes needed

