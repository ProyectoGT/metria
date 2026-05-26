import { ShieldCheck } from "lucide-react";
import EmptyState from "@/components/ui/empty-state";
import { Table, TableBody, TableContainer, TableHead, Td, Th, Tr } from "@/components/ui/table";
import type { BackupAuditEvent } from "../types/backup.types";
import { formatDateTime } from "../utils/backupFormatters";

export default function BackupAuditLog({ events }: { events: BackupAuditEvent[] }) {
  if (events.length === 0) {
    return (
      <EmptyState
        variant="compact"
        icon={<ShieldCheck className="h-8 w-8" />}
        title="Sin eventos de backup"
        description="Las acciones sensibles quedaran registradas aqui."
      />
    );
  }

  return (
    <TableContainer>
      <Table>
        <TableHead>
          <Th>Evento</Th>
          <Th>Fecha</Th>
          <Th>Usuario</Th>
          <Th>Backup</Th>
          <Th>Metadata</Th>
        </TableHead>
        <TableBody>
          {events.map((event) => (
            <Tr key={event.id}>
              <Td className="font-semibold">{event.event_type}</Td>
              <Td>{formatDateTime(event.created_at)}</Td>
              <Td>{event.user_role ?? "-"}</Td>
              <Td className="font-mono text-xs">{event.backup_run_id?.slice(0, 8) ?? "-"}</Td>
              <Td className="max-w-[260px] truncate text-xs text-text-secondary">
                {event.metadata ? JSON.stringify(event.metadata) : "-"}
              </Td>
            </Tr>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
