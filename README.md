# Lex Corporativo Desktop

Aplicación Electron de trabajo jurídico para materias mercantil, corporativa y fiscal mexicana. La aplicación conserva localmente el portafolio, el corpus, LanceDB, los embeddings de búsqueda y la trazabilidad; las funciones generativas utilizan exclusivamente una API key aportada por el usuario (BYOK).

## Arquitectura

- Electron Main y Preload: IPC, archivos, actualizaciones, BYOK y controles de seguridad.
- React: navegación, portafolios y flujos jurídicos.
- SQLite: bóveda local cifrada de asuntos, análisis, borradores y estado.
- LanceDB + MiniLM: recuperación local de normativa y fragmentos documentales temporales.
- BYOK: generación mediante Gemini, OpenAI o Anthropic con API key cifrada por el sistema operativo.
- Validación local: citas, afirmaciones, fuentes y trazabilidad mediante hashes.

Sin una API key válida se mantienen disponibles el portafolio, los formularios, las evaluaciones deterministas, el corpus y la búsqueda normativa; consultas generativas, análisis y redacción permanecen bloqueados.

## Desarrollo

Abre una terminal en la carpeta del proyecto, donde está `package.json`. Instala las dependencias la primera vez y abre la herramienta con:

```bash
npm ci
npm run dev:desktop
```

El comando prepara SQLite para Electron y abre la ventana de Lex Corporativo con recarga de la interfaz al editar. Mantén la terminal abierta mientras trabajas; usa `Ctrl+C` para detener el modo de desarrollo. `npm run dev:electron` es un alias del mismo lanzador.

El lanzador utiliza la raíz del proyecto y elimina `ELECTRON_RUN_AS_NODE` del entorno del proceso hijo para que Electron se ejecute como aplicación de escritorio.

Las comprobaciones se ejecutan por separado:

```bash
npm run lint
npm test
npm run build
npm run test:vault:electron
npm run test:recovery:electron
npm run test:ui:electron
```

La redacción pendiente se recupera al volver a abrir la aplicación mediante una copia local cifrada con el sistema operativo. Incluye texto, título, plantilla, campos e instrucciones; los archivos adjuntos deben volver a seleccionarse. Se borra al guardar el documento, descartarlo o eliminar los datos y respeta el plazo de conservación configurado. Si falla la copia al cerrar o recargar, se ofrece permanecer en la aplicación.

La prueba de recuperación usa ventanas ocultas y un perfil aislado; comprueba recarga, cierre, reinicio de proceso, fallos de escritura y guardado en curso sin duplicados. Las pruebas de Electron requieren SQLite preparado para Electron (`npm run predev:electron`).

El recorrido visual requiere también `npm run build` actualizado. `npm run test:ui:electron` comprueba pantallas, formularios, ayuda, lectores, reserva del área de controles de ventana y sidebar con foco emulado. Usa un perfil temporal independiente y guarda capturas e informe en `reports/ux-ui/layout-after/`. Cubre ventanas de 1400 × 900, 1024 × 768 y 720 × 600, con zoom del 80 %, 100 % y 150 % en combinaciones seleccionadas. Las capturas corresponden al renderer; no sustituyen las pruebas del instalador, los clics en controles nativos ni el cambio de escala entre monitores de Windows.

La gobernanza del corpus se valida con:

```bash
npm run ingest:local:offline
npm run manifest:legal-corpus
npm run audit:corpus-governance:strict
```

## Empaquetado

```bash
npm run preflight:release:strict
npm run build:electron
```

El instalador incluye el corpus jurídico, LanceDB y MiniLM. No incluye un LLM ni un motor generativo local. Antes de publicar se debe validar una instalación limpia, una API key de cada proveedor soportado, firma, actualización y desinstalación.

La decisión de producto y sus gates están en [docs/arquitectura-procesamiento-y-gate-publicacion.md](docs/arquitectura-procesamiento-y-gate-publicacion.md).
