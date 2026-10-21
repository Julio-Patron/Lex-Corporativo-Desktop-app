# Índice de documentación

Qué documento manda sobre cada tema y cuáles se conservan sólo como historia. Cada informe lleva fecha y el SHA del código que describe; cuando dos documentos se contradigan, prevalece el más reciente de esta tabla.

## Vigentes

| Documento | Tema | Última actualización |
| --- | --- | --- |
| [plan-cierre-desarrollo-y-piloto.md](plan-cierre-desarrollo-y-piloto.md) | Decisiones del cierre, checklist de cierre y de empaquetado, plan del piloto, decisiones pendientes, estado de los gates | 2026-10-19 |
| [arquitectura-procesamiento-y-gate-publicacion.md](arquitectura-procesamiento-y-gate-publicacion.md) | Decisión de producto (BYOK, sin LLM local), política de grounding, gates del release comercial | 2026-10-19 (nota de estado) |
| [auditorias/corpus-2026-10-20.md](auditorias/corpus-2026-10-20.md) | Actualización del corpus para rc.19: publicaciones posteriores al corte, correcciones de segmentación y verificaciones | 2026-10-20 |
| [auditorias/hallazgos-2026-10-19.json](auditorias/hallazgos-2026-10-19.json) | Estado vigente de todos los hallazgos (seguridad, datos, dependencias, rendimiento, código, pruebas) | 2026-10-19 |
| [auditorias/evidencia-2026-10-19.json](auditorias/evidencia-2026-10-19.json) | Bundle sanitizado de CI, auditorías, `npm audit`, preflight, cobertura e instalador del piloto | 2026-10-19 |
| [auditorias/rendimiento-2026-10-19.md](auditorias/rendimiento-2026-10-19.md) | Auditoría de rendimiento con umbrales | 2026-10-19 |
| [auditorias/salud-codigo-2026-10-19.md](auditorias/salud-codigo-2026-10-19.md) | Auditoría de salud de código y revisión asistida | 2026-10-19 |
| [auditorias/seguridad-2026-10-19.md](auditorias/seguridad-2026-10-19.md) | Auditoría de seguridad y datos | 2026-10-19 |
| [auditorias/pruebas-2026-10-19.md](auditorias/pruebas-2026-10-19.md) | Auditoría de pruebas y cobertura | 2026-10-19 |
| [auditorias/limpieza-2026-10-19.md](auditorias/limpieza-2026-10-19.md) | Limpieza del repositorio con evidencia | 2026-10-19 |
| [auditorias/dep-01-triaje.md](auditorias/dep-01-triaje.md) | Triaje de avisos npm (sigue vigente: mismo conjunto de 16 avisos) | 2026-10-17 |
| [revisiones/documentacion-2026-10-19.md](revisiones/documentacion-2026-10-19.md) | Revisión de calidad de la documentación | 2026-10-19 |
| [revisiones/interfaz-y-flujo-2026-10-19.md](revisiones/interfaz-y-flujo-2026-10-19.md) | Revisión de calidad de interfaz y flujo de interacción | 2026-10-19 |
| [piloto/](piloto/) | Kit del piloto: guía del tester, escenarios, plantilla de retroalimentación, triaje y criterios de salida, datos y privacidad, manifiesto del instalador | 2026-10-19 |
| [identidad-branding-y-sitio-comercial.md](identidad-branding-y-sitio-comercial.md) | Identidad, voz y mensajes, sitio comercial | — |
| [../README.md](../README.md) | Desarrollo, comprobaciones, auditorías, empaquetado | 2026-10-19 |
| [../CLAUDE.md](../CLAUDE.md) | Guía del repositorio para asistentes de código | 2026-10-19 |

## Históricos

Se conservan como registro; no describen el estado actual.

| Documento | Qué registra | Superado por |
| --- | --- | --- |
| [relevo-ux-ui.md](relevo-ux-ui.md) | Relevo de interfaz, decisiones del 16–17 de octubre, fases 0–6 y matriz de aceptación; su primera sección (19-oct) resume el cierre | plan-cierre-desarrollo-y-piloto.md |
| [auditorias/hallazgos-a718988.json](auditorias/hallazgos-a718988.json) | Hallazgos abiertos al 17 de octubre | auditorias/hallazgos-2026-10-19.json |
| [auditorias/evidencia-a718988.json](auditorias/evidencia-a718988.json) | Evidencia al 17 de octubre | auditorias/evidencia-2026-10-19.json |

## Convenciones

- Los informes se nombran por fecha (`<tema>-AAAA-MM-DD.md`) y citan en su interior el SHA auditado.
- La evidencia local (`reports/`) no se versiona; el bundle sanitizado sí (`auditorias/evidencia-<fecha>.json`, generado con `npm run evidence:audits -- <sha7> <fecha>`).
- Un documento histórico no se reescribe: se le añade una nota fechada al inicio y se enlaza el vigente.
