import { describe, expect, it, vi } from 'vitest';
import {
  renderGroundedClaims,
  renderGroundedDocument,
  validateGroundedLegalOutput,
  validateOrRepairStructuredGroundedOutput,
  validateStructuredGroundedOutput,
  type StructuredGroundedOutput,
} from './legal-grounding';

const sources = [
  { id: 'law:cff:69-b', kind: 'legal' as const, law_code: 'CFF', article_number: 'Artículo 69-B', content: 'Procedimiento aplicable a comprobantes de operaciones inexistentes.' },
  { id: 'law:lisr:27', kind: 'legal' as const, law_code: 'LISR', article_number: 'Artículo 27', content: 'Requisitos de las deducciones autorizadas.' },
  { id: 'doc:1', kind: 'evidence' as const, title: 'Contrato.pdf', content: 'El contrato carece de entregables.' },
];

describe('legal response grounding gate', () => {
  it('keeps exact provision allow-list validation for grounded output', () => {
    const result = validateGroundedLegalOutput(
      'El CFF, Artículo 69-B establece un procedimiento aplicable a comprobantes de operaciones inexistentes.',
      sources,
    );
    expect(result.valid).toBe(true);
  });

  it('rejects a fabricated claim even when it cites a retrieved provision', () => {
    const result = validateGroundedLegalOutput(
      'El CFF, Artículo 69-B permite deducir cualquier gasto sin requisitos.',
      sources,
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('unsupported_claim');
  });

  it('rejects a fabricated number absent from the cited provision', () => {
    const result = validateGroundedLegalOutput(
      'El CFF, Artículo 69-B establece un plazo de 90 días para el contribuyente.',
      sources,
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('unsupported_claim');
  });

  it('accepts citations to articles with a numbered suffix or a separate letter', () => {
    const suffixedSources = [
      { id: 'law:ccom:1390-bis-12', kind: 'legal' as const, law_code: 'CCom', article_number: 'Artículo 1390 Bis 12', content: 'Las partes podrán ofrecer pruebas en el juicio oral mercantil.' },
      { id: 'law:lce:17-a', kind: 'legal' as const, law_code: 'LCE', article_number: 'Artículo 17-A', content: 'Las restricciones y regulaciones no arancelarias deberán expedirse.' },
    ];

    expect(validateGroundedLegalOutput(
      'Conforme al Artículo 1390 Bis 12 del CCom, las partes podrán ofrecer pruebas en el juicio oral mercantil.',
      suffixedSources,
    ).valid).toBe(true);
    expect(validateGroundedLegalOutput(
      'El Artículo 17 A de la LCE dispone que las restricciones y regulaciones no arancelarias deberán expedirse.',
      suffixedSources,
    ).valid).toBe(true);
    expect(validateGroundedLegalOutput('También aplica el Artículo 1390 Bis 13 del CCom.', suffixedSources)).toMatchObject({
      valid: false,
      unsupported: ['CCOM:article:1390-bis-13'],
    });
  });

  it('does not read a conjunction after the number as a letter suffix', () => {
    const result = validateGroundedLegalOutput(
      'El Artículo 27 y el artículo 69-B del CFF; el Artículo 27 y siguientes de la LISR regulan los requisitos de las deducciones autorizadas.',
      sources,
    );
    expect(result.unsupported).not.toContain('LISR:article:27-y');
    expect(result.cited).toContain('LISR:article:27');
  });

  it('rejects a local citation not present in retrieved sources', () => {
    const result = validateGroundedLegalOutput('También resulta aplicable el Artículo 113 del CFF.', sources);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('unsupported_citation');
  });

  it('accepts structured claims linked to exact source identifiers', () => {
    const result = validateStructuredGroundedOutput({
      claims: [{
        claimId: 'risk-1',
        heading: 'Riesgo',
        text: 'El contrato requiere revisar la evidencia de materialidad.',
        sourceIds: ['law:cff:69-b', 'doc:1'],
      }],
    }, sources, { requiredSourceKinds: ['legal', 'evidence'] });

    expect(result.valid).toBe(true);
    expect(result.cited).toEqual(['law:cff:69-b', 'doc:1']);
  });

  it('rejects provider-invented source identifiers without lexical guessing', () => {
    const result = validateStructuredGroundedOutput({
      claims: [{
        claimId: 'risk-1',
        heading: 'Riesgo',
        text: 'Existe un plazo aplicable.',
        sourceIds: ['law:cff:invented'],
      }],
    }, sources);

    expect(result.valid).toBe(false);
    expect(result.reason).toBe('unknown_source_id');
    expect(result.unsupported).toEqual(['law:cff:invented']);
  });

  it('rejects required analysis claims omitted from the grounding map', () => {
    const result = validateStructuredGroundedOutput({
      claims: [{
        claimId: 'summary',
        heading: 'Resumen',
        text: 'Resumen distinto.',
        sourceIds: ['law:cff:69-b'],
      }],
    }, sources, { requiredClaimTexts: ['Riesgo fiscal identificado.'] });

    expect(result.valid).toBe(false);
    expect(result.reason).toBe('missing_required_claim');
  });

  it('allows one structured repair pass and revalidates exact IDs', async () => {
    const initial: StructuredGroundedOutput = {
      claims: [{ claimId: 'answer', heading: 'Respuesta', text: 'Texto inicial.', sourceIds: ['invented'] }],
    };
    const repair = vi.fn().mockResolvedValue({
      claims: [{ claimId: 'answer', heading: 'Respuesta', text: 'Texto corregido.', sourceIds: ['law:cff:69-b'] }],
    });

    const result = await validateOrRepairStructuredGroundedOutput(initial, sources, {}, repair);
    expect(repair).toHaveBeenCalledOnce();
    expect(result.repaired).toBe(true);
    expect(result.initialValidation?.reason).toBe('unknown_source_id');
    expect(result.validation.valid).toBe(true);
  });

  it('renders traceable source labels without exposing raw IDs as the only reference', () => {
    const rendered = renderGroundedClaims({
      claims: [{ claimId: 'answer', heading: 'Respuesta ejecutiva', text: 'Texto sustentado.', sourceIds: ['law:cff:69-b'] }],
    }, sources);

    expect(rendered).toContain('Respuesta ejecutiva');
    expect(rendered).toContain('Fuentes vinculadas: CFF Artículo 69-B');
  });
});

describe('grounded drafting documents', () => {
  const draftSources = [
    ...sources,
    { id: 'user:requirements', kind: 'instruction' as const, title: 'Instrucciones del usuario', content: 'Contrato con ACME.' },
    { id: 'template:mercantil-servicios', kind: 'instruction' as const, title: 'Contrato de servicios', content: 'Machote.' },
  ];
  const contract: StructuredGroundedOutput = {
    claims: [
      { claimId: 'proemio', heading: 'CONTRATO DE PRESTACIÓN DE SERVICIOS', text: 'Que celebran ACME, S.A. de C.V. y [DATO FALTANTE].', sourceIds: ['user:requirements', 'template:mercantil-servicios'] },
      { claimId: 'clausula-1', heading: 'PRIMERA. Deducibilidad', text: 'El prestador entregará CFDI por cada pago.', sourceIds: ['law:lisr:27', 'user:requirements'] },
      { claimId: 'firmas', heading: 'FIRMAS', text: '[NOMBRE Y FIRMA]', sourceIds: ['template:mercantil-servicios'] },
    ],
  };

  it('accepts sections without a legal source when the document as a whole cites one', () => {
    const result = validateStructuredGroundedOutput(contract, draftSources, { requiredSourceKindsInOutput: ['legal'] });
    expect(result.valid).toBe(true);
  });

  it('rejects a drafted document that cites no legal source when legal context was retrieved', () => {
    const result = validateStructuredGroundedOutput({
      claims: contract.claims.filter((claim) => claim.claimId !== 'clausula-1'),
    }, draftSources, { requiredSourceKindsInOutput: ['legal'] });
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('missing_citation');
    expect(result.unsupported).toEqual(['kind:legal']);
  });

  it('renders the full document first and the legal foundations in a closing annex', () => {
    const rendered = renderGroundedDocument(contract, draftSources);

    expect(rendered).not.toContain('Fuentes vinculadas');
    expect(rendered.indexOf('## FIRMAS')).toBeLessThan(rendered.indexOf('## Fundamentos'));
    expect(rendered).toContain('## CONTRATO DE PRESTACIÓN DE SERVICIOS\nQue celebran ACME, S.A. de C.V. y [DATO FALTANTE].');
    expect(rendered).toContain('- PRIMERA. Deducibilidad: LISR Artículo 27');
    expect(rendered).not.toContain('Instrucciones del usuario');
    expect(rendered).not.toContain('- FIRMAS');
  });

  it('omits the foundations annex when no section cites a legal source', () => {
    const rendered = renderGroundedDocument({ claims: [contract.claims[0], contract.claims[2]] }, draftSources);
    expect(rendered).not.toContain('Fundamentos');
  });
});
