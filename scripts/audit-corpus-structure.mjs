// Analiza la integridad estructural de cada ley del corpus: numeración, huecos,
// duplicados, textos vacíos o cortados y presencia de transitorios.
import fs from 'node:fs';
import path from 'node:path';

const dir = process.argv[2];
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.md')).sort();
const SUFFIX = /^(?:Bis|Ter|Qu[aá]ter|Quinquies|Quintus|Sexies|Septies|Octies|Nonies|Decies|[A-Z])$/i;
const report = [];

for (const file of files) {
  const text = fs.readFileSync(path.join(dir, file), 'utf8');
  const meta = Object.fromEntries([...text.matchAll(/^> ([^:]+): (.*)$/gm)].map((m) => [m[1].trim(), m[2].trim()]));
  const lines = text.split('\n');
  const entries = [];
  let current = null;
  for (const line of lines) {
    const head = line.match(/^\*\*(.+?)\*\*\s*$/);
    if (head) {
      current = { heading: head[1].trim(), body: [] };
      entries.push(current);
    } else if (current) current.body.push(line);
  }
  const otherHeadings = entries.filter((e) => !/^(Artículo|Regla)\b/.test(e.heading)).map((e) => e.heading);
  const transitoriosInText = (text.match(/TRANSITORIO/gi) || []).length;
  const shortBodies = entries.filter((e) => e.body.join(' ').replace(/\s+/g, ' ').trim().length < 12).map((e) => e.heading);
  const last = entries.at(-1);
  const lastText = last ? last.body.join('\n').trim() : '';

  let numbering = null;
  if (entries.every((e) => /^Artículo\s/.test(e.heading)) && !file.startsWith('ligie')) {
    const bases = [];
    const seen = new Map();
    for (const e of entries) {
      const m = e.heading.match(/^Artículo\s+(\d+)(?:o|º|°)?\.?\s*(?:-\s*)?(.*)$/i);
      if (!m) { bases.push(null); continue; }
      const base = Number(m[1]);
      const suffix = m[2].trim();
      bases.push(base);
      const key = `${base} ${suffix}`.trim().toLowerCase();
      seen.set(key, (seen.get(key) || 0) + 1);
      if (suffix && !suffix.split(/[\s-]+/).every((s) => SUFFIX.test(s))) {
        (numbering ??= {}).raras = [...((numbering && numbering.raras) || []), e.heading];
      }
    }
    const nums = bases.filter((n) => n !== null);
    const max = Math.max(...nums);
    const set = new Set(nums);
    const gaps = [];
    for (let n = 1; n <= max; n += 1) if (!set.has(n)) gaps.push(n);
    const dups = [...seen].filter(([, c]) => c > 1).map(([k, c]) => `${k}×${c}`);
    const unparsed = entries.filter((_, i) => bases[i] === null).map((e) => e.heading);
    numbering = { ...(numbering || {}), tipo: 'artículos', primero: Math.min(...nums), ultimo: max, base: set.size, huecos: gaps, duplicados: dups, sinNumero: unparsed };
  } else if (entries.every((e) => /^Regla\s/.test(e.heading))) {
    const ids = entries.map((e) => e.heading.replace(/^Regla\s+/, '').replace(/\.$/, ''));
    const groups = new Map();
    const dups = [];
    const seen = new Set();
    for (const id of ids) {
      if (seen.has(id)) dups.push(id);
      seen.add(id);
      const parts = id.split('.');
      const prefix = parts.slice(0, -1).join('.');
      const lastN = Number(parts.at(-1));
      if (!groups.has(prefix)) groups.set(prefix, []);
      groups.get(prefix).push(lastN);
    }
    const gaps = [];
    for (const [prefix, list] of groups) {
      const s = new Set(list);
      const max = Math.max(...list);
      for (let n = 1; n <= max; n += 1) if (!s.has(n)) gaps.push(`${prefix}.${n}`);
    }
    const titles = [...new Set(ids.map((id) => id.split('.')[0]))];
    const perTitle = Object.fromEntries(titles.map((t) => [t, ids.filter((id) => id.split('.')[0] === t).length]));
    numbering = { tipo: 'reglas', reglas: ids.length, titulos: perTitle, huecos: gaps, duplicados: dups };
  } else {
    numbering = { tipo: 'otro', encabezados: entries.map((e) => e.heading).slice(0, 5), total: entries.length };
  }

  report.push({
    archivo: file,
    codigo: meta['Código'],
    ultimaReforma: meta['Última reforma indicada en la fuente'],
    verificacion: meta['Verificación oficial'],
    entradas: entries.length,
    otrosEncabezados: otherHeadings.slice(0, 8),
    menciónTransitorios: transitoriosInText,
    cuerposCortos: shortBodies.slice(0, 10),
    nCuerposCortos: shortBodies.length,
    ultimaEntrada: last?.heading,
    finUltimaEntrada: lastText.slice(-160).replace(/\s+/g, ' '),
    numeracion: numbering,
  });
}

console.log(JSON.stringify(report, null, 1));
