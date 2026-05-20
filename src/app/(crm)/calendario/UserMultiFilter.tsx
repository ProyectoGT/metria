"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { ChevronDown, X, Search, Users, User } from "lucide-react";
import type { UserRole } from "@/lib/roles";

type FilterUser = { id: number; name: string };

type Props = {
  users: FilterUser[];
  selectedIds: Set<number>;
  onChange: (ids: Set<number>) => void;
  currentUserId: number;
  role: UserRole;
};

export default function UserMultiFilter({ users, selectedIds, onChange, currentUserId, role }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const toggle = useCallback(
    (userId: number) => {
      const next = new Set(selectedIds);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      onChange(next);
    },
    [selectedIds, onChange],
  );

  const clearAll = useCallback(() => onChange(new Set()), [onChange]);

  const filteredUsers = useMemo(() => {
    if (!search.trim()) return users;
    const lower = search.toLowerCase();
    return users.filter((u) => u.name.toLowerCase().includes(lower));
  }, [users, search]);

  const triggerLabel = useMemo(() => {
    if (selectedIds.size === 0) {
      return role === "Responsable" ? "Mi equipo" : "Todos los usuarios";
    }
    if (selectedIds.size === 1) {
      const id = [...selectedIds][0];
      if (id === currentUserId) return "Mis tareas";
      return users.find((u) => u.id === id)?.name ?? "1 usuario";
    }
    return `${selectedIds.size} usuarios`;
  }, [selectedIds, users, currentUserId, role]);

  const hasSelection = selectedIds.size > 0;

  return (
    <div className="relative" ref={containerRef}>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={[
            "input flex h-9 items-center gap-2 py-0 pl-3 pr-2.5 text-sm",
            hasSelection ? "border-primary text-primary" : "text-text-primary",
          ].join(" ")}
        >
          <Users className="h-3.5 w-3.5 shrink-0 text-text-secondary" />
          <span className="max-w-[160px] truncate">{triggerLabel}</span>
          {hasSelection && (
            <span className="ml-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white">
              {selectedIds.size}
            </span>
          )}
          <ChevronDown
            className={`h-3.5 w-3.5 shrink-0 text-text-secondary transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>

        {hasSelection && (
          <button
            type="button"
            onClick={clearAll}
            className="flex h-9 items-center rounded-lg border border-border px-2.5 text-xs font-medium text-text-secondary transition-colors hover:bg-background hover:text-danger"
            title="Limpiar filtro"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1.5 w-64 overflow-hidden rounded-xl border border-border bg-surface shadow-xl">
          {users.length > 6 && (
            <div className="border-b border-border p-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-secondary" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar usuario..."
                  className="input h-8 w-full pl-8 pr-3 text-xs"
                  autoFocus
                />
              </div>
            </div>
          )}

          <div className="max-h-60 overflow-y-auto py-1">
            {filteredUsers.length === 0 ? (
              <p className="px-3 py-2 text-xs text-text-secondary">Sin resultados</p>
            ) : (
              filteredUsers.map((user) => {
                const isSelected = selectedIds.has(user.id);
                const isSelf = user.id === currentUserId;
                return (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => toggle(user.id)}
                    className={[
                      "flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors hover:bg-background",
                      isSelected ? "text-primary" : "text-text-primary",
                    ].join(" ")}
                  >
                    <div
                      className={[
                        "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
                        isSelected ? "border-primary bg-primary" : "border-border bg-surface",
                      ].join(" ")}
                    >
                      {isSelected && (
                        <svg className="h-2.5 w-2.5 text-white" viewBox="0 0 10 8" fill="none">
                          <path
                            d="M1 4l3 3 5-6"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </div>
                    <User className="h-3.5 w-3.5 shrink-0 text-text-secondary" />
                    <span className="min-w-0 truncate">
                      {user.name}
                      {isSelf && <span className="ml-1 text-text-secondary">(Yo)</span>}
                    </span>
                  </button>
                );
              })
            )}
          </div>

          {hasSelection && (
            <div className="border-t border-border p-2">
              <button
                type="button"
                onClick={() => {
                  clearAll();
                  setOpen(false);
                }}
                className="w-full rounded-lg px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-background hover:text-danger"
              >
                Limpiar filtro
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
