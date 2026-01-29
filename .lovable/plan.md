

# SMS Waitlist Signup with Follow-up Questions

## Overview
Replace the "Join Waitlist" buttons with an inline phone number input that collects SMS-capable phone numbers, followed by optional quick-tap questions for marketing insights.

---

## User Flow

```text
Step 1: Phone Input
+-------------------------------------------------------+
| 🇺🇸 +1 ▼ | (555) 123-4567          | Get Early Access |
+-------------------------------------------------------+

Step 2: Success + Follow-up Questions (Optional)
+-------------------------------------------------------+
| ✓ You're in! We'll text you when Scene launches.     |
|                                                       |
| How did you hear about us? (optional)                 |
| [I was invited] [Instagram/TikTok] [Friend told me] [Other] |
|                                                       |
| How many shows do you go to per year?                 |
| [1-3] [4-10] [11-20] [20+]                           |
|                                                       |
|                              [Skip] [Done →]          |
+-------------------------------------------------------+
```

---

## Database Schema

### New Table: `waitlist`

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| phone_number | text | E.164 format (+15551234567), unique |
| country_code | text | Country code (US, GB, etc.) |
| source | text | Page location (hero, cta) |
| discovery_source | text | How they heard about Scene (nullable) |
| shows_per_year | text | Frequency bucket (nullable) |
| status | text | pending, notified, converted |
| created_at | timestamp | When they signed up |
| notified_at | timestamp | When launch SMS was sent |

### RLS Policy
- Public INSERT allowed (no auth required for signup)
- Public UPDATE allowed only for same phone_number (to add follow-up answers)
- No SELECT/DELETE from frontend

---

## Follow-up Questions

### Question 1: Discovery Source
**"How did you hear about us?"**

| Option | Value stored |
|--------|--------------|
| I was invited | `invited` |
| Instagram/TikTok | `social` |
| Friend told me | `friend` |
| Other | `other` |

### Question 2: Show Frequency
**"How many shows do you go to per year?"**

| Option | Value stored |
|--------|--------------|
| 1-3 | `1-3` |
| 4-10 | `4-10` |
| 11-20 | `11-20` |
| 20+ | `20+` |

---

## Component Structure

### New Components

| Component | Purpose |
|-----------|---------|
| `WaitlistPhoneInput.tsx` | Phone input with country selector |
| `WaitlistFollowUp.tsx` | Optional follow-up questions UI |
| `WaitlistSuccess.tsx` | Success state wrapper |

### Modified Files

| File | Changes |
|------|---------|
| `LandingHero.tsx` | Replace button with waitlist components |
| `LandingCTA.tsx` | Replace button with waitlist components |

---

## UI Design Details

### Phone Input State
- Country dropdown (US default, plus UK, CA, AU)
- Auto-formatting phone display
- Glassmorphism styling (bg-white/5, backdrop-blur)
- Primary "Get Early Access" button with glow

### Success + Questions State
- Checkmark animation with confetti burst
- "You're in!" confirmation message
- Pill-style buttons for answer options
- Single-select for each question
- Skip button to dismiss without answering
- Done button appears after any selection

### Visual Styling
- Answer pills: `bg-white/5 hover:bg-white/10 border-white/10`
- Selected pill: `bg-primary/20 border-primary/50 text-primary`
- Smooth transitions between states
- Matches Scene's dark glassmorphism aesthetic

---

## Technical Implementation

### State Management
```text
WaitlistPhoneInput
├── phone: string
├── countryCode: string
├── isSubmitting: boolean
├── isSuccess: boolean
└── waitlistId: string (for updates)

WaitlistFollowUp
├── discoverySource: string | null
├── showsPerYear: string | null
├── isUpdating: boolean
└── isDone: boolean
```

### Database Flow
1. User submits phone → INSERT into waitlist → return id
2. User answers questions → UPDATE waitlist WHERE id = returned_id
3. User skips → No update needed

---

## Phone Validation

- Format: Accept various formats, normalize to E.164
- Length: 10 digits for US (after country code)
- Duplicates: Check if phone exists, show "You're already on the list!"

---

## Success Animation Sequence

1. Button transforms to checkmark (scale animation)
2. Confetti burst from center
3. Success message fades in
4. Follow-up questions slide up after 500ms delay
5. Questions remain until Skip/Done or auto-dismiss after 10s

---

## Mobile Responsiveness

- Phone input stacks vertically on small screens
- Answer pills wrap to multiple rows
- Touch-friendly tap targets (min 44px)

---

## Summary

This implementation:
- Collects phone numbers with zero friction (no account needed)
- Gathers optional marketing insights without blocking signup
- Stores data ready for SMS campaigns via Twilio or marketing platforms
- Maintains Scene's premium dark aesthetic throughout
- Celebrates signup with confetti animation

