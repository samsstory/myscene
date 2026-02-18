
## Redesign the Scene Email Template

### What's changing and why

Right now, both the approval and resend emails use either a plain white layout with basic HTML, or a raw text body wrapped in a generic `wrapInHtmlEmail()` function. The goal is to replace both with a polished, on-brand dark HTML email that matches Scene's aesthetic — dark background, the SCENE ✦ wordmark, cyan/indigo accents, and clean typography — applied consistently every time an email is sent, regardless of whether a custom body is used or not.

### Scope of changes

**3 files** need to be updated:

---

#### 1. `supabase/functions/approve-waitlist/index.ts`
Replace `buildWelcomeHtml()` and `wrapInHtmlEmail()` with a single shared `buildSceneEmail()` function that outputs the branded HTML shell. The function will accept:
- `heading` — e.g. "You're in 🎶"
- `bodyHtml` — the inner content (credentials block, CTA button, footnote)

The branded shell will include:
- Dark background (`#0d0d12`) with a subtle radial gradient from indigo/cyan at the top
- Centered "SCENE ✦" wordmark in white with letter-spacing, styled inline (email-safe)
- A thin horizontal rule separator
- A white content card area with the message body
- A prominent indigo CTA button (`#6366f1`) for the login link
- Credentials displayed in a monospace code-block style card
- Footer with `tryscene.app` and a small legal-style disclaimer

---

#### 2. `supabase/functions/resend-notification/index.ts`
Same treatment — replace the plain `DEFAULT_HTML` and `wrapInHtmlEmail()` with the same `buildSceneEmail()` branded shell. The resend variant will omit the credentials block and show a simpler "Your access is ready" message with just the CTA button.

---

#### 3. `src/components/admin/EmailTemplateEditor.tsx`
- Update the default body text constants (`DEFAULT_APPROVE_BODY`, `DEFAULT_RESEND_BODY`) to reflect cleaner copy that works well inside the new branded wrapper
- Add a note in the UI making it clear that the body text they write is wrapped inside the branded Scene email shell automatically — so they only need to edit the message text, not worry about HTML styling

---

### Visual design of the email

```text
┌─────────────────────────────────┐
│  [dark bg: #0d0d12 + gradient]  │
│                                 │
│     SCENE ✦                     │  ← centered wordmark, white
│   ─────────────────────────     │  ← hairline separator
│                                 │
│  [white content card]           │
│                                 │
│  You're in 🎶                   │  ← heading
│  Your beta access is ready...   │  ← body copy
│                                 │
│  ┌──────────────────────────┐   │
│  │  Email: user@email.com   │   │  ← credential card (approve only)
│  │  Password: Abc123!       │   │
│  └──────────────────────────┘   │
│                                 │
│       [ Log in to Scene → ]     │  ← indigo CTA button
│                                 │
│  Change password after login.   │  ← footnote
│                                 │
│  tryscene.app                   │  ← footer
└─────────────────────────────────┘
```

---

### Technical notes
- All styles are inline (required for email client compatibility — Gmail strips `<style>` tags)
- The gradient uses a `background-image: linear-gradient(...)` on the outer wrapper — broadly supported
- No images are embedded in the email itself (avoids spam filtering)
- The SCENE ✦ wordmark is rendered as styled text, not an image, so it works in all email clients
- Custom body text entered in the admin template editor will still be rendered inside this shell, so admins keep control over the message copy while the visual design stays consistent

