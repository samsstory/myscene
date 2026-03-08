

## Add Full Name + Username to Sign Up Form

Currently, users sign up with just email + password. Name and username are only collected later in `ProfileSetupSheet` (which triggers after first show log). This means new users have empty `full_name` and `username` fields, making them unsearchable by friends.

### Changes

**1. `src/pages/Auth.tsx` — Add name + username fields to signup form**
- Add two new fields to the signup form (between email and password):
  - **Full Name** (required, text input, maxLength 50)
  - **Username** (required, text input, maxLength 30, lowercase/no-spaces enforcement with regex `^[a-z0-9_]+$`)
- Client-side validation: check username format before submitting
- On `handleSignUp`: after successful `supabase.auth.signUp`, update the user's profile row with `full_name` and `username` via `supabase.from('profiles').update(...)` (the `handle_new_user` trigger already creates the row)
- Since the user won't have a session yet (email confirmation required), pass the name/username as `user_metadata` in the signUp options instead, then use a DB trigger or update the `handle_new_user` function to persist them

**Better approach**: Pass `full_name` and `username` via `options.data` in `signUp`, then update the `handle_new_user()` DB function to extract them from `raw_user_meta_data`.

**2. `handle_new_user()` DB function — Extract name + username from metadata**
- Migration to update the function to also set `full_name` and `username` from `raw_user_meta_data`:
  ```sql
  NEW.full_name := new.raw_user_meta_data ->> 'full_name';
  NEW.username := new.raw_user_meta_data ->> 'username';
  ```

**3. Username uniqueness — Add unique constraint**
- Migration: `ALTER TABLE profiles ADD CONSTRAINT profiles_username_unique UNIQUE (username);`
- In the signup form, add a debounced check against the profiles table to verify username availability before submission

**4. `src/components/onboarding/ProfileSetupSheet.tsx` — Remove full_name field, keep city**
- Since name is now collected at signup, remove the "Display Name" input from ProfileSetupSheet
- The sheet becomes a city-only picker (still triggered when `home_city` is null)
- Update the validity check and save logic accordingly
- Update the trigger condition: ProfileSetupSheet should now only show when `home_city` is missing (not `full_name`)

**5. `src/pages/Dashboard.tsx` — Update profile completeness check**
- Adjust the check that triggers ProfileSetupSheet to only look for missing `home_city` (since `full_name` is now guaranteed at signup)

### Summary

| File | Change |
|------|--------|
| `src/pages/Auth.tsx` | Add full_name + username inputs to signup form, pass via `options.data` |
| DB migration | Update `handle_new_user()` to persist name/username from metadata; add unique constraint on username |
| `src/components/onboarding/ProfileSetupSheet.tsx` | Remove name field, keep as city-only setup |
| `src/pages/Dashboard.tsx` | Update profile completeness check to only require `home_city` |

