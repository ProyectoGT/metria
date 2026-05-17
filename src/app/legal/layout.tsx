import type { ReactNode } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    template: "%s · Master Iberica CRM",
    default: "Informacion legal · Master Iberica CRM",
  },
};

export default function LegalLayout({ children }: { children: ReactNode }) {
  return children;
}
