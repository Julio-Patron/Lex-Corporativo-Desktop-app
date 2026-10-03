import { z } from 'zod';

// ── Shared Domain Schemas & Types ───────────────────────────

export const OperationDocumentSchema = z.object({
  documentId: z.string().min(1),
  fileName: z.string().min(1),
  mimeType: z.string().min(1),
  category: z.enum(['contract', 'cfdi', 'payment_proof', 'deliverable', 'evidence', 'communication', 'purchase_order', 'service_report', 'other']),
  base64: z.string().optional(),
  extractedText: z.string().optional(),
  hash: z.string().optional(),
});

export type OperationDocument = z.infer<typeof OperationDocumentSchema>;

export const OperationPartySchema = z.object({
  partyId: z.string().min(1),
  name: z.string().min(1),
  role: z.string().min(1), // e.g. "Proveedor", "Cliente", "Fiador"
  taxId: z.string().optional(), // RFC o Tax Identification Number
  legalRepresentative: z.string().optional(),
});

export type OperationParty = z.infer<typeof OperationPartySchema>;

export const EvidenceItemSchema = z.object({
  evidenceId: z.string().min(1),
  title: z.string().min(1),
  description: z.string(),
  strength: z.enum(['high', 'medium', 'low']),
  linkedDocuments: z.array(z.string()), // documentIds
  verificationStatus: z.enum(['verified', 'partial', 'unverified']),
});

export type EvidenceItem = z.infer<typeof EvidenceItemSchema>;

export const ExtractedFactSchema = z.object({
  factId: z.string().min(1),
  timestamp: z.string(),
  description: z.string(),
  category: z.string(),
  evidenceId: z.string().optional(),
});

export type ExtractedFact = z.infer<typeof ExtractedFactSchema>;

export const RiskFindingSchema = z.object({
  findingId: z.string().min(1),
  area: z.string(), // e.g. "Materiality", "Deductibility", "Guarantees"
  severity: z.enum(['critical', 'high', 'medium', 'low']),
  description: z.string(),
  legalFoundation: z.string(), // Applicable laws/articles
  mitigatingAction: z.string(),
});

export type RiskFinding = z.infer<typeof RiskFindingSchema>;

export const RecommendationSchema = z.object({
  recommendationId: z.string().min(1),
  priority: z.enum(['urgent', 'high', 'medium', 'low']),
  action: z.string(),
  expectedOutcome: z.string(),
  timeline: z.string().optional(),
});

export type Recommendation = z.infer<typeof RecommendationSchema>;

// ── Shared Domain Operations ────────────────────────────────

/**
 * 1. DocumentClassifier: Categorizes uploaded files based on mime/name/content heuristics
 */
export class DocumentClassifier {
  static classify(fileName: string, mimeType: string): OperationDocument['category'] {
    const lowerName = fileName.toLowerCase();
    
    if (lowerName.includes('contrato') || lowerName.includes('convenio') || lowerName.includes('contract') || lowerName.includes('acuerdo')) {
      return 'contract';
    }
    if (lowerName.includes('cfdi') || lowerName.includes('factura') || lowerName.includes('xml') || lowerName.includes('invoice') || lowerName.includes('nota_credito')) {
      return 'cfdi';
    }
    if (lowerName.includes('pago') || lowerName.includes('transferencia') || lowerName.includes('spei') || lowerName.includes('banco') || lowerName.includes('payment')) {
      return 'payment_proof';
    }
    if (lowerName.includes('entregable') || lowerName.includes('reporte') || lowerName.includes('producto') || lowerName.includes('deliverable') || lowerName.includes('pdf_entregable')) {
      return 'deliverable';
    }
    if (lowerName.includes('evidencia') || lowerName.includes('fotos') || lowerName.includes('registro') || lowerName.includes('bitacora') || lowerName.includes('evidence')) {
      return 'evidence';
    }
    if (lowerName.includes('correo') || lowerName.includes('comunicacion') || lowerName.includes('chat') || lowerName.includes('whatsapp') || lowerName.includes('communication')) {
      return 'communication';
    }
    if (lowerName.includes('compra') || lowerName.includes('orden') || lowerName.includes('requisicion') || lowerName.includes('purchase')) {
      return 'purchase_order';
    }
    if (lowerName.includes('servicio') || lowerName.includes('hoja_trabajo') || lowerName.includes('bitacora_servicio')) {
      return 'service_report';
    }
    
    return 'other';
  }
}

