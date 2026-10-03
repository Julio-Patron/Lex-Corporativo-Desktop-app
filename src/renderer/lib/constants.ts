/**
 * Catálogo de plantillas de redacción por materia. El texto completo de cada
 * machote vive en template-bodies.ts.
 */

export type TemplateFieldType = 'text' | 'date' | 'amount';

export interface TemplateField {
  id: string;
  label: string;
  type: TemplateFieldType;
}

export interface DraftingTemplate {
  id: string;
  title: string;
  description: string;
  prompt: string;
  fields: TemplateField[];
  output: string;
  intentGroup?: string;
}

// ── Mercantil Drafting Templates ──────────────────────────
export const MERCANTIL_DRAFTING_TEMPLATES: DraftingTemplate[] = [
  {
    id: 'mercantil-sapi-acta-constitutiva',
    title: 'Acta Constitutiva (SAPI)',
    description: 'Estatutos sociales de S.A.P.I. de C.V. con gobierno corporativo avanzado, series de acciones y pactos de accionistas.',
    prompt: 'Proyecto formal de acta constitutiva y estatutos sociales para una Sociedad Anónima Promotora de Inversión de Capital Variable (S.A.P.I. de C.V.) conforme a la Ley General de Sociedades Mercantiles y los artículos 11 a 19 de la Ley del Mercado de Valores, estipulando capital social fijo y variable, acciones Serie "A" (ordinarias) y Serie "B" (preferentes o con voto limitado), derechos de arrastre (drag-along) y adhesión (tag-along), derecho de preferencia, Consejo de Administración o Administrador Único, y Comisario.',
    fields: [
    { id: 'denominaci_n_social', label: 'Denominación social', type: 'text' },
    { id: 'socios_accionistas_fundadores', label: 'Socios / Accionistas fundadores', type: 'text' },
    { id: 'capital_social_m_nimo_fijo_y_variable', label: 'Capital social mínimo fijo y variable', type: 'text' },
    { id: 'objeto_social_preponderante', label: 'Objeto social preponderante', type: 'text' },
    { id: 'estructura_de_administraci_n_y_comisario', label: 'Estructura de administración y Comisario', type: 'text' },
    { id: 'reglas_de_transmisi_n_de_acciones_drag_along_tag_along', label: 'Reglas de transmisión de acciones (drag-along / tag-along)', type: 'text' }
  ],
    output: 'Proyecto de estatutos sociales y acta constitutiva formal de S.A.P.I. de C.V.',
    intentGroup: 'Constituir / Gobernar sociedad',
  },
  {
    id: 'mercantil-asamblea-ordinaria',
    title: 'Asamblea General Ordinaria Anual',
    description: 'Acta de asamblea ordinaria anual para aprobación de estados financieros, informe de administración, comisario y reservas.',
    prompt: 'Acta de Asamblea General Ordinaria Anual de Accionistas conforme a los artículos 178 a 194 de la Ley General de Sociedades Mercantiles, con orden del día formal, quórum de asistencia y votación, aprobación de estados financieros e informes de administración y del comisario (Art. 166 LGSM), asignación a reserva legal y resolución sobre ratificación u otorgamiento de poderes.',
    fields: [
    { id: 'denominaci_n_social_de_la_sociedad', label: 'Denominación social de la sociedad', type: 'text' },
    { id: 'fecha_y_hora_de_celebraci_n', label: 'Fecha y hora de celebración', type: 'text' },
    { id: 'accionistas_presentes_y_porcentaje_de_capital', label: 'Accionistas presentes y porcentaje de capital', type: 'text' },
    { id: 'ejercicio_social_a_aprobar', label: 'Ejercicio social a aprobar', type: 'text' },
    { id: 'resoluciones_sobre_estados_financieros_y_comisario', label: 'Resoluciones sobre estados financieros y comisario', type: 'text' },
    { id: 'presidente_secretario_y_escrutador', label: 'Presidente, Secretario y Escrutador', type: 'text' }
  ],
    output: 'Acta formal de asamblea general ordinaria anual con quórum y resoluciones.',
    intentGroup: 'Constituir / Gobernar sociedad',
  },
  {
    id: 'mercantil-pagare',
    title: 'Pagaré Mercantil',
    description: 'Título de crédito formal con monto líquido, intereses ordinarios y moratorios, vencimiento anticipado y aval solidario.',
    prompt: 'Pagaré mercantil ejecutivo conforme a los artículos 170 a 174 de la Ley General de Títulos y Operaciones de Crédito (LGTOC), estipulando la promesa incondicional de pagar una suma determinada de dinero, fecha y lugar de vencimiento, tasa de interés moratorio mensual, cláusula expresa de vencimiento anticipado por mora y designación de aval solidario.',
    fields: [
    { id: 'monto_en_n_mero_y_letra', label: 'Monto en número y letra', type: 'text' },
    { id: 'acreedor_o_beneficiario', label: 'Acreedor o beneficiario', type: 'text' },
    { id: 'suscriptor_deudor', label: 'Suscriptor / Deudor', type: 'text' },
    { id: 'fecha_y_lugar_de_pago', label: 'Fecha y lugar de pago', type: 'text' },
    { id: 'tasa_de_inter_s_moratorio', label: 'Tasa de interés moratorio', type: 'text' },
    { id: 'aval_solidario_si_aplica', label: 'Aval solidario (si aplica)', type: 'text' }
  ],
    output: 'Pagaré mercantil formal con fuerza ejecutiva cambiaria conforme a la LGTOC.',
    intentGroup: 'Cobrar / Garantizar',
  },
  {
    id: 'mercantil-fideicomiso-garantia',
    title: 'Fideicomiso Irrevocable de Garantía',
    description: 'Contrato de fideicomiso de garantía ante institución fiduciaria para asegurar obligaciones comerciales o crediticias.',
    prompt: 'Contrato de fideicomiso irrevocable de garantía conforme a los artículos 381 a 407 de la Ley General de Títulos y Operaciones de Crédito, con afectación y aportación de bienes o derechos, designación de fiduciario bancario, reglas de custodia y procedimiento convencional de enajenación extrajudicial en caso de incumplimiento.',
    fields: [
    { id: 'fideicomitente', label: 'Fideicomitente', type: 'text' },
    { id: 'fiduciario_instituci_n_de_cr_dito', label: 'Fiduciario (Institución de Crédito)', type: 'text' },
    { id: 'fideicomisario', label: 'Fideicomisario', type: 'text' },
    { id: 'bienes_o_derechos_aportados_en_garant_a', label: 'Bienes o derechos aportados en garantía', type: 'text' },
    { id: 'obligaci_n_principal_garantizada', label: 'Obligación principal garantizada', type: 'text' },
    { id: 'procedimiento_de_ejecuci_n_extrajudicial', label: 'Procedimiento de ejecución extrajudicial', type: 'text' }
  ],
    output: 'Borrador formal de contrato de fideicomiso irrevocable de garantía.',
    intentGroup: 'Cobrar / Garantizar',
  },
  {
    id: 'mercantil-poder-dominio',
    title: 'Poder General para Pleitos, Cobranzas, Administración y Dominio',
    description: 'Instrumento de poder general amplísimo conforme al Código Civil Federal y facultades cambiarias bajo la LGTOC.',
    prompt: 'Instrumento formal de poder general para pleitos y cobranzas, actos de administración y actos de riguroso dominio conforme al artículo 2554 del Código Civil Federal, con inclusión expresa de facultades cambiarias para emitir, endosar y avalar títulos de crédito conforme al artículo 9º de la LGTOC, con estipulación de limitaciones o condiciones de ejercicio.',
    fields: [
    { id: 'poderdante_sociedad_o_persona_f_sica', label: 'Poderdante (sociedad o persona física)', type: 'text' },
    { id: 'apoderado_designado', label: 'Apoderado designado', type: 'text' },
    { id: 'facultades_conferidas_pleitos_administraci_n_dominio_y_cambiarias', label: 'Facultades conferidas (pleitos, administración, dominio y cambiarias)', type: 'text' },
    { id: 'limitaciones_expresas_si_aplican', label: 'Limitaciones expresas (si aplican)', type: 'text' },
    { id: 'car_cter_mancomunado_o_solidario', label: 'Carácter mancomunado o solidario', type: 'text' },
    { id: 'vigencia', label: 'Vigencia', type: 'text' }
  ],
    output: 'Instrumento de poder general amplio con facultades de dominio y cambiarias.',
    intentGroup: 'Constituir / Gobernar sociedad',
  },
  {
    id: 'mercantil-compraventa-bienes',
    title: 'Compraventa Mercantil con Reserva de Dominio',
    description: 'Compraventa mercantil de bienes con entrega, vicios ocultos, garantía de saneamiento y reserva de dominio hasta pago total.',
    prompt: 'Contrato de compraventa mercantil de bienes conforme a los artículos 75 y 371 del Código de Comercio y 2312 del Código Civil Federal, con especificación técnica de mercancías, precio total, calendario de pagos, entrega material, cláusula expresa de reserva de dominio, plazo para reclamar vicios ocultos y pena convencional por incumplimiento.',
    fields: [
    { id: 'vendedor', label: 'Vendedor', type: 'text' },
    { id: 'comprador', label: 'Comprador', type: 'text' },
    { id: 'descripci_n_detallada_de_bienes', label: 'Descripción detallada de bienes', type: 'text' },
    { id: 'precio_y_condiciones_de_pago', label: 'Precio y condiciones de pago', type: 'text' },
    { id: 'lugar_y_plazo_de_entrega', label: 'Lugar y plazo de entrega', type: 'text' },
    { id: 'pacto_de_reserva_de_dominio', label: 'Pacto de reserva de dominio', type: 'text' },
    { id: 'plazo_de_garant_a_por_vicios_ocultos', label: 'Plazo de garantía por vicios ocultos', type: 'text' }
  ],
    output: 'Contrato de compraventa mercantil de bienes con pacto de reserva de dominio y garantías.',
    intentGroup: 'Contratar / Operar',
  },
  {
    id: 'mercantil-distribucion-comercial',
    title: 'Distribución Comercial',
    description: 'Contrato de distribución comercial con exclusividad territorial, procedimiento de pedidos, políticas de marca y no subordinación.',
    prompt: 'Contrato de distribución comercial conforme a los artículos 75 y 78 del Código de Comercio, con delimitación de productos, territorio asignado, régimen de exclusividad, procedimiento de colocación de pedidos y entregas, condiciones de precios y pago, obligaciones de promoción y stock, propiedad industrial y deslinde de subordinación laboral.',
    fields: [
    { id: 'proveedor_fabricante', label: 'Proveedor / Fabricante', type: 'text' },
    { id: 'distribuidor', label: 'Distribuidor', type: 'text' },
    { id: 'productos_objeto_de_distribuci_n', label: 'Productos objeto de distribución', type: 'text' },
    { id: 'territorio_asignado', label: 'Territorio asignado', type: 'text' },
    { id: 'r_gimen_de_exclusividad', label: 'Régimen de exclusividad', type: 'text' },
    { id: 'precios_y_condiciones_de_pago', label: 'Precios y condiciones de pago', type: 'text' },
    { id: 'vigencia', label: 'Vigencia', type: 'text' }
  ],
    output: 'Contrato formal de distribución comercial con cláusulas operativas y de exclusividad.',
    intentGroup: 'Contratar / Operar',
  },
  {
    id: 'mercantil-comision-mercantil',
    title: 'Comisión Mercantil',
    description: 'Contrato de comisión mercantil con cálculo de comisiones, territorio, rendición de cuentas y blindaje de no subordinación laboral.',
    prompt: 'Contrato de comisión mercantil conforme a los artículos 75 y 273 del Código de Comercio, estipulando actos de comercio encomendados, actuación en nombre propio o del comitente, territorio, porcentaje de comisión sobre ventas cobradas, calendario de rendición de cuentas, gastos y expresa prohibición de subordinación laboral conforme a la LFT.',
    fields: [
    { id: 'comitente', label: 'Comitente', type: 'text' },
    { id: 'comisionista', label: 'Comisionista', type: 'text' },
    { id: 'operaciones_y_actos_encomendados', label: 'Operaciones y actos encomendados', type: 'text' },
    { id: 'territorio_asignado', label: 'Territorio asignado', type: 'text' },
    { id: 'porcentaje_o_base_de_c_lculo_de_comisiones', label: 'Porcentaje o base de cálculo de comisiones', type: 'text' },
    { id: 'plazos_de_rendici_n_de_cuentas', label: 'Plazos de rendición de cuentas', type: 'text' },
    { id: 'condiciones_de_pago', label: 'Condiciones de pago', type: 'text' }
  ],
    output: 'Contrato formal de comisión mercantil con cláusulas de rendición de cuentas y no subordinación.',
    intentGroup: 'Contratar / Operar',
  },
  {
    id: 'mercantil-suministro',
    title: 'Suministro Mercantil',
    description: 'Contrato de suministro de bienes o materias primas con entregas periódicas, SLA, revisión de precios y penas convencionales.',
    prompt: 'Contrato de suministro mercantil continuo y periódico conforme al Código de Comercio y Código Civil Federal, con especificación de bienes o insumos, niveles de servicio (SLA), procedimiento de órdenes de compra, fórmula de revisión de precios, control de calidad, pena convencional por retraso en entrega y pactos de exclusividad.',
    fields: [
    { id: 'proveedor_suministrador', label: 'Proveedor / Suministrador', type: 'text' },
    { id: 'cliente_suministrado', label: 'Cliente / Suministrado', type: 'text' },
    { id: 'bienes_o_insumos_suministrados', label: 'Bienes o insumos suministrados', type: 'text' },
    { id: 'precio_base_y_f_rmula_de_ajuste', label: 'Precio base y fórmula de ajuste', type: 'text' },
    { id: 'calendario_o_frecuencia_de_entregas', label: 'Calendario o frecuencia de entregas', type: 'text' },
    { id: 'penas_convencionales_por_mora', label: 'Penas convencionales por mora', type: 'text' },
    { id: 'vigencia', label: 'Vigencia', type: 'text' }
  ],
    output: 'Contrato formal de suministro mercantil con cláusulas de SLA y penalizaciones.',
    intentGroup: 'Contratar / Operar',
  },
  {
    id: 'mercantil-franquicia-licencia',
    title: 'Franquicia y Licencia de Marca',
    description: 'Contrato de franquicia y licencia de uso de marca conforme a la LFPPI con manuales operativos, regalías y fondo de publicidad.',
    prompt: 'Contrato de franquicia conforme a los artículos 245 a 251 de la Ley Federal de Protección a la Propiedad Industrial (LFPPI), con entrega previa de Circular de Oferta de Franquicia (COF), licencia no exclusiva de marcas registradas ante el IMPI, transmisión de know-how mediante manuales de operación, cuota inicial de franquicia, regalías periódicas (royalties), aportación a fondo de publicidad e inspección de calidad.',
    fields: [
    { id: 'franquiciante_titular_de_la_marca', label: 'Franquiciante / Titular de la marca', type: 'text' },
    { id: 'franquiciatario', label: 'Franquiciatario', type: 'text' },
    { id: 'marcas_registradas_y_registros_impi', label: 'Marcas registradas y registros IMPI', type: 'text' },
    { id: 'territorio_exclusivo_autorizado', label: 'Territorio exclusivo autorizado', type: 'text' },
    { id: 'cuota_inicial_y_porcentaje_de_regal_as', label: 'Cuota inicial y porcentaje de regalías', type: 'text' },
    { id: 'manuales_y_est_ndares_operativos', label: 'Manuales y estándares operativos', type: 'text' },
    { id: 'vigencia', label: 'Vigencia', type: 'text' }
  ],
    output: 'Contrato formal de franquicia y licencia de marca bajo la LFPPI.',
    intentGroup: 'Contratar / Operar',
  },
  {
    id: 'mercantil-cesion-propiedad-intelectual',
    title: 'Cesión de Derechos Patrimoniales e Intangibles',
    description: 'Cesión de derechos patrimoniales sobre código de software, marcas, diseños o derechos de autor a favor de la empresa.',
    prompt: 'Contrato de cesión de derechos patrimoniales y de propiedad intelectual conforme a la LFDA y LFPPI, para la transmisión definitiva de derechos sobre código de software, marcas, diseños o derechos de autor, con estipulación de contraprestación, garantías de titularidad y saneamiento para el caso de evicción, respeto a derechos morales y formalidades de registro ante INDAUTOR/IMPI.',
    fields: [
    { id: 'cedente', label: 'Cedente', type: 'text' },
    { id: 'cesionario', label: 'Cesionario', type: 'text' },
    { id: 'bienes_intelectuales_cedidos_c_digo_marca_dise_o_u_obra', label: 'Bienes intelectuales cedidos (código, marca, diseño u obra)', type: 'text' },
    { id: 'precio_o_contraprestaci_n', label: 'Precio o contraprestación', type: 'text' },
    { id: 'garant_a_de_titularidad_y_saneamiento', label: 'Garantía de titularidad y saneamiento', type: 'text' },
    { id: 'jurisdicci_n', label: 'Jurisdicción', type: 'text' }
  ],
    output: 'Contrato definitivo de cesión de derechos patrimoniales y de propiedad intelectual.',
    intentGroup: 'Proteger información',
  },
  {
    id: 'mercantil-reconocimiento-adeudo',
    title: 'Reconocimiento de Adeudo y Plan de Pagos',
    description: 'Convenio con reconocimiento formal de deuda líquida, calendario de pagos, intereses moratorios y sumisión a vía ejecutiva mercantil.',
    prompt: 'Convenio de reconocimiento de adeudo y compromiso de pago en parcialidades conforme al Código de Comercio y Código Civil Federal, con determinación de saldo líquido y origen de la deuda, calendario detallado de parcialidades, intereses moratorios, cláusula de vencimiento anticipado por impago y sumisión expresa a tribunales competentes para vía ejecutiva mercantil.',
    fields: [
    { id: 'acreedor', label: 'Acreedor', type: 'text' },
    { id: 'deudor', label: 'Deudor', type: 'text' },
    { id: 'monto_total_reconocido_y_origen_de_la_deuda', label: 'Monto total reconocido y origen de la deuda', type: 'text' },
    { id: 'calendario_de_parcialidades_y_fechas_l_mite', label: 'Calendario de parcialidades y fechas límite', type: 'text' },
    { id: 'tasa_de_inter_s_moratorio', label: 'Tasa de interés moratorio', type: 'text' },
    { id: 'causas_de_vencimiento_anticipado', label: 'Causas de vencimiento anticipado', type: 'text' }
  ],
    output: 'Convenio formal de reconocimiento de adeudo con fuerza ejecutiva y plan de pagos.',
    intentGroup: 'Cobrar / Garantizar',
  },
  {
    id: 'mercantil-adenda',
    title: 'Convenio Modificatorio (Adenda Universal)',
    description: 'Convenio modificatorio universal para prorrogar plazos, ajustar montos, modificar entregables o ratificar garantías de contratos vigentes.',
    prompt: 'Convenio modificatorio (adenda universal) para contratos vigentes conforme al Código de Comercio y Código Civil Federal, con estipulación de prórrogas de plazo, ajuste de montos y contraprestaciones, modificación de entregables o especificaciones, subsistencia de cláusulas no modificadas y ratificación expresa de garantías.',
    fields: [
    { id: 'contrato_original_y_fecha', label: 'Contrato original y fecha', type: 'text' },
    { id: 'partes_firmantes', label: 'Partes firmantes', type: 'text' },
    { id: 'cl_usulas_objeto_de_modificaci_n_plazos_montos_o_entregables', label: 'Cláusulas objeto de modificación (plazos, montos o entregables)', type: 'text' },
    { id: 'nueva_redacci_n_y_efectos', label: 'Nueva redacción y efectos', type: 'text' },
    { id: 'ratificaci_n_de_garant_as', label: 'Ratificación de garantías', type: 'text' }
  ],
    output: 'Convenio modificatorio estructurado listo para firmas.',
    intentGroup: 'Corregir / Blindar',
  },
  {
    id: 'mercantil-clausula-penalizacion',
    title: 'Cláusula Modelo de Penalización Convencional',
    description: 'Cláusula de pena convencional líquida ante incumplimientos de obligaciones contractuales o moras.',
    prompt: 'Cláusula modelo de pena convencional y liquidación anticipada de daños conforme a los artículos 1840 a 1845 del Código Civil Federal y 376 del Código de Comercio, con cuantificación porcentual o fija, límite legal no superior a la obligación principal, notificación previa y exigibilidad ejecutiva inmediata sin necesidad de declaración judicial previa.',
    fields: [
    { id: 'supuestos_espec_ficos_de_incumplimiento', label: 'Supuestos específicos de incumplimiento', type: 'text' },
    { id: 'monto_fijo_o_porcentaje_de_pena_diaria_mensual', label: 'Monto fijo o porcentaje de pena diaria/mensual', type: 'text' },
    { id: 'tope_m_ximo_de_acumulaci_n_legal', label: 'Tope máximo de acumulación legal', type: 'text' },
    { id: 'mecanismo_y_plazo_formal_de_notificaci_n', label: 'Mecanismo y plazo formal de notificación', type: 'text' }
  ],
    output: 'Cláusula modelo de penalización convencional con blindaje de proporcionalidad.',
    intentGroup: 'Corregir / Blindar',
  },
  {
    id: 'mercantil-clausula-jurisdiccion',
    title: 'Cláusula Modelo de Jurisdicción y Arbitraje',
    description: 'Cláusula de ley aplicable, fuero judicial expreso y opción de arbitraje comercial (CAM/CANACO).',
    prompt: 'Cláusula modelo de ley aplicable y solución de controversias mercantiles conforme al Código de Comercio y Código Federal de Procedimientos Civiles, con sometimiento expreso a la jurisdicción de tribunales federales o del fuero común de una sede determinada, renuncia expresa a cualquier otro fuero por domicilio presente o futuro, y cláusula arbitral alternativa bajo el reglamento de la CAM o CANACO.',
    fields: [
    { id: 'sede_y_tribunales_competentes_ciudad_estado', label: 'Sede y tribunales competentes (Ciudad / Estado)', type: 'text' },
    { id: 'legislaci_n_mercantil_federal_aplicable', label: 'Legislación mercantil federal aplicable', type: 'text' },
    { id: 'renuncia_expresa_de_fueros', label: 'Renuncia expresa de fueros', type: 'text' },
    { id: 'opci_n_de_cl_usula_arbitral_opcional', label: 'Opción de cláusula arbitral (opcional)', type: 'text' }
  ],
    output: 'Cláusula modelo de jurisdicción y solución de controversias con sumisión expresa.',
    intentGroup: 'Corregir / Blindar',
  },
  {
    id: 'mercantil-nda-bilateral',
    title: 'Convenio Bilateral de Confidencialidad (NDA Bilateral)',
    description: 'Protección de secretos industriales, know-how y datos estratégicos bajo la LFPPI con pena convencional por divulgación.',
    prompt: 'Convenio bilateral de confidencialidad y protección de secretos industriales conforme a los artículos 163 a 169 de la Ley Federal de Protección a la Propiedad Industrial (LFPPI), con definición exhaustiva de información confidencial técnica, financiera y societaria, deberes de no divulgación y no uso ajeno, excepciones estándar (dominio público, orden judicial), vigencia post-contractual y pena convencional por divulgación ilícita.',
    fields: [
    { id: 'parte_reveladora_receptora_a', label: 'Parte Reveladora / Receptora A', type: 'text' },
    { id: 'parte_reveladora_receptora_b', label: 'Parte Reveladora / Receptora B', type: 'text' },
    { id: 'definici_n_de_informaci_n_confidencial_y_secreto_industrial', label: 'Definición de Información Confidencial y Secreto Industrial', type: 'text' },
    { id: 'finalidad_autorizada_del_intercambio', label: 'Finalidad autorizada del intercambio', type: 'text' },
    { id: 'plazo_de_confidencialidad', label: 'Plazo de confidencialidad', type: 'text' },
    { id: 'pena_convencional_por_violaci_n', label: 'Pena convencional por violación', type: 'text' }
  ],
    output: 'Convenio formal de confidencialidad y secreto industrial bilateral bajo la LFPPI.',
    intentGroup: 'Proteger información',
  },
  {
    id: 'mercantil-cesion-derechos',
    title: 'Cesión de Derechos de Crédito y Cobro',
    description: 'Transmisión formal y onerosa de derechos de crédito mercantil con notificación al deudor cedido.',
    prompt: 'Contrato de cesión de derechos de crédito y cobro mercantil conforme a los artículos 389 a 391 del Código de Comercio y 2029 del Código Civil Federal, con determinación de la existencia y legitimidad del crédito cedido (facturas o títulos), precio de cesión, garantías de cobro y modelo formal anexo de notificación notarial o extrajudicial al deudor cedido.',
    fields: [
    { id: 'cedente', label: 'Cedente', type: 'text' },
    { id: 'cesionario', label: 'Cesionario', type: 'text' },
    { id: 'deudor_cedido', label: 'Deudor cedido', type: 'text' },
    { id: 'cr_dito_facturas_o_t_tulos_objeto_de_cesi_n', label: 'Crédito, facturas o títulos objeto de cesión', type: 'text' },
    { id: 'precio_y_condiciones_de_pago_de_la_cesi_n', label: 'Precio y condiciones de pago de la cesión', type: 'text' },
    { id: 'mecanismo_de_notificaci_n_al_deudor', label: 'Mecanismo de notificación al deudor', type: 'text' }
  ],
    output: 'Contrato formal de cesión de créditos mercantiles con modelo de notificación anexo.',
    intentGroup: 'Cobrar / Garantizar',
  },
];

