"use client";

import { useMemo } from "react";
import type { BackupProfile } from "../types/backup.types";

export function useBackupProfiles(profiles: BackupProfile[]) {
  return useMemo(() => ({
    profiles,
    enabledProfiles: profiles.filter((profile) => profile.enabled),
    disabledProfiles: profiles.filter((profile) => !profile.enabled),
  }), [profiles]);
}
