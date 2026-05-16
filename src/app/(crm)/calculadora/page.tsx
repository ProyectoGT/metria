import PageHeader from "@/components/layout/page-header";
import CalculatorDashboard from "@/modules/calculator/components/CalculatorDashboard";

export default function CalculadoraPage() {
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
