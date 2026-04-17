"use client";

import { useState } from "react";
import {
  Calculator,
  Handshake,
  Landmark,
  Receipt,
  TrendingUp,
  ChevronRight,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = "cientifica" | "comision" | "hipoteca" | "plusvalia" | "rentabilidad";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number, decimals = 2): string {
  if (!isFinite(n) || isNaN(n)) return "—";
  return n.toLocaleString("es-ES", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function fmtEur(n: number): string {
  if (!isFinite(n) || isNaN(n)) return "—";
  return n.toLocaleString("es-ES", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  });
}

// ─── Result components ────────────────────────────────────────────────────────

function ResultRow({
  label,
  value,
  highlight,
  sublabel,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  sublabel?: string;
}) {
  if (highlight) {
    return (
      <div className="rounded-xl border border-primary/25 bg-primary/8 px-4 py-3.5">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-primary">{label}</span>
          <span className="text-lg font-bold text-primary">{value}</span>
        </div>
        {sublabel && <p className="mt-0.5 text-xs text-primary/70">{sublabel}</p>}
      </div>
    );
  }
  return (
    <div className="flex items-center justify-between rounded-lg bg-background px-4 py-3">
      <div>
        <span className="text-sm text-text-secondary">{label}</span>
        {sublabel && <p className="text-xs text-text-secondary/70">{sublabel}</p>}
      </div>
      <span className="text-sm font-semibold text-text-primary">{value}</span>
    </div>
  );
}

function ResultsCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-2 rounded-xl border border-border bg-surface p-1">
      {children}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
      {children}
    </p>
  );
}

function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-background px-4 py-3 text-xs leading-relaxed text-text-secondary">
      {children}
    </div>
  );
}

// ─── Scientific Calculator ────────────────────────────────────────────────────

const BUTTONS = [
  ["C", "±", "%", "÷"],
  ["7", "8", "9", "×"],
  ["4", "5", "6", "−"],
  ["1", "2", "3", "+"],
  ["0", ".", "="],
  ["sin", "cos", "tan", "√"],
  ["x²", "x³", "log", "ln"],
  ["π", "e", "(", ")"],
];

function evalExpr(expr: string): number {
  const e = expr
    .replace(/×/g, "*")
    .replace(/÷/g, "/")
    .replace(/−/g, "-")
    .replace(/π/g, String(Math.PI))
    .replace(/\be\b/g, String(Math.E));
  try {
    // eslint-disable-next-line no-new-func
    return Function(`"use strict"; return (${e})`)();
  } catch {
    return NaN;
  }
}

