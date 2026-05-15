/**
 * extract-strings.mjs
 * ─────────────────────────────────────────────────────────────
 * Extrae todos los strings visibles de la UI del CRM Metria.
 *
 * USO:
 *   1. Pon este archivo en la raíz del proyecto (junto a package.json)
 *   2. node extract-strings.mjs
 *   3. Se genera  strings-es.json  listo para traducir
 *
 * Requisitos: Node.js 18+  (no necesita instalar nada)
 * ─────────────────────────────────────────────────────────────
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, extname, relative } from 'path';

// ── Configuración ────────────────────────────────────────────
const ROOT = './src';           // carpeta fuente
const OUT  = './strings-es.json';
const EXTS = ['.tsx', '.ts', '.jsx', '.js'];

// Excluir archivos que no contienen texto de UI
const EXCLUDE_PATTERNS = [
  'database.types.ts',
  'types/index.ts',
  '.d.ts',
  'supabase.ts',
  'supabase-browser.ts',
  'supabase-admin.ts',
  'middleware.ts',
];

// ── Patrones de extracción ───────────────────────────────────
// Captura strings en JSX y en código TypeScript/JavaScript
const PATTERNS = [
  // JSX: texto entre etiquetas  <p>texto</p>  <h1>texto</h1>  <span>texto</span>
  />\s*([A-ZÁÉÍÓÚÑáéíóúñ][^<>{}\n]{2,80}?)\s*</g,

  // Atributos: placeholder="...", title="...", label="...", description="...", alt="..."
  /(?:placeholder|title|label|description|alt|aria-label|tooltip|heading|text)\s*=\s*["'`]([^"'`\n]{2,120})["'`]/g,

  // Strings sueltos en JS/TS: toast("..."), throw new Error("..."), console no
  /(?:toast|alert|confirm|title|message|label|description|text|heading|error|success|warning)\s*[(:=,]\s*["'`]([A-ZÁÉÍÓÚÑáéíóúñ][^"'`\n]{2,120})["'`]/g,

  // Objetos de traducción / constantes: { label: "...", title: "...", name: "..." }
  /(?:label|title|name|placeholder|description|text|heading|tooltip|btnText)\s*:\s*["'`]([A-ZÁÉÍÓÚÑáéíóúñ][^"'`\n]{2,120})["'`]/g,

  // Arrays de strings con texto español: ["Pendiente", "En curso", ...]
  /["'`]([A-ZÁÉÍÓÚÑ][a-záéíóúñA-ZÁÉÍÓÚÑ\s]{2,60})["'`]/g,
];

// ── Utilidades ───────────────────────────────────────────────
function getAllFiles(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      getAllFiles(fullPath, files);
    } else if (EXTS.includes(extname(entry))) {
      const isExcluded = EXCLUDE_PATTERNS.some(p => fullPath.includes(p));
      if (!isExcluded) files.push(fullPath);
    }
  }
  return files;
}

function isSpanish(str) {
  // Filtra: solo strings con caracteres españoles o palabras comunes
  const spanishChars = /[áéíóúñüÁÉÍÓÚÑÜ]/;
  const spanishWords = /\b(de|del|la|el|los|las|un|una|al|con|sin|por|para|que|en|es|son|hay|no|si|mi|tu|su|sus|mis|tus|nuevo|nueva|editar|crear|eliminar|guardar|cancelar|cerrar|volver|buscar|filtrar|añadir|ver|cargo|nombre|fecha|estado|tipo|zona|sector|finca|propiedad|agente|usuario|cliente|pedido|tarea|encargo|solicitud|orden|calendario|perfil|cuenta|contraseña|correo|error|éxito|cargando)\b/i;
  return spanishChars.test(str) || spanishWords.test(str);
}

function cleanString(str) {
  return str
    .replace(/\\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function toKey(str) {
  return str
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // quitar tildes
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .slice(0, 60);
}

// ── Extracción principal ─────────────────────────────────────
function extractFromFile(filePath) {
  const content = readFileSync(filePath, 'utf-8');
  const found = new Set();

  for (const pattern of PATTERNS) {
    const regex = new RegExp(pattern.source, pattern.flags);
    let match;
    while ((match = regex.exec(content)) !== null) {
      const str = cleanString(match[1]);
      if (
        str.length >= 2 &&
        str.length <= 120 &&
        isSpanish(str) &&
        !str.startsWith('//') &&
        !str.includes('${') &&    // no templates
        !str.includes('className') &&
        !str.includes('href') &&
        !str.match(/^[a-z][a-zA-Z]+$/) // no camelCase puro
      ) {
        found.add(str);
      }
    }
  }
  return [...found];
}

// ── Agrupación por módulo ────────────────────────────────────
function groupByModule(filePath, strings) {
  const rel = relative(ROOT, filePath).replace(/\\/g, '/');

  // Detectar módulo por ruta
  const moduleMap = {
    '(auth)': 'auth',
    'dashboard': 'dashboard',
    'zona': 'zonas',
    'sector': 'sectores',
    'finca': 'fincas',
    'propiedad': 'propiedades',
    'solicitud': 'solicitudes',
    'pedido': 'solicitudes',
    'orden': 'ordenes',
    'calendario': 'calendario',
    'desarrollo': 'desarrollo',
    'calculadora': 'calculadora',
    'usuario': 'usuarios',
    'cuenta': 'cuenta',
    'soporte': 'soporte',
    'layout': 'layout',
    'ui': 'ui',
    'dashboard/': 'dashboard',
  };

  let moduleName = 'comun';
  for (const [pattern, mod] of Object.entries(moduleMap)) {
    if (rel.includes(pattern)) {
      moduleName = mod;
      break;
    }
  }

  return { module: moduleName, strings };
}

// ── Main ─────────────────────────────────────────────────────
console.log('🔍 Buscando archivos en', ROOT, '...\n');
const files = getAllFiles(ROOT);
console.log(`📁 ${files.length} archivos encontrados\n`);

const result = {};
const duplicates = new Set();

for (const file of files) {
  const strings = extractFromFile(file);
  if (strings.length === 0) continue;

  const { module: moduleName } = groupByModule(file, strings);
  if (!result[moduleName]) result[moduleName] = {};

  for (const str of strings) {
    if (duplicates.has(str)) continue; // no duplicar entre módulos
    const key = toKey(str);
    if (!result[moduleName][key]) {
      result[moduleName][key] = str;
      duplicates.add(str);
    }
  }

  const rel = relative(ROOT, file);
  console.log(`  ✓ [${moduleName}]  ${rel}  (${strings.length} strings)`);
}

// Añadir metadatos al principio
const output = {
  _meta: {
    generado: new Date().toISOString(),
    idioma_origen: 'es',
    idioma_destino: '__ RELLENAR __',
    instrucciones: 'Traduce SOLO los valores. No toques las claves. Mantén {placeholders}.',
    total_strings: duplicates.size,
  },
  ...result,
};

writeFileSync(OUT, JSON.stringify(output, null, 2), 'utf-8');

console.log('\n────────────────────────────────────────');
console.log(`✅ Extracción completa`);
console.log(`📝 Total strings únicos: ${duplicates.size}`);
console.log(`📄 Guardado en: ${OUT}`);
console.log('────────────────────────────────────────\n');
console.log('Próximo paso:');
console.log('  1. Traduce los valores en strings-es.json');
console.log('  2. Guarda como strings-en.json (o el idioma que quieras)');
console.log('  3. Díselo a la IA para implementar next-intl o i18next\n');
