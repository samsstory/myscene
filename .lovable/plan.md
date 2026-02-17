

## Fix: Dashboard Stuck on Loading Screen

### Root Cause

There is a race condition between two auth mechanisms running simultaneously:

1. `onAuthStateChange` fires an `INITIAL_SESSION` event synchronously (often with a `null` session before the token refreshes)
2. This triggers `navigate("/auth")`, unmounting the component
3. The `isMounted` flag becomes `false`, so `setLoading(false)` in the `finally` block never executes
4. If the user navigates back to `/dashboard`, the cycle repeats

### Fix (single file: `src/pages/Dashboard.tsx`)

**Change 1: Ignore INITIAL_SESSION in the auth listener**

The `onAuthStateChange` callback should NOT handle navigation for the `INITIAL_SESSION` event -- that's the job of `initializeAuth`. Only react to subsequent events like `SIGNED_IN`, `SIGNED_OUT`, and `TOKEN_REFRESHED`.

```text
Before:
  onAuthStateChange((event, session) => {
    setSession(session);
    if (!session) navigate("/auth");        // <-- fires on INITIAL_SESSION too
    ...
  })

After:
  onAuthStateChange((event, session) => {
    if (event === "INITIAL_SESSION") return; // <-- skip; initializeAuth handles it
    setSession(session);
    if (event === "SIGNED_OUT") navigate("/auth");
    if (event === "SIGNED_IN") checkOnboarding(session.user.id);
  })
```

This prevents the premature navigation that unmounts the component before `initializeAuth` can finish.

**Change 2: Add a safety-valve timeout**

As a defensive measure, add a 10-second timeout that forces `setLoading(false)` if `initializeAuth` hasn't resolved (e.g., due to network issues). This ensures the user is never permanently stuck.

```text
useEffect(() => {
  const timeout = setTimeout(() => {
    if (isMounted) setLoading(false);   // safety valve
  }, 10000);

  // ... existing initializeAuth logic ...

  return () => {
    clearTimeout(timeout);
    isMounted = false;
    subscription.unsubscribe();
  };
}, [navigate]);
```

**Change 3: Remove the `navigate` dependency from useEffect**

`navigate` from React Router can create a new reference on re-renders, potentially re-running the entire effect. Use `useRef` to hold the navigate function instead, or simply remove it from the dependency array (it's stable in practice but the lint warning can be suppressed).

### Summary of Changes

| File | What changes |
|---|---|
| `src/pages/Dashboard.tsx` | Skip `INITIAL_SESSION` in auth listener; add 10s loading timeout; stabilize `navigate` dependency |

No database, migration, or new file changes needed.

