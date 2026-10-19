import { normalizeSearchText } from './drafting';

export interface LawArticle {
  key: string;
  label: string;
  number: string;
  body: string;
}

export interface ParsedLaw {
  title: string;
  metadata: Record<string, string>;
  articles: LawArticle[];
}

// El corpus instalado marca cada disposición en su propia línea como
// "**Artículo 47**" o "**Regla 1.1.1**"; la cabecera incluye metadatos "> Clave: valor".
const PROVISION_HEADING = /^\*\*((Artículo|Regla)\s+([^*]+?))\.?\*\*\s*$/;
const METADATA_LINE = /^>\s*([^:]+):\s*(.+)$/;

export function parseLawMarkdown(content: string): ParsedLaw {
  const lines = content.replace(/\r/g, '').split('\n');
  const metadata: Record<string, string> = {};
  const articles: LawArticle[] = [];
  let title = '';
  let current: { label: string; number: string; lines: string[] } | null = null;

  const flush = () => {
    if (!current) return;
    articles.push({
      key: `art-${articles.length}`,
      label: current.label,
      number: current.number,
      body: current.lines.join('\n').trim(),
    });
  };

  for (const line of lines) {
    const heading = line.match(PROVISION_HEADING);
    if (heading) {
      flush();
      current = { label: heading[1].trim(), number: heading[3].trim(), lines: [] };
      continue;
    }
    if (current) {
      current.lines.push(line);
      continue;
    }
    if (!title && line.startsWith('# ')) {
      title = line.slice(2).trim();
      continue;
    }
    const meta = line.match(METADATA_LINE);
    if (meta) metadata[meta[1].trim()] = meta[2].trim();
  }
  flush();

  return { title, metadata, articles };
}

function normalizeArticleNumber(value: string): string {
  return normalizeSearchText(value)
    .replace(/^(articulo|art\.?|regla)\s+/, '')
    .replace(/[º°o]$/, '')
    .replace(/\s*-\s*/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

// Localiza la disposición citada ("Artículo 47", "art. 29-A", "334 Bis", "1.1.1").
export function findArticle(articles: LawArticle[], reference: string | null | undefined): LawArticle | undefined {
  if (!reference) return undefined;
  const target = normalizeArticleNumber(reference);
  if (!target) return undefined;
  return articles.find((article) => normalizeArticleNumber(article.number) === target);
}

export function filterArticles(articles: LawArticle[], query: string): LawArticle[] {
  const term = normalizeSearchText(query);
  if (!term) return articles;
  const byNumber = findArticle(articles, query);
  const matches = articles.filter((article) =>
    normalizeSearchText(`${article.label} ${article.body}`).includes(term),
  );
  return byNumber ? [byNumber, ...matches.filter((article) => article !== byNumber)] : matches;
}

export function formatArticleCitation(article: LawArticle, lawName: string, lawCode: string): string {
  return `${article.label} de la ${lawName} (${lawCode}):\n"${article.body}"`;
}

const KNOWN_LAW_CODES = new Set([
  'CCF', 'CCOM', 'LGSM', 'LGTOC', 'LIE', 'CNPCF',
  'CFF', 'LISR', 'LIVA', 'RLIVA',
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
  [/\bley\s+del\s+impuesto\s+sobre\s+la\s+renta\b/, 'LISR'],
  [/\breglamento\s+de\s+la\s+ley\s+del\s+impuesto\s+al\s+valor\s+agregado\b/, 'RLIVA'],
  [/\bley\s+del\s+impuesto\s+al\s+valor\s+agregado\b/, 'LIVA'],
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
  const codeMatch = trimmed.match(/\b(CCF|CCOM|CCom|LGSM|LGTOC|LIE|CNPCF|CFF|LISR|RLIVA|LIVA|LFT|RLCE|LCE|RLA|LA|RGCE|LIGIE|TIGIE)\b/);
  if (codeMatch) return codeMatch[1].toUpperCase();
  return null;
}

export function canOpenLawInReader(law: string | null | undefined): boolean {
  return resolveLawCode(law) !== null;
}
