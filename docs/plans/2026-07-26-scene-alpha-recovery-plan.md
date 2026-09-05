# Scene Alpha Recovery Plan

**Status:** Approved product direction, ready for visual prototyping and implementation planning  
**Date:** July 26, 2026  
**Product:** Scene  
**Audience:** First 20 to 30 personally invited iPhone users  
**Distribution:** TestFlight  
**Explicitly out of scope:** JuiceXP integration

## 1. Executive decision

Scene will become a mobile-native, cross-platform experience without discarding the product already built.

The fan-facing mobile app will be rebuilt in **React Native with Expo**, using one TypeScript/React codebase for iOS and Android. The first alpha remains iPhone-only and ships through TestFlight, but Android is part of the client architecture from the start rather than a second consumer-app rebuild after beta.

The existing React, Supabase, and ranking foundations will be retained. The existing web app becomes the home for invite generation, public share pages, operator/admin surfaces, and future web use. Its current consumer features remain preserved until each is explicitly reused, reshaped, hidden, or retired. Supabase, ranking logic, types, validation, analytics, copy, assets, and design tokens should move into shared packages where practical.

The alpha will focus on one promise:

> Build a personal collection of the live shows that shaped you, rank them to uncover your all-time favorites, and compare your Scene with friends.

Scene will not attempt to launch as a complete music social network. The alpha must first prove that personally invited users will:

1. Add meaningful show memories.
2. Reach the first ranking milestone.
3. Return to grow and settle their rankings.
4. Share their Scene or invite a friend.
5. Compare their live-music identity with someone they know.

## 2. Product thesis

Scene is not primarily a concert diary, review app, event-discovery app, or generic social feed.

Scene turns concert history into identity.

The core loop is:

```text
Remember shows
      |
      v
Rank the experiences
      |
      v
Reveal your live-music identity
      |
      v
Compare it with friends
      |
      v
Friends add their history
```

The product wins when a user's ranked Scene becomes something they are proud to show, debate, update, and send to friends.

## 3. Alpha user and entry point

The first user is an iPhone-owning friend personally invited by Sam.

They are not arriving from Juice, paid acquisition, search, or a generic App Store discovery journey.

### Personal invitation

Each friend receives a unique invitation link generated through a lightweight invite generator.

The link should:

- identify Sam as the sender;
- support the friend's first name;
- show Sam's photo and a short personal message;
- preserve attribution through installation, authentication, and activation;
- let the recipient see meaningful value before creating an account;
- make it easy to measure where each invitee drops out.

The invitation should feel personal rather than promotional.

### Invite generator

Sam needs a simple internal interface that can:

- create an invitation in seconds;
- optionally add the friend's first name;
- optionally customize the short note;
- copy the invitation link;
- show invitation status;
- show whether the recipient opened, installed, created a Scene, reached 5 shows, reached 10 shows, or invited someone else;
- revoke or disable a link if needed.

This is an alpha operating tool, not a general referral program.

## 4. Alpha scope

### Included

- React Native + Expo mobile app, with an iPhone TestFlight alpha and Android-ready architecture
- Personal invite landing and deep-link flow
- Guest-first first-show experience
- Sign in with Apple
- Show collection
- Guided memory-prompt deck
- Manual show addition
- Specific performance identity
- Venue and flexible date capture
- Personal show photos
- One short show memory
- Optional "Who were you with?"
- 5-show comparison unlock
- 10-show Opening Scene completion
- Ongoing adaptive ranking
- Ranking-debt queue
- My Scene collection and map
- Public and private profiles
- Per-show visibility
- Public share pages
- Direct friend connections
- "I was there too" quick add
- Friend comparison and Scene Match
- Existing feedback system
- Alpha analytics and invite funnel reporting

### Hidden from the alpha experience

These may remain in the codebase but should not appear in primary navigation or onboarding:

- upcoming-show planning;
- broad discovery or Explore;
- activity feed;
- contact syncing;
- standalone map tab;
- push-notification onboarding;
- waitlist flows;
- general referral leaderboard;
- broad community features;
- admin features not required to run the alpha.

### Explicit non-goals

- JuiceXP integration
- Android beta release during the iPhone-only alpha
- broad public launch
- a complete social feed
- concert-ticketing or event-commerce features
- generic numeric show ratings
- public search-engine indexing
- bulk historical import during onboarding
- final branding for the Scene Question

## 5. Simplified app shell

The alpha navigation contains:

