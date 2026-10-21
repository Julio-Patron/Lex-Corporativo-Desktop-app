import crypto from 'crypto';

const ARTICLE_SUFFIX_NAMES = ['bis', 'ter', 'qu[aá]ter', 'quinquies', 'quintus', 'sexies', 'septies', 'octies', 'nonies'];

// Los encabezados se buscan sin la bandera "i": una referencia partida en minúsculas
// ("artículo 76 de este ordenamiento") nunca debe abrir una disposición. Los sufijos sí
// aceptan cualquier capitalización porque las fuentes alternan "BIS", "Bis" y "bis".
function anyCase(pattern) {
  return pattern.replace(/\[([^\]]+)\]|([a-záéíóú])/giu, (_match, group, letter) => {
    if (group) return `[${[...new Set([...group.toLowerCase(), ...group.toUpperCase()])].join('')}]`;
    return `[${letter.toLowerCase()}${letter.toUpperCase()}]`;
  });
}

const ARTICLE_SUFFIX_WORDS = ARTICLE_SUFFIX_NAMES.map(anyCase).join('|');
// "Artículo", "ARTÍCULO" o "ARTICULO", con un punto opcional ("Artículo. 88."). El número
// debe ir seguido de un terminador (".", ".-", "-", "–" o "—"), como en el texto oficial.
const ARTICLE_WORD_SOURCE = String.raw`(?:Art[íi]culo|ART[ÍIí]CULO)\.?`;
const ARTICLE_ID_SOURCE = String.raw`(\d+(?:o|º|°)?(?:(?:\.-|-)(?:${ARTICLE_SUFFIX_WORDS}|[A-Z]))?(?:\s+(?:${ARTICLE_SUFFIX_WORDS}))?)`;
const ARTICLE_TERMINATOR_SOURCE = String.raw`\s*(?:\.\s*-\s*|[.\-–—])\s*`;
const ARTICLE_HEADER_SOURCE = String.raw`^\s*${ARTICLE_WORD_SOURCE}\s+${ARTICLE_ID_SOURCE}${ARTICLE_TERMINATOR_SOURCE}`;
const RULE_HEADER_SOURCE = String.raw`^\s*(\d+(?:\.\d+){1,3})\.\s+(?=\S)`;
// Encabezado de transitorios: "TRANSITORIOS", "Transitorios:" o la forma espaciada
// "T r a n s i t o r i o s" que usan algunas leyes publicadas antes de 2000.
const TRANSITORY_HEADING_SOURCE = String.raw`^\s*T ?R ?A ?N ?S ?I ?T ?O ?R ?I ?O ?S[ \t]*:?[ \t]*$`;

function regexFrom(source) {
  return new RegExp(source, 'gmu');
}

export function matchArticleHeading(text) {
  const match = String(text || '').match(new RegExp(ARTICLE_HEADER_SOURCE, 'u'));
  return match?.[1] || null;
}

export function articleHeadingRegex(number) {
  const ordinal = String.raw`(?:o|º|°)?`;
  return new RegExp(String.raw`^\s*${ARTICLE_WORD_SOURCE}\s+${number}${ordinal}${ARTICLE_TERMINATOR_SOURCE}`, 'mu');
}

export function findTransitoryHeading(text) {
  return String(text || '').match(new RegExp(TRANSITORY_HEADING_SOURCE, 'imu'));
}

