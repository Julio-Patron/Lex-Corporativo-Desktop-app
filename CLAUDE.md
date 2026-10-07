# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Product

Lex Corporativo Desktop is an Electron workstation for Mexican corporate, commercial, labor, foreign-trade/customs, and tax law. Everything stays local (encrypted SQLite vault, legal corpus, LanceDB vector store, MiniLM embeddings, trace ledger). Generative features use the user's own API key (BYOK: Gemini, OpenAI, or Anthropic). A local small-language-model engine (GGUF, 3–4B parameters) is being developed per `docs/plan-edicion-slm-local.md`; the decision revision is recorded in `docs/arquitectura-procesamiento-y-gate-publicacion.md`. Until it passes the plan's release gates, BYOK remains the only shippable generative engine. Handlers obtain the generator through `resolveGenerationEngine()` (`src/main/lib/llm/generation-engine.ts`) rather than calling `generateByokText` directly. With no generative engine, the portfolio, the deterministic rule-based audits, the corpus reader, and legal search still work.

All user-facing strings, error messages, prompts, and docs are in Spanish. Commits follow Conventional Commits with Spanish descriptions (e.g. `feat(rag): ...`, `fix(ci): ...`). Day-to-day work happens on the `desarrollo` branch, with PRs into `main`.

## Commands

```bash
npm ci
npm run dev:desktop          # electron-vite dev with HMR (pre-hook rebuilds better-sqlite3 for Electron)
npm run lint                 # tsc --noEmit (the only lint step; there is no ESLint)
npm test                     # vitest run: src/**/*.test.{ts,tsx} and tests/**/*.test.ts
npx vitest run src/main/lib/legal-grounding.test.ts      # one file
npx vitest run -t "nombre del caso"                      # tests matching a name
npm run test:vault:electron  # bundles case-vault.ts with esbuild and runs it inside real Electron (DPAPI/safeStorage)
npm run build                # electron-vite build -> out/
```

The native `better-sqlite3` module can only be built for one ABI at a time. `dev:desktop` and `predev:electron` rebuild it for Electron, and after that `src/main/lib/case-vault.test.ts` skips itself (`describe.skip`) under Node vitest. Run `npm rebuild better-sqlite3` to get the Node build back before running the vault unit tests.

CI (`.github/workflows/ci.yml`) runs `lint`, `test`, `build`, and `manifest:legal-corpus && audit:corpus-governance:strict` on Ubuntu, plus the Electron vault smoke test on Windows.

### Corpus / RAG pipeline (Node scripts in `scripts/`)

```bash
npm run ingest:local:offline            # rebuild legal-runtime/lance_data from legal-runtime/corpus/*.md (add --laws=CFF,LISR to limit)
npm run manifest:legal-corpus           # regenerate legal-runtime/corpus/corpus-manifest.json (hashes corpus + vector store)
npm run audit:corpus-governance:strict  # CI gate: fails if the manifest is out of sync with the corpus or LanceDB
npm run audit:legal-knowledge | audit:legal-retrieval | eval:legal-rag   # quality probes, written to reports/ (gitignored)
npm run stage:{fiscal,mercantile,documental}-corpus[:download]  then  promote:*-corpus   # official PDF -> staged markdown -> promote
```

The law list, source URLs, verification metadata, and `CORPUS_VERSION` all live in `scripts/legal-corpus-config.mjs`. Any change to `legal-runtime/corpus/*.md` or `legal-runtime/lance_data/` requires re-ingesting and regenerating the manifest, or CI governance fails.

### Packaging

`npm run preflight:release` checks for the vector store, the manifest, the ONNX model, and the icon. `npm run build:electron` runs the `prebuild:electron` hook (icon, strict manifest, embeddings download, native rebuild) and then electron-builder (NSIS x64). Pushing a `v*` tag triggers `.github/workflows/release.yml`, which publishes a GitHub release that electron-updater consumes. The release gate checklist is in `docs/arquitectura-procesamiento-y-gate-publicacion.md`.

## Architecture

### Process split

