import Sidebar from "@/components/layout/sidebar";

export default function PedidosLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex h-full">
      <Sidebar />
      <main className="ml-64 flex-1 overflow-y-auto p-8">{children}</main>
    </div>
  );
}
