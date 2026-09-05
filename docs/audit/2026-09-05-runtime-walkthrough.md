# Scene current-app runtime walkthrough

Date: 2026-09-05
Status: Public/demo pass and signed-in screen inspection completed with findings. Write-path, multi-account privacy and real-device testing remain open. Not a release certification.

Companion to the [whole-app inventory](2026-09-05-current-app-inventory.md). This report records observed behavior separately from code-supported explanations. No production fixes or migrations were made.

## Environment and safety boundary

- Ran the existing Vite app locally at `http://127.0.0.1:8080/`, not an Expo implementation or deployed web release.
- Used the Codex in-app browser, first at its default 1280 x 720 viewport and then at 390 x 844 for phone-width checks. Viewport testing is not iOS/Android device testing.
- Verified the current local configuration points to `swbaamxtmzjnbaxizjuw.supabase.co`, the legacy backend, with public client configuration present. No credentials were printed or copied into this report.
- Artist search returned results in this session. That establishes a working request path, not backend ownership or overall backend health. The new owned alpha project was not queried or changed.
- No account was created, no credentials entered, no photo uploaded, and no invitations, feedback, push notifications or emails deliberately submitted. No location/contact/photo permissions were granted.
- One clearly marked synthetic memory was saved into the demo's in-memory context, using an existing artist result, manually named venue, no address, year only, one highlight and a fixture note. No production show save was performed. Normal service logs/cache effects were not audited.
- The demo is not assumed to be a sandbox: the shared VenueStep contains an authenticated venue-insert path. We used the no-address/no-location-filter Skip branch, which only passes local selection state. Any broader demo test must inspect its effects first.

## Observed journey results

| ID | Action | Observed result | Verdict |
| --- | --- | --- | --- |
| W01 | Load `/` | Marketing headline, collection CTA and show-capture/ranking examples render. | Public entry renders. Not an implemented capture experience. |
| W02 | Click Start Your Collection | Navigates to `/auth`, with Sign In selected. | Existing flow requires account access first, unlike approved guest-first alpha. |
| W03 | Inspect Sign In and Sign Up | Both show email/password. Signup provides Create Account. No Apple sign-in shown. No account form submitted. | Identity screen verified; successful auth untested. |
| W04 | Load `/demo` | Header, loading collection skeletons, bottom navigation and Add action render. Backend request subsequently fails. | Demo shell available; sample collection unavailable in this session. |
| W05 | Click demo Add | Opens photo-first Add Multiple Shows At Once with a Search manually alternative. | Useful existing entry choices. File selection/upload not exercised. |
| W06 | Search manually for Jamie xx | Artist results appear, including Jamie xx and a manual-add option. Selected Jamie xx. | Artist lookup and selection work in this session. Latency not benchmarked. |
| W07 | Search venue The Shrine | UI shows No matching venues found. Console records `Error searching venues: FunctionsHttpError: Edge Function returned a non-2xx status code`. | Failed lookup is presented like no matches, not a service error. Root cause not established. |
| W08 | New venue, then Skip optional address | Advances to date capture without requiring geocoding or a saved venue. | Manual fallback works for this branch. |
| W09 | Choose uncertain date, year 2022, no month | UI offers Year and optional Month, with Continue enabled. | Year-only capture works at input stage. Persisted/displayed date semantics not verified. |
| W10 | Choose a highlight and fixture note, then Save Show | Success state shows artist/venue, Demo Mode - Not Saved, signup CTA and Done. | Temporary demo capture completes. This is not a database-save test. |
| W11 | Click Done | Collection shows `Failed to load demo data` and `Edge Function returned a non-2xx status code`, instead of the new local card. No retry action appears in the error area. | Broken end-to-end payoff despite successful local capture. |
| W12 | Open demo ranking | Loading branding followed by `Loading demo shows...`; no comparison pair reached. | Ranking could not be exercised. Source explains ambiguous failure/empty handling below. |
| W13 | Open `/dashboard` signed out | Redirects to `/auth`. | Client route guard observed. Does not establish database authorization. |
| W14 | Open `/admin` signed out | Redirects to `/auth`. | Client route guard observed. Signed-in non-admin/server checks remain untested. |
| W15 | Open `/install` | PWA install instructions for iPhone/iPad and Android render, alongside offline-readiness claims. | Instructions visible. Installation and offline claims not verified. |
| W16 | Open share URL with all-zero synthetic show UUID | Falls back to generic “You've been invited to join Scene” and account CTA, without a specific show or explicit unavailable-invite explanation. | Graceful rendering, but ambiguous invitation state. Does not verify valid/private/revoked shares. |
| W17 | Open `/landing-v1` | Older landing renders with Get Started, Try Live Demo, and sample ranking content. | Legacy marketing surface is still accessible. |

## Prioritized findings and preservation implications

### P1: Demo cannot currently demonstrate the core loop

Observed: collection data request fails; local Add reports success; returning to collection displays only the request error. Ranking cannot reach a usable pair.

