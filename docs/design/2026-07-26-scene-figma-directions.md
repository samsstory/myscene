# Scene Figma-Ready Visual Directions

**Status:** Ready for design-lab setup
**Recommendation:** Territory A, **Afterimage + Personal Canon**
**Core line:** *What stays with you, put in order.*

## Locked alpha visual direction, July 27

The alpha baseline is the **Electric Canon** expression of Territory A, as shown in the selected invite, My Scene, and #1 reveal mockup.

- Near-black environments make concert photography luminous.
- Warm ivory editorial serif carries emotional statements and show names.
- Clean sans-serif handles every operational detail.
- Acid chartreuse is reserved for the number-one rank, a decisive CTA, and a single active state.
- Rust-orange image light is emotional evidence, not a background treatment.
- My Scene is an ordered, image-led collection. It is not a graph, dashboard, or feed.
- Sharing may become graphic and dramatic, while the everyday app remains calm.

Constellation is a promising future concept for shared-history, comparison, and pattern-reveal moments. It is **not an alpha system requirement** and must not appear in the core collection, onboarding, or ranking UI until it has been separately designed and validated.

## Design-system premise

Scene has two visual volumes sharing the same underlying system:

- **Core UI:** quiet, precise, editorial. It makes a growing collection feel trustworthy and easy to return to.
- **Broadcast UI:** bold, cinematic, personal. It makes a reveal or comparison feel worth sending somewhere else.

The signature is not a gradient. It is **the afterimage**: a controlled field of color that appears behind an image or rank only when a memory has earned emphasis.

The Mobbin reference pass sharpened three implementation calls: first-show creation happens before any friend ask; rank capture is one required choice followed by optional memory depth; and a Top 10 broadcast is a three-frame story sequence, not a compressed app screenshot.

## Figma foundations

### Type

Use a two-family system in the first design lab:

| Role | Suggested face | Weight | Figma token |
| --- | --- | --- | --- |
| Display / rank | Instrument Serif or a similarly high-contrast editorial serif | Regular | `Type/Display` |
| UI / metadata | Inter Tight or Geist | Medium, Semibold | `Type/UI` |
| Numeric rank | Inter Tight tabular figures | Semibold | `Type/Rank` |

The serif appears sparingly: a hero show title, a prompt, a milestone headline. The sans does all operational work. If the serif does not improve a screen, remove it.

| Token | Size / line | Use |
| --- | --- | --- |
| `Display/01` | 52 / 52 | Top 10 reveal, #1 show |
| `Display/02` | 34 / 36 | Profile hero, prompts |
| `Title/01` | 24 / 28 | Section titles |
| `Title/02` | 18 / 22 | Show cards |
| `Body/01` | 16 / 22 | Prompts, notes |
| `Meta/01` | 13 / 16 | Date, venue, city |
| `Label/01` | 11 / 14, 0.08em tracking | Tags and controlled labels |

### Color

Use one base field, one warm rank color, and a contextual afterimage color. Do not show all accents on the same screen.

| Token | Value | Use |
| --- | --- | --- |
| `Color/Ink` | `#10100F` | Main background |
| `Color/Surface` | `#1A1A18` | Raised cards / sheets |
| `Color/Line` | `#34332F` | Hairlines and dividers |
| `Color/Cloud` | `#F1EEE6` | Primary text |
| `Color/Stone` | `#AAA69A` | Secondary metadata |
| `Color/Signal` | `#E7FF59` | Rank, selected state, one decisive CTA |
| `Color/Afterimage/Rust` | `#E6552D` | Memory residue on warm imagery |
| `Color/Afterimage/Cobalt` | `#566BFF` | Memory residue on cool imagery |
| `Color/Afterimage/Lilac` | `#B692FF` | Milestone or shared-taste moments |

Afterimage colors are 12 to 28% opacity in core UI. Broadcast surfaces may use them at full intensity. Never use more than one afterimage family plus `Signal` in a single composition.

### Spacing, shape, and elevation

- Base unit: 4 px.
- Mobile content gutters: 20 px.
- Standard vertical rhythm: 12 / 16 / 24 / 32 / 48 px.
- Card radius: 16 px. Image radius: 12 px. Pills only for filters and short facts.
- Borders: 1 px `Color/Line` at 65% opacity.
- No frosted glass. No default shadows. Use a darker field and a hairline to create depth.

### Image treatment

- Use 4:5 for show imagery in collection, 9:16 for broadcast, 1:1 only for compact identity moments.
- `cover` crop with a quiet bottom gradient only when metadata needs legibility.
- Image can have a 4 px afterimage offset behind it in milestones, never on every card.
- User photos are evidence, not decoration. Let them be imperfect.

## Core components to build first

