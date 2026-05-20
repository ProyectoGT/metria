import type { Metadata } from "next";
import LegalPageLayout from "@/components/legal/LegalPageLayout";
import { privacyEs } from "@/content/legal/es/privacy";

export const metadata: Metadata = {
  title: "Politica de privacidad",
  description:
    "Politica de privacidad de Metria CRM — Master Iberica Immobiliaria 2025 S.L. Informacion sobre el tratamiento de datos personales.",
};

export default function PrivacidadPage() {
  return <LegalPageLayout doc={privacyEs} />;
}
