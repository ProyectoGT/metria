"use client";

import { motion } from "framer-motion";
import { Shield, User, Bot, Clock, Bug, Lightbulb, HelpCircle, Headphones, MessageSquare } from "lucide-react";
import Avatar from "@/components/ui/avatar";

export type MessageData = {
  id: number;
  autorNombre: string;
  autorRol: "usuario" | "admin" | "sistema";
  contenido: string;
  esSistema: boolean;
  createdAt: string;
};

function formatTime(iso: string) {
  return new Intl.DateTimeFormat("es-ES", {
    hour: "2-digit", minute: "2-digit",
  }).format(new Date(iso));
}

function formatDateFull(iso: string) {
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  }).format(new Date(iso));
}

export function TipoIcon({ tipo }: { tipo: string }) {
  const t = tipo.toLowerCase();
  if (t.includes("bug") || t.includes("problema")) return <Bug className="h-3.5 w-3.5 text-red-500" />;
  if (t.includes("funcionalidad") || t.includes("nueva")) return <Lightbulb className="h-3.5 w-3.5 text-purple-500" />;
  if (t.includes("duda") || t.includes("consulta")) return <HelpCircle className="h-3.5 w-3.5 text-blue-500" />;
  if (t.includes("soporte") || t.includes("informacion") || t.includes("informe") || t.includes("datos")) return <Headphones className="h-3.5 w-3.5 text-teal-500" />;
  return <MessageSquare className="h-3.5 w-3.5 text-text-secondary" />;
}

export default function TicketMessage({ message }: { message: MessageData }) {
  if (message.esSistema) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex justify-center py-1.5"
      >
        <div className="flex items-center gap-2 rounded-full bg-muted px-4 py-1.5 text-xs text-text-secondary">
          <Bot className="h-3 w-3 shrink-0" />
          <span className="text-center">{message.contenido}</span>
          <span className="text-text-secondary/40">·</span>
          <Clock className="h-3 w-3 shrink-0 text-text-secondary/40" />
          <span className="text-text-secondary/50">{formatTime(message.createdAt)}</span>
        </div>
      </motion.div>
    );
  }

  const isAdmin = message.autorRol === "admin";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-3 ${isAdmin ? "" : "flex-row-reverse"}`}
    >
      <div className="shrink-0 pt-1">
        <Avatar name={message.autorNombre} size="sm" />
      </div>
      <div className="flex max-w-[85%] flex-col gap-1">
        <div
          className={`rounded-xl px-4 py-3 ${
            isAdmin
              ? "rounded-bl-sm bg-primary/8 text-text-primary"
              : "rounded-br-sm bg-surface-raised/70 text-text-primary"
          }`}
        >
          <div className="mb-1.5 flex items-center gap-1.5">
            {isAdmin ? <Shield className="h-3.5 w-3.5 text-primary" /> : <User className="h-3.5 w-3.5 text-text-secondary" />}
            <span className="text-xs font-medium text-text-secondary">{message.autorNombre}</span>
            {isAdmin && <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">Soporte</span>}
          </div>
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.contenido}</p>
        </div>
        <span className={`px-1 text-[10px] text-text-secondary/40 ${isAdmin ? "" : "text-right"}`}>
          {formatDateFull(message.createdAt)}
        </span>
      </div>
    </motion.div>
  );
}
