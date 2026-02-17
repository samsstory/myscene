
# Scene Social Features — Friend Connection Layer

## Vision
Add a social layer that feels native to Scene's DNA — passive, intimate, debate-sparking. Not a social network; a shared concert memory system.

## Priority Features

### Phase 1: Foundation
#### 1. Friend Connections Data Model
- `friendships` table (requester_id, addressee_id, status: pending/accepted/blocked)
- Invite flow via unique link or username search
- Friend list on Profile page

### Phase 2: Passive Social (Zero-Effort Features)
#### 2. "Were You There?" — Mutual Show Badges
- Detect when friends attended the same show (matching venue + date within 1-day window)
- Glowing badge on show cards indicating mutual attendance
- Tap to see which friends were there

#### 3. Shared Memory Wall
- On friend profile view, show only co-attended shows
- Combined photos from both perspectives
- Nostalgia-driven engagement

### Phase 3: Discovery & Compatibility
#### 4. Taste Overlap Score
- Single compatibility percentage on friend profiles
- Computed from shared artists, genres, venues
- Shareable card (like Spotify Blend)

#### 5. Lightweight Friend Activity Feed
- Subtle "Recently" section on Home: "Sarah saw Bicep at Printworks · 2d ago"
- Tap to view their show card (read-only)
- Not a full social feed — quiet FOMO engine

### Phase 4: Friendly Competition
#### 6. Head-to-Head Rankings
- Side-by-side comparison of your top shows vs. a friend's
- "You ranked Bicep #2. Jake ranked them #14."
- Leverages existing ELO system

#### 7. Show Count Streaks & Genre Diversity
- Who's going out more (monthly/yearly streaks)
- Who's more adventurous (genre diversity score)

### Phase 5: Coordination (Future)
#### 8. Upcoming Shows / Wish List
- Shared "want to see" artist lists
- Alerts when a friend is going to a show near you

## Design Principles
- **Passive-first**: Best features emerge from already-logged data
- **Intimate, not broadcast**: 1:1 and small group, not public feeds
- **Debate-sparking**: Rankings + friends = natural conversation
- **FOMO without toxicity**: Show experiences, not follower counts

## What to Avoid
- Public profiles / follower counts
- Comments / reactions (too generic)
- Notification spam (weekly digest > daily pings)

## Files Expected to Change
| Area | Changes |
|------|---------|
| Database | `friendships` table, RLS policies, friend-related queries |
| Edge Functions | Friend invite, taste overlap computation |
| Components | Friend profile view, mutual badges, activity feed |
| Home.tsx | Friend activity section |
| Profile.tsx | Friend list, invite link, taste overlap |
| StackedShowCard / HighlightReel | Mutual attendance badges |
