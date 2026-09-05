# Scene Reference Synthesis

**Status:** Screen-verified reference synthesis
**Date:** July 26, 2026
**Scope:** DICE, Airbuds, Retro, and Beli across onboarding, collection/profile, recap/sharing, and friend comparison

## Research note

This synthesis is based on the iOS reference screens and flows linked below, reviewed in Mobbin on July 26. The goal is not to reproduce any reference. It is to identify the behavioral and visual moves Scene should make its own.

## The useful split

| Reference | Product lesson | Scene translation | Do not borrow |
| --- | --- | --- | --- |
| DICE | Culture can feel current through hierarchy and restraint. | Make everyday collection screens direct, image-led, and editorial. Let a show title and date do real work. | Concert-brand spectacle as a default visual state. |
| Airbuds | Taste becomes social when it is easy to react to and compare. | Make profile facts and shared history conversational, not analytical. | A feed or a constantly updating social surface. |
| Retro | A memory share can be an artifact, not a screenshot. | Design 9:16 outputs as complete compositions with real photo and personal details. | Disposable scrapbook decoration or forced nostalgia. |
| Beli | Opinion earns value through an accumulating, ordered collection. | Make rank, movement, and shared taste visibly useful. | Restaurant-app conventions, score obsession, or generic map UI. |

## Observed reference patterns

### DICE: fast culture through hard hierarchy

DICE's location setup uses a large, compressed headline over a dark, diffuse image field and gives the user two immediate choices: current location or manual search. Its event search is deliberately utilitarian: a high-contrast search field, short category chips, recently viewed results, and dense result rows. Its event page lets the artwork own the screen while date, venue, genre, friend invitation, and purchase action remain unmistakably separate.

**Borrow:** large editorial prompts only at decisive moments; dense, boring-in-a-good-way search for the recurring utility job; artist artwork as the visual identity of an object.

**Avoid:** DICE's highly decorated onboarding background as an all-product treatment. Scene needs its expressive light to mean memory or rank, not onboarding decoration.

