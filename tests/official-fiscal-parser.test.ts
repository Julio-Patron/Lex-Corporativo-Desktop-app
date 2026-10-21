import { describe, expect, it } from 'vitest';
import {
  applyAmendmentSequence,
  cleanPageText,
  compareDirectiveWithDefinition,
  extractLawArticles,
  extractRmfAmendmentSummary,
  consolidateRmfProvisions,
  extractRmfAmendmentProvisions,
  extractRmfRules,
  matchArticleHeading,
  normalizeProvisionId,
  renderCorpusMarkdown,
  RGCE_2026_SECOND_AMENDMENT,
  RMF_2026_SECOND_AMENDMENT,
  unchangedVerificationDate,
  validateProvisions,
} from '../scripts/official-fiscal-parser.mjs';

const longText = (label: string) => `${label} con texto normativo suficientemente extenso para la prueba de segmentación.`;

describe('official fiscal corpus parser', () => {
  it('normalizes ordinal and suffixed article identities', () => {
    expect(normalizeProvisionId('1o.-A', 'article')).toBe('1-A');
    expect(normalizeProvisionId('69-B', 'article')).toBe('69-B');
    expect(normalizeProvisionId('111 BIS', 'article')).toBe('111 Bis');
  });

  it('extracts only the main law body and preserves source pages', () => {
    const result = extractLawArticles([
      { num: 1, text: 'LEY DE PRUEBA\nArtículo 1o.- Texto vigente del primer artículo con contenido suficiente.' },
      { num: 2, text: '2 de 3\nArtículo 1o.-A.- Texto vigente del artículo adicional con contenido suficiente.' },
      { num: 3, text: 'TRANSITORIOS\nPRIMERO.- Este decreto entra en vigor mañana.\nArtículo 1o.- Texto histórico.' },
    ], { repeatedHeader: 'LEY DE PRUEBA' });

    expect(result.provisions.map(item => item.id)).toEqual(['1', '1-A']);
    expect(result.provisions[1].sourcePages).toEqual([2]);
    expect(result.transitoryPage).toBe(3);
  });

  it('stops a law body at a transitory heading that includes a colon', () => {
    const result = extractLawArticles([
      { num: 1, text: 'Artículo 1.- Texto normativo vigente suficientemente largo para la prueba.' },
      { num: 2, text: 'TRANSITORIOS:\nPRIMERO.- Entrada en vigor.\nArtículo 1.- Texto histórico que no debe indexarse.' },
    ]);

    expect(result.provisions).toHaveLength(1);
    expect(result.transitoryPage).toBe(2);
  });

  it('extracts RMF rules after the contents and before transitories', () => {
    const result = extractRmfRules([
      { num: 1, text: 'Contenido\nCapítulo 1.1. Disposiciones' },
      { num: 9, text: 'Título 1\n1.1. Presentación de documentos ante el SAT con el procedimiento aplicable.' },
      { num: 10, text: '1.2. Procedimiento distinto con texto normativo suficientemente extenso.' },
      { num: 11, text: 'TRANSITORIOS\nPrimero. Entrada en vigor.' },
    ]);

    expect(result.provisions.map(item => item.id)).toEqual(['1.1', '1.2']);
    expect(result.firstProvisionPage).toBe(9);
    expect(result.transitoryPage).toBe(11);
  });

  it('blocks conflicting duplicate identities', () => {
    const provisions = [
      { id: '1', content: 'A', contentSha256: 'one' },
      { id: '1o.', content: 'B', contentSha256: 'two' },
    ];
    const validation = validateProvisions(provisions, { minimumEntries: 1 });
    expect(validation.status).toBe('fail');
    expect(validation.duplicates).toHaveLength(1);
    expect(validation.duplicates[0].conflicting).toBe(true);
  });

  it('classifies the RMF modification directive without applying it silently', () => {
    const result = extractRmfAmendmentSummary([{
      num: 1,
      text: 'PRIMERO. Se reforman las reglas 2.1.6. y 3.16.11.; se adicionan las reglas 3.5.23. y 11.7.3.; y se deroga la regla 2.12.4. para quedar de la siguiente manera:',
    }]);

    expect(result.status).toBe('parsed_directive_requires_patch_application');
    expect(result.operations.reformed).toEqual(['2.1.6', '3.16.11']);
    expect(result.operations.added).toEqual(['3.5.23', '11.7.3']);
    expect(result.operations.repealed).toEqual(['2.12.4']);
  });

  it('requires all 38 official RMF amendment blocks before consolidation', () => {
    const result = extractRmfAmendmentProvisions([{
      num: 1,
      text: '2.12.4. Se deroga.\n3.5.23. Texto de la regla adicionada suficientemente extenso.',
    }]);

    expect(result.status).toBe('fail');
    expect(result.expectedProvisionIds).toHaveLength(38);
    expect(result.missingProvisionIds).toContain('11.18.2');
  });

  it('preserves the base text outside the exact scope of a partial reform', () => {
    const base = [{
      kind: 'rule', id: '2.1.6', label: 'Regla 2.1.6', content: 'Texto base íntegro.',
      contentSha256: 'base-hash', sourcePages: [10],
    }];
    const amendment = [{
      kind: 'rule', id: '2.1.6', label: 'Regla 2.1.6', content: '… III. Nuevo periodo vacacional.',
      contentSha256: 'amendment-hash', sourcePages: [1],
    }];
    const result = consolidateRmfProvisions(base, amendment, {
      publishedAt: '2026-07-09', effectiveFrom: '2026-07-10', url: 'https://example.test/mod.pdf', sourceSha256: 'source-hash',
    });

    expect(result.status).toBe('fail');
    expect(result.provisions[0].content).toContain('Texto base íntegro.');
    expect(result.provisions[0].content).toContain('No se deben completar los puntos suspensivos');
  });
});

