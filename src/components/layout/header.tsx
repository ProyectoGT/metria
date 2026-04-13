"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Search, Bell, ChevronDown } from "lucide-react";
import { logout } from "@/app/(auth)/actions";
import Avatar from "@/components/ui/avatar";

function formatDate(): string {
  const now = new Date();
  return now.toLocaleDateString("es-ES", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

interface HeaderProps {
  userName: string;
  userEmail?: string | null;
}

export default function Header({ userName, userEmail }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center border-b border-border bg-surface px-6">
      {/* Search bar */}
      <div className="relative w-full max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
        <input
          type="text"
          placeholder="Buscar..."
          className="w-full rounded-lg border border-border bg-background py-2 pl-10 pr-4 text-sm text-text-primary outline-none transition-colors placeholder:text-text-secondary focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Date */}
      <span className="mr-6 hidden text-sm text-text-secondary lg:block">
        {formatDate()}
      </span>

      {/* Notifications */}
      <button className="relative mr-4 rounded-lg p-2 text-text-secondary transition-colors hover:bg-background hover:text-text-primary">
        <Bell className="h-5 w-5" />
        <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-danger text-[10px] font-bold text-white">
          3
        </span>
      </button>

      {/* User menu */}
      <div ref={menuRef} className="relative">
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-background"
        >
          <Avatar name={userName} size="md" />
          <span className="hidden text-sm font-medium text-text-primary sm:block">
            {userName}
          </span>
          <ChevronDown className="h-4 w-4 text-text-secondary" />
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-full mt-1 w-48 rounded-xl border border-border bg-surface py-1 shadow-lg">
            {userEmail && (
              <p className="border-b border-border px-4 py-2 text-xs text-text-secondary">
                {userEmail}
              </p>
            )}
            <Link
              href="/cuenta"
              onClick={() => setMenuOpen(false)}
              className="flex w-full items-center px-4 py-2 text-sm text-text-primary transition-colors hover:bg-background"
            >
              Mi perfil
            </Link>
            <form action={logout}>
              <button
                type="submit"
                className="flex w-full items-center px-4 py-2 text-sm text-danger transition-colors hover:bg-background"
              >
                Cerrar sesión
              </button>
            </form>
          </div>
        )}
      </div>
    </header>
  );
}
