// Funciones puras del corpus documental (LFT, LCE, RLCE, LA, RLA, LIGIE, RGCE). Viven
// separadas de stage-official-documental-corpus.mjs para poder probarlas sin ejecutar la
// descarga ni la preparación de fuentes.
import {
  articleHeadingRegex,
  cleanPageText,
  extractLawArticles,
  extractRmfRules,
  findTransitoryHeading,
  sha256,
} from './official-fiscal-parser.mjs';

function normalizeForTermMatching(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeBody(value) {
  return String(value || '')
    .replace(/\[\[PAGE:\d+]]/g, '')
    .replace(/\r/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function titleCaseArticleSuffix(rawSuffix) {
  const normalized = String(rawSuffix || '').toLowerCase();
  if (normalized === 'quater') return 'Quáter';
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

export function repairSplitSuffixArticles(provisions) {
  return provisions.map(provision => {
    if (provision.kind !== 'article' || !/^\d+$/.test(String(provision.id))) return provision;

    const match = provision.content.match(/^(Bis|Ter|Qu[aá]ter|Quinquies|Quintus|Sexies|Septies|Octies|Nonies|[A-ZÑ])\.-\s*/iu);
    if (!match) return provision;

    const rawSuffix = match[1];
    const suffix = rawSuffix.length === 1
      ? rawSuffix.toUpperCase()
      : titleCaseArticleSuffix(rawSuffix);
    const id = rawSuffix.length === 1 ? `${provision.id}-${suffix}` : `${provision.id} ${suffix}`;
    const content = provision.content.slice(match[0].length).trim();

    return {
      ...provision,
      id,
      label: `Artículo ${id}`,
      content,
      contentSha256: sha256(content),
    };
  });
}

export function slugProvisionId(value) {
  return String(value || '')
    .replace(/ñ/g, 'enie')
    .replace(/Ñ/g, 'enie')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function sanitizePages(pages, source) {
  return pages.map(page => {
    let text = page.text;
    if (source.code === 'RGCE') {
      // La nota de compilación abre cada página y termina en "Página N de M". Se quita como
      // bloque: su última línea ("de la Federación.") también aparece en el texto de reglas.
      text = text
        .replace(/^\s*NOTA: Este documento constituye[\s\S]*?^P[aá]gina\s+\d+\s+de\s+\d+[ \t]*(?:\n|$)/mu, '')
        .split('\n')
        .filter(line => {
          const compact = line.replace(/\s+/g, ' ').trim();
          return compact
            && !/^NOTA: Este documento constituye/i.test(compact)
            && !/^de dar a conocer el texto actualizado/i.test(compact)
            && !/^de los Derechos del Contribuyente/i.test(compact)
            && !/^la Federaci[oó]n\.$/i.test(compact)
            && !/^P[aá]gina\s+\d+\s+de\s+\d+$/i.test(compact);
        })
        .join('\n');
    }

    return {
      ...page,
      text,
    };
  });
}

// Notas de la primera página que la fuente publica junto a la última reforma, por
// ejemplo "Fracciones arancelarias de la Tarifa de la Ley modificadas por Decreto DOF
// 13-10-2026". No cambian la fecha de última reforma, pero se registran en el encabezado.
export function extractSourceNotes(firstPageText) {
  return String(firstPageText || '')
    .split('\n')
    .map(line => line.replace(/\s+/g, ' ').trim())
    .filter(line => /\bmodificad[oa]s?\s+(?:por|mediante)\s+(?:el\s+)?Decreto\s+(?:publicado\s+en\s+el\s+)?DOF\s+\d{2}-\d{2}-\d{4}\b/iu.test(line));
}

const SPANISH_MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

// Las compilaciones del SAT no traen "Última Reforma DOF"; su primera página enumera las
// resoluciones de modificaciones con su fecha de publicación. La más reciente es la última
// reforma de la compilación.
export function extractCompilationLastReform(firstPageText) {
  const text = String(firstPageText || '').replace(/\s+/g, ' ');
  const dates = [...text.matchAll(/publicada en el citado órgano de difusión el (\d{1,2}) de ([a-záéíóú]+) de (\d{4})/giu)]
    .map(([, day, month, year]) => {
      const monthIndex = SPANISH_MONTHS.indexOf(month.toLowerCase());
      return monthIndex < 0 ? null : `${year}-${String(monthIndex + 1).padStart(2, '0')}-${day.padStart(2, '0')}`;
    })
    .filter(Boolean)
    .sort();
  return dates.at(-1) || null;
}

function pageForOffset(ranges, offset) {
  const range = ranges.find(item => offset >= item.start && offset <= item.end);
  if (range) return range.page;
  const previous = [...ranges].reverse().find(item => offset >= item.end);
  return previous?.page ?? ranges[0]?.page ?? null;
}

function searchIndex(text, regex) {
  return text.match(regex)?.index ?? -1;
}

export function extractLigieProvisions(pages, source) {
  const cleanedPages = pages.map(page => ({
    num: page.num,
    text: cleanPageText(page.text, source),
  }));
  let text = '';
  const ranges = [];

  for (const page of cleanedPages) {
    const marker = `\n[[PAGE:${page.num}]]\n`;
    text += marker;
    const start = text.length;
    text += page.text;
    ranges.push({ page: page.num, start, end: text.length });
  }

  // Los límites de la Tarifa se buscan con el mismo patrón de encabezado que los
  // artículos: una referencia partida como "artículo 2o. fracción II" dentro de las notas
  // del Capítulo 98 no debe cerrar la Tarifa.
  const article1 = searchIndex(text, articleHeadingRegex(1));
  const article2 = searchIndex(text, articleHeadingRegex(2));
  const transitory = findTransitoryHeading(text)?.index ?? -1;
  const tariffStart = text.search(/^\s*TARIFA\s*$/imu);
  const tariffEnd = article2 > tariffStart ? article2 : (transitory > tariffStart ? transitory : text.length);
  const sliceStart = tariffStart >= 0 ? tariffStart : article1;
  const tariffText = sliceStart >= 0 ? text.slice(sliceStart, tariffEnd) : '';

  // Un capítulo puede llevar una anotación editorial entre paréntesis, por ejemplo
  // "Capítulo 78 (Sic DOF 07-06-2022)".
  const chapterMatches = [...tariffText.matchAll(/^\s*Cap[íi]tulo\s+(\d{2})(?:[ \t]+\([^)\n]*\))?[ \t]*$/gimu)];
  const provisions = [];

  for (let index = 0; index < chapterMatches.length; index += 1) {
    const match = chapterMatches[index];
    const start = sliceStart + (match.index ?? 0);
    const bodyStart = start + match[0].length;
    const end = sliceStart + (chapterMatches[index + 1]?.index ?? tariffText.length);
    const body = normalizeBody(text.slice(bodyStart, end));
    if (!body || body.length < 80) continue;
    const id = `1-Capitulo-${match[1]}`;
    const startPage = pageForOffset(ranges, start);
    const endPage = pageForOffset(ranges, Math.max(bodyStart, end - 1));
    provisions.push({
      kind: 'article',
      id,
      label: `Artículo 1o - Capítulo ${match[1]}`,
      content: body,
      contentSha256: sha256(body),
      sourcePages: startPage === endPage ? [startPage] : [startPage, endPage],
    });
  }

  const legalArticles = repairSplitSuffixArticles(extractLawArticles(pages, source).provisions)
    .filter(provision => normalizeForTermMatching(provision.id) !== '1');

  return {
    firstProvisionPage: pageForOffset(ranges, article1 >= 0 ? article1 : sliceStart),
    transitoryPage: transitory >= 0 ? pageForOffset(ranges, transitory) : null,
    provisions: [...provisions, ...legalArticles],
  };
}

// Las comillas tipográficas del DOF aparecen rectas en las compilaciones del SAT.
function normalizeForContainment(value) {
  return String(value || '')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

// Línea que sólo marca porciones no modificadas: "...", "…", "I. y II. ...", "1. a 39. …".
function isOmissionLine(line) {
  if (!/\.\.\.|…/.test(line)) return false;
  return line
    .replace(/\.\.\.|…/g, '')
    .replace(/\b(?:[IVXLC]+|\d+|[a-z])[.)]/g, '')
    .replace(/\b(?:a|al|y)\b/g, '')
    .replace(/[\s.,;]/g, '') === '';
}

const MAX_TRAILING_TITLE_LINES = 3;

// Comprueba que una compilación oficial trae el texto literal de cada bloque de una
// resolución de modificaciones. Cada tramo entre puntos suspensivos debe aparecer en la
// regla compilada; el último tramo puede terminar con el título de la regla siguiente
// (hasta tres líneas), que en la resolución precede al número de esa regla.
export function verifyCompilationIncludesAmendment(compiledProvisions, amendmentProvisions) {
  const compiledById = new Map(compiledProvisions.map(item => [item.id, normalizeForContainment(item.content)]));
  const rules = amendmentProvisions.map(amendment => {
    const compiled = compiledById.get(amendment.id);
    if (compiled === undefined) return { id: amendment.id, found: false, status: 'fail', missingFragments: [] };

    const fragments = [];
    let current = [];
    for (const line of amendment.content.split('\n').filter(item => item.trim())) {
      if (isOmissionLine(line)) {
        if (current.length) fragments.push(current);
        current = [];
      } else {
        current.push(line);
      }
    }
    if (current.length) fragments.push(current);

    const missingFragments = fragments.filter((lines, index) => {
      const maxTrim = index === fragments.length - 1 ? Math.min(MAX_TRAILING_TITLE_LINES, lines.length - 1) : 0;
      for (let trim = 0; trim <= maxTrim; trim += 1) {
        if (compiled.includes(normalizeForContainment(lines.slice(0, lines.length - trim).join(' ')))) return false;
      }
      return true;
    }).map(lines => normalizeForContainment(lines.join(' ')).slice(0, 120));

    return { id: amendment.id, found: true, status: missingFragments.length ? 'fail' : 'pass', missingFragments };
  });

  return {
    status: rules.length > 0 && rules.every(rule => rule.status === 'pass') ? 'pass' : 'fail',
    rules,
  };
}

export function extractDocumentalProvisions(pages, source) {
  const sanitized = sanitizePages(pages, source);
  if (source.parser === 'rule') return extractRmfRules(sanitized, source);
  if (source.parser === 'ligie') return extractLigieProvisions(sanitized, source);
  const extracted = extractLawArticles(sanitized, source);
  return {
    ...extracted,
    provisions: repairSplitSuffixArticles(extracted.provisions),
  };
}
