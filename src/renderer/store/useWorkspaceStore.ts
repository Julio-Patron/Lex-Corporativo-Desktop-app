import { create } from 'zustand';
import { LEGAL_ENGINEERING_TEMPLATES, type DraftingTemplate } from '../lib/constants';
import { LEGAL_AREAS, type LegalArea } from '../lib/legal-areas';
import type { DraftRecord, DraftSource, ReviewRecord } from '../types';
import { newRecordId } from '../lib/portfolio';

function findTemplateById(templateId?: string | null): DraftingTemplate | null {
  if (!templateId) return null;
  for (const area of LEGAL_AREAS) {
    const found = LEGAL_ENGINEERING_TEMPLATES[area].find((template) => template.id === templateId);
    if (found) return found;
  }
  return null;
}

export type DraftStep = 'choose' | 'details' | 'document';

export interface DraftSession {
  step: DraftStep;
  source: DraftSource;
  area: LegalArea;
  template: DraftingTemplate | null;
  fieldValues: Record<string, string>;
  instructions: string;
  referenceFile: File | null;
  missingReferenceFileName?: string | null;
  sourceReview: { id: string; caseId?: string; title: string } | null;
  // Documento en edición; `caseId` indica que ya existe en el portafolio.
  record: DraftRecord | null;
  dirty: boolean;
}

export interface ReviewSession {
  file: File | null;
  areas: LegalArea[];
  instruction: string;
  record: ReviewRecord | null;
}

const emptyDraft = (): DraftSession => ({
  step: 'choose',
  source: 'template',
  area: 'mercantil',
  template: null,
  fieldValues: {},
  instructions: '',
  referenceFile: null,
  sourceReview: null,
  record: null,
  dirty: false,
});

const emptyReview = (): ReviewSession => ({
  file: null,
  areas: ['mercantil'],
  instruction: '',
  record: null,
});

interface WorkspaceState {
  draft: DraftSession;
  review: ReviewSession;
  updateDraft: (patch: Partial<DraftSession>) => void;
  startDraft: (source: DraftSource, options?: { area?: LegalArea; template?: DraftingTemplate | null }) => void;
  startDraftFromReview: (review: ReviewRecord, instructions: string, area?: LegalArea) => void;
  addLegalCitation: (citation: string, area?: LegalArea) => 'document' | 'instructions';
  setDraftDocument: (record: DraftRecord, options?: { saved?: boolean }) => void;
  editDraftDocument: (document: string) => void;
  resetDraft: () => void;
  updateReview: (patch: Partial<ReviewSession>) => void;
  openReview: (record: ReviewRecord) => void;
  resetReview: () => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  draft: emptyDraft(),
  review: emptyReview(),
  updateDraft: (patch) => set((state) => ({ draft: { ...state.draft, ...patch } })),
  startDraft: (source, options = {}) => set(() => ({
    draft: {
      ...emptyDraft(),
      source,
      step: 'details',
      area: options.area ?? 'mercantil',
      template: options.template ?? null,
    },
  })),
  startDraftFromReview: (review, instructions, area) => set(() => ({
    draft: {
      ...emptyDraft(),
      step: 'details',
      source: 'review',
      area: area ?? review.areas[0] ?? 'mercantil',
      instructions,
      sourceReview: { id: review.id, caseId: review.caseId, title: review.fileName },
    },
  })),
  addLegalCitation: (citation, area) => {
    let destination: 'document' | 'instructions' = 'document';
    set((state) => {
      const current = state.draft;
      if (current.record) return {
        draft: {
          ...current,
          step: 'document',
          record: { ...current.record, document: `${current.record.document.trimEnd()}\n\n${citation}` },
          dirty: true,
        },
      };
      const hasDetailsProgress = current.step === 'details'
        || Boolean(
          current.template
          || current.instructions.trim()
          || current.referenceFile
          || current.missingReferenceFileName
          || current.sourceReview
          || Object.values(current.fieldValues).some((value) => value.trim()),
        );
      if (hasDetailsProgress) {
        destination = 'instructions';
        const text = `FUNDAMENTO A CONSIDERAR:\n${citation}`;
        return {
          draft: {
            ...current,
            step: 'details',
            instructions: current.instructions.trim() ? `${current.instructions.trim()}\n\n${text}` : text,
          },
        };
      }
      const now = new Date().toISOString();
      return {
        draft: {
          ...emptyDraft(),
          step: 'document',
          source: 'free',
          area: area ?? 'mercantil',
          dirty: true,
          record: {
            id: newRecordId('doc'), title: 'Referencias normativas', area: area ?? 'mercantil',
            timestamp: now, updatedAt: now, source: 'free', instructions: '',
            document: `# Referencias normativas\n\n${citation}`, generatedWith: 'manual',
          },
        },
      };
    });
    return destination;
  },
  setDraftDocument: (record, options = {}) => set((state) => {
    const template = state.draft.template?.id === record.templateId
      ? state.draft.template
      : (findTemplateById(record.templateId) ?? state.draft.template);
    const instructions = state.draft.instructions.trim() ? state.draft.instructions : record.instructions;
    const missingReferenceFileName = !state.draft.referenceFile && record.referenceFileName
      ? record.referenceFileName
      : state.draft.missingReferenceFileName;
    const sourceReview = state.draft.sourceReview
      ?? (record.sourceReviewId ? { id: record.sourceReviewId, caseId: record.caseId, title: record.title } : null);
    return {
      draft: {
        ...state.draft,
        step: 'document',
        source: record.source ?? state.draft.source,
        area: record.area,
        template,
        instructions,
        missingReferenceFileName,
        sourceReview,
        record,
        dirty: !options.saved,
      },
    };
  }),
  editDraftDocument: (document) => set((state) => (
    state.draft.record
      ? { draft: { ...state.draft, record: { ...state.draft.record, document }, dirty: true } }
      : state
  )),
  resetDraft: () => set({ draft: emptyDraft() }),
  updateReview: (patch) => set((state) => ({ review: { ...state.review, ...patch } })),
  openReview: (record) => set(() => ({ review: { ...emptyReview(), areas: record.areas, instruction: record.instruction, record } })),
  resetReview: () => set((state) => ({ review: { ...emptyReview(), areas: state.review.areas } })),
}));
