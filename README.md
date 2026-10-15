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
```

La gobernanza del corpus se valida con:

```bash
npm run ingest:local:offline
npm run manifest:legal-corpus
npm run audit:corpus-governance:strict
```

## Empaquetado

```bash
npm run preflight:release
npm run build:electron
```

El instalador incluye el corpus jurídico, LanceDB y MiniLM. No incluye un LLM ni un motor generativo local. Antes de publicar se debe validar una instalación limpia, una API key de cada proveedor soportado, firma, actualización y desinstalación.

La decisión de producto y sus gates están en [docs/arquitectura-procesamiento-y-gate-publicacion.md](docs/arquitectura-procesamiento-y-gate-publicacion.md).
