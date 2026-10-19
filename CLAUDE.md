# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Product

Lex Corporativo Desktop is an Electron workstation for Mexican corporate, commercial, labor, foreign-trade/customs, and tax law. Everything stays local (encrypted SQLite vault, legal corpus, LanceDB vector store, MiniLM embeddings, trace ledger). Generative features use the user's own API key only (BYOK: Gemini, OpenAI, or Anthropic). There is no local LLM, and none should be added; this is a product decision recorded in `docs/arquitectura-procesamiento-y-gate-publicacion.md`. With no API key, the portfolio, the deterministic rule-based audits, the corpus reader, and legal search still work.

All user-facing strings, error messages, prompts, code comments and docs are in Spanish. Commits follow Conventional Commits with Spanish descriptions (e.g. `feat(rag): ...`, `fix(ci): ...`). Work happens directly on `main`; there is no long-lived development branch.

## Commands

```bash
npm ci
npm run dev:desktop          # electron-vite dev with HMR; pre-hook rebuilds better-sqlite3 for Electron. Output is mirrored to logs/dev-desktop.log (override with LEX_DEV_LOG_FILE)
npm run lint                 # tsc --noEmit over src/, tests/ and scripts/ (the only lint step; there is no ESLint)
npm test                     # vitest run: src/**/*.test.{ts,tsx} and tests/**/*.test.ts
npm run test:watch
npx vitest run src/main/lib/legal-grounding.test.ts      # one file
npx vitest run -t "nombre del caso"                      # tests matching a name
npm run build                # electron-vite build -> out/
```

Electron-hosted tests (real `safeStorage`/DPAPI, real window). They need `npm run predev:electron` first, and the UI test also needs a fresh `npm run build`:

```bash
npm run test:vault:electron      # bundles case-vault.ts with esbuild and runs it inside Electron
npm run test:recovery:electron   # draft recovery across reload, close, process restart and write failures
npm run test:ui:electron         # screenshots + report under reports/ux-ui/ (several window sizes and zoom levels)
npm run test:release-controls    # node --test tests/release-controls.test.mjs
npm run test:legal-gates         # proves the legal gates fail on a deliberately broken isolated copy
```

The native `better-sqlite3` module can only be built for one ABI at a time. `dev:desktop` and `predev:electron` rebuild it for Electron, and after that `src/main/lib/case-vault.test.ts` skips itself (`describe.skip`) under Node vitest. Run `npm rebuild better-sqlite3` to get the Node build back before running the vault unit tests. Setting `LEX_REQUIRE_NODE_SQLITE=1` turns that skip into a failure (CI does this).

CI (`.github/workflows/ci.yml`) runs `npm run ci:quality` on Ubuntu and `npm run ci:windows` on Windows. Both are driven by `scripts/ci-evidence.mjs`, which holds the ordered script list for each suite and writes sanitized logs plus `summary.json` to `reports/ci/<mode>/`. `quality` validates the committed manifest before anything else, checks pinned embeddings, runs lint, tests, release controls, build, the strict legal-knowledge gate, retrieval and grounding evaluations, and the deliberate gate failures. `windows` runs Node tests before rebuilding for Electron, then vault, recovery and UI tests. Run the same thing locally with `npm rebuild better-sqlite3 && npm run ci:quality` and then `npm run ci:windows`.

### Corpus / RAG pipeline (Node scripts in `scripts/`)

```bash
npm run ingest:local:offline            # rebuild legal-runtime/lance_data from legal-runtime/corpus/*.md (add --laws=CFF,LISR to limit)
npm run manifest:legal-corpus           # regenerate legal-runtime/corpus/corpus-manifest.json (hashes corpus + vector store)
npm run audit:corpus-governance:strict  # CI gate: fails if the manifest is out of sync with the corpus or LanceDB
npm run audit:legal-knowledge:strict | audit:legal-retrieval | eval:legal-rag   # quality probes, written to reports/audits/ (gitignored)
npm run verify:embeddings               # pinned MiniLM hashes vs legal-runtime/embeddings.lock.json
npm run stage:{fiscal,mercantile,documental}-corpus[:download]  then  promote:*-corpus   # official PDF -> staged markdown -> promote
```

The law list, source URLs, verification metadata, and `CORPUS_VERSION` all live in `scripts/legal-corpus-config.mjs`. Any change to `legal-runtime/corpus/*.md` or `legal-runtime/lance_data/` requires re-ingesting and regenerating the manifest, or CI governance fails. Governance is validated against the committed manifest, never after regenerating it.

### Packaging

