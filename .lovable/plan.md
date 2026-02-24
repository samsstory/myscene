
# Admin Data Manager

Build a new "Data" tab in the admin dashboard with three sub-views (Venues, Shows, AI Suggestions) and a backend table to queue AI-detected data issues.

---

## 1. Database Migration

### New table: `data_suggestions`

Stores issues flagged by the AI enrichment agent (duplicates, missing metadata, naming inconsistencies) for admin review.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | default gen_random_uuid() |
| entity_type | text | 'venue', 'show', 'artist', 'event' |
| entity_id | uuid | nullable -- the record in question |
| suggestion_type | text | 'duplicate', 'missing_data', 'name_mismatch', 'merge', 'broken_hierarchy' |
| title | text | Short summary, e.g. "Possible duplicate venue" |
| details | jsonb | Structured payload (merge candidates, missing fields, etc.) |
| status | text | 'pending' / 'approved' / 'dismissed', default 'pending' |
| resolved_by | uuid | nullable, admin who acted |
| resolved_at | timestamptz | nullable |
| created_at | timestamptz | default now() |

RLS: admin-only read/update. No public access.

### Venues table update

Add admin UPDATE + DELETE policies so admins can edit and merge venues from the dashboard. Currently venues can only be inserted and read.

---

## 2. New Admin Components

### `src/components/admin/DataTab.tsx`
Top-level wrapper with three sub-tabs: **Venues**, **Shows**, **Suggestions**.

### `src/components/admin/data/VenuesBrowser.tsx`
- Search bar (filters by name, city, country)
- Table: Name, Location, City, Country, Lat/Lng, Show Count, Actions
- Stat pills: Total Venues, Missing Country, Missing Coords
- **Edit dialog**: inline or modal to update name, city, country, coordinates
- **Merge dialog**: select two venues, pick canonical one, reassign all shows from the other, then delete the duplicate
- Show count is derived by counting `shows` rows with matching `venue_id`

### `src/components/admin/data/ShowsBrowser.tsx`
- Search bar (filters by venue_name, event_name, artist names)
- Table: Artists, Venue, Event, Date, Type, User, Photo, Actions
- Stat pills: Total Shows, Missing Venue ID, Missing Location
- **Edit dialog**: update venue_name, venue_location, event_name, venue_id link
- Links to venue browser for quick cross-referencing

### `src/components/admin/data/SuggestionsQueue.tsx`
- List of pending AI suggestions with type badges
- Approve / Dismiss buttons per suggestion
- Details expandable (shows merge candidates, missing fields, etc.)
- Filter by type and status

---

## 3. Admin Page Changes

### `src/pages/Admin.tsx`
- Add "Data" tab to the existing tabs array (between "Inviters" and "Bugs")
- Import and render `DataTab` in the corresponding `TabsContent`

---

## 4. Backend Policies

### Venues
- New RLS policy: "Admins can update venues" -- `has_role(auth.uid(), 'admin')`
- New RLS policy: "Admins can delete venues" -- `has_role(auth.uid(), 'admin')`

### Shows
- New RLS policy: "Admins can update any show" -- `has_role(auth.uid(), 'admin')`

### data_suggestions
- SELECT: admin only
- INSERT: admin only (and later, edge functions via service role)
- UPDATE: admin only
- DELETE: admin only

---

## Technical Notes

- Venue merge logic: update all `shows.venue_id` and `user_venues.venue_id` from duplicate to canonical, then delete the duplicate venue record
- Show count per venue uses a subquery or separate count query to avoid N+1
- Search uses `ilike` for simplicity; the existing `pg_trgm` extension is available for fuzzy matching later
- All admin queries go through the standard client with the logged-in admin's session (RLS handles authorization)
- The suggestions queue table is designed to be populated by the real-time AI enrichment agent (built next)
