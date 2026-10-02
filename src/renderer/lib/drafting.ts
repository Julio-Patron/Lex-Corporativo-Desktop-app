import { LEGAL_ENGINEERING_TEMPLATES, type DraftingTemplate } from './constants';
import { LEGAL_AREAS, type LegalArea } from './legal-areas';

export interface CatalogTemplate extends DraftingTemplate {
  area: LegalArea;
}

export const TEMPLATE_CATALOG: CatalogTemplate[] = LEGAL_AREAS.flatMap((area) =>
  LEGAL_ENGINEERING_TEMPLATES[area].map((template) => ({ ...template, area })),
);

// Las plantillas se identifican con el prefijo de su materia ("laboral-…").
export function templateArea(template: Pick<DraftingTemplate, 'id'>): LegalArea {
  return LEGAL_AREAS.find((area) => template.id.startsWith(`${area}-`)) ?? 'mercantil';
}

export function normalizeSearchText(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

export function searchTemplates(query: string, area: LegalArea | 'todas'): CatalogTemplate[] {
  const terms = normalizeSearchText(query).split(/\s+/).filter(Boolean);
  return TEMPLATE_CATALOG.filter((template) => {
    if (area !== 'todas' && template.area !== area) return false;
    if (terms.length === 0) return true;
    const haystack = normalizeSearchText(`${template.title} ${template.description} ${template.intentGroup ?? ''}`);
    return terms.every((term) => haystack.includes(term));
  });
}

export const SUGGESTED_CLAUSES = [
  'Confidencialidad',
  'Pena convencional',
  'Terminación anticipada',
  'Jurisdicción y ley aplicable',
];

export interface DraftRequirementsInput {
  template: DraftingTemplate | null;
  fieldValues: Record<string, string>;
  instructions: string;
  hasReferenceFile: boolean;
}

// Convierte el formulario en las instrucciones que recibe el redactor. Los datos
// sin capturar se marcan como faltantes para que el borrador los deje señalados.
export function buildDraftRequirements({ template, fieldValues, instructions, hasReferenceFile }: DraftRequirementsInput): string {
  const sections: string[] = [];
  if (template) {
    sections.push(`DOCUMENTO SOLICITADO: ${template.title}`);
    const data = template.fields.map((field) => {
      const value = fieldValues[field.id]?.trim();
      return `- ${field.label}: ${value || '[DATO FALTANTE]'}`;
    });
    sections.push(`DATOS PROPORCIONADOS:\n${data.join('\n')}`);
  }
  if (hasReferenceFile && !template) {
    sections.push('Usa el archivo adjunto como documento base y aplica los cambios indicados.');
  }
  if (instructions.trim()) {
    sections.push(`${template ? 'INSTRUCCIONES ADICIONALES' : 'INSTRUCCIONES'}:\n${instructions.trim()}`);
  }
  return sections.join('\n\n');
}

export function hasDraftInput(input: DraftRequirementsInput): boolean {
  const filledFields = input.template?.fields.some((field) => input.fieldValues[field.id]?.trim());
  return Boolean(filledFields || input.instructions.trim());
}

export function documentTitleFrom(markdown: string, fallback: string): string {
  const firstLine = markdown.split('\n').find((line) => line.trim().length > 0) ?? '';
  const cleaned = firstLine.replace(/^#+\s*/, '').replace(/\*\*/g, '').trim();
  return cleaned && cleaned.length <= 120 ? cleaned : fallback;
}
