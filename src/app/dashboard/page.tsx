import Header from "@/components/layout/header";

export default function DashboardPage() {
  return (
    <>
      <Header
        title="Dashboard"
        description="Resumen general de la actividad del CRM"
      />
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <DashboardCard label="Propiedades activas" value="—" />
        <DashboardCard label="Clientes registrados" value="—" />
        <DashboardCard label="Visitas este mes" value="—" />
        <DashboardCard label="Contratos activos" value="—" />
      </div>
    </>
  );
}

function DashboardCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
      <p className="text-sm font-medium text-text-secondary">{label}</p>
      <p className="mt-2 text-3xl font-bold text-text-primary">{value}</p>
    </div>
  );
}
