# Relevo de interfaz e interacción de Lex Corporativo

Fecha de corte: 15 de octubre de 2026. Versión del producto: `1.0.0-rc.16`.

## Cierre de desarrollo y arranque del piloto — 19 de octubre de 2026

Este documento se conserva como historia. El estado vigente está en [docs/plan-cierre-desarrollo-y-piloto.md](plan-cierre-desarrollo-y-piloto.md) y en los informes de `docs/auditorias/` fechados el 19 de octubre de 2026.

- **Fase 0 superada.** La rama `desarrollo` se integró en `main` mediante el PR #2 (`a73859e`) y se eliminó local y remotamente. El trabajo continúa directamente en `main`; el disparador de CI ya no la lista.
- **Corrección de referencia.** El informe `docs/auditoria-ui-2026-10-17.html` citado más abajo nunca se versionó en el repositorio. Sus conclusiones sobreviven en el resumen de la sección "Auditoría visual con Superdesign" y en `reports/ux-ui/superdesign-audit/` (local). La entrada de `.gitignore` que lo nombraba se retiró.
- **Hallazgos a718988 re-evaluados.** SEC-01, SEC-02, SEC-03, DATA-02 y DATA-03 quedaron cerrados con ensayos automatizados en Electron (`npm run audit:security:electron`, `npm run audit:data:electron`); DATA-01 queda mitigado hasta la restauración en otro usuario de Windows durante el piloto; PERF-01 pasa en el ensayo con umbrales codificados y se cierra con las cinco muestras del instalador; DEP-01 sigue abierto sin bloquear el piloto. Detalle y evidencia en `docs/auditorias/hallazgos-2026-10-19.json`.
- **Limpieza.** `screens-electron/` se retiró del repositorio (la historia de Git conserva las capturas); se eliminaron las reglas de `.gitignore` y `.gitattributes` para modelos GGUF, y los bloques `mac` y `linux` de `electron-builder.config.json`, que referenciaban recursos inexistentes.
- **Piloto.** Build interno `1.0.0-rc.17` sin firma, sin tag ni release en GitHub; kit del tester en `docs/piloto/`.

## Controles y auditoría técnica sobre el diseño aceptado — 17 de octubre de 2026

El responsable del producto confirmó que la interfaz de `a71898852d5e035eb850da3a80164d12c7ad5e86` es la correcta. Esta continuación conserva ese diseño y los cambios locales pendientes. La auditoría visual de la sección siguiente y `docs/auditoria-ui-2026-10-17.html` corresponden a `82d567a`: se conservan como evidencia histórica y no se presentan como validación del diseño nuevo. No se hizo commit, push, merge, tag ni publicación en esta etapa.

**Fase 0 bis implementada localmente:** CI reutilizable con bóveda Node obligatoria, bóveda y recuperación Electron en Windows, recorrido UI, integridad del corpus, conocimiento jurídico estricto, recuperación normativa y fundamentación. El manifiesto versionado se comprueba antes de preparar recursos; el prehook ya no lo regenera. También se corrigió el orden interno de `--check --write` para que una regeneración no oculte una discrepancia. Los ensayos de fallo usan copias temporales y nunca alteran el corpus de trabajo.

Los candidatos se construyen con `--publish never` después de CI. Se retiró la conversión automática de borradores a públicos. El workflow independiente de publicación exige ejecución de candidato exitosa, SHA aceptado integrado en `main`, tag coincidente, hash del manifiesto aceptado y firma del editor esperado; verifica los archivos descargados y los promueve sin reconstruirlos. `README.md` documenta los secretos, variables y entornos `windows-signing` / `windows-publication`. **La configuración de protecciones y revisores en GitHub, firma real y ensayo de promoción siguen pendientes.** El responsable confirmó el feed `Julio-Patron/Lex-Corporativo-Desktop-app`. El preflight estricto sigue bloqueado mientras falten el certificado, la huella y `DISTRIBUTION_REPOSITORY` en el entorno.

MiniLM queda fijado en `751bff37182d3f1213fa05d7196b954e230abad9`, con SHA256 y tamaño de ONNX, tokenizador y configuraciones en `legal-runtime/embeddings.lock.json`. La consulta de metadatos del origen y la descarga real a un directorio vacío confirmaron los cuatro recursos. La preparación rechaza archivos alterados en vez de repararlos silenciosamente. El manifiesto del candidato registra herramientas efectivas, lockfile, recursos y artefactos; comprueba los recursos copiados al paquete y la firma del instalador y ejecutable.

| Validación local sobre `a718988` más los cambios de controles | Resultado |
| --- | --- |
| TypeScript, compilación y pruebas Node | Correctos; 192 pruebas aprobadas, cero omitidas. |
| Integridad de embeddings y promoción por manifiesto aceptado | 8 pruebas aprobadas: recursos alterados, descarga corrupta, SHA/versión/destino, manifiesto sustituido, archivos extra y faltantes y contenido real de recursos empaquetados. |
| Ensayo de controles jurídicos en copia aislada | 2 comprobaciones intactas con código 0; 4 fallos controlados con código 1, incluido `--check --write`. |
| Conocimiento jurídico estricto, corpus y recuperación | Correctos; 16 ordenamientos y 7.348 disposiciones. |
| Evaluación semántica y fundamentación | 20/20 casos semánticos y 5/5 controles de fundamentación. |
| Bóveda y recuperación Electron | Correctos: 1.000 ciclos, reapertura, conservación, recarga, fallo de disco y guardado en curso sin duplicados. |
| Recorrido de interfaz aprobada | 94 capturas en seis combinaciones; evidencia separada con SHA y ejecución. No acredita interacción nativa ni instalación. |
| Preflight estricto | Recursos correctos; bloqueado por certificado, huella del editor y destino de distribución sin configurar. |
| Workflows | YAML y sintaxis PowerShell comprobados localmente; no ejecutados en GitHub. |

Los reportes locales están en `reports/ci/quality/`, `reports/ci/windows/` y `reports/audits/`. Los resúmenes nuevos registran SHA base, árbol modificado y digest de entradas: **no son validación de un commit final limpio**. La copia sanitizada para control de versiones está en [evidencia técnica](auditorias/evidencia-a718988.json); los [hallazgos abiertos](auditorias/hallazgos-a718988.json) distinguen comprobación, alcance y criterio de cierre.

**Inventario y limpieza:** 15 áreas clasificadas con tamaño, estado Git, referencias, uso y decisión; 22 dependencias de producción revisadas por referencias textuales; ningún duplicado exacto de pruebas. No se eliminaron cachés, capturas, recursos ni evidencia. Se corrigieron documentación de publicación, rutas inexistentes y comandos de validación. `tsconfig.json` ahora limita sus entradas a código, pruebas, scripts y configuración: antes incluía `scratch/` y podía fallar cuando una prueba retiraba su temporal. La ausencia de referencias textuales no acredita por sí sola código muerto; el análisis de imports dinámicos y la depuración funcional siguen abiertos.

**Auditoría inicial de seguridad y datos:** quedan abiertos remitente IPC, CSP efectiva, sanitización, restauración/protección del respaldo y dependencias. El ensayo Electron confirmó payloads cifrados, nombres de asuntos legibles en SQLite/WAL y respaldo JSON descifrado. Tras borrar los fragmentos sintéticos de LanceDB, la tabla tenía cero filas pero persistía texto legible en sus archivos: el borrado lógico no acredita eliminación física segura. El triaje DEP-01 está en [dep-01-triaje.md](auditorias/dep-01-triaje.md): de 18 paquetes altos y 18 moderados quedaron 4 altos y 12 moderados, todos con una bajada de versión mayor como único arreglo de npm. No se usó `npm audit fix --force`. Electron pasó a 42.11.15. El directorio `release/win-unpacked` incluye el aviso de libvips y las DLL fuera del asar; el ejecutable no quedó firmado. DEP-01 sigue abierto. Ningún perfil o documento real se usó para estas pruebas.

