import type { Metadata } from "next";
import LegalPageLayout from "@/components/legal/LegalPageLayout";
import { termsEs } from "@/content/legal/es/terms";

export const metadata: Metadata = {
  title: "Condiciones del servicio",
  description:
    "Condiciones del servicio de Metria CRM — Master Iberica Immobiliaria 2025 S.L. Terminos de uso de la plataforma de gestion inmobiliaria.",
};

export default function CondicionesPage() {
  return <LegalPageLayout doc={termsEs} />;
}
