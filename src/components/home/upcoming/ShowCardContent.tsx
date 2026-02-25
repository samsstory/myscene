import { cn } from "@/lib/utils";
import AvatarStack, { type AvatarPerson } from "./AvatarStack";

interface ShowCardContentProps {
  avatars?: AvatarPerson[];
  eventName?: string | null;
  artistName: string;
  venueName?: string | null;
  dateLabel: string;
}

const shadow = { textShadow: "0 1px 4px rgba(0,0,0,0.8)" } as const;

export default function ShowCardContent({
  avatars,
  eventName,
  artistName,
  venueName,
  dateLabel,
}: ShowCardContentProps) {
  const truncVenue = venueName
    ? venueName.length > 16 ? venueName.slice(0, 14) + "…" : venueName
    : null;

  return (
    <>
      {avatars && avatars.length > 0 && (
        <AvatarStack people={avatars} size="sm" className="mb-1" />
      )}
      {eventName && (
        <p className="text-[10px] font-semibold text-primary/80 leading-tight line-clamp-1" style={shadow}>
          {eventName}
        </p>
      )}
      <p className={cn(
        "font-bold text-white leading-tight line-clamp-2",
        artistName.includes(" b2b ") ? "text-[10px]" : "text-xs"
      )} style={shadow}>
        {artistName}
      </p>
      {truncVenue && (
        <p className="text-[10px] text-white/70 mt-0.5" style={shadow}>
          {truncVenue}
        </p>
      )}
      <p className="text-[10px] text-white/50 mt-0.5" style={shadow}>
        {dateLabel}
      </p>
    </>
  );
}