1. **Show Row / Ranked**: rank, 4:5 image, artist, venue, date, tiny movement marker.
2. **Show Card / Memory**: photo, title, date, personal note or companion, optional rank.
3. **Rank Marker**: `#01` through `#10`, using tabular numerals. A star is reserved for the current #1 only.
4. **Collection Stat**: one large number plus a precise label. No dashboard tiles.
5. **Prompt Card**: question, optional answer state, one action.
6. **Comparison Rail**: two names at either end and one shared/disputed show in the middle.
7. **Afterimage Field**: absolute color layer behind a meaningful image or numeral, available in `Rust`, `Cobalt`, and `Lilac` variants.
8. **Broadcast Frame / Story**: safe-area-aware 9:16 container with Scene signature in the lower 12%.

## The design-lab screen set

Design all ten screens in this territory before selecting a final system.

| Screen | Primary state | Required visual proof |
| --- | --- | --- |
| 1. Invitation | "Start with a night you still think about" | A clear first action without account friction. |
| 2. Show search | Search result selected | Fast, dense, calm object creation. |
| 3. Memory capture | Photo / note optional | Ownership without scrapbook clutter. |
| 4. First collection | 1 to 3 shows | Momentum before the Top 10 exists. |
| 5. Rank decision | Pairwise comparison | Tension through two strong objects, not gamified chrome. |
| 6. Profile | Top 10 and archive total | Authored identity in three seconds. |
| 7. Collection | Long ranked list | Editorial hierarchy and easy scanning. |
| 8. Friend comparison | Shared shows plus biggest disagreement | Intimacy, symmetry, a next conversation. Invite a friend only after the collection has value. |
| 9. #1 reveal | First number-one settles | A single earned explosion of light and type. |
| 10. Top 10 share | 9:16 Story card | Instant legibility and a response hook. |

## Key transition: rank settles

Use this as the signature Scene interaction.

1. Two show cards occupy equal visual weight.
2. The selected show moves upward by 24 px. The other recedes by 8 px and dims slightly.
3. A restrained afterimage remains in the selected card's former position for 180 ms.
4. The final rank resolves as a tabular numeral, then the collection list closes the gap.
5. One light haptic on selection, one softer confirmation haptic when the ranking settles.

Duration: 220 to 320 ms. Respect Reduce Motion by using opacity and instant position changes only.

## Broadcast direction: Top 10 share

Build this as an intentional three-frame Story set. Each frame exports independently, but the set should read as a reveal when posted in sequence.

1. **Identity frame:** `SAM'S SCENE / 2026` and total shows or defining line.
2. **Canon frame:** the #1 show, image, rank, and personal memory line.
3. **Connection frame:** a shared-show or biggest-ranking-split prompt, followed by `Compare yours`.

**Layout**

- Top 8%: `SAM'S SCENE / 2026` in `Label/01`.
- Middle 62%: oversized `TOP 10` or `#01`, a cropped artist image, and a five-to-eight-word personal line.
- Bottom 18%: rank list snippet or shared-show fact.
- Bottom 12%: tiny Scene wordmark and a direct hook: `Compare yours`.

**Example content shape**

> #01
> FRED AGAIN.. AT THE SHRINE
> "The night I stopped standing still."
> My Scene, 2026

Do not use a generic CTA button on the share. Let the whole card imply the tap-through. The deep link can supply the action later.

## Territory B and C: controlled alternates

These need one lightweight frame each, not a full system yet.

| Territory | Keep | Change | Test with |
| --- | --- | --- | --- |
| B: Living Archive + Resonance | Editorial type, clean metadata, ranked list | Replace afterimage with subtle layers, paper-like depth, and alignment/interference in comparison | Friend comparison and archive view |
| C: Trace + Keepsake | Image evidence, personal line, shared history | Add spatial trace and intimate artifact layers, while retaining the canon as the structural spine | Memory capture and city/year recap |

## Accessibility acceptance criteria

- All core text meets 4.5:1 contrast against its final surface.
- Rank does not rely on `Signal` alone. Use position and numerals.
- Every motion reveal has a static equivalent.
- Photo overlays maintain readable type over both light and dark source images.
- Broadcast artifacts remain understandable without color or sound.

## Figma file structure

```
00 Foundations
  Color / Type / Spacing / Effects
01 Components
  Show / Rank / Prompt / Compare / Broadcast
02 Core flows
  Onboarding / Collection / Ranking / Profile / Comparison
03 Broadcast
  #1 / Top 10 / Shared show / Scene Match
04 Territory alternates
  B Living Archive / C Trace + Keepsake
05 Prototype
  Rank settles / #1 reveal
```

## Decision gate

Select Territory A only if it wins at all three of these moments:

1. A first-time user can understand the invitation in one second.
2. A profile feels like a real person's musical history, not an event database.
3. The Top 10 share would look native in a tasteful dance-music fan's Story without explanation.
