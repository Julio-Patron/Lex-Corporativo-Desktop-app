# Revisión de calidad de interfaz y flujo de interacción — 19 de octubre de 2026

Revisión de calidad, no gate. Recorrido por las seis rutas sobre las capturas del recorrido automatizado (`reports/ux-ui/ci-fcae82c…`, 94 capturas en 1400×900, 1024×768 y 720×600 con zoom 80/100/150 %) y lectura de los textos visibles (`ReviewSetup`, `EstudioLayout`, `HelpPanel`, paneles de Configuración, `constants.ts`, diálogos) contra las reglas de voz de `identidad-branding-y-sitio-comercial.md`. Sin pruebas de componentes React, la revisión es manual.

Clasificación: **error** (impide o engaña), **fricción** (funciona pero cuesta o confunde), **oportunidad** (mejora). Decisión: *corregido antes del piloto* u *observar en el piloto* (escenario asociado).

## Hallazgos

| # | Pantalla | Tipo | Hallazgo | Decisión |
| --- | --- | --- | --- | --- |
| U-01 | Auditar (`/estudio/auditar`) | fricción | La promesa "Sube un documento para detectar riesgos, omisiones y cláusulas faltantes" no distingue el modo básico por reglas del modo con IA; el panel "Alcance y límites" sí lo explica ("Detecta menciones y estructura del texto. No interpreta ni valida la legalidad"), pero está plegado | Observar en el piloto (AUD-01, AUD-02); candidata a lote 1: mostrar el límite del modo básico desplegado cuando no hay clave |
| U-02 | Auditar, paso 1 | fricción de voz | "archivo PDF, DOCX o TXT a dictaminar" sugiere un dictamen cuando la salida requiere revisión profesional | **Corregido**: "a revisar" |
| U-03 | Estudio (cabecera) | fricción de voz | "Dictamen de riesgos, redacción asistida y portafolio local" | **Corregido**: "Revisión de riesgos…" |
| U-04 | PDF exportado | fricción de voz | Cabecera "INGENIERÍA JURÍDICA Y DICTAMEN NORMATIVO" | **Corregido**: "…REVISIÓN NORMATIVA" |
| U-05 | Auditar, paso 2 (materias) | fricción | Desmarcar la última materia no cambia nada ni avisa | **Corregido**: texto permanente bajo las materias ("Mantén al menos una materia seleccionada; la última no se puede desmarcar"). Un aviso contextual queda para el lote 1 si el piloto lo pide |
| U-06 | Auditar en 1024×768 al 100 % | fricción | El botón de Auditar queda bajo el pliegue (y≈942 px); se alcanza con desplazamiento | Observar en el piloto (A11Y-02, AUD-01); rediseño del paso 3 fuera del alcance del cierre |
| U-07 | Buscador (`/`) en 1024×768 | oportunidad | La pantalla deja la mayor parte del espacio vacío y la caja de consulta al pie; la jerarquía (logo grande, consulta abajo) prioriza la marca sobre la tarea | Observar en el piloto (BUS-01); recoger en la encuesta de cierre |
| U-08 | Bienvenida | error visual | El subtítulo del logo dice "Sistema de inteligencia Juridica" sin acento; el texto forma parte de la imagen `logo-lockup-transparent.png` (el `alt` sí lleva acento) | Pendiente de un recurso gráfico nuevo del responsable (O-UI-1); no bloquea |
| U-09 | Bienvenida | fricción / accesibilidad | El diálogo de bienvenida no usa el `Modal` compartido: sin inerte ni foco inicial, y `Escape` global cierra aunque se esté escribiendo la clave (CODE-01) | Observar en el piloto (A11Y-01, INS-01); lote 1 |
| U-10 | Configuración → Acerca de | fricción | "Buscar actualizaciones" siempre está disponible y durante el piloto siempre responderá "sin actualización"; el interruptor automático sí explica que la privacidad estricta lo desactiva | Observar en el piloto (INS-05, CFG-04); la guía del tester lo anticipa |
| U-11 | Configuración → Datos (restaurar) | — | Los tres resultados tienen mensaje propio: resumen "N nuevos, N sin cambios, N reemplazados", diálogo de conflicto que explica qué sustituye el reemplazo, y error de contraseña o archivo dañado | Correcto; validar comprensión en RES-05/RES-06 |
| U-12 | Cierre con guardado fallido | fricción | El diálogo nativo "Trabajo sin conservar" es largo; su lectura bajo presión de cierre debe probarse | Observar en el piloto (REC-01, REC-02) |
| U-13 | Menú nativo y ayuda | — | El menú sólo navega a Configuración (`nav:settings` → `/configuracion`); la ayuda contextual y la barra lateral usan rutas vigentes; las rutas antiguas redirigen por `lib/routes.ts` | Correcto |
| U-14 | Menú Ayuda | fricción | Único ítem, deshabilitado: "Soporte disponible en el sitio de descarga"; durante el piloto el soporte es el canal del piloto | Observar; lote 1: enlazar la ayuda en la app o el canal de soporte vigente |
| U-15 | Ayuda de Leyes | fricción | No mencionaba "Abrir articulado" (lector íntegro sin conexión) | **Corregido** |
| U-16 | Leyes (`/leyes`) | — | Inventario claro: 16 ordenamientos, 7 348 disposiciones, filtros por materia, "Abrir articulado" por ley, enlace externo señalado con icono | Correcto |
| U-17 | Portafolio vacío | — | Estado vacío con explicación y dos acciones (Auditar, Generar) | Correcto |
| U-18 | Generar | — | Tres pasos visibles; las dos opciones con IA marcan "Requiere IA"; la plantilla sin IA está disponible plegada | Correcto; validar que "Usar una plantilla precargada" se descubre sin clave (GEN-04) |
| U-19 | Barra lateral | oportunidad | "Conectar IA" permanece como indicador ámbar permanente sin clave; puede leerse como alerta | Observar en el piloto |

## Resumen

| Tipo | Corregidos antes del piloto | Observar en el piloto / backlog | Correctos |
| --- | --- | --- | --- |
| Error | 0 | 1 (U-08, recurso gráfico) | — |
| Fricción | 5 (U-02, U-03, U-04, U-05, U-15) | 6 (U-01, U-06, U-09, U-10, U-12, U-14) | — |
| Oportunidad | 0 | 2 (U-07, U-19) | — |
| Correctos | — | — | 5 (U-11, U-13, U-16, U-17, U-18) |

## Escenarios del piloto que recogen lo observado

AUD-01/AUD-02 (U-01), A11Y-01/A11Y-02 (U-06, U-09), BUS-01 (U-07), INS-01 (U-08, U-09), INS-05/CFG-04 (U-10), RES-05/RES-06 (U-11), REC-01/REC-02 (U-12), GEN-04 (U-18). La encuesta de cierre pregunta por la utilidad de Buscador, Auditar y Generar (U-07, U-01).

## Límites

- Capturas con ventana oculta y foco emulado; no sustituyen el uso real, el lector de pantalla ni el cambio de escala entre monitores.
- No se revisó el contenido jurídico de las plantillas, sólo su voz en los rótulos.
