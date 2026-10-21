import { useCallback, useEffect, useState } from 'react';
import { resolveLawCode } from '../../lib/law-codes';

type InstalledLaw = Awaited<ReturnType<typeof window.lexDesktop.legalCorpus.list>>['laws'][number];

// Devuelve el enlace al texto oficial de una ley citada (por código o por nombre), o null si
// la ley no está instalada. Sin la lista de leyes, las citas se muestran sin enlace.
export function useOfficialLawSources(): (law: string | null | undefined) => string | null {
  const [laws, setLaws] = useState<InstalledLaw[]>([]);

  useEffect(() => {
    let alive = true;
    window.lexDesktop.legalCorpus.list()
      .then((overview) => { if (alive) setLaws(overview.laws); })
      .catch(() => undefined);
    return () => { alive = false; };
  }, []);

  return useCallback((law) => {
    const code = resolveLawCode(law);
    if (!code) return null;
    return laws.find((item) => item.code.toUpperCase() === code)?.officialUrl ?? null;
  }, [laws]);
}
