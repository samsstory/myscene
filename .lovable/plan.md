

## Analysis of the Suggested Code

The .eml extraction concept is correct, but this code has several issues that would break your existing working pipeline:

### Problems

1. **Wrong AI gateway** — Uses `GEMINI_API_KEY` with raw Google API (`generativelanguage.googleapis.com`). You don't have that secret configured. Your existing function correctly uses `LOVABLE_API_KEY` with `ai.gateway.lovable.dev` and tool-calling for structured output.

2. **Wrong database columns** — References `email_sender`, `email_body`, `raw_payload` which don't exist in `pending_email_imports`. Your table has `email_from`, `raw_content`, and no `raw_payload` column.

3. **Wrong status values** — Uses `pending_review` instead of your existing `pending`.

4. **Drops structured extraction** — Replaces your tool-calling approach (which returns typed `{artist, venue, date, confidence}` objects) with a raw JSON prompt that's less reliable.

5. **Selects `email` from profiles** — `profiles` table has no `email` column.

6. **Overwrites your working function entirely** — Instead of surgically adding .eml pre-processing.

### Recommended Plan

Surgically add .eml attachment extraction to your **existing** `receive-email/index.ts` — no rewrites:

1. **Add an `extractTextFromEml` helper** at the top of the file (simple MIME boundary parser, ~30 lines)
2. **Add a `decodeBase64` helper** (one-liner using `atob`)
3. **After parsing `textBody`/`htmlBody` from the Postmark payload**, loop through `payload.Attachments`, decode any `.eml` or `message/rfc822` attachments, extract their text, and append to `textBody` with `--- Forwarded Email ---` separators
4. **Everything else stays identical** — same Lovable AI gateway call, same tool-calling schema, same `pending_email_imports` insert, same profile validation

No database changes. No new secrets. No new columns.

