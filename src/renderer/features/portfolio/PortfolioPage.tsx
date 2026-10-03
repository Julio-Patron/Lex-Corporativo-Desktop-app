import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Download, FileText, FolderOpen, Search, Trash2 } from 'lucide-react';
import type { CaseMetadata } from '../../../preload/types';
import { CASE_RETENTION_LABELS } from '../../../shared/case-retention';
import { PortfolioRowSummary } from '../../components/PortfolioRow';
import { Button, Card, ConfirmDialog, EmptyState, Page, Segmented, Select, Spinner, TextInput } from '../../components/ui';
import { useConfirmDialog } from '../../hooks/useConfirmDialog';
import { usePortfolioActions } from '../../hooks/usePortfolioActions';
import { normalizeSearchText } from '../../lib/drafting';
import { LEGAL_AREA_INFO, LEGAL_AREAS, type LegalArea } from '../../lib/legal-areas';
import { deletePortfolioItem, listPortfolio } from '../../lib/portfolio';
import { useUiStore } from '../../store/useUiStore';
import type { PortfolioItem } from '../../types';

type KindFilter = 'all' | 'draft' | 'review';

function itemAreas(item: PortfolioItem): LegalArea[] {
  return item.kind === 'draft' ? [item.record.area] : item.record.areas;
}

export default function PortfolioPage() {
  const navigate = useNavigate();
  const notify = useUiStore((state) => state.notify);
  const retentionDays = useUiStore((state) => state.settings?.caseRetentionDays ?? 0);
  const { openItem, exportItem } = usePortfolioActions();
  const [dialogState, confirm] = useConfirmDialog();
  const [items, setItems] = useState<PortfolioItem[] | null>(null);
  const [cases, setCases] = useState<CaseMetadata[]>([]);
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState<KindFilter>('all');
  const [area, setArea] = useState<LegalArea | 'all'>('all');
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await listPortfolio();
      setItems(data.items);
      setCases(data.cases);
    } catch (error: any) {
      setItems([]);
      notify(error?.message || 'No se pudo abrir el portafolio.', 'error');
    }
  }, [notify]);

  useEffect(() => { void load(); }, [load]);

  const expiryByCase = useMemo(() => new Map(cases.map((item) => [item.caseId, item.retentionUntil ?? null])), [cases]);

  const filtered = useMemo(() => {
    const term = normalizeSearchText(query);
    return (items ?? []).filter((item) => {
      if (kind !== 'all' && item.kind !== kind) return false;
      if (area !== 'all' && !itemAreas(item).includes(area)) return false;
      if (!term) return true;
      const text = item.kind === 'draft' ? item.record.title : `${item.record.title} ${item.record.fileName}`;
      return normalizeSearchText(text).includes(term);
    });
  }, [items, kind, area, query]);

  const counts = useMemo(() => ({
    all: items?.length ?? 0,
    draft: items?.filter((item) => item.kind === 'draft').length ?? 0,
    review: items?.filter((item) => item.kind === 'review').length ?? 0,
  }), [items]);

  const remove = async (item: PortfolioItem) => {
    const accepted = await confirm({
      title: item.kind === 'draft' ? 'Eliminar documento' : 'Eliminar revisión',
      message: `Se eliminará «${item.record.title}» de este equipo. Esta acción no se puede deshacer.`,
      confirmLabel: 'Eliminar',
      variant: 'danger',
    });
    if (!accepted) return;
    const key = `${item.caseId}:${item.record.id}`;
    setBusyKey(key);
    try {
      await deletePortfolioItem(item);
      setItems((current) => current?.filter((entry) => `${entry.caseId}:${entry.record.id}` !== key) ?? null);
      notify('Elemento eliminado.', 'success');
    } catch (error: any) {
      notify(error?.message || 'No se pudo eliminar.', 'error');
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <Page
      title="Portafolio"
      description={<>Documentos y revisiones guardados en este equipo. {CASE_RETENTION_LABELS[retentionDays]}. <Link to="/configuracion?tab=datos" className="font-semibold text-legal-950 hover:underline">Cambiar</Link></>}
      width="wide"
    >
      <Card className="flex flex-wrap items-center gap-3 p-4">
        <div className="relative min-w-[220px] flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-3 text-slate-400" aria-hidden="true" />
          <TextInput value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por título o archivo" aria-label="Buscar en el portafolio" className="pl-9" />
        </div>
        <Segmented
          label="Tipo"
          value={kind}
          onChange={setKind}
          options={[
            { value: 'all', label: 'Todo', count: counts.all },
            { value: 'draft', label: 'Documentos', count: counts.draft },
            { value: 'review', label: 'Revisiones', count: counts.review },
          ]}
        />
        <Select value={area} onChange={(event) => setArea(event.target.value as LegalArea | 'all')} aria-label="Materia" className="w-48">
          <option value="all">Todas las materias</option>
          {LEGAL_AREAS.map((value) => <option key={value} value={value}>{LEGAL_AREA_INFO[value].label}</option>)}
        </Select>
      </Card>

      {items === null ? (
        <Spinner label="Abriendo el portafolio…" />
      ) : items.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="Tu portafolio está vacío"
          description="Los documentos que redactes o guardes y las revisiones que hagas aparecerán aquí."
          action={(
            <div className="flex gap-2">
              <Button onClick={() => navigate('/redactar')}>Redactar</Button>
              <Button variant="secondary" onClick={() => navigate('/revisar')}>Revisar</Button>
            </div>
          )}
        />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Search} title="No hay elementos con esos filtros" description="Cambia la búsqueda o los filtros." />
      ) : (
        <Card className="p-0">
          <ul className="divide-y divide-slate-100">
            {filtered.map((item) => {
              const key = `${item.caseId}:${item.record.id}`;
              return (
                <li key={key} className="flex flex-wrap items-center gap-3 px-5 py-3">
                  <button type="button" onClick={() => openItem(item)} className="flex min-w-0 flex-1 text-left" aria-label={`Abrir ${item.record.title}`}>
                    <PortfolioRowSummary item={item} expiresAt={expiryByCase.get(item.caseId)} />
                  </button>
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="secondary" onClick={() => openItem(item)}>Abrir</Button>
                    <Button size="sm" variant="ghost" onClick={() => void exportItem(item, 'pdf')} aria-label={`Exportar ${item.record.title} a PDF`}>
                      <Download size={15} aria-hidden="true" /> PDF
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => void exportItem(item, 'docx')} aria-label={`Exportar ${item.record.title} a Word`}>
                      <FileText size={15} aria-hidden="true" /> Word
                    </Button>
                    <Button size="sm" variant="ghost" isIconOnly onClick={() => void remove(item)} isLoading={busyKey === key} aria-label={`Eliminar ${item.record.title}`}>
                      {busyKey !== key && <Trash2 size={15} className="text-slate-500" aria-hidden="true" />}
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      <ConfirmDialog {...dialogState} />
    </Page>
  );
}