// ── Laboral Drafting Templates ────────────────────────────
export const LABORAL_DRAFTING_TEMPLATES: DraftingTemplate[] = [
  {
    id: 'laboral-contrato-individual',
    title: 'Contrato Individual de Trabajo por Tiempo Indeterminado',
    description: 'Contrato de trabajo bajo la LFT con periodo de prueba, jornada, salario, vacaciones dignas reformadas y aguinaldo.',
    prompt: 'Contrato individual de trabajo por tiempo indeterminado conforme a los artículos 20, 24, 25, 39-A (periodo de prueba optativo improrrogable), 58 a 68 (jornada diurna/nocturna/mixta), 76 (vacaciones dignas reformadas), 87 (aguinaldo) y 134 de la Ley Federal del Trabajo, estipulando puesto, funciones, salario diario integrado, periodicidad de pago, retenciones IMSS/ISR, centro de trabajo, capacitación y secreto profesional.',
    fields: [
    { id: 'patr_n_raz_n_social', label: 'Patrón / Razón Social', type: 'text' },
    { id: 'persona_trabajadora_curp_rfc_nss', label: 'Persona trabajadora (CURP, RFC, NSS)', type: 'text' },
    { id: 'puesto_y_funciones_detalladas', label: 'Puesto y funciones detalladas', type: 'text' },
    { id: 'modalidad_periodo_de_prueba_o_tiempo_indeterminado', label: 'Modalidad (periodo de prueba o tiempo indeterminado)', type: 'text' },
    { id: 'tipo_de_jornada_y_horario', label: 'Tipo de jornada y horario', type: 'text' },
    { id: 'salario_cuota_diaria_y_forma_de_pago', label: 'Salario cuota diaria y forma de pago', type: 'text' },
    { id: 'prestaciones_de_ley_vacaciones_aguinaldo_prima_vacacional', label: 'Prestaciones de ley (vacaciones, aguinaldo, prima vacacional)', type: 'text' },
    { id: 'centro_de_trabajo', label: 'Centro de trabajo', type: 'text' }
  ],
    output: 'Contrato individual de trabajo formal bajo la legislación laboral mexicana vigente.',
    intentGroup: 'Contratar personal',
  },
  {
    id: 'laboral-teletrabajo',
    title: 'Convenio de Teletrabajo (Home Office NOM-037)',
    description: 'Convenio modificatorio de teletrabajo bajo la LFT y NOM-037-STPS-2023 con subsidio de servicios y derecho a desconexión.',
    prompt: 'Convenio modificatorio de condiciones de trabajo para la modalidad de teletrabajo conforme a los artículos 330-A a 330-K de la Ley Federal del Trabajo y la NOM-037-STPS-2023, estipulando el domicilio remoto autorizado, entrega de equipo ergonómico y de cómputo en comodato, pago compensatorio mensual proporcional por servicios de electricidad e internet (Art. 330-E fracc. III), estricto derecho a la desconexión digital al término de la jornada (Art. 330-E fracc. VI), y pacto de reversibilidad a modalidad presencial (Art. 330-G).',
    fields: [
    { id: 'patr_n', label: 'Patrón', type: 'text' },
    { id: 'persona_trabajadora', label: 'Persona trabajadora', type: 'text' },
    { id: 'contrato_laboral_base_y_fecha', label: 'Contrato laboral base y fecha', type: 'text' },
    { id: 'domicilio_del_lugar_de_teletrabajo', label: 'Domicilio del lugar de teletrabajo', type: 'text' },
    { id: 'inventario_de_equipo_y_herramientas_asignadas', label: 'Inventario de equipo y herramientas asignadas', type: 'text' },
    { id: 'monto_de_compensaci_n_de_luz_e_internet', label: 'Monto de compensación de luz e internet', type: 'amount' },
    { id: 'horario_de_jornada_y_horario_de_desconexi_n_digital', label: 'Horario de jornada y horario de desconexión digital', type: 'text' }
  ],
    output: 'Convenio formal de teletrabajo en estricto apego a la LFT y NOM-037-STPS-2023.',
    intentGroup: 'Regular modalidad',
  },
  {
    id: 'laboral-confidencialidad',
    title: 'Acuerdo de Confidencialidad y Secreto Laboral',
    description: 'Compromiso de reserva y custodia de secretos técnicos, comerciales y de clientes conforme a la LFT y LFPPI.',
    prompt: 'Acuerdo de confidencialidad y protección de secretos laborales conforme a los artículos 134 fracción XIII de la Ley Federal del Trabajo y 163 a 169 de la LFPPI, estipulando la obligación de no divulgación de información reservada, fórmulas, código fuente, costos y bases de datos de clientes, con vigencia subsistente durante y después de la relación laboral y consecuencias civiles, laborales y penales.',
    fields: [
    { id: 'patr_n_empresa', label: 'Patrón / Empresa', type: 'text' },
    { id: 'persona_trabajadora', label: 'Persona trabajadora', type: 'text' },
    { id: 'definici_n_de_secretos_y_datos_confidenciales', label: 'Definición de secretos y datos confidenciales', type: 'text' },
    { id: 'duraci_n_de_la_obligaci_n_post_laboral', label: 'Duración de la obligación post-laboral', type: 'text' },
    { id: 'consecuencias_por_revelaci_n_il_cita', label: 'Consecuencias por revelación ilícita', type: 'text' }
  ],
    output: 'Acuerdo formal de confidencialidad y protección de secretos laborales.',
    intentGroup: 'Proteger información',
  },
  {
    id: 'laboral-confidencialidad-no-competencia',
    title: 'Pacto de No Competencia y Confidencialidad Laboral',
    description: 'Convenio de no competencia post-laboral y no captación de clientes con contraprestación económica obligatoria.',
    prompt: 'Convenio de confidencialidad, no competencia y no captación (non-solicitation) post-laboral conforme al artículo 134 de la LFT, LFPPI y los principios de proporcionalidad del artículo 5º Constitucional, estipulando territorio geográfico limitado, plazo temporal estricto (máximo 1 año), asignación de una contraprestación económica compensatoria periódica obligatoria a favor del trabajador, prohibición de inducción de personal/clientes y pena convencional.',
    fields: [
    { id: 'empresa_patr_n', label: 'Empresa / Patrón', type: 'text' },
    { id: 'persona_trabajadora_y_puesto_clave', label: 'Persona trabajadora y puesto clave', type: 'text' },
    { id: 'territorio_espec_fico_de_restricci_n', label: 'Territorio específico de restricción', type: 'text' },
    { id: 'plazo_de_no_competencia_post_laboral_m_ximo_12_meses', label: 'Plazo de no competencia post-laboral (máximo 12 meses)', type: 'text' },
    { id: 'monto_mensual_de_contraprestaci_n_econ_mica_obligatoria', label: 'Monto mensual de contraprestación económica obligatoria', type: 'amount' },
    { id: 'pena_convencional', label: 'Pena convencional', type: 'text' }
  ],
    output: 'Convenio formal de no competencia laboral con plena validez constitucional y contraprestación.',
    intentGroup: 'Proteger información',
  },
  {
    id: 'laboral-convenio-terminacion',
    title: 'Convenio de Finiquito y Terminación Laboral',
    description: 'Convenio de terminación por mutuo consentimiento con desglose de liquidación y no adeudo bajo los Arts. 33 y 53 LFT.',
    prompt: 'Convenio formal de terminación de la relación de trabajo por mutuo consentimiento y finiquito conforme a los artículos 33, 53 fracción I y 87 de la Ley Federal del Trabajo, conteniendo tabla circunstanciada de conceptos liquidados (días laborados, vacaciones proporcionales, prima vacacional, aguinaldo proporcional, prima de antigüedad en su caso), manifestación expresa de no adeudo recíproco, no existencia de riesgos de trabajo y estipulación de ratificación ante el Centro de Conciliación Laboral.',
    fields: [
    { id: 'patr_n', label: 'Patrón', type: 'text' },
    { id: 'persona_trabajadora', label: 'Persona trabajadora', type: 'text' },
    { id: 'fecha_de_ingreso_y_fecha_de_terminaci_n', label: 'Fecha de ingreso y fecha de terminación', type: 'text' },
    { id: 'salario_base_de_liquidaci_n', label: 'Salario base de liquidación', type: 'text' },
    { id: 'desglose_detallado_de_conceptos_liquidados_n_meros_y_letras', label: 'Desglose detallado de conceptos liquidados (números y letras)', type: 'text' },
    { id: 'constancia_de_entrega_de_finiquito_y_constancia_patronal', label: 'Constancia de entrega de finiquito y constancia patronal', type: 'text' }
  ],
    output: 'Convenio formal de terminación laboral y finiquito con tabla de liquidación.',
    intentGroup: 'Cerrar relación',
  },
  {
    id: 'laboral-acta-administrativa',
    title: 'Acta Administrativa de Hechos e Investigación Laboral',
    description: 'Acta circunstanciada conforme al Art. 47 LFT con comparecencia patronal, dos testigos y garantía de audiencia.',
    prompt: 'Acta administrativa circunstanciada de investigación de faltas laborales conforme al artículo 47 de la Ley Federal del Trabajo, haciendo constar lugar, fecha y hora de levantamiento, comparecencia de la representación patronal, dos testigos de cargo/asistencia, relación pormenorizada de hechos y evidencias (inasistencias, desobediencia o indisciplina), otorgamiento formal de garantía de audiencia y descargos al trabajador, y razón circunstanciada en caso de negativa a firmar.',
    fields: [
    { id: 'raz_n_social_del_patr_n', label: 'Razón social del patrón', type: 'text' },
    { id: 'trabajador_sujeto_a_investigaci_n', label: 'Trabajador sujeto a investigación', type: 'text' },
    { id: 'fecha_hora_y_lugar_del_levantamiento', label: 'Fecha, hora y lugar del levantamiento', type: 'text' },
    { id: 'relaci_n_circunstanciada_de_los_hechos_imputados', label: 'Relación circunstanciada de los hechos imputados', type: 'text' },
    { id: 'nombre_y_declaraci_n_de_2_testigos', label: 'Nombre y declaración de 2 testigos', type: 'text' },
    { id: 'manifestaci_n_y_descargos_del_trabajador', label: 'Manifestación y descargos del trabajador', type: 'text' }
  ],
    output: 'Acta administrativa formal de hechos laborales lista para firma o constancia de negativa.',
    intentGroup: 'Disciplina y cumplimiento',
  },
  {
    id: 'laboral-politica-prevencion-acoso',
    title: 'Protocolo de Prevención de Acoso y Factores de Riesgo (NOM-035)',
    description: 'Protocolo corporativo obligatorio contra violencia laboral, discriminación y factores psicosociales bajo la NOM-035-STPS-2018.',
    prompt: 'Protocolo institucional y política corporativa para la prevención de factores de riesgo psicosocial, prevención de violencia laboral, hostigamiento sexual y no discriminación en el centro de trabajo, en estricto cumplimiento de la NOM-035-STPS-2018 y el artículo 132 fracción XXXI Bis de la LFT, estableciendo principios rectores, buzón de denuncia confidencial, Comité de Ética y Atención, protocolo de investigación confidencial y política de cero represalias.',
    fields: [
    { id: 'raz_n_social_y_centros_de_trabajo', label: 'Razón social y centros de trabajo', type: 'text' },
    { id: 'integrantes_del_comit_de_tica_y_atenci_n', label: 'Integrantes del Comité de Ética y Atención', type: 'text' },
    { id: 'canal_o_buz_n_confidencial_de_denuncia', label: 'Canal o buzón confidencial de denuncia', type: 'text' },
    { id: 'procedimiento_de_investigaci_n_y_medidas_de_protecci_n', label: 'Procedimiento de investigación y medidas de protección', type: 'text' }
  ],
    output: 'Protocolo normativo institucional de cumplimiento NOM-035 y prevención de violencia laboral.',
    intentGroup: 'Disciplina y cumplimiento',
  },
];

