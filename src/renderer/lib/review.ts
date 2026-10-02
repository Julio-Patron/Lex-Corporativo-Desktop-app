import type { ReviewRecord, ReviewRisk } from '../types';
import { LEGAL_AREA_INFO } from './legal-areas';

export const SEVERITY_LABELS: Record<ReviewRisk['severity'], string> = {
  high: 'Alta',
  medium: 'Media',
  low: 'Baja',
};

export const BASIC_REVIEW_SCOPE = [
  'Comprueba si el texto menciona elementos mínimos de cada materia seleccionada (por ejemplo, jornada y salario en laboral, CFDI en fiscal o Incoterm en comercio exterior).',
  'Detecta partes y cláusulas numeradas mediante patrones de texto.',
  'Muestra artículos del corpus local relacionados con el documento por búsqueda semántica.',
  'Añade recomendaciones y listas de control generales de la materia, iguales para cualquier documento.',
];

export const BASIC_REVIEW_LIMITS = 'No interpreta el contenido, no valida la legalidad de las cláusulas ni sustituye la revisión profesional. Un elemento "encontrado" sólo indica que el término aparece en el texto.';

export function reviewModeLabel(record: Pick<ReviewRecord, 'reviewMode' | 'provider'>): string {
  if (record.reviewMode === 'basic') return 'Revisión básica (reglas locales)';
  const provider = record.provider === 'openai' ? 'OpenAI' : record.provider === 'anthropic' ? 'Anthropic' : record.provider === 'gemini' ? 'Gemini' : 'IA';
  return `Revisión con IA · ${provider}`;
}

export function risksBySeverity(record: ReviewRecord) {
  const risks = record.result.risks ?? [];
  return {
    high: risks.filter((risk) => risk.severity === 'high'),
    medium: risks.filter((risk) => risk.severity === 'medium'),
    low: risks.filter((risk) => risk.severity === 'low'),
  };
}

const bullet = (items: string[]) => items.map((item) => `- ${item}`).join('\n');

// Informe en Markdown usado para copiar y exportar a PDF o Word.
export function buildReviewReport(record: ReviewRecord): string {
  const { result } = record;
  const areas = record.areas.map((area) => LEGAL_AREA_INFO[area].label).join(', ');
  const isBasic = record.reviewMode === 'basic';
  const sections: string[] = [
    `# ${isBasic ? 'Revisión básica' : 'Revisión jurídica'}: ${record.fileName}`,
    `**Materias:** ${areas}  \n**Fecha:** ${new Date(record.timestamp).toLocaleDateString('es-MX', { dateStyle: 'long' })}  \n**Modalidad:** ${reviewModeLabel(record)}`,
  ];
  if (isBasic) {
    sections.push(`> **Alcance:** ${BASIC_REVIEW_LIMITS}`);
  }
  if (result.summary) sections.push(`## Resumen\n${result.summary}`);

  if (isBasic && result.checks?.length) {
    sections.push(`## Elementos verificados\n${result.checks
      .map((check) => `- ${check.found ? 'Mencionado' : 'No encontrado'}: ${check.label} (${LEGAL_AREA_INFO[check.materia].shortLabel})`)
      .join('\n')}`);
  }

  const risks = result.risks ?? [];
  if (risks.length) {
    sections.push(`## ${isBasic ? 'Observaciones' : 'Riesgos'}\n${risks
      .map((risk) => `- **${risk.title}** (severidad ${SEVERITY_LABELS[risk.severity].toLowerCase()}): ${risk.explanation}${risk.reference ? ` Referencia: ${risk.reference}.` : ''}`)
      .join('\n')}`);
  }
  if (result.missingClauses.length) sections.push(`## Cláusulas faltantes\n${bullet(result.missingClauses)}`);
  if (result.missingData?.length) sections.push(`## Datos faltantes\n${bullet(result.missingData)}`);
  if (result.recommendedActions.length) {
    sections.push(`## ${isBasic ? 'Recomendaciones generales de la materia' : 'Acciones recomendadas'}\n${bullet(result.recommendedActions)}`);
  }
  if (result.detectedParties.length) sections.push(`## Partes detectadas\n${bullet(result.detectedParties)}`);
  if (result.legalFoundations.length) {
    sections.push(`## ${isBasic ? 'Artículos relacionados del corpus local' : 'Fundamentos'}\n${result.legalFoundations
      .map((foundation) => `- **${foundation.law}${foundation.article ? ` · ${foundation.article}` : ''}**${foundation.excerpt ? `: ${foundation.excerpt}` : ''}`)
      .join('\n')}`);
  }
  return sections.join('\n\n');
}

export function buildAddendumInstructions(record: ReviewRecord): string {
  const { result } = record;
  const risks = (result.risks ?? []).map((risk) => `${risk.title}: ${risk.explanation}`);
  return [
    `Redactar una adenda o convenio modificatorio que subsane los hallazgos de la revisión de «${record.fileName}».`,
    result.missingClauses.length ? `CLÁUSULAS A INCORPORAR:\n${bullet(result.missingClauses)}` : '',
    result.missingData?.length ? `DATOS A PRECISAR:\n${bullet(result.missingData)}` : '',
    risks.length ? `RIESGOS A MITIGAR:\n${bullet(risks)}` : '',
    'Conservar la validez del documento original y marcar como [DATO FALTANTE] la información no disponible.',
  ].filter(Boolean).join('\n\n');
}

export function buildClauseInstructions(finding: { title: string; explanation?: string; reference?: string }): string {
  return [
    `Redactar una cláusula que subsane: ${finding.title}.`,
    finding.explanation ? `CONTEXTO: ${finding.explanation}` : '',
    finding.reference ? `REFERENCIA: ${finding.reference}` : '',
  ].filter(Boolean).join('\n');
}
