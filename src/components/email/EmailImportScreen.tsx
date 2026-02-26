import React, { useCallback, useMemo } from "react";
import { Search, CheckSquare, Send, Copy, ExternalLink, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { motion } from "framer-motion";

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

/* ── Gmail "M" Icon ───────────────────────────────────── */

const GmailIcon = React.memo(function GmailIcon({ size = 20 }: { size?: number }) {
  return (
    <span
      className="inline-flex items-center justify-center rounded-md font-black select-none"
      style={{
        width: size + 8,
        height: size + 8,
        fontSize: size * 0.75,
        background: "linear-gradient(135deg, hsl(4 90% 58%), hsl(36 100% 50%))",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        backgroundColor: "hsl(var(--muted) / 0.15)",
      }}
      aria-hidden="true"
    >
      M
    </span>
  );
});

/* ── Provider Initial Badge ───────────────────────────── */

interface ProviderBadgeProps {
  label: string;
  bg: string;
}

const ProviderBadge = React.memo<ProviderBadgeProps>(function ProviderBadge({ label, bg }) {
  return (
    <span
      className="inline-flex items-center justify-center rounded-full text-[10px] font-bold text-foreground/80 select-none"
      style={{ width: 28, height: 28, backgroundColor: bg }}
      aria-hidden="true"
    >
      {label}
    </span>
  );
});

/* ── Gmail Section ────────────────────────────────────── */

const GmailSection = React.memo(function GmailSection() {
  const handleOpen = useCallback((idx: number) => {
    window.open(buildGmailUrl(idx), "_blank", "noopener");
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <GmailIcon size={18} />
        <h3 className="text-sm font-semibold text-foreground">Search Gmail</h3>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {[0, 1, 2, 3].map((i) => (
          <button
            key={i}
            onClick={() => handleOpen(i)}
            className="relative flex items-center gap-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.10] border border-white/[0.08] px-3 py-2.5 transition-colors"
          >
            <GmailIcon size={14} />
            <span className="text-xs text-foreground/80 font-medium">Account</span>
            <span className="ml-auto text-[10px] font-bold text-muted-foreground bg-white/[0.08] rounded-md px-1.5 py-0.5">
              #{i + 1}
            </span>
            <ExternalLink className="h-3 w-3 text-muted-foreground/50 flex-shrink-0" strokeWidth={1.5} />
          </button>
        ))}
      </div>
      <p className="text-[11px] text-muted-foreground/50 leading-snug">
        Check each account until you find your tickets
      </p>
    </div>
  );
});

/* ── Universal Search Section ─────────────────────────── */

const PROVIDERS: ProviderBadgeProps[] = [
  { label: "O", bg: "hsl(210 80% 45% / 0.25)" },
  { label: "Y", bg: "hsl(270 60% 50% / 0.25)" },
  { label: "", bg: "hsl(0 0% 60% / 0.2)" },
  { label: "P", bg: "hsl(265 60% 55% / 0.25)" },
];

const UniversalSearchSection = React.memo(function UniversalSearchSection() {
  const query = useMemo(() => buildCopyableQuery(), []);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(query);
    toast.success("Copied to clipboard");
  }, [query]);

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground">Universal Search</h3>
      <div className="flex items-center gap-1.5 opacity-60">
        {PROVIDERS.map((p, i) => (
          <ProviderBadge key={i} {...p} />
        ))}
      </div>
      <Button
        variant="glass"
        className="w-full gap-2 text-sm"
        onClick={handleCopy}
      >
        <Copy className="h-4 w-4 flex-shrink-0" strokeWidth={1.5} />
        Copy Search Query
      </Button>
      <p className="text-[11px] text-muted-foreground/50 leading-snug">
        Works with any email provider — paste into your search bar
      </p>
    </div>
  );
});

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
      <p className="text-center text-[11px] text-muted-foreground/50">
        We'll extract artist, venue &amp; date automatically
      </p>
    </motion.div>
  );
});

/* ── Forwarding Address Card ──────────────────────────── */

interface ForwardingCardProps {
  address: string;
  displayAddress: string;
}

const ForwardingCard = React.memo<ForwardingCardProps>(function ForwardingCard({ address, displayAddress }) {
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(address);
    toast.success("Copied!");
  }, [address]);

  return (
    <motion.button
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      onClick={handleCopy}
      className="w-full text-left rounded-2xl border border-white/[0.12] p-5 space-y-2.5 transition-colors hover:border-white/[0.20] active:scale-[0.99]"
      style={{
        background: "linear-gradient(135deg, hsl(270 50% 50% / 0.12), hsl(210 70% 50% / 0.08), hsl(185 70% 50% / 0.12))",
      }}
      aria-label="Copy forwarding address"
    >
      <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "hsl(185 70% 60%)" }}>
        Forward tickets to
      </p>
      <div className="flex items-center gap-3">
        <span className="text-sm font-mono text-foreground break-all flex-1 leading-relaxed">
          {displayAddress}
        </span>
        <div className="flex-shrink-0 h-9 w-9 rounded-lg bg-white/[0.08] flex items-center justify-center">
          <Copy className="h-4 w-4 text-foreground/70" strokeWidth={1.5} />
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground/50">
        Tap to copy · full address copied to clipboard
      </p>
    </motion.button>
  );
});

/* ── Main Screen ──────────────────────────────────────── */

const EmailImportScreen: React.FC<EmailImportScreenProps> = ({ userId, onManualEntry }) => {
  const forwardingAddress = `add+${userId}@tryscene.app`;

  const displayAddress = useMemo(() => {
    if (userId.length <= 12) return forwardingAddress;
    return `add+${userId.slice(0, 8)}…${userId.slice(-4)}@tryscene.app`;
  }, [userId, forwardingAddress]);

  return (
    <div className="space-y-5 pb-4">
      <GmailSection />

      <div className="border-t border-white/[0.06]" />

      <UniversalSearchSection />

      <div className="border-t border-white/[0.06]" />

      <StepFlowDiagram />

      <ForwardingCard address={forwardingAddress} displayAddress={displayAddress} />

      {/* Manual fallback */}
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
