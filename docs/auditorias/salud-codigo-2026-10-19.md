# Auditoría de salud de código — 19 de octubre de 2026

## Alcance

`src/` (main, preload, shared, renderer), `scripts/`, `tests/` y la configuración de build y CI. No incluye el corpus jurídico. Combina métricas automáticas, análisis de código muerto y una revisión asistida de corrección sobre los cambios desde la auditoría anterior.

## Entorno

Código auditado `main` @ `2ccc31b`; revisión de corrección sobre `a718988..HEAD`. TypeScript 5.9.3, vitest 4.1.12, Node v24.21.0. Herramientas de un solo uso: `knip@latest`, `depcheck`.

## Métricas

| Métrica | Valor | Comentario |
| --- | --- | --- |
| `npm run lint` (`tsc --noEmit` sobre src, tests y scripts) | 0 errores | — |
| Líneas TypeScript en `src/` | 24 105 | — |
| Usos de `any` (`: any`, `as any`) | 143 | Concentrados en adaptadores de respuestas de proveedores y pruebas; sin `@ts-ignore` ni `@ts-expect-error` |
| Marcadores `TODO`/`FIXME`/`HACK` | 0 reales | Las coincidencias son texto de plantillas |
| Archivos > 800 líneas | 5 | `template-bodies.ts` 2555 (contenido), `rag.ts` 1166, `byok-client.ts` 899, `constants.ts` 830 (contenido), `analyze.handler.ts` 828 |
| `catch` vacíos en `src/main` | 0 | 141 bloques `catch` en total; los revisados registran o devuelven estado |
| Dependencias de producción / desarrollo | 22 / 19 | Todas con referencia textual en el código |
| Licencias sin metadato en el lockfile | 2 (`base-64`, `json-bignum`) | Declaran MIT en el campo antiguo `licenses`; ver `dep-01-triaje.md` |
| Pruebas duplicadas por hash | 0 | — |

## Código muerto y dependencias

`knip` marca como "sin uso" todo `src/renderer/**` porque no conoce la entrada `index.html` de electron-vite: falso positivo, se descarta. Hallazgos útiles:

- **Exportaciones sin consumidor externo (21):** esquemas zod exportados sólo para pruebas (`SaveByokSettingsSchema`, `DraftPayloadSchema`, `DeleteAnalysisSchema`, …), constantes de `byok-settings.ts` y `case-retention.ts`, `AsyncMutex`, `formatAnalysisContext`, `generateHash`/`logTrace`, `parseDocx`. Ninguna es código inalcanzable: son API interna exportada. Decisión: **aplazado a mantenimiento**; convertir a no exportadas las que no usa ninguna prueba.
- **Tipos exportados sin uso (13):** en `preload/types.ts` y módulos de main. Mismo tratamiento.
- **Dependencia no declarada:** `pdfjs-dist` en `scripts/official-pdf-reader.mjs` y `stage-official-fiscal-corpus.mjs`; llega como transitiva de `pdf-parse@2.4.5`. Decisión: declararla explícitamente cuando se toque el flujo de corpus; no afecta al producto empaquetado.
- **Scripts referenciados sólo por `package.json`:** `repair-legal-anchors.mjs`, `export-legal-corpus.mjs`. Herramientas de mantenimiento del corpus; se conservan.
- **Pruebas solapadas:** `tests/chunking.test.ts` vs `src/main/lib/chunking.test.ts`, `tests/rag.test.ts` vs `src/main/lib/rag.*.test.ts`. Cubren escenarios distintos (integración vs unidad); se conservan.

## Revisión asistida de corrección (`/code-review a718988..HEAD`, 15 hallazgos)