/**
 * 2. EvidenceMapper: Assesses operational and document support strength
 */
export class EvidenceMapper {
  static assessSupportStrength(
    documents: OperationDocument[],
    evidenceItems: EvidenceItem[] = []
  ): { score: number; level: 'Bajo' | 'Medio' | 'Alto'; isSufficient: 'Sí' | 'Parcial' | 'No'; missingCategories?: string[] } {
    let weight = 0;
    
    const categories = new Set(documents.map(d => d.category));
    const missingCategories: string[] = [];
    
    // Core document categories give direct weight
    if (categories.has('contract')) {
      weight += 20;
    } else {
      missingCategories.push('Contrato o convenio firmado que delimite el objeto');
    }

    if (categories.has('cfdi')) {
      weight += 15;
    } else {
      missingCategories.push('Comprobante Fiscal Digital por Internet (CFDI) con UUID válido');
    }

    if (categories.has('payment_proof')) {
      weight += 20;
    } else {
      missingCategories.push('Comprobante de transferencia bancaria / SPEI para acreditar flujo de recursos');
    }

    if (categories.has('deliverable')) {
      weight += 25;
    } else {
      missingCategories.push('Evidencia material de entregables o reportes de ejecución');
    }

    if (categories.has('evidence')) {
      weight += 15;
    }
    if (categories.has('purchase_order') || categories.has('service_report')) {
      weight += 5;
    }
    
    // Evidence strength scaling
    for (const item of evidenceItems) {
      if (item.strength === 'high' && item.verificationStatus === 'verified') weight += 5;
      else if (item.strength === 'medium' && item.verificationStatus === 'verified') weight += 3;
    }
    
    const finalScore = Math.min(weight, 100);
    
    let level: 'Bajo' | 'Medio' | 'Alto' = 'Bajo';
    let isSufficient: 'Sí' | 'Parcial' | 'No' = 'No';
    
    if (finalScore >= 80) {
      level = 'Alto';
      isSufficient = 'Sí';
    } else if (finalScore >= 50) {
      level = 'Medio';
      isSufficient = 'Parcial';
    }
    
    return missingCategories.length > 0
      ? { score: finalScore, level, isSufficient, missingCategories }
      : { score: finalScore, level, isSufficient };
  }
}


/**
 * 3. RiskScoring: Parametric risk aggregator
 */
export class RiskScoring {
  static calculateRiskScore(findings: RiskFinding[]): number {
    if (findings.length === 0) return 15; // Base minimum risk
    
    let scoreMultiplier = 0;
    
    for (const f of findings) {
      if (f.severity === 'critical') scoreMultiplier += 35;
      else if (f.severity === 'high') scoreMultiplier += 20;
      else if (f.severity === 'medium') scoreMultiplier += 10;
      else if (f.severity === 'low') scoreMultiplier += 5;
    }
    
    return Math.min(Math.max(scoreMultiplier, 10), 95);
  }
}

export type SupportedEcosystem = 'mercantil' | 'laboral' | 'comercio_exterior' | 'aduanal' | 'fiscal';

const ECOSYSTEM_LABELS: Record<SupportedEcosystem, string> = {
  mercantil: 'mercantil',
  laboral: 'laboral',
  comercio_exterior: 'comercio exterior',
  aduanal: 'aduanal',
  fiscal: 'fiscal',
};

export interface DeterministicAnalysisInput {
  files: { name: string; text: string; mimeType?: string }[];
  ecosystem?: SupportedEcosystem;
  ecosystems?: SupportedEcosystem[] | SupportedEcosystem;
  // Acepta tanto la forma de las fuentes recuperadas de LanceDB (law_code,
  // article_number, similarity) como la forma normalizada (law, article).
  ragSources: Array<{
    id?: string | number;
    title?: string;
    law?: string;
    law_code?: string;
    article?: string;
    article_number?: string;
    content: string;
    relevanceScore?: number;
    similarity?: number;
  }>;
  userPrompt?: string;
}

export interface BasicReviewCheck {
  id: string;
  materia: SupportedEcosystem;
  label: string;
  found: boolean;
}

interface BasicReviewRule {
  id: string;
  materias: SupportedEcosystem[];
  label: string;
  patterns: RegExp[];
  missingClause?: string;
  missingData?: string;
  finding?: Omit<RiskFinding, 'findingId'>;
}

