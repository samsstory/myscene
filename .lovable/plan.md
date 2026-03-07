

# Default Location for Cold-Start Users

When a new user hasn't set their home city yet, both "Upcoming Near You" and "Scene Charts" show empty states. The fix: fall back to Austin, TX coordinates when no profile location exists, and default Scene Charts to "country" scope.

---

## Changes

### 1. Add default location constants

**File:** `src/hooks/usePopularNearMe.ts`

Add constants at the top:
```ts
const DEFAULT_LAT = 30.2672;
const DEFAULT_LNG = -97.7431;
const DEFAULT_CITY = "Austin, Texas, United States";
```

In the `load()` function, after resolving `homeLat`/`homeLng` from profile and overrides, fall back to defaults if both are still null:
```ts
const finalLat = homeLat ?? DEFAULT_LAT;
const finalLng = homeLng ?? DEFAULT_LNG;
const finalCity = resolvedCity ?? DEFAULT_CITY;
```

Use `finalLat`/`finalLng`/`finalCity` for the rest of the function instead of early-returning on `!homeLat`. Always set `hasLocation(true)`.

### 2. Apply same default in EdmtrainDiscoveryFeed's hook

**File:** `src/hooks/useEdmtrainEvents.ts`

In `fetchEvents`, after checking the profile and finding no `home_latitude`/`home_longitude`, instead of `setEvents([]); return;`, fall back to Austin defaults:
```ts
lat = 30.2672;
lng = -97.7431;
cityStr = "Austin, Texas, United States";
```

### 3. Default Scene Charts to "country" scope

**File:** `src/components/home/SceneView.tsx`

In `TopRatedSection`, change initial `geoScope` state from `"city"` to `"country"`:
```ts
const [geoScope, setGeoScope] = useState<GeoScope>("country");
```

### 4. Default homeCity display for InlineCityPicker

**File:** `src/components/home/SceneView.tsx`

When `homeCity` is fetched from profile and is empty, set it to `"Austin, Texas, United States"` so the InlineCityPicker shows "Austin" instead of blank:
```ts
setHomeCity(data?.home_city || "Austin, Texas, United States");
```

---

## Summary

| File | Change |
|------|--------|
| `usePopularNearMe.ts` | Fall back to Austin coords when no profile location |
| `useEdmtrainEvents.ts` | Fall back to Austin coords when no profile location |
| `SceneView.tsx` | Default geoScope to "country", default display city to Austin |

No schema changes. No new files. Both sections will show real data for cold-start users immediately.

