import React from 'react';
import { ExternalLink } from 'lucide-react';
import { Card, Page } from '../../components/ui';

const REFERENCES = [
  { area: 'Mercantil', names: 'Código de Comercio · Ley General de Sociedades Mercantiles · Ley General de Títulos y Operaciones de Crédito' },
  { area: 'Laboral', names: 'Ley Federal del Trabajo' },
  { area: 'Fiscal', names: 'Código Fiscal de la Federación · Ley del Impuesto sobre la Renta · Ley del Impuesto al Valor Agregado' },
  { area: 'Comercio exterior y aduanas', names: 'Ley de Comercio Exterior · Ley Aduanera · Ley de los Impuestos Generales de Importación y de Exportación' },
];

export default function LawsPage() {
  return (
    <Page title="Leyes" description="Referencias para consultar en la Cámara de Diputados.">
      <Card>
        <h2 className="text-base font-semibold text-slate-950">Legislación federal</h2>
        <p className="mt-2 max-w-prose text-sm leading-relaxed text-slate-600">Consulta el texto y las reformas en el sitio de la Cámara de Diputados. El enlace se abre en tu navegador y requiere Internet.</p>
        <a href="https://www.diputados.gob.mx/LeyesBiblio/index.htm" target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-2 rounded-lg bg-legal-950 px-4 py-3 text-sm font-semibold text-white">
          Abrir Cámara de Diputados <ExternalLink size={16} className="shrink-0" aria-hidden="true" />
        </a>
      </Card>
      <section aria-label="Referencias por materia">
        <h2 className="text-base font-semibold text-slate-950">Referencias por materia</h2>
        <dl className="mt-3 divide-y divide-slate-200">
          {REFERENCES.map(({ area, names }) => (
            <div key={area} className="py-4">
              <dt className="text-sm font-semibold text-slate-950">{area}</dt>
              <dd className="mt-1 max-w-prose text-sm leading-relaxed text-slate-600">{names}</dd>
            </div>
          ))}
        </dl>
      </section>
    </Page>
  );
}
