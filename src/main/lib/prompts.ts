import type { LegalEcosystem } from '../../shared/legal-contracts';

export type LegalModule = LegalEcosystem | 'mercantil_analysis';

export const MODULE_ALLOWED_LAW_CODES: Record<LegalModule, string[]> = {
  mercantil: ['CCOM', 'LGSM', 'LGTOC'],
  laboral: ['LFT'],
  comercio_exterior: ['LCE', 'RLCE', 'LA', 'RLA', 'LIGIE', 'RGCE'],
  aduanal: ['LA', 'RLA', 'LIGIE', 'RGCE', 'LCE', 'RLCE'],
  fiscal: ['CFF', 'LISR', 'RLISR', 'LIVA', 'RLIVA', 'RMF'],
  mercantil_analysis: ['CCOM', 'LGSM', 'LGTOC'],
};

const LAW_TITLE_TO_CODE: Record<string, string> = {
  'CODIGO DE COMERCIO': 'CCOM',
  'CÓDIGO DE COMERCIO': 'CCOM',
  'LEY GENERAL DE SOCIEDADES MERCANTILES': 'LGSM',
  'LEY GENERAL DE TITULOS Y OPERACIONES DE CREDITO': 'LGTOC',
  'LEY GENERAL DE TÍTULOS Y OPERACIONES DE CRÉDITO': 'LGTOC',
  'CODIGO FISCAL DE LA FEDERACION': 'CFF',
  'CÓDIGO FISCAL DE LA FEDERACIÓN': 'CFF',
  'LEY DEL IMPUESTO SOBRE LA RENTA': 'LISR',
  'REGLAMENTO DE LA LEY DEL IMPUESTO SOBRE LA RENTA': 'RLISR',
  'LEY DEL IMPUESTO AL VALOR AGREGADO': 'LIVA',
  'REGLAMENTO DE LA LEY DEL IMPUESTO AL VALOR AGREGADO': 'RLIVA',
  'RESOLUCION MISCELANEA FISCAL': 'RMF',
  'RESOLUCIÓN MISCELÁNEA FISCAL': 'RMF',
  'LEY FEDERAL DEL TRABAJO': 'LFT',
  'LEY DE COMERCIO EXTERIOR': 'LCE',
  'REGLAMENTO DE LA LEY DE COMERCIO EXTERIOR': 'RLCE',
  'LEY ADUANERA': 'LA',
  'REGLAMENTO DE LA LEY ADUANERA': 'RLA',
  'REGLAS GENERALES DE COMERCIO EXTERIOR': 'RGCE',
  'LEY DE LOS IMPUESTOS GENERALES DE IMPORTACION Y DE EXPORTACION': 'LIGIE',
  'LEY DE LOS IMPUESTOS GENERALES DE IMPORTACIÓN Y DE EXPORTACIÓN': 'LIGIE',
};

const MODULE_LABELS: Record<LegalModule, string> = {
  mercantil: 'Derecho Mercantil y Corporativo',
  laboral: 'Contratos Laborales',
  comercio_exterior: 'Comercio Exterior',
  aduanal: 'Documentos Aduanales',
  fiscal: 'Derecho Fiscal',
  mercantil_analysis: 'Análisis Documental Mercantil',
};

export function normalizeLawCode(value?: string | null): string | null {
  if (!value) return null;
  const normalized = value
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (normalized === 'CCOM' || normalized === 'CODIGO DE COMERCIO') return 'CCOM';
  if (normalized === 'LGSM') return 'LGSM';
  if (normalized === 'LGTOC') return 'LGTOC';
  if (normalized === 'CFF') return 'CFF';
  if (normalized === 'LISR') return 'LISR';
  if (normalized === 'RLISR') return 'RLISR';
  if (normalized === 'LIVA') return 'LIVA';
  if (normalized === 'RLIVA') return 'RLIVA';
  if (normalized === 'RMF') return 'RMF';
  if (normalized === 'LFT') return 'LFT';
  if (normalized === 'LCE') return 'LCE';
  if (normalized === 'RLCE') return 'RLCE';
  if (normalized === 'LA') return 'LA';
  if (normalized === 'RLA') return 'RLA';
  if (normalized === 'RGCE') return 'RGCE';
  if (normalized === 'LIGIE' || normalized === 'TIGIE') return 'LIGIE';

  return LAW_TITLE_TO_CODE[value.trim().toUpperCase()] || LAW_TITLE_TO_CODE[normalized] || null;
}

export function isLawAllowedForModule(value: string | undefined | null, module: LegalModule): boolean {
  const lawCode = normalizeLawCode(value);
  return Boolean(lawCode && MODULE_ALLOWED_LAW_CODES[module].includes(lawCode));
}

export function getModuleLabel(module: LegalModule): string {
  return MODULE_LABELS[module];
}