Code-supported explanation: [DemoHome](../../src/components/DemoHome.tsx) returns its error screen before rendering the combined local/fetched collection. [useDemoData](../../src/hooks/useDemoData.ts) records the function error. [DemoRank](../../src/components/DemoRank.tsx) labels fewer than two shows as “Loading demo shows...” without distinguishing this from failed data retrieval.

Recommendation: preserve the capture/pairing work, but require reliable seeded test data, distinct loading/empty/error states, and a recoverable local-memory payoff in any prototype. Do not estimate demo readiness from source presence.

### P1: Search failures masquerade as empty results

Observed: artist search succeeds; venue search for The Shrine reports no matches while logging a non-success backend response. Manual entry remains usable.

Recommendation: preserve manual fallback and search composition. Require an explicit “Search unavailable, enter manually or retry” state and test it. Do not conclude the venue is absent from the provider or database based on this run.

### P1: Demo isolation is not a guaranteed boundary

Source finding, not an observed write: [DemoAddShowFlow](../../src/components/DemoAddShowFlow.tsx) uses [VenueStep](../../src/components/add-show-steps/VenueStep.tsx). Its address-confirmation path may create a venue when an authenticated user exists. Temporary show storage does not make every shared component temporary.

Recommendation: define an isolated test backend or dependency adapters before testing write-heavy capture, imports, repairs and demo behavior under a signed-in session. Do not use real personal data as fixtures.

### P2: Accessibility semantics need repair in carried-forward interactions

Observed: icon-only demo navigation/Add buttons have no accessible names in the browser tree. The photo/manual dialogs log missing Radix DialogTitle errors. Artist search also logs a duplicate/missing React key warning.

Recommendation: retain the interaction intent, not the markup debt. Include named controls, proper dialog titles, focus handling and VoiceOver/TalkBack checks in the native acceptance contract. No full accessibility certification was performed.

### P2: Current entry and messaging differ from product intent

Observed: the primary collection CTA selects Sign In before any memory entry. Auth shows hard-coded `Join 1,200+ music lovers`; the old landing advertises first-50 beta membership and a numeric sample score. Install advertises offline operation.

Recommendation: remove or substantiate unsupported proof and capability claims when touching these surfaces. Do not treat marketing examples as implemented product. Guest-first entry is an intentional alpha change, not a failed version of the existing auth screen.

### P2: Invalid share links need truthful recovery

Observed: a nonexistent show produces a generic invitation message. The page remains usable, but it does not tell a recipient the specific show is unavailable.

Recommendation: define missing, revoked, expired, private and temporarily unavailable states independently, while minimizing information disclosure. Validate with owner/unrelated/anonymous accounts after privacy semantics are chosen.

## What is worth carrying forward

- The artist-first capture progression and escape hatch to manual venue entry.
- Flexible historical dates, optional photo/address, short personal notes and expressive highlight tags.
- Explicit demo/not-saved messaging rather than pretending temporary data is permanent.
- The existing support/admin, ranking, map, imports and sharing investments identified in the source inventory. This pass has not yet established their signed-in runtime quality.

Do not use these findings to authorize a broad rewrite or opportunistic bug-fix sprint. First finish the signed-in behavior review, decide what the alpha should keep, then choose a narrow implementation contract.

## Next walkthrough block and acceptance targets

Sam subsequently signed in directly in the local browser. The signed-in results below supersede the authentication blocker. Do not submit comparisons or edits on an existing account without a designated safe fixture/write scope.

| Remaining coverage | Test type | Target before alpha release |
| --- | --- | --- |
| Existing signed-in screens and failure states | Manual browser walkthrough | Every visible capability classified as working, failing, inaccessible or deferred; no unsupported “works” claims. |
| Ranking/pairing rules | Deterministic unit tests | Cover skips, repeat selections, invalid pairs, new-show placement and milestone boundaries. |
| Show graph persistence and retries | Isolated integration tests | No duplicate memories, partial relationships or orphan media after simulated failures. |
| Guest-to-account continuity | End-to-end + real device | First memory survives dismissal, restart and successful auth without duplication. |
| Sharing/privacy | Multi-identity integration + E2E | Owner, connection, unrelated and anonymous outcomes match the approved visibility contract. |
| Search/provider outages | Contract/component tests | Time-bounded failure, honest messaging, manual fallback and retry. |
| Photos/deep links/sharing/keyboard | iPhone and Android device tests | Critical device flows verified independently of a desktop phone-sized viewport. |

Only this report and audit status documentation were changed. App fixes, account creation, database migration, and a preservation Git checkpoint remain outside this walkthrough pass.

## Signed-in continuation

Sam supplied the authenticated dashboard session. We inspected UI in the existing local browser at its user-selected narrow viewport. No password, email, phone number, private memory text or customer-record export is retained in this report.

Important safety correction: navigation cannot be assumed read-only in this codebase. After opening H2H, source inspection identified automatic insertion of default ranking rows when a show has none. We did not choose a winner or skip a comparison. Whether automatic initialization occurred during this visit was not established by before/after database evidence. No claim of zero backend writes is made. Do not undo any ranking rows speculatively.

