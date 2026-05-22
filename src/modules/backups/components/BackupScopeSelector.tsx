"use client";

import { BACKUP_SCOPE_OPTIONS } from "../config/backupEntities";
import type { BackupScopeKey } from "../types/backup.types";

export default function BackupScopeSelector({
  value,
  onChange,
}: {
  value: BackupScopeKey[];
  onChange: (next: BackupScopeKey[]) => void;
}) {
  function toggle(key: BackupScopeKey) {
    if (key === "all") {
      onChange(value.includes("all") ? [] : ["all"]);
      return;
    }
    const next = value.filter((item) => item !== "all");
    onChange(next.includes(key) ? next.filter((item) => item !== key) : [...next, key]);
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {BACKUP_SCOPE_OPTIONS.map((option) => (
        <button
          key={option.key}
          type="button"
          onClick={() => toggle(option.key)}
          className={[
            "rounded-ds-lg border p-4 text-left transition-colors",
            value.includes(option.key) ? "border-primary bg-primary/5" : "border-border bg-surface hover:border-border-strong",
          ].join(" ")}
        >
          <span className="text-sm font-semibold text-text-primary">{option.label}</span>
          <span className="mt-1 block text-xs leading-5 text-text-secondary">{option.description}</span>
        </button>
      ))}
    </div>
  );
}
