import AppShell from "@/components/layout/app-shell";
import InactivityGuard from "@/components/layout/inactivity-guard";

export default function CrmLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <InactivityGuard />
      <AppShell>{children}</AppShell>
    </>
  );
}