- **`src/main/`**: all privileged work. `index.ts` creates a sandboxed window (`contextIsolation`, no `nodeIntegration`), blocks external navigation, registers the `lexcorp://` protocol (`protocol.ts`, which also receives CSP reports), wires auto-update (off unless the user consents and strict privacy is off), and purges expired cases and temporary document vectors at startup.
- **`src/main/ipc/`**: one `*.handler.ts` per domain (`analyze`, `draft`, `rag`, `vault`, `byok`, `corpus`, `assistant`), each registered from `ipc/index.ts`. `ipc/index.ts` also holds the dialog sanitizers (only `json|pdf|docx|jsonl`, defaulting to Downloads) and `runtime:get-health`, which computes the capability flags the UI gates on. Every handler validates its raw payload with zod (`*Schema` / `parse*Payload`) before doing anything.
- **`src/preload/index.ts`**: exposes `window.lexDesktop` via `contextBridge`, typed by `src/preload/types.ts` (`LexDesktopAPI`). Adding an IPC channel means touching the handler, `preload/index.ts`, and `preload/types.ts`.
- **`src/shared/`**: types and constants imported by both main and renderer, such as the ecosystem list, prompt profiles (`legal-contracts.ts`), and default BYOK models.
- **`src/renderer/`**: React 19 + react-router + zustand + Tailwind 4, with the `@/` alias pointing at `src/renderer`. The renderer never touches Node or the filesystem. It calls `window.lexDesktop.*` through `services/` and the stores. DOCX and PDF files are generated in the renderer (`lib/docx-generator.ts`, `lib/pdf-generator.ts`) and passed as base64 to `vault:export-*` for saving. Drafting templates ("machotes") live in `lib/constants.ts` and `lib/template-bodies.ts`. The CSP in `index.html` allows `connect-src 'self' lexcorp:` only, so all network calls must go through main.

### Legal ecosystems

There are five ecosystems (`mercantil`, `laboral`, `comercio_exterior`, `aduanal`, `fiscal`), defined in `src/shared/legal-contracts.ts`. Each maps to the law codes it may cite through `MODULE_ALLOWED_LAW_CODES` in `src/main/lib/prompts.ts`. The same file also provides system and draft instructions per ecosystem. Vault cases use a separate module axis (`engineering | fiscal | mercantil`). Vault operations accept `expectedModule` and reject cross-ecosystem access (see `renderer/lib/case-access.ts`).

### Analysis pipeline (`ipc/analyze.handler.ts` → `processAnalyzePayload`)

1. Extract text with `document-parser.ts` (PDFs go through `pdf-parser.ts`, which hands the parsing to a `worker_threads` Worker built from the separate `pdf-worker` entry in `electron.vite.config.ts`), then chunk it (`chunking.ts`).
2. Index the document chunks into LanceDB under a per-request id, inside `lanceDbWriteMutex`. These vectors are temporary: they are cleaned up after the request and purged after `USER_DOCUMENT_TTL_MS`.
3. Retrieve legal grounding per selected ecosystem using `getHybridLegalContext` in `rag.ts`: vector search plus query expansion, relevance filtering, and reranking (`legal-query-expansion.ts`, `legal-relevance.ts`, `legal-reranker.ts`). If a search comes back empty, it retries with ecosystem keywords.
4. With no BYOK key, run `generateDeterministicLegalAudit` (`core-legal/business-core.ts`). With a key, call the provider through `byok-client.ts` using a strict JSON schema. The prompt is assembled by `composeLimitedByokPrompt`, which caps it at `maxInputChars`, and document text is labeled as untrusted.
5. Validate the output locally (`legal-grounding.ts`): every claim must cite exact `FUENTE_ID`s from the retrieved legal sources or `doc:N` fragments. On failure, it makes **one** repair call to the provider. If that also fails, the result is blocked, and a provider error falls back to the deterministic audit (recorded in `fallbackReason`).
6. Append a hashed record to the trace ledger (`traceability.ts` → `userData/logs/trace_ledger.jsonl`).

Drafting (`draft.handler.ts`) follows the same pattern: RAG context, BYOK generation, grounding validation or repair, and a trace entry. Drafting requires BYOK and has no deterministic fallback. `processAnalyzePayload` takes a `dependencyOverrides` argument so tests can inject fakes for extraction, indexing, and retrieval.

### Runtime data locations

- **Vault**: `userData/CaseVault/vault.db` (better-sqlite3, WAL). Payload columns are stored as `encrypted:v1:<base64>` via Electron `safeStorage` (DPAPI on Windows). Writes refuse to run when OS encryption is unavailable, and legacy `obfuscated:` rows are migrated on open.
- **BYOK settings and keys**: `userData/byok-settings.json`. Keys are encrypted with `safeStorage`.
- **Legal knowledge**: the bundled `legal-runtime/lance_data`, which is `process.resourcesPath` when packaged and the repo root in dev, is copied into `userData/lance_data` whenever the manifest's `vectorStore.sha256` changes (`synchronizePackagedLegalKnowledge` in `rag.ts`). The `LEX_ENGINE_LANCE_PATH` and `LEX_EMBEDDING_MODEL_PATH` environment variables override these paths (see `.env.example`).
- **Corpus markdown**: `legal-runtime/corpus/*.md` is read directly by `legal-corpus.ts` for the reader and downloads. `corpus-manifest.json` is the canonical inventory of 16 laws.

### Tests

Main-process tests mock `electron` with `vi.mock('electron', ...)`, stubbing `app.getPath` and `safeStorage`. Tests sit next to their source (`*.test.ts`), and a few integration-style tests live in `tests/`.
