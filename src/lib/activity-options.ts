export const ACTIVITY_PRIORITIES = ["alta", "media", "baja"] as const;
export type ActivityPriority = (typeof ACTIVITY_PRIORITIES)[number];

export const ACTIVITY_TYPES = [
  "visita",
  "llamada",
  "reunion",
  "seguimiento",
  "formacion",
  "actividad",
  "otro",
] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

const PRIORITY_LABEL_TO_VALUE: Record<string, ActivityPriority> = {
  alta: "alta",
  high: "alta",
  media: "media",
  medium: "media",
  baja: "baja",
  low: "baja",
};

const TYPE_LABEL_TO_VALUE: Record<string, ActivityType> = {
  visita: "visita",
  visit: "visita",
  llamada: "llamada",
  call: "llamada",
  reunion: "reunion",
  meeting: "reunion",
  seguimiento: "seguimiento",
  follow_up: "seguimiento",
  formacion: "formacion",
  training: "formacion",
  actividad: "actividad",
  activity: "actividad",
  otro: "otro",
  other: "otro",
};

export function normalizeActivityPriority(value: string | null | undefined): ActivityPriority {
  const normalized = value?.trim().toLowerCase();
  return normalized ? PRIORITY_LABEL_TO_VALUE[normalized] ?? "media" : "media";
}

export function normalizeActivityType(value: string | null | undefined): ActivityType {
  const normalized = value?.trim().toLowerCase();
  return normalized ? TYPE_LABEL_TO_VALUE[normalized] ?? "actividad" : "actividad";
}

export function isActivityPriority(value: string): value is ActivityPriority {
  return ACTIVITY_PRIORITIES.includes(value as ActivityPriority);
}

export function isActivityType(value: string): value is ActivityType {
  return ACTIVITY_TYPES.includes(value as ActivityType);
}
