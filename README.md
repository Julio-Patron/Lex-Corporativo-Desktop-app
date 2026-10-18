# Lex Corporativo Desktop

Aplicación Electron de trabajo jurídico para materias mercantil, corporativa y fiscal mexicana. La aplicación conserva localmente el portafolio, el corpus, LanceDB, los embeddings de búsqueda y la trazabilidad; las funciones generativas utilizan exclusivamente una API key aportada por el usuario (BYOK).

## Arquitectura

- Electron Main y Preload: IPC, archivos, actualizaciones, BYOK y controles de seguridad.
- React: navegación, portafolios y flujos jurídicos.
- SQLite: bóveda local cifrada de asuntos, análisis, borradores y estado.
- LanceDB + MiniLM: recuperación local de normativa y fragmentos documentales temporales.
- BYOK: generación mediante Gemini, OpenAI o Anthropic con API key cifrada por el sistema operativo.
- Validación local: citas, afirmaciones, fuentes y trazabilidad mediante hashes.

Sin una API key válida se mantienen disponibles el portafolio, los formularios, la revisión básica por reglas y la búsqueda normativa. La generación de texto y la revisión con IA requieren BYOK.

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

El recorrido visual requiere también `npm run build` actualizado. `npm run test:ui:electron` comprueba pantallas, formularios, ayuda, lectores, reserva del área de controles de ventana y sidebar con foco emulado. Usa un perfil temporal independiente y guarda capturas e informe en `reports/ux-ui/validation-<SHA>-<ejecución>/`, o en `reports/ux-ui/<LEX_UI_EVIDENCE_ID>/` si se proporciona ese identificador. CI asigna su propio identificador con SHA y ejecución. El informe también registra SHA y estado del árbol, conservando la evidencia anterior. Cubre ventanas de 1400 × 900, 1024 × 768 y 720 × 600, con zoom del 80 %, 100 % y 150 % en combinaciones seleccionadas. Las capturas corresponden al renderer; no sustituyen las pruebas del instalador, los clics en controles nativos ni el cambio de escala entre monitores de Windows.

La gobernanza se valida sobre el manifiesto versionado, sin regenerarlo antes:

```bash
npm run audit:corpus-governance:strict
npm run audit:legal-knowledge:strict
npm run audit:legal-retrieval
npm run eval:legal-rag
npm run test:legal-gates
npm run verify:embeddings
```

Sólo después de un cambio intencional del corpus se ejecutan `ingest:local:offline` y `manifest:legal-corpus`; revisar el diff y validar un nuevo commit. `test:legal-gates` altera una copia temporal para comprobar que los controles rechazan un manifiesto incoherente y un ancla jurídica ausente.

Los mismos controles de CI se pueden ejecutar con `npm rebuild better-sqlite3` y `npm run ci:quality`, seguidos de `npm run ci:windows`. El segundo comando prueba Node antes de preparar SQLite para Electron. Las omisiones por ABI bloquean CI. Los logs sanitizados y reportes permitidos se guardan en `reports/ci/`; el resumen distingue SHA base y árbol modificado. `npm run audit:cleanup` inventaría archivos sin eliminarlos; `npm run audit:performance:electron` mide cinco procesos con datos sintéticos después de compilar y preparar Electron.

## Empaquetado

```bash
npm run preflight:release:strict
npm run build:electron
```

El instalador incluye el corpus jurídico, LanceDB y MiniLM. No incluye un LLM ni un motor generativo local. Antes de publicar se debe validar una instalación limpia, una API key de cada proveedor soportado, firma, actualización y desinstalación.

La construcción local usa `--publish never`. `.github/workflows/release.yml` ejecuta todos los controles de CI y construye un candidato firmado, sin publicarlo. El preflight estricto exige recursos íntegros, certificado, huella esperada del editor y repositorio de distribución confirmado. Los hashes del modelo y tokenizador y su revisión están en `legal-runtime/embeddings.lock.json`.

Configurar el entorno `windows-signing` con los secretos `WINDOWS_CSC_LINK` y `WINDOWS_CSC_KEY_PASSWORD`, y las variables `WINDOWS_CERTIFICATE_SHA1` y `DISTRIBUTION_REPOSITORY`. `DISTRIBUTION_REPOSITORY` es `Julio-Patron/Lex-Corporativo-Desktop-app`, el mismo valor que `publish.owner` / `publish.repo` y que el repositorio del workflow. El primer release es el instalador NSIS firmado, publicado desde la página de descarga del responsable. La Microsoft Store no cierra ese release.

La publicación se ejecuta por separado desde `main`, mediante `.github/workflows/publish.yml` y el entorno protegido `windows-publication`, con las mismas dos variables públicas. Debe tener revisores requeridos y restringirse a `main`. Recibe ID del workflow exitoso, SHA completo, tag existente y SHA256 del manifiesto aceptado. Descarga, verifica firma y hashes y promueve exactamente esos archivos, sin reconstruir. Un tag sólo construye; no publica. La aceptación comprende Windows instalado, proveedores, seguridad y datos; pasar CI no sustituye esos controles. Configurar estas protecciones y secretos en GitHub sigue pendiente; no se habilitaron desde el repositorio local.

La decisión de producto y sus gates están en [docs/arquitectura-procesamiento-y-gate-publicacion.md](docs/arquitectura-procesamiento-y-gate-publicacion.md).
