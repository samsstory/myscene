

## Confirmation: Plan Covers All Entry Points

The existing plan is correct and complete. `AddShowFlow` is a single component rendered once in `DashboardSheets.tsx`, controlled by `showAddDialog`. Every trigger — quest card, FAB "Log a Show", manual add, welcome carousel — sets the same `showAddDialog(true)` flag. Swapping the wrapper inside `AddShowFlow.tsx` from `Dialog`→`Drawer` will apply universally.

No changes to the plan are needed.

