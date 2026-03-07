## Redesign EmailImportScreen — Compact Two-Card Layout

### Structure (top to bottom)

```
┌──────────────────────────────────┐
│  Import from Email               │
│  Forward confirmations from any  │
│  inbox. We extract the shows.    │
│                                  │
│  [🔍 Search] ─ [✓ Select] ─ [➤ Send]
│                                  │
│ ┌──────────────────────────────┐ │
│ │ Card 1: Find your tickets    │ │
│ │ Copy & search in any app:    │ │
│ │ ┌──────────────────────────┐ │ │
│ │ │ from:ticketmaster.com OR │ │ │
│ │ │ from:dice.fm OR ...      │ │ │
│ │ └──────────────────────────┘ │ │
│ │ [📋 Copy Search]  (glass)    │ │
│ │ [Gmail] [Outlook] [iCloud]   │ │
│ │        [Yahoo]               │ │
│ └──────────────────────────────┘ │
│                                  │
│ ┌──────────────────────────────┐ │
│ │ Card 2: Forward to Scene     │ │
│ │ Select all results, then     │ │
│ │ paste this in the To: field: │ │
│ │   abc123@add.tryscene.app    │ │
│ │ [📋 Copy Address]  (primary) │ │
│ │ 💡 Gmail: "Forward as        │ │
│ │    attachment" for bulk       │ │
│ └──────────────────────────────┘ │
│                                  │
│ ✓ Send everything—we filter out  │
│   non-shows automatically        │
│ Can't find emails? Add manually → │
└──────────────────────────────────┘
```

### Key decisions
- **No platform branching** — remove `isMobile` detection. Copy-first works universally.
- **Provider pills**: Gmail (`buildGmailUrl(0)`), Outlook (`outlook.live.com`), iCloud (`icloud.com/mail`), Yahoo (`mail.yahoo.com`). Drop ProtonMail.
- **Compact spacing**: `p-3` on cards, `space-y-3` between sections, fits iPhone 14 (393×852) without scroll.
- **Primary CTA**: "Copy Address" (accent). Secondary: "Copy Search" (glass).
- **Single file change**: `src/components/email/EmailImportScreen.tsx`
- Dark cards: `bg-white/[0.04] border-white/[0.08]`
- Mono query block: `text-[10px] font-mono`, 2-3 lines, truncated
- Keep domain lists, `buildGmailUrl`, `buildCopyableQuery` helpers
- Keep props interface (`userId`, `onClose`, `onManualEntry`)