1. **My Scene**
2. **Rank**
3. **You**

A prominent Add action is available throughout the app.

### My Scene

My Scene is the primary home.

It should contain:

- collection progress;
- the current ranked list;
- ongoing memory prompts;
- manual Add Show;
- map access;
- milestone progress;
- pending ranking debt;
- relevant friend-comparison prompts.

### Rank

Rank is an intentional mode. Comparisons do not interrupt adding or browsing shows.

It should contain:

- the current comparison;
- pending matchup count;
- progress through the current ranking-debt session;
- the current ranking;
- an honest "still settling" state when debt remains.

### You

You contains:

- public profile preview;
- profile visibility;
- shared links;
- friends and connections;
- comparison entry points;
- settings;
- existing Send Feedback action.

## 6. First-run experience

### Step 1: Personal welcome

The recipient sees:

- Sam's name and photo;
- the personal note;
- a concise explanation of Scene;
- a single invitation to begin.

Recommended framing:

> Sam invited you to build your Scene and uncover your favorite live shows of all time.

### Step 2: First memory prompt

Scene does not begin by asking the user to name their best show ever. The purpose is to help them rediscover the answer through collection and comparison.

The user enters through a deck of memory triggers, such as:

- A show you will never forget
- Your biggest surprise
- The best crowd you have ever been in
- A show that changed your taste
- The artist you waited years to see
- A night you wish you could relive
- The show that made you feel most alive
- An opener who stole the night

The user can:

- choose a prompt;
- skip it;
- shuffle for another;
- use manual Add Show instead.

Prompts remain available after onboarding as an ongoing collection tool.

### Step 3: Add the specific performance

The rankable object is a specific live performance, not an artist in general.

Required:

- artist or artists;
- venue;
- date or approximate date;
- city/location derived from the venue.

Date precision may be:

- exact date;
- month and year;
- year only;
- unknown, with enough context to revisit later.

At festivals, individual artist sets are separate rankable performances grouped beneath the parent festival.

### Step 4: Make the memory personal

The first version includes:

- one memory-prompt association;
- optional personal photo;
- optional short answer to a temporary memory question;
- optional "Who were you with?"

The branded Scene Question remains open. Temporary copy may be used until the later creative sprint.

Potential territory to revisit:

- What made this one different?
- What is the moment you still remember?
- Why does this night still live with you?
- What made this show yours?
- What happened that you had to be there for?

### Step 5: First-card payoff

Before authentication, the user sees their completed first show card.

This is the first emotional payoff.

### Step 6: Save the Scene

After the first show card:

> Your Scene has started. Save it.

Sign in with Apple is the primary authentication method.

Requirements:

- no password;
- display name only at this point;
- preserve all guest-entered data through authentication;
- username selection is deferred until the user wants public searchability or sharing;
- if authentication is dismissed, retain the first show safely on the device;
- the user cannot continue indefinitely without saving the account.

### Step 7: Build the opening collection

The user is encouraged to add two more prompt-driven shows, then continue toward the ranking milestones.

Collection stays memory-by-memory. Bulk import does not compete with this first-run ritual.

## 7. Collection milestones

### Three shows

- opening prompt ritual is complete;
- the user has a small personal collection;
- Scene shows clear progress toward comparison unlock.

### Five shows

- head-to-head comparisons unlock;
- the user can produce an early ranking;
- provisional friend Scene Match becomes possible when both people have at least five ranked shows.

### Ten shows

- the user's Opening Scene is complete;
- Scene celebrates their Top 10;
- their current all-time number one is revealed;
- the complete friend-comparison experience unlocks when both people qualify;
- the map can celebrate the number of cities and venues represented;
- the user receives a high-quality share and invitation artifact.

The product must make progress visible without making collection feel like homework.

## 8. Show record

### Canonical event facts

- artist or artists;
- headliner where applicable;
- venue;
- venue location and coordinates;
- performance date and precision;
- event or festival grouping;
- canonical event identity when one exists.

### Personal experience

- owner;
- memory prompt;
- temporary Scene Question answer;
- personal photo;
- optional short note;
- optional attendees or companion names;
- visibility override;
- created and updated timestamps.

### Derived experience

- current rank;
- ranking score;
- comparison count;
- ranking confidence;
- ranking-debt state;
- shared attendance;
- friend overlap;
- map placement;
- collection statistics.

### Product rules

