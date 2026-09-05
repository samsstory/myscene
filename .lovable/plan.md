# Scene — Codex Handoff (read-only audit)

## 0. What I could actually inspect

| Source | Access | Notes |
| --- | --- | --- |
| Working source tree | Yes | Local HEAD `52e6f568b71d63eb54d9b8d44c5b0cb3d356a8be` ("Work in progress"), clean tree, no uncommitted diff |
| Live database (schema, functions, triggers, constraints, RLS/storage policies, cron) | Yes, read-only SQL | Live instance is the same one that serves preview and production |
| `supabase/migrations` (71 files) + `supabase/config.toml` | Yes | Intent, not proof of live state |
| Edge function source in repo | Yes | I did **not** enumerate the deployed function list or invoke any function |
| Secret **names** | Yes (15) | Values not retrievable |
| This project's conversation history | Partially | I have a compaction summary of recent months, not the full verbatim log. Citations below are from that summary and are labelled as such |
| Lovable-side auth provider config, redirect URLs, email/domain settings, analytics | **No** — not read this session | Treat as unknown, not as absent |
| Customer data | Not inspected beyond schema-level queries |

Labels used throughout: **[V]** verified in code or live DB · **[D]** documented intent (conversation/plan files) · **[I]** inference · **[?]** unknown.

---

## 1. Ranking mechanics

### 1.1 Data model **[V live DB]**

- `show_rankings(id, user_id, show_id, elo_score int, comparisons_count int, created_at, updated_at)`; `UNIQUE (user_id, show_id)`; `updated_at` maintained by trigger `update_show_rankings_updated_at`.
- `show_comparisons(id, user_id, show1_id, show2_id, winner_id nullable, created_at)` with two decisive constraints:
  - `CHECK (show1_id < show2_id)` — pairs stored in canonical order.
  - `UNIQUE (user_id, show1_id, show2_id)` — **a given pair can be judged at most once per user, forever.**
- All FKs cascade from `shows`; `winner_id` FK to `shows`.
- No DB-side ELO logic. Every score is computed client-side. **[V]** — no trigger on `show_rankings`/`show_comparisons` other than `updated_at`.

### 1.2 Constants and formula **[V]**

Duplicated verbatim in four places: `src/components/Rank.tsx::calculateElo`, `src/components/home/FocusedRankingSession.tsx::calculateElo`, `src/hooks/useVSHeroPair.ts::calculateElo`, `src/components/DemoRank.tsx`.

```
start elo = 1200, comparisons_count = 0
K_BASE = 32, K_MIN_COMPARISONS = 10
K(c) = c < 10 ? 32 * (1 + (10 - c)/10) : 32          // 64 at c=0 … 32 at c>=10
E_a  = 1 / (1 + 10^((elo_b - elo_a)/400))
new_winner = round(elo_w + K(c_w) * (1 - E_w))
new_loser  = round(elo_l + K(c_l) * (0 - E_l))
```

Each side uses **its own** K, so a match between a fresh and a mature show is not zero-sum. Scores are integers (`Math.round`).

`src/components/add-show-steps/QuickCompareStep.tsx` is the exception: it inlines `const K = 32` with no adaptive term. **Codex's observation is confirmed.** It is a separate copy of the maths, not a call into the shared function; the shared function was never extracted into `smart-pairing.ts` at all. I found no conversation evidence of a deliberate "quick-add should use fixed K" decision, so: **[I]** duplication drift, not a designed difference. Do not invent a rationale for it.

### 1.3 Worked examples **[I, arithmetic from the verified formula]**

1. **Equal scores, both mature** (1200 vs 1200, c=12 each): E=0.5, K=32 → winner 1216, loser 1184.
2. **Equal scores, both brand new** (1200 vs 1200, c=0): K=64 → winner 1232, loser 1168. Same preference, double the movement — first sessions move the list hard, by design of the adaptive K.
3. **Upset** (winner 1100 c=6 → K=44.8; loser 1400 c=15 → K=32): E_w=0.1494, E_l=0.8506 → winner 1100+44.8·0.8506 ≈ **1138**; loser 1400−32·0.8506 ≈ **1373**.
4. **New show vs established favourite** (new 1200 c=0 → K=64; favourite 1500 c=20 → K=32). New show wins: E_new=0.1492 → new **1254**, favourite 1500−32·0.8508 ≈ **1473**. New show loses: new 1200−64·0.1492 ≈ **1190**, favourite ≈ **1505**.
5. **"Too tough"** (tie, `winner_id = null`): both `elo_score` written back **unchanged**, both `comparisons_count + 1`, pair permanently consumed. So a tie raises "confidence" while adding no ordering information. **Codex's observation is confirmed** for the "Too tough" control.
6. **"Skip"** (`handleSkip`, `Rank.tsx`): writes **nothing**. It adds the pair to an in-memory `comparedPairs` copy for that session only; on next mount the pair is eligible again.

