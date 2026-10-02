import { describe, expect, it } from 'vitest';
import { buildDraftRequirements, documentTitleFrom, hasDraftInput, searchTemplates, TEMPLATE_CATALOG, templateArea } from './drafting';

const template = {
  id: 'laboral-contrato-prueba',
  title: 'Contrato individual de trabajo',
  description: 'Contrato por tiempo indeterminado',
  prompt: 'Contrato conforme a la LFT',
  requiredFields: ['Patrón', 'Persona trabajadora', 'Salario'],
  output: 'Contrato',
};

describe('drafting helpers', () => {
  it('builds requirements from the form and flags missing data', () => {
    const requirements = buildDraftRequirements({
      template,
      fieldValues: { 'Patrón': 'ACME SA de CV', 'Salario': '$25,000 mensuales' },
      instructions: 'Incluir cláusula de teletrabajo.',
      hasReferenceFile: false,
    });

    expect(requirements).toContain('DOCUMENTO SOLICITADO: Contrato individual de trabajo');
    expect(requirements).toContain('- Patrón: ACME SA de CV');
    expect(requirements).toContain('- Persona trabajadora: [DATO FALTANTE]');
    expect(requirements).toContain('INSTRUCCIONES ADICIONALES:\nIncluir cláusula de teletrabajo.');
  });

  it('asks to edit the attached file when drafting without a template', () => {
    const requirements = buildDraftRequirements({ template: null, fieldValues: {}, instructions: 'Actualizar la vigencia.', hasReferenceFile: true });
    expect(requirements).toContain('Usa el archivo adjunto como documento base');
    expect(requirements).toContain('INSTRUCCIONES:\nActualizar la vigencia.');
  });

  it('requires at least one datum or instruction', () => {
    expect(hasDraftInput({ template, fieldValues: {}, instructions: '  ', hasReferenceFile: false })).toBe(false);
    expect(hasDraftInput({ template, fieldValues: { Salario: '10' }, instructions: '', hasReferenceFile: false })).toBe(true);
  });

  it('finds templates across areas ignoring accents and case', () => {
    expect(TEMPLATE_CATALOG).toHaveLength(48);
    const results = searchTemplates('PAGARE', 'todas');
    expect(results.some((item) => item.id === 'mercantil-pagare')).toBe(true);
    expect(searchTemplates('pagaré', 'laboral')).toHaveLength(0);
    expect(templateArea({ id: 'comercio_exterior-compraventa' })).toBe('comercio_exterior');
  });

  it('derives a document title from its first heading', () => {
    expect(documentTitleFrom('\n# **CONTRATO DE ARRENDAMIENTO**\n\nTexto', 'Documento')).toBe('CONTRATO DE ARRENDAMIENTO');
    expect(documentTitleFrom('', 'Documento')).toBe('Documento');
  });
});
