import React, { useState } from 'react';
import { BookOpen, Check, CircleCheck, CircleX, Clipboard, Download, FilePlus2, FileSignature, FileText, RotateCcw } from 'lucide-react';
import { AreaTag, Badge, Button, Callout, Card, SectionTitle } from '../../components/ui';
import { formatDate } from '../../components/PortfolioRow';
import { LEGAL_AREA_INFO } from '../../lib/legal-areas';
import { BASIC_REVIEW_LIMITS, reviewModeLabel, risksBySeverity, SEVERITY_LABELS } from '../../lib/review';
import { cn } from '../../lib/utils';
import type { LegalFoundation, ReviewRecord, ReviewRisk } from '../../types';

interface ReviewResultViewProps {
  record: ReviewRecord;
  aiReady: boolean;
  onDraftAddendum: () => void;
  onDraftClause: (finding: { title: string; explanation?: string; reference?: string }) => void;
  onOpenFoundation: (foundation: LegalFoundation) => void;
  onExport: (format: 'pdf' | 'docx') => Promise<void>;
  onCopy: () => Promise<void>;
  onNewReview: () => void;
  onConnectAi: () => void;
}

const SEVERITY_STYLES: Record<ReviewRisk['severity'], string> = {
  high: 'border-l-red-600',
  medium: 'border-l-amber-500',
  low: 'border-l-slate-400',
};

function riskLevel(score: number): { label: string; tone: 'danger' | 'warning' | 'success' } {
  if (score > 65) return { label: 'Alto', tone: 'danger' };
  if (score > 35) return { label: 'Moderado', tone: 'warning' };
  return { label: 'Bajo', tone: 'success' };
}

function List({ items }: { items: string[] }) {
  return (
    <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-slate-700">
      {items.map((item) => <li key={item}>{item}</li>)}
    </ul>
  );
}