| # | Hallazgo | Gravedad | Decisión |
| --- | --- | --- | --- |
| 1 | La bitácora registraba el modelo configurado, no el que respondió tras un fallback (`finalModelUsed`) | alta (trazabilidad) | **corregido** `3d242cd`: `onModelResolved` cableado en analyze, draft y reranker |
| 2 | Fallback de Gemini ante 429/403/400/402 y persistencia del modelo alternativo desde "Probar y conectar" | media | **abierto (SEC-06)**: es la resiliencia multi-modelo de `1a0f212`; una prueba existente exige el fallback con 402. Decide el responsable |
| 3 | `ipcMain.on` protegido lanzaba dentro del listener → excepción no capturada en main | alta | **corregido** `3d242cd` |
| 4 | El renderer seguía aceptando `.doc`, que main ya no extrae | media | **corregido** `3d242cd` (+ `files.test.ts`) |
| 5 | Un nombre de asunto indescifrable inutilizaba todo el portafolio | alta | **corregido** `3d242cd`: marcador y asunto eliminable |
| 6 | `vault:import-all` leía una ruta absoluta enviada por el renderer | media | **corregido** `3d242cd`: sólo rutas ofrecidas por el diálogo |
| 7 | Regex de modelos Anthropic retirados no cubría `claude-3-opus/haiku/sonnet-*` | media | **corregido** `3d242cd` en ambas copias |
| 8 | `normalizeProviderModel` duplicado entre `byok-settings.ts` y `byok-client.ts` | baja | **aplazado**: consolidar en `src/shared/byok-models.ts` tras el piloto |
| 9 | `deriveCitationConnection`/`deriveSummaryConnection` duplican funciones del reranker | baja | **aplazado** |
| 10 | `EstudioLayout` recarga todo el portafolio (y descifra payloads) en cada cambio de ruta para un contador | media (rendimiento) | **aplazado**: medir en el piloto; usar `listCases` para el conteo |
| 11 | `MAX_PDF_PAGES` se comprobaba después de extraer todo el texto | media | **corregido** `3d242cd`: `getInfo()` antes de `getText()` |
| 12 | `includeSignatures` del DOCX depende del prefijo del nombre de archivo | baja | **aplazado** |
| 13 | `OnboardingDialog` sustituyó el `Modal` compartido por un `div role=dialog` sin inerte ni foco inicial; `Escape` global cierra mientras se escribe la clave | media (accesibilidad) | **abierto (CODE-01)**: validar en A11Y-01 del piloto; corregir en el primer lote |
| 14 | `resolveLawCode` resolvía el artículo "LA" de un nombre desconocido como Ley Aduanera | media | **corregido** `3d242cd` |
| 15 | `ci-evidence.mjs` no resolvía la promesa si `spawn` emitía `error` → el paso colgaba hasta el timeout | media (CI) | **corregido** `3d242cd` |

Verificación de las correcciones: seis pruebas nuevas o modificadas fallaron antes del cambio y pasan después; `npm test` 234/234; `npm run lint` sin errores.

## Hallazgos nuevos

| ID | Prioridad | Descripción | Estado |
| --- | --- | --- | --- |
| CODE-01 | P2 | Diálogo de bienvenida sin inerte/foco inicial y con `Escape` global | abierto, no bloquea el piloto |
| CODE-02 | P3 | Duplicación de `normalizeModelName`/regex y de helpers del reranker | aplazado |
| CODE-03 | P3 | Recarga completa del portafolio por cambio de ruta en `/estudio` | aplazado; medir en piloto |
| CODE-04 | P3 | 21 exportaciones y 13 tipos sin consumidor externo | aplazado |

## Veredicto

**Pasa con observaciones.** Sin errores de tipos, sin `catch` vacíos ni código inalcanzable; 9 de 15 hallazgos de la revisión corregidos con pruebas. Lo pendiente son refactors sin efecto funcional, un problema de accesibilidad que el piloto validará y una decisión de producto sobre el fallback de modelos.

## Límites

- `knip`/`depcheck` sin configuración del proyecto: útiles para exportaciones y dependencias, no para archivos.
- La revisión asistida cubrió el rango `a718988..HEAD`; el código anterior sólo fue revisado por las métricas y la auditoría de seguridad.