export function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export function normalizeForComparison(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeForIdentity(value) {
  return String(value || '')
    .replace(/ñ/g, '\u0000')
    .replace(/Ñ/g, '\u0001')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\u0000|\u0001/g, 'ñ')
    .toLowerCase()
    .replace(/[^a-z0-9ñ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeProvisionId(value, kind) {
  const normalized = String(value)
    .normalize('NFC')
    .trim()
    .replace(/[–—]/g, '-')
    .replace(/(\d)\s*(?:o|º|°)\.?/gi, '$1')
    .replace(/\.\s*-\s*/g, '-')
    .replace(/\s*-\s*/g, '-')
    .replace(/\s+/g, ' ')
    .replace(/[.,;:]+$/g, '');

  if (kind === 'rule') return normalized;

  return normalized.replace(/\b(bis|ter|qu[aá]ter|quinquies|quintus|sexies|septies|octies|nonies)\b/gi, word => (
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  ));
}

function isBoilerplateLine(line, source) {
  const compact = line.replace(/\s+/g, ' ').trim();
  if (!compact) return false;

  const patterns = [
    /^--\s*\d+\s+of\s+\d+\s*--$/i,
    /^\d+\s+de\s+\d+$/i,
    /C[ÁA]MARA DE DIPUTADOS DEL H\. CONGRESO DE LA UNI[ÓO]N/i,
    /^Secretar[íi]a General$/i,
    /^Secretar[íi]a de Servicios Parlamentarios$/i,
    /^Última Reforma DOF\s+/i,
    /^DIARIO OFICIAL\s+/i,
    /\s+DIARIO OFICIAL$/i,
    /^\(Edici[óo]n\s+\p{L}+\)\s+DIARIO OFICIAL\s+/iu,
    /\s+DIARIO OFICIAL\s+\(Edici[óo]n\s+\p{L}+\)$/iu,
  ];

  if (patterns.some(pattern => pattern.test(compact))) return true;
  return Boolean(source?.repeatedHeader && compact.toUpperCase() === source.repeatedHeader.toUpperCase());
}

function isEditorialAnnotationLine(line) {
  const compact = line.replace(/\s+/g, ' ').trim();
  if (!compact) return false;

  return /^(?:Art[íi]culo|P[áa]rrafo|Fracci[óo]n|Inciso|Numeral|Cap[íi]tulo|Secci[óo]n|Denominaci[óo]n|T[íi]tulo)\s+(?:reformad[oa]|adicionad[oa]|derogad[oa]|recorrid[oa]).*\bDOF\b/i.test(compact)
    || /^Fe de erratas\b.*\bDOF\b/i.test(compact);
}

export function cleanPageText(text, source = {}) {
  return String(text || '')
    .replace(/\r/g, '')
    .split('\n')
    .filter(line => !isBoilerplateLine(line, source))
    .filter(line => !isEditorialAnnotationLine(line))
    .join('\n')
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function normalizeBody(value) {
  return String(value || '')
    .replace(/\[\[PAGE:\d+]]/g, '')
    .replace(/\r/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\s+(?:Art[íi]culo|P[áa]rrafo|Fracci[óo]n|Inciso|Numeral|Cap[íi]tulo|Secci[óo]n|Denominaci[óo]n|T[íi]tulo)\s+(?:reformad[oa]|adicionad[oa]|derogad[oa]|recorrid[oa]).*?\bDOF\b\s+\d{2}-\d{2}-\d{4}/giu, '')
    .replace(/\n(?:DISPOSICIONES\s+(?:DE\s+VIGENCIA\s+TEMPORAL|TRANSITORIAS)[^\n]*|ART[ÍI]CULOS?\s+TRANSITORIOS?[^\n]*|TRANSITORIOS)\b[\s\S]*$/iu, '')
    .replace(/\nT r a n s i t o r i o s[ \t]*(?:\n[\s\S]*)?$/iu, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function buildMainBody(pages, source, kind) {
  const headerSource = kind === 'rule' ? RULE_HEADER_SOURCE : ARTICLE_HEADER_SOURCE;
  const cleanedPages = pages.map(page => ({
    num: page.num,
    text: cleanPageText(page.text, source),
    headings: page.headings || [],
  }));
  const hasStyledHeadings = cleanedPages.some(page => page.headings.length > 0);
  const firstProvisionIndex = cleanedPages.findIndex(page => (
    hasStyledHeadings ? page.headings.length > 0 : regexFrom(headerSource).test(page.text)
  ));

  if (firstProvisionIndex < 0) {
    return { text: '', ranges: [], firstProvisionPage: null, transitoryPage: null };
  }

  const selected = [];
  let transitoryPage = null;

  for (let index = firstProvisionIndex; index < cleanedPages.length; index += 1) {
    const page = cleanedPages[index];
    const transitoryMatch = findTransitoryHeading(page.text);
    if (transitoryMatch) {
      transitoryPage = page.num;
      const beforeHeading = page.text.slice(0, transitoryMatch.index).trim();
      if (beforeHeading) selected.push({ ...page, text: beforeHeading });
      break;
    }
    selected.push(page);
  }

  let text = '';
  const ranges = [];
  const headingMatches = [];
  for (const page of selected) {
    const marker = `\n[[PAGE:${page.num}]]\n`;
    text += marker;
    const start = text.length;
    text += page.text;
    ranges.push({ page: page.num, start, end: text.length });

    if (hasStyledHeadings) {
      const candidates = [...page.text.matchAll(regexFrom(headerSource))];
      let cursor = 0;
      for (const heading of page.headings) {
        const expectedId = normalizeProvisionId(heading.id, kind);
        const candidate = candidates.find(item => {
          const itemStart = item.index ?? 0;
          return itemStart >= cursor && normalizeProvisionId(item[1], kind) === expectedId;
        });
        if (!candidate) continue;
        const localIndex = candidate.index ?? 0;
        headingMatches.push({
          id: expectedId,
          index: start + localIndex,
          length: candidate[0].length,
        });
        cursor = localIndex + candidate[0].length;
      }
    }
  }

  return {
    text,
    ranges,
    headingMatches,
    firstProvisionPage: cleanedPages[firstProvisionIndex].num,
    transitoryPage,
  };
}

function pageForOffset(ranges, offset) {
  const range = ranges.find(item => offset >= item.start && offset <= item.end);
  if (range) return range.page;
  const previous = [...ranges].reverse().find(item => offset >= item.end);
  return previous?.page ?? ranges[0]?.page ?? null;
}

function parseProvisions(pages, source, kind) {
  const main = buildMainBody(pages, source, kind);
  const headerRegex = regexFrom(kind === 'rule' ? RULE_HEADER_SOURCE : ARTICLE_HEADER_SOURCE);
  const matches = main.headingMatches.length
    ? main.headingMatches
    : [...main.text.matchAll(headerRegex)].map(match => ({
      id: normalizeProvisionId(match[1], kind),
      index: match.index ?? 0,
      length: match[0].length,
    }));
  const provisions = [];

  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index];
    const start = match.index;
    const bodyStart = start + match.length;
    const end = matches[index + 1]?.index ?? main.text.length;
    const body = normalizeBody(main.text.slice(bodyStart, end));
    const id = match.id;
    const startPage = pageForOffset(main.ranges, start);
    const endPage = pageForOffset(main.ranges, Math.max(bodyStart, end - 1));

    if (!body) continue;
    provisions.push({
      kind,
      id,
      label: `${kind === 'rule' ? 'Regla' : 'Artículo'} ${id}`,
      content: body,
      contentSha256: sha256(body),
      sourcePages: startPage === endPage ? [startPage] : [startPage, endPage],
    });
  }

  return { ...main, provisions };
}

export function extractLawArticles(pages, source = {}) {
  return parseProvisions(pages, source, 'article');
}

export function extractRmfRules(pages, source = {}) {
  return parseProvisions(pages, source, 'rule');
}

function compareNumericIds(left, right) {
  const leftParts = String(left).split('.').map(Number);
  const rightParts = String(right).split('.').map(Number);
  const length = Math.max(leftParts.length, rightParts.length);
  for (let index = 0; index < length; index += 1) {
    const delta = (leftParts[index] || 0) - (rightParts[index] || 0);
    if (delta !== 0) return delta;
  }
  return 0;
}

export function validateProvisions(provisions, policy = {}) {
  const failures = [];
  const warnings = [];
  const byId = new Map();

  for (const provision of provisions) {
    const normalizedId = normalizeForIdentity(normalizeProvisionId(provision.id, provision.kind || 'article'));
    const group = byId.get(normalizedId) || [];
    group.push(provision);
    byId.set(normalizedId, group);
  }

  const duplicates = [...byId.entries()]
    .filter(([, group]) => group.length > 1)
    .map(([id, group]) => ({
      id,
      occurrences: group.length,
      conflicting: new Set(group.map(item => item.contentSha256)).size > 1,
    }));
  if (duplicates.length) failures.push(`Se detectaron ${duplicates.length} identificadores duplicados.`);

  const artifacts = provisions.filter(item => /--\s*\d+\s+of\s+\d+\s*--|\uFFFD|C[ÁA]MARA DE DIPUTADOS DEL H\. CONGRESO DE LA UNI[ÓO]N/i.test(item.content));
  if (artifacts.length) failures.push(`${artifacts.length} disposiciones conservan artefactos de extracción.`);

  const short = provisions.filter(item => item.content.length < (policy.minimumContentLength || 30));
  if (short.length) warnings.push(`${short.length} disposiciones tienen texto inusualmente corto.`);

  if (policy.minimumEntries && provisions.length < policy.minimumEntries) {
    failures.push(`Se extrajeron ${provisions.length}; el mínimo esperado es ${policy.minimumEntries}.`);
  }
  if (policy.maximumEntries && provisions.length > policy.maximumEntries) {
    failures.push(`Se extrajeron ${provisions.length}; el máximo esperado es ${policy.maximumEntries}.`);
  }

  const anchorResults = (policy.anchors || []).map(anchor => {
    const provision = provisions.find(item => normalizeForComparison(item.id) === normalizeForComparison(anchor.id));
    const normalizedContent = normalizeForComparison(provision?.content);
    const missingTerms = (anchor.terms || []).filter(term => !normalizedContent.includes(normalizeForComparison(term)));
    return {
      id: anchor.id,
      found: Boolean(provision),
      missingTerms,
      status: provision && missingTerms.length === 0 ? 'pass' : 'fail',
    };
  });
  const failedAnchors = anchorResults.filter(result => result.status !== 'pass');
  if (failedAnchors.length) failures.push(`Fallaron ${failedAnchors.length} anclas normativas.`);

  let regressions = 0;
  for (let index = 1; index < provisions.length; index += 1) {
    const previousBase = provisions[index - 1].id.match(/^\d+(?:\.\d+)*/)?.[0];
    const currentBase = provisions[index].id.match(/^\d+(?:\.\d+)*/)?.[0];
    if (previousBase && currentBase && compareNumericIds(currentBase, previousBase) < 0) regressions += 1;
  }
  if (regressions && !policy.allowNumericRegressions) failures.push(`La secuencia normativa retrocede ${regressions} veces.`);

  return {
    status: failures.length === 0 ? 'pass' : 'fail',
    failures,
    warnings,
    duplicates,
    regressions,
    anchors: anchorResults,
  };
}

const PROVISION_ID_PATTERN = /\b(\d+(?:\.\d+){1,3})\.?\b/g;

function provisionIdsIn(value) {
  return [...new Set([...String(value || '').matchAll(PROVISION_ID_PATTERN)].map(match => match[1]))];
}

export function extractRmfAmendmentSummary(pages, source = {}) {
  const text = pages.map(page => cleanPageText(page.text, source)).join('\n\n');
  const directiveMatch = text.match(/PRIMERO\.\s+([\s\S]+?)\s+para quedar de la siguiente manera:/i);
  const directive = normalizeBody(directiveMatch?.[1] || '');

  // Las directivas encadenan "se reforman ... y se adicionan ... y se deroga" con o sin
  // punto y coma; cada sección termina donde inicia la siguiente operación.
  const sections = {
    reformed: directive.match(/Se reforman?\s+([\s\S]+?)(?=[;,]?\s*(?:y\s+)?se adicionan?\b|[;,]?\s*(?:as[íi]\s+como\s+|y\s+)?se derogan?\b|$)/i)?.[1] || '',
    added: directive.match(/se adicionan?\s+([\s\S]+?)(?=[;,]?\s*(?:as[íi]\s+como\s+|y\s+)?se derogan?\b|$)/i)?.[1] || '',
    repealed: directive.match(/se derogan?\s+([\s\S]+?)$/i)?.[1] || '',
  };

  // Una resolución que sólo da a conocer anexos ("ÚNICO. Se da a conocer ... Anexo")
  // se registra como revisada: no contiene texto de reglas que aplicar.
  const annexOnly = !directive && /(?:^|\n)\s*[ÚU]NICO\.\s+Se da(?:n)? a conocer\b[^\n]*\bAnexos?\b/iu.test(text);
  const status = directive
    ? 'parsed_directive_requires_patch_application'
    : annexOnly ? 'checked_no_rule_changes' : 'directive_not_found';

  return {
    directive,
    mentionedProvisionIds: provisionIdsIn(directive),
    operations: {
      reformed: provisionIdsIn(sections.reformed),
      added: provisionIdsIn(sections.added),
      repealed: provisionIdsIn(sections.repealed),
    },
    contentSha256: sha256(text),
    status,
  };
}

export const RMF_2026_FIRST_AMENDMENT = Object.freeze({
  code: 'RMF-2026-1RM',
  title: 'PRIMERA RESOLUCIÓN DE MODIFICACIONES 2026',
  // El Capítulo 11.18 se menciona como unidad; sus reglas se declaran por separado.
  nonRuleMentions: Object.freeze(['11.18']),
  reformed: Object.freeze({
    '2.1.6': 'primer párrafo',
    '2.4.1': 'tercer párrafo, fracción I, inciso a)',
    '2.7.1.48': 'primer párrafo',
    '2.7.3.1': 'tercer párrafo',
    '2.7.3.2': 'tercer párrafo',
    '2.7.3.3': 'tercer párrafo',
    '2.7.3.4': 'tercer párrafo',
    '2.7.3.5': 'cuarto párrafo',
    '2.7.3.7': 'sexto párrafo',
    '2.7.3.8': 'tercer párrafo',
    '2.7.3.9': 'tercer párrafo',
    '2.7.4.1': 'sexto párrafo',
    '2.7.5.8': 'regla completa',
    '2.10.10': 'segundo párrafo',
    '2.11.3': 'primer párrafo, fracción II, segundo párrafo, y segundo y tercer párrafos de la regla',
    '2.14.3': 'segundo párrafo',
    '2.14.9': 'fracciones III y IV, segundo párrafo',
    '2.14.11': 'primer párrafo',
    '3.15.14': 'regla completa',
    '3.16.11': 'regla completa',
    '5.2.7': 'primer párrafo',
    '5.2.8': 'segundo párrafo',
    '5.2.48': 'primer párrafo',
    '9.4.6': 'fracciones I, primer párrafo y II',
    '10.16': 'primer párrafo, fracción VI',
    '11.7.1': 'apartado A, fracciones II, primer párrafo y III, inciso g), numeral 3',
    '11.9.13': 'primer párrafo',
    '12.1.2': 'regla completa',
    '12.1.9': 'regla completa',
    '12.1.11': 'regla completa',
  }),
  added: Object.freeze({
    '3.5.23': 'regla completa',
    '9.1.23': 'regla completa',
    '9.1.24': 'regla completa',
    '11.7.3': 'regla completa',
    '11.18.1': 'regla completa',
    '11.18.2': 'regla completa',
    '11.18.3': 'regla completa',
  }),
  repealed: Object.freeze({
    '2.12.4': 'regla completa',
  }),
  outOfCorpusChanges: Object.freeze([
    'Glosario, fracción II, numeral 58 (el glosario no forma parte del corpus de reglas).',
    'Anexos 1, 2, 3, 9, 14, 15, 21, 22 y 29 (los anexos no forman parte del corpus).',
    'Transitorios de la RMF (se excluyen del corpus por política).',
  ]),
});

// Segunda Resolución de Modificaciones a la RMF para 2026 (DOF 01-10-2026).
export const RMF_2026_SECOND_AMENDMENT = Object.freeze({
  code: 'RMF-2026-2RM',
  title: 'SEGUNDA RESOLUCIÓN DE MODIFICACIONES 2026',
  reformed: Object.freeze({
    '9.4.4': Object.freeze({
      operation: 'reforma y adición',
      scope: 'segundo párrafo reformado; se adicionan los párrafos tercero y cuarto, y los actuales tercero y cuarto pasan a ser quinto y sexto',
    }),
  }),
  added: Object.freeze({
    // La regla 11.7.3 ya existe (la adicionó la primera resolución); aquí sólo se le
    // agregan fracciones, por lo que el texto previo conserva vigencia.
    '11.7.3': 'fracciones XIV a XXVI',
  }),
  repealed: Object.freeze({}),
  outOfCorpusChanges: Object.freeze([
    'Segunda Modificación al Anexo 2 de la RMF para 2026 (los anexos no forman parte del corpus).',
    'Adición del transitorio Vigésimo Noveno (los transitorios se excluyen del corpus por política).',
  ]),
});

// Segunda Resolución de Modificaciones a las RGCE para 2026 (DOF 22-09-2026).
export const RGCE_2026_SECOND_AMENDMENT = Object.freeze({
  code: 'RGCE-2026-2RM',
  title: 'SEGUNDA RESOLUCIÓN DE MODIFICACIONES 2026',
  reformed: Object.freeze({
    '1.4.12': 'regla completa',
    '1.4.14': 'primer párrafo, fracción VIII y segundo párrafo',
    '3.7.20': 'regla completa',
    '4.5.15': 'segundo párrafo',
    '4.5.33': 'fracción III',
    '4.6.11': 'primer párrafo',
    '7.1.4': 'quinto párrafo',
    '7.1.5': 'tercer párrafo',
    '7.2.1': 'tercer párrafo, fracción I y cuarto párrafo, fracción IV',
  }),
  added: Object.freeze({
    // Se adiciona un párrafo a una regla existente, no una regla nueva.
    '3.1.2': 'sexto párrafo',
  }),
  repealed: Object.freeze({}),
  outOfCorpusChanges: Object.freeze([
    'Glosario, fracción III, numeral 40 (el glosario no forma parte del corpus de reglas).',
    'Reforma del transitorio Décimo Primero de las RGCE para 2026 (los transitorios se excluyen del corpus por política).',
    'Primera Modificación a los Anexos 1 y 2 y Segunda Modificación al Anexo 22 (los anexos no forman parte del corpus).',
  ]),
});

const OPERATION_LABELS = Object.freeze({ reformed: 'reforma', added: 'adición', repealed: 'derogación' });

// Convierte una definición en la lista ordenada de operaciones. Una adición de "regla
// completa" exige que la regla no exista; adicionar porciones (párrafos, fracciones)
// exige que exista, igual que una reforma o una derogación.
export function amendmentOperations(definition) {
  return ['reformed', 'added', 'repealed'].flatMap(operationKey => (
    Object.entries(definition?.[operationKey] || {}).map(([id, value]) => {
      const scope = typeof value === 'string' ? value : value.scope;
      const operation = (typeof value === 'object' && value.operation) || OPERATION_LABELS[operationKey];
      return {
        id,
        operationKey,
        operation,
        scope,
        requiresBase: !(operationKey === 'added' && scope === 'regla completa'),
      };
    })
  ));
}

export function compareDirectiveWithDefinition(summary, definition) {
  const declared = new Set(amendmentOperations(definition).map(item => item.id));
  const ignored = new Set(definition?.nonRuleMentions || []);
  const mentioned = summary?.mentionedProvisionIds || [];
  const undeclaredMentions = mentioned.filter(id => !declared.has(id) && !ignored.has(id));
  const declaredNotMentioned = [...declared].filter(id => !mentioned.includes(id));
  return {
    status: undeclaredMentions.length === 0 ? 'pass' : 'fail',
    undeclaredMentions,
    declaredNotMentioned,
  };
}

function cleanAmendmentProvisionContent(content, id) {
  let value = String(content || '').trim();
  // Un bloque termina antes del siguiente resolutivo o del transitorio de la resolución.
  value = value
    .replace(/\n(?:SEGUNDO|TERCERO|CUARTO|QUINTO|SEXTO|S[ÉE]PTIMO|OCTAVO)\.\s[\s\S]*$/u, '')
    .replace(/\nTransitorios?\n[\s\S]*$/u, '')
    .replace(/[”"]\s*$/u, '')
    .trim();
  if (id === '2.12.4') value = value.replace(/^(Se deroga\.)[\s\S]*$/iu, '$1');
  return value;
}

// Sin definición se aplica la primera resolución. El valor por defecto se resuelve dentro
// de la función para que el parámetro acepte cualquier definición y no sólo esa forma.
export function extractRmfAmendmentProvisions(pages, source = {}, definition) {
  const extracted = extractRmfRules(pages, source);
  const expected = amendmentOperations(definition || RMF_2026_FIRST_AMENDMENT).map(item => item.id);
  const expectedSet = new Set(expected);
  const byId = new Map();

  for (const provision of extracted.provisions) {
    if (!expectedSet.has(provision.id) || byId.has(provision.id)) continue;
    const content = cleanAmendmentProvisionContent(provision.content, provision.id);
    byId.set(provision.id, { ...provision, content, contentSha256: sha256(content) });
  }

  const missing = expected.filter(id => !byId.has(id));
  return {
    provisions: [...byId.values()],
    expectedProvisionIds: expected,
    missingProvisionIds: missing,
    status: missing.length === 0 ? 'pass' : 'fail',
  };
}

function overlayPacket(baseContent, amendment, operation, scope, metadata) {
  const officialNotice = [
    `[ACTUALIZACIÓN OFICIAL VIGENTE — ${metadata.title || RMF_2026_FIRST_AMENDMENT.title}]`,
    `Operación: ${operation}. Alcance publicado: ${scope}.`,
    `Publicación: ${metadata.publishedAt}. Vigencia general: ${metadata.effectiveFrom}.`,
    `Fuente modificatoria: ${metadata.url}`,
    `SHA-256 fuente modificatoria: ${metadata.sourceSha256}`,
    'El siguiente bloque es el texto literal publicado para el alcance reformado y prevalece sobre el texto base en ese alcance:',
    amendment.content,
  ].join('\n');

  // Sólo una regla completa (adicionada, derogada o reformada íntegramente) sustituye al
  // texto anterior; cualquier alcance parcial conserva el texto previo como base vigente.
  if (scope === 'regla completa') return officialNotice;

  return [
    officialNotice,
    '',
    '[TEXTO BASE OFICIAL — CONSERVA VIGENCIA FUERA DEL ALCANCE REFORMADO]',
    'No se deben completar los puntos suspensivos del bloque modificatorio por inferencia. Para una respuesta se recuperan conjuntamente esta superposición y el texto base:',
    baseContent,
  ].join('\n');
}

export function consolidateRmfProvisions(baseProvisions, amendmentProvisions, metadata, definition) {
  const resolvedDefinition = definition || RMF_2026_FIRST_AMENDMENT;
  const byId = new Map(baseProvisions.map(item => [item.id, { ...item }]));
  const amendmentById = new Map(amendmentProvisions.map(item => [item.id, item]));
  const operations = amendmentOperations(resolvedDefinition);
  const failures = [];
  const patches = [];

  for (const { id, operation, scope, requiresBase } of operations) {
    const amendment = amendmentById.get(id);
    const base = byId.get(id);
    if (!amendment) {
      failures.push(`Falta el bloque oficial modificatorio de la regla ${id}.`);
      continue;
    }
    if (requiresBase && !base) {
      failures.push(`Falta la regla base ${id} requerida por la modificación.`);
      continue;
    }
    if (!requiresBase && base) {
      failures.push(`La regla adicionada ${id} ya existe en el texto base.`);
      continue;
    }

    const content = overlayPacket(base?.content || '', amendment, operation, scope, { title: resolvedDefinition.title, ...metadata });
    const consolidated = {
      ...(base || amendment),
      id,
      label: `Regla ${id}`,
      content,
      contentSha256: sha256(content),
      sourcePages: [...new Set([...(base?.sourcePages || []), ...(amendment.sourcePages || [])])],
    };
    byId.set(id, consolidated);
    patches.push({
      id,
      operation,
      scope,
      baseContentSha256: base?.contentSha256 || null,
      amendmentContentSha256: amendment.contentSha256,
      consolidatedContentSha256: consolidated.contentSha256,
      amendmentSourcePages: amendment.sourcePages,
    });
  }

  const provisions = [...byId.values()].sort((left, right) => compareNumericIds(left.id, right.id));
  return {
    provisions,
    patches,
    failures,
    expectedPatches: operations.length,
    status: failures.length === 0 && patches.length === operations.length ? 'pass' : 'fail',
  };
}

// Aplica resoluciones de modificaciones en orden de publicación. Cada paso usa como base
// el resultado del anterior, de modo que una regla reformada dos veces conserva ambas
// superposiciones (la más reciente primero) y el texto base original.
export function applyAmendmentSequence(baseProvisions, steps) {
  let provisions = baseProvisions;
  const results = [];
  for (const step of steps) {
    const result = consolidateRmfProvisions(provisions, step.provisions, step.metadata, step.definition);
    results.push({
      code: step.definition.code,
      patches: result.patches,
      failures: result.failures,
      expectedPatches: result.expectedPatches,
      status: result.status,
    });
    provisions = result.provisions;
  }
  return {
    provisions,
    steps: results,
    status: results.every(item => item.status === 'pass') ? 'pass' : 'fail',
  };
}

export function renderCorpusMarkdown(source, provisions, metadata) {
  const header = [
    `# ${source.name}`,
    '',
    `> Código: ${source.code}`,
    `> Módulo: ${source.module || 'fiscal'}`,
    `> Fuente oficial: ${source.url}`,
    `> SHA-256 fuente: ${metadata.sourceSha256}`,
    `> Verificación oficial: ${metadata.checkedAt}`,
    metadata.lastReform ? `> Última reforma indicada en la fuente: ${metadata.lastReform}` : null,
    ...(metadata.sourceNotes || []).map(note => `> Nota de la fuente: ${note}`),
    '',
  ].filter(line => line !== null);

  const blocks = provisions.map(provision => `**${provision.label}**\n${provision.content}`);
  return `${header.join('\n')}${blocks.join('\n\n')}\n`;
}

const VERIFICATION_LINE = /^> Verificación oficial: (.*)$/m;

// Si el candidato sólo difiere del corpus canónico en la fecha de verificación, la fuente
// oficial y el texto extraído no cambiaron. Devuelve la fecha canónica para que la etapa
// la conserve y la promoción no reescriba la ley ni obligue a volver a indexarla.
export function unchangedVerificationDate(candidateMarkdown, canonicalMarkdown) {
  const normalize = value => String(value || '').replace(/\r\n/g, '\n');
  const canonical = normalize(canonicalMarkdown);
  const canonicalDate = canonical.match(VERIFICATION_LINE)?.[1];
  if (!canonicalDate) return null;
  const withoutDate = value => value.replace(VERIFICATION_LINE, '> Verificación oficial:');
  return withoutDate(normalize(candidateMarkdown)) === withoutDate(canonical) ? canonicalDate : null;
}
