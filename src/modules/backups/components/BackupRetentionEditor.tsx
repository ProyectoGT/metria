import { Archive } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function BackupRetentionEditor() {
  return (
    <Card padding="lg" className="space-y-4">
      <div className="flex items-center gap-3">
        <Archive className="h-5 w-5 text-primary" />
        <div>
          <p className="text-sm font-semibold text-text-primary">Politica de retencion</p>
          <p className="text-xs text-text-secondary">Preparada para no romper cadenas incrementales ni borrar el ultimo backup valido.</p>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Incrementales (dias)" value="30" />
        <Field label="Totales semanales" value="12" />
        <Field label="Totales mensuales" value="12" />
        <Field label="Totales anuales" value="7" />
      </div>
    </Card>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <label className="space-y-1.5">
      <span className="text-xs font-medium text-text-secondary">{label}</span>
      <Input value={value} readOnly />
    </label>
  );
}
