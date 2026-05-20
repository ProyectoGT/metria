// ─── Avatar ───────────────────────────────────────────────────────────────────
// Avatar de usuario con imagen o iniciales generadas determinísticamente.
// Los colores de fallback usan tokens del sistema para coherencia con dark mode.
// ─────────────────────────────────────────────────────────────────────────────

import Image from "next/image";
import { AVATAR_COLORS } from "@/lib/theme";

function colorFromName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
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
  xs: "h-5 w-5 text-[9px]",
  sm: "h-6 w-6 text-[10px]",
  md: "h-8 w-8 text-xs",
  lg: "h-10 w-10 text-sm",
  xl: "h-12 w-12 text-base",
} as const;

interface AvatarProps {
  name: string;
  src?: string | null;
  size?: keyof typeof SIZES;
}

export default function Avatar({ name, src, size = "md" }: AvatarProps) {
  if (src) {
    const sizeMap = { xs: 20, sm: 24, md: 32, lg: 40, xl: 48 };
    const px = sizeMap[size];
    return (
      <Image
        src={src}
        alt={name}
        width={px}
        height={px}
        className={`${SIZES[size]} shrink-0 rounded-full object-cover`}
      />
    );
  }

  const colorClass = colorFromName(name);
  const initials = getInitials(name);

  return (
    <span
      className={`${SIZES[size]} ${colorClass} inline-flex shrink-0 items-center justify-center rounded-full font-semibold`}
    >
      {initials}
    </span>
  );
}
