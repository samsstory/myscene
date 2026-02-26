import React, { useCallback, useMemo } from "react";
import { ExternalLink, Copy, Search, ArrowRight } from "lucide-react";
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

/* ── Gmail Section ────────────────────────────────────── */

const GmailSection = React.memo(function GmailSection() {
  const handleOpen = useCallback((idx: number) => {
    window.open(buildGmailUrl(idx), "_blank", "noopener");
  }, []);

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground">Search Gmail</h3>
      <p className="text-xs text-muted-foreground/70 leading-relaxed">
        We'll open a Gmail search for ticket emails from Ticketmaster, Dice, StubHub, and 50+ other platforms.
      </p>
      <div className="grid grid-cols-2 gap-2">
        {[0, 1, 2, 3].map((i) => (
          <Button
            key={i}
            variant="outline"
            size="sm"
            onClick={() => handleOpen(i)}
            className="gap-1.5 text-xs border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08]"
          >
            <ExternalLink className="h-3.5 w-3.5 flex-shrink-0" />
            Check Gmail #{i + 1}
          </Button>
        ))}
      </div>
      <p className="text-[11px] text-muted-foreground/50 leading-snug">
        Select all results (<span className="font-medium text-muted-foreground/70">⌘A</span> on Mac, <span className="font-medium text-muted-foreground/70">Ctrl+A</span> on PC) and forward them to the address below.
      </p>
    </div>
  );
});

/* ── Non-Gmail Section ────────────────────────────────── */

const NonGmailSection = React.memo(function NonGmailSection() {
  const query = useMemo(() => buildCopyableQuery(), []);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(query);
    toast.success("Copied to clipboard");
  }, [query]);

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground">
        Using Outlook, Yahoo, Apple Mail, or work email?
      </h3>
      <p className="text-xs text-muted-foreground/70 leading-relaxed">
        Copy this search query, paste it into your email search bar, select all results, and forward to the address below.
      </p>
      <div className="relative">
        <div className="rounded-lg bg-white/[0.04] border border-white/[0.08] p-3 pr-10 text-[11px] text-muted-foreground font-mono leading-relaxed break-all max-h-24 overflow-y-auto">
          {query}
        </div>
        <button
          onClick={handleCopy}
          className="absolute top-2 right-2 h-7 w-7 rounded-md bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center transition-colors"
          aria-label="Copy search query"
        >
          <Copy className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </div>
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
    toast.success("Copied!");
  }, [address]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="rounded-xl bg-gradient-to-br from-cyan-500/10 to-purple-500/10 border border-cyan-400/20 p-4 space-y-2"
    >
      <p className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">Forward to</p>
      <div className="flex items-center gap-2">
        <span className="text-sm font-mono text-foreground break-all flex-1">{address}</span>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleCopy}
          className="h-8 w-8 flex-shrink-0 hover:bg-white/[0.08]"
          aria-label="Copy forwarding address"
        >
          <Copy className="h-4 w-4" />
        </Button>
      </div>
      <p className="text-[11px] text-muted-foreground/60 leading-snug">
        Forward your ticket emails here. We'll extract artist, venue, and date automatically.
      </p>
    </motion.div>
  );
});

/* ── Main Screen ──────────────────────────────────────── */

const EmailImportScreen: React.FC<EmailImportScreenProps> = ({ userId, onManualEntry }) => {
  const forwardingAddress = `add+${userId}@tryscene.app`;

  return (
    <div className="space-y-6 pb-4">
      <GmailSection />

      <div className="border-t border-white/[0.08]" />

      <NonGmailSection />

      <div className="border-t border-white/[0.08]" />

      <ForwardingCard address={forwardingAddress} />

      {/* Manual fallback */}
      <button
        onClick={onManualEntry}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors w-full"
      >
        <Search className="h-4 w-4 flex-shrink-0" />
        Can't find your emails? Add manually
        <ArrowRight className="h-3.5 w-3.5 ml-auto" />
      </button>
    </div>
  );
};

export default React.memo(EmailImportScreen);