**Rendimiento:** cinco procesos nuevos y 25 muestras por operación en Ryzen 7 7730U, Windows `10.0.26300` y Electron `42.6.1`. Medianas: llegada a Inicio 1.931 ms, recarga 414 ms, primera búsqueda 508 ms, búsqueda caliente 122 ms, lectura RMF 18 ms, revisión básica sintética 726 ms, exportación PDF 163 ms y DOCX 32 ms. Se conserva una muestra atípica de llegada a Inicio de 30.312 ms cuya causa no está resuelta. La suma de conjuntos de trabajo de procesos pasó de 410–458 MiB a 796–826 MiB tras cargar modelo y exportadores; puede contar memoria compartida y no demuestra una fuga. El main de ensayo usa handlers reales y ventana oculta, sin purgar caché del SO; no acredita arranque del instalador, renderizado de ley extensa ni rendimiento de proveedores. PERF-01 sigue abierto: la barra provisional de abajo no sustituye las cinco muestras del instalador.

## Decisiones del responsable — 17 de octubre de 2026

**Distribución.** El feed es `Julio-Patron/Lex-Corporativo-Desktop-app`. `elbuilder77` queda como usuario anterior de GitHub y como correo `elbuilder77@gmail.com`. `DISTRIBUTION_REPOSITORY` debe usar ese mismo `owner/repo`. El primer release es el instalador NSIS firmado: candidato con huella en el preflight, `electron-updater` y publicación del archivo aceptado sin reconstruirlo, desde la página de descarga del responsable. La Microsoft Store no cierra ese release. Un paquete MSIX, otra firma y actualizaciones por la tienda chocan con la privacidad estricta, que deja las actualizaciones apagadas hasta que el usuario las acepta, y con la bóveda cifrada con DPAPI, que en una app de la Store vive en otro contenedor. El despacho espera un instalador que pueda guardar, copiar a otra PC y respaldar, sin cuenta de Microsoft ni comisión de tienda. La Store puede valorarse como segundo escaparate cuando ese instalador ya se instale, actualice y desinstale en un Windows limpio.

**Respaldo.** El archivo portátil se cifra con una contraseña de al menos 8 caracteres (scrypt y AES-256-GCM). Incluye asuntos, documentos, análisis, borradores y estado. Excluye la clave de IA y la recuperación de redacción pendiente. La misma contraseña abre el archivo en otro perfil de Windows. Si el asunto ya existe con el mismo contenido, la importación no lo duplica. Si el contenido difiere, no se escribe nada hasta que el usuario confirme el reemplazo. Un archivo dañado o a medias no modifica el portafolio. La pantalla de Datos y privacidad explica que la protección es esa contraseña, no el cifrado de Windows de este equipo. Falta el ensayo de restauración en otro perfil; DATA-01 sigue abierto hasta esa comparación.

**Metadatos.** El nombre del asunto y el nombre de archivo se guardan cifrados con el mismo cifrado del sistema que el contenido. Al abrir una bóveda anterior, los valores que estaban en claro se cifran y el archivo se reescribe. El aviso de privacidad describe ese alcance. DATA-03 sigue abierto hasta repetir la lectura del archivo de la bóveda en el ensayo de datos.

**Rendimiento, barra provisional.** Para el instalador NSIS en Windows: mediana de arranque en frío hasta Inicio por debajo de 5 s, ninguna muestra por encima de 15 s, y búsqueda ya caliente por debajo de 500 ms. La muestra de 30,3 s del ensayo con ventana oculta no fija estos números. Se confirman o se ajustan después de cinco muestras del instalador. PERF-01 no queda cerrado.

**Controles locales de la fase siguiente, aún abiertos.** Los canales sensibles comprueban la misma ventana, el marco principal y el documento de la aplicación; la recuperación conserva su propia comprobación. La meta de CSP ya no declara `frame-ancestors` ni `report-uri`, y bloquea iframes y objetos con `frame-src` y `object-src`. `frame-ancestors` va en el encabezado de respuesta, que no alcanza al documento `file://` empaquetado. Los logs redactan credenciales por nombre de campo, textos y errores anidados. Los fragmentos temporales se cifran al indexarlos y, tras el borrado lógico, se reescribe `user_documents.lance`. SEC-01, SEC-02, SEC-03 y DATA-02 siguen abiertos: falta rechazar un origen ajeno dentro de Electron, comprobar el iframe en el paquete, repetir el ensayo de datos y cubrir cierre forzado o versiones que esta reescritura no llegó a ejecutar.

La fase 0 bis tiene controles preparados y ensayados localmente; no cierra firma ni CI alojado. Las fases 1 y 2 conservan trabajo pendiente, especialmente los hallazgos de confidencialidad, restauración y dependencias. No hay candidato distribuible ni autorización de publicación acreditados por esta etapa.

## Auditoría visual con Superdesign — 17 de octubre de 2026

La revisión del primer frente continúa sobre `82d567a25343ba8e42b67e7b3125a769e5954367`. El [informe de auditoría](auditoria-ui-2026-10-17.html) conserva seis capturas originales incrustadas, diez mediciones de posición de las acciones y siete hallazgos con evidencia y criterios de cierre. Dos tienen prioridad P1: adecuar la promesa de Auditar al modo básico y mejorar la ubicación de su acción en ventanas reducidas. Los otros cinco cubren la jerarquía de Inicio, el mínimo de una materia, la asociación de ayudas a campos, el Portafolio vacío y los ejemplos del Fundamentador.

`npm run build` y `npm run test:ui:electron` finalizaron correctamente el 16 de octubre; el recorrido renovó 94 capturas en seis combinaciones de tamaño y zoom. Se conservaron las capturas anteriores en `reports/ux-ui/pre-superdesign-2026-10-16/`. El sondeo adicional del 17 de octubre confirmó que la acción de Auditar comienza en y=942 px CSS en ventana 1024 × 768 al 100 %, fuera de la vista inicial; el control sigue siendo alcanzable mediante scroll. También confirmó que intentar desmarcar la última materia no cambia su estado ni muestra un aviso. Evidencia local adicional: `reports/ux-ui/superdesign-audit/`.

