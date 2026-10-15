# Relevo de interfaz e interacción de Lex Corporativo

Fecha de corte: 15 de octubre de 2026. Versión del producto: `1.0.0-rc.16`.

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

La entrega se prepara en la rama `main`, sobre el commit base `188839e`. Incluye los cambios de la revisión visual, las correcciones de interacción, las autorizaciones de instalación de dependencias nativas y el lanzador de desarrollo. La versión del producto permanece igual.

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
