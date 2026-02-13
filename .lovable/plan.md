

# Admin Dashboard for Scene

## Overview

Build a protected `/admin` route that gives you a clean interface to manage waitlist requests, create approved user accounts, and eventually handle notifications. Only users with the `admin` role can access it.

## What Gets Built

### Phase 1: Foundation (this plan)

**1. Role-based access control**
- Create a `user_roles` table with an `app_role` enum (`admin`, `user`)
- Create a `has_role()` security definer function to check roles without RLS recursion
- Assign your account the `admin` role manually

**2. Admin page (`/admin`)**
- New route protected by role check -- redirects non-admins to `/dashboard`
- Clean dark-themed table UI matching the Scene aesthetic
- Tabs: **Waitlist** | **Users** (expandable later for Notifications, Analytics)

**3. Waitlist management tab**
- Table showing all waitlist entries: phone number, country, source, discovery source, shows/year, status, submitted date
- "Approve" button per row that:
  1. Opens a small modal to enter email + temporary password for the new user
  2. Calls a new `approve-waitlist` edge function that:
     - Creates the user via Supabase Admin Auth API (`supabase.auth.admin.createUser`)
     - Updates the waitlist entry status to `approved`
     - Assigns the `user` role
  3. Shows success confirmation
- Status filter chips: All, Pending, Approved
- Row count / basic stats at the top

**4. Users tab**
- Lists all profiles with username, email, created date, show count
- Read-only for now (management features can come later)

### Phase 2: Future additions (not in this plan)
- Send SMS/email notifications to approved users
- Bulk approve/reject
- Analytics (signups over time, waitlist conversion rate)
- Invite link generation

## Technical Details

### Database Changes

```sql
-- Role enum and table
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS: admins can read all roles, users can read their own
CREATE POLICY "Admins can read all roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can read own role"
  ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
```

### New Edge Function: `approve-waitlist`

- Accepts: `{ waitlistId, email, password }`
- Validates caller is admin (checks `user_roles` via service role)
- Creates user with `supabase.auth.admin.createUser({ email, password, email_confirm: true })`
- Inserts `user` role into `user_roles`
- Updates waitlist row status to `'approved'`
- Returns success with the new user ID

### New Files

| File | Purpose |
|------|---------|
| `src/pages/Admin.tsx` | Admin dashboard page with tabs |
| `src/components/admin/WaitlistTab.tsx` | Waitlist table + approve flow |
| `src/components/admin/UsersTab.tsx` | User list (read-only) |
| `src/components/admin/ApproveModal.tsx` | Modal to enter email/password for approval |
| `src/hooks/useAdminCheck.ts` | Hook to verify admin role, redirect if not |
| `supabase/functions/approve-waitlist/index.ts` | Edge function for secure user creation |

### Route Addition

```text
/admin → Admin.tsx (role-gated)
```

### Security Model

- The `approve-waitlist` edge function uses the service role key, so it can create users and update waitlist entries
- The edge function verifies the calling user has the `admin` role before proceeding
- The waitlist table's SELECT policy (`false`) means only the edge function (via service role) can read entries -- the admin page will call an edge function to fetch waitlist data too
- No client-side role checks for security -- the edge function is the gatekeeper

