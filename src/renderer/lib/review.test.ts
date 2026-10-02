import { describe, expect, it } from 'vitest';
import type { ReviewRecord } from '../types';
import { buildAddendumInstructions, buildReviewReport, reviewModeLabel } from './review';

function record(overrides: Partial<ReviewRecord> = {}): ReviewRecord {
  return {
    id: 'rev-1',
    title: 'Revisión de contrato.pdf',
    fileName: 'contrato.pdf',
    areas: ['laboral'],
    timestamp: '2026-09-20T10:00:00.000Z',
    instruction: '',
    reviewMode: 'basic',
    result: {
      summary: 'Revisión básica por reglas locales.',
      documentType: 'Contrato',
      riskScore: 20,
      detectedParties: ['ACME SA DE CV'],
      detectedObligations: [],
      missingClauses: ['Jornada de trabajo'],
      missingData: [],
      checks: [
        { id: 'jornada', materia: 'laboral', label: 'Jornada u horario de trabajo', found: false },
        { id: 'salario', materia: 'laboral', label: 'Salario o prestaciones', found: true },
      ],
      risks: [{ title: 'Jornada de trabajo', severity: 'medium', explanation: 'No se menciona la jornada.', reference: 'LFT Art. 59' }],
      recommendedActions: ['Precisar el centro de trabajo.'],
      legalFoundations: [{ id: 'LFT-59', title: 'LFT', law: 'LFT', article: 'Artículo 59', excerpt: 'El trabajador y el patrón fijarán la duración de la jornada.' }],
    },
    ...overrides,
  };
}

describe('review report', () => {
  it('states the scope of a basic review and lists what was verified', () => {
    const report = buildReviewReport(record());

    expect(report).toContain('# Revisión básica: contrato.pdf');
    expect(report).toContain('**Alcance:** No interpreta el contenido');
    expect(report).toContain('- No encontrado: Jornada u horario de trabajo (Laboral)');
    expect(report).toContain('- Mencionado: Salario o prestaciones (Laboral)');
    expect(report).toContain('## Recomendaciones generales de la materia');
    expect(report).toContain('## Artículos relacionados del corpus local');
    expect(report).toContain('Referencia: LFT Art. 59.');
  });

  it('labels AI reviews with their provider and omits the basic scope notice', () => {
    const ai = record({ reviewMode: 'ai', provider: 'anthropic' });
    expect(reviewModeLabel(ai)).toBe('Revisión con IA · Anthropic');
    const report = buildReviewReport(ai);
    expect(report).toContain('# Revisión jurídica: contrato.pdf');
    expect(report).not.toContain('**Alcance:**');
    expect(report).toContain('## Acciones recomendadas');
  });

  it('builds addendum instructions from the findings', () => {
    const instructions = buildAddendumInstructions(record());
    expect(instructions).toContain('«contrato.pdf»');
    expect(instructions).toContain('CLÁUSULAS A INCORPORAR:\n- Jornada de trabajo');
    expect(instructions).toContain('RIESGOS A MITIGAR:\n- Jornada de trabajo: No se menciona la jornada.');
  });
});