// ── Comercio Exterior Drafting Templates ──────────────────
export const COMERCIO_EXTERIOR_DRAFTING_TEMPLATES: DraftingTemplate[] = [
  {
    id: 'comercio_exterior-compraventa-internacional',
    title: 'Compraventa Internacional de Mercancías (CISG / Incoterms® 2020)',
    description: 'Contrato bajo Convención de Viena (CISG), Incoterms 2020, pago internacional, inspección y arbitraje comercial.',
    prompt: 'Contrato formal de compraventa internacional de mercancías conforme a la Convención de las Naciones Unidas sobre los Contratos de Compraventa Internacional de Mercaderías (CISG) e Incoterms® 2020 de la CCI, con especificaciones de producto, fracción arancelaria tentativa, puerto o punto de entrega convenido, distribución de costos y riesgos aduaneros, forma de pago internacional (carta de crédito irrevocable y confirmada o SWIFT), inspección previa de calidad, póliza de seguro de transporte y cláusula de solución de controversias mediante arbitraje de la Cámara de Comercio Internacional (CCI).',
    fields: [
    { id: 'vendedor_exportador_pa_s', label: 'Vendedor / Exportador (País)', type: 'text' },
    { id: 'comprador_importador_pa_s', label: 'Comprador / Importador (País)', type: 'text' },
    { id: 'descripci_n_y_especificaciones_de_las_mercanc_as', label: 'Descripción y especificaciones de las mercancías', type: 'text' },
    { id: 'regla_incoterms_2020_aplicable_fob_cif_dap_ddp_etc', label: 'Regla Incoterms® 2020 aplicable (FOB, CIF, DAP, DDP, etc.)', type: 'text' },
    { id: 'puerto_o_lugar_convenido_de_entrega', label: 'Puerto o lugar convenido de entrega', type: 'text' },
    { id: 'precio_unitario_total_y_moneda_usd_eur', label: 'Precio unitario, total y moneda (USD/EUR)', type: 'text' },
    { id: 'forma_y_medios_de_pago_internacional', label: 'Forma y medios de pago internacional', type: 'text' },
    { id: 'documentos_de_embarque_y_aduaneros_exigidos', label: 'Documentos de embarque y aduaneros exigidos', type: 'text' }
  ],
    output: 'Contrato formal de compraventa internacional con cláusulas CISG e Incoterms 2020.',
    intentGroup: 'Importar / Exportar',
  },
  {
    id: 'comercio_exterior-distribucion-internacional',
    title: 'Distribución Internacional de Productos',
    description: 'Acuerdo de distribución internacional bajo Principios UNIDROIT con territorio, cuotas mínimas anuales y propiedad industrial.',
    prompt: 'Contrato de distribución comercial internacional conforme a los Principios UNIDROIT sobre Contratos Comerciales Internacionales y Reglas Incoterms® 2020, estipulando delimitación de territorio extranjero o nacional asignado, régimen de exclusividad, cuotas mínimas anuales de compra (minimum purchase targets), colocación de pedidos, cumplimiento de normativas de etiquetado y registros sanitarios locales, protección de marcas y arbitraje internacional.',
    fields: [
    { id: 'principal_fabricante_pa_s', label: 'Principal / Fabricante (País)', type: 'text' },
    { id: 'distribuidor_exclusivo_no_exclusivo_pa_s', label: 'Distribuidor exclusivo / no exclusivo (País)', type: 'text' },
    { id: 'productos_y_marcas_objeto_de_distribuci_n', label: 'Productos y marcas objeto de distribución', type: 'text' },
    { id: 'territorio_geogr_fico_asignado', label: 'Territorio geográfico asignado', type: 'text' },
    { id: 'volumen_o_cuota_m_nima_anual_de_compra', label: 'Volumen o cuota mínima anual de compra', type: 'text' },
    { id: 'condiciones_de_suministro_e_incoterm_2020', label: 'Condiciones de suministro e Incoterm 2020', type: 'text' },
    { id: 'vigencia', label: 'Vigencia', type: 'text' }
  ],
    output: 'Contrato formal de distribución comercial internacional con cláusulas UNIDROIT.',
    intentGroup: 'Distribuir mercancías',
  },
  {
    id: 'comercio_exterior-aviso-privacidad',
    title: 'Aviso de Privacidad (Comercio Exterior y Aduanas)',
    description: 'Aviso de privacidad conforme a la LFPDPPP para operaciones aduaneras, despacho, logística internacional y fiscalización.',
    prompt: 'Aviso de Privacidad integral para operaciones de comercio exterior, despacho aduanero y logística internacional conforme a la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP), con detalle del responsable del tratamiento, finalidades primarias (despacho aduanero, elaboración de pedimentos, trámites ante SAT y ANAM, logística y facturación), transferencias a autoridades aduaneras y prestadores de servicios, y procedimiento para el ejercicio de derechos ARCO.',
    fields: [
    { id: 'responsable_raz_n_social', label: 'Responsable / Razón Social', type: 'text' },
    { id: 'domicilio_fiscal_y_correo_electr_nico_de_contacto', label: 'Domicilio fiscal y correo electrónico de contacto', type: 'text' },
    { id: 'finalidades_primarias_y_secundarias_del_tratamiento', label: 'Finalidades primarias y secundarias del tratamiento', type: 'text' },
    { id: 'categor_as_de_datos_recabados_personales_fiscales_y_aduaneros', label: 'Categorías de datos recabados (personales, fiscales y aduaneros)', type: 'text' },
    { id: 'transferencias_previstas_a_autoridades_y_auxiliares', label: 'Transferencias previstas a autoridades y auxiliares', type: 'text' },
    { id: 'procedimiento_para_derechos_arco', label: 'Procedimiento para Derechos ARCO', type: 'text' }
  ],
    output: 'Aviso de privacidad estructurado para operaciones de comercio exterior y aduanas.',
    intentGroup: 'Preparar operación',
  },
  {
    id: 'comercio_exterior-poder-especial-aduanero',
    title: 'Poder Especial para Comercio Exterior y Despacho Aduanero',
    description: 'Poder especial para representación en trámites aduanales, despachos de importación/exportación, pedimentos y permisos ante SAT/ANAM.',
    prompt: 'Poder especial para actos de comercio exterior y aduaneros conforme al Código Civil Federal, Ley Aduanera y Código Fiscal de la Federación, con facultades expresas para realizar despachos de importación y exportación, tramitar pedimentos ante la ANAM y el SAT, contratar agentes aduanales autorizados, gestionar avisos automáticos y permisos ante la Secretaría de Economía, y efectuar pagos de contribuciones aduaneras, con delimitación de limitaciones expresas.',
    fields: [
    { id: 'poderdante_empresa_representante_legal', label: 'Poderdante (Empresa / Representante Legal)', type: 'text' },
    { id: 'apoderado_designado', label: 'Apoderado designado', type: 'text' },
    { id: 'facultades_aduaneras_conferidas_despacho_pedimentos_permisos', label: 'Facultades aduaneras conferidas (despacho, pedimentos, permisos)', type: 'text' },
    { id: 'autoridades_aduaneras_y_fiscales_competentes_sat_anam', label: 'Autoridades aduaneras y fiscales competentes (SAT, ANAM)', type: 'text' },
    { id: 'limitaciones_expresas', label: 'Limitaciones expresas', type: 'text' },
    { id: 'vigencia', label: 'Vigencia', type: 'text' }
  ],
    output: 'Poder especial formal para representación en comercio exterior y trámites aduanales.',
    intentGroup: 'Coordinar despacho',
  },
  {
    id: 'comercio_exterior-checklist-importacion',
    title: 'Checklist Operativo y Matriz Documental de Importación Definitiva',
    description: 'Matriz de control documental y regulatorio previo al despacho bajo los Arts. 36, 36-A y 59 de la Ley Aduanera.',
    prompt: 'Checklist operativo y matriz documental de validación previa al despacho aduanero para importación definitiva (Clave A1) conforme a los artículos 36, 36-A y 59 de la Ley Aduanera, verificando factura comercial, packing list, conocimiento de embarque (BL) o guía aérea, certificado de origen para preferencias arancelarias (T-MEC, TLCUEM, etc.), cumplimiento de Regulaciones y Restricciones No Arancelarias (RRNA), hojas de seguridad (MSDS en químicos) y comprobación de pago del pedimento.',
    fields: [
    { id: 'empresa_importadora_y_rfc_con_padr_n_activo', label: 'Empresa importadora y RFC con Padrón activo', type: 'text' },
    { id: 'proveedor_extranjero_y_pa_s_de_procedencia', label: 'Proveedor extranjero y país de procedencia', type: 'text' },
    { id: 'descripci_n_t_cnica_de_mercanc_a_y_fracci_n_arancelaria', label: 'Descripción técnica de mercancía y fracción arancelaria', type: 'text' },
    { id: 'regla_incoterms_2020_convenida', label: 'Regla Incoterms® 2020 convenida', type: 'text' },
    { id: 'aduana_de_despacho_y_patente_de_agente_aduanal', label: 'Aduana de despacho y patente de agente aduanal', type: 'text' },
    { id: 'r_gimen_aduanero_solicitado', label: 'Régimen aduanero solicitado', type: 'text' }
  ],
    output: 'Matriz documental de control y validación de importación aduanera.',
    intentGroup: 'Preparar operación',
  },
  {
    id: 'comercio_exterior-carta-instrucciones',
    title: 'Carta Formal de Instrucciones al Agente Aduanal',
    description: 'Carta de encomienda e instrucciones operativas para despacho aduanero conforme al Art. 59 de la Ley Aduanera.',
    prompt: 'Carta formal de encomienda e instrucciones al Agente Aduanal conforme al artículo 59 fracción III de la Ley Aduanera, detallando datos del importador/exportador, número de patente aduanal, aduana y sección aduanera, descripción arancelaria de las mercancías, valor comercial y valor en aduana, desglose de gastos incrementables (fletes, seguros), régimen aduanero solicitado, documentos soporte digitalizados anexos y contacto operativo responsable.',
    fields: [
    { id: 'importador_exportador_y_rfc', label: 'Importador / Exportador y RFC', type: 'text' },
    { id: 'agente_aduanal_y_patente', label: 'Agente Aduanal y Patente', type: 'text' },
    { id: 'aduana_de_entrada_salida', label: 'Aduana de entrada / salida', type: 'text' },
    { id: 'r_gimen_aduanero_solicitado_a1_in_etc', label: 'Régimen aduanero solicitado (A1, IN, etc.)', type: 'text' },
    { id: 'descripci_n_de_mercanc_as_y_fracci_n_arancelaria', label: 'Descripción de mercancías y fracción arancelaria', type: 'text' },
    { id: 'valor_comercial_moneda_e_incoterm', label: 'Valor comercial, moneda e Incoterm', type: 'text' },
    { id: 'gastos_incrementables_flete_seguro', label: 'Gastos incrementables (flete, seguro)', type: 'text' },
    { id: 'relaci_n_de_documentos_anexos', label: 'Relación de documentos anexos', type: 'text' }
  ],
    output: 'Carta formal de instrucciones aduaneras para revisión y firma de la empresa.',
    intentGroup: 'Coordinar despacho',
  },
  {
    id: 'comercio_exterior-contrato-flete-internacional',
    title: 'Contrato de Transporte Internacional y Logística (Freight Forwarder)',
    description: 'Contrato de servicios logísticos y transporte internacional de carga con delimitación de demoras, seguros y responsabilidades.',
    prompt: 'Contrato de prestación de servicios logísticos, transporte internacional de carga y agente de carga (Freight Forwarder), estipulando rutas de origen y destino, modalidades de transporte (marítimo, aéreo, terrestre multimodal), tarifas y gastos locales, régimen de demoras y detenciones de contenedores (demurrage & detention), póliza de seguro de transporte de mercancías, límites de responsabilidad y jurisdicción.',
    fields: [
    { id: 'usuario_embarcador_shipper', label: 'Usuario / Embarcador (Shipper)', type: 'text' },
    { id: 'freight_forwarder_agente_de_carga', label: 'Freight Forwarder / Agente de Carga', type: 'text' },
    { id: 'ruta_origen_puerto_de_embarque_puerto_de_arribo_destino_final', label: 'Ruta (origen, puerto de embarque, puerto de arribo, destino final)', type: 'text' },
    { id: 'modalidad_de_transporte_y_condiciones_de_servicio', label: 'Modalidad de transporte y condiciones de servicio', type: 'text' },
    { id: 'tarifas_de_flete_recargos_y_demoras', label: 'Tarifas de flete, recargos y demoras', type: 'text' },
    { id: 'p_liza_de_seguro_y_cobertura', label: 'Póliza de seguro y cobertura', type: 'text' },
    { id: 'l_mites_de_responsabilidad', label: 'Límites de responsabilidad', type: 'text' }
  ],
    output: 'Contrato formal de servicios logísticos y transporte internacional de carga.',
    intentGroup: 'Coordinar despacho',
  },
];