describe('detección de encabezados de artículo', () => {
  it('reconoce "Artículo. 88." con punto después de la palabra Artículo', () => {
    expect(matchArticleHeading('Artículo. 88. Para efectos del artículo 61, fracción I de la Ley')).toBe('88');

    const result = extractLawArticles([
      { num: 1, text: `Artículo 87.- ${longText('Padrón de exportadores sectorial')}\nArtículo. 88. Para efectos del artículo 61, fracción I de la Ley, estarán comprendidas las siguientes\nMercancías: las importadas por misiones diplomáticas.` },
    ]);

    expect(result.provisions.map(item => item.id)).toEqual(['87', '88']);
    expect(result.provisions[1].content).toMatch(/^Para efectos del artículo 61/);
    expect(result.provisions[0].content).not.toContain('Para efectos del artículo 61');
  });

  it('reconoce el sufijo QUINTUS y lo normaliza como Quintus', () => {
    expect(normalizeProvisionId('18-H QUINTUS', 'article')).toBe('18-H Quintus');
    expect(matchArticleHeading('Artículo 18-H QUINTUS. Para los efectos de lo dispuesto')).toBe('18-H QUINTUS');

    const result = extractLawArticles([
      { num: 1, text: `Artículo 18-H QUÁTER.- ${longText('Bloqueo temporal')}\nArtículo 18-H QUINTUS. Para los efectos de lo dispuesto en los artículos 18-H BIS, 18-H TER y 18-H\nQUÁTER, el Servicio de Administración Tributaria dará a conocer el nombre del proveedor.` },
    ]);

    expect(result.provisions.map(item => item.id)).toEqual(['18-H Quáter', '18-H Quintus']);
    expect(result.provisions[0].content).not.toContain('QUINTUS');
  });

  it('no convierte en encabezado una línea partida que empieza con "artículo N de"', () => {
    expect(matchArticleHeading('artículo 76 de este ordenamiento, así como el supuesto previsto en el artículo 78')).toBeNull();
    expect(matchArticleHeading('Artículo 76 de este ordenamiento')).toBeNull();

    const pages = [{
      num: 1,
      text: [
        'Artículo 75.- Las autoridades fiscales, al imponer multas, deberán fundar y motivar su resolución.',
        'VII. Lo dispuesto en esta fracción no será aplicable cuando se presente el supuesto previsto en el',
        'artículo 76 de este ordenamiento, así como el supuesto previsto en el artículo 78, de este Código.',
        'Artículo 76. Cuando la comisión de una o varias infracciones origine la omisión total o parcial en el',
        'pago de contribuciones, se aplicará una multa del 55% al 75% de las contribuciones omitidas.',
      ].join('\n'),
    }];
    const plain = extractLawArticles(pages);
    const styled = extractLawArticles([{ ...pages[0], headings: [{ id: '75' }, { id: '76' }] }]);

    for (const result of [plain, styled]) {
      expect(result.provisions.map(item => item.id)).toEqual(['75', '76']);
      expect(result.provisions[0].content).toContain('artículo 76 de este ordenamiento, así como el supuesto previsto en el artículo 78, de este Código.');
      expect(result.provisions[1].content).toMatch(/^Cuando la comisión de una o varias infracciones/);
    }
  });

  it('reconoce "ARTICULO 167." en mayúsculas sin acento y no la referencia partida previa', () => {
    expect(matchArticleHeading('ARTICULO 167. En los casos de las fracciones I, V, X y XI del artículo 164')).toBe('167');

    const result = extractLawArticles([{
      num: 1,
      headings: [{ id: '166' }, { id: '167' }],
      text: [
        'ARTICULO 166. El derecho de ejercer la patente de agente aduanal se extinguirá cuando:',
        'Para efectos de lo anterior, la autoridad competente deberá sujetarse al procedimiento referido en el',
        'artículo 167 de esta Ley, así como a lo establecido en sus artículos 167-A, 167-B y 167-C.',
        'ARTICULO 167. En los casos de las fracciones I, V, X y XI del artículo 164 de esta Ley, las',
        'autoridades aduaneras ordenarán la suspensión provisional.',
      ].join('\n'),
    }]);

    expect(result.provisions.map(item => item.id)).toEqual(['166', '167']);
    expect(result.provisions[0].content).toContain('artículo 167 de esta Ley, así como a lo establecido');
    expect(result.provisions[1].content).toMatch(/^En los casos de las fracciones I, V, X y XI/);
  });

  it('reconoce la letra separada por espacio y el sufijo seguido de número', () => {
    expect(matchArticleHeading('Artículo 17 A.- Las restricciones y regulaciones no arancelarias')).toBe('17 A');
    expect(matchArticleHeading('ARTICULO 137 bis 1.- Las personas físicas que acrediten su residencia')).toBe('137 bis 1');
    expect(matchArticleHeading('Artículo 1390 Bis 12.- Las partes podrán ofrecer pruebas')).toBe('1390 Bis 12');
    expect(matchArticleHeading('Artículo 32 bis 1. Las garantías mobiliarias que se constituyan')).toBe('32 bis 1');
    expect(matchArticleHeading('Artículo 228 o.- Los términos y condiciones de las emisiones')).toBe('228 o');

    expect(normalizeProvisionId('17 A', 'article')).toBe('17-A');
    expect(normalizeProvisionId('228 o', 'article')).toBe('228-O');
    expect(normalizeProvisionId('137 bis 1', 'article')).toBe('137 Bis 1');
    expect(normalizeProvisionId('1390 Ter 3', 'article')).toBe('1390 Ter 3');
    expect(normalizeProvisionId('3o', 'article')).toBe('3');
  });

  it('no abre artículos con referencias que llevan letra o número después del sufijo', () => {
    expect(matchArticleHeading('Artículo 17 A de la Ley de Comercio Exterior')).toBeNull();
    expect(matchArticleHeading('Artículo 21 bis 1 de este Código, la prelación')).toBeNull();
    expect(matchArticleHeading('Artículo 5 a la fecha de su publicación')).toBeNull();
  });

  it('separa los artículos con sufijo y número que antes quedaban dentro del anterior', () => {
    const result = extractLawArticles([{
      num: 1,
      headings: [{ id: '1390 Bis' }, { id: '1390 Bis 1' }, { id: '1390 Bis 2' }, { id: '17' }, { id: '17 A' }],
      text: [
        `Artículo 1390 Bis.- ${longText('Juicio oral mercantil')}`,
        `Artículo 1390 Bis 1. ${longText('No se sustanciarán en este juicio')}`,
        `Artículo 1390 Bis 2.- ${longText('Principios de oralidad')}`,
        `Artículo 17.- ${longText('Restricciones')}`,
        `Artículo 17 A.- ${longText('Regulaciones no arancelarias')}`,
      ].join('\n'),
    }]);

    expect(result.provisions.map(item => item.id)).toEqual(['1390 Bis', '1390 Bis 1', '1390 Bis 2', '17', '17-A']);
    expect(result.provisions[0].content).not.toContain('No se sustanciarán');
  });

  it('detiene el cuerpo de la ley en el encabezado espaciado "T r a n s i t o r i o s"', () => {
    const result = extractLawArticles([
      { num: 1, text: `Artículo 203.- ${longText('Recurso de revocación')}` },
      { num: 2, text: 'Reforma DOF 30-12-1996: Derogó del artículo el entonces último párrafo\nT r a n s i t o r i o s\nPrimero. La presente Ley entrará en vigor el 1o. de abril de 1996.' },
    ]);

    expect(result.provisions.map(item => item.id)).toEqual(['203']);
    expect(result.provisions[0].content).not.toContain('Primero. La presente Ley');
    expect(result.transitoryPage).toBe(2);
  });
});

