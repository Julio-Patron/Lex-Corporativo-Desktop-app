import { describe, expect, it } from 'vitest';
import {
  DocumentClassifier,
  EvidenceMapper,
  RiskScoring,
  generateDeterministicLegalAudit,
} from '../src/main/lib/core-legal/business-core';

describe('business-core: Motor determinista y clasificador universal', () => {
  it('clasifica correctamente distintos formatos y tipos documentales', () => {
    expect(DocumentClassifier.classify('Contrato_Prestacion_Servicios.docx', 'application/docx')).toBe('contract');
    expect(DocumentClassifier.classify('Factura_CFDI_4.0_Emisor.xml', 'application/xml')).toBe('cfdi');
    expect(DocumentClassifier.classify('Comprobante_Pago_SPEI.pdf', 'application/pdf')).toBe('payment_proof');
    expect(DocumentClassifier.classify('Reporte_Entregable_Fase1.pdf', 'application/pdf')).toBe('deliverable');
    expect(DocumentClassifier.classify('Bitacora_Evidencia.pdf', 'application/pdf')).toBe('evidence');
  });

  it('evalúa la suficiencia probatoria con EvidenceMapper', () => {
    const docs = [
      { documentId: 'doc:1', fileName: 'contrato.docx', mimeType: 'docx', category: 'contract' as const },
      { documentId: 'doc:2', fileName: 'factura.xml', mimeType: 'xml', category: 'cfdi' as const },
      { documentId: 'doc:3', fileName: 'spei.pdf', mimeType: 'pdf', category: 'payment_proof' as const },
      { documentId: 'doc:4', fileName: 'entregable.pdf', mimeType: 'pdf', category: 'deliverable' as const },
    ];

    const support = EvidenceMapper.assessSupportStrength(docs);
    expect(support.score).toBe(80);
    expect(support.level).toBe('Alto');
    expect(support.isSufficient).toBe('Sí');
    expect(support.missingCategories).toBeUndefined();
  });



  it('genera un dictamen determinista completo con riesgos y fundamentación para materia laboral', () => {
    const audit = generateDeterministicLegalAudit({
      files: [
        {
          name: 'Contrato_Individual_Trabajo.docx',
          text: `CONTRATO INDIVIDUAL DE TRABAJO
Comparece por una parte EMPRESA CORPORATIVA SA DE CV y por otra parte JUAN PÉREZ LÓPEZ.
CLÁUSULA PRIMERA.- OBJETO. El trabajador prestará sus servicios como especialista legal.
CLÁUSULA SEGUNDA.- SALARIO. Percibirá un salario de $25,000 mensuales.`,
          mimeType: 'docx',
        },
      ],
      ecosystem: 'laboral',
      ragSources: [
        {
          id: 'leg:1',
          title: 'Condiciones de Trabajo',
          law: 'Ley Federal del Trabajo',
          article: 'Artículo 25',
          content: 'El escrito en que consten las condiciones de trabajo deberá contener...',
          relevanceScore: 0.95,
        },
      ],
      userPrompt: 'Auditar condiciones laborales y jornada',
    });

    expect(audit.summary).toBeDefined();
    expect(audit.documentType).toBe('Contrato individual de trabajo');
    expect(audit.riskScore).toBeGreaterThan(0);
    expect(audit.detectedParties).toContain('EMPRESA CORPORATIVA SA DE CV');
    expect(Array.isArray(audit.risks)).toBe(true);
    expect(Array.isArray(audit.missingClauses)).toBe(true);
    expect((audit.missingClauses as string[]).some((c: string) => c.includes('jornada'))).toBe(true);
    expect(audit.groundingClaims).toBeDefined();
  });

  it('declara el alcance de la revisión básica: qué se verificó y con qué resultado', () => {
    const audit = generateDeterministicLegalAudit({
      files: [{
        name: 'Contrato_Individual_Trabajo.docx',
        text: 'CLÁUSULA SEGUNDA.- SALARIO. Percibirá un salario de $25,000 mensuales más prestaciones de ley.',
      }],
      ecosystem: 'laboral',
      ragSources: [],
    });

    expect(audit).toMatchObject({ reviewMode: 'basic', engine: 'local_rules', confidence: 'low' });
    expect(audit.checks).toEqual([
      { id: 'jornada', materia: 'laboral', label: 'Jornada u horario de trabajo', found: false },
      { id: 'salario', materia: 'laboral', label: 'Salario o prestaciones', found: true },
    ]);
    expect(audit.summary).toContain('Se verificó la presencia de 2 elementos mínimos');
    expect(audit.summary).toContain('no interpreta el contenido ni valida su legalidad');
    // La suficiencia del expediente por nombres de archivo sólo aplica a la materialidad fiscal.
    expect(audit.summary).not.toContain('CFDI');
    expect(audit.riskCategories).toEqual({ documentales: [] });
  });

  it('no inventa partes ni cláusulas cuando no las detecta', () => {
    const audit = generateDeterministicLegalAudit({
      files: [{ name: 'nota.txt', text: 'Texto sin estructura contractual.' }],
      ecosystem: 'mercantil',
      ragSources: [],
    });

    expect(audit.detectedParties).toEqual([]);
    expect(audit.detectedObligations).toEqual([]);
    expect(audit.documentType).toBe('Documento sin clasificar');
  });

  it('enlaza los artículos recuperados del corpus con su identificador original', () => {
    const audit = generateDeterministicLegalAudit({
      files: [{ name: 'contrato.pdf', text: 'Las partes se someten a los tribunales de la Ciudad de México.' }],
      ecosystem: 'mercantil',
      ragSources: [{
        id: 'CCom-1093',
        title: 'Código de Comercio',
        law_code: 'CCom',
        article_number: 'Artículo 1093',
        content: 'Hay sumisión expresa cuando los interesados renuncien clara y terminantemente al fuero...',
        similarity: 0.82,
      }],
    });

    expect(audit.legalFoundations).toEqual([expect.objectContaining({
      id: 'CCom-1093',
      law: 'CCom',
      article: 'Artículo 1093',
      relevanceScore: 0.82,
    })]);
  });

  it('genera una auditoría integral 360° evaluando múltiples materias simultáneamente', () => {
    const audit = generateDeterministicLegalAudit({
      files: [
        {
          name: 'Contrato_Suministro_Internacional.docx',
          text: `CONTRATO DE SUMINISTRO MERCANTIL
Comparece por una parte PROVEEDOR GLOBAL SA DE CV y por otra parte CLIENTE OPERATIVO SA DE CV.
CLÁUSULA PRIMERA.- OBJETO. Venta de insumos industriales importados.
CLÁUSULA SEGUNDA.- PRECIO. Se pagará la suma pactada en la orden de compra.`,
          mimeType: 'docx',
        },
      ],
      ecosystems: ['mercantil', 'fiscal', 'comercio_exterior'],
      ragSources: [
        {
          id: 'leg:1',
          title: 'Actos de Comercio',
          law: 'Código de Comercio',
          article: 'Artículo 75',
          content: 'La ley reputa actos de comercio...',
          relevanceScore: 0.9,
        },
      ],
      userPrompt: 'Auditoría integral 360°',
    });

    expect(audit.summary).toBeDefined();
    expect(audit.detectedParties).toContain('PROVEEDOR GLOBAL SA DE CV');
    expect(Array.isArray(audit.risks)).toBe(true);
    expect(Array.isArray(audit.missingClauses)).toBe(true);

    const missing = audit.missingClauses as string[];
    // Checks that clauses from fiscal, mercantil and comercio_exterior were evaluated
    expect(missing.some((c: string) => c.includes('CFDI'))).toBe(true); // Fiscal check
    expect(missing.some((c: string) => c.includes('Incoterm'))).toBe(true); // Comercio exterior check
    expect(missing.some((c: string) => c.includes('sumisión') || c.includes('jurisdicción') || c.includes('pena'))).toBe(true); // Mercantil check
    // Comercio exterior y aduanal comparten la verificación del Incoterm: se reporta una sola vez.
    expect((audit.checks as Array<{ id: string }>).filter(check => check.id === 'incoterm')).toHaveLength(1);
  });
});