### 1.4 Candidate selection — `src/lib/smart-pairing.ts` **[V]**

`selectSmartPair({shows, rankings, comparisons, comparedPairs, focusOnUnderRanked, comparisonThreshold})`:

- Builds a "beats" graph from all comparisons; **ties/skips (`winner_id === null`) are excluded from the graph**.
- `isTransitivelyImplied` = BFS over the beats graph, `maxDepth = 3`. If A→B or B→A is reachable, `calculatePairScore` returns `-1` and the pair is dropped. This is the main swipe-count reduction; the file header claims 40–60% fewer swipes **[D — an unverified claim in a code comment]**.
- Score for surviving pairs:
  - `proximity = max(0, 1 − |Δelo|/400)`, multiplied by `0.3` when `|Δelo| > 200`;
  - `uncertainty = max(0, (10 − avgComparisons)/10)`;
  - `informationBonus = 0.2` when `min(comparisons) < 3`;
  - `score = 0.5·proximity + 0.3·uncertainty + 0.2·informationBonus` (so the bonus is worth at most 0.04 — likely not the intended weighting **[I]**).
- Already-compared pairs are excluded by `comparedPairs`, so **repeat comparisons of the same pair never happen and contradictory preferences can never be recorded.** The list has no mechanism for "I changed my mind".
- Final pick: sort desc, take top 5 (general) or top 3 (focused), choose uniformly at random.
- `focusOnUnderRanked: true`: primary = the show with the fewest comparisons among those below `comparisonThreshold` (3); partners get `+0.5` if they are already at/above threshold (pull toward a stable anchor). Returns `null` when no show is under-ranked.
- `selectBestAnchor` (used by quick-add): scores existing shows by `0.6·(1 − |elo − medianElo|/300) + 0.4·min(1, comparisons/5)`, random pick from top 3 — deliberately compares a new show against a *median, stable* show rather than the user's favourite.
- `areRankingsComplete` exists and is **imported into `Rank.tsx` but never called — dead code [V]**. Real completion = `selectSmartPair` returning `null`.

### 1.5 How a new show enters **[V]**

There is no explicit onboarding of new shows into the ELO pool. Instead, three screens **write to the database on entry**:

- `Rank.tsx::fetchShows`, `FocusedRankingSession.tsx::fetchData`, `useVSHeroPair` load: select all `shows`, diff against `show_rankings`, and **INSERT missing rows at `elo_score: 1200, comparisons_count: 0`** before any user action.
- `QuickCompareStep` upserts rankings at 1200 as part of saving its comparison.

So a new show starts mid-pack and is then favoured by the uncertainty term and the `informationBonus`, and gets larger K swings for its first ~10 comparisons.

### 1.6 Scope: global vs filtered **[V]**

- **Pair selection is pool-scoped.** `Rank.tsx` filters `allShows` by `show_type` (`set` | `show` | `festival`), auto-selecting the pool with the most shows, and only pairs within it. `useVSHeroPair` does the same. `FocusedRankingSession` does **not** — it pairs across all show types.
- **ELO is a single global column.** Cross-pool contamination is impossible only because of the selection filter, not the data model.
- **Displayed rank position is global and unfiltered:** `useShows.getShowRankInfo` sorts *all* the user's shows by elo desc, tie-break date desc, and returns `indexOf + 1`; position is `null` when `comparisons_count === 0` but such shows still occupy slots in the ordering, so `total` and positions include never-compared shows. **[V]**
- `MyShowsView` re-sorts the *filtered* subset by elo for best/worst modes, so on-screen ordering and the badge's global position can disagree. **[V]**
- Festival children: `useFestivalClaim` / `QuickAddSheet` create a parent `show` plus one child `set` per artist via `parent_show_id`. `Rank.tsx` does **not** exclude children, so children rank inside the `set` pool while the parent ranks in the `show` pool, and both appear in the global position list. **[V]** — verify whether that is desired.