describe('limpieza de publicaciones del DOF', () => {
  it('elimina los encabezados de página de la edición vespertina', () => {
    const text = cleanPageText([
      'XVI. El 23 de julio se le restará la cantidad de 0.88 pesos por litro.',
      'Jueves 1 de octubre de 2026 DIARIO OFICIAL (Edición Vespertina)',
      '(Edición Vespertina) DIARIO OFICIAL Jueves 1 de octubre de 2026',
      'XVII. El 30 de julio se le restará la cantidad de 0.89 pesos por litro.',
    ].join('\n'));

    expect(text).toBe('XVI. El 23 de julio se le restará la cantidad de 0.88 pesos por litro.\nXVII. El 30 de julio se le restará la cantidad de 0.89 pesos por litro.');
  });
});

describe('resoluciones de modificaciones sucesivas', () => {
  const secondAmendmentPage = {
    num: 1,
    text: [
      'PRIMERO. Se reforma la regla 9.4.4., segundo párrafo y se adicionan las reglas 9.4.4., tercer y cuarto',
      'párrafos, pasando los actuales a ser quinto y sexto, respectivamente; y 11.7.3., fracciones XIV a la XXVI de la',
      'Resolución Miscelánea Fiscal para 2026, para quedar de la siguiente manera:',
      '“Pago de ISR a cargo de las personas físicas residentes en el extranjero',
      '9.4.4. ...',
      'Los jugadores a que se refiere esta regla, aplicarán lo dispuesto en el artículo 170 de la Ley del ISR.',
      '...',
      'LIF Vigésimo Quinto Transitorio, LISR 4, 170, RMF 2.1.18., 9.4.3.',
      'Cálculo del precio base del diésel',
      '11.7.3. …',
      'I. a XIII. ...',
      'XIV. El 9 de julio se le restará la cantidad de 0.92 pesos por litro.',
      'XXVI. El 1 de octubre se le restará la cantidad de 1.06 pesos por litro.',
      'Decreto IEPS combustibles DOF 27/12/2016 modificado mediante Decreto DOF 31/12/2025”',
      'SEGUNDO. Se da a conocer la Segunda Modificación al Anexo 2 de la RMF para 2026.',
      'TERCERO. Se adiciona el transitorio Vigésimo Noveno a la Resolución Miscelánea Fiscal para 2026.',
      'Transitorio',
      'Único. La presente resolución entrará en vigor a partir de la fecha de su publicación en el DOF.',
    ].join('\n'),
  };

  it('separa reformas y adiciones aunque la directiva no use punto y coma', () => {
    const summary = extractRmfAmendmentSummary([secondAmendmentPage]);

    expect(summary.status).toBe('parsed_directive_requires_patch_application');
    expect(summary.operations.reformed).toEqual(['9.4.4']);
    expect(summary.operations.added).toEqual(['9.4.4', '11.7.3']);
    expect(compareDirectiveWithDefinition(summary, RMF_2026_SECOND_AMENDMENT)).toMatchObject({ status: 'pass', undeclaredMentions: [] });
  });

  it('detecta cuando la directiva menciona una regla no declarada en la definición', () => {
    const summary = extractRmfAmendmentSummary([{ num: 1, text: 'PRIMERO. Se reforman las reglas 9.4.4. y 2.1.6. para quedar de la siguiente manera:' }]);
    expect(compareDirectiveWithDefinition(summary, RMF_2026_SECOND_AMENDMENT)).toMatchObject({ status: 'fail', undeclaredMentions: ['2.1.6'] });
  });

  it('registra una resolución que sólo modifica anexos como revisada sin cambios en reglas', () => {
    const summary = extractRmfAmendmentSummary([{
      num: 1,
      text: 'resuelve:\nÚNICO. Se da a conocer la Primera Modificación al Anexo 7 de la RMF para 2026.\nTransitorio\nÚnico. La presente resolución entrará en vigor a partir del 31 de diciembre de 2026.',
    }]);

    expect(summary.status).toBe('checked_no_rule_changes');
    expect(summary.mentionedProvisionIds).toEqual([]);
  });

  it('extrae los bloques de la segunda resolución sin arrastrar los resolutivos siguientes', () => {
    const result = extractRmfAmendmentProvisions([secondAmendmentPage], {}, RMF_2026_SECOND_AMENDMENT);

    expect(result.status).toBe('pass');
    expect(result.expectedProvisionIds).toEqual(['9.4.4', '11.7.3']);
    const rule1173 = result.provisions.find(item => item.id === '11.7.3');
    expect(rule1173?.content).toContain('XXVI. El 1 de octubre');
    expect(rule1173?.content).not.toContain('SEGUNDO.');
    expect(rule1173?.content).not.toMatch(/[”"]\s*$/);
  });

  it('aplica resoluciones en secuencia conservando el texto previo fuera del alcance modificado', () => {
    const base = [
      { kind: 'rule', id: '9.4.4', label: 'Regla 9.4.4', content: 'Texto base de la regla 9.4.4.', contentSha256: 'base-944', sourcePages: [400] },
      { kind: 'rule', id: '11.7.3', label: 'Regla 11.7.3', content: '[ACTUALIZACIÓN OFICIAL VIGENTE — PRIMERA RESOLUCIÓN DE MODIFICACIONES 2026]\nI. a XIII. Texto de la primera resolución.', contentSha256: 'base-1173', sourcePages: [9] },
    ];
    const amendment = extractRmfAmendmentProvisions([secondAmendmentPage], {}, RMF_2026_SECOND_AMENDMENT);
    const result = applyAmendmentSequence(base, [{
      definition: RMF_2026_SECOND_AMENDMENT,
      provisions: amendment.provisions,
      metadata: { publishedAt: '2026-10-01', effectiveFrom: '2026-10-01', url: 'https://example.test/2aRM.pdf', sourceSha256: 'hash-2arm' },
    }]);

    expect(result.status).toBe('pass');
    expect(result.steps[0].patches.map(patch => [patch.id, patch.operation])).toEqual([
      ['9.4.4', 'reforma y adición'],
      ['11.7.3', 'adición'],
    ]);
    const rule944 = result.provisions.find(item => item.id === '9.4.4');
    expect(rule944?.content).toMatch(/^\[ACTUALIZACIÓN OFICIAL VIGENTE — SEGUNDA RESOLUCIÓN DE MODIFICACIONES 2026]/);
    expect(rule944?.content).toContain('Texto base de la regla 9.4.4.');
    const rule1173 = result.provisions.find(item => item.id === '11.7.3');
    expect(rule1173?.content).toContain('Alcance publicado: fracciones XIV a XXVI.');
    expect(rule1173?.content).toContain('PRIMERA RESOLUCIÓN DE MODIFICACIONES 2026]\nI. a XIII. Texto de la primera resolución.');
  });

  it('calcula los parches esperados a partir de la definición y no de un número fijo', () => {
    const base = ['1.4.12', '1.4.14', '3.1.2', '3.7.20', '4.5.15', '4.5.33', '4.6.11', '7.1.4', '7.1.5', '7.2.1'].map(id => ({
      kind: 'rule', id, label: `Regla ${id}`, content: `Texto base ${id}.`, contentSha256: `base-${id}`, sourcePages: [1],
    }));
    const amendments = base.map(item => ({ ...item, content: `Texto modificatorio ${item.id}.`, contentSha256: `mod-${item.id}` }));
    const result = consolidateRmfProvisions(base, amendments, {
      publishedAt: '2026-09-22', effectiveFrom: '2026-09-23', url: 'https://example.test/2daRM.pdf', sourceSha256: 'hash-rgce',
    }, RGCE_2026_SECOND_AMENDMENT);

    expect(result.status).toBe('pass');
    expect(result.patches).toHaveLength(10);
    expect(result.provisions.find(item => item.id === '1.4.12')?.content).not.toContain('Texto base 1.4.12.');
    expect(result.provisions.find(item => item.id === '3.1.2')?.content).toContain('Texto base 3.1.2.');
  });

  it('añade notas de la fuente al encabezado del corpus', () => {
    const markdown = renderCorpusMarkdown({ name: 'Ley de prueba', code: 'LP', url: 'https://example.test/ley.pdf' }, [], {
      sourceSha256: 'abc', checkedAt: '2026-10-20', lastReform: '2025-12-29',
      sourceNotes: ['Fracciones arancelarias de la Tarifa de la Ley modificadas por Decreto DOF 13-10-2026'],
    });

    expect(markdown).toContain('> Última reforma indicada en la fuente: 2025-12-29\n> Nota de la fuente: Fracciones arancelarias de la Tarifa de la Ley modificadas por Decreto DOF 13-10-2026\n');
  });
});

describe('promoción de leyes sin cambios', () => {
  const source = { name: 'Ley de prueba', code: 'LP', url: 'https://example.test/ley.pdf' };
  const provision = { kind: 'article', id: '1', label: 'Artículo 1', content: 'Texto vigente.', contentSha256: 'x', sourcePages: [1] };
  const render = (overrides: Record<string, unknown> = {}) => renderCorpusMarkdown(source, [provision], {
    sourceSha256: 'abc', checkedAt: '2026-10-20', lastReform: '2025-12-29', ...overrides,
  });

  it('conserva la fecha canónica cuando sólo cambia la fecha de verificación', () => {
    const canonical = render({ checkedAt: '2026-07-14' }).replace(/\n/g, '\r\n');
    expect(unchangedVerificationDate(render(), canonical)).toBe('2026-07-14');
  });

  it('no conserva la fecha si cambian el texto, la fuente o sus notas', () => {
    const canonical = render({ checkedAt: '2026-07-14' });
    expect(unchangedVerificationDate(render({ sourceSha256: 'def' }), canonical)).toBeNull();
    expect(unchangedVerificationDate(render({ sourceNotes: ['Nota nueva'] }), canonical)).toBeNull();
    expect(unchangedVerificationDate(renderCorpusMarkdown(source, [{ ...provision, content: 'Texto reformado.' }], {
      sourceSha256: 'abc', checkedAt: '2026-10-20', lastReform: '2025-12-29',
    }), canonical)).toBeNull();
    expect(unchangedVerificationDate(render(), '')).toBeNull();
  });
});