- no numeric or star rating in the alpha experience;
- the ranking is the primary opinion;
- the same performance may not be used to satisfy multiple opening prompts;
- a user may attend the same artist multiple times because each performance is distinct;
- one canonical event may have many users' private experience records;
- one user's photo, memory, prompt answer, companions, or rank is never copied to another user.

## 9. Ranking system

### Core question

The goal is a single overall ranking of favorite live-show experiences.

Memory prompts provide context but do not create separate category rankings.

### First ranking

At five shows:

- the user enters a short adaptive head-to-head session;
- Scene selects the most informative comparisons;
- the user produces an early ordered ranking;
- the result is framed as evolving, not definitive.

### Adding new shows

Each new show creates approximately two to four strategically selected comparisons.

The user can:

- rank immediately;
- defer ranking;
- continue adding shows.

### Ranking debt

Deferred or batch-added shows create ranking debt.

Rank contains an ongoing module such as:

> 6 matchups waiting

Rules:

- debt never blocks collection browsing;
- rankings remain shareable while settling;
- shared output clearly indicates when the ranking is still settling;
- comparisons remain a separate intentional mode;
- the current list updates immediately as enough evidence is collected;
- a new show visibly moves into position when its placement becomes reliable.

## 10. Sharing and invitations

### Ranking share

A share page provides meaningful value before signup.

It should show:

- the sender's number one as the hero;
- a visual Top 5;
- an expandable full Top 10;
- whether the ranking is still settling;
- a clear invitation to build the recipient's Scene.

Recommended CTA:

> Sam found his number one. Build your Scene and find yours.

### Invitation behavior

- direct personal invitation links automatically connect the new user to the sender after signup;
- public-profile discovery does not automatically connect users;
- non-invite interactions use a separate Connect action;
- explicit share links continue to work for private profiles according to their share permissions.

### "I was there too"

Public show activity and shared pages include:

> I was there too

This action copies only:

- artists;
- venue;
- date;
- location;
- canonical event identity;
- festival grouping.

It never copies:

- the other user's photo;
- their memory;
- their prompt answer;
- companions;
- their rank.

After quick-add, the user sees an optional Make It Yours sheet containing:

- temporary Scene Question;
- optional photo;
- optional companions.

The user may skip this sheet and save immediately.

The new experience enters their collection and ranking-debt queue.

## 11. Friend comparison

The comparison page is a core alpha feature, not a later social-network add-on.

### Immediate comparison

As soon as users connect, show available overlap:

- shared shows;
- shared artists;
- shared venues;
- shared cities;
- differences in collection size.

### Five-show threshold

When both users have at least five ranked shows:

- unlock provisional Scene Match;
- show early taste alignment;
- show selected ranking agreements and disagreements;
- clearly label the result as provisional.

### Ten-show threshold

When both users have at least ten ranked shows:

- unlock the complete Scene Match;
- compare Top 10 overlap;
- show biggest ranking disagreement;
- show closest agreement;
- show shared number-one artists or venues;
- provide new quick-add opportunities;
- make the result shareable between the friends.

The comparison should create conversation, not declare one person's taste superior.

## 12. Privacy and safety

### Profile visibility

New profiles default to public.

Users may switch the entire profile between:

- Public
- Private

Public profiles may be accessed through:

- direct links;
- shared links;
- in-app user search.

Private profiles require:

- an accepted connection; or
- an explicit share link with appropriate access.

### Show visibility

Each show inherits the profile default.

A simple eye icon allows the user to hide or reveal an individual show.

The visibility state must be obvious, accessible, and reversible.

### Search indexing

Public alpha profiles and share pages should include no-index behavior. Search-engine discovery remains disabled until privacy, reporting, moderation, and public-profile quality are mature.

### Required hardening

Before inviting alpha users:

- replace broad authenticated read access to shows and show artists;
- enforce owner, connection, public-profile, and explicit-share rules in database policies;
- prevent public access from exposing hidden personal fields;
- separate canonical event facts from private user experience data;
- add block, disconnect, and report foundations appropriate for public-by-default profiles;
- test privacy rules adversarially with multiple accounts.

## 13. Native app and authentication

### Native strategy

- build the fan-facing mobile app in React Native with Expo;
- target iOS and Android from one TypeScript/React mobile codebase;
- use the iPhone app as the first TestFlight alpha surface;
- retain the existing React application for invite generation, public shares, internal tools, and future web use;
- share Supabase access, domain types, ranking logic, validation, analytics, design tokens, copy, and assets rather than duplicating business logic;
- do not maintain two implementations of the consumer app in parallel;
- use platform-specific native code only where it materially improves a capability or interaction.