### 1.7 Progress, confidence, completion **[V]**

- `ConfirmationRing` percentage (`Rank.tsx::calculateGlobalConfirmation`): `Σ min(comparisons_count, 10) / (poolShows.length · 10) · 100`, pool-scoped. Ties count toward it.
- `RankingProgressBar` general mode: `comparisons / max(15, totalShows·2.5)`, capped at 100.
- `RankingProgressBar` focused mode: `completedCount / targetCount`, where completed = shows with `comparisons_count >= 3`.
- Stopping: `selectSmartPair → null`. Main H2H shows "All ranked!", fires confetti, and toasts "That's all for now!" — note the toast fires on **every** choice in `getNextPair`, including when a next pair exists **[V, `Rank.tsx::getNextPair`]**. Focused session confettis, toasts "Rankings locked in!", and calls `onComplete()` after 1.5 s.

### 1.8 Surface-by-surface differences **[V]**

| Surface | File | K | Pool filter | Tie/skip | Undo | Error handling |
| --- | --- | --- | --- | --- | --- | --- |
| Main H2H | `Rank.tsx` | adaptive | yes | both controls | yes, 1 level | awaited, toasts on failure |
| Focused session | `FocusedRankingSession.tsx` | adaptive | **no** | tie only | no | awaited, toasts |
| Home VS widget | `useVSHeroPair.ts` | adaptive | yes | skip only, no tie | no | **fire-and-forget `.then(() => {})`, failures silent** |
| Quick-add compare | `QuickCompareStep.tsx` | **fixed 32** | no (any recent 20 shows) | skip = no write | no | swallows error and calls `onComplete()` |
| Demo | `DemoRank.tsx` | adaptive | n/a | n/a | n/a | local state only, no writes |

### 1.9 Failure, retry, concurrency **[V code reading, not runtime-tested]**

- **Interrupted save, main H2H:** comparison insert is awaited first; if the ELO upsert then fails, the comparison row survives with no score change and, because of `UNIQUE (user_id, show1_id, show2_id)`, **the pair can never be retried** — the ELO effect is lost permanently.
- **Retry / duplicate tap:** `comparing` guard plus a 400 ms animation await blocks double taps within a session. A retry after an error hits the unique constraint and fails again with "Failed to save comparison".
- **Home VS widget:** insert and upsert are not awaited and errors are discarded, so local UI advances even when nothing was persisted.
- **Simultaneous sessions** (e.g. home widget and Rank tab both mounted): each holds its own snapshot and upserts **absolute** `elo_score` / `comparisons_count`. Last write wins; the other session's increment is silently lost.
- **Stale-state bug, main H2H:** `handleChoice` ends with `getNextPair(shows, rankings, …)` using the **pre-update** `rankings`, so the next pair is chosen from stale scores. `FocusedRankingSession` correctly passes `updatedRankings`. **[V]**
- `QuickCompareStep` upsert omits `id` when no ranking row exists; Supabase upsert conflicts on the primary key, so a concurrent insert of the same `(user_id, show_id)` would raise a unique violation rather than merge. **[I from code + verified constraint]**

### 1.10 Requested vs implementation-chosen **[D / I]**

- **Requested (conversation evidence, summary-level):** head-to-head ranking as the core loop; ELO; rankings as an evolving list; the multi-artist auto-upgrade rule ("adding multiple artists to a Set reclassifies it as a Show to keep ELO comparisons fair"); silent duplicate auto-skip on bulk import.
- **Implementation choices with no requirement I can cite:** 1200 start, K=32/K_MIN=10, the 400/200/300 magic numbers in pairing, BFS depth 3, top-5/top-3 randomisation, `min(c,10)` confidence formula, `max(15, n·2.5)` progress target, pool-scoped pairing with auto-selected pool, one-comparison-per-pair-forever, auto-insert of ranking rows on screen entry, and the four duplicated ELO implementations.
- The full verbatim conversation is not in my window; treat these attributions as best-effort and re-check the chat log if a rule matters legally or product-wise.

---

## 2. Other mechanics worth preserving