// ── Aduanal Drafting Templates ────────────────────────────
export const ADUANAL_DRAFTING_TEMPLATES: DraftingTemplate[] = [
  {
    id: 'aduanal-prestacion-servicios-agente-aduanal',
    title: 'Prestación de Servicios de Agente Aduanal y Carta Encomienda',
    description: 'Contrato de servicios aduanales y carta encomienda bajo los Arts. 35, 36, 40, 59 y 159 de la Ley Aduanera.',
    prompt: 'Contrato formal de prestación de servicios profesionales de agente aduanal y carta encomienda conforme a los artículos 35, 36, 40, 59 fracción III, 159, 160 y 162 de la Ley Aduanera, con designación expresa de número de patente aduanal y aduanas de adscripción/autorizadas, facultades para despacho de importación y exportación, clasificación arancelaria y determinación de contribuciones, honorarios y gastos complementarios de maniobras, provisión de fondos y cuenta de anticipos, y delimitación de responsabilidades de ambas partes.',
    fields: [
    { id: 'agente_aduanal_y_n_mero_de_patente_aduanal', label: 'Agente Aduanal y Número de Patente Aduanal', type: 'text' },
    { id: 'cliente_importador_exportador_y_rfc', label: 'Cliente / Importador / Exportador y RFC', type: 'text' },
    { id: 'aduana_de_despacho_y_aduanas_autorizadas', label: 'Aduana de despacho y aduanas autorizadas', type: 'text' },
    { id: 'descripci_n_general_de_operaciones_y_mercanc_as', label: 'Descripción general de operaciones y mercancías', type: 'text' },
    { id: 'honorarios_tarifas_de_maniobras_y_cuenta_de_anticipo', label: 'Honorarios, tarifas de maniobras y cuenta de anticipo', type: 'text' },
    { id: 'obligaciones_y_delimitaci_n_de_responsabilidad', label: 'Obligaciones y delimitación de responsabilidad', type: 'text' }
  ],
    output: 'Contrato formal de servicios aduanales con carta encomienda para trámites de comercio exterior.',
    intentGroup: 'Atender autoridad',
  },
  {
    id: 'aduanal-poder-especial-aduanas',
    title: 'Poder Especial para Representación y Despacho Aduanal',
    description: 'Poder especial para trámites ante la ANAM/SAT, tramitación y firma de pedimentos y promociones aduanales.',
    prompt: 'Poder especial para actos aduaneros y representación legal ante la Agencia Nacional de Aduanas de México (ANAM) y el Servicio de Administración Tributaria (SAT), confiriendo facultades expresas para realizar trámites de despacho aduanero, suscribir pedimentos, promover rectificaciones, conferir encargos a agentes aduanales, tramitar permisos y certificados de importación/exportación y formular promociones con delimitación expresa de límites.',
    fields: [
    { id: 'poderdante_empresa_importador', label: 'Poderdante (Empresa / Importador)', type: 'text' },
    { id: 'apoderado_designado', label: 'Apoderado designado', type: 'text' },
    { id: 'aduanas_y_patentes_de_actuaci_n', label: 'Aduanas y patentes de actuación', type: 'text' },
    { id: 'facultades_aduaneras_conferidas_despacho_pedimentos_promociones', label: 'Facultades aduaneras conferidas (despacho, pedimentos, promociones)', type: 'text' },
    { id: 'autoridades_aduaneras_competentes_anam_sat', label: 'Autoridades aduaneras competentes (ANAM, SAT)', type: 'text' },
    { id: 'limitaciones_expresas', label: 'Limitaciones expresas', type: 'text' }
  ],
    output: 'Instrumento de poder especial para representación aduanal y gestión de pedimentos.',
    intentGroup: 'Atender autoridad',
  },
  {
    id: 'aduanal-aviso-privacidad',
    title: 'Aviso de Privacidad (Agencia Aduanal)',
    description: 'Aviso de privacidad conforme a la LFPDPPP para agencias aduanales, clientes, operadores y trámites fiscales/aduanales.',
    prompt: 'Aviso de Privacidad integral para agencia aduanal conforme a la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP), detallando finalidades primarias (elaboración de pedimentos, despacho aduanero, facturación y archivo digital aduanero), datos patrimoniales y fiscales tratados, transferencias a autoridades (SAT, ANAM) y procedimiento para ejercicio de derechos ARCO.',
    fields: [
    { id: 'raz_n_social_de_la_agencia_aduanal', label: 'Razón Social de la Agencia Aduanal', type: 'text' },
    { id: 'domicilio_fiscal_y_correo_de_atenci_n_arco', label: 'Domicilio fiscal y correo de atención ARCO', type: 'text' },
    { id: 'finalidades_primarias_del_tratamiento_aduanero', label: 'Finalidades primarias del tratamiento aduanero', type: 'text' },
    { id: 'datos_personales_fiscales_y_patrimoniales_recabados', label: 'Datos personales, fiscales y patrimoniales recabados', type: 'text' },
    { id: 'transferencias_legales_previstas', label: 'Transferencias legales previstas', type: 'text' },
    { id: 'medidas_de_seguridad_y_plazos_de_conservaci_n', label: 'Medidas de seguridad y plazos de conservación', type: 'text' }
  ],
    output: 'Aviso de privacidad integral para agencias y trámites aduanales.',
    intentGroup: 'Integrar expediente',
  },
  {
    id: 'aduanal-expediente-pedimento',
    title: 'Índice y Control de Integración del Expediente Digital de Pedimento',
    description: 'Matriz de control y custodia del expediente digital aduanero por 5 años bajo el Art. 59 de la Ley Aduanera y Art. 30 CFF.',
    prompt: 'Índice y protocolo de control para la integración y custodia del expediente digital aduanero de pedimento conforme al artículo 59 fracción V de la Ley Aduanera, artículo 81 del Reglamento de la Ley Aduanera y artículo 30 del Código Fiscal de la Federación (conservación por 5 años), clasificando documentos comerciales, de transporte, valor en aduana, regulaciones no arancelarias, comprobantes de pago de contribuciones y validación de semáforo fiscal.',
    fields: [
    { id: 'n_mero_de_pedimento_15_d_gitos', label: 'Número de Pedimento (15 dígitos)', type: 'text' },
    { id: 'clave_de_r_gimen_y_tipo_de_operaci_n_a1_in_etc', label: 'Clave de Régimen y Tipo de Operación (A1, IN, etc.)', type: 'text' },
    { id: 'aduana_y_secci_n_aduanera', label: 'Aduana y Sección Aduanera', type: 'text' },
    { id: 'importador_exportador_y_rfc', label: 'Importador / Exportador y RFC', type: 'text' },
    { id: 'relaci_n_de_documentos_digitalizados_disponibles', label: 'Relación de documentos digitalizados disponibles', type: 'text' },
    { id: 'estatus_de_validaci_n_y_responsable_de_custodia', label: 'Estatus de validación y responsable de custodia', type: 'text' }
  ],
    output: 'Índice y matriz de integración digital del expediente aduanero con control de faltantes.',
    intentGroup: 'Integrar expediente',
  },
  {
    id: 'aduanal-manifestacion-valor',
    title: 'Manifestación de Valor en Aduana y Soporte Documental',
    description: 'Manifestación de valor bajo los Arts. 59 fracc. III y 64 a 78 de la Ley Aduanera con desglose de incrementables.',
    prompt: 'Borrador estructurado de manifestación de valor en aduana y expediente de soporte documental conforme a los artículos 59 fracción III, 64 a 78 de la Ley Aduanera, artículos 110 a 112 del Reglamento de la Ley Aduanera y Anexo 22 de las RGCE, declarando método de valoración (Valor de Transacción u otros), relación comercial o vinculación que afecte el precio, desglose de precio pagado o por pagar, desglose de gastos incrementables (fletes, seguros, embalajes, comisiones) y no incrementables.',
    fields: [
    { id: 'importador_y_rfc', label: 'Importador y RFC', type: 'text' },
    { id: 'proveedor_vendedor_en_el_extranjero', label: 'Proveedor / Vendedor en el extranjero', type: 'text' },
    { id: 'm_todo_de_valoraci_n_aduanera_aplicado', label: 'Método de valoración aduanera aplicado', type: 'text' },
    { id: 'precio_pagado_o_por_pagar_factura_y_moneda', label: 'Precio pagado o por pagar (factura y moneda)', type: 'text' },
    { id: 'desglose_de_gastos_incrementables_flete_seguro_embalaje', label: 'Desglose de gastos incrementables (flete, seguro, embalaje)', type: 'text' },
    { id: 'existencia_de_vinculaci_n_entre_las_partes', label: 'Existencia de vinculación entre las partes', type: 'text' },
    { id: 'documentos_soporte_adjuntos', label: 'Documentos soporte adjuntos', type: 'text' }
  ],
    output: 'Borrador técnico de manifestación de valor en aduana y cédula de soporte de incrementables.',
    intentGroup: 'Soportar valor',
  },
  {
    id: 'aduanal-rectificacion-pedimento',
    title: 'Solicitud y Dictamen de Rectificación de Pedimento (Clave R1)',
    description: 'Escrito técnico y justificación de rectificación de pedimento bajo el Art. 89 de la Ley Aduanera y Anexo 22 RGCE.',
    prompt: 'Solicitud técnica y memorándum de rectificación de pedimento con clave R1 conforme al artículo 89 de la Ley Aduanera y Reglas Generales de Comercio Exterior, identificando número y fecha del pedimento original, patente y aduana, descripción del campo o dato inexacto, dato correcto que debe asentarse, causa y justificación técnica del error, documentación soporte probatoria y acreditación de no encontrarse bajo facultades de comprobación.',
    fields: [
    { id: 'pedimento_original_y_fecha_de_pago', label: 'Pedimento original y fecha de pago', type: 'text' },
    { id: 'patente_aduanal_y_aduana_de_despacho', label: 'Patente aduanal y aduana de despacho', type: 'text' },
    { id: 'campo_o_bloque_espec_fico_a_rectificar', label: 'Campo o bloque específico a rectificar', type: 'text' },
    { id: 'dato_original_declarado_vs_dato_correcto_a_asentar', label: 'Dato original declarado vs. Dato correcto a asentar', type: 'text' },
    { id: 'causa_o_justificaci_n_t_cnica_del_error', label: 'Causa o justificación técnica del error', type: 'text' },
    { id: 'documentos_probatorios_de_soporte', label: 'Documentos probatorios de soporte', type: 'text' }
  ],
    output: 'Escrito técnico de solicitud y fundamentación de rectificación de pedimento Clave R1.',
    intentGroup: 'Corregir operación',
  },
  {
    id: 'aduanal-respuesta-requerimiento',
    title: 'Contestación a Requerimiento e Incidencias Aduanales (PAMA)',
    description: 'Escrito formal de contestación y ofrecimiento de pruebas ante inicio de PAMA o incidencias bajo los Arts. 150-155 Ley Aduanera.',
    prompt: 'Escrito libre formal de contestación a acta de inicio del Procedimiento Administrativo en Materia Aduanera (PAMA) o acta de irregularidades aduaneras conforme a los artículos 150 a 155 de la Ley Aduanera y Código Fiscal de la Federación, desvirtuando irregularidades señaladas por la autoridad, formulando descargos punto por punto, ofreciendo pruebas documentales y periciales en derecho, y expresando puntos petitorios claros.',
    fields: [
    { id: 'autoridad_aduanera_destinataria_aduana_anam_sat', label: 'Autoridad aduanera destinataria (Aduana / ANAM / SAT)', type: 'text' },
    { id: 'contribuyente_importador_y_rfc', label: 'Contribuyente / Importador y RFC', type: 'text' },
    { id: 'n_mero_de_acta_de_embargo_pama_o_folio_de_requerimiento', label: 'Número de acta de embargo / PAMA o folio de requerimiento', type: 'text' },
    { id: 'contestaci_n_y_descargos_circunstanciados_a_cada_irregularidad', label: 'Contestación y descargos circunstanciados a cada irregularidad', type: 'text' },
    { id: 'cap_tulo_de_pruebas_documentales', label: 'Capítulo de pruebas documentales', type: 'text' },
    { id: 'puntos_petitorios', label: 'Puntos petitorios', type: 'text' }
  ],
    output: 'Escrito formal de contestación y desahogo de pruebas en procedimiento aduanero.',
    intentGroup: 'Atender autoridad',
  },
  {
    id: 'aduanal-anexo-24-22-control',
    title: 'Protocolo de Auditoría y Control de Inventarios IMMEX (Anexos 24 y 22 RGCE)',
    description: 'Protocolo de control de inventarios automatizados IMMEX, plazos de retorno y descargos bajo los Arts. 59 y 108 de la Ley Aduanera.',
    prompt: 'Protocolo de auditoría preventiva interna y control del sistema automatizado de control de inventarios para empresas con Programa IMMEX conforme al artículo 59 fracción I y artículo 108 de la Ley Aduanera y Anexos 24 y 22 de las RGCE, estructurando matriz de verificación de entradas temporales (clave IN), descargos por exportación (clave H1/RT), mermas y desperdicios, saldos pendientes y control de plazos legales de permanencia de 18 meses.',
    fields: [
    { id: 'raz_n_social_de_la_empresa_immex_y_n_mero_de_programa', label: 'Razón Social de la empresa IMMEX y número de programa', type: 'text' },
    { id: 'per_odo_fiscal_auditado', label: 'Período fiscal auditado', type: 'text' },
    { id: 'materia_prima_e_insumos_importados_temporalmente', label: 'Materia prima e insumos importados temporalmente', type: 'text' },
    { id: 'relaci_n_de_pedimentos_de_importaci_n_temporal_in_y_retorno_h1', label: 'Relación de pedimentos de importación temporal (IN) y retorno (H1)', type: 'text' },
    { id: 'saldos_vivos_y_c_lculo_de_plazos_de_permanencia', label: 'Saldos vivos y cálculo de plazos de permanencia', type: 'text' },
    { id: 'hallazgos_y_acciones_preventivas', label: 'Hallazgos y acciones preventivas', type: 'text' }
  ],
    output: 'Protocolo y cédula de auditoría de control de inventarios automatizados IMMEX Anexo 24.',
    intentGroup: 'Integrar expediente',
  },
];

