import PageHeader from "@/components/layout/page-header";
import CalculadoraClient from "./calculadora-client";

export default function CalculadoraPage() {
  return (
    <>
      <PageHeader
        title="Calculadora"
        description="Herramientas de cálculo inmobiliario"
      />
      <CalculadoraClient />
    </>
  );
}