/**
 * Alcance de la revisión básica: cada regla sólo comprueba si el texto extraído
 * menciona un elemento mínimo de la materia. No interpreta cláusulas ni valida
 * su legalidad; un elemento "encontrado" sólo indica que el término aparece.
 */
const BASIC_REVIEW_RULES: BasicReviewRule[] = [
  {
    id: 'cfdi',
    materias: ['fiscal'],
    label: 'Mención de CFDI o comprobantes fiscales',
    patterns: [/CFDI|UUID|comprobante/i],
    missingClause: 'Cláusula de emisión y validación de CFDI 4.0 con desglose de impuestos',
    finding: {
      area: 'Comprobantes fiscales',
      severity: 'high',
      description: 'El texto no menciona CFDI ni comprobantes fiscales que soporten la operación.',
      legalFoundation: 'Código Fiscal de la Federación Art. 29 y 29-A',
      mitigatingAction: 'Incorporar la obligación de emitir CFDI y conservar los folios fiscales.',
    },
  },
  {
    id: 'materialidad',
    materias: ['fiscal'],
    label: 'Mención de entregables, reportes o bitácoras',
    patterns: [/entregable|bit[aá]cora|reporte/i],
    missingClause: 'Estipulación expresa de entregables periódicos y bitácora de materialidad',
    finding: {
      area: 'Materialidad',
      severity: 'high',
      description: 'El texto no menciona entregables, reportes ni bitácoras que acrediten la ejecución.',
      legalFoundation: 'Código Fiscal de la Federación Art. 69-B',
      mitigatingAction: 'Pactar entregables verificables y actas de entrega-recepción.',
    },
  },
  {
    id: 'jornada',
    materias: ['laboral'],
    label: 'Jornada u horario de trabajo',
    patterns: [/jornada|horario/i],
    missingClause: 'Delimitación expresa de la jornada de trabajo (Art. 59-61 LFT)',
    finding: {
      area: 'Jornada de trabajo',
      severity: 'medium',
      description: 'El texto no menciona la jornada ni el horario de trabajo.',
      legalFoundation: 'Ley Federal del Trabajo Art. 25 y 59',
      mitigatingAction: 'Establecer expresamente el horario y los días de descanso.',
    },
  },
  {
    id: 'salario',
    materias: ['laboral'],
    label: 'Salario o prestaciones',
    patterns: [/salario|prestaci[oó]n/i],
    missingData: 'Monto del salario y desglose de prestaciones',
  },
  {
    id: 'incoterm',
    materias: ['comercio_exterior', 'aduanal'],
    label: 'Incoterm pactado',
    patterns: [/incoterm/i, /\b(?:EXW|FCA|FAS|FOB|CFR|CIF|CPT|CIP|DAP|DPU|DDP)\b/],
    missingClause: 'Definición del Incoterm (ICC 2020) y del punto de transmisión de riesgos',
    finding: {
      area: 'Entrega internacional',
      severity: 'high',
      description: 'El texto no menciona un Incoterm que fije el punto de entrega y la transmisión de riesgos.',
      legalFoundation: 'Ley Aduanera Art. 56 y 65',
      mitigatingAction: 'Especificar el Incoterm (por ejemplo FOB, CIF o DDP) y el lugar de entrega.',
    },
  },
  {
    id: 'jurisdiccion',
    materias: ['mercantil'],
    label: 'Jurisdicción o tribunales competentes',
    patterns: [/jurisdicci[oó]n|tribunal/i],
    missingClause: 'Cláusula de sumisión expresa a tribunales competentes y ley aplicable',
    finding: {
      area: 'Solución de controversias',
      severity: 'medium',
      description: 'El texto no menciona jurisdicción ni tribunales competentes.',
      legalFoundation: 'Código de Comercio Art. 1093',
      mitigatingAction: 'Pactar la sumisión expresa a tribunales determinados.',
    },
  },
  {
    id: 'pena',
    materias: ['mercantil'],
    label: 'Pena convencional o intereses moratorios',
    patterns: [/pena convencional|\bpenas?\b|penalizaci[oó]n|inter[eé]s(?:es)? moratorio/i],
    missingClause: 'Pena convencional por incumplimiento o interés moratorio',
    finding: {
      area: 'Incumplimiento',
      severity: 'low',
      description: 'El texto no menciona pena convencional ni intereses moratorios.',
      legalFoundation: 'Código de Comercio Art. 362',
      mitigatingAction: 'Pactar pena convencional o interés moratorio dentro de los límites legales.',
    },
  },
];