**Reference screens:** [location setup](https://mobbin.com/flows/e9d93fcf-a660-4ba8-a77c-c78aa86ea089), [event search](https://mobbin.com/flows/c36e7d8b-88bf-4e61-a190-f3429581cf4b), [event detail and invite](https://mobbin.com/screens/921dcce5-7582-4dff-b7d2-13c57c4b6553).

### Airbuds: social proof is a product surface

Airbuds makes the promise social before it makes it analytical: the opening screen says friends' music belongs on the home screen, then leads into music connection, identity setup, contacts, and an explicit invitation. Its recap is not a dashboard export. It is a vertical sequence with one large identity fact per screen, user and artist imagery, a bright accent word, and a persistent share action. The invite itself is designed as a complete 9:16 artifact with a profile card, QR code, and one clear action.

**Borrow:** recap as a paced series of one-fact cards; a profile and named friends as the protagonist; export-ready sharing as a first-class surface.

**Avoid:** gating Scene's early value on friend invites. Airbuds can do this because its central utility is live friend activity; Scene's first utility is personal memory and canon building.

**Reference screens:** [onboarding and friend unlock](https://mobbin.com/flows/9fab9c15-00c1-417f-8660-01201b6686a0), [weekly recap identity card](https://mobbin.com/screens/96203f53-4d68-45e2-92b6-3580ba61f7c7), [recap invitation](https://mobbin.com/screens/035d8ed2-fa5a-47d4-856c-3e9be39b2910), [shareable friend invite](https://mobbin.com/flows/2867c88f-d443-4145-b3a4-044dcb7b6664).

### Retro: the selection step is part of the artifact

Retro's recap creation begins with a simple time-range selector above a full-width photo grid. That makes creation feel like curating a memory rather than configuring a template. Its friend view is notably restrained: people, requests, and mutual connections are visible in a light editorial list, then the share sheet hands off to the native messaging surface with a prewritten link.

**Borrow:** make Scene's share preparation feel like choosing the evidence of a night or season, not filling out a form; use a time or collection filter as the first recap action; let native share channels do the distribution work.

**Avoid:** a scrapbook collage as the default share aesthetic. Retro's raw photo abundance is right for a camera-roll product, but Scene needs a more authored hierarchy around a show and its rank.

**Reference screens:** [recap creation](https://mobbin.com/screens/776338ac-ab4e-4bd8-953f-801a1374aa8b), [friend directory](https://mobbin.com/flows/fbdb6dd7-7240-4119-b62b-7ca2321b2bfb), [native message handoff](https://mobbin.com/flows/fbdb6dd7-7240-4119-b62b-7ca2321b2bfb).

### Beli: ranking earns its ceremony

Beli pairs a quick opinion choice with optional depth: companion, labels, notes, photos, date, and privacy all live below the first "how was it?" decision. It treats progress as a useful unlock: after a rank, the product explains what changed and asks for one more. Its profile expresses an enormous personal collection with two high-level counts, a taste-profile tab, a recent-activity stream, and a clear overlap view that begins with the shared objects rather than a compatibility score.

**Borrow:** make the first ranking action quick, then let memory metadata remain optional; reveal the reason a milestone matters; open Scene comparison on shared shows and the interesting disagreement.

**Avoid:** presenting every show as a numerical score. Scene's canon should be ordinal and narrative, not a review database.

**Reference screens:** [ranking entry and optional detail](https://mobbin.com/flows/08b43844-b0d6-4238-87ef-7a6c9bf07bbb), [ranking unlock](https://mobbin.com/flows/a1704846-8627-4e0a-8600-7aec0a93e8f6), [taste profile](https://mobbin.com/screens/e1aff3df-761d-4952-aa8c-04a02b6d69eb), [overlapping bookmarks](https://mobbin.com/screens/03ae6359-148f-4692-9448-0d764ab7b787).

## Flow synthesis

### 1. Onboarding: invitation before account

**Scene job:** Make the user feel that their history is worth collecting before asking for a commitment.

**Pattern to use**

- Begin with a personal premise: "What was the show that changed everything?"
- Let the user search, select, and save one show before authentication.
- Treat sign-in as preservation: "Save your Scene" rather than a gate to enter the app.
- Reveal a tiny object of value immediately: a first card, a first year, or a first comparison.

**Visual direction:** One full-bleed artist or venue image, an editorial prompt, and a single clear action. No carousel of product claims. No generic "welcome to Scene" screen.

**Observed decision:** DICE leads with personal relevance, then makes discovery operational. Scene should lead with personal relevance too, but its first action is a remembered show, not location.

### 2. Collection and profile: authored, not populated

**Scene job:** Turn a set of nights into a legible personal canon.

**Pattern to use**

- Put the user's Top 10 and a concise total at the center of profile identity.
- Use strong numbered entries, date and venue metadata, and image crops as evidence.
- Keep social proof secondary: shared attendance and comparison are invitations into the collection, not profile clutter.
- Use an empty and early-stage profile to create momentum, not shame: "3 shows saved. Your Top 10 starts here."

**Visual direction:** A calm black field, generous vertical rhythm, quiet metadata, and a single warm highlight for rank. Photos carry variability. The UI supplies order.

**Observed decision:** Beli's profile proves that a collection can be identity when it makes scale, recent movement, and taste facets easy to scan. Scene should use a Top 10, total shows, years/cities, and recent rank movement, not an activity feed as its center.

### 3. Recap and sharing: a self-contained artifact

**Scene job:** Make a milestone feel valuable enough to post, then easy for a friend to answer.

**Pattern to use**

- Build share cards natively for 9:16 from the beginning.
- Give each card one hero fact: Top 10, #1 show, shared night, or Scene Match.
- Use the user's actual photo where possible, but make the composition survive without one.
- Include a natural response hook: "Would this make yours?" or "We saw 8 of these together."

**Visual direction:** Broadcast mode gets larger type, richer color, intentional cropping, and a single signature graphic behavior. It should never look like a dark-mode screen placed in a Story frame.

**Observed decision:** Airbuds proves that a recap can be a sequence, not one static card. Scene should create a three-card Top 10 story: identity claim, #1 show, then a friend-comparison invitation.

### 4. Friend comparison: intimacy and productive disagreement

**Scene job:** Let two people see the overlap, then discover the interesting difference.

**Pattern to use**

- Start with a human fact: shared shows, favorite overlap, or "you put this 47 places higher."
- Give equal visual weight to both people. No winner state by default.
- Move from aggregate to specific: Match percentage, then shared Top 10 entries, then the biggest split.
- Make the next action personal: compare a specific show, invite a friend, or react to a difference.

**Visual direction:** Two collections come into alignment through position and typography. Avoid a dashboard of circular scores and charts.

**Observed decision:** Beli opens overlap as a list of shared objects with filters, while DICE presents friend invitation inside the meaningful event. Scene should use both: invite someone from a show, then show overlap as shared nights with one largest ranking split.

## Decisions already supported by the brief

1. **Guest-first first-show creation** is the right Scene onboarding bet. It lets the product demonstrate value before identity capture.
2. **Profile equals ranked collection**, not a social feed. Friends add interpretation and return motivation around it.
3. **Share is broadcast UI**, with a different visual volume from the core product.
4. **Comparison should create a specific conversation**, not reduce taste to a compatibility score.

## Decisions now resolved

- **Friend import:** after the first saved show or first rank, never as the entry gate.
- **Comparison opening:** shared nights first, followed by the largest ranking disagreement. A percentage may be secondary context, not the hero.
- **Top 10 export:** a three-card story sequence plus an optional single-card #1 share.
- **Archive format:** list-first for the ranked canon. A photo-led grid belongs to recap creation and memory browsing, not the core Top 10.
