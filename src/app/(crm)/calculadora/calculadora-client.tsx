"use client";

import { useState, useCallback } from "react";

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
  return n.toLocaleString("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 2 });
}

// ─── Scientific Calculator ─────────────────────────────────────────────────────

const BUTTONS = [
  ["C", "±", "%", "÷"],
  ["7", "8", "9", "×"],
  ["4", "5", "6", "−"],
  ["1", "2", "3", "+"],
  ["0", ".", "="],
  // Extra row: scientific
  ["sin", "cos", "tan", "√"],
  ["x²", "x³", "log", "ln"],
  ["π", "e", "(", ")"],
];

function evalExpr(expr: string): number {
  // Replace display symbols with JS operators
  let e = expr
    .replace(/×/g, "*")
    .replace(/÷/g, "/")
    .replace(/−/g, "-")
    .replace(/π/g, String(Math.PI))
    .replace(/\be\b/g, String(Math.E));
  // eslint-disable-next-line no-new-func
  try { return Function(`"use strict"; return (${e})`)(); }
  catch { return NaN; }
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
      setDisplay((d) => d.startsWith("-") ? d.slice(1) : "-" + d);
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

    // Scientific functions
    const val = parseFloat(display);
    const fns: Record<string, () => number> = {
      "sin": () => Math.sin((val * Math.PI) / 180),
      "cos": () => Math.cos((val * Math.PI) / 180),
      "tan": () => Math.tan((val * Math.PI) / 180),
      "√":   () => Math.sqrt(val),
      "x²":  () => val ** 2,
      "x³":  () => val ** 3,
      "log": () => Math.log10(val),
      "ln":  () => Math.log(val),
      "%":   () => val / 100,
      "π":   () => Math.PI,
      "e":   () => Math.E,
    };
    if (fns[btn]) {
      const r = fns[btn]();
      setDisplay(String(parseFloat(r.toPrecision(12))));
      setJustEvaled(true);
      return;
    }

    // Digits and dot
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

  const btnClass = (btn: string) => {
    const base = "flex items-center justify-center rounded-xl text-sm font-medium transition-all active:scale-95 select-none cursor-pointer h-11";
    if (btn === "=") return `${base} col-span-1 bg-primary text-white hover:bg-primary-dark shadow-sm`;
    if (["÷", "×", "−", "+"].includes(btn)) return `${base} bg-amber-100 text-amber-700 hover:bg-amber-200`;
    if (["C", "±", "%"].includes(btn)) return `${base} bg-surface border border-border text-text-secondary hover:bg-background`;
    if (["sin","cos","tan","√","x²","x³","log","ln","π","e","(",")" ].includes(btn))
      return `${base} bg-violet-50 text-violet-700 hover:bg-violet-100 text-xs`;
    return `${base} bg-background text-text-primary hover:bg-border`;
  };

  return (
    <div className="mx-auto w-full max-w-xs">
      {/* Display */}
      <div className="mb-3 rounded-2xl bg-[#1a1a2e] p-4 text-right">
        <p className="truncate text-xs text-gray-500 h-4">{expr}</p>
        <p className="mt-1 text-3xl font-light tracking-tight text-white truncate">
          {display}
        </p>
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

// ─── Comisión Transparente ─────────────────────────────────────────────────────
// Fórmula: precio_final = precio_base / (1 - comision%)
// Inversa: precio_base  = precio_final × (1 - comision%)
// De este modo: precio_final × (1 - %) = precio_base exacto ✓

function ComisionCalc() {
  const [precioBase, setPrecioBase] = useState("");
  const [precioFinal, setPrecioFinal] = useState("");
  const [pct, setPct] = useState("5");
  const [modo, setModo] = useState<"base_a_final" | "final_a_base">("base_a_final");

  const p = parseFloat(pct) / 100;
  const base = parseFloat(precioBase.replace(/\./g, "").replace(",", "."));
  const final = parseFloat(precioFinal.replace(/\./g, "").replace(",", "."));

  // Cálculos directos
  const finalCalc  = isNaN(base)  ? null : base / (1 - p);
  const comEuros   = finalCalc    !== null ? finalCalc - base : null;

  // Cálculo inverso (verificación)
  const baseVerif  = finalCalc    !== null ? finalCalc * (1 - p) : null;

  // Modo inverso: a partir del precio final, ¿cuánto recibe el vendedor?
  const baseFromFinal  = isNaN(final) ? null : final * (1 - p);
  const comFromFinal   = baseFromFinal !== null ? final - baseFromFinal : null;

  return (
    <div className="space-y-6">
      {/* Explicación */}
      <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4">
        <p className="text-sm font-semibold text-violet-800">¿Cómo funciona?</p>
        <p className="mt-1 text-xs text-violet-700 leading-relaxed">
          La comisión se calcula <strong>sobre el precio final</strong>, no sobre el base.
          Así, la operación inversa siempre devuelve exactamente el precio original —
          el cliente puede verificarlo sin sorpresas.
        </p>
        <p className="mt-2 font-mono text-xs text-violet-600 bg-violet-100 rounded-lg px-3 py-1.5">
          Precio final = Base ÷ (1 − %)<br />
          Verificación: Final × (1 − %) = Base ✓
        </p>
      </div>

      {/* Modo */}
      <div className="flex overflow-hidden rounded-xl border border-border">
        <button
          onClick={() => setModo("base_a_final")}
          className={`flex-1 py-2.5 text-sm font-medium transition-colors ${modo === "base_a_final" ? "bg-primary text-white" : "bg-surface text-text-secondary hover:bg-background"}`}
        >
          Base → Precio final
        </button>
        <button
          onClick={() => setModo("final_a_base")}
          className={`flex-1 border-l border-border py-2.5 text-sm font-medium transition-colors ${modo === "final_a_base" ? "bg-primary text-white" : "bg-surface text-text-secondary hover:bg-background"}`}
        >
          Final → ¿Qué recibe?
        </button>
      </div>

      {/* % de comisión */}
      <div>
        <label className="text-xs font-medium text-text-secondary">Comisión (%)</label>
        <div className="mt-1.5 flex gap-2">
          {["3", "4", "5", "6", "8", "10"].map((v) => (
            <button
              key={v}
              onClick={() => setPct(v)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${pct === v ? "bg-primary text-white" : "bg-surface border border-border text-text-secondary hover:bg-background"}`}
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
          {/* Precio base */}
          <div>
            <label className="text-xs font-medium text-text-secondary">
              Precio acordado con el vendedor (€)
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={precioBase}
              onChange={(e) => setPrecioBase(e.target.value)}
              placeholder="Ej: 30000"
              className="input mt-1.5"
            />
          </div>

          {/* Resultados */}
          {finalCalc !== null && (
            <div className="space-y-3">
              <ResultRow label="Precio al comprador" value={fmtEur(finalCalc)} highlight />
              <ResultRow label={`Comisión (${pct}% sobre el final)`} value={fmtEur(comEuros!)} />
              <ResultRow label="Neto para el vendedor" value={fmtEur(base)} />

              {/* Verificación */}
              <div className="rounded-xl border border-green-200 bg-green-50 p-3">
                <p className="text-xs font-semibold text-green-700">✓ Verificación inversa</p>
                <p className="mt-1 text-xs text-green-600">
                  {fmtEur(finalCalc)} × (1 − {pct}%) = <strong>{fmtEur(baseVerif!)}</strong>
                  {" "}— coincide exactamente con el precio base
                </p>
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          {/* Precio final */}
          <div>
            <label className="text-xs font-medium text-text-secondary">
              Precio final al comprador (€)
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={precioFinal}
              onChange={(e) => setPrecioFinal(e.target.value)}
              placeholder="Ej: 31578.95"
              className="input mt-1.5"
            />
          </div>

          {baseFromFinal !== null && (
            <div className="space-y-3">
              <ResultRow label="Neto para el vendedor" value={fmtEur(baseFromFinal)} highlight />
              <ResultRow label={`Comisión (${pct}% sobre el final)`} value={fmtEur(comFromFinal!)} />
              <ResultRow label="Precio al comprador" value={fmtEur(final)} />

              <div className="rounded-xl border border-green-200 bg-green-50 p-3">
                <p className="text-xs font-semibold text-green-700">✓ Verificación</p>
                <p className="mt-1 text-xs text-green-600">
                  {fmtEur(baseFromFinal)} + {fmtEur(comFromFinal!)} = <strong>{fmtEur(final)}</strong>
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
  const [capital, setCapital]   = useState("");
  const [anios, setAnios]       = useState("30");
  const [tin, setTin]           = useState("3.5");

  const C = parseFloat(capital.replace(/\./g, "").replace(",", "."));
  const n = parseInt(anios) * 12;
  const r = parseFloat(tin) / 100 / 12;

  const cuota = isNaN(C) || !r ? null : (C * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  const totalPagado = cuota ? cuota * n : null;
  const totalIntereses = totalPagado ? totalPagado - C : null;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label className="text-xs font-medium text-text-secondary">Capital (€)</label>
          <input type="text" inputMode="decimal" value={capital}
            onChange={(e) => setCapital(e.target.value)}
            placeholder="Ej: 150000" className="input mt-1.5" />
        </div>
        <div>
          <label className="text-xs font-medium text-text-secondary">Plazo (años)</label>
          <input type="number" value={anios} onChange={(e) => setAnios(e.target.value)}
            min="1" max="40" className="input mt-1.5" />
        </div>
        <div>
          <label className="text-xs font-medium text-text-secondary">TIN (%)</label>
          <input type="number" value={tin} onChange={(e) => setTin(e.target.value)}
            min="0" step="0.1" className="input mt-1.5" />
        </div>
      </div>

      {cuota !== null && (
        <div className="space-y-3">
          <ResultRow label="Cuota mensual" value={fmtEur(cuota)} highlight />
          <ResultRow label="Total pagado" value={fmtEur(totalPagado!)} />
          <ResultRow label="Total intereses" value={fmtEur(totalIntereses!)} />
          <ResultRow label="% intereses sobre capital" value={`${fmt((totalIntereses! / C) * 100)}%`} />
        </div>
      )}
    </div>
  );
}

// ─── Plusvalía municipal ───────────────────────────────────────────────────────

function PlusvaliaCalc() {
  const [valorCatastral, setValorCatastral] = useState("");
  const [pctSuelo, setPctSuelo]             = useState("60");
  const [aniosTenencia, setAniosTenencia]   = useState("10");
  const [tipoGravamen, setTipoGravamen]     = useState("30");

  // Método objetivo (RDL 26/2021)
  // Coeficientes oficiales (aproximados) por años de tenencia
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
    <div className="space-y-5">
      <p className="text-xs text-text-secondary">
        Cálculo por el <strong>método objetivo</strong> (RDL 26/2021). Los coeficientes son orientativos;
        cada ayuntamiento puede aplicar los suyos propios.
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="text-xs font-medium text-text-secondary">Valor catastral total (€)</label>
          <input type="text" inputMode="decimal" value={valorCatastral}
            onChange={(e) => setValorCatastral(e.target.value)}
            placeholder="Ej: 80000" className="input mt-1.5" />
        </div>
        <div>
          <label className="text-xs font-medium text-text-secondary">% valor catastral del suelo</label>
          <input type="number" value={pctSuelo} onChange={(e) => setPctSuelo(e.target.value)}
            min="0" max="100" step="1" className="input mt-1.5" />
        </div>
        <div>
          <label className="text-xs font-medium text-text-secondary">Años de tenencia (1–20)</label>
          <input type="number" value={aniosTenencia} onChange={(e) => setAniosTenencia(e.target.value)}
            min="1" max="20" className="input mt-1.5" />
        </div>
        <div>
          <label className="text-xs font-medium text-text-secondary">Tipo de gravamen municipal (%)</label>
          <input type="number" value={tipoGravamen} onChange={(e) => setTipoGravamen(e.target.value)}
            min="0" max="100" step="0.5" className="input mt-1.5" />
        </div>
      </div>

      {baseImponible !== null && (
        <div className="space-y-3">
          <ResultRow label={`Coeficiente para ${aniosTenencia} años`} value={`${coef}`} />
          <ResultRow label="Base imponible" value={fmtEur(baseImponible)} />
          <ResultRow label="Plusvalía a pagar" value={fmtEur(cuota!)} highlight />
        </div>
      )}
    </div>
  );
}

// ─── Rentabilidad ─────────────────────────────────────────────────────────────

function RentabilidadCalc() {
  const [precioCompra, setPrecioCompra]   = useState("");
  const [gastosCompra, setGastosCompra]   = useState("10");
  const [rentaMensual, setRentaMensual]   = useState("");
  const [gastosAnuales, setGastosAnuales] = useState("");

  const pc = parseFloat(precioCompra.replace(/\./g, "").replace(",", "."));
  const gc = parseFloat(gastosCompra) / 100;
  const rm = parseFloat(rentaMensual.replace(/\./g, "").replace(",", "."));
  const ga = parseFloat(gastosAnuales.replace(/\./g, "").replace(",", ".")) || 0;

  const inversionTotal = isNaN(pc) ? null : pc * (1 + gc);
  const ingresosBrutos = isNaN(rm) ? null : rm * 12;
  const ingresosNetos  = ingresosBrutos !== null ? ingresosBrutos - ga : null;
  const rentBruta      = inversionTotal && ingresosBrutos ? (ingresosBrutos / inversionTotal) * 100 : null;
  const rentNeta       = inversionTotal && ingresosNetos  ? (ingresosNetos  / inversionTotal) * 100 : null;
  const payback        = rentNeta ? 100 / rentNeta : null;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="text-xs font-medium text-text-secondary">Precio de compra (€)</label>
          <input type="text" inputMode="decimal" value={precioCompra}
            onChange={(e) => setPrecioCompra(e.target.value)}
            placeholder="Ej: 120000" className="input mt-1.5" />
        </div>
        <div>
          <label className="text-xs font-medium text-text-secondary">Gastos de compra (%)</label>
          <input type="number" value={gastosCompra} onChange={(e) => setGastosCompra(e.target.value)}
            min="0" step="0.5" className="input mt-1.5" />
        </div>
        <div>
          <label className="text-xs font-medium text-text-secondary">Renta mensual (€)</label>
          <input type="text" inputMode="decimal" value={rentaMensual}
            onChange={(e) => setRentaMensual(e.target.value)}
            placeholder="Ej: 700" className="input mt-1.5" />
        </div>
        <div>
          <label className="text-xs font-medium text-text-secondary">Gastos anuales (€)</label>
          <input type="text" inputMode="decimal" value={gastosAnuales}
            onChange={(e) => setGastosAnuales(e.target.value)}
            placeholder="IBI, comunidad, seguros…" className="input mt-1.5" />
        </div>
      </div>

      {inversionTotal !== null && ingresosBrutos !== null && (
        <div className="space-y-3">
          <ResultRow label="Inversión total (con gastos)" value={fmtEur(inversionTotal)} />
          <ResultRow label="Ingresos brutos anuales" value={fmtEur(ingresosBrutos)} />
          {ga > 0 && <ResultRow label="Ingresos netos anuales" value={fmtEur(ingresosNetos!)} />}
          <ResultRow label="Rentabilidad bruta" value={`${fmt(rentBruta!)}%`} highlight />
          {ga > 0 && <ResultRow label="Rentabilidad neta" value={`${fmt(rentNeta!)}%`} highlight />}
          {payback && <ResultRow label="Payback (años)" value={`${fmt(payback, 1)} años`} />}
        </div>
      )}
    </div>
  );
}

// ─── Shared: Result Row ────────────────────────────────────────────────────────

function ResultRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`flex items-center justify-between rounded-xl px-4 py-3 ${highlight ? "bg-primary/8 border border-primary/20" : "bg-background"}`}>
      <span className="text-sm text-text-secondary">{label}</span>
      <span className={`text-sm font-semibold ${highlight ? "text-primary" : "text-text-primary"}`}>
        {value}
      </span>
    </div>
  );
}

// ─── Tab config ───────────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "cientifica",    label: "Científica",    icon: "🔢" },
  { id: "comision",      label: "Comisión",       icon: "🤝" },
  { id: "hipoteca",      label: "Hipoteca",       icon: "🏦" },
  { id: "plusvalia",     label: "Plusvalía",      icon: "📋" },
  { id: "rentabilidad",  label: "Rentabilidad",   icon: "📈" },
];

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function CalculadoraClient() {
  const [tab, setTab] = useState<Tab>("comision");

  return (
    <div className="flex flex-col gap-6">
      {/* Tab bar */}
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={[
              "flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all",
              tab === t.id
                ? "bg-primary text-white shadow-sm"
                : "bg-surface border border-border text-text-secondary hover:bg-background",
            ].join(" ")}
          >
            <span>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* Panel */}
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
        {tab === "cientifica"   && <ScientificCalc />}
        {tab === "comision"     && <ComisionCalc />}
        {tab === "hipoteca"     && <HipotecaCalc />}
        {tab === "plusvalia"    && <PlusvaliaCalc />}
        {tab === "rentabilidad" && <RentabilidadCalc />}
      </div>
    </div>
  );
}