### Existing Capacitor work

The existing Capacitor and iOS work is preserved and audited in Phase 0. It is not the target shell for the rebuilt alpha client. Reuse any valid native configuration, credentials, deep-link knowledge, assets, or capability work where it helps; do not delete it or assume it must ship unchanged.

### Required native capabilities

- Sign in with Apple;
- universal links and deep links;
- native share sheet;
- camera and photo-library access;
- safe-area and keyboard behavior;
- app lifecycle and guest-state preservation;
- TestFlight distribution;
- native crash and error visibility;
- future-ready push support without requesting permission during onboarding.

### Guest data

Guest data must survive:

- page or app reload;
- authentication handoff;
- app backgrounding;
- installation and deep-link transitions where technically possible.

The implementation plan must choose a safe guest identity and account-linking approach that does not create duplicate users or orphan show records.

## 14. Existing data and migration

All current production users and show data are treated as permanent.

Rules:

- no database reset;
- no destructive recreation;
- preserve source fields;
- back up and verify before consequential migrations;
- separate canonical event records from user-specific experience records through additive migrations;
- verify row counts and ownership after every migration;
- test migration against an isolated copy before production;
- retain compatibility long enough to migrate existing app behavior safely;
- provide a rollback or forward-fix path for every production data change.

## 15. Reliability recovery

The production build currently passes, but the repository has significant quality debt and lacks a meaningful automated test suite.

The recovery work should not begin with a cosmetic lint cleanup. Prioritize correctness and the alpha journey.

### Required before alpha

- build passes;
- critical lint and type failures in touched code are resolved;
- privacy policies are corrected and tested;
- personal invite opens correctly;
- guest work survives authentication;
- Sign in with Apple works on a real iPhone;
- show search and creation work;
- flexible dates work;
- first 5-show ranking works;
- ranking debt persists correctly;
- public/private and per-show visibility work;
- public share pages enforce field-level privacy;
- "I was there too" never copies private user content;
- friend comparison works at staged thresholds;
- existing feedback submission works in the native shell;
- crash and error paths are visible to the operator.

### Automated test priorities

1. Authentication and guest-account linking
2. Ownership and visibility authorization
3. Canonical event versus personal experience separation
4. Invite attribution and automatic connection
5. Show creation and duplicate handling
6. Ranking and ranking-debt behavior
7. Quick-add privacy
8. Friend-comparison eligibility
9. Existing-user migration
10. Critical native deep-link routes

## 16. Existing feedback system

Scene already has an in-app feedback button and an operating system for reviewing feedback.

The alpha should reuse it.

Required verification:

- it works inside the native shell;
- it identifies the current user and app version;
- it captures enough route and device context to reproduce the issue;
- screenshots do not expose hidden or sensitive information;
- feedback can be connected to invitation and activation state;
- the operator can distinguish bugs, confusion, and feature requests.

Do not build a second feedback system.

## 17. Alpha measurement

The invite generator and product analytics should track:

### Invitation funnel

- invite created;
- invite sent;
- invite opened;
- TestFlight/App Store step reached;
- app opened;
- first prompt started;
- first show completed;
- Sign in with Apple started;
- account saved.

### Collection funnel

- 3 shows added;
- 5 shows added;
- first comparison completed;
- early ranking revealed;
- 10 shows added;
- Opening Scene completed;
- Top 10 viewed;
- map celebration viewed.

### Social funnel

- sender connection created;
- sender profile viewed;
- shared show quick-added;
- provisional Scene Match viewed;
- complete Scene Match viewed;
- ranking shared;
- invitation generated;
- invited friend activates.

### Retention signals

- returns after first session;
- adds another show later;
- clears ranking debt;
- revisits a comparison;
- edits or enriches an old memory;
- invites another person.

Compliments and stated interest are useful qualitative input, but expansion decisions should be driven by observed behavior.

## 18. Alpha rollout

### Cohort

20 to 30 personally invited iPhone users.

### Release pattern

Invite in small waves rather than all at once.

Recommended sequence:

1. 3 to 5 trusted users
2. Fix onboarding and account-loss risks
3. Next 5 to 10 users
4. Fix ranking, sharing, and comparison friction
5. Remaining alpha cohort

### Distribution

Use TestFlight for the prerelease alpha.

Do not pursue an unlisted App Store release for the beta. Reassess normal public App Store distribution after the alpha experience is stable.

