import AppShell from "@/components/layout/app-shell";
import InactivityGuard from "@/components/layout/inactivity-guard";
import { QueryProvider } from "@/providers/query-provider";
import { SyncProvider } from "@/providers/sync-provider";

export default function CrmLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <QueryProvider>
      {/* SyncProvider wires the event bus to TanStack Query — must be inside QueryProvider */}
      <SyncProvider>
        <InactivityGuard />
        <AppShell>{children}</AppShell>
      </SyncProvider>
    </QueryProvider>
  );
}
