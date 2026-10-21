import { describe, expect, it } from 'vitest';
import {
  extractCompilationLastReform,
  extractLigieProvisions,
  extractSourceNotes,
  repairSplitSuffixArticles,
  sanitizePages,
  verifyCompilationIncludesAmendment,
} from '../scripts/official-documental-parser.mjs';

const ligieSource = { code: 'LIGIE', repeatedHeader: 'LEY DE LOS IMPUESTOS GENERALES DE IMPORTACIÓN Y DE EXPORTACIÓN' };
const filler = 'Texto de la nota del capítulo con fracciones arancelarias y descripciones suficientemente extensas.';

function ligiePages() {
  return [
    {
      num: 1,
      text: [
        'LEY DE LOS IMPUESTOS GENERALES DE IMPORTACIÓN Y DE EXPORTACIÓN',
        'Artículo 1o.- Se establecen las cuotas que servirán para determinar los impuestos, de conformidad con la',
        'siguiente:',
        'TARIFA',
        'Capítulo 76',
        'Aluminio y sus manufacturas',
        filler,
        '7616.99.99 Las demás. Kg 25 Ex.',
        '_______________',
        'Capítulo 78 (Sic DOF 07-06-2022)',
        'Plomo y sus manufacturas',
        filler,
        '7806.00.99 Las demás manufacturas de plomo. Kg 5 Ex.',
      ].join('\n'),
    },
    {
      num: 2,
      text: [
        'LEY DE LOS IMPUESTOS GENERALES DE IMPORTACIÓN Y DE EXPORTACIÓN',
        'Capítulo 79',
        'Cinc y sus manufacturas',
        filler,
        'Capítulo 98',
        'Operaciones especiales',
        'a) importaciones o exportaciones de muestras y muestrarios que cumplan con lo previsto en el',
        'artículo 2o. fracción II, Regla Complementaria 7a, inciso d), de la presente Ley (partida',
        '98.01);',
        '9803.00.01 Partes y componentes para el ensamble de automóviles.',
        'Arancel modificado con vigencia temporal DOF 13-10-2026',
        '(antes Imp. 10)',
        'Kg Ex. Ex.',
      ].join('\n'),
    },
    {
      num: 3,
      text: [
        'Artículo 2o.- Las Reglas Generales y las Complementarias para la aplicación e interpretación de esta',
        'Ley, son las siguientes: reglas generales de clasificación de mercancías en la Tarifa.',
        'TRANSITORIOS',
        'Primero. La presente Ley entrará en vigor.',
      ].join('\n'),
    },
  ];
}

describe('extracción de la LIGIE', () => {
  it('reconoce capítulos con anotación editorial "(Sic DOF ...)"', () => {
    const result = extractLigieProvisions(ligiePages(), ligieSource);
    const ids = result.provisions.map(item => item.id);

    expect(ids).toEqual(['1-Capitulo-76', '1-Capitulo-78', '1-Capitulo-79', '1-Capitulo-98', '2']);
    const chapter76 = result.provisions.find(item => item.id === '1-Capitulo-76');
    expect(chapter76?.content).not.toContain('Plomo y sus manufacturas');
    expect(result.provisions.find(item => item.id === '1-Capitulo-78')?.content).toMatch(/^Plomo y sus manufacturas/);
  });

  it('no corta el último capítulo en una referencia partida al "artículo 2o."', () => {
    const result = extractLigieProvisions(ligiePages(), ligieSource);
    const chapter98 = result.provisions.find(item => item.id === '1-Capitulo-98');

    expect(chapter98?.content).toContain('9803.00.01 Partes y componentes');
    expect(chapter98?.content).toContain('Arancel modificado con vigencia temporal DOF 13-10-2026');
    expect(chapter98?.content).not.toContain('Las Reglas Generales y las Complementarias');
    expect(result.provisions.find(item => item.id === '2')?.content).toMatch(/^Las Reglas Generales y las Complementarias/);
  });

  it('elimina el encabezado repetido de la ley aunque lleve acentos', () => {
    const result = extractLigieProvisions(ligiePages(), ligieSource);
    expect(result.provisions.some(item => item.content.includes('LEY DE LOS IMPUESTOS GENERALES DE IMPORTACIÓN'))).toBe(false);
  });
});

