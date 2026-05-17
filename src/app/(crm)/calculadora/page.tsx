import PageHeader from "@/components/layout/page-header";
import CalculatorDashboard from "@/modules/calculator/components/CalculatorDashboard";
import { requirePageAccess } from "@/lib/access-control/route-guard";

export default async function CalculadoraPage() {
  await requirePageAccess("calculadora");
  return (
    <>
      <PageHeader
        title="Centro de simulación inmobiliaria"
        description="Calcula hipotecas, gastos, plusvalía, rentabilidad y viabilidad de operaciones."
      />
      <CalculatorDashboard />
    </>
  );
}