function ScientificCalc() {
  const [display, setDisplay] = useState("0");
  const [expr, setExpr] = useState("");
  const [justEvaled, setJustEvaled] = useState(false);

  function pressBtn(btn: string) {
    if (btn === "C") {
      setDisplay("0");
      setExpr("");
      setJustEvaled(false);
      return;
    }
    if (btn === "±") {
      setDisplay((d) => (d.startsWith("-") ? d.slice(1) : "-" + d));
      return;
    }
    if (btn === "=") {
      const full = expr + display;
      const result = evalExpr(full);
      setDisplay(isNaN(result) ? "Error" : String(parseFloat(result.toPrecision(12))));
      setExpr("");
      setJustEvaled(true);
      return;
    }

    const ops = ["+", "−", "×", "÷", "(", ")"];
    const isOp = ops.includes(btn);

    if (isOp) {
      setExpr(expr + display + btn);
      setDisplay("0");
      setJustEvaled(false);
      return;
    }

    const val = parseFloat(display);
    const fns: Record<string, () => number> = {
      sin: () => Math.sin((val * Math.PI) / 180),
      cos: () => Math.cos((val * Math.PI) / 180),
      tan: () => Math.tan((val * Math.PI) / 180),
      "√": () => Math.sqrt(val),
      "x²": () => val ** 2,
      "x³": () => val ** 3,
      log: () => Math.log10(val),
      ln: () => Math.log(val),
      "%": () => val / 100,
      π: () => Math.PI,
      e: () => Math.E,
    };
    if (fns[btn]) {
      const r = fns[btn]();
      setDisplay(String(parseFloat(r.toPrecision(12))));
      setJustEvaled(true);
      return;
    }

    if (justEvaled && !isOp) {
      setDisplay(btn === "." ? "0." : btn);
      setJustEvaled(false);
      return;
    }
    if (btn === ".") {
      if (!display.includes(".")) setDisplay(display + ".");
      return;
    }
    setDisplay(display === "0" ? btn : display + btn);
  }

  function btnClass(btn: string) {
    const base =
      "flex items-center justify-center rounded-xl text-sm font-medium transition-all active:scale-95 select-none cursor-pointer h-12 border";
    if (btn === "=")
      return `${base} bg-primary border-primary text-white hover:bg-primary-dark shadow-sm`;
    if (["÷", "×", "−", "+"].includes(btn))
      return `${base} border-accent/30 bg-accent/10 text-accent hover:bg-accent/20`;
    if (["C", "±", "%"].includes(btn))
      return `${base} border-border bg-background text-text-secondary hover:bg-border`;
    if (["sin","cos","tan","√","x²","x³","log","ln","π","e","(",")" ].includes(btn))
      return `${base} border-border bg-surface text-text-secondary hover:bg-background text-xs`;
    return `${base} border-border bg-surface text-text-primary hover:bg-background`;
  }

  return (
    <div className="mx-auto w-full max-w-sm">
      {/* Display */}
      <div className="mb-4 overflow-hidden rounded-2xl border border-border bg-background">
        <div className="px-5 pb-4 pt-3">
          <p className="h-5 truncate text-right text-xs text-text-secondary">{expr || " "}</p>
          <p className="mt-1 truncate text-right font-mono text-4xl font-light tracking-tight text-text-primary">
            {display}
          </p>
        </div>
        <div className="border-t border-border bg-surface px-4 py-2">
          <p className="text-right text-xs text-text-secondary">
            {expr ? `Expresión: ${expr}${display}` : "Listo"}
          </p>
        </div>
      </div>

      {/* Buttons */}
      <div className="space-y-1.5">
        {BUTTONS.map((row, ri) => (
          <div
            key={ri}
            className={`grid gap-1.5 ${row.length === 3 ? "grid-cols-3" : "grid-cols-4"}`}
          >
            {row.map((btn) => (
              <button key={btn} onClick={() => pressBtn(btn)} className={btnClass(btn)}>
                {btn}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Comisión ─────────────────────────────────────────────────────────────────

function ComisionCalc() {
  const [precioBase, setPrecioBase] = useState("");
  const [precioFinal, setPrecioFinal] = useState("");
  const [pct, setPct] = useState("5");
  const [modo, setModo] = useState<"base_a_final" | "final_a_base">("base_a_final");

  const p = parseFloat(pct) / 100;
  const base = parseFloat(precioBase.replace(/\./g, "").replace(",", "."));
  const final = parseFloat(precioFinal.replace(/\./g, "").replace(",", "."));

  const finalCalc = isNaN(base) ? null : base / (1 - p);
  const comEuros = finalCalc !== null ? finalCalc - base : null;
  const baseVerif = finalCalc !== null ? finalCalc * (1 - p) : null;

  const baseFromFinal = isNaN(final) ? null : final * (1 - p);
  const comFromFinal = baseFromFinal !== null ? final - baseFromFinal : null;

  return (
    <div className="space-y-6">
      <InfoBox>
        La comisión se calcula <strong className="text-text-primary">sobre el precio final</strong>,
        no sobre el base. La operación inversa siempre devuelve exactamente el precio original.
        <span className="mt-2 block font-mono text-xs text-text-primary">
          Precio final = Base ÷ (1 − %) · Verificación: Final × (1 − %) = Base ✓
        </span>
      </InfoBox>

      {/* Modo */}
      <div>
        <SectionLabel>Modo de cálculo</SectionLabel>
        <div className="mt-2 flex overflow-hidden rounded-xl border border-border">
          <button
            onClick={() => setModo("base_a_final")}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
              modo === "base_a_final"
                ? "bg-primary text-white"
                : "bg-surface text-text-secondary hover:bg-background"
            }`}
          >
            Base → Precio final
          </button>
          <button
            onClick={() => setModo("final_a_base")}
            className={`flex-1 border-l border-border py-2.5 text-sm font-medium transition-colors ${
              modo === "final_a_base"
                ? "bg-primary text-white"
                : "bg-surface text-text-secondary hover:bg-background"
            }`}
          >
            Final → Neto vendedor
          </button>
        </div>
      </div>

      {/* % comisión */}
      <div>
        <SectionLabel>Comisión (%)</SectionLabel>
        <div className="mt-2 flex flex-wrap gap-2">
          {["3", "4", "5", "6", "8", "10"].map((v) => (
            <button
              key={v}
              onClick={() => setPct(v)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                pct === v
                  ? "bg-primary text-white"
                  : "border border-border bg-surface text-text-secondary hover:bg-background"
              }`}
            >
              {v}%
            </button>
          ))}
          <input
            type="number"
            value={pct}
            onChange={(e) => setPct(e.target.value)}
            className="input w-20 text-center"
            min="0"
            max="100"
            step="0.1"
          />
        </div>
      </div>

      {modo === "base_a_final" ? (
        <>
          <div>
            <label className="text-xs font-medium text-text-secondary">
              Precio acordado con el vendedor (€)
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={precioBase}
              onChange={(e) => setPrecioBase(e.target.value)}
              placeholder="Ej: 300.000"
              className="input mt-1.5"
            />
          </div>

          {finalCalc !== null && (
            <div className="space-y-2">
              <SectionLabel>Resultado</SectionLabel>
              <ResultsCard>
                <ResultRow label="Precio al comprador" value={fmtEur(finalCalc)} highlight />
                <ResultRow label={`Comisión (${pct}% s/final)`} value={fmtEur(comEuros!)} />
                <ResultRow label="Neto para el vendedor" value={fmtEur(base)} />
              </ResultsCard>
              <div className="rounded-xl border border-success/30 bg-success/8 px-4 py-3">
                <p className="text-xs font-semibold text-success">Verificación inversa</p>
                <p className="mt-1 text-xs text-success/80">
                  {fmtEur(finalCalc)} × (1 − {pct}%) ={" "}
                  <strong className="text-success">{fmtEur(baseVerif!)}</strong> ✓
                </p>
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          <div>
            <label className="text-xs font-medium text-text-secondary">
              Precio final al comprador (€)
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={precioFinal}
              onChange={(e) => setPrecioFinal(e.target.value)}
              placeholder="Ej: 315.789"
              className="input mt-1.5"
            />
          </div>

          {baseFromFinal !== null && (
            <div className="space-y-2">
              <SectionLabel>Resultado</SectionLabel>
              <ResultsCard>
                <ResultRow label="Neto para el vendedor" value={fmtEur(baseFromFinal)} highlight />
                <ResultRow label={`Comisión (${pct}% s/final)`} value={fmtEur(comFromFinal!)} />
                <ResultRow label="Precio al comprador" value={fmtEur(final)} />
              </ResultsCard>
              <div className="rounded-xl border border-success/30 bg-success/8 px-4 py-3">
                <p className="text-xs font-semibold text-success">Verificación</p>
                <p className="mt-1 text-xs text-success/80">
                  {fmtEur(baseFromFinal)} + {fmtEur(comFromFinal!)} ={" "}
                  <strong className="text-success">{fmtEur(final)}</strong> ✓
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Hipoteca ─────────────────────────────────────────────────────────────────

function HipotecaCalc() {
  const [capital, setCapital] = useState("");
  const [anios, setAnios] = useState("30");
  const [tin, setTin] = useState("3.5");

  const C = parseFloat(capital.replace(/\./g, "").replace(",", "."));
  const n = parseInt(anios) * 12;
  const r = parseFloat(tin) / 100 / 12;

  const cuota =
    isNaN(C) || !r ? null : (C * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  const totalPagado = cuota ? cuota * n : null;
  const totalIntereses = totalPagado ? totalPagado - C : null;
  const pctIntereses = totalIntereses ? (totalIntereses / C) * 100 : null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label className="text-xs font-medium text-text-secondary">Capital (€)</label>
          <input
            type="text"
            inputMode="decimal"
            value={capital}
            onChange={(e) => setCapital(e.target.value)}
            placeholder="Ej: 150.000"
            className="input mt-1.5"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-text-secondary">Plazo (años)</label>
          <input
            type="number"
            value={anios}
            onChange={(e) => setAnios(e.target.value)}
            min="1"
            max="40"
            className="input mt-1.5"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-text-secondary">TIN (%)</label>
          <input
            type="number"
            value={tin}
            onChange={(e) => setTin(e.target.value)}
            min="0"
            step="0.1"
            className="input mt-1.5"
          />
        </div>
      </div>

      {cuota !== null && (
        <div className="space-y-2">
          <SectionLabel>Resultado</SectionLabel>
          <ResultsCard>
            <ResultRow
              label="Cuota mensual"
              value={fmtEur(cuota)}
              highlight
              sublabel={`Durante ${anios} años · ${n} cuotas`}
            />
            <ResultRow label="Total pagado" value={fmtEur(totalPagado!)} />
            <ResultRow label="Total intereses" value={fmtEur(totalIntereses!)} />
            <ResultRow
              label="Intereses sobre capital"
              value={`${fmt(pctIntereses!)}%`}
            />
          </ResultsCard>

          {/* Barra de desglose */}
          <div className="rounded-xl border border-border bg-background p-4">
            <p className="mb-3 text-xs font-medium text-text-secondary">Desglose del total pagado</p>
            <div className="overflow-hidden rounded-full bg-border">
              <div
                className="h-2.5 rounded-full bg-primary transition-all"
                style={{ width: `${(C / totalPagado!) * 100}%` }}
              />
            </div>
            <div className="mt-2 flex justify-between text-xs text-text-secondary">
              <span>Capital: {fmt((C / totalPagado!) * 100)}%</span>
              <span>Intereses: {fmt((totalIntereses! / totalPagado!) * 100)}%</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Plusvalía municipal ──────────────────────────────────────────────────────

function PlusvaliaCalc() {
  const [valorCatastral, setValorCatastral] = useState("");
  const [pctSuelo, setPctSuelo] = useState("60");
  const [aniosTenencia, setAniosTenencia] = useState("10");
  const [tipoGravamen, setTipoGravamen] = useState("30");

  const coeficientes: Record<number, number> = {
    1: 0.14, 2: 0.13, 3: 0.12, 4: 0.10, 5: 0.09,
    6: 0.08, 7: 0.08, 8: 0.08, 9: 0.08, 10: 0.08,
    11: 0.08, 12: 0.12, 13: 0.16, 14: 0.20, 15: 0.26,
    16: 0.36, 17: 0.46, 18: 0.56, 19: 0.65, 20: 0.75,
  };

  const vc = parseFloat(valorCatastral.replace(/\./g, "").replace(",", "."));
  const pSuelo = parseFloat(pctSuelo) / 100;
  const n = Math.min(Math.max(parseInt(aniosTenencia), 1), 20);
  const coef = coeficientes[n] ?? 0.08;
  const tipo = parseFloat(tipoGravamen) / 100;

  const baseImponible = isNaN(vc) ? null : vc * pSuelo * coef;
  const cuota = baseImponible !== null ? baseImponible * tipo : null;

  return (
    <div className="space-y-6">
      <InfoBox>
        Cálculo por el <strong className="text-text-primary">método objetivo</strong> (RDL 26/2021).
        Los coeficientes son orientativos; cada ayuntamiento puede aplicar los suyos propios.
      </InfoBox>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="text-xs font-medium text-text-secondary">Valor catastral total (€)</label>
          <input
            type="text"
            inputMode="decimal"
            value={valorCatastral}
            onChange={(e) => setValorCatastral(e.target.value)}
            placeholder="Ej: 80.000"
            className="input mt-1.5"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-text-secondary">% valor catastral del suelo</label>
          <input
            type="number"
            value={pctSuelo}
            onChange={(e) => setPctSuelo(e.target.value)}
            min="0"
            max="100"
            step="1"
            className="input mt-1.5"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-text-secondary">Años de tenencia (1–20)</label>
          <input
            type="number"
            value={aniosTenencia}
            onChange={(e) => setAniosTenencia(e.target.value)}
            min="1"
            max="20"
            className="input mt-1.5"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-text-secondary">Tipo de gravamen municipal (%)</label>
          <input
            type="number"
            value={tipoGravamen}
            onChange={(e) => setTipoGravamen(e.target.value)}
            min="0"
            max="100"
            step="0.5"
            className="input mt-1.5"
          />
        </div>
      </div>

      {baseImponible !== null && (
        <div className="space-y-2">
          <SectionLabel>Resultado</SectionLabel>
          <ResultsCard>
            <ResultRow label="Plusvalía a pagar" value={fmtEur(cuota!)} highlight />
            <ResultRow label="Base imponible" value={fmtEur(baseImponible)} />
            <ResultRow label={`Coeficiente (${aniosTenencia} años)`} value={String(coef)} />
          </ResultsCard>
        </div>
      )}
    </div>
  );
}

// ─── Rentabilidad ─────────────────────────────────────────────────────────────

function RentabilidadCalc() {
  const [precioCompra, setPrecioCompra] = useState("");
  const [gastosCompra, setGastosCompra] = useState("10");
  const [rentaMensual, setRentaMensual] = useState("");
  const [gastosAnuales, setGastosAnuales] = useState("");

  const pc = parseFloat(precioCompra.replace(/\./g, "").replace(",", "."));
  const gc = parseFloat(gastosCompra) / 100;
  const rm = parseFloat(rentaMensual.replace(/\./g, "").replace(",", "."));
  const ga = parseFloat(gastosAnuales.replace(/\./g, "").replace(",", ".")) || 0;

  const inversionTotal = isNaN(pc) ? null : pc * (1 + gc);
  const ingresosBrutos = isNaN(rm) ? null : rm * 12;
  const ingresosNetos = ingresosBrutos !== null ? ingresosBrutos - ga : null;
  const rentBruta =
    inversionTotal && ingresosBrutos ? (ingresosBrutos / inversionTotal) * 100 : null;
  const rentNeta =
    inversionTotal && ingresosNetos ? (ingresosNetos / inversionTotal) * 100 : null;
  const payback = rentNeta ? 100 / rentNeta : null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="text-xs font-medium text-text-secondary">Precio de compra (€)</label>
          <input
            type="text"
            inputMode="decimal"
            value={precioCompra}
            onChange={(e) => setPrecioCompra(e.target.value)}
            placeholder="Ej: 120.000"
            className="input mt-1.5"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-text-secondary">Gastos de compra (%)</label>
          <input
            type="number"
            value={gastosCompra}
            onChange={(e) => setGastosCompra(e.target.value)}
            min="0"
            step="0.5"
            className="input mt-1.5"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-text-secondary">Renta mensual (€)</label>
          <input
            type="text"
            inputMode="decimal"
            value={rentaMensual}
            onChange={(e) => setRentaMensual(e.target.value)}
            placeholder="Ej: 700"
            className="input mt-1.5"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-text-secondary">
            Gastos anuales (€)
          </label>
          <input
            type="text"
            inputMode="decimal"
            value={gastosAnuales}
            onChange={(e) => setGastosAnuales(e.target.value)}
            placeholder="IBI, comunidad, seguros…"
            className="input mt-1.5"
          />
        </div>
      </div>

      {inversionTotal !== null && ingresosBrutos !== null && (
        <div className="space-y-2">
          <SectionLabel>Resultado</SectionLabel>
          <ResultsCard>
            <ResultRow
              label="Rentabilidad bruta"
              value={`${fmt(rentBruta!)}%`}
              highlight
              sublabel="Antes de gastos operativos"
            />
            {ga > 0 && (
              <ResultRow
                label="Rentabilidad neta"
                value={`${fmt(rentNeta!)}%`}
                highlight
                sublabel="Después de gastos"
              />
            )}
            <ResultRow label="Inversión total (con gastos)" value={fmtEur(inversionTotal)} />
            <ResultRow label="Ingresos brutos anuales" value={fmtEur(ingresosBrutos)} />
            {ga > 0 && (
              <ResultRow label="Ingresos netos anuales" value={fmtEur(ingresosNetos!)} />
            )}
            {payback && (
              <ResultRow label="Payback estimado" value={`${fmt(payback, 1)} años`} />
            )}
          </ResultsCard>
        </div>
      )}
    </div>
  );
}

// ─── Tab config ───────────────────────────────────────────────────────────────

const TABS: {
  id: Tab;
  label: string;
  description: string;
  Icon: React.ElementType;
}[] = [
  {
    id: "comision",
    label: "Comisión",
    description: "Precio transparente con comisión",
    Icon: Handshake,
  },
  {
    id: "hipoteca",
    label: "Hipoteca",
    description: "Cuota mensual y coste total",
    Icon: Landmark,
  },
  {
    id: "plusvalia",
    label: "Plusvalía",
    description: "Impuesto municipal sobre venta",
    Icon: Receipt,
  },
  {
    id: "rentabilidad",
    label: "Rentabilidad",
    description: "Análisis de inversión en alquiler",
    Icon: TrendingUp,
  },
  {
    id: "cientifica",
    label: "Científica",
    description: "Calculadora de uso general",
    Icon: Calculator,
  },
];

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function CalculadoraClient() {
  const [tab, setTab] = useState<Tab>("comision");
  const active = TABS.find((t) => t.id === tab)!;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_1fr]">
      {/* Sidebar */}
      <div className="rounded-2xl border border-border bg-surface shadow-sm lg:self-start">
        <div className="border-b border-border px-4 py-3.5">
          <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
            Herramientas
          </p>
        </div>
        <nav className="flex flex-row flex-wrap gap-1 p-2 lg:flex-col">
          {TABS.map((t) => {
            const Icon = t.Icon;
            const isActive = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                  isActive
                    ? "bg-primary/10"
                    : "hover:bg-background"
                }`}
              >
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
                    isActive
                      ? "bg-primary text-white shadow-sm"
                      : "bg-background text-text-secondary"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="hidden min-w-0 lg:block">
                  <p className={`text-sm font-medium leading-tight ${isActive ? "text-primary" : "text-text-primary"}`}>
                    {t.label}
                  </p>
                  <p className="mt-0.5 truncate text-xs leading-tight text-text-secondary">{t.description}</p>
                </div>
                <span className="lg:hidden text-sm font-medium text-text-primary">{t.label}</span>
                {isActive && <ChevronRight className="ml-auto hidden h-3.5 w-3.5 shrink-0 text-primary lg:block" />}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Content */}
      <div className="rounded-2xl border border-border bg-surface shadow-sm">
        <div className="border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <active.Icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-text-primary">{active.label}</h2>
              <p className="text-xs text-text-secondary">{active.description}</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          {tab === "cientifica"   && <ScientificCalc />}
          {tab === "comision"     && <ComisionCalc />}
          {tab === "hipoteca"     && <HipotecaCalc />}
          {tab === "plusvalia"    && <PlusvaliaCalc />}
          {tab === "rentabilidad" && <RentabilidadCalc />}
        </div>
      </div>
    </div>
  );
}