export function getNoRagWarning(module: LegalModule): string {
  if (module === 'mercantil' || module === 'mercantil_analysis') {
    return 'ADVERTENCIA CRÍTICA: No tienes acceso a la base mercantil local en este momento. Redacta únicamente con la información de la plantilla o machote y marca [DATO FALTANTE] cuando sea necesario; no inventes artículos.';
  }
  if (module === 'laboral') {
    return 'ADVERTENCIA CRÍTICA: No tienes acceso a la base laboral local en este momento. Redacta únicamente con la información de la plantilla o machote y marca [DATO FALTANTE]; no inventes artículos.';
  }
  if (module === 'comercio_exterior') {
    return 'ADVERTENCIA CRÍTICA: No tienes acceso a la base de comercio exterior local en este momento. Redacta únicamente con la información de la plantilla o machote y marca [DATO FALTANTE]; no inventes artículos.';
  }
  if (module === 'aduanal') {
    return 'ADVERTENCIA CRÍTICA: No tienes acceso a la base aduanal local en este momento. Redacta únicamente con la información de la plantilla o machote y marca [DATO FALTANTE]; no inventes artículos.';
  }

  return 'ADVERTENCIA CRÍTICA: No tienes acceso a la base fiscal local en este momento. Usa únicamente la información disponible y aclara que no cuentas con fundamento normativo verificado.';
}

// Enfoque de la revisión documental por materia. La revisión junta los de las
// materias elegidas bajo un solo rol, definido en analyze.handler.
const ANALYSIS_FOCUS: Record<LegalEcosystem, string> = {
  mercantil: 'Mercantil y corporativo (Código de Comercio, LGSM y LGTOC): identifica tipo de instrumento, partes y representación, obligaciones, garantías y títulos de crédito, órganos sociales, jurisdicción y forma. Evalúa riesgos contractuales, corporativos, de representación, de cumplimiento y de forma.',
  laboral: 'Laboral (Ley Federal del Trabajo): identifica patrón, persona trabajadora, puesto, salario, jornada, prestaciones, duración de la relación y obligaciones de las partes. No inventes datos personales, salarios, jornadas, prestaciones, fechas ni centros de trabajo.',
  comercio_exterior: 'Comercio exterior (LCE y su reglamento, LIGIE, Ley Aduanera y su reglamento, RGCE): identifica operación, partes, mercancía, Incoterm, entrega, pago, documentos comerciales, permisos, certificados, transporte y responsables. No inventes fracciones arancelarias, permisos, restricciones, valores, origen ni clasificación.',
  aduanal: 'Aduanal (Ley Aduanera y su reglamento, RGCE, LIGIE, LCE y su reglamento): identifica pedimento o expediente, régimen, aduana, mercancía, factura, transporte, valor, anexos, permisos, certificados y agente aduanal. No inventes números de pedimento, claves, fracciones, contribuciones, autoridades ni plazos.',
  fiscal: 'Fiscal (CFF, LISR, LIVA, sus reglamentos y RMF): identifica materialidad, CFDI, contraprestación, evidencia, entregables, proveedor, cliente, fechas y pagos. Evalúa riesgos de materialidad, deducibilidad, IVA acreditable y operaciones inexistentes.',
};

export function getAnalysisFocus(ecosystem: LegalEcosystem): string {
  return ANALYSIS_FOCUS[ecosystem];
}

export function getDraftInstruction(module: LegalModule): string {
  if (module === 'mercantil') {
    return 'TAREA: Proyecte un instrumento mercantil o corporativo formal conforme a técnica contractual mexicana. Use únicamente las instrucciones actuales, la plantilla precargada o el machote proporcionado y el corpus mercantil local. Use [DATO FALTANTE] si falta información.';
  }
  if (module === 'laboral') {
    return 'TAREA: Proyecte un contrato, convenio, anexo o expediente laboral mexicano usando únicamente las instrucciones actuales, la plantilla precargada o el machote proporcionado. Si no hay corpus laboral local recuperado, no cite artículos y use [DATO FALTANTE] si falta información.';
  }
  if (module === 'comercio_exterior') {
    return 'TAREA: Proyecte un documento de comercio exterior, contrato internacional o checklist operativo usando únicamente las instrucciones actuales, la plantilla precargada o el machote proporcionado. Si no hay corpus local recuperado, no cite artículos y use [DATO FALTANTE] si falta información.';
  }
  if (module === 'aduanal') {
    return 'TAREA: Proyecte un documento aduanal, expediente de pedimento, memo de valor o respuesta operativa usando únicamente las instrucciones actuales, la plantilla precargada o el machote proporcionado. Si no hay corpus local recuperado, no cite artículos y use [DATO FALTANTE] si falta información.';
  }

  return 'TAREA: Proyecte un soporte, defensa o instrumento fiscal formal conforme a legislación fiscal mexicana. Use únicamente las instrucciones actuales, la plantilla precargada o el machote proporcionado y el corpus fiscal local. Use [DATO FALTANTE] si falta información.';
}

// Tarea común de la revisión; areaList es la lista ya redactada de las materias
// elegidas, por ejemplo «mercantil/corporativo y laboral».
export function getAnalysisInstruction(areaList: string): string {
  return `TAREA: Revisa el documento en materia ${areaList}. Identifica tipo de documento, partes, obligaciones, cláusulas faltantes, datos faltantes, riesgos clasificados por severidad y materia, sus fundamentos y las acciones recomendadas. Sustenta cada conclusión en los artículos recuperados, si los hay, y en la evidencia documental.`;
}
