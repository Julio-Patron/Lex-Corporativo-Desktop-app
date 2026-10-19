import type { LegalModule } from './prompts';

export interface ExpandedLegalQuery {
  original: string;
  evidence: string;
  canonical: string;
  retrieval: string;
  addedTerms: string[];
}

export interface RelatedArticleReference {
  law_code: string;
  article_number: string;
  query: string;
}

export interface RelatedCorpusQuery {
  query: string;
  label: string;
  kind: 'cross_reference' | 'topic';
}

function normalize(value: string): string {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s.-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function correctFrequentInputErrors(value: string): string {
  return value
    .replace(/\btrabajadadores\b/gi, 'trabajadores')
    .replace(/\btrabajadadoras\b/gi, 'trabajadoras')
    .replace(/\bresicion\b/gi, 'rescision')
    .replace(/\bpresataciones\b/gi, 'prestaciones')
    .replace(/\bmercanti\b/gi, 'mercantil');
}

function add(target: Set<string>, ...terms: string[]): void {
  for (const term of terms) target.add(term);
}

/**
 * Expands short, natural-language searches with a small controlled legal
 * vocabulary. It never invents a law or article number; the corrected query
 * and these module-scoped terms are also used by the local evidence gate.
 */
export function expandLegalQuery(query: string, module: LegalModule | 'todos'): ExpandedLegalQuery {
  const original = String(query || '').trim();
  const evidence = correctFrequentInputErrors(original);
  const canonical = normalize(evidence);
  const added = new Set<string>();

  if (module === 'laboral' || module === 'todos') {
    if (/\b(?:trabajador\w*|emplead\w*)\b.*\b(?:hogar|domestic\w*)\b|\b(?:hogar|domestic\w*)\b.*\b(?:trabajador\w*|emplead\w*)\b/.test(canonical)) {
      add(added, 'personas trabajadoras del hogar', 'trabajo del hogar', 'empleo domestico');
    }
    if (/\bprestacion\w*\b/.test(canonical)) {
      add(added, 'prestaciones laborales', 'aguinaldo', 'vacaciones', 'prima vacacional', 'seguridad social');
    }
    if (/\brescisi\w*\b|\bdespid\w*\b/.test(canonical)) add(added, 'rescision relacion trabajo', 'aviso de rescision');
    if (/\bjornada\w*\b|\bhoras? extra\w*\b/.test(canonical)) add(added, 'jornada de trabajo', 'tiempo extraordinario');
    if (/\bfiniquit\w*\b|\bliquidaci\w*\b|\bindemnizaci\w*\b/.test(canonical)) {
      add(added, 'indemnizacion constitucional', 'prima de antiguedad', 'salarios vencidos');
    }
    if (/\bptu\b|\butilidad\w*\b/.test(canonical)) add(added, 'participacion de los trabajadores en las utilidades');
  }

  if (module === 'mercantil' || module === 'mercantil_analysis' || module === 'todos') {
    if (/\bpagar[eé]\b/.test(canonical)) add(added, 'titulo de credito', 'requisitos del pagare');
    if (/\bendos\w*\b/.test(canonical)) add(added, 'endoso titulo de credito');
    if (/\baval\w*\b/.test(canonical)) add(added, 'aval titulo de credito', 'garantia cambiaria');
    if (/\bchequ\w*\b/.test(canonical)) add(added, 'titulo de credito', 'presentacion y pago del cheque');
    if (/\basamblea\w*\b|\baccionista\w*\b/.test(canonical)) add(added, 'asamblea de accionistas', 'sociedad mercantil');
    if (/\bsociedad\w*\b|\bconstitutiv\w*\b/.test(canonical)) add(added, 'sociedad mercantil', 'escritura constitutiva');
    if (/\bdisoluci\w*\b|\bliquidaci\w*\b/.test(canonical)) add(added, 'disolucion de las sociedades', 'liquidacion de las sociedades');
  }

  if (module === 'fiscal' || module === 'todos') {
    if (/\bcfdi\b|\bcomprobante\w*\b/.test(canonical)) add(added, 'comprobante fiscal digital', 'requisitos fiscales');
    if (/\bdeducci\w*\b|\bdeducible\w*\b/.test(canonical)) add(added, 'deducciones autorizadas', 'requisitos de deduccion');
    if (/\biva\b|\bacredita\w*\b/.test(canonical)) add(added, 'impuesto al valor agregado', 'acreditamiento del impuesto');
    if (/\b69[ -]?b\b|\boperacion\w* inexistente\w*\b|\bmaterialidad\b/.test(canonical)) {
      add(added, 'presuncion de operaciones inexistentes', 'comprobantes fiscales');
    }
    if (/\brazon de negocio\w*\b|\b5[ -]?a\b/.test(canonical)) add(added, 'razon de negocios', 'beneficio economico razonable');
  }

  if (module === 'comercio_exterior' || module === 'todos') {
    if (/\borigen\b|\bcertificad\w*\b/.test(canonical)) add(added, 'certificado de origen', 'reglas de origen');
    if (/\bno arancelari\w*\b|\bpermiso\w*\b/.test(canonical)) add(added, 'regulaciones y restricciones no arancelarias', 'permiso previo');
    if (/\bcuota\w*\b|\bpractica\w* desleal\w*\b/.test(canonical)) add(added, 'cuota compensatoria', 'practicas desleales de comercio internacional');
  }

  if (module === 'aduanal' || module === 'todos') {
    if (/\bpedimento\w*\b/.test(canonical)) add(added, 'despacho aduanero', 'documentos del pedimento');
    if (/\bvalor\b|\bincrementable\w*\b/.test(canonical)) add(added, 'valor en aduana', 'valor de transaccion', 'incrementables');
    if (/\bpama\b|\bembargo\w*\b/.test(canonical)) add(added, 'procedimiento administrativo en materia aduanera', 'embargo precautorio');
    if (/\bfraccion\w*\b|\barancel\w*\b/.test(canonical)) add(added, 'fraccion arancelaria', 'tarifa de importacion y exportacion');
    if (/\brectificaci\w*\b/.test(canonical)) add(added, 'rectificacion de datos del pedimento');
  }

  for (const phrase of [...added]) {
    if (canonical.includes(phrase)) added.delete(phrase);
  }

  const addedTerms = [...added];
  return {
    original,
    evidence,
    canonical,
    retrieval: [canonical, ...addedTerms].filter(Boolean).join(' '),
    addedTerms,
  };
}

function cleanArticleIdentifier(raw: string): string {
  return raw
    .trim()
    .replace(/\s*-\s*/g, '-')
    .replace(/\s+/g, ' ')
    .replace(/\b(bis|ter|qu[aá]ter|quinquies|sexies|septies|octies|nonies)\b/i, (m) => (
      m.charAt(0).toUpperCase() + m.slice(1).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    ));
}

/**
 * Extracts explicit statutory cross-references (e.g. "artículo 171", "artículos 77, 79",
 * "regla 2.7.1.32") mentioned inside a retrieved provision's text so the user can
 * navigate to correlated articles within the corpus.
 */
export function extractCrossReferencedProvisions(
  lawCode: string | undefined,
  currentArticle: string | undefined,
  content: string,
  maxRefs = 4,
): RelatedArticleReference[] {
  const code = String(lawCode || '').trim().toUpperCase();
  if (!code || !content) return [];

  const selfId = String(currentArticle || '')
    .match(/\d+(?:\.\d+){0,3}(?:\s*-\s*[A-Za-z]+)?(?:\s+(?:Bis|Ter|Qu[aá]ter|Quinquies|Sexies|Septies|Octies|Nonies))?/i)?.[0]
    ?.replace(/\s+/g, '')
    .toUpperCase() || '';

  const found = new Map<string, RelatedArticleReference>();
  const isRuleLaw = code === 'RMF' || code === 'RGCE';

  // Match single or plural article/rule mentions
  const articleRegex = /\b(?:art[ií]culos?|arts?\.?|reglas?)\s+(\d+(?:\.\d+){0,3}(?:\s*-\s*[A-Za-z]+)?(?:\s+(?:Bis|Ter|Qu[aá]ter|Quinquies|Sexies|Septies|Octies|Nonies))?(?:\s*(?:,|y|o|al)\s*\d+(?:\.\d+){0,3}(?:\s*-\s*[A-Za-z]+)?(?:\s+(?:Bis|Ter|Qu[aá]ter|Quinquies|Sexies|Septies|Octies|Nonies))?)*)/giu;
  const idTokenRegex = /\d+(?:\.\d+){0,3}(?:\s*-\s*[A-Za-z]+)?(?:\s+(?:Bis|Ter|Qu[aá]ter|Quinquies|Sexies|Septies|Octies|Nonies))?/giu;

  for (const match of content.matchAll(articleRegex)) {
    const rawGroup = match[1] || '';
    const prefix = /^regla/i.test(match[0]) || isRuleLaw ? 'Regla' : 'Artículo';
    const tokens = rawGroup.match(idTokenRegex) || [];
    for (const token of tokens) {
      const cleaned = cleanArticleIdentifier(token);
      const normKey = cleaned.replace(/\s+/g, '').toUpperCase();
      if (!normKey || normKey === selfId) continue;
      if (prefix === 'Artículo' && Number(cleaned.split(/\D/)[0] || 0) > 3500) continue;
      const articleLabel = `${prefix} ${cleaned}`;
      const mapKey = `${code}:${normKey}`;
      if (!found.has(mapKey)) {
        found.set(mapKey, {
          law_code: code,
          article_number: articleLabel,
          query: `${code} ${articleLabel}`,
        });
      }
      if (found.size >= maxRefs) break;
    }
    if (found.size >= maxRefs) break;
  }

  return [...found.values()];
}

const RELATED_TOPIC_CATALOG: Array<{
  modules: Array<LegalModule | 'todos'>;
  pattern: RegExp;
  suggestions: Array<{ query: string; label: string }>;
}> = [
  {
    modules: ['mercantil', 'mercantil_analysis', 'todos'],
    pattern: /\bpagar[eé]\b|\btitulo\w* de credito\b/,
    suggestions: [
      { query: 'LGTOC Artículo 171 vencimiento y lugar de pago del pagaré', label: 'Omisión de fecha de vencimiento o lugar de pago (Art. 171 LGTOC)' },
      { query: 'LGTOC Artículo 174 disposiciones aplicables al pagaré e intereses', label: 'Intereses moratorios y reglas aplicables al pagaré (Art. 174 LGTOC)' },
      { query: 'endoso y transmisión de títulos de crédito LGTOC', label: 'Requisitos y clases de endoso (LGTOC)' },
      { query: 'acción cambiaria directa y en vía de regreso LGTOC', label: 'Ejercicio y prescripción de la acción cambiaria (LGTOC)' },
    ],
  },
  {
    modules: ['mercantil', 'mercantil_analysis', 'todos'],
    pattern: /\basamblea\w*\b|\baccionista\w*\b|\bsociedad\w*\b|\badministrador\w*\b/,
    suggestions: [
      { query: 'asamblea ordinaria y extraordinaria de accionistas LGSM', label: 'Competencia de asambleas ordinarias y extraordinarias (LGSM)' },
      { query: 'convocatoria y quórum de asambleas LGSM', label: 'Requisitos de convocatoria y quórum en sociedades (LGSM)' },
      { query: 'responsabilidad de los administradores LGSM', label: 'Obligaciones y responsabilidad de administradores (LGSM)' },
    ],
  },
  {
    modules: ['laboral', 'todos'],
    pattern: /\brescisi\w*\b|\bdespid\w*\b|\bfiniquit\w*\b|\bliquidaci\w*\b/,
    suggestions: [
      { query: 'LFT Artículo 47 causas de rescisión de la relación de trabajo sin responsabilidad para el patrón', label: 'Causales de rescisión y aviso de despido (Art. 47 LFT)' },
      { query: 'LFT Artículo 48 indemnización constitucional y salarios vencidos', label: 'Indemnización constitucional y salarios caídos (Art. 48 LFT)' },
      { query: 'LFT Artículo 162 prima de antigüedad', label: 'Cálculo y procedencia de prima de antigüedad (Art. 162 LFT)' },
    ],
  },
  {
    modules: ['laboral', 'todos'],
    pattern: /\bprestacion\w*\b|\bsalario\b|\bjornada\w*\b|\bcontrato\b/,
    suggestions: [
      { query: 'LFT Artículo 25 condiciones de trabajo en contrato individual', label: 'Requisitos del contrato individual de trabajo (Art. 25 LFT)' },
      { query: 'aguinaldo vacaciones y prima vacacional LFT', label: 'Aguinaldo, vacaciones y prima vacacional (Arts. 76, 80 y 87 LFT)' },
      { query: 'duración máxima de la jornada y tiempo extraordinario LFT', label: 'Límites de jornada laboral y pago de horas extra (LFT)' },
    ],
  },
  {
    modules: ['fiscal', 'todos'],
    pattern: /\bcfdi\b|\bcomprobante\w*\b|\bdeducci\w*\b|\b69[ -]?b\b|\bmaterialidad\b/,
    suggestions: [
      { query: 'CFF Artículo 29-A requisitos de los comprobantes fiscales digitales', label: 'Requisitos de los CFDI (Art. 29-A CFF)' },
      { query: 'LISR Artículo 27 requisitos de las deducciones autorizadas', label: 'Requisitos generales de deducibilidad en ISR (Art. 27 LISR)' },
      { query: 'CFF Artículo 69-B presunción de inexistencia de operaciones', label: 'Procedimiento de presunción de operaciones inexistentes (Art. 69-B CFF)' },
      { query: 'CFF Artículo 5-A razón de negocios', label: 'Razón de negocios y beneficio económico (Art. 5-A CFF)' },
    ],
  },
  {
    modules: ['fiscal', 'todos'],
    pattern: /\biva\b|\bacredita\w*\b|\bretenci\w*\b/,
    suggestions: [
      { query: 'LIVA Artículo 5 requisitos para que sea acreditable el impuesto al valor agregado', label: 'Requisitos de acreditamiento de IVA (Art. 5 LIVA)' },
      { query: 'LIVA Artículo 1-A obligación de retener el impuesto', label: 'Supuestos de retención de IVA (Art. 1-A LIVA)' },
    ],
  },
  {
    modules: ['aduanal', 'comercio_exterior', 'todos'],
    pattern: /\bpedimento\w*\b|\baduana\w*\b|\bvalor\b|\bimportaci\w*\b|\bpama\b/,
    suggestions: [
      { query: 'LA Artículo 36-A documentos que deben anexarse al pedimento', label: 'Documentos obligatorios anexos al pedimento (Art. 36-A LA)' },
      { query: 'LA Artículo 64 valor en aduana de las mercancías y valor de transacción', label: 'Determinación del valor en aduana e incrementables (Arts. 64 y 65 LA)' },
      { query: 'LA Artículo 150 procedimiento administrativo en materia aduanera PAMA', label: 'Inicio y formalidades del PAMA (Arts. 150 y 151 LA)' },
      { query: 'LA Artículo 89 rectificación de los datos contenidos en el pedimento', label: 'Rectificación de pedimentos (Art. 89 LA)' },
    ],
  },
];

/**
 * Builds actionable follow-up queries to explore related provisions inside the
 * local corpus, combining cross-references detected in the retrieved articles,
 * AI-suggested related searches, and deterministic legal topic expansions.
 */
export function buildRelatedCorpusQueries(
  query: string,
  module: LegalModule | 'todos',
  matches: Array<{
    law_code?: string;
    title?: string;
    article_number?: string;
    content?: string;
    related_refs?: RelatedArticleReference[];
  }>,
  aiSuggestions: string[] = [],
  maxSuggestions = 5,
): RelatedCorpusQuery[] {
  const canonicalQuery = normalize(query);
  const existingProvisionKeys = new Set(
    matches.map((m) => `${String(m.law_code || m.title || '').toUpperCase()}:${normalize(String(m.article_number || ''))}`),
  );
  const results: RelatedCorpusQuery[] = [];
  const seenQueries = new Set<string>([canonicalQuery]);

  const pushSuggestion = (item: RelatedCorpusQuery) => {
    const norm = normalize(item.query);
    if (!norm || seenQueries.has(norm) || results.length >= maxSuggestions) return;
    seenQueries.add(norm);
    results.push(item);
  };

  // 1. Explicit cross-references detected inside the top retrieved articles
  for (const match of matches.slice(0, 4)) {
    const refs = match.related_refs || extractCrossReferencedProvisions(match.law_code, match.article_number, String(match.content || ''));
    for (const ref of refs) {
      const refKey = `${ref.law_code.toUpperCase()}:${normalize(ref.article_number)}`;
      if (existingProvisionKeys.has(refKey)) continue;
      pushSuggestion({
        query: ref.query,
        label: `${ref.law_code} · ${ref.article_number} (citado en ${match.law_code || match.title} ${match.article_number || ''})`.trim(),
        kind: 'cross_reference',
      });
      if (results.length >= 2) break;
    }
    if (results.length >= 2) break;
  }

  // 2. AI-suggested related searches within the corpus (when BYOK is active)
  for (const suggestion of aiSuggestions) {
    const clean = String(suggestion || '').trim();
    if (clean.length < 4) continue;
    pushSuggestion({
      query: clean,
      label: clean,
      kind: 'topic',
    });
  }

  // 3. Deterministic domain catalog suggestions for related articles in the corpus
  for (const entry of RELATED_TOPIC_CATALOG) {
    if (!entry.modules.includes(module)) continue;
    if (!entry.pattern.test(canonicalQuery)) continue;
    for (const suggestion of entry.suggestions) {
      pushSuggestion({
        query: suggestion.query,
        label: suggestion.label,
        kind: 'topic',
      });
    }
  }

  return results.slice(0, maxSuggestions);
}