`npm run preflight:release:strict` verifies resources and their integrity, signing configuration, expected certificate thumbprint and the confirmed distribution repository. `npm run build:electron` validates the committed manifest, prepares the icon and pinned MiniLM resources, rebuilds native modules and packages NSIS x64 with `--publish never`. Tags or manual runs of `.github/workflows/release.yml` first run CI and produce a signed candidate only. `.github/workflows/publish.yml` requires an accepted manifest hash and source SHA, a successful candidate run, an existing matching tag integrated in main, and the protected publication environment; it verifies and publishes those exact files without rebuilding. Signing secrets, repository alignment and GitHub environment protections remain external prerequisites. The full list of release gates is in `docs/arquitectura-procesamiento-y-gate-publicacion.md`.

## Architecture

### Process split

- **`src/main/`**: all privileged work. `index.ts` creates a sandboxed window (`contextIsolation`, no `nodeIntegration`), blocks external navigation and new windows, denies all permission requests, registers the `lexcorp://` OS deep-link protocol (`protocol.ts`, only host `auth`), wires auto-update (off unless the user consents and strict privacy is off), and purges expired cases and temporary document vectors at startup. `menu.ts` builds the native menu.
- **IPC trust boundary**: handlers never import `ipcMain` from `electron`. They import the wrapper in `src/main/ipc/trusted-ipc.ts`, which rejects any message whose sender is not the main window's main frame loading the app document (`Origen no autorizado.`). `index.ts` installs the guard with `setIpcSenderGuard` before registering handlers. Tests that register handlers without a window therefore get closed channels.
- **`src/main/ipc/`**: one `*.handler.ts` per domain (`analyze`, `draft`, `rag`, `vault`, `byok`, `corpus`, `assistant`), each registered from `ipc/index.ts`. `ipc/index.ts` also holds `runtime:get-health` (computes the capability flags the UI gates on), `settings:save-preferences`, trace export, and `csp:report`. `recovery.handler.ts` is registered separately from `main/index.ts` with the same trust check; its `recovery:flush` is the only synchronous IPC, because `beforeunload` cannot await. Every handler validates its raw payload with zod (`*Schema` / `parse*Payload`) before doing anything.
- **`src/preload/index.ts`**: exposes `window.lexDesktop` via `contextBridge`, typed by `src/preload/types.ts` (`LexDesktopAPI`). Adding an IPC channel means touching the handler, `preload/index.ts`, `preload/types.ts`, and the in-memory shim in `src/renderer/dev/browser-preview.ts`, which implements the whole `LexDesktopAPI` so the renderer can be opened in a plain browser during development (installed when `import.meta.env.DEV && !window.lexDesktop`).
- **`src/shared/`**: types and constants imported by both main and renderer: the ecosystem list and prompt profiles (`legal-contracts.ts`), default BYOK models (`byok-models.ts`), case retention options (`case-retention.ts`, 0/30/90 days), the draft recovery schema, and the CSP (`content-security-policy.ts`).
- **`src/renderer/`**: React 19 + react-router (`HashRouter`) + zustand + Tailwind 4. The renderer never touches Node or the filesystem. Features, hooks and stores call `window.lexDesktop.*` directly; there is no `services/` directory. Routes: `/` (Buscador, legal search), `/estudio/{auditar,generar,portafolio}` (review, drafting, portfolio under `EstudioLayout`), `/leyes`, `/configuracion`, `/privacidad`, `/terminos`. Old paths are mapped in `lib/routes.ts`; add a redirect there when renaming a route. DOCX and PDF files are generated in the renderer (`lib/docx-generator.ts`, `lib/pdf-generator.ts`) and passed as base64 to `vault:export-*` for saving. Drafting templates ("machotes") live in `lib/constants.ts` and `lib/template-bodies.ts`. `lib/legal-search-routing.ts` guesses the ecosystem from a free-text query with regex patterns.

### Content Security Policy

The single source is `src/shared/content-security-policy.ts`. The same policy is embedded as a `<meta>` in `src/renderer/index.html` (the only thing that applies to a `file://` document) and sent as a response header by `src/main/csp.ts` (adds `frame-ancestors 'none'`). `connect-src` is `'self' lexcorp:`, so provider network calls must go through main. In dev, `electron.vite.config.ts` computes the React Refresh preamble hash and injects it into `script-src` of both the meta and the header. Violations are caught in the renderer via `securitypolicyviolation` and sent to `csp:report`, which logs them to the trace ledger.

### Legal ecosystems

There are five ecosystems (`mercantil`, `laboral`, `comercio_exterior`, `aduanal`, `fiscal`), defined in `src/shared/legal-contracts.ts`. Each maps to the law codes it may cite through `MODULE_ALLOWED_LAW_CODES` in `src/main/lib/prompts.ts`. The same file also provides system and draft instructions per ecosystem. Vault cases use a separate module axis (`engineering | fiscal | mercantil`, `CaseModule` in `preload/types.ts`). Vault operations accept `expectedModule`; the optional module check is implemented by `assertCaseModule` in `src/main/lib/case-vault.ts`.