// Recomendaciones y listas de control generales de cada materia. Son las mismas
// para cualquier documento y así se presentan en la interfaz.
const MATERIA_GUIDANCE: Record<SupportedEcosystem, { actions: string[]; checklist: string[] }> = {
  fiscal: {
    actions: [
      'Integrar el expediente con CFDI, estados de cuenta y evidencia de materialidad.',
      'Verificar que la contraparte no aparezca en las listas del artículo 69-B del CFF.',
    ],
    checklist: ['CFDI 4.0 con clave de producto o servicio correcta', 'Comprobante de pago bancario'],
  },
  laboral: {
    actions: [
      'Recabar acuse de entrega de un ejemplar del contrato a la persona trabajadora.',
      'Precisar el centro de trabajo y la descripción de funciones.',
    ],
    checklist: ['Identificación de patrón y persona trabajadora', 'Salario en moneda nacional', 'Confidencialidad y entrega de herramientas'],
  },
  comercio_exterior: {
    actions: [
      'Validar la clasificación arancelaria y las Normas Oficiales Mexicanas aplicables.',
      'Consolidar la manifestación de valor con facturas y documentos de transporte.',
    ],
    checklist: ['Factura comercial y lista de empaque', 'Conocimiento de embarque o guía aérea', 'Certificado de origen del tratado aplicable'],
  },
  aduanal: {
    actions: [
      'Validar la clasificación arancelaria y las Normas Oficiales Mexicanas aplicables.',
      'Consolidar la manifestación de valor con facturas y documentos de transporte.',
    ],
    checklist: ['Pedimento y documentos anexos', 'Factura comercial y lista de empaque', 'Conocimiento de embarque o guía aérea'],
  },
  mercantil: {
    actions: [
      'Revisar la vigencia de los poderes de quienes suscriben.',
      'Valorar la ratificación de firmas ante fedatario cuando haya garantías reales.',
    ],
    checklist: ['Capacidad y legitimación de las partes', 'Objeto lícito y determinado', 'Firmas autógrafas o electrónicas avanzadas'],
  },
};

function resolveEcosystems(input: DeterministicAnalysisInput): SupportedEcosystem[] {
  if (Array.isArray(input.ecosystems) && input.ecosystems.length > 0) return input.ecosystems;
  if (typeof input.ecosystems === 'string') return [input.ecosystems];
  return input.ecosystem ? [input.ecosystem] : ['mercantil'];
}

function uniquePush(target: string[], value: string) {
  if (!target.includes(value)) target.push(value);
}

function detectDocumentType(fileName = ''): string {
  const lower = fileName.toLowerCase();
  if (lower.includes('cfdi')) return 'Comprobante Fiscal Digital por Internet (CFDI)';
  if (lower.includes('pagare')) return 'Pagaré';
  if (lower.includes('trabajo')) return 'Contrato individual de trabajo';
  if (lower.includes('pedimento')) return 'Expediente aduanal o pedimento';
  if (lower.includes('contrato') || lower.includes('convenio')) return 'Contrato o convenio';
  return 'Documento sin clasificar';
}

/**
 * Revisión básica determinista (sin IA). Verifica la presencia de elementos
 * mínimos por materia, detecta partes y cláusulas por patrones de texto y
 * enlaza artículos relacionados recuperados del corpus local.
 */
