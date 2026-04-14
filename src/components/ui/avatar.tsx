const COLORS = [
  "bg-blue-600",
  "bg-emerald-600",
  "bg-violet-600",
  "bg-amber-600",
  "bg-rose-600",
  "bg-cyan-600",
  "bg-indigo-600",
  "bg-teal-600",
];

function colorFromName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLORS[Math.abs(hash) % COLORS.length];
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

const SIZES = {
  sm: "h-6 w-6 text-[10px]",
  md: "h-8 w-8 text-xs",
  lg: "h-10 w-10 text-sm",
} as const;

interface AvatarProps {
  name: string;
  src?: string | null;
  size?: keyof typeof SIZES;
}

export default function Avatar({ name, src, size = "md" }: AvatarProps) {
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={`${SIZES[size]} shrink-0 rounded-full object-cover`}
      />
    );
  }

  const bg = colorFromName(name);
  const initials = getInitials(name);

  return (
    <span
      className={`${SIZES[size]} ${bg} inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white`}
    >
      {initials}
    </span>
  );
}