### Analysis pipeline (`ipc/analyze.handler.ts` → `processAnalyzePayload`)

1. Extract text with `document-parser.ts` (PDFs go through `pdf-parser.ts`, which hands the parsing to a `worker_threads` Worker built from the separate `pdf-worker` entry in `electron.vite.config.ts`), then chunk it (`chunking.ts`).
2. Index the document chunks into LanceDB under a per-request id, inside `lanceDbWriteMutex` (`mutex.ts`). These vectors are temporary: they are cleaned up after the request and purged after `USER_DOCUMENT_TTL_MS` (24 h).
3. Retrieve legal grounding per selected ecosystem using `getHybridLegalContext` in `rag.ts`: vector search plus query expansion, relevance filtering, and reranking (`legal-query-expansion.ts`, `legal-relevance.ts`, `legal-reranker.ts`). If a search comes back empty, it retries with ecosystem keywords. If evidence is still insufficient, the operation abstains before contacting the provider.
4. With no BYOK key, run `generateDeterministicLegalAudit` (`core-legal/business-core.ts`). With a key, call the provider through `byok-client.ts` using a strict JSON schema. The prompt is assembled by `composeLimitedByokPrompt`, which caps it at `maxInputChars` while keeping instruction, legal context and output contract intact, and document text is labeled as untrusted. `composeLimitedByokPromptWithDisclosure` also returns what is sent to the provider, for the UI disclosure.
5. Validate the output locally (`legal-grounding.ts`): every claim must cite exact `FUENTE_ID`s from the retrieved legal sources or `doc:N` fragments. On failure, it makes **one** repair call to the provider. If that also fails, the result is blocked, and a provider error falls back to the deterministic audit (recorded in `fallbackReason`).
6. Append a hashed record to the trace ledger (`traceability.ts` → `userData/logs/trace_ledger.jsonl`), including `primaryModel` and `finalModelUsed`.

Drafting (`draft.handler.ts`) follows the same pattern: RAG context, BYOK generation, grounding validation or repair, and a trace entry. Drafting requires BYOK and has no deterministic fallback. `processAnalyzePayload` takes a `dependencyOverrides` argument so tests can inject fakes for extraction, indexing, and retrieval.

### BYOK client (`byok-client.ts`)

Each provider has an ordered list of fallback model candidates (`*_FALLBACK_CANDIDATES`). When the configured model is unavailable the client retries with candidates and reports the model actually used through `onModelResolved`, which ends up in the trace record. API keys are redacted from any logged error by `sanitizer.ts`. Default models per provider are in `src/shared/byok-models.ts`.

### Runtime data locations

- **Vault**: `userData/CaseVault/vault.db` (better-sqlite3, WAL). Payload columns are stored as `encrypted:v1:<base64>` via Electron `safeStorage` (DPAPI on Windows). Writes refuse to run when OS encryption is unavailable, and legacy `obfuscated:` rows are migrated on open. Case retention (`caseRetentionDays`) is applied at startup and whenever preferences change.
- **Portable backup**: `vault:export-all` / `vault:import-all` produce a password-protected file (scrypt + AES-256-GCM, `portable-backup.ts`, format `lex-corporativo-vault-backup`). Cleartext v1 backups are refused on import.
- **Draft recovery**: `userData/draft-recovery.bin`, `safeStorage`-encrypted snapshot of the in-progress draft (`draft-recovery.ts`), written atomically with a revision counter so a late save cannot overwrite the clearing done on close. Cleared on save/discard/delete and expired by retention.
- **BYOK settings and keys**: `userData/byok-settings.json`. Keys are encrypted with `safeStorage`.
- **Legal knowledge**: the bundled `legal-runtime/lance_data`, which is `process.resourcesPath` when packaged and the repo root in dev, is copied into `userData/lance_data` whenever the manifest's `vectorStore.sha256` changes (`synchronizePackagedLegalKnowledge` in `rag.ts`). The `LEX_ENGINE_LANCE_PATH` and `LEX_EMBEDDING_MODEL_PATH` environment variables override these paths; `VITE_CASE_RETENTION_DAYS` sets the retention of new portfolios at renderer build time (see `.env.example`).
- **Corpus markdown**: `legal-runtime/corpus/*.md` is read directly by `legal-corpus.ts` for the reader and downloads. `corpus-manifest.json` is the canonical inventory of 16 laws.

### Tests

Main-process tests mock `electron` with `vi.mock('electron', ...)`, stubbing `app.getPath` and `safeStorage`. Tests sit next to their source (`*.test.ts`), and a few integration-style tests live in `tests/`. The Electron-hosted suites (`scripts/test-*-electron.mjs`) use hidden windows and isolated temporary profiles, so they never touch the real `userData`.
