import { normalizeSearchText } from './drafting';

// La RMF y las RGCE se dividen en reglas; las demás leyes y reglamentos, en artículos.
const RULE_BASED_CODES = new Set(['RMF', 'RGCE']);

export function provisionCountLabel(lawCode: string, count: number): string {
  const ruleBased = RULE_BASED_CODES.has(lawCode.toUpperCase());
  const unit = ruleBased ? (count === 1 ? 'regla' : 'reglas') : (count === 1 ? 'artículo' : 'artículos');
  return `${count.toLocaleString('es-MX')} ${unit}`;
}

const KNOWN_LAW_CODES = new Set([
  'CCF', 'CCOM', 'LGSM', 'LGTOC', 'LIE', 'CNPCF',
  'CFF', 'LISR', 'RLISR', 'LIVA', 'RLIVA', 'RMF',
  'LFT',
  'LCE', 'RLCE', 'LA', 'RLA', 'RGCE', 'LIGIE', 'TIGIE',
]);

const LAW_NAME_TO_CODE: Array<[RegExp, string]> = [
  [/\bcodigo\s+civil\s+federal\b/, 'CCF'],
  [/\b(?:codigo\s+de\s+comercio|ccom)\b/, 'CCOM'],
  [/\bley\s+general\s+de\s+sociedades\s+mercantiles\b/, 'LGSM'],
  [/\bley\s+general\s+de\s+titulos\s+y\s+operaciones\s+de\s+credito\b/, 'LGTOC'],
  [/\bley\s+de\s+inversion\s+extranjera\b/, 'LIE'],
  [/\bcodigo\s+nacional\s+de\s+procedimientos\s+civiles\s+y\s+familiares\b/, 'CNPCF'],
  [/\bcodigo\s+fiscal\s+de\s+la\s+federacion\b/, 'CFF'],
  [/\breglamento\s+de\s+la\s+ley\s+del\s+impuesto\s+sobre\s+la\s+renta\b/, 'RLISR'],
  [/\bley\s+del\s+impuesto\s+sobre\s+la\s+renta\b/, 'LISR'],
  [/\breglamento\s+de\s+la\s+ley\s+del\s+impuesto\s+al\s+valor\s+agregado\b/, 'RLIVA'],
  [/\bley\s+del\s+impuesto\s+al\s+valor\s+agregado\b/, 'LIVA'],
  [/\bresolucion\s+miscelanea\s+fiscal\b/, 'RMF'],
  [/\bley\s+federal\s+del\s+trabajo\b/, 'LFT'],
  [/\breglamento\s+de\s+la\s+ley\s+de\s+comercio\s+exterior\b/, 'RLCE'],
  [/\bley\s+de\s+comercio\s+exterior\b/, 'LCE'],
  [/\breglamento\s+de\s+la\s+ley\s+aduanera\b/, 'RLA'],
  [/\bley\s+aduanera\b/, 'LA'],
  [/\breglas\s+generales\s+de\s+comercio\s+exterior\b/, 'RGCE'],
  [/\bley\s+de\s+los\s+impuestos\s+generales\s+de\s+importacion\s+y\s+de\s+exportacion\b/, 'LIGIE'],
  [/\btarifa\s+de\s+la\s+ley\s+de\s+los\s+impuestos\s+generales\b/, 'TIGIE'],
];

export function resolveLawCode(law: string | null | undefined): string | null {
  if (!law) return null;
  const trimmed = law.trim();
  if (!trimmed) return null;
  const upper = trimmed.toUpperCase();
  if (KNOWN_LAW_CODES.has(upper)) return upper;
  const normalized = normalizeSearchText(trimmed);
  if (!normalized || normalized === 'normativa local') return null;
  for (const [pattern, code] of LAW_NAME_TO_CODE) {
    if (pattern.test(normalized)) return code;
  }
  // "LA" sólo cuenta como Ley Aduanera cuando es el código completo (KNOWN_LAW_CODES) o el nombre explícito:
  // dentro de un nombre desconocido es el artículo "la" y abriría la ley equivocada.
  const codeMatch = trimmed.match(/\b(CCF|CCOM|CCom|LGSM|LGTOC|LIE|CNPCF|CFF|RLISR|LISR|RLIVA|LIVA|RMF|LFT|RLCE|LCE|RLA|RGCE|LIGIE|TIGIE)\b/);
  if (codeMatch) return codeMatch[1].toUpperCase();
  return null;
}
