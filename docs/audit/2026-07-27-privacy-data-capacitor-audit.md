# Scene privacy, data, and Capacitor audit

**Date:** 2026-07-27

**Status:** Phase 0 complete for the checked-in code. Production configuration, deployed function revisions, data retention, and live policy state remain **UNVERIFIABLE** because the local environment has no Supabase management access.

## Scope and decision

This was a read-only review of the current React/Supabase application and its untracked Capacitor iOS shell. No production data, database schema, RLS policy, native project, signing configuration, or secrets were changed.

The architecture decision stands: build the fan app in **React Native + Expo**, sharing TypeScript contracts and product logic where it makes sense. Preserve the existing web app for public shares, invite generation, and operator/admin work. Preserve the Capacitor project as an archive/reference, not as the alpha delivery shell.

## What the current product stores

The current schema is a good source for recovery, but it is broader than the alpha needs.

| Data area | Confirmed fields or behavior | Alpha posture |
| --- | --- | --- |
| Profile | Name, username, avatar, bio, phone number, home city, home latitude/longitude, referral code, onboarding state | Keep a small public profile projection. Treat phone and exact home location as private. |
| Show memory | Artist, venue, date, rating, scores, notes, photo, tags, rankings, comparisons | Core alpha data. Private by default; share an explicit, purpose-built reveal instead of the underlying row. |
| Social | Followers, upcoming shows, profile search | Defer from alpha except an explicit friend comparison path if it earns its place. |
| Operational | Waitlist contact details, bug reports/screenshots, push subscriptions/logs, roles | Keep out of the fan app. Restrict to admin paths and document retention. |

## Confirmed findings

### P0. Signed-in users can read sensitive profile fields

`profiles` contains `phone_number`, `home_latitude`, and `home_longitude`. A later RLS policy allows **every authenticated user** to select every profile row. RLS works at the row level, not the column level, so application code selecting only a name/avatar does not prevent a malicious or modified client from selecting the other fields.

**Required before alpha invites:** remove the broad table read. Create a constrained `public_profiles` view or a security-definer function that exposes only `id`, `username`, `full_name`, `avatar_url`, and the minimum approved bio/city fields. Move exact location out of the shared profile surface, or do not collect it.

### P0. Signed-in users can read every private show

To support invite cloning, the current policy grants every authenticated user `SELECT` access to all `shows` and `show_artists`. The show row includes free-form `notes`, `photo_url`, granular ratings, dates, and venue data.

**Required before alpha invites:** remove that global read policy. Replace it with a narrowly scoped RPC or Edge Function that accepts a signed, expiring share token and returns only the fields selected for the reveal. The client must never clone or read an arbitrary original show row.

### P0. Public storage exposes personal media

The `show-photos` bucket is public and has an unconditional public `SELECT` policy. The `bug-screenshots` bucket is also public and has an unconditional public `SELECT` policy. The latter is especially risky because a bug screenshot can capture account or personal context.

**Required before alpha invites:** make both buckets private. Serve user-approved share media via short-lived signed URLs or a share endpoint. Allow admin-only access to bug screenshots. Add upload size/type limits and a retention/deletion policy.

### P0. A public service-role endpoint can alter waitlist records

`update-waitlist` has JWT verification disabled. It accepts a caller-supplied UUID and uses the Supabase service role to update that waitlist record. It does not prove the caller owns the row or holds a single-use edit token.

**Required immediately:** disable this endpoint while the alpha product is rebuilt, or require a signed, short-lived, row-bound edit token. Do not expose database identifiers as authority. Rotate any affected invite/edit link strategy after the fix is deployed.

### P1. Public AI and data-enrichment endpoints have no caller-level protection

`parse-show-notes`, `parse-upcoming-show`, `search-artists`, `unified-search`, and `match-venue-from-location` are configured without platform JWT verification. Some validate an optional user token in code; others do not. Several call paid external services using server secrets.

