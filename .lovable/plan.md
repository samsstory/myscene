

## Verification Result: Forwarding Address Copy Behavior

**Status: Correct as-is.**

- Line 159: `forwardingAddress = \`add+${userId}@tryscene.app\`` — uses full userId
- Line 125: `navigator.clipboard.writeText(address)` — copies the full `address` prop
- No truncation exists in the current code

**For the upcoming visual redesign:** The plan specifies truncated *display* (`add+{first8}...{last4}@tryscene.app`) but the `address` prop and clipboard copy will remain the full UUID. This is already how the plan is structured — display truncation is cosmetic only, the copy target stays unchanged.

No code changes needed.

