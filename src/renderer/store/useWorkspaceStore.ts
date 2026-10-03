import { create } from 'zustand';
import type { DraftingTemplate } from '../lib/constants';
import type { LegalArea } from '../lib/legal-areas';
import type { DraftRecord, DraftSource, ReviewRecord } from '../types';

export type DraftStep = 'choose' | 'details' | 'document';

export interface DraftSession {
  step: DraftStep;
  source: DraftSource;
  area: LegalArea;
  template: DraftingTemplate | null;
  fieldValues: Record<string, string>;
  instructions: string;
  referenceFile: File | null;
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
  appendDraftInstructions: (text: string, area?: LegalArea) => void;
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
  appendDraftInstructions: (text, area) => set((state) => {
    const current = state.draft;
    const instructions = current.instructions.trim() ? `${current.instructions.trim()}\n\n${text}` : text;
    const startsNew = current.step === 'choose';
    return {
      draft: {
        ...current,
        instructions,
        step: 'details',
        source: startsNew ? 'free' : current.source,
        area: startsNew && area ? area : current.area,
      },
    };
  }),
  setDraftDocument: (record, options = {}) => set((state) => ({
    draft: { ...state.draft, step: 'document', record, area: record.area, dirty: !options.saved },
  })),
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
