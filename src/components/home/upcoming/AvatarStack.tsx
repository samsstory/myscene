/**
 * Unified avatar stack — renders a row of overlapping circular avatars
 * with an optional overflow "+N" indicator.
 *
 * Usage:
 *   <AvatarStack people={[{ id, avatar_url, username, full_name }]} size="sm" />
 */

export interface AvatarPerson {
  id: string;
  avatar_url?: string | null;
  username?: string | null;
  full_name?: string | null;
}

interface AvatarStackProps {
  people: AvatarPerson[];
  /** Maximum visible avatars before "+N" overflow (default 3) */
  max?: number;
  /** "sm" = 20px (chip-level), "md" = 24px (detail card) */
  size?: "sm" | "md";
  /** Additional class on the outer wrapper */
  className?: string;
}

const SIZE_MAP = {
  sm: { px: 20, cls: "w-5 h-5", textCls: "text-[7px]", overlap: -6 },
  md: { px: 24, cls: "w-6 h-6", textCls: "text-[8px]", overlap: -8 },
} as const;

export default function AvatarStack({
  people,
  max = 3,
  size = "sm",
  className = "",
}: AvatarStackProps) {
  if (people.length === 0) return null;

  const { cls, textCls, overlap } = SIZE_MAP[size];
  const visible = people.slice(0, max);
  const overflowCount = people.length - visible.length;

  return (
    <div className={`flex items-center ${className}`}>
      <div className="flex items-center">
        {visible.map((person, i) =>
          person.avatar_url ? (
            <img
              key={person.id}
              src={person.avatar_url}
              alt={person.username ?? person.full_name ?? "Friend"}
              className={`${cls} rounded-full border border-black/60 object-cover`}
              style={{ marginLeft: i === 0 ? 0 : overlap, zIndex: visible.length - i }}
            />
          ) : (
            <div
              key={person.id}
              className={`${cls} rounded-full border border-black/60 bg-primary/70 flex items-center justify-center`}
              style={{ marginLeft: i === 0 ? 0 : overlap, zIndex: visible.length - i }}
            >
              <span className={`${textCls} font-bold text-primary-foreground leading-none`}>
                {(person.username ?? person.full_name ?? "?")[0].toUpperCase()}
              </span>
            </div>
          )
        )}
        {overflowCount > 0 && (
          <div
            className={`${cls} rounded-full border border-black/60 bg-white/20 flex items-center justify-center`}
            style={{ marginLeft: overlap, zIndex: 0 }}
          >
            <span className={`${textCls} font-bold text-white/90 leading-none`}>+{overflowCount}</span>
          </div>
        )}
      </div>
    </div>
  );
}
