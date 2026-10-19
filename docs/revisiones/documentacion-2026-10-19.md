# Revisión de calidad de la documentación — 19 de octubre de 2026

Revisión de calidad, no gate. Cada hallazgo se clasifica como **error** (información falsa o enlace roto), **fricción** (correcta pero confusa o incompleta) u **oportunidad** (mejora), y lleva decisión: *corregido antes del piloto* u *observar en el piloto / backlog*.

Alcance: `README.md`, `CLAUDE.md`, `docs/*.md`, `docs/auditorias/*`, `docs/piloto/*`, textos de ayuda dentro de la aplicación (`HelpPanel`, paneles de Configuración) y `docs/identidad-branding-y-sitio-comercial.md` como referencia de voz.

## Hallazgos

| # | Documento | Tipo | Hallazgo | Decisión |
| --- | --- | --- | --- | --- |
| D-01 | `docs/relevo-ux-ui.md` | error | La fase 0 hablaba de la rama `desarrollo` y enlazaba `auditoria-ui-2026-10-17.html`, que nunca se versionó; la tabla de validación cita 192 pruebas y "SEC-01..03 y DATA-02 siguen abiertos" | **Corregido**: sección fechada al inicio que marca la fase 0 superada, corrige la referencia y remite a los informes del 19-oct. El resto se conserva como historia (no se reescribe) y el documento queda clasificado como histórico en `docs/README.md` |
| D-02 | `README.md` | fricción | No mencionaba las auditorías (`audit:data`, `audit:performance`, `audit:security`, `pilot:manifest`) ni dónde vive la evidencia | **Corregido**: sección "Auditorías y evidencia" |
| D-03 | `docs/arquitectura-procesamiento-y-gate-publicacion.md` | fricción | 17 gates sin estado por gate; no distinguía piloto de release comercial | **Corregido**: nota al inicio que remite al estado por gate en el plan de cierre y aclara que el piloto no es un release |
| D-04 | `docs/arquitectura-procesamiento-y-gate-publicacion.md` | error | "corpus jurídico Mercantil y Fiscal" cuando el producto cubre cinco materias y 16 ordenamientos | **Corregido** |
| D-05 | `docs/auditorias/hallazgos-a718988.json` | error de lectura | Era el único registro de hallazgos y decía "todo abierto" | **Corregido**: `hallazgos-2026-10-19.json` es el vigente; el histórico lleva `supersededBy` y nota |
| D-06 | `docs/` | oportunidad | No existía un índice que separase documentos vigentes de históricos | **Corregido**: `docs/README.md` con tabla de vigentes, históricos y convenciones (nombre por fecha, SHA en el interior, no reescribir historia) |
| D-07 | Documentación de usuario final | fricción | No había guía de instalación ni descripción de módulos para personas usuarias; sólo documentación técnica | **Corregido parcialmente**: `docs/piloto/guia-tester.md` cubre instalación, claves, privacidad y borrado; `escenarios-piloto.md` describe cada módulo por recorrido. Falta un manual breve para el producto comercial (backlog) |
| D-08 | `CLAUDE.md` | — | Alineado hoy (frontera IPC, CSP compartida, suites de auditoría, flujo en `main`) | Sin acción |
| D-09 | Ayuda en la app (`HelpPanel`, `/leyes`) | fricción | Sólo mencionaba el enlace externo a la Cámara de Diputados; omitía "Abrir articulado", que muestra el texto íntegro sin conexión | **Corregido** (texto de la ayuda) |
| D-10 | `docs/identidad-branding-y-sitio-comercial.md` vs textos de la app | fricción | La regla "no llamar dictamen definitivo a una salida que requiere revisión profesional" chocaba con "Dictamen de riesgos" (cabecera del Estudio), "a dictaminar" (paso 1 de Auditar) y "DICTAMEN NORMATIVO" (cabecera del PDF exportado), sobre todo en modo básico | **Corregido**: "Revisión de riesgos", "a revisar", "REVISIÓN NORMATIVA". Las plantillas jurídicas que usan "dictamen" como género documental (dictamen técnico, dictamen de rectificación) son correctas y se conservan |
| D-11 | `docs/piloto/*` | oportunidad | Las referencias a pantallas usan los rótulos actuales (Configuración → IA / Datos y privacidad / Acerca de); si la interfaz cambia en un lote del piloto hay que revisarlas | Observar en el piloto |
| D-12 | `docs/auditorias/*.md` | fricción | Los informes citan el SHA auditado en el interior; la evidencia se regenera por SHA y puede quedar un commit de documentación posterior | **Mitigado**: el manifiesto del piloto registra `buildSha` y HEAD por separado y comprueba que no cambió nada empaquetable entre ambos |

## Áreas de oportunidad (backlog)

- Manual de usuario breve para el release comercial (instalación, módulos, qué funciona sin clave, privacidad), derivado de la guía del tester.
- Fechar con SHA cada sección nueva de los documentos de decisiones, como ya se hace en los informes.
- Generar la tabla de estado de gates desde `hallazgos-<fecha>.json` en lugar de mantenerla a mano.

## Método

Lectura completa de los documentos listados, contraste de comandos documentados contra `package.json`, de rutas y archivos citados contra el árbol del repositorio (`git ls-files`, `git log --all -- <ruta>`), y de los textos de ayuda contra las pantallas capturadas por `test:ui:electron`.