describe('utilidades del corpus documental', () => {
  it('extrae la nota de fracciones modificadas por decreto de la primera página', () => {
    const notes = extractSourceNotes([
      'TEXTO VIGENTE',
      'Última reforma publicada DOF 29-12-2025',
      'Fracciones arancelarias de la Tarifa de la Ley modificadas por Decreto DOF 13-10-2026',
      'Al margen un sello con el Escudo Nacional',
    ].join('\n'));

    expect(notes).toEqual(['Fracciones arancelarias de la Tarifa de la Ley modificadas por Decreto DOF 13-10-2026']);
    expect(extractSourceNotes('TEXTO VIGENTE\nÚltima reforma publicada DOF 14-05-2026')).toEqual([]);
  });

  it('toma como última reforma de una compilación la resolución más reciente que enumera', () => {
    const firstPage = [
      'Página 1 de 481',
      'Reglas Generales de Comercio Exterior para 2026',
      'Publicadas en el Diario Oficial de la Federación el 27 de',
      'diciembre de 2025, reformadas mediante la Primera',
      'Resolución de Modificaciones a las Reglas Generales de',
      'Comercio Exterior (RMRGCE) para 2026, publicada en el',
      'citado órgano de difusión el 14 de mayo de 2026 y la',
      'Segunda RMRGCE para 2026, publicada en el citado',
      'órgano de difusión el 22 de septiembre de 2026.',
    ].join('\n');

    expect(extractCompilationLastReform(firstPage)).toBe('2026-09-22');
    expect(extractCompilationLastReform('Publicadas en el Diario Oficial de la Federación el 27 de diciembre de 2025.')).toBeNull();
  });

  it('quita la nota de compilación que el SAT repite al inicio de cada página de las RGCE', () => {
    const [page] = sanitizePages([{
      num: 100,
      text: [
        'NOTA: Este documento constituye una compilación de las resoluciones publicadas en el Diario Oficial de la Federación, con la finalidad',
        'de dar a conocer el texto actualizado de las Reglas Generales de Comercio Exterior, de conformidad con el artículo 5 de la Ley Federal',
        'de los Derechos del Contribuyente. Para sustentar legalmente actos o resoluciones se deberá utilizar la publicación del Diario Oficial',
        'de la Federación.',
        'Página 100 de 481',
        'aeronáutica, deberán eliminar la transmisión efectuada y sustituirla con una nueva transmisión. El aviso se publicará en el',
        'Diario Oficial',
        'de la Federación.',
      ].join('\n'),
    }], { code: 'RGCE' });

    expect(page.text).toBe([
      'aeronáutica, deberán eliminar la transmisión efectuada y sustituirla con una nueva transmisión. El aviso se publicará en el',
      'Diario Oficial',
      'de la Federación.',
    ].join('\n'));
  });

  it('confirma que la compilación trae el texto literal de cada bloque de la resolución', () => {
    const compiled = [
      { id: '1.4.12', content: 'Para los efectos del artículo 184-C de la Ley, se cumplirá con la ficha de trámite 20/LA\n"Solicitud para dejar sin efectos la suspensión", contenida en el Anexo 2.\nLey 184-C, RGCE 1.2.2.' },
      { id: '4.5.33', content: 'Los almacenes deberán:\nI. Presentar el aviso.\nII. Conservar copia.\nIII. Transmitir la información en la Ventanilla Digital.\nLey 119' },
    ];
    const amendment = [
      // Reforma completa: termina con el título de la regla siguiente, que no forma parte del bloque.
      { id: '1.4.12', content: 'Para los efectos del artículo 184-C de la Ley, se cumplirá con la ficha de\ntrámite 20/LA “Solicitud para dejar sin efectos la suspensión”, contenida en el Anexo 2.\nLey 184-C, RGCE 1.2.2.\nExpediente que debe integrar el agente aduanal respecto de los\nusuarios que les soliciten operaciones' },
      // Reforma parcial: las porciones omitidas se marcan con puntos suspensivos.
      { id: '4.5.33', content: '...\nI. y II. ...\nIII. Transmitir la información en la Ventanilla Digital.\n…' },
    ];

    expect(verifyCompilationIncludesAmendment(compiled, amendment)).toMatchObject({
      status: 'pass',
      rules: [{ id: '1.4.12', status: 'pass' }, { id: '4.5.33', status: 'pass' }],
    });

    const outdated = [{ ...compiled[1], content: 'III. Transmitir la información en el portal anterior.' }];
    expect(verifyCompilationIncludesAmendment(outdated, [amendment[1]])).toMatchObject({
      status: 'fail',
      rules: [{ id: '4.5.33', status: 'fail', missingFragments: ['III. Transmitir la información en la Ventanilla Digital.'] }],
    });
    expect(verifyCompilationIncludesAmendment([], [amendment[0]]).rules[0]).toMatchObject({ status: 'fail', found: false });
  });

  it('repara sufijos partidos incluido Quintus', () => {
    const [repaired] = repairSplitSuffixArticles([{
      kind: 'article', id: '18', label: 'Artículo 18', content: 'Quintus.- Texto del artículo con sufijo partido.', contentSha256: 'x', sourcePages: [1],
    }]);

    expect(repaired.id).toBe('18 Quintus');
    expect(repaired.content).toBe('Texto del artículo con sufijo partido.');
  });
});