export function generateDeterministicLegalAudit(input: DeterministicAnalysisInput): Record<string, unknown> {
  const { files, ragSources } = input;
  const targetEcosystems = resolveEcosystems(input);
  const fileName = files[0]?.name || 'documento';
  const fullText = files.map(f => f.text).join('\n\n');

  const detectedParties: string[] = [];
  const partyMatches = fullText.matchAll(/(?:por una parte|comparece(?:\s+por\s+una\s+parte)?|denominada|en lo sucesivo|por otra parte)\s+["“']?([A-ZÁÉÍÓÚÑ0-9\s,\.]{3,60}?)(?:["”']|\s+,\s+|\s+a quien|\s+representada|\s+y\s+por\s+|\s+y\s+otra\s+|\s*\.)/gi);
  for (const m of partyMatches) {
    const candidate = m[1].replace(/[\n\r]+/g, ' ').trim();
    if (candidate.length > 3 && !/^(?:que|los|las|sus|con)\b/i.test(candidate)) uniquePush(detectedParties, candidate);
    if (detectedParties.length >= 4) break;
  }

  const detectedObligations: string[] = [];
  const clauseMatches = fullText.matchAll(/(?:CL[AÁ]USULA\s+[A-ZÁÉÍÓÚÑ\-]+|\bPRIMERA|\bSEGUNDA|\bTERCERA)[\.\:\-]?\s*([^\n\r]{20,160})/gi);
  for (const cm of clauseMatches) {
    const clauseText = cm[1].trim();
    if (clauseText) uniquePush(detectedObligations, clauseText);
    if (detectedObligations.length >= 4) break;
  }

  const checks: BasicReviewCheck[] = [];
  const missingClauses: string[] = [];
  const missingData: string[] = [];
  const findings: RiskFinding[] = [];
  for (const rule of BASIC_REVIEW_RULES) {
    const materia = rule.materias.find(item => targetEcosystems.includes(item));
    if (!materia) continue;
    const found = rule.patterns.some(pattern => pattern.test(fullText));
    checks.push({ id: rule.id, materia, label: rule.label, found });
    if (found) continue;
    if (rule.missingClause) uniquePush(missingClauses, rule.missingClause);
    if (rule.missingData) uniquePush(missingData, rule.missingData);
    if (rule.finding) findings.push({ findingId: `basic-${rule.id}`, ...rule.finding });
  }

  const recommendedActions: string[] = [];
  const checklist: string[] = [];
  for (const materia of targetEcosystems) {
    MATERIA_GUIDANCE[materia].actions.forEach(action => uniquePush(recommendedActions, action));
    MATERIA_GUIDANCE[materia].checklist.forEach(item => uniquePush(checklist, item));
  }

  // La suficiencia del expediente se estima por los nombres de archivo y sólo
  // tiene sentido para la materialidad fiscal.
  const support = targetEcosystems.includes('fiscal')
    ? EvidenceMapper.assessSupportStrength(files.map((f, i) => ({
      documentId: `doc:${i + 1}`,
      fileName: f.name,
      mimeType: f.mimeType || 'text/plain',
      category: DocumentClassifier.classify(f.name, f.mimeType || ''),
      extractedText: f.text,
    })))
    : null;

  const legalFoundations = ragSources.slice(0, 5).map((source, index) => ({
    id: String(source.id ?? `leg:${index + 1}`),
    title: source.title || source.law_code || source.law || `Artículo relacionado ${index + 1}`,
    law: source.law_code || source.law || source.title || 'Normativa local',
    article: source.article_number || source.article || '',
    excerpt: source.content.slice(0, 400).replace(/\s+/g, ' ').trim(),
    relevanceScore: Math.max(0, Math.min(1, Number(source.similarity ?? source.relevanceScore) || 0)),
  }));
  const claimSources = ['doc:1', ...(legalFoundations[0] ? [legalFoundations[0].id] : [])];

  const missingCount = checks.filter(check => !check.found).length;
  const materiaLabel = targetEcosystems.map(materia => ECOSYSTEM_LABELS[materia]).join(', ');
  const summary = [
    `Revisión básica por reglas locales de «${fileName}».`,
    `Se verificó la presencia de ${checks.length} elementos mínimos en materia ${materiaLabel}: ${checks.length - missingCount} aparecen en el texto y ${missingCount} no se encontraron.`,
    support ? `Soporte documental estimado por los nombres de archivo: ${support.level} (${support.score}/100).` : '',
    'Esta revisión no interpreta el contenido ni valida su legalidad.',
  ].filter(Boolean).join(' ');

  return {
    reviewMode: 'basic',
    summary,
    documentType: detectDocumentType(fileName),
    riskScore: RiskScoring.calculateRiskScore(findings),
    detectedParties,
    detectedObligations,
    missingClauses,
    missingData,
    checks,
    risks: findings.map(f => ({
      title: f.area,
      severity: f.severity === 'critical' || f.severity === 'high' ? 'high' : f.severity === 'medium' ? 'medium' : 'low',
      explanation: f.description,
      relatedClauses: [],
      legalFoundations: [],
      reference: f.legalFoundation,
    })),
    recommendedActions,
    checklist,
    riskCategories: {
      documentales: support?.missingCategories ?? [],
    },
    legalFoundations,
    groundingClaims: [
      { claimText: summary, sourceIds: claimSources },
      ...findings.map(f => ({ claimText: f.description, sourceIds: claimSources })),
    ],
    confidence: 'low' as const,
    engine: 'local_rules' as const,
  };
}
