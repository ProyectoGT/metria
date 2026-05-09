import AppShell from "@/components/layout/app-shell";
import InactivityGuard from "@/components/layout/inactivity-guard";
import { QueryProvider } from "@/providers/query-provider";

export default function CrmLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <QueryProvider>
      <InactivityGuard />
      <AppShell>{children}</AppShell>
    </QueryProvider>
  );
}