**Identity, grouping, duplicates [V]**
- `shows.show_type CHECK IN ('set','show','festival')`; `parent_show_id` self-FK `ON DELETE SET NULL`.
- Multi-artist "set" is auto-upgraded to "show"; multi-artist events create a parent container plus one child `set` per artist **[V `QuickAddSheet`, `useFestivalClaim`; D memory note]**.
- Duplicate detection is **client-side only and inconsistent**: bulk/text/festival paths key on `${show_date}|${venue_name}|${artists}` and silently skip; `QuickAddSheet` matches artist+venue+date and warns "You already have this show in your Scene!". There is **no DB uniqueness on `shows`**, so any path that skips the check will create duplicates. Duplicate shows each get their own ranking row and inflate stats.
- `show_artists.is_b2b`, `artist_id`, `spotify_artist_id` exist; b2b handling lives in `src/lib/b2b-utils.ts`.

**Dates [V]**
- `shows.show_date date` + `date_precision text`, no CHECK constraint. Values in use: `exact`, `approximate` (month+year), `unknown` (year only), and `month` (written only by `useFestivalClaim`). "Unknown" is not a null date — a real date is stored and only the precision flag tells you not to trust the day. Any migration that formats `show_date` without reading `date_precision` will invent precision the user never gave.

**Photos, venues, imports [V, source-level]**
- EXIF via `exifreader` in `src/lib/exif-utils.ts` (`DateTimeOriginal` → `CreateDate` → `DateTime` fallback chain, `YYYY:MM:DD hh:mm:ss` parse) plus GPS → venue matching through the `match-venue-from-location` function.
- Text import (`useTextImportUpload`), email import (`receive-email` + `pending_email_imports`), lineup photo parsing (`parse-lineup-photo`), festival scraping (`scrape-festival-lineup`), notes parsing (`parse-show-notes`) are all AI/edge-function dependent — each is a network dependency a native client must reimplement as a call, not as local logic.
- Storage: `show-photos`, `bug-screenshots`, `email-assets` buckets, all **public**, no size limit set; per-user write policies keyed on `(storage.foldername(name))[1] = auth.uid()` — the first path segment must be the user id or uploads are rejected **[V live]**.

**Memories, tags, sharing [V]**
- `shows.notes` has `CHECK (char_length(notes) <= 500)` — enforce in the client or inserts fail.
- Ratings: `rating`, `artist_performance`, `sound`, `lighting`, `crowd`, `venue_vibe`, each `CHECK 1..5`. Ratings are **not** part of ELO.
- `show_tags(show_id, tag, category)`; `PhotoOverlayEditor` composes share images client-side; share previews are served by security-definer RPCs (`get_show_invite_preview`, `get_upcoming_show_invite_preview`, `get_festival_invite`) so unauthenticated link recipients can see a card without RLS exposure. Those RPCs are the sharing contract — reimplementing sharing without them will either break links or leak rows.

**Social [V]**
- `followers` (self-referential follow rows), `get_mutual_followers`, `referrals` + `profiles.referral_code` auto-generated by trigger `set_profile_referral_code` / `generate_referral_code`, `get_referral_rank`. `CompareShowSheet` clones a friend's show into your account and then inserts a `followers` row — "I was there" creates a follow as a side effect.