Se preparó el contexto de diseño y el [lienzo de Superdesign](https://superdesign.dev/teams/c4fa1cfb-0df1-423e-a376-ec4dac8d43bf/projects/5ec4d95f-eb45-434b-993b-cee1ecf60b4b), conservando logo, tipografías, navegación y alcance funcional actuales. Los hallazgos permanecen abiertos; esta auditoría no modifica la interfaz del producto ni acredita los gates de publicación. El recorrido usa ventanas ocultas y foco emulado; Windows instalado, lectores de pantalla y proveedores reales siguen sujetos a su validación específica.

## Reestructuración de módulos — 16 de octubre de 2026

Decisión de producto confirmada por el usuario en la conversación lateral y autorizada para implementación. Esta estructura sustituye la navegación descrita en las continuaciones anteriores:

- **Inicio:** guía de uso y ficha técnica para el usuario, membretada con el logo. El flujo principal es subir, auditar y preparar correcciones. Información complementaria en desplegables.
- **Estudio:** módulo de trabajo con **Auditar**, **Generar** y **Portafolio**. Abre en Auditar. Las plantillas son una alternativa secundaria dentro de Generar; las otras entradas son una solicitud a la IA y un archivo propio. Las correcciones parten del informe de auditoría.
- **Fundamentador:** consulta independiente de artículos por tema y materia, con lectura del resultado, copia de cita y envío a Generar. La evaluación de los fundamentos del documento corresponde a la auditoría con IA y RAG.
- **Leyes:** menciones por materia y enlace a la página de Cámara de Diputados. Sin lector ni descarga en esta sección. El corpus interno se conserva para recuperación y auditoría; el lector contextual de fundamentos sigue disponible desde los informes.

Implementación: rutas `/estudio/auditar`, `/estudio/generar`, `/estudio/portafolio`, `/fundamentador` y `/leyes`; enlaces anteriores de redacción/revisión/portafolio redirigen a sus equivalentes. Ayuda y bienvenida reflejan la nueva organización. Se conservan los ajustes previos de barra de ventana, diálogos y tamaños pequeños.

**Alcance funcional pendiente:** el Portafolio actual guarda documentos generados e informes, pero no ofrece los archivos originales como elementos recuperables. Completar el Portafolio acordado requiere persistencia y recuperación de originales y relaciones entre original, informe y correcciones. Actualmente la salida desde la auditoría prepara cláusulas o adendas; la regeneración integral del archivo auditado requiere un flujo explícito adicional. La interfaz describe las capacidades existentes sin presentar esas ampliaciones como terminadas.

Validación de la reestructuración: TypeScript y compilación correctos; 182 pruebas aprobadas y 10 omitidas por el ABI de SQLite. El recorrido Electron completó 94 capturas en seis combinaciones de tamaño y zoom, sin fallos en sus comprobaciones de geometría. Se revisaron visualmente Inicio y Generar, incluido Generar a 150 % en ventana pequeña.

La evidencia visual de esta estructura se guarda separadamente en `reports/ux-ui/restructure-after/`, conservando las capturas anteriores. El recorrido mantenido valida las nuevas rutas, las pestañas del Estudio, la opción secundaria de plantillas y el acceso externo de Leyes. No acredita aceptación de Windows instalado ni proveedores reales.

## Continuación visual — 16 de octubre de 2026

La revisión de interfaz sigue abierta: la entrega anterior no acreditaba ausencia de saturación de texto ni de superposiciones con los controles de Windows. Se continúa en la rama local `desarrollo`, creada conservando los tres commits locales y las modificaciones documentales pendientes. No se ha hecho fetch, push, merge ni publicación en esta continuación.

Los cuatro frentes acordados, en orden, son:

1. **Frontend:** optimizar la identidad y estructura actuales, corrigiendo superposiciones, jerarquías, densidad de texto, navegación y continuidad. Revisar las seis pantallas principales y sus diálogos; las pruebas acompañan cada cambio.
2. **Auditorías, limpieza y pruebas:** seguridad, rendimiento, datos, proveedores, depuración justificada y regresiones. El roadmap detallado de abajo conserva sus gates y dependencias.
3. **Validación final de Windows:** comprobar antes de empaquetar y luego aceptar el instalador firmado mediante instalación, actualización, recuperación y desinstalación. Publicar únicamente el artefacto validado.
4. **Web del producto:** presentación, descarga de Windows, guía de inicio, soporte y páginas legales. La primera versión no ejecutará las funciones de la aplicación en el navegador.

Cambios de esta continuación:

- Barra de ventana independiente en `AppShell`: sidebar, cabeceras, avisos y diálogos quedan debajo del área nativa. La reserva se ajusta al área que comunica Chromium, con un mínimo de 40 px. Las cabeceras de página ya no actúan como zonas de arrastre ni pierden ancho por un margen fijo a la derecha.
- Revisar conserva un resumen visible de sus límites y ofrece el detalle en «Alcance y límites». Redactar reduce instrucciones repetidas, agrupa las sugerencias en un desplegable y elimina etiquetas de materia repetidas dentro de grupos que ya la identifican. Leyes ofrece ejemplos de búsqueda desplegables; Configuración resume la introducción de IA manteniendo la información sobre costos.
- Formularios de redacción y revisión pasan a una columna antes de quedar estrechos. Los botones pueden crecer cuando su texto ocupa varias líneas. Los lectores y vistas previas usan desplazamiento vertical con poco espacio, evitando que cabecera y acciones compriman el texto hasta hacerlo ilegible.
- Recorrido mantenido: `npm run build` seguido de `npm run test:ui:electron`, con SQLite preparado para Electron. Capturas e informe en `reports/ux-ui/layout-after/`; la referencia visual anterior queda en `reports/ux-ui/layout-before/`. El código del recorrido se versiona; sus perfiles y evidencias locales no. Conserva el perfil real y no necesita claves de proveedores.

Validación ejecutada en esta continuación: `npm run lint`, `npm run build` y `git diff --check` correctos; `npm test` con 181 aprobadas y 10 omitidas por el ABI de SQLite. `npm run test:ui:electron` completó 100 capturas con sus comprobaciones de geometría, espacio de lectura y sidebar, en seis combinaciones de tamaño y zoom. No hubo recortes horizontales de los controles inspeccionados ni invasión del área nativa por el contenido o los diálogos. Se revisaron capturas de pantallas y lectores, incluidas sus acciones tras desplazar el contenido a 150 %. Comparación visual local: `reports/ux-ui/layout-comparison.html`.

**Límites de aceptación:** la prueba usa Electron con renderizado fuera de pantalla y foco emulado. No acredita clics sobre minimizar/maximizar/cerrar, arrastre nativo, Windows limpio, cambios de escala entre monitores, lectores de pantalla ni proveedores reales. El aviso CSP también apareció en la referencia anterior y se mantiene como hallazgo del frente de seguridad. La aceptación visual del producto instalado continúa pendiente.

La revisión de UX y UI conserva la identidad visual del producto, reduce la saturación de Inicio y mejora la continuidad entre documentos, leyes y Portafolio. El comando `npm run dev:desktop` dispone de un lanzador explícito para abrir la ventana desde la carpeta del proyecto. La continuación orientada a distribución en Windows añade recuperación de la redacción; faltan la auditoría completa de seguridad y rendimiento y las pruebas de proveedores reales.

## Continuación para distribución en Windows — 15 de octubre de 2026

Sobre el commit `60cf580`, se añadió una copia de recuperación cifrada de la redacción pendiente en `userData/draft-recovery.bin`. Conserva título, texto, datos del formulario, plantilla, materia, instrucciones y referencia a la revisión de origen. Utiliza `safeStorage` del sistema operativo; no guarda el texto en `localStorage` ni admite respaldo sin cifrado. La escritura sustituye el archivo anterior después de completar y vaciar el temporal. El esquema de SQLite y la versión del producto se conservan.

La copia se programa cada 400 ms mientras hay cambios y se vacía de forma síncrona antes del cierre o la recarga. El inicio recupera la redacción antes de montar las pantallas. Si falla la escritura al salir, se ofrece permanecer o continuar sin conservar. La recuperación informa errores de lectura sin borrar el archivo existente. Las revisiones de escritura y la identidad de sesión impiden que peticiones atrasadas sustituyan una copia más reciente. Los canales nuevos comprueban la ventana, el marco principal y el documento de origen; la navegación de la ventana se limita al documento de la aplicación.

Las escrituras de un mismo documento al Portafolio se ejecutan en orden y el primer asunto tiene identidad estable: reintentar tras cerrar durante el guardado no duplica el documento. El resultado generado se incorpora al estado recuperable antes de guardarlo. Guardar, descartar o eliminar el trabajo retira la copia correspondiente; el plazo de conservación configurado se comprueba al leerla. Eliminar un documento abierto detiene su autoguardado y espera las escrituras pendientes.

Los archivos adjuntos no se duplican: se conserva su nombre y el formulario pide volver a seleccionarlos. La recuperación cubre Redactar; no reanuda revisiones de archivos ni peticiones a proveedores que estaban en curso. Un cierre forzado o un corte de energía puede perder los cambios posteriores a la última copia completada. La prueba automatizada comprueba cierre normal, recarga y nuevo proceso; no simula pérdida física de energía ni la instalación de una actualización.

Puntos de entrada: `src/shared/draft-recovery.ts`, `src/main/ipc/recovery.handler.ts`, `src/main/lib/draft-recovery.ts` y `src/renderer/lib/draft-recovery.ts`. La prueba mantenida se ejecuta con `npm run test:recovery:electron`; usa ventanas ocultas y un perfil temporal aislado, y requiere SQLite compilado para Electron. Los contratos de cierre y cifrado se apoyan en [webContents](https://www.electronjs.org/docs/latest/api/web-contents#event-will-prevent-unload) y [safeStorage](https://www.electronjs.org/docs/latest/api/safe-storage).

| Comprobación ejecutada en esta continuación | Resultado |
| --- | --- |
| `npm run lint`, `npm run build` y `git diff --check` | Correctos. |
| `npm test` | 181 aprobadas; 10 omitidas por el ABI de SQLite; 191 en total. |
| `npm run test:recovery:electron` | Formulario tras reabrir, última edición tras recargar, cierre impedido ante fallo de disco, recuperación entre procesos, escritura SQLite en curso sin duplicados y descarte: correctos. |
| `npm run test:vault:electron` | Correcto: 1,000 ciclos, reapertura, eliminación y conservación. |
| `npm run audit:corpus-governance:strict` | Correcto: 16 ordenamientos, 7,348 disposiciones, sin duplicados ni conflictos. |
| `npm run audit:legal-knowledge` y `npm run audit:legal-retrieval` | Correctos. |
| `npm run eval:legal-rag -- --summary` | 20/20 casos semánticos y 5/5 controles de fundamentación. |
| `npm run preflight:release:strict` | Bloqueado: identidad/certificado de firma de Windows no configurado. Recursos locales y el icono `.ico` correctos. |

No se generó ni publicó un instalador en esta continuación. Siguen pendientes firma, empaquetado final y hash/manifiesto, pruebas reales de los tres proveedores, auditoría completa de seguridad —incluida CSP— y rendimiento, accesibilidad asistida y el ciclo de instalación, actualización y desinstalación en Windows limpio. La compilación de la aplicación no acredita esos gates. Los resultados de UX que siguen corresponden a la entrega anterior y no se volvieron a ejecutar en esta continuación.

## Estado de la entrega

La revisión visual quedó en `60cf580` y la recuperación de redacción en `7363bfe`, sobre la base `188839e`. El tercer commit, `24b46bf`, sólo actualizó este relevo para incorporar el roadmap, incluida la limpieza y depuración; no ejecutó esas tareas. Al comenzar esta revisión documental, el árbol estaba limpio y `main` aparecía tres commits por delante de la referencia local de `origin/main`, que apunta a `188839e`. No se ha hecho push ni se ha consultado de nuevo el remoto; hay que actualizar esas referencias antes de preparar el PR. La versión del producto permanece en `1.0.0-rc.16`.

## Roadmap hasta el merge a main y la publicación de Windows

Este roadmap organiza el trabajo pendiente; las casillas abiertas no representan tareas ejecutadas. **Codex** realiza inspección, implementación, depuración, automatización y preparación de evidencias. **Responsable del producto (tú)** aporta accesos y credenciales, define las decisiones comerciales y de soporte y acepta la entrega. Una tarea conjunta indica qué parte corresponde a cada uno. La creación de este plan no ejecuta limpieza, push, merge, etiquetado ni publicación.

El destino técnico inicial es el configurado actualmente: instalador NSIS para Windows x64, instalación por usuario y conservación de datos al desinstalar. El desarrollo continúa con BYOK y recursos jurídicos locales. macOS, Linux y Windows ARM64 quedan fuera de esta primera entrega; sus configuraciones existentes se revisan, pero no se eliminan sólo por estar fuera del alcance.

### Hallazgos que condicionan el plan

| Hallazgo comprobado en el repositorio | Acción necesaria |
| --- | --- |
| Los commits funcionales `60cf580` y `7363bfe` y el documental `24b46bf` ya están en `main` local; `CLAUDE.md` indica trabajo en `desarrollo` y PR hacia `main`. | Preservar los tres commits y las modificaciones posteriores; continuar en `desarrollo` e integrar mediante PR al `main` remoto actualizado, sin reescribir la historia publicada. |
| `origin` y `electron-builder.config.json` apuntan a `Julio-Patron/Lex-Corporativo-Desktop-app`. | El feed quedó alineado el 17 de octubre de 2026. Siguen pendientes los permisos del token, los revisores de `windows-publication` y la variable `DISTRIBUTION_REPOSITORY` en GitHub. |
| `.github/workflows/release.yml` se activa con tags `v*` o manualmente, usa preflight no estricto, `--publish always` y convierte borradores en releases públicos. | Separar construcción del candidato y publicación; exigir validaciones, firma y aprobación de la versión antes de exponer artefactos. No disparar el workflow actual para probar el empaquetado. |
| CI comprueba TypeScript, pruebas, build, corpus y bóveda Electron, pero todavía no recuperación Electron ni todos los gates de recuperación normativa. | Ampliar CI y registrar resultados por commit. Comprobar el manifiesto antes de regenerarlo para no ocultar desajustes. |
| El preflight estricto falla por falta de identidad de firma. | Configurar firma y verificar el ejecutable resultante; la presencia de una variable de entorno por sí sola no acredita una firma válida. |
| La evidencia extensa de UX depende de `scratch/` y `reports/`, que no se versionan. | Convertir los recorridos esenciales en pruebas mantenidas y conservar evidencia de aceptación fuera de carpetas temporales. |
| `audit:legal-knowledge` informa incumplimientos, pero sólo devuelve error por ellos con `--strict`. | Exigir `npm run audit:legal-knowledge:strict` y comprobar que un incumplimiento controlado bloquea CI. Los resultados históricos sin ese modo no acreditan el nuevo gate. |
| El respaldo portátil ya se cifra con contraseña y la interfaz puede restaurarlo. El ensayo en otro perfil de Windows sigue pendiente. | Probar exportación y restauración en otro perfil, con conflictos, repetición, archivo dañado e interrupción. |
| La descarga de MiniLM no fija una revisión ni verifica hashes esperados del modelo y tokenizador. | Fijar y registrar esos recursos junto con las herramientas de construcción antes de aceptar un instalador. |

### Fase 0 — Preservar la entrega y preparar la rama

- [ ] **Codex:** registrar el estado y actualizar las referencias remotas antes de calcular la diferencia real con `origin/main`; revisar divergencias y protección de ramas.
- [ ] **Codex:** crear `desarrollo` desde el estado local más reciente, que incluye `24b46bf`, si no existe, conservando también las modificaciones posteriores. Si ya existe en el remoto, recuperarla e integrar los commits locales y el `main` remoto mediante merges normales, resolviendo conflictos y conservando el trabajo de ambas ramas. No hacer `reset --hard` ni force push para acomodar esta entrega.
- [ ] **Codex:** incorporar esta revisión del relevo, mantener commits pequeños por tema y preparar el PR borrador `desarrollo → main`. Los tres commits registrados deben figurar en el alcance del PR cuando aún no estén en el destino remoto.
- [ ] **Tú:** confirmar el repositorio definitivo de distribución, facilitar los permisos necesarios y definir quién aprueba el PR y quién autoriza la publicación. Confirmar versiones de Windows soportadas y equipos mínimos de prueba.
- [ ] **Tú:** iniciar en paralelo la disponibilidad de firma, claves de prueba y entorno Windows limpio; son dependencias de las fases 2 a 4.

**Salida:** rama de trabajo con historia preservada, alcance de Windows acordado y destino de publicación identificado. No es necesario mover o borrar la rama `main` local para abrir un PR desde `desarrollo`.

### Fase 0 bis — Preparar controles y construcción sin publicación

Esta preparación precede a la limpieza y las correcciones para que sus resultados queden comprobados desde el primer cambio. Las claves de proveedores y la firma pueden seguir pendientes; no impiden preparar CI, pero sí completar las validaciones que las requieren.

- [x] **Codex:** ampliar CI con recuperación Electron en Windows, pruebas de bóveda bajo Node y Electron, integridad del corpus, `audit:legal-knowledge:strict`, recuperación normativa y fundamentación. Comprobar el manifiesto versionado antes de cualquier regeneración. Preparar carga de logs y reportes sanitizados asociados al SHA, sin perfiles ni datos sensibles. Implementado y ejecutado localmente; la ejecución y carga alojadas siguen pendientes.
- [x] **Codex:** comprobar en una copia temporal aislada que un incumplimiento controlado del conocimiento jurídico y un manifiesto alterado producen código de salida distinto de cero y bloquean el trabajo correspondiente. Registrar también la ejecución correcta con recursos intactos; no alterar el corpus de trabajo para este ensayo.
- [x] **Codex:** separar el flujo de construcción del de publicación, usar `--publish never` para candidatos y retirar la conversión automática de borradores a públicos. La publicación debe consumir los artefactos aceptados y verificar sus hashes, sin reconstruirlos; un tag o una ejecución manual no debe omitir los gates. Implementado; promoción real no ejecutada.
- [x] **Codex:** preparar preflight estricto, firma y verificación del resultado como requisitos del candidato distribuible. Conservar explícitamente pendientes los pasos que requieran credenciales; un paquete de diagnóstico sin firma no acredita la aceptación del candidato.
- [ ] **Codex:** fijar la revisión de MiniLM y verificar hashes esperados del modelo y tokenizador. Registrar versiones efectivas de Node, npm, Electron, empaquetador y entorno de construcción, además del lockfile y los hashes de recursos. Verificar que una construcción limpia usa los recursos identificados; no exigir igualdad binaria de firmas con sellos de tiempo diferentes.
- [ ] **Tú:** configurar las protecciones de `main`, designar los checks requeridos y habilitar permisos de CI. Facilitar por el mecanismo de secretos del repositorio las credenciales de firma y entrega cuando estén disponibles, y confirmar la identidad del editor.

La revisión y los hashes de MiniLM, la descarga limpia y el registro de herramientas ya están implementados y comprobados. La casilla de reproducibilidad completa queda abierta hasta construir el candidato desde un checkout limpio y verificarlo con firma real. Las casillas de preparación técnica no acreditan esos hitos externos ni los hallazgos abiertos de las fases posteriores.

**Salida:** controles automáticos preparados, fallos que bloquean comprobados y construcción desacoplada de publicación. Las fases posteriores aportan sus nuevas regresiones a estos controles.

### Fase 1 — Depurar código, archivos y carpetas

- [x] **Codex:** elaborar un inventario de candidatos con ruta, tamaño cuando aplique, estado Git, referencias, uso en compilación/instalador/CI, decisión propuesta y comprobación posterior. Separar errores funcionales, código sin uso, documentación antigua y artefactos regenerables. Inventario inicial de 15 áreas conservado en la evidencia técnica; no acredita análisis exhaustivo de código muerto.
- [ ] **Codex:** clasificar cada candidato como necesario para publicar o mantenimiento aplazable, con motivo y responsable. Cerrar el alcance de esta entrega; archivar capturas, consolidar pruebas válidas o limpiar cachés no bloquea la publicación salvo que afecte un gate obligatorio. Registrar los aplazamientos y su condición de revisión sin marcar esas tareas como ejecutadas.
- [ ] **Codex:** buscar imports, exportaciones, componentes, tipos, canales IPC, scripts npm y dependencias sin uso. Revisar llamadas dinámicas, imports diferidos, recursos cargados por ruta y módulos nativos antes de declarar algo inservible. Retirar sólo lo que tenga evidencia de no uso; actualizar `package-lock.json` al cambiar dependencias.
- [ ] **Codex:** depurar concurrencia y manejo de errores en guardado, recuperación, eliminación y generación; revisar respuestas tardías, duplicación de lógica, conversiones de tipos inseguras y promesas sin manejar. Cada corrección funcional debe tener una regresión comprobable.
- [ ] **Codex:** comprobar solapamientos entre pruebas de `tests/` y pruebas junto a `src/`; consolidar sólo duplicados reales y conservar escenarios distintos. `npm run lint` hoy sólo comprueba TypeScript: no acredita por sí mismo ausencia de código muerto.
- [ ] **Codex:** ejecutar la limpieza por grupos revisables. Para eliminar o mover carpetas en Windows, resolver y verificar que cada ruta absoluta esté dentro del proyecto o del directorio de prueba previsto; evitar operaciones recursivas sobre rutas no verificadas.
- [ ] **Tú:** indicar qué capturas, documentación histórica o evidencias necesitas conservar para producto, soporte o auditoría. Validar cambios que retiren una función visible o alteren compatibilidad; la limpieza técnica rutinaria corresponde a Codex.

| Candidato o área concreta | Tratamiento previsto |
| --- | --- |
| `screens-electron/` | Contiene capturas versionadas de septiembre de 2026. Revisar referencias y utilidad; archivar las necesarias fuera del paquete y retirar duplicados sin valor vigente. No declarar toda la carpeta obsoleta por su fecha. |
| `scratch/` | Conservar primero los recorridos útiles en `tests/` o `scripts/`. Después, retirar perfiles y ensayos temporales identificados; comprobar que no contengan la única copia de evidencia o trabajo. |
| `reports/` | Guardar la evidencia de aceptación vinculada al commit y versión en almacenamiento de artefactos. Limpiar ejecuciones antiguas o duplicadas una vez preservada la evidencia necesaria. |
| `out/`, futuros `release/` y `build/` | Artefactos regenerables: reconstruir desde una copia limpia. Conservar instaladores firmados, hashes y manifiestos que se hayan usado para aceptación o publicado. |
| `.npm-cache/` y `node_modules/` | Caché y dependencias locales, no código obsoleto. Su borrado es mantenimiento opcional; no es una condición para publicar. Validar reproducibilidad con `npm ci` en un entorno limpio. |
| `CLAUDE.md`, README y documentación de arquitectura | Corregir referencias a rutas inexistentes como `renderer/services/` y `renderer/lib/case-access.ts`, cifras antiguas y descripciones desactualizadas de la publicación. Distinguir estado actual de registro histórico. |
| Rutas heredadas, normalización de Portafolio y migraciones de cifrado | Conservar mientras protejan datos o navegación de versiones anteriores. Retirar sólo con una política de compatibilidad definida y pruebas con perfiles antiguos. |
| `legal-runtime/corpus/`, `legal-runtime/lance_data/`, modelos MiniLM, `resources/` y assets de marca | Son recursos del producto, varios versionados y empaquetados. No eliminar archivos internos de LanceDB ni modelos por parecer generados o grandes. Cualquier reconstrucción debe usar los scripts mantenidos y validar manifiesto y consultas. |
| Referencias a un LLM local y configuraciones de otras plataformas | El LLM local está fuera del producto; retirar código activo residual si se encuentra y carece de dependientes. Conservar las decisiones históricas útiles y no confundir MiniLM de búsqueda con un modelo generativo. |

**Salida:** inventario clasificado, todos los elementos necesarios para publicar resueltos y mantenimiento aplazado identificado; cambios revisables, ninguna referencia rota y pruebas/build correctos desde una instalación limpia. Cada eliminación debe tener justificación; una carpeta ignorada por Git no es automáticamente descartable. Un aplazamiento de mantenimiento no permite omitir gates obligatorios.

### Fase 2 — Seguridad, continuidad, rendimiento y experiencia

- [ ] **Codex:** auditar CSP efectiva en el renderer empaquetado y resolver las directivas ignoradas en `meta`. Comprobar aislamiento de contexto, sandbox, navegación, enlaces externos y protocolo `lexcorp://`; validar remitente, esquema y límites de cada canal IPC, no sólo los canales nuevos de recuperación.
- [ ] **Codex:** probar exportación y extracción PDF/DOCX, rutas y nombres de archivo, archivos dañados y excesivos, temporales, cifrado, eliminación, conservación, respaldos y trazas. Comprobar que errores y logs no expongan claves ni contenido documental innecesario. Documentar qué datos incluye el respaldo y cómo se recuperan bajo otro perfil de Windows.
- [x] **Codex + tú:** definir la protección del respaldo portátil y su alcance. Decisión del 17 de octubre de 2026: contraseña de al menos 8 caracteres; incluye asuntos, documentos, análisis, borradores y estado; excluye la clave de IA y la redacción pendiente. La interfaz explica que la protección es la contraseña, no el cifrado de Windows.
- [ ] **Codex:** implementar la restauración del respaldo y probar exportación → restauración en otro perfil de Windows → comparación de contenido, adjuntos y relaciones. Cubrir respaldo corrupto o incompleto, formato incompatible, importación repetida, conflictos de identidad e interrupción sin dañar el Portafolio previo. Si se adopta cifrado portátil, probar también contraseña incorrecta y recuperación con la correcta. Registrar los datos excluidos; crear un JSON por sí solo no acredita recuperación.
- [ ] **Codex:** revisar dependencias de producción y empaquetado, vulnerabilidades y licencias; corregir hallazgos críticos/altos aplicables y documentar el tratamiento del resto. Verificar que el instalador no incluya perfiles personales, claves, informes privados ni herramientas temporales.
- [ ] **Codex:** ampliar pruebas de cierre y recuperación a eliminación durante guardado, fallo de cifrado, archivo de recuperación corrupto, proceso terminado y reinicio por actualización. Para Revisar y peticiones de IA en curso, implementar conservación o aviso explícito de interrupción; no prometer reanudación que no exista.
- [ ] **Codex:** medir arranque frío y caliente, memoria en reposo y tras uso, leyes extensas, búsquedas, revisión y exportaciones. Registrar equipo, versión, corpus y al menos cinco muestras por recorrido; optimizar sólo después de tener una línea base y repetir las mediciones afectadas.
- [ ] **Codex:** ejecutar regresiones de teclado, foco, diálogos, zoom y escalas de Windows; convertir los recorridos esenciales del ensayo UX temporal en pruebas mantenidas. Facilitar un guion de lector de pantalla y edición manual/IA.
- [ ] **Tú:** acordar, después de medir la línea base y antes de aceptar el candidato, los límites de arranque, memoria y tiempos de respuesta. Registrar cualquier ajuste posterior con motivo y nueva aceptación. Realizar o coordinar la aceptación con lector de pantalla y usuarios de prueba; confirmar que edición, mensajes y recuperación son comprensibles.

**Salida:** hallazgos bloqueantes corregidos, rendimiento documentado y aceptado, y continuidad y accesibilidad verificadas en los escenarios acordados. Las comprobaciones históricas de UX no sustituyen esta regresión.

### Matriz de aceptación de las fases 2 a 6

Cada ejecución debe registrar escenario, resultado esperado, resultado observado, responsable, fecha, SHA de código, entorno, enlace a evidencia y, cuando corresponda, versión y hash del instalador. Los umbrales todavía no acordados se mantienen pendientes; no se completa una casilla sólo por generar un reporte.

| Área | Escenarios y criterio que deben quedar definidos | Evidencia y responsables |
| --- | --- | --- |
| Rendimiento | Arranque frío/caliente, memoria en reposo y tras uso, búsqueda, revisión y exportación; equipo de referencia, al menos cinco muestras por recorrido, mediana, máximo y límites aceptados antes del candidato. | Codex mide y conserva muestras; tú aceptas los límites y resultados. |
| Accesibilidad | Recorridos esenciales con teclado y lector de pantalla acordado; zoom y escalas de Windows identificados; foco visible, controles anunciados y tareas completables sin bloqueos. | Codex prepara guion y regresiones; tú coordinas o realizas la evaluación asistida. |
| Proveedores | Por cada proveedor/modelo: conexión, revisión, generación, fundamentación y errores previstos en fase 3; identificar resultados reales y simulados y comprobar ausencia de filtraciones o reintentos no acotados. | Codex registra resultados sanitizados; tú facilitas cuentas y presupuesto y aceptas la experiencia. |
| Datos y recuperación | Restauración en otro perfil, cierre, actualización y reinstalación; comparación de contenido esperado, sin duplicados ni pérdida de datos confirmados dentro de las garantías documentadas. | Codex automatiza lo posible; ambos verifican el producto instalado. |
| Distribución | Windows y cuenta de prueba identificados, firma válida, instalación/inicio/actualización/desinstalación, descarga y hash; candidato y artefacto final diferenciados. | Codex conserva manifiesto y evidencias; tú aceptas el instalador final identificado por hash. |

### Fase 3 — Proveedores reales e integración de entrega

- [ ] **Tú:** configurar en la aplicación claves de prueba de Gemini, OpenAI y Anthropic, con saldo/permisos y presupuesto acotado; aportar documentos de prueba anonimizados. Mantener claves y credenciales de firma fuera del chat, los commits y los reportes.
- [ ] **Codex:** validar por proveedor conexión, modelos configurados, revisión, generación, fundamentación, clave inválida, cuota agotada, red interrumpida y timeout. Registrar proveedor/modelo, escenario y resultado sin secretos; distinguir pruebas reales de errores simulados.
- [ ] **Codex:** verificar operación sin API y sin conexión para las funciones locales y comprobar el consentimiento de actualizaciones y de envío al proveedor.
- [ ] **Codex:** incorporar a CI las regresiones de las fases 1 y 2 y comprobar los flujos preparados en la fase 0 bis con las credenciales disponibles: preflight estricto, firma y verificación del candidato sin publicación. Mantener pendientes los escenarios reales que no se hayan podido ejecutar.
- [ ] **Codex:** `publish.owner` ya es `Julio-Patron`. Falta comprobar en GitHub los permisos del token y el canal de electron-updater, separar versiones candidatas de estables y validar que un tag o una ejecución manual no pueda saltarse los gates.

**Salida:** los tres proveedores validados, CI reproducible y publicación desacoplada de la construcción del candidato. La falta de firma o credenciales reales mantiene las tareas correspondientes abiertas.

### Fase 4 — Candidato firmado y aceptación en Windows limpio

- [ ] **Codex:** preparar la versión candidata y mantener coherentes `package.json`, lockfile, notas y metadatos. Ejecutar los gates sobre el commit candidato y generar el instalador NSIS x64 firmado sin publicarlo. Revisar firma, identidad del editor, sello de tiempo y recursos incluidos en ejecutable e instalador.
- [ ] **Tú:** disponer de una VM o equipo limpio para cada versión de Windows soportada, con usuario estándar; facilitar acceso o ejecutar el guion que prepare Codex. Aportar una versión anterior soportada para el ensayo de actualización, si existe.
- [ ] **Codex + tú:** verificar instalación, rutas con espacios y caracteres acentuados, accesos directos, protocolo, primera apertura y uso local sin red. Codex prepara automatización y recoge resultados; tú confirmas los comportamientos visibles, avisos de Windows y aceptación funcional.
- [ ] **Codex + tú:** probar actualización desde la versión anterior con borrador pendiente y datos existentes, fallo o interrupción de actualización, reinicio y conservación de claves y Portafolio. Si aún no existe una versión anterior distribuida, construir un par de candidatos de prueba para ejercitar el actualizador y registrar esa limitación.
- [ ] **Codex + tú:** probar desinstalación y reinstalación; comprobar la conservación de datos configurada (`deleteAppDataOnUninstall: false`) y que la opción de eliminación dentro de la aplicación sí retire los datos que promete eliminar.
- [ ] **Codex:** producir notas de versión, inventario de artefactos, SHA-256 del instalador ya firmado y manifiesto con versión, commit, corpus, plataforma, firma y resultados. Documentar instalación, actualización, respaldo/recuperación, incidencias conocidas y procedimiento de retirada de una versión defectuosa.
- [ ] **Codex + tú:** ensayar en el canal de prueba la retirada de una versión y la atención a quienes ya la instalaron. Definir quién detiene la distribución, cómo se comunica la incidencia y cómo se entrega una corrección conservando datos. No asumir que retirar un release revierte instalaciones; cualquier regreso a una versión anterior requiere comprobar compatibilidad y restauración previamente.
- [ ] **Tú:** revisar textos de privacidad, términos, identidad comercial, contacto de soporte y canal de descarga; obtener la revisión profesional que corresponda. Dar aceptación funcional al candidato probado.

**Salida:** candidato firmado trazable y aceptado, sin fallos bloqueantes. El instalador probado queda reservado como evidencia; cualquier modificación posterior obliga a reconstruir y repetir las pruebas afectadas.

### Fase 5 — PR y merge a main

- [ ] **Codex:** actualizar `desarrollo` con el `origin/main` vigente, resolver conflictos y volver a comprobar el candidato resultante. Confirmar que el PR contiene únicamente cambios previstos y que no incorpora recursos personales, secretos o artefactos temporales.
- [ ] **Codex:** presentar el PR con problema resuelto, comportamiento final, inventario de limpieza, compatibilidad, pruebas, pendientes no bloqueantes y enlaces a evidencias. Mantener el PR como borrador mientras falte algún requisito de las fases anteriores.
- [ ] **Tú:** revisar o asignar revisión del PR, aceptar las decisiones de producto y soporte y autorizar el merge cuando los checks y la aceptación de Windows estén completos.
- [ ] **Codex:** ejecutar el merge cuando esté autorizado y conforme a las reglas del repositorio; registrar el SHA resultante. No usar push directo a `main` para eludir el PR.
- [ ] **Codex:** repetir los gates automáticos sobre el SHA integrado y construir desde él los artefactos finales firmados. Comparar con el candidato aceptado el código que llega al producto, dependencias, corpus, modelo/tokenizador, configuración y versiones de herramientas. Registrar las diferencias y recalcular los hashes del paquete final.
- [ ] **Codex + tú:** si esos insumos coinciden y sólo cambia la identidad del commit o el sello de firma, repetir instalación, inicio, actualización y verificación de firma/hash sobre el binario final, justificando qué evidencia funcional se reutiliza. Si hay diferencias funcionales, repetir las pruebas afectadas y su aceptación; si el impacto no puede delimitarse, repetir la matriz completa aplicable. La aprobación final debe identificar el hash del instalador que se publicará.

**Salida:** `main` remoto contiene la entrega revisada, sus checks están correctos y los artefactos finales son trazables al commit integrado. El merge por sí solo no publica Windows.

### Fase 6 — Checklist final previo a publicar Windows

**A cargo de Codex:**

- [ ] Confirmar que el SHA final pasó `npm run lint`, `npm test`, `npm run build`, `npm run test:vault:electron` y `npm run test:recovery:electron`. Para cubrir los dos ABI, ejecutar primero las pruebas Node con SQLite preparado para Node y luego recompilar con `npm run predev:electron` para las pruebas Electron; justificar cualquier omisión, sin dar por cubiertas las 10 pruebas omitidas en la validación histórica.
- [ ] Confirmar `npm run audit:corpus-governance:strict`, `npm run audit:legal-knowledge:strict`, `npm run audit:legal-retrieval` y `npm run eval:legal-rag`, con sus evidencias y sin modificar el corpus después de validarlo. El comando de conocimiento sin `:strict` no sustituye este gate.
- [ ] Confirmar pruebas reales de los tres proveedores, cierre de los hallazgos de seguridad y aceptación de rendimiento, accesibilidad y Windows limpio.
- [ ] Confirmar `npm run preflight:release:strict` y el empaquetado de `npm run build:electron` en el flujo preparado sin publicación automática. El prehook puede regenerar recursos: comprobar el diff y los gates de corpus tras esa preparación; si cambia un archivo versionado, incorporarlo y validar un nuevo commit antes de etiquetar.
- [ ] Verificar firmas, hashes, manifiesto, versión/tag, notas, instalador, metadatos de actualización y repositorio de destino. Probar las descargas y el feed en el canal de ensayo antes de activar la versión estable.
- [ ] Confirmar restauración del respaldo, matriz de aceptación, comparación del candidato con los insumos finales y ensayo de retirada. Incluir revisión/hashes del modelo y tokenizador y versiones de las herramientas en el manifiesto.
- [ ] Dejar preparado el release para revisión con los artefactos finales; publicar y enviar el tag únicamente después de la autorización correspondiente. Promover exactamente los archivos aceptados, verificando sus hashes sin reconstruirlos. Tras publicar, verificar descarga, hash y disponibilidad para actualización y registrar la evidencia.

**A tu cargo:**

- [ ] Confirmar titular y destino de distribución, editor firmante y disponibilidad de permisos de publicación y renovación de la firma.
- [ ] Confirmar resultado de las pruebas con tus cuentas de proveedores y el presupuesto/condiciones de uso que se comunicarán al usuario.
- [ ] Aceptar el instalador final identificado por hash en los Windows soportados, incluidas las pruebas requeridas tras el merge, instalación, actualización, desinstalación, protección/restauración del respaldo y política de conservación de datos.
- [ ] Aprobar versión estable, notas, limitaciones conocidas, términos, privacidad, contacto de soporte y página o canal de descarga.
- [ ] Autorizar explícitamente la publicación de los artefactos identificados por versión, SHA de código y hash del instalador. La aceptación del PR y esta autorización son hitos distintos.
- [ ] Designar quién atenderá incidencias y quién puede retirar una versión o pausar su distribución si aparece un problema bloqueante.

**Criterio de publicación:** todos los gates de [arquitectura de procesamiento](arquitectura-procesamiento-y-gate-publicacion.md) y las casillas aplicables están acreditados para la versión final. Una tarea no aplicable requiere motivo, responsable y aceptación registrada; esto no permite omitir los gates obligatorios. No se marca completa una tarea por haber pasado en un commit anterior ni por quedar fuera del entorno disponible.

## Decisiones de producto y diseño

- La generación utiliza exclusivamente BYOK mediante Gemini, OpenAI o Anthropic. El corpus, la recuperación normativa, las reglas deterministas y la bóveda siguen siendo locales. La decisión rectora está en [arquitectura de procesamiento](arquitectura-procesamiento-y-gate-publicacion.md).
- La interfaz y los mensajes se mantienen en español. Se conservan la paleta tinta, papel y oro y las fuentes Manrope y Playfair Display.
- Se utiliza el símbolo original. `BrandWatermark` aplica una mezcla de CSS sobre el recurso existente para mostrarlo translúcido en Inicio, Portafolio vacío y Acerca de. Es decorativo y no intercepta clics.
- Inicio presenta tres tareas breves, hasta tres elementos recientes y un estado compacto. La falta de API es una opción normal; los fallos reales de recursos locales conservan su aviso y acceso a Configuración.

## Cambios y puntos de entrada

| Área | Comportamiento actual | Archivos principales |
| --- | --- | --- |
| Marca y navegación | Logo mayor, barra compacta en ventanas pequeñas y preferencia conservada al ampliar. | `src/renderer/components/BrandWatermark.tsx`, `components/layout/Sidebar.tsx`, `features/home/HomePage.tsx` |
| Teclado y diálogos | Selectores con flechas e Inicio/Fin; un punto de entrada con Tab; fondo inactivo y foco en el diálogo superior; Escape cierra ese diálogo. | `components/ui/RadioGroup.tsx`, `components/ui/Modal.tsx`, `components/layout/HelpPanel.tsx` |
| Redacción manual | La plantilla abre como documento legible; Completar documento lleva al editor. El flujo manual muestra dos pasos pertinentes. | `features/drafting/DraftingPage.tsx`, `features/drafting/DraftDocument.tsx` |
| Guardado | Las ediciones hechas durante una escritura se conservan. El autoguardado compara título y texto antes de marcar el trabajo como guardado. | `components/layout/AppEffects.tsx`, `features/drafting/DraftingPage.tsx` |
| Continuidad | Inicio permite retomar trabajo pendiente. Abrir otro documento exige confirmar la sustitución de cambios sin guardar; abrir el mismo conserva su versión actual. | `hooks/usePortfolioActions.ts`, `lib/drafting.ts`, `features/portfolio/PortfolioPage.tsx` |
| Citas normativas | Una cita se añade al documento abierto. Sin documento se crea uno local de referencias; un formulario en preparación conserva sus datos e incorpora la fuente a sus instrucciones. | `store/useWorkspaceStore.ts`, `features/laws/useSendArticleToDraft.ts` |
| Recuperación de errores | Biblioteca, búsquedas y Portafolio distinguen los fallos de los estados vacíos y permiten reintentar. Sólo la búsqueda más reciente actualiza los resultados. | `features/laws/LawsPage.tsx`, `features/portfolio/PortfolioPage.tsx` |
| Desarrollo | Ambos comandos de desarrollo usan el mismo lanzador y preparan SQLite para Electron mediante su prehook. | `scripts/dev-desktop.mjs`, `package.json`, `README.md` |

Las rutas abreviadas de la tabla parten de `src/renderer/`. Los documentos locales de referencias utilizan `generatedWith: 'manual'`; la normalización del Portafolio conserva ese origen. No hay cambio de esquema de SQLite.

## Abrir la herramienta y ejecutar comprobaciones

Desde la carpeta que contiene `package.json`:

```powershell
npm ci
npm run dev:desktop
```

`npm ci` se necesita para la primera instalación o para restaurar dependencias. El comando de desarrollo abre la ventana y mantiene la recarga de la interfaz mientras la terminal permanece abierta. `Ctrl+C` detiene el modo de desarrollo. `npm run dev:electron` utiliza el mismo lanzador.

El lanzador resuelve la raíz a partir de su archivo, localiza la CLI instalada y elimina `ELECTRON_RUN_AS_NODE` únicamente del entorno del proceso hijo. Conserva los argumentos adicionales y propaga el código de salida. Se comprobó una apertura visible con esa variable heredada en `1` y la ejecución del lanzador desde otra carpeta mediante sus pruebas.

Las comprobaciones se ejecutan por separado:

```powershell
npm run lint
npm test
npm run build
npm run test:vault:electron
```

Node disponible durante la entrega: `24.21.0`; npm: `12.2.0`. `package.json` autoriza por nombre y versión los scripts de instalación de los módulos necesarios. Al actualizar dependencias, revisar esas autorizaciones.

`better-sqlite3` sólo puede quedar preparado para un ABI a la vez. Con la compilación para Electron, las pruebas de bóveda bajo Node se omiten. Para ejecutarlas, cerrar primero la aplicación de desarrollo y usar:

```powershell
npm rebuild better-sqlite3 --cache .npm-cache
npm test
npm run predev:electron
npm run test:vault:electron
```

## Validación registrada

| Comprobación | Resultado |
| --- | --- |
| TypeScript y revisión de diferencias | Correctos. |
| Compilación de main, preload y renderer | Correcta después de los cambios de interfaz. |
| Suite tras añadir el lanzador | 164 pruebas aprobadas y 10 omitidas por el ABI de SQLite; 174 en total. |
| Bóveda en Electron real | Correcta: 1,000 ciclos de guardado, reapertura, eliminación y conservación. |
| Recorrido automatizado local de UX | 38 comprobaciones aprobadas y 35 capturas, con perfil aislado. |
| Apertura con el nuevo comando | Ventana Lex Corporativo visible con `ELECTRON_RUN_AS_NODE=1` en el entorno de origen. |

Las siete pruebas nuevas versionadas cubren continuidad de citas, formularios en preparación, documentos manuales, detección de trabajo pendiente y comportamiento del lanzador. Están en `src/renderer/store/useWorkspaceStore.test.ts` y `tests/dev-desktop-launcher.test.ts`.

El recorrido de UX incluyó edición y guardado concurrentes, PDF y Word con cabeceras válidas, reapertura, cancelación de sustitución, citas sin IA, revisión básica real, búsqueda real, teclado, diálogos anidados y ventanas cercanas a 1400 × 900, 1024 × 768 y 720 × 600. Los fallos de servicios y las respuestas fuera de orden se simularon para comprobar la recuperación.

## Evidencias locales

En este equipo están disponibles:

- `reports/ux-ui/refinement.html`: auditoría de marca y recorridos, con comparativas.
- `reports/ux-ui/refinement/audit.json`: comprobaciones y dimensiones efectivas.
- `reports/ux-ui/refinement/`: capturas y exportaciones de prueba.
- `reports/ux-ui/index.html`: revisión anterior de UX y UI.
- `scratch/ux-audit.ts` y `scratch/ux-audit-launch.mjs`: recorrido temporal de Electron utilizado para la auditoría.

`reports/`, `scratch/`, `out/`, `node_modules/` y `.npm-cache/` están excluidos del control de versiones. Estas evidencias y el recorrido temporal no forman parte de CI y no estarán disponibles en un clon nuevo. Para repetir el recorrido local si se conservan esos archivos, compilar y ejecutar:

```powershell
npm run build
$env:AUDIT_PHASE = 'refinement'
node scratch/ux-audit-launch.mjs
```

En otro equipo, reproducir los escenarios de la sección de validación o trasladar la automatización temporal a un soporte mantenido antes de depender de ella como gate.

## Prioridades para continuar

1. **Cierre y recuperación:** la redacción se recupera al cerrar, recargar y reiniciar, incluso con una escritura en curso, mediante la prueba mantenida descrita arriba. Falta comprobar el flujo durante una actualización instalada y decidir la recuperación de Revisar y de operaciones de IA en curso.
2. **Seguridad:** revisar la aplicación efectiva de CSP. Chromium informó que `frame-ancestors` y `report-uri` se ignoran al declararse mediante `meta`. Continuar con IPC, exportaciones, navegación externa, cifrado, respaldos y trazas. Esta revisión de UX no acredita esos controles.
3. **Rendimiento:** medir arranque frío y caliente, memoria, apertura de leyes extensas, búsqueda y exportación antes de modificar recursos o límites.
4. **Proveedores reales:** validar conexión, generación, errores y modelos disponibles con Gemini, OpenAI y Anthropic mediante claves configuradas en la aplicación. Los recorridos realizados no utilizaron claves reales.
5. **Accesibilidad:** validar lector de pantalla, zoom y Windows con distintos factores de escala. El teclado y el foco están comprobados; falta la evaluación asistida.
6. **Edición de documentos:** contrastar con usuarios la edición avanzada en Markdown y la separación entre edición manual y personalización mediante IA.

Antes de publicar, completar los gates de [arquitectura de procesamiento](arquitectura-procesamiento-y-gate-publicacion.md). Consultar el manifiesto del corpus para las cifras vigentes: algunos documentos de arquitectura conservan inventarios históricos.
