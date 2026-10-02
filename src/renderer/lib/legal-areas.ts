import { BriefcaseBusiness, Globe2, ReceiptText, Scale, ShipWheel, type LucideIcon } from 'lucide-react';
import type { LegalArea } from '../../preload/types';

export type { LegalArea };

export const LEGAL_AREAS: LegalArea[] = ['mercantil', 'laboral', 'fiscal', 'comercio_exterior', 'aduanal'];

export interface LegalAreaInfo {
  label: string;
  shortLabel: string;
  laws: string;
  icon: LucideIcon;
  // Etiqueta discreta: la materia se identifica por un punto de color, no por la paleta de la pantalla.
  dot: string;
  tag: string;
}

export const LEGAL_AREA_INFO: Record<LegalArea, LegalAreaInfo> = {
  mercantil: {
    label: 'Mercantil y corporativo',
    shortLabel: 'Mercantil',
    laws: 'Código de Comercio, LGSM, LGTOC',
    icon: Scale,
    dot: 'bg-blue-600',
    tag: 'border-blue-200 bg-blue-50 text-blue-900',
  },
  laboral: {
    label: 'Laboral',
    shortLabel: 'Laboral',
    laws: 'Ley Federal del Trabajo',
    icon: BriefcaseBusiness,
    dot: 'bg-amber-500',
    tag: 'border-amber-200 bg-amber-50 text-amber-900',
  },
  fiscal: {
    label: 'Fiscal',
    shortLabel: 'Fiscal',
    laws: 'CFF, LISR, RLISR, LIVA, RLIVA, RMF',
    icon: ReceiptText,
    dot: 'bg-teal-600',
    tag: 'border-teal-200 bg-teal-50 text-teal-900',
  },
  comercio_exterior: {
    label: 'Comercio exterior',
    shortLabel: 'Comercio exterior',
    laws: 'Ley de Comercio Exterior y su Reglamento',
    icon: Globe2,
    dot: 'bg-emerald-600',
    tag: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  },
  aduanal: {
    label: 'Aduanal',
    shortLabel: 'Aduanal',
    laws: 'Ley Aduanera, RLA, LIGIE, RGCE',
    icon: ShipWheel,
    dot: 'bg-violet-600',
    tag: 'border-violet-200 bg-violet-50 text-violet-900',
  },
};

export function isLegalArea(value: unknown): value is LegalArea {
  return typeof value === 'string' && (LEGAL_AREAS as string[]).includes(value);
}

export function legalAreaLabel(value: unknown): string {
  return isLegalArea(value) ? LEGAL_AREA_INFO[value].shortLabel : 'Varias materias';
}