**Feeds, discovery, planning [V]**
- `upcoming_shows` exists live with 4 RLS policies but is **absent from `src/integrations/supabase/types.ts`**, so `usePlanUpcomingShow` calls it via `.from("upcoming_shows" as any)`. Regenerating types is a prerequisite for a typed native client.
- `edmtrain_events` cache + `get_discover_upcoming_near_me` / `get_edmtrain_event_preview` RPCs; `trg_sync_edmtrain_artists` copies lineup artists into the canonical `artists` table on insert/update.
- Home city fallback and city normalisation live in `src/lib/location-utils.ts` (US state abbreviation mapping, zip/street stripping) — city counts on the globe depend on it. **[D: added specifically to fix a tester's "3 cities" bug.]**

**Auth, onboarding, admin [V]**
- `handle_new_user()` trigger on `auth.users` populates `profiles` from signup metadata (full name, username); `profiles.username` is `UNIQUE`. Signup collects both, with live availability checking.
- Onboarding state is split across `profiles.onboarding_step` / `onboarding_completed_at` / `pwa_installed` **and** several `localStorage` keys (`scene_quests_celebrated`, `pwa-nudge-dismissed`, and quest/tour flags). Anything in `localStorage` does not migrate to a native app and will re-fire.
- Quest refresh is driven by a custom `window` event `scene_refetch_quests` **[V]** — an implicit, easily-lost contract between `DashboardSheets`/`Dashboard` and `useSetupQuests`.
- Roles: `user_roles` + `has_role(uuid, app_role)` security-definer; admin surfaces gate on it. Never move roles onto `profiles`.
- `Rank.tsx` contains a **debug state switcher** rendered only on localhost/preview hostnames **[V]** — hostname-based, so it must be replaced by a build flag in RN.

---

## 3. Backend and configuration not fully in Git

**Verified live**
- Triggers: `on_auth_user_created` (auth.users → `handle_new_user`), `set_profile_referral_code`, `standardize_event_name_trigger`, `trg_normalize_festival_event_name`, `trg_sync_edmtrain_artists`, and `update_updated_at_column` on 10 tables.
- Security-definer RPCs: `has_role`, `handle_new_user`, `crowdsource_festival_lineup`, `get_discover_upcoming_near_me`, `get_edmtrain_event_preview`, `get_mutual_followers`, `get_referral_rank`, `get_show_invite_preview`, `get_upcoming_show_invite_preview`, `sync_edmtrain_artists_to_canonical`.
- Extensions in use: `pg_trgm` (fuzzy artist/venue search), `pg_net` + `pg_cron`.
- **Scheduled job:** `backfill-artist-images-every-6h`, `0 */6 * * *`, posts to the `backfill-artist-images` edge function with a bearer token embedded in the cron command. This job exists only in the live DB unless a migration created it — check `supabase/migrations` before assuming Git has it.
- RLS enabled with policies on all 32 public tables (`shows` 6, `show_rankings` 6, `show_comparisons` 5, `profiles` 6, …).
- Storage policies as listed in §2.
- Constraints most likely to bite a rewrite: `show_comparisons` `show1_id < show2_id` and `UNIQUE(user_id, show1_id, show2_id)`; `show_rankings UNIQUE(user_id, show_id)`; `shows.notes <= 500`; the 1..5 rating checks; `show_type` CHECK; `profiles.username`/`referral_code` UNIQUE.

**Migration-file intent vs live, and likely repo gaps**
- `supabase/config.toml` declares `verify_jwt` for 20 functions, but the repo contains function directories **not listed there**: `batch-artist-images`, `broadcast-push-notification`, `fetch-edmtrain`, `get-festival-invite`, `search-places`, `spotify-auth-url`. Those default to JWT-verified. I did not enumerate deployed functions, so **[?]** whether the deployed set matches the repo.
- `config.toml` also sets `auth.email.enable_confirmations = false`, `enable_signup = true`, `double_confirm_changes = true`, OTP 6 digits / 3600 s. Live auth settings, OAuth providers, and redirect allow-lists were **not** read this session — verify before shipping a native redirect scheme. **[?]**
- `src/integrations/supabase/types.ts` is out of date relative to the live schema (`upcoming_shows` missing).

**Configuration variable names required (purpose only, no values)**
`SPOTIFY_CLIENT_ID` / `SPOTIFY_CLIENT_SECRET` / `VITE_SPOTIFY_CLIENT_ID` (artist search, taste sync, PKCE), `MAPBOX_API_KEY` (geocoding, globe/map), `GOOGLE_PLACES_API_KEY` + `FOURSQUARE_API_KEY` (venue search), `EDMTRAIN_API_KEY` + `BANDSINTOWN_API_KEY` + `JAMBASE_API_KEY` (event discovery), `FIRECRAWL_API_KEY` (festival lineup scraping, connector-managed), `RESEND_API_KEY` (transactional/auth email), `EMAIL_WEBHOOK_SECRET` (inbound email import auth), `VAPID_PRIVATE_KEY` + `VAPID_SUBJECT` (web push — **web push does not carry over to native; iOS/Android need APNs/FCM**), `LOVABLE_API_KEY` (AI gateway used by the parsing functions). Plus client `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` / `VITE_SUPABASE_PROJECT_ID`.

---

## 4. Unfinished work and history

**Known defects (all [V] in current source)**
1. Fixed K=32 in `QuickCompareStep` vs adaptive K everywhere else.
2. "Too tough" increments `comparisons_count` (and therefore confidence %) while contributing no ordering information; it is also excluded from the transitive graph, so it consumes a pair permanently for nothing.
3. Stale `rankings` passed to `getNextPair` in `Rank.tsx::handleChoice`.
4. `"That's all for now! Your rankings are up to date"` toast fires after every comparison, not only at completion.
5. Fire-and-forget writes in `useVSHeroPair` — silent data loss.
6. Absolute-value ELO upserts → lost updates across concurrent surfaces.
7. `UNIQUE(user_id, show1_id, show2_id)` makes a failed comparison unretryable and makes "change my mind" impossible.
8. Global rank position ignores `show_type` pools and filters, while pair selection respects pools — the two disagree.
9. Festival child sets rank against ordinary sets; parent shows also rank. Unresolved by design.
10. `areRankingsComplete` is dead code; four copies of `calculateElo` exist.
11. Dev-only debug bar in `Rank.tsx` gated by hostname string matching.
12. Types file drift (`upcoming_shows` typed as `any`).

**Reversed / historical decisions [D, conversation summary]**
- Add-show flow: Dialog → Drawer → Sheet → **back to Dialog styled as a bottom sheet**, because the drawer rendered with no height. Do not re-derive the drawer attempt; the RN version should just be a real bottom sheet.
- Set/Show/Festival picker simplified after tester confusion (Deema) to "An Artist" / "A Festival" with `show_type` inferred from whether additional artists are added; step order Type → Search → AdditionalArtists → EventName → Venue → Date → Rating → Success. "Openers" was explicitly renamed "additional artists".
- Music-taste badges ("Techno purist", "Genre fluid") were **deliberately removed** pending rethink. Do not resurrect.
- Quest-completion confetti moved from `sessionStorage` to `localStorage` (it was firing on every app open).
- SMS/phone OTP auth was scoped and **deferred** — no Twilio credentials configured.
- Google OAuth, an "engagement pulse" analytics tab, and auth loading-state polish were still open on the beta checklist. See `.lovable/beta-onboarding-audit.md`, `.lovable/pre-launch-fixes.md`, `.lovable/sprint-1-tasks.md` for the fuller list.

**UI promises vs reality**
- The confirmation ring reads as "how settled your list is" but is only a capped comparison count; a user can reach 100% via ties alone.
- "All ranked!" means "no pair currently scores above the transitivity/compared filters", not "fully ordered".
- Skip vs Too tough look like siblings; only one writes to the database.

---

## Closing

**Preserve exactly**
- 1200 start, adaptive K (32 base, ramp below 10 comparisons), 400-point logistic, integer rounding.
- Canonical pair ordering (`show1_id < show2_id`) and the two uniqueness constraints, or historical data stops loading.
- Transitive-implication pruning at BFS depth 3 and the pair-scoring weights — these define how many swipes users expect.
- Pool-scoped pairing (`set`/`show`/`festival`) and the multi-artist "set → show" auto-upgrade with `parent_show_id` children.
- `date_precision` semantics; `notes <= 500`; 1..5 rating checks.
- The security-definer preview RPCs for shares/invites; storage paths prefixed with the user id.
- Ties recorded as `winner_id = null` (whatever you decide about the count side effect, the null encoding is load-bearing for existing rows).

**Needs your decision**
1. Should quick-add use the adaptive K like everywhere else? (This changes scores, so it is a product call.)
2. Should "Too tough" still increment `comparisons_count` and confidence?
3. Should a pair ever be re-judgeable (drop/relax the unique constraint) so tastes can change?
4. Should displayed rank position be global or per pool, and should it respect the active filter?
5. Should festival child sets and their parent both compete, or should children be excluded from `set` ranking?
6. Should skips be recorded at all (e.g. a `skipped` flag) so they can be de-prioritised across sessions?
7. Native push: APNs/FCM replacement for the current VAPID web-push stack.
8. Should ELO move server-side (RPC with atomic increments) to end the lost-update and silent-failure classes?

**Do not copy**
Defects 3, 4, 5, 6, 10, 11, 12 above are straightforwardly wrong rather than debatable. Also do not carry over `localStorage`-based onboarding/celebration state or the `scene_refetch_quests` window-event contract.

**I cannot answer from available evidence**
- Live auth provider list, redirect allow-list, email sending domain, and whether `enable_confirmations` matches `config.toml`.
- Which edge functions are actually deployed and at what version, versus what the repo contains.
- Whether the `pg_cron` backfill job has a corresponding migration file.
- Whether any hotfix was applied through Lovable without a migration (needs a migration-vs-live diff).
- Original intent behind the pairing magic numbers and the fixed-K quick-add path — the verbatim chat log may contain it; my window does not.
- Real-world swipe counts and whether the claimed 40–60% reduction holds.

Nothing here should be read as production-readiness, and I have not proposed a replacement architecture.