## 19. Delivery phases

### Phase 0: Recovery audit

**Status (2026-07-27):** the checked-in privacy, data, and Capacitor review is complete. See [`2026-07-27-privacy-data-capacitor-audit.md`](../audit/2026-07-27-privacy-data-capacitor-audit.md). Live production policy/function/storage verification and the production-user inventory remain blocked on Supabase management access; they must be completed before alpha invitations.

- inventory current production data and users;
- document the current show, artist, venue, ranking, profile, invite, and feedback models;
- audit privacy policies and storage access;
- inventory the uncommitted Capacitor and iOS work for preservation or reuse in the new mobile architecture;
- verify production environment and deployment ownership;
- identify the smallest additive migration path;
- establish a baseline test harness.

### Phase 1: Reviewable experience prototype

Prototype the complete first-session flow in React Native + Expo before production implementation:

- personal invitation;
- first memory prompt;
- specific-show capture;
- first show card;
- Sign in with Apple save moment;
- progress from 1 to 5 shows;
- first comparison;
- Top 10 milestone;
- My Scene, Rank, and You navigation;
- share page;
- "I was there too";
- friend comparison.

The prototype should validate interaction and emotional pacing, not only visual styling.

### Phase 2: Safety and identity foundation

- fix read policies;
- separate canonical event facts from personal experience fields;
- implement guest identity and account linking;
- implement Sign in with Apple;
- implement universal links;
- preserve existing production data;
- add critical authorization tests.

### Phase 3: Collection and milestones

- build the personal invite generator;
- build personalized invite entry;
- simplify the app shell;
- build the memory-prompt deck;
- rebuild streamlined show capture;
- implement flexible dates;
- implement 3, 5, and 10 show milestones;
- retain the existing feedback system.

### Phase 4: Ranking and sharing

- implement first ranking unlock;
- implement ranking debt;
- implement current ranking confidence;
- build public/private profile behavior;
- implement per-show eye visibility;
- build ranking share pages;
- implement no-index behavior.

### Phase 5: Friend loop

- implement automatic connection from direct invitations;
- implement "Who were you with?";
- implement "I was there too";
- implement immediate overlap;
- implement provisional Scene Match;
- implement complete Scene Match;
- add quick-add opportunities throughout comparison.

### Phase 6: Mobile validation and TestFlight

- validate on real iPhone hardware, with Android compatibility checked continuously but no Android beta cohort yet;
- verify photos, links, authentication, share sheet, and lifecycle behavior;
- verify feedback capture;
- run adversarial privacy tests;
- instrument the complete funnel;
- release to the first 3 to 5 users;
- observe and fix before expanding.

## 20. Acceptance criteria

The alpha is ready for Sam's first invitation when:

1. Sam can generate a personalized invitation in under 30 seconds.
2. A recipient can open the invite and understand Scene without prior explanation.
3. A recipient can complete one show before authentication.
4. Sign in with Apple preserves the completed show.
5. The user can add five shows without typing redundant event data.
6. The user can unlock and complete an early ranking.
7. The user can reach ten and reveal a Top 10 and number one.
8. New shows create recoverable ranking debt.
9. Public, private, and hidden-show behavior is enforced by the database.
10. A ranking remains shareable while settling.
11. "I was there too" copies no personal content.
12. Connected friends see immediate overlap.
13. Staged Scene Match unlocks correctly.
14. Existing users and data remain intact.
15. The current feedback system works from the iPhone app.
16. Critical flows are covered by automated and real-device tests.

## 21. Deferred decisions

These are deliberately left open:

- final Scene Question and branded copy;
- final memory-prompt library;
- final share-card visual system;
- normal public App Store launch timing;
- Android timing;
- public discovery and activity feed;
- push-notification strategy;
- monetization;
- deep moderation system;
- broad community rankings;
- JuiceXP integration and import contract.

## 22. Next action

Review the [whole-app inventory and preservation map](../audit/2026-09-05-current-app-inventory.md) before choosing the first migration slice. Complete a safe current-app walkthrough, establish a reviewed preservation checkpoint, and reconcile the documented product/privacy conflicts before designing production data contracts.

Then select a bounded first-session prototype in React Native + Expo, informed by what already exists. The intended experience remains personal invitation through first comparison and Top 10 reveal; it is not authorization for a wholesale rebuild.

Do not begin broad production implementation or destructive schema changes until that experience is approved and the Phase 0 privacy/data audit is complete.
