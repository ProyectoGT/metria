"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Search,
  X,
  Building2,
  TreePine,
  Map,
  MapPinned,
  FileText,
  User,
  LifeBuoy,
  CheckSquare,
  Phone,
  Mail,
  Calendar,
  ArrowRight,
  CheckCircle2,
  Plus,
  Loader2,
} from "lucide-react";
import type { SearchResult } from "@/app/api/search/route";
import { completeTareaAction, completeAgendaAction } from "@/app/(crm)/dashboard/actions";

// ─── Type config ──────────────────────────────────────────────────────────────

type ResultType = SearchResult["type"];

const TYPE_CONFIG: Record<ResultType, { icon: React.ElementType; label: string; color: string }> = {
  propiedad:  { icon: Building2,  label: "Propiedad",  color: "text-blue-600 dark:text-blue-400 bg-blue-500/10" },
  finca:      { icon: TreePine,   label: "Finca",      color: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10" },
  sector:     { icon: Map,        label: "Sector",     color: "text-amber-600 dark:text-amber-400 bg-amber-500/10" },
  zona:       { icon: MapPinned,  label: "Zona",       color: "text-purple-600 dark:text-purple-400 bg-purple-500/10" },
  solicitud:  { icon: FileText,   label: "Solicitud",  color: "text-primary bg-primary/10" },
  usuario:    { icon: User,       label: "Usuario",    color: "text-slate-600 dark:text-slate-400 bg-slate-500/10" },
  ticket:     { icon: LifeBuoy,   label: "Soporte",    color: "text-red-600 dark:text-red-400 bg-red-500/10" },
  tarea:      { icon: CheckSquare,label: "Tarea",      color: "text-amber-600 dark:text-amber-400 bg-amber-500/10" },
  contacto:   { icon: Phone,      label: "Contacto",   color: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10" },
  email:      { icon: Mail,       label: "Email",      color: "text-blue-600 dark:text-blue-400 bg-blue-500/10" },
  actividad:  { icon: Calendar,   label: "Actividad",  color: "text-primary bg-primary/10" },
};

const RESULT_LIMIT = 40;

// ─── Quick actions ───────────────────────────────────────────────────────────

type QuickAction = {
  id: string;
  icon: React.ElementType;
  label: string;
  description: string;
  action: () => void;
};

// ─── Component ───────────────────────────────────────────────────────────────

type SpotlightSearchProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function SpotlightSearch({ open, onOpenChange }: SpotlightSearchProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset on open/close
  useEffect(() => {
    if (open) {
      setQuery("");
      setResults([]);
      setSelectedIndex(-1);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Debounced search
  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      setSelectedIndex(-1);
      return;
    }

    setLoading(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}&ctx=general`);
        const json = await res.json();
        setResults((json.results ?? []).slice(0, RESULT_LIMIT));
        setSelectedIndex(-1);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 280);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  // Group results by type
  const grouped = useMemo(() => {
    const map: Record<string, SearchResult[]> = {};
    for (const r of results) {
      const key = r.type;
      if (!map[key]) map[key] = [];
      map[key].push(r);
    }
    return map;
  }, [results]);

  // Flatten for keyboard navigation
  const flatResults = useMemo(() => results, [results]);

  // Scroll selected into view
  useEffect(() => {
    if (selectedIndex < 0 || !listRef.current) return;
    const items = listRef.current.querySelectorAll<HTMLButtonElement>("[data-result-index]");
    items[selectedIndex]?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  const close = useCallback(() => onOpenChange(false), [onOpenChange]);

  const navigateTo = useCallback((href: string) => {
    close();
    router.push(href);
  }, [close, router]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, flatResults.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && selectedIndex >= 0) {
      e.preventDefault();
      const item = flatResults[selectedIndex];
      if (item) navigateTo(item.href);
    } else if (e.key === "Escape") {
      close();
    }
  }, [flatResults, selectedIndex, navigateTo, close]);

  const handleQuickComplete = useCallback(async (result: SearchResult) => {
    if (!result.meta?.dbId) return;
    if (result.type === "tarea") {
      await completeTareaAction(result.meta.dbId);
    } else if (result.type === "actividad") {
      await completeAgendaAction(result.meta.dbId, true);
    }
    close();
    router.refresh();
  }, [close, router]);

  // Quick actions for empty state
  const quickActions: QuickAction[] = useMemo(() => [
    {
      id: "crear-tarea",
      icon: Plus,
      label: "Crear tarea",
      description: "Anade una nueva tarea al tablero",
      action: () => { close(); router.push("/dashboard"); },
    },
    {
      id: "ir-calendario",
      icon: Calendar,
      label: "Ir a calendario",
      description: "Revisa tu agenda y actividades",
      action: () => { close(); router.push("/calendario"); },
    },
    {
      id: "ir-ordenes",
      icon: CheckCircle2,
      label: "Orden del dia",
      description: "Actividades programadas para hoy",
      action: () => { close(); router.push("/ordenes"); },
    },
    {
      id: "abrir-contactos",
      icon: Phone,
      label: "Buscar contacto",
      description: "Explora la agenda de contactos",
      action: () => { close(); router.push("/contactos"); },
    },
  ], [close, router]);

  if (!open) return null;

  const totalGroups = Object.keys(grouped).length;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-[10vh] backdrop-blur-sm">
      {/* Overlay click to close */}
      <div className="absolute inset-0" onClick={close} />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: -8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: -8 }}
        transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Input ──────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 border-b border-border px-5 py-4">
          {loading ? (
            <Loader2 className="h-5 w-5 shrink-0 animate-spin text-primary" />
          ) : (
            <Search className="h-5 w-5 shrink-0 text-text-secondary/60" />
          )}
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Busca en todo Metria (tareas, contactos, propiedades...)"
            className="min-w-0 flex-1 bg-transparent text-base text-text-primary outline-none placeholder:text-text-secondary/50"
          />
          {query && (
            <button
              onClick={() => { setQuery(""); inputRef.current?.focus(); }}
              className="rounded-lg p-1 text-text-secondary hover:bg-state-hover hover:text-text-primary"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <kbd className="hidden shrink-0 rounded-md border border-border bg-muted px-2 py-0.5 text-[11px] font-medium text-text-secondary/60 sm:inline-block">
            ESC
          </kbd>
        </div>

        {/* ── Results ────────────────────────────────────────────── */}
        <div ref={listRef} className="max-h-[60vh] overflow-y-auto overscroll-contain">
          {query.trim().length >= 2 && totalGroups === 0 && !loading && (
            <div className="flex flex-col items-center px-6 py-14 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-muted">
                <Search className="h-6 w-6 text-text-secondary/40" />
              </div>
              <p className="text-sm font-medium text-text-primary">Sin resultados</p>
              <p className="mt-1 text-xs text-text-secondary">
                No encontramos nada para <span className="font-medium text-text-primary">&ldquo;{query}&rdquo;</span>
              </p>
            </div>
          )}

          {query.trim().length < 2 && !loading && (
            <div className="px-5 py-5">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-secondary/60">
                Acciones rapidas
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {quickActions.map((qa) => (
                  <button
                    key={qa.id}
                    onClick={qa.action}
                    className="flex items-center gap-3 rounded-xl border border-border bg-surface-elevated/50 px-4 py-3 text-left transition-all hover:border-primary/30 hover:bg-primary/5 hover:shadow-sm"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <qa.icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-text-primary">{qa.label}</p>
                      <p className="text-xs text-text-secondary">{qa.description}</p>
                    </div>
                  </button>
                ))}
              </div>
              <p className="mt-4 text-center text-xs text-text-secondary/50">
                Escribe al menos 2 caracteres para buscar
              </p>
            </div>
          )}

          {loading && query.trim().length >= 2 && (
            <div className="space-y-1 px-4 py-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex animate-pulse items-center gap-3 rounded-xl px-3 py-3">
                  <div className="h-8 w-8 shrink-0 rounded-lg bg-muted" />
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="h-3.5 w-3/5 rounded bg-muted" />
                    <div className="h-3 w-2/5 rounded bg-muted" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && totalGroups > 0 && (
            <div className="px-3 py-3">
              {Object.entries(grouped).map(([type, items]) => {
                const config = TYPE_CONFIG[type as ResultType];
                const Icon = config.icon;
                let resultIdx = 0;
                const startIdx = results.findIndex((r) => r.id === items[0]?.id);
                return (
                  <div key={type} className="mb-3 last:mb-0">
                    <div className="flex items-center gap-2 px-2 py-1.5">
                      <span className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-0.5 text-[11px] font-semibold ${config.color}`}>
                        <Icon className="h-3 w-3" />
                        {config.label}
                      </span>
                      <span className="text-[11px] text-text-secondary/50">{items.length}</span>
                    </div>
                    {items.map((item: SearchResult) => {
                      const idx = startIdx + resultIdx;
                      resultIdx++;
                      const isSelected = idx === selectedIndex;
                      return (
                        <button
                          key={item.id}
                          data-result-index={idx}
                          onClick={() => navigateTo(item.href)}
                          onMouseEnter={() => setSelectedIndex(idx)}
                          className={[
                            "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
                            isSelected ? "bg-primary/8" : "hover:bg-state-hover",
                          ].join(" ")}
                        >
                          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${config.color}`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-text-primary">
                              {item.label}
                            </p>
                            {item.sublabel && (
                              <p className="truncate text-xs text-text-secondary">{item.sublabel}</p>
                            )}
                          </div>
                          <div className="flex shrink-0 items-center gap-1">
                            {/* Quick complete for tarea/actividad */}
                            {(item.type === "tarea" || item.type === "actividad") && item.meta?.dbId && !item.meta?.completed && (
                              <span
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleQuickComplete(item);
                                }}
                                className="rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-success/10 hover:text-success"
                                title="Completar"
                              >
                                <CheckCircle2 className="h-4 w-4" />
                              </span>
                            )}
                            <ArrowRight className={`h-4 w-4 text-text-secondary/40 transition-all ${isSelected ? "translate-x-0.5 text-primary" : ""}`} />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Footer hint ─────────────────────────────────────────── */}
        {totalGroups > 0 && (
          <div className="flex items-center justify-between border-t border-border px-5 py-2.5 text-[11px] text-text-secondary/50">
            <span>
              {flatResults.length} resultado{flatResults.length !== 1 ? "s" : ""}
            </span>
            <span className="flex items-center gap-3">
              <span><kbd className="rounded border border-border px-1.5 py-0.5 text-[10px] font-medium">↑↓</kbd> Navegar</span>
              <span><kbd className="rounded border border-border px-1.5 py-0.5 text-[10px] font-medium">↵</kbd> Abrir</span>
              <span><kbd className="rounded border border-border px-1.5 py-0.5 text-[10px] font-medium">Esc</kbd> Cerrar</span>
            </span>
          </div>
        )}
      </motion.div>
    </div>
  );
}