| ID | Screen/action | Observed result | Verification boundary |
| --- | --- | --- | --- |
| S01 | Signed-in dashboard | Home feed, upcoming strip and six content-navigation choices render. | Existing signed-in entry works in this session. Does not establish freshness or truth of all displayed activity. |
| S02 | My Shows | Collection loads with 126 total records; set/show/festival filters and attention summary render. | Counts are UI observations, not an audited database reconciliation. |
| S03 | Select Shows filter | List reduces to three show entries, each with its displayed rank and venue/date information. | Filter interaction works. Does not establish ordering correctness for all data. |
| S04 | Open a show, then Done | Detail shows photo, performers, venue, approximate date, rank, personal take, Share and Invite to Compare actions. Done closes it. | Detail read works. Personal note was not copied into audit artifacts; share/delete actions were not invoked. |
| S05 | H2H | A two-show matchup renders with ranking-progress indicator and detail/skip/current-rank controls. | Pair presentation works. No vote or skip submitted; initialization caveat above applies. |
| S06 | Friends | Following count, activity list and My Scene This Week section render. The weekly section carries a Preview label. | Mix of fetched activity and fallback sample content; not all displayed attendance is real. |
| S07 | Friends > Upcoming | Actual feed shows No upcoming shows from friends while the weekly Preview still displays example attendance. | Filter responds; preview can contradict the actual empty state. |
| S08 | Globe | Summary counts and time filter render, but the map area is blank in the inspected browser view. | Rendering not verified. No location permission or repair/backfill action was triggered. No root cause established. |
| S09 | Schedule | Current-month heading, month controls, Friends control and No shows this month / Plan one state render. | Empty-state rendering works. Month navigation, populated calendar and planning saves not tested. |
| S10 | Profile | Identity, collection/follower counts, eight-item trophy shelf, friend lookup, invitation entry, account form and settings render. | Profile/trophy presentation works. No field edited, invitation sent, or permission changed. |
| S11 | Profile privacy/push | Public Profile is labeled Coming Soon; push is disabled with a browser-blocked explanation. | Visibility setting is not functional UI. Existing database privacy rules still require separate verification. |
| S12 | Find Friends | Name/username and phone lookup sheet opens and closes. | Entry UI works. No phone lookup, contact import, search submission or follow action tested. |
| S13 | Feedback | Chooser offers feature request or bug report and warns of automatic screenshot capture. Cancel dismisses it. | Chooser/cancel work. Did not select bug mode or upload a screenshot. |
| S14 | Admin | Current account can open Admin with Waitlist, Users, Inviters, Bug Reports, Feature Requests, Announcements and Quotes tabs. Users panel renders its summary. | Operator shell/current-account access verified. No user records exported, approvals/sends performed, or authorization bypass attempted. Other panel workflows remain untested. |

### Newly confirmed issues

1. **Sample social proof appears inside the signed-in product.** [WhatsNextStrip](../../src/components/home/WhatsNextStrip.tsx) passes `DEMO_10_FRIENDS` to the first Mine card unconditionally. This matches the sample avatar stack observed on the dashboard. [FriendsPanelView](../../src/components/home/FriendsPanelView.tsx) substitutes `DUMMY_SHOWS` when the next-week dataset is empty; unlike the first case, it labels that section Preview. Before any release, fixtures must be excluded from real-user surfaces or explicitly confined to a preview environment. These are source-backed findings, not assumptions about the users in fetched activity.
2. **Reading a screen may write data.** [Rank](../../src/components/Rank.tsx) calls `fetchShows()` on mount and inserts missing `show_rankings` rows with default scores. Initialization may be intended, but must be documented, idempotent, authorized and tested. Audits cannot call such a route read-only without checking its side effects.
3. **Public/private control is still a placeholder.** Runtime confirms the source inventory's gap. We must reconcile privacy requirements before implementing the feature, not treat this label as an existing setting to port.
4. **The map remains unverified.** Summary statistics alone do not prove map rendering. Investigate in a separate bounded diagnostic pass or a second supported browser/device before assigning a cause.
5. **Accessibility debt also affects signed-in flows.** Show-detail dialogs emit missing title/description warnings; Home/Profile/Add navigation includes unnamed icon buttons. This needs explicit accessibility acceptance criteria for carried-forward interactions.

### Preservation verdict after seeing the app

Preserve the collection, grouped performer information, flexible dates, show-detail/memory presentation, ranking domain work, trophy shelf and existing operator/support system. These are concrete product investments, not a disposable prototype. Rebuild their native presentation selectively and repair their contracts, instead of translating the entire current interface screen-for-screen.

Keep planning, broad feeds, map implementation and import/share-editor work available for deliberate reuse. Their presence is not a reason to include every surface in alpha. Nor is the narrower alpha a reason to delete them.

The evidence now supports moving from inventory to a reviewed preservation checkpoint and a small reuse/repair contract. It does not support a wholesale rewrite, production data migration, or claims that saving/ranking/sharing are fully verified. Next: prepare the checkpoint safely, resolve visibility semantics, then choose the first end-to-end slice with a designated test environment.
