"use client";

import { motion } from "framer-motion";
import { User, Shield, Bot } from "lucide-react";
import Avatar from "@/components/ui/avatar";

export type MessageData = {
  id: number;
  autorNombre: string;
  autorRol: "usuario" | "admin" | "sistema";
  contenido: string;
  esSistema: boolean;
  createdAt: string;
};

function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function MessageIcon({ role }: { role: string }) {
  if (role === "admin") return <Shield className="h-4 w-4 text-primary" />;
  if (role === "sistema") return <Bot className="h-4 w-4 text-text-secondary" />;
  return <User className="h-4 w-4 text-text-secondary" />;
}

function RoleLabel({ role }: { role: string }) {
  if (role === "admin") return "Administrador";
  if (role === "sistema") return "Sistema";
  return "Usuario";
}

export default function TicketMessage({ message }: { message: MessageData }) {
  if (message.esSistema) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-center py-2"
      >
        <div className="flex items-center gap-2 rounded-full bg-muted px-4 py-1.5 text-xs text-text-secondary">
          <Bot className="h-3 w-3" />
          <span>{message.contenido}</span>
          <span className="text-text-secondary/60">·</span>
          <span className="text-text-secondary/60">{formatDateTime(message.createdAt)}</span>
        </div>
      </motion.div>
    );
  }

  const isAdmin = message.autorRol === "admin";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-3 ${isAdmin ? "flex-row" : "flex-row-reverse"}`}
    >
      <div className="shrink-0">
        <Avatar name={message.autorNombre} size="sm" />
      </div>
      <div className={`max-w-[80%] ${isAdmin ? "" : "items-end"} flex flex-col`}>
        <div
          className={`rounded-2xl px-4 py-3 ${
            isAdmin
              ? "rounded-bl-sm bg-primary/10 text-text-primary"
              : "rounded-br-sm bg-surface-raised text-text-primary"
          }`}
        >
          <div className="mb-1 flex items-center gap-1.5">
            <MessageIcon role={message.autorRol} />
            <span className="text-xs font-medium text-text-secondary">
              {message.autorNombre}
            </span>
            <span className="text-xs text-text-secondary/50">·</span>
            <span className="text-xs text-text-secondary/50">
              <RoleLabel role={message.autorRol} />
            </span>
          </div>
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.contenido}</p>
        </div>
        <span className="mt-1 px-1 text-[10px] text-text-secondary/50">
          {formatDateTime(message.createdAt)}
        </span>
      </div>
    </motion.div>
  );
}