**Required before open beta:** require a valid user session for fan-only operations, apply per-user and per-IP rate limits, cap input size, and put cost/error telemetry around every paid call. Keep genuinely public search separate from AI parsing.

### P1. The public demo endpoint reads a fixed account through the service role

`get-demo-data` is public and queries a hard-coded account using the service role, returning show notes, dates, venue coordinates, and photo URLs. It must contain only intentional, non-personal seeded data. Its current deployed behavior is not verified in this audit.

**Required before public launch:** move demo data to a dedicated seeded dataset or static fixture. Never point a public endpoint at a real person’s account.

### P1. Current data minimization is not designed into the social model

The codebase has contact lookup, follower discovery, nearby/friend activity, planned shows, referral tracking, push subscriptions, and location fields. This is more collection than the Electric Canon alpha requires.

**Alpha rule:** no contact syncing, background location, friend graph, or push permission request in the core path. Ask for a photo only when a person is preserving a memory, and explain exactly what sharing it does.

## Capacitor audit

The existing native work is deliberately preserved, but it is not a safe base for the new alpha.

- It is an untracked, minimal iOS wrapper with bundle ID `app.tryscene` and iOS 15 deployment target.
- It configures no native plugins/capabilities, entitlement file, privacy manifest, camera/library usage description, push configuration, or deep-link configuration.
- The JavaScript dependencies are Capacitor 8.1, while the generated iOS Swift Package manifest references Capacitor 7.0. That version mismatch makes the wrapper untrusted until regenerated and tested.
- Capacitor Doctor reports the installed package set as structurally healthy, but that is not a build, signing, TestFlight, permission, or privacy validation.
- Android is not installed in the repository.

**Disposition:** keep `ios/` and `capacitor.config.ts` untouched as an archived reference. Do not spend time repairing or deleting it. The future Expo app gets its own bundle IDs, permissions, privacy manifest, native builds, and TestFlight/Play testing pipeline.

## Alpha privacy contract to implement

1. **Private canon by default.** A show, photo, note, rating, and comparison are visible only to its owner unless they deliberately create a share.
2. **Shares are artifacts, not database access.** A reveal contains only selected fields, has a revocable token, and can expire.
3. **No precise location as social data.** Store a city or venue when the memory needs it. Do not expose a home coordinate.
4. **No contact graph required.** Friend comparison starts through an intentional link/invite, not address-book ingestion.
5. **Purpose and deletion are first-class.** Capture only what powers the alpha, show people what is private/shared, and provide delete/export paths before opening beyond the cohort.
6. **Production secrets stay server-side.** Expo uses the public Supabase project URL/publishable key only. Service-role keys and paid-provider credentials remain in Edge Functions or another server boundary.

## Ordered implementation gate

1. Snapshot the live Supabase schema, RLS policies, storage settings, function versions, and data categories using management access. Compare them to this repository audit before changing anything.
2. Patch the P0 RLS/storage/function issues in a reversible migration and verify with three test identities: owner, unrelated signed-in user, and anonymous visitor.
3. Define the alpha data contract and shared TypeScript types: `ProfilePublic`, `ShowPrivate`, `RevealPublic`, and `ShareToken`. Do not reuse broad table rows as API contracts.
4. Build the Expo prototype against an isolated development project or a separate alpha schema. Do not run development migrations blindly against the existing shared project.
5. Add an in-app privacy screen and a lightweight deletion request flow before cohort onboarding.

## Verification boundary

This audit verified the checked-in migrations, function source, local environment variable names, and native project files. It did **not** verify:

- which migrations or function revisions are actually deployed;
- the live RLS policy catalog, bucket public flags, auth settings, or user count;
- whether the hard-coded demo account is synthetic;
- vendor retention/DPA settings, App Store privacy declarations, or production logs;
- iOS signing, build, or TestFlight behavior.

Those items require Supabase management authentication and, later, a fresh native build. `supabase functions list` could not run because this machine has no Supabase access token.
