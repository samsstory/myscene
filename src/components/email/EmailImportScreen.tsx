import React, { useCallback, useMemo } from "react";
import { Search, CheckSquare, Send, Copy, ExternalLink, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { motion } from "framer-motion";

import gmailIcon from "@/assets/icons/gmail.svg";
import outlookIcon from "@/assets/icons/outlook.svg";
import yahooIcon from "@/assets/icons/yahoo.svg";
import protonmailIcon from "@/assets/icons/protonmail.svg";
import appleMailIcon from "@/assets/icons/apple-mail.svg";

interface EmailImportScreenProps {
  userId: string;
  onClose: () => void;
  onManualEntry: () => void;
}

const GMAIL_DOMAINS = [
  "ticketmaster.com", "livenation.com", "axs.com", "dice.fm", "posh.vip",
  "shotgun.live", "eventbrite.com", "tixr.com", "seetickets.com", "stubhub.com",
  "seatgeek.com", "vividseats.com", "tickpick.com", "etix.com", "ticketweb.com",
  "frontgatetickets.com", "insomniac.com", "universe.com", "showclix.com",
  "fixr.co", "ra.co", "skiddle.com", "ticketek.com", "eventim.de",
  "billetto.com", "vivenu.com",
];

const EXTRA_DOMAINS = [
  "sympla.com.br", "puntoticket.com", "eplus.jp", "biletinial.com",
  "accesso.com", "secutix.com", "ticketfly.com", "aeg.com",
  "songkick.com", "bandsintown.com", "residentadvisor.net", "theticketfairy.com",
  "seated.com", "lyte.com", "wantickets.com", "nightout.com",
  "dice.fm", "feverup.com", "tock.com", "stagehands.co",
  "humanitix.com", "partiful.com", "splash.events", "doorlist.co",
  "driventertainment.com", "electroseed.com", "goout.net", "gigantic.com",
  "kaboodle.co.uk", "festicket.com", "gigsberg.com", "megaticket.com",
];

const ALL_DOMAINS = [...new Set([...GMAIL_DOMAINS, ...EXTRA_DOMAINS])];
const SUBJECT_TERMS = ["order", "confirmation", "tickets", "admission", "transfer"];

function buildGmailUrl(accountIndex: number): string {
  const fromClause = `from:(${GMAIL_DOMAINS.join("+OR+")})`;
  const subjectClause = `subject:(${SUBJECT_TERMS.join("+OR+")})`;
  return `https://mail.google.com/mail/u/${accountIndex}/#search/${encodeURIComponent(`${fromClause} ${subjectClause}`).replace(/%2B/g, "+")}`;
}

function buildCopyableQuery(): string {
  const fromPart = `from:(${ALL_DOMAINS.join(" OR ")})`;
  const subjectPart = `subject:(${SUBJECT_TERMS.join(" OR ")})`;
  return `${fromPart} ${subjectPart}`;
}

/* ── 3-Step Flow Diagram ──────────────────────────────── */

const STEPS = [
  { icon: Search, label: "Search", sub: null, color: "hsl(210 90% 60%)", bg: "hsl(210 90% 60% / 0.15)" },
  { icon: CheckSquare, label: "Select All", sub: "⌘A / Ctrl+A", color: "hsl(270 70% 65%)", bg: "hsl(270 70% 65% / 0.15)" },
  { icon: Send, label: "Forward", sub: null, color: "hsl(150 60% 50%)", bg: "hsl(150 60% 50% / 0.15)" },
] as const;

const StepFlowDiagram = React.memo(function StepFlowDiagram() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="space-y-2"
    >
      <p className="text-center text-xs font-medium text-foreground/60">Find your tickets in 3 steps</p>
      <div className="flex items-center justify-center gap-0">
        {STEPS.map((step, i) => {
          const Icon = step.icon;
          return (
            <React.Fragment key={step.label}>
              <div className="flex flex-col items-center gap-1.5 min-w-[72px]">
                <div
                  className="flex items-center justify-center rounded-full"
                  style={{ width: 40, height: 40, backgroundColor: step.bg }}
                >
                  <Icon style={{ color: step.color }} className="h-[18px] w-[18px]" strokeWidth={1.5} />
                </div>
                <span className="text-[11px] font-medium text-foreground/80">{step.label}</span>
                {step.sub && (
                  <span className="text-[9px] text-muted-foreground/50 -mt-1">{step.sub}</span>
                )}
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className="h-px flex-1 max-w-[40px] -mt-4"
                  style={{
                    background: i === 0
                      ? "linear-gradient(to right, hsl(210 90% 60% / 0.4), hsl(270 70% 65% / 0.4))"
                      : "linear-gradient(to right, hsl(270 70% 65% / 0.4), hsl(150 60% 50% / 0.4))",
                  }}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </motion.div>
  );
});

/* ── Gmail Section ────────────────────────────────────── */

const GmailSection = React.memo(function GmailSection() {
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  const handleOpen = useCallback((idx: number) => {
    window.open(buildGmailUrl(idx), "_blank", "noopener");
  }, []);

  const gmailSearchQuery = useMemo(() => {
    const fromPart = `from:(${GMAIL_DOMAINS.join(" OR ")})`;
    const subjectPart = `subject:(${SUBJECT_TERMS.join(" OR ")})`;
    return `${fromPart} ${subjectPart}`;
  }, []);

  const handleCopyGmailSearch = useCallback(() => {
    navigator.clipboard.writeText(gmailSearchQuery);
    toast.success("Search copied — paste it in Gmail");
  }, [gmailSearchQuery]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2.5">
        <img src={gmailIcon} alt="" className="h-5 w-5" aria-hidden="true" />
        <h3 className="text-sm font-semibold text-foreground">Let's check your Gmail</h3>
      </div>

      {isMobile ? (
        <>
          <p className="text-xs text-muted-foreground/70 leading-relaxed">
            Copy this search, open the Gmail app, and paste it in the search bar.
          </p>
          <Button
            variant="glass"
            className="w-full h-14 gap-2.5 text-sm"
            onClick={handleCopyGmailSearch}
          >
            <Copy className="h-4 w-4 flex-shrink-0" strokeWidth={1.5} />
            Copy Gmail Search
          </Button>
          <p className="text-[11px] text-muted-foreground/50 text-center leading-snug">
            Searches Ticketmaster, DICE, AXS, StubHub & 20+ platforms
          </p>
        </>
      ) : (
        <>
          {/* Primary — Account #1 */}
          <button
            onClick={() => handleOpen(0)}
            className="flex items-center justify-center gap-3 w-full h-14 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] border border-white/[0.10] transition-colors"
          >
            <img src={gmailIcon} alt="" className="h-5 w-5" aria-hidden="true" />
            <span className="text-sm font-medium text-foreground">Open Gmail</span>
            <span className="text-[10px] font-bold text-muted-foreground bg-white/[0.08] rounded-md px-1.5 py-0.5">
              Account #1
            </span>
          </button>

          {/* Secondary label */}
          <p className="text-center text-xs text-muted-foreground/60 py-0.5">
            Check my other Gmail accounts
          </p>

          {/* Secondary — Accounts #2-4 */}
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3].map((num) => (
              <button
                key={num}
                onClick={() => handleOpen(num)}
                className="flex items-center justify-center gap-1.5 h-10 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-xs text-foreground/70 transition-colors"
              >
                Account #{num + 1}
                <ExternalLink className="h-3 w-3 opacity-40 flex-shrink-0" strokeWidth={1.5} />
              </button>
            ))}
          </div>

          <p className="text-[11px] text-muted-foreground/50 text-center leading-snug">
            Have more tickets elsewhere? Search your other inboxes
          </p>
        </>
      )}
    </div>
  );
});

/* ── Universal Search Section ─────────────────────────── */

const PROVIDER_LOGOS = [
  { src: gmailIcon, alt: "Gmail" },
  { src: outlookIcon, alt: "Outlook" },
  { src: appleMailIcon, alt: "Apple Mail" },
  { src: yahooIcon, alt: "Yahoo" },
  { src: protonmailIcon, alt: "ProtonMail" },
];

const UniversalSearchSection = React.memo(function UniversalSearchSection() {
  const query = useMemo(() => buildCopyableQuery(), []);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(query);
    toast.success("Copied to clipboard");
  }, [query]);

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground">Using Outlook, Apple Mail, or Yahoo?</h3>
      <div className="flex items-center gap-2.5">
        {PROVIDER_LOGOS.map((p) => (
          <img
            key={p.alt}
            src={p.src}
            alt={p.alt}
            className="h-5 w-5 opacity-60"
            aria-hidden="true"
          />
        ))}
      </div>
      <Button
        variant="glass"
        className="w-full gap-2 text-sm"
        onClick={handleCopy}
      >
        <Copy className="h-4 w-4 flex-shrink-0" strokeWidth={1.5} />
        Copy Ticket Search
      </Button>
      <p className="text-[11px] text-muted-foreground/50 leading-snug text-center">
        Paste into any email search bar
      </p>
    </div>
  );
});