export function ReviewResultView({ record, aiReady, onDraftAddendum, onDraftClause, onOpenFoundation, onExport, onCopy, onNewReview, onConnectAi }: ReviewResultViewProps) {
  const { result } = record;
  const isBasic = record.reviewMode === 'basic';
  const grouped = risksBySeverity(record);
  const risks = [...grouped.high, ...grouped.medium, ...grouped.low];
  const hasFindings = risks.length > 0 || result.missingClauses.length > 0 || (result.missingData?.length ?? 0) > 0;
  const [exporting, setExporting] = useState<'pdf' | 'docx' | null>(null);
  const [copied, setCopied] = useState(false);
  const level = riskLevel(result.riskScore);

  const runExport = async (format: 'pdf' | 'docx') => {
    setExporting(format);
    try {
      await onExport(format);
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={isBasic ? 'warning' : 'info'}>{reviewModeLabel(record)}</Badge>
              {record.areas.map((area) => <AreaTag key={area} area={area} />)}
            </div>
            <h2 className="mt-2 truncate text-lg font-semibold text-slate-950">{record.fileName}</h2>
            <p className="text-sm text-slate-500">{result.documentType ? `${result.documentType} · ` : ''}{formatDate(record.timestamp)}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="secondary" onClick={() => { void onCopy().then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }).catch(() => { /* handled by parent or ignore */ }); }}>
              {copied ? <Check size={15} aria-hidden="true" /> : <Clipboard size={15} aria-hidden="true" />} Copiar informe
            </Button>
            <Button size="sm" variant="secondary" onClick={() => void runExport('pdf')} isLoading={exporting === 'pdf'} disabled={exporting !== null}>
              {exporting !== 'pdf' && <Download size={15} aria-hidden="true" />} PDF
            </Button>
            <Button size="sm" variant="secondary" onClick={() => void runExport('docx')} isLoading={exporting === 'docx'} disabled={exporting !== null}>
              {exporting !== 'docx' && <FileText size={15} aria-hidden="true" />} Word
            </Button>
            <Button size="sm" variant="ghost" onClick={onNewReview}>
              <RotateCcw size={15} aria-hidden="true" /> Nueva revisión
            </Button>
          </div>
        </div>
      </Card>

      {isBasic && (
        <Callout
          tone={record.basicReason === 'ai_error' ? 'warning' : 'info'}
          title={record.basicReason === 'ai_error' ? 'La IA no respondió; se muestra la revisión básica' : 'Revisión básica por reglas locales'}
          action={!aiReady && <Button size="sm" variant="secondary" onClick={onConnectAi}>Conectar IA para una revisión completa</Button>}
        >
          {BASIC_REVIEW_LIMITS}
        </Callout>
      )}

      <div className={cn('grid gap-6', !isBasic && 'lg:grid-cols-[minmax(0,1fr)_260px]')}>
        <Card>
          <SectionTitle title="Resumen" />
          <p className="text-sm leading-relaxed text-slate-700">{result.summary || 'Sin resumen.'}</p>
        </Card>
        {!isBasic && (
          <Card>
            <p className="text-sm font-semibold text-slate-600">Nivel de riesgo</p>
            <p className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-slate-950">{result.riskScore}</span>
              <span className="text-sm text-slate-500">/ 100</span>
              <Badge tone={level.tone}>{level.label}</Badge>
            </p>
            <dl className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
              {(['high', 'medium', 'low'] as const).map((severity) => (
                <div key={severity} className="rounded-lg bg-slate-50 p-2">
                  <dt className="text-slate-500">{SEVERITY_LABELS[severity]}</dt>
                  <dd className="text-lg font-bold text-slate-900">{grouped[severity].length}</dd>
                </div>
              ))}
            </dl>
          </Card>
        )}
      </div>

      {hasFindings && (
        <Card className="flex flex-wrap items-center justify-between gap-4 border-legal-gold/40 bg-amber-50/40">
          <div>
            <p className="text-sm font-semibold text-slate-950">Corrige los hallazgos</p>
            <p className="text-sm text-slate-600">Genera una adenda con todas las cláusulas y datos faltantes, o una cláusula para un hallazgo concreto.</p>
          </div>
          <Button onClick={onDraftAddendum}>
            <FileSignature size={16} aria-hidden="true" /> Redactar adenda
          </Button>
        </Card>
      )}

      {isBasic && result.checks && result.checks.length > 0 && (
        <Card>
          <SectionTitle title="Elementos verificados" description="Sólo indica si el texto menciona cada elemento; no evalúa su contenido." />
          <ul className="divide-y divide-slate-100">
            {result.checks.map((check) => (
              <li key={check.id} className="flex items-center gap-3 py-2.5 text-sm">
                {check.found
                  ? <CircleCheck size={18} className="shrink-0 text-emerald-600" aria-hidden="true" />
                  : <CircleX size={18} className="shrink-0 text-red-600" aria-hidden="true" />}
                <span className="flex-1 text-slate-800">{check.label}</span>
                <span className="text-xs text-slate-500">{LEGAL_AREA_INFO[check.materia].shortLabel}</span>
                <span className={cn('w-28 text-right text-xs font-semibold', check.found ? 'text-emerald-700' : 'text-red-700')}>
                  {check.found ? 'Mencionado' : 'No encontrado'}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {risks.length > 0 && (
        <Card>
          <SectionTitle title={isBasic ? 'Observaciones' : 'Riesgos'} description={`${risks.length} ${risks.length === 1 ? 'hallazgo' : 'hallazgos'}`} />
          <ul className="space-y-3">
            {risks.map((risk, index) => (
              <li key={`${risk.title}-${index}`} className={cn('rounded-lg border border-l-4 border-slate-200 p-4', SEVERITY_STYLES[risk.severity])}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-950">{risk.title}</p>
                  <Badge tone={risk.severity === 'high' ? 'danger' : risk.severity === 'medium' ? 'warning' : 'neutral'}>
                    Severidad {SEVERITY_LABELS[risk.severity].toLowerCase()}
                  </Badge>
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-700">{risk.explanation}</p>
                {risk.reference && <p className="mt-1 text-xs text-slate-500">Referencia orientativa: {risk.reference}</p>}
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" variant="secondary" onClick={() => onDraftClause(risk)}>
                    <FilePlus2 size={14} aria-hidden="true" /> Redactar cláusula
                  </Button>
                  {(risk.legalFoundations ?? []).slice(0, 2).map((foundation) => (
                    <Button key={foundation.id} size="sm" variant="ghost" onClick={() => onOpenFoundation(foundation)}>
                      <BookOpen size={14} aria-hidden="true" /> {foundation.law} {foundation.article}
                    </Button>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {(result.missingClauses.length > 0 || (result.missingData?.length ?? 0) > 0) && (
        <div className="grid gap-6 md:grid-cols-2">
          {result.missingClauses.length > 0 && (
            <Card>
              <SectionTitle title="Cláusulas faltantes" />
              <ul className="space-y-2">
                {result.missingClauses.map((clause) => (
                  <li key={clause} className="flex items-start justify-between gap-3 text-sm text-slate-700">
                    <span className="leading-relaxed">{clause}</span>
                    <Button size="sm" variant="ghost" onClick={() => onDraftClause({ title: clause })} aria-label={`Redactar cláusula: ${clause}`}>
                      <FilePlus2 size={14} aria-hidden="true" />
                    </Button>
                  </li>
                ))}
              </ul>
            </Card>
          )}
          {(result.missingData?.length ?? 0) > 0 && (
            <Card>
              <SectionTitle title="Datos faltantes" />
              <List items={result.missingData ?? []} />
            </Card>
          )}
        </div>
      )}

      {result.recommendedActions.length > 0 && (
        <Card>
          <SectionTitle
            title={isBasic ? 'Recomendaciones generales de la materia' : 'Acciones recomendadas'}
            description={isBasic ? 'Son las mismas para cualquier documento de la materia.' : undefined}
          />
          <List items={result.recommendedActions} />
        </Card>
      )}

      {result.legalFoundations.length > 0 && (
        <Card>
          <SectionTitle
            title={isBasic ? 'Artículos relacionados del corpus local' : 'Fundamentos'}
            description={isBasic ? 'Recuperados por similitud con el documento; no se afirma que sean aplicables.' : 'Disposiciones del corpus local citadas en el dictamen.'}
          />
          <ul className="grid gap-3 md:grid-cols-2">
            {result.legalFoundations.map((foundation) => (
              <li key={foundation.id} className="flex flex-col rounded-lg border border-slate-200 p-4">
                <p className="text-sm font-semibold text-slate-950">{foundation.law}{foundation.article ? ` · ${foundation.article}` : ''}</p>
                {foundation.excerpt && <p className="mt-1.5 line-clamp-4 flex-1 font-serif text-sm leading-relaxed text-slate-700">{foundation.excerpt}</p>}
                <Button size="sm" variant="ghost" className="mt-3 self-start" onClick={() => onOpenFoundation(foundation)}>
                  <BookOpen size={14} aria-hidden="true" /> Leer artículo
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {(result.detectedParties.length > 0 || result.detectedObligations.length > 0) && (
        <Card>
          <SectionTitle title="Detectado en el documento" description={isBasic ? 'Identificado por patrones de texto; verifícalo.' : undefined} />
          <div className="grid gap-6 md:grid-cols-2">
            {result.detectedParties.length > 0 && (
              <div>
                <p className="mb-2 text-sm font-semibold text-slate-800">Partes</p>
                <List items={result.detectedParties} />
              </div>
            )}
            {result.detectedObligations.length > 0 && (
              <div>
                <p className="mb-2 text-sm font-semibold text-slate-800">Cláusulas y obligaciones</p>
                <List items={result.detectedObligations} />
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