// ── Fiscal y Patrimonial Legal Templates ──────────────────
export const FISCAL_DRAFTING_TEMPLATES: DraftingTemplate[] = [
  {
    id: 'fiscal-prestacion-servicios',
    title: 'Prestación de Servicios Profesionales con Blindaje de Materialidad Fiscal',
    description: 'Contrato de servicios con soporte de materialidad, razón de negocios, entregables tangibles y CFDI 4.0 bajo los Arts. 5-A y 69-B CFF.',
    prompt: 'Contrato formal de prestación de servicios profesionales independientes con estricto blindaje de materialidad fiscal y razón de negocios conforme a los artículos 5-A y 69-B del Código Fiscal de la Federación, artículo 27 fracción I de la Ley del Impuesto sobre la Renta (LISR) y artículo 5 fracción I de la Ley del IVA (LIVA), estipulando delimitación técnica de entregables verificables y fechados, bitácoras de trabajo, emisión de CFDI 4.0 con clave SAT correcta, retenciones aplicables de ISR e IVA, deslinde de subordinación laboral y fecha cierta.',
    fields: [
    { id: 'prestador_del_servicio_y_rfc', label: 'Prestador del Servicio y RFC', type: 'text' },
    { id: 'cliente_y_rfc', label: 'Cliente y RFC', type: 'text' },
    { id: 'descripci_n_detallada_de_servicios_y_entregables_tangibles', label: 'Descripción detallada de servicios y entregables tangibles', type: 'text' },
    { id: 'honorarios_iva_y_retenciones_aplicables', label: 'Honorarios, IVA y retenciones aplicables', type: 'text' },
    { id: 'forma_de_pago_bancarizada_spei_y_requisitos_de_cfdi_4_0', label: 'Forma de pago bancarizada (SPEI) y requisitos de CFDI 4.0', type: 'text' },
    { id: 'calendario_y_mecanismo_de_comprobaci_n_de_materialidad', label: 'Calendario y mecanismo de comprobación de materialidad', type: 'text' },
    { id: 'vigencia', label: 'Vigencia', type: 'text' }
  ],
    output: 'Contrato formal de prestación de servicios con cláusulas de materialidad fiscal y razón de negocios.',
    intentGroup: 'Contratar / Operar',
  },
  {
    id: 'fiscal-mutuo-interes',
    title: 'Contrato de Mutuo con Interés y Trazabilidad Bancaria',
    description: 'Préstamo dinerario con soporte de origen y destino de recursos, retenciones y pagaré anexo bajo el Art. 166 LISR.',
    prompt: 'Contrato de mutuo con interés y trazabilidad patrimonial conforme a los artículos 2384 del Código Civil Federal, 76 fracción XVI y 166 de la LISR y LFPIORPI, estipulando capital mutuado, transferencia bancaria verificable (SPEI / cheque nominativo), tasa de interés fija anual, retención del 20% de ISR sobre intereses devengados (en personas físicas), calendario de amortización, destino corporativo lícito de los fondos y pagaré ejecutivo anexo.',
    fields: [
    { id: 'mutuante_prestamista_y_rfc', label: 'Mutuante / Prestamista y RFC', type: 'text' },
    { id: 'mutuario_prestatario_y_rfc', label: 'Mutuario / Prestatario y RFC', type: 'text' },
    { id: 'monto_prestado_y_comprobante_de_transferencia_bancaria', label: 'Monto prestado y comprobante de transferencia bancaria', type: 'text' },
    { id: 'tasa_de_inter_s_anual_pactada', label: 'Tasa de interés anual pactada', type: 'text' },
    { id: 'plazo_calendario_de_pagos_y_cuenta_bancaria', label: 'Plazo, calendario de pagos y cuenta bancaria', type: 'text' },
    { id: 'retenci_n_fiscal_de_isr_sobre_intereses', label: 'Retención fiscal de ISR sobre intereses', type: 'text' },
    { id: 'garant_a_o_pagar_anexo', label: 'Garantía o pagaré anexo', type: 'text' }
  ],
    output: 'Contrato formal de mutuo con pagaré mercantil anexo y blindaje de trazabilidad financiera.',
    intentGroup: 'Garantizar / Cobrar',
  },
  {
    id: 'fiscal-reconocimiento-adeudo',
    title: 'Reconocimiento de Adeudo, Reestructuración y Plan de Pagos',
    description: 'Convenio de reestructuración de saldos con emisión de CFDI de pago y vencimiento anticipado bajo el Art. 27 LISR.',
    prompt: 'Convenio formal de reconocimiento de adeudo, reestructuración y compromiso de pago en parcialidades conforme al Código Fiscal de la Federación y artículo 27 fracción XV de la LISR, con liquidación de obligaciones comerciales preexistentes, emisión de CFDI con Complemento de Recepción de Pagos por cada abono, intereses moratorios, cláusula de aceleración o vencimiento anticipado por impago y sumisión expresa ejecutiva.',
    fields: [
    { id: 'acreedor_y_rfc', label: 'Acreedor y RFC', type: 'text' },
    { id: 'deudor_y_rfc', label: 'Deudor y RFC', type: 'text' },
    { id: 'saldo_total_l_quido_reconocido_y_origen_contractual_fiscal', label: 'Saldo total líquido reconocido y origen contractual/fiscal', type: 'text' },
    { id: 'calendario_detallado_de_parcialidades_y_montos', label: 'Calendario detallado de parcialidades y montos', type: 'text' },
    { id: 'tasa_de_inter_s_moratorio', label: 'Tasa de interés moratorio', type: 'text' },
    { id: 'causas_de_vencimiento_anticipado', label: 'Causas de vencimiento anticipado', type: 'text' }
  ],
    output: 'Convenio formal de reconocimiento de adeudo con fuerza ejecutiva y plan de parcialidades.',
    intentGroup: 'Garantizar / Cobrar',
  },
  {
    id: 'fiscal-escrito-aclaracion',
    title: 'Escrito Libre de Aclaración y Solventación ante el SAT',
    description: 'Escrito formal para contestar cartas invitación, requerimientos o inconsistencias fiscales bajo los Arts. 18, 18-A y 33 CFF.',
    prompt: 'Escrito libre formal de aclaración y solventación tributaria dirigido a la Administración Desconcentrada del Servicio de Administración Tributaria (SAT) conforme a los artículos 18, 18-A y 33 fracción III del Código Fiscal de la Federación, desvirtuando presuntas omisiones o diferencias en ingresos, retenciones o deducciones señaladas en cartas invitación o requerimientos, con relación pormenorizada de hechos, capítulo de pruebas documentales (CFDI, pólizas, estados de cuenta bancarios) y puntos petitorios.',
    fields: [
    { id: 'autoridad_recaudadora_administrador_desconcentrado_sat', label: 'Autoridad recaudadora / Administrador Desconcentrado SAT', type: 'text' },
    { id: 'contribuyente_promovente_rfc_y_domicilio_fiscal', label: 'Contribuyente promovente, RFC y domicilio fiscal', type: 'text' },
    { id: 'folio_de_carta_invitaci_n_o_n_mero_de_requerimiento', label: 'Folio de carta invitación o número de requerimiento', type: 'text' },
    { id: 'aclaraci_n_circunstanciada_de_diferencias_o_ingresos', label: 'Aclaración circunstanciada de diferencias o ingresos', type: 'text' },
    { id: 'relaci_n_de_pruebas_documentales_adjuntas', label: 'Relación de pruebas documentales adjuntas', type: 'text' },
    { id: 'puntos_petitorios', label: 'Puntos petitorios', type: 'text' }
  ],
    output: 'Escrito legal formal de aclaración tributaria con fundamentación y pruebas.',
    intentGroup: 'Contestar / Aclarar',
  },
  {
    id: 'fiscal-memo-analisis',
    title: 'Dictamen Técnico y Memorándum de Análisis Jurídico-Fiscal',
    description: 'Dictamen de auditoría y evaluación de riesgos tributarios, materialidad, deducibilidad y defense file.',
    prompt: 'Dictamen técnico y memorándum de análisis jurídico-fiscal para evaluar la viabilidad, riesgos de recalificación (Art. 5-A CFF), operaciones inexistentes (Art. 69-B CFF), deducibilidad en ISR y acreditamiento de IVA de una operación corporativa o contractual, analizando antecedentes, marco legal aplicable, matriz de riesgos identificados, conclusiones técnico-jurídicas y recomendaciones estratégicas de integración de expediente de defensa (defense file).',
    fields: [
    { id: 'empresa_contribuyente_analizado', label: 'Empresa / Contribuyente analizado', type: 'text' },
    { id: 'operaci_n_o_contrato_objeto_de_dictamen', label: 'Operación o contrato objeto de dictamen', type: 'text' },
    { id: 'antecedentes_f_cticos_y_flujo_financiero', label: 'Antecedentes fácticos y flujo financiero', type: 'text' },
    { id: 'marco_normativo_federal_aplicable_cff_lisr_liva', label: 'Marco normativo federal aplicable (CFF, LISR, LIVA)', type: 'text' },
    { id: 'conclusiones_y_matriz_de_riesgos_fiscales', label: 'Conclusiones y matriz de riesgos fiscales', type: 'text' },
    { id: 'recomendaciones_de_blindaje_probatorio', label: 'Recomendaciones de blindaje probatorio', type: 'text' }
  ],
    output: 'Dictamen jurídico-fiscal estructurado con antecedentes, análisis de fondo y recomendaciones preventivas.',
    intentGroup: 'Blindar / Dictaminar',
  },
  {
    id: 'fiscal-arrendamiento-inmueble',
    title: 'Arrendamiento de Inmueble Comercial con Cláusulas Fiscales',
    description: 'Arrendamiento comercial con retenciones de ISR e IVA, cuenta predial en CFDI y cláusula de extinción de dominio.',
    prompt: 'Contrato de arrendamiento de bien inmueble para uso comercial o corporativo conforme al Código Civil y Ley del Impuesto sobre la Renta (Art. 27 fracc. XVIII), estipulando renta mensual, desglose de IVA y retenciones de ISR e IVA cuando el arrendador sea persona física y el arrendatario persona moral, obligación de incluir el número de cuenta predial en el CFDI, depósito en garantía y cláusula blindada de deslinde bajo la Ley Nacional de Extinción de Dominio.',
    fields: [
    { id: 'arrendador_y_rfc', label: 'Arrendador y RFC', type: 'text' },
    { id: 'arrendatario_y_rfc', label: 'Arrendatario y RFC', type: 'text' },
    { id: 'ubicaci_n_exacta_del_inmueble_comercial', label: 'Ubicación exacta del inmueble comercial', type: 'text' },
    { id: 'renta_mensual_iva_y_retenciones_aplicables', label: 'Renta mensual, IVA y retenciones aplicables', type: 'text' },
    { id: 'n_mero_de_cuenta_predial_para_cfdi', label: 'Número de cuenta predial para CFDI', type: 'text' },
    { id: 'destino_comercial_autorizado', label: 'Destino comercial autorizado', type: 'text' },
    { id: 'dep_sito_en_garant_a_y_fiador', label: 'Depósito en garantía y fiador', type: 'text' }
  ],
    output: 'Contrato formal de arrendamiento comercial con cláusulas de cumplimiento fiscal y extinción de dominio.',
    intentGroup: 'Contratar / Operar',
  },
  {
    id: 'fiscal-comision-mercantil',
    title: 'Comisión Mercantil con Blindaje Fiscal y de Materialidad',
    description: 'Contrato de corretaje y comisión mercantil con comprobación mediante CFDI, entregables y no subordinación laboral.',
    prompt: 'Contrato de comisión mercantil conforme a los artículos 75 y 273 del Código de Comercio y artículo 27 de la LISR, estableciendo actos de comercio o corretaje encomendados, cálculo de comisión sobre ventas efectivamente cobradas, condición de pago contra entrega de CFDI con descripción detallada y reporte mensual de gestiones como soporte de materialidad, retenciones aplicables y deslinde de relación laboral.',
    fields: [
    { id: 'comitente_y_rfc', label: 'Comitente y RFC', type: 'text' },
    { id: 'comisionista_y_rfc', label: 'Comisionista y RFC', type: 'text' },
    { id: 'operaciones_y_ventas_encomendadas', label: 'Operaciones y ventas encomendadas', type: 'text' },
    { id: 'porcentaje_de_comisi_n_y_condici_n_de_devengo', label: 'Porcentaje de comisión y condición de devengo', type: 'text' },
    { id: 'requisitos_de_comprobaci_n_fiscal_cfdi_y_reporte_mensual', label: 'Requisitos de comprobación fiscal (CFDI y reporte mensual)', type: 'text' },
    { id: 'retenciones_de_isr_e_iva_aplicables', label: 'Retenciones de ISR e IVA aplicables', type: 'text' }
  ],
    output: 'Contrato formal de comisión mercantil con soporte documental de materialidad y CFDI.',
    intentGroup: 'Contratar / Operar',
  },
  {
    id: 'fiscal-convenio-dacion',
    title: 'Convenio de Dación en Pago de Bienes para Extinción de Obligaciones',
    description: 'Dación en pago con avalúo comercial fiscal, efectos de enajenación y finiquito de deudas bajo los Arts. 14 CFF y 2095 CCF.',
    prompt: 'Convenio de dación en pago de bienes muebles o inmuebles para la extinción de obligaciones comerciales conforme al artículo 2095 del Código Civil Federal, artículo 14 fracción I del Código Fiscal de la Federación (efectos de enajenación fiscal) y artículo 1-B de la Ley del IVA, determinando saldo insoluto a extinguir, descripción y avalúo comercial fiscal de los bienes entregados, traslado de dominio, liberación de gravámenes y otorgamiento de finiquito mutuo total.',
    fields: [
    { id: 'acreedor_y_rfc', label: 'Acreedor y RFC', type: 'text' },
    { id: 'deudor_y_rfc', label: 'Deudor y RFC', type: 'text' },
    { id: 'adeudo_l_quido_original_a_extinguir', label: 'Adeudo líquido original a extinguir', type: 'text' },
    { id: 'descripci_n_y_aval_o_pericial_de_bienes_entregados_en_pago', label: 'Descripción y avalúo pericial de bienes entregados en pago', type: 'text' },
    { id: 'fecha_y_lugar_de_entrega_material_y_jur_dica', label: 'Fecha y lugar de entrega material y jurídica', type: 'text' },
    { id: 'finiquito_y_liberaci_n_total_de_obligaciones', label: 'Finiquito y liberación total de obligaciones', type: 'text' }
  ],
    output: 'Convenio formal de dación en pago con avalúo y efectos fiscales de extinción de obligaciones.',
    intentGroup: 'Garantizar / Cobrar',
  },
  {
    id: 'fiscal-servicios-repse',
    title: 'Prestación de Servicios Especializados (Régimen REPSE)',
    description: 'Contrato de servicios especializados bajo los Arts. 13-15 LFT, 15-D CFF, 27 LISR y 5 LIVA con expediente mensual de cumplimiento.',
    prompt: 'Contrato de prestación de servicios especializados u obras especializadas en estricto cumplimiento de los artículos 13, 14 y 15 de la Ley Federal del Trabajo, artículo 15-D del Código Fiscal de la Federación, artículo 27 fracción V de la LISR y artículo 5 fracción II de la LIVA, estipulando acreditación de folio de registro REPSE vigente emitido por la STPS, delimitación de servicios que no forman parte del objeto social ni actividad económica preponderante del cliente, número de trabajadores asignados, y obligación mensual improrrogable de entrega de expediente de cumplimiento (CFDI nómina, SUA, SIPARE, declaraciones y enteros de retenciones SAT e IMSS).',
    fields: [
    { id: 'contratista_prestador_especializado_y_rfc', label: 'Contratista / Prestador Especializado y RFC', type: 'text' },
    { id: 'contratante_cliente_y_rfc', label: 'Contratante / Cliente y RFC', type: 'text' },
    { id: 'folio_de_registro_repse_vigente_y_fecha_de_renovaci_n', label: 'Folio de registro REPSE vigente y fecha de renovación', type: 'text' },
    { id: 'descripci_n_t_cnica_de_los_servicios_especializados_asignados', label: 'Descripción técnica de los servicios especializados asignados', type: 'text' },
    { id: 'manifestaci_n_de_no_formar_parte_del_objeto_social_preponderante_del_cliente', label: 'Manifestación de no formar parte del objeto social preponderante del cliente', type: 'text' },
    { id: 'n_mero_de_personal_asignado_y_matriz_mensual_de_entregables_sua_sipare_cfdi_n_mina', label: 'Número de personal asignado y matriz mensual de entregables (SUA, SIPARE, CFDI nómina)', type: 'text' }
  ],
    output: 'Contrato formal de servicios especializados con blindaje integral REPSE, fiscal y laboral.',
    intentGroup: 'Contratar / Operar',
  },
];

export type LegalEngineeringArea = 'mercantil' | 'laboral' | 'comercio_exterior' | 'aduanal' | 'fiscal';

export const LEGAL_ENGINEERING_TEMPLATES: Record<LegalEngineeringArea, DraftingTemplate[]> = {
  mercantil: MERCANTIL_DRAFTING_TEMPLATES,
  laboral: LABORAL_DRAFTING_TEMPLATES,
  comercio_exterior: COMERCIO_EXTERIOR_DRAFTING_TEMPLATES,
  aduanal: ADUANAL_DRAFTING_TEMPLATES,
  fiscal: FISCAL_DRAFTING_TEMPLATES,
};