/* ── Forwarding Address Card ──────────────────────────── */

interface ForwardingCardProps {
  address: string;
}

const ForwardingCard = React.memo<ForwardingCardProps>(function ForwardingCard({ address }) {
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(address);
    toast.success(`Copied: ${address}`);
  }, [address]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="rounded-2xl border border-white/[0.12] p-5 space-y-3"
      style={{
        background: "linear-gradient(135deg, hsl(270 50% 50% / 0.10), hsl(210 70% 50% / 0.06), hsl(185 70% 50% / 0.10))",
      }}
    >
      <p className="text-sm font-semibold text-foreground">Ready to forward your tickets?</p>
      <Button
        onClick={handleCopy}
        className="w-full h-12 rounded-xl gap-2 text-sm font-semibold bg-primary hover:bg-primary/90"
      >
        <Copy className="h-4 w-4 flex-shrink-0" strokeWidth={1.5} />
        Copy Scene Address
      </Button>
      <p className="text-[11px] text-muted-foreground/60 leading-relaxed text-center">
        Paste this into the <span className="font-medium text-foreground/70">To:</span> field and send all your emails that appear when you search — we'll automatically filter out non-show confirmations.
      </p>
    </motion.div>
  );
});

/* ── Main Screen ──────────────────────────────────────── */

const EmailImportScreen: React.FC<EmailImportScreenProps> = ({ userId, onManualEntry }) => {
  const forwardingAddress = `${userId}@add.tryscene.app`;

  return (
    <div className="space-y-5 pb-4">
      <p className="text-xs text-muted-foreground/70 leading-relaxed text-center">
        Let's dig up your old tickets from Ticketmaster, Dice, StubHub, and 50+ platforms hiding in your inbox.
      </p>

      <StepFlowDiagram />

      <ForwardingCard address={forwardingAddress} />

      <div className="border-t border-white/[0.06]" />

      <GmailSection />

      <div className="border-t border-white/[0.06]" />

      <UniversalSearchSection />

      <button
        onClick={onManualEntry}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors w-full"
      >
        <Search className="h-4 w-4 flex-shrink-0" strokeWidth={1.5} />
        Can't find your emails? Add manually
        <ArrowRight className="h-3.5 w-3.5 ml-auto" strokeWidth={1.5} />
      </button>
    </div>
  );
};

export default React.memo(EmailImportScreen);
