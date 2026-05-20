# React Doctor — Guía de uso en Metria

React Doctor es una herramienta de análisis estático que asigna un **health score (0-100)** al proyecto React/Next.js y genera diagnósticos accionables. No afecta al runtime ni a los usuarios.

Versión integrada: **0.2.1** · [Repositorio](https://github.com/millionco/react-doctor)

---

## Comandos disponibles

| Script | Qué hace |
|--------|----------|
| `pnpm doctor` | Escaneo interactivo de Metria CRM con score en consola |
| `pnpm doctor:json` | JSON completo a stdout (offline, sin red) — ideal para parsear |
| `pnpm doctor:diff` | Solo archivos modificados respecto a `main` (ideal antes de un PR) |
| `pnpm doctor:staged` | Solo archivos en el staging area de git |
| `pnpm doctor:openwa` | Escanea el proyecto OpenWA/dashboard por separado |
| `pnpm doctor:all` | Escanea todos los proyectos del monorepo |

Para guardar el JSON en un archivo:

```powershell
# Windows PowerShell
pnpm doctor:json | Out-File reports/react-doctor/metria.json -Encoding utf8

# bash / CI
pnpm doctor:json > reports/react-doctor/metria.json
```

La carpeta `reports/react-doctor/` está en `.gitignore` y no se commitea.

---

## Interpretación del score

| Rango | Estado | Acción recomendada |
|-------|--------|--------------------|
| 75–100 | **Great** | Mantener. Revisar warnings puntualmente. |
| 50–74 | **Needs work** | Priorizar errores. Planificar warnings. |
| 0–49 | **Critical** | Atención inmediata antes de nuevo feature work. |

**Fórmula:** `100 - (reglas_error_únicas × 1.5) - (reglas_warning_únicas × 0.75)`

El score cuenta **reglas únicas activadas**, no instancias totales. Arreglar todas las instancias de una regla mueve el score.

---

## Problemas detectados en el escaneo inicial (2026-05-20)

### Errores (afectan al score con ×1.5)

| Regla | Archivos afectados | Diagnóstico |
|-------|--------------------|-------------|
| `server-auth-actions` | `propiedades/actions.ts`, otros server actions del CRM | Los Server Actions no llaman explícitamente a `auth()/getSession()` al inicio. En Metria, la mayoría usa `getCurrentUserContext()` / `requirePageAccess()` — **revisar si la detección es un falso positivo** por el nombre de la función. |

### Warnings (afectan al score con ×0.75)

| Regla | Categoría | Descripción |
|-------|-----------|-------------|
| `server-sequential-independent-await` | Server | `await` secuenciales independientes — usar `Promise.all()` para paralelizarlos |
| `async-parallel` | Performance | Mismo patrón: 3+ awaits independientes en serie |
| `js-combine-iterations` | Performance | `.filter().map()` itera el array dos veces — unificar en un solo pase |
| `design-no-redundant-size-axes` | Architecture | `w-4 h-4` → `size-4` (shorthand Tailwind v3.4+, también válido en v4) |
| `click-events-have-key-events` | Accessibility | Elementos con `onClick` sin evento de teclado correspondiente |
| `label-has-associated-control` | Accessibility | `<label>` sin `htmlFor` o control asociado |

### Falsos positivos documentados

| Archivo | Regla | Por qué es falso positivo |
|---------|-------|--------------------------|
| `src/app/(auth)/login/actions.ts` | `server-auth-actions` | El propio login ES la acción pública de autenticación — no necesita auth previa. Suprimido en `react-doctor.config.json` para toda la carpeta `(auth)/`. |

---

## Plan de corrección sugerido

### Prioridad alta (errores reales, no falsos positivos)
1. **`server-auth-actions`** en server actions del CRM: verificar que todos llaman a `getCurrentUserContext()` al inicio, no al final. Si la función ya lo hace internamente, añadir suppressión explícita con comentario.

### Prioridad media (impacto real de rendimiento)
2. **`server-sequential-independent-await`**: En page.tsx con múltiples awaits independientes, envolver en `Promise.all([...])`. Ya hay varios en el proyecto que lo hacen bien (ver `/calendario/page.tsx`).
3. **`js-combine-iterations`**: En filtros + maps sobre arrays, usar `.reduce()` o `for...of` cuando el array puede ser grande.

### Prioridad baja (calidad / deuda técnica)
4. **`design-no-redundant-size-axes`**: Reemplazar `w-N h-N` por `size-N` cuando coinciden. Cambio mecánico sin riesgo.
5. **Accesibilidad**: Añadir `onKeyDown`/`onKeyUp` a elementos con `onClick`, y `htmlFor` a `<label>`. Afecta a usuarios de teclado y lectores de pantalla.

---

## Cómo suprimir un falso positivo

### A nivel de línea

```tsx
// react-doctor-disable-next-line server-auth-actions
export async function miServerAction() {
```

### A nivel de archivo (en el config)

```json
// react-doctor.config.json
{
  "ignore": {
    "overrides": [
      {
        "files": ["src/app/(auth)/**"],
        "rules": ["react-doctor/server-auth-actions"]
      }
    ]
  }
}
```

---

## CI / GitHub Actions

El workflow `.github/workflows/react-doctor.yml` corre en cada PR y en cada push a `main`.

**Fase actual (1): informativo**
- `fail-on: none` — nunca bloquea el deploy
- Publica anotaciones en el PR con los problemas detectados
- Escanea solo archivos modificados respecto a `main` (`diff: main`)

**Fase 2 (cuando el proyecto esté limpio):**
- Cambiar `fail-on: none` → `fail-on: error`
- Los errores sin suprimir bloquearán el merge

---

## Separación Metria vs OpenWA

react-doctor detecta automáticamente ambos proyectos en el monorepo. Para analizarlos por separado:

```powershell
pnpm doctor           # solo metria-crm
pnpm doctor:openwa    # solo OpenWA dashboard
pnpm doctor:all       # ambos
```

El `react-doctor.config.json` del raíz excluye `OpenWA/**` del análisis de Metria principal para evitar contaminación de resultados.
