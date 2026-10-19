# Auditoría de seguridad y datos — 19 de octubre de 2026

## Alcance

Frontera IPC entre renderer y proceso principal, Content Security Policy efectiva, endurecimiento de la ventana (navegación, ventanas nuevas, permisos), protocolo `lexcorp://`, cifrado en reposo (bóveda, metadatos, recuperación de redacción, fragmentos temporales en LanceDB), respaldo portátil, redacción de secretos en bitácoras, avisos de dependencias y contenido del instalador. Re-evalúa los hallazgos SEC-01, SEC-02, SEC-03, DATA-01, DATA-02, DATA-03 y DEP-01 de `hallazgos-a718988.json`.

Fuera de alcance: pruebas de penetración, revisión de proveedores externos de IA, firma Authenticode (no hay certificado en esta fase).

## Entorno

| Elemento | Valor |
| --- | --- |
| Código auditado | `main` @ `56aa94b` (rango revisado `a718988..56aa94b`) |
| Node / npm | v24.21.0 / 12.2.0 |
| Electron / electron-builder | 42.11.15 / 26.15.3 |
| Windows | 11 Pro 10.0.26300, AMD Ryzen 7 7730U |
| Fecha | 2026-10-19 |

## Herramientas y comandos

| Verificación | Comando | Evidencia |
| --- | --- | --- |
| Ensayo dinámico en Electron (nuevo) | `npm run audit:security:electron` | `reports/audits/security-<sha7>.json` |
| Ensayo de datos en Electron (corregido: estado calculado, respaldo real) | `npm run audit:data:electron` | `reports/audits/data-<sha7>.json` |
| Pruebas unitarias de seguridad | `npx vitest run src/main/ipc/trusted-ipc.test.ts src/main/lib/sanitizer.test.ts src/shared/content-security-policy.test.ts src/main/lib/portable-backup.test.ts src/main/lib/rag.user-document-privacy.test.ts` | parte de `npm test` |
| Revisión asistida del rango | `/code-review a718988..HEAD` (15 hallazgos; ver salud de código) | esta sección |
| Avisos de dependencias | `npm audit --json` | `reports/audits/npm-audit-<sha7>.json` |
| Estático: `ipcMain` fuera del wrapper | `grep "from 'electron'" src/main \| grep ipcMain` | sólo `trusted-ipc.ts` y `recovery.handler.ts` (comprobación propia) |
| Estático: validación zod por canal | revisión de los 24 canales con payload | todos validan (`*Schema.parse`, `parse*Payload`, `safeParse`) |
| Estático: secretos | búsqueda de patrones `AIza…`, `sk-…`, `sk-ant-…` en árbol e historial | sin coincidencias |
| Contenido del instalador | `npm run pilot:manifest` (lista el asar y busca rutas prohibidas) | `release/pilot-manifest.json` |

## Resultados

### Frontera IPC (SEC-01)

Todos los canales se registran a través del wrapper `src/main/ipc/trusted-ipc.ts`, que exige que el remitente sea la ventana principal, su marco principal y el documento de la aplicación. `recovery.handler.ts` usa `ipcMain` de Electron directamente pero recibe la misma función de confianza desde `src/main/index.ts`. El ensayo en Electron con el preload y el renderer compilados comprobó:

| Caso | Resultado |
| --- | --- |
| Marco principal del documento de la app en la ventana registrada → `runtime:get-health` | responde |
| Segunda ventana con el mismo preload y documento `data:` → `runtime:get-health`, `recovery:load` | `Origen no autorizado.` |
| Segunda ventana cargando el mismo `index.html` | `Origen no autorizado.` |
| La ventana registrada navegada a otro documento | `Origen no autorizado.` |

Corrección derivada de la revisión de código: el wrapper de `ipcMain.on` lanzaba la excepción dentro de un listener sin promesa, lo que en Electron se convierte en excepción no capturada del proceso principal. Ahora descarta el mensaje (`3d242cd`). Las pruebas unitarias cubren subframes, documentos navegados y la normalización de URL `file:///C:` en Windows.

### CSP efectiva (SEC-02)

La política vive en `src/shared/content-security-policy.ts`, se incrusta como `<meta>` en `index.html` (lo único que aplica a un documento `file://`) y se envía como encabezado con `frame-ancestors 'none'` desde `src/main/csp.ts`. En el documento empaquetado el ensayo confirmó:

| Inyección | Directiva violada | Bloqueado |
| --- | --- | --- |
| `<iframe src="https://example.invalid/">` | `frame-src` | sí |
| `<object data="https://example.invalid/x.pdf">` | `object-src` | sí |
| `<script>` en línea | `script-src-elem` | sí, no se ejecutó |
| `fetch('https://example.invalid/')` | `connect-src` | sí |

La meta no declara `frame-ancestors` ni `report-uri` (Chromium los ignora ahí); el encabezado sí lleva `frame-ancestors`. Las violaciones llegan al proceso principal por `csp:report` y quedan en la bitácora de trazabilidad. Limitación aceptada: `frame-ancestors` no aplica a documentos `file://`; el riesgo de incrustación lo mitigan `frame-src 'none'`, `setWindowOpenHandler` (deniega toda ventana nueva) y `will-navigate` (bloquea navegación fuera del documento).

### Endurecimiento de la ventana y protocolo

`src/main/index.ts`: `sandbox: true`, `contextIsolation: true`, `nodeIntegration: false`, `webSecurity: true`; `setPermissionRequestHandler` deniega todo; `will-navigate` sólo permite el documento de la app; `setWindowOpenHandler` abre `http(s)` en el navegador del sistema y deniega la ventana. `handleDeepLink` sólo admite `lexcorp://auth…`; el ensayo confirmó que `lexcorp://evil/…`, `https://…` y una cadena inválida no llegan al renderer y que `lexcorp://auth/callback` sí.

### Cifrado en reposo y respaldo (DATA-01, DATA-02, DATA-03)

El ensayo de datos, ahora con estado calculado a partir de sus comprobaciones, dio `pass` en las cinco:

| Comprobación | Resultado |
| --- | --- |
| Contenido de la bóveda cifrado (`encrypted:v1:` vía `safeStorage`) | sin texto legible |
| Nombre del asunto y nombre de archivo cifrados | sin texto legible en SQLite ni WAL |
| Respaldo sellado (scrypt + AES-256-GCM) sin marcadores legibles | correcto |
| Contraseña incorrecta, archivo truncado y respaldo en claro rechazados | correcto |
| Restaurar → 1 restaurado; repetir → 1 omitido; asunto modificado → conflicto detectado; `replace` → 1 reemplazado y contenido original | correcto |
| Fragmentos temporales en LanceDB tras `cleanupUserDocumentRequest` | 0 filas y sin texto legible en `user_documents.lance` |
| Sanitizador: token corto, `authorization` y secreto dentro de `message` | redactados |

Correcciones derivadas de la revisión de código: un nombre de asunto cifrado por otro usuario de Windows ya no inutiliza todo el portafolio (se lista con un marcador y puede eliminarse); `vault:import-all` sólo relee rutas que el diálogo del proceso principal entregó en la sesión.

### Bitácora de trazabilidad (SEC-03)

`sanitizeForLogs` redacta por nombre de campo y por patrón sin depender de la longitud, incluidos errores anidados; cinco pruebas unitarias lo cubren además del ensayo de datos. Corrección derivada de la revisión: `analyze`, `draft` y el reranker registran ahora el modelo que realmente respondió cuando el cliente BYOK cae a una alternativa (`finalModelUsed`), lo que antes falseaba la atribución en la bitácora.

### Dependencias (DEP-01)

`npm audit` sobre `56aa94b`: 16 paquetes, 4 altos y 12 moderados, 0 críticos. Es el mismo conjunto triado en `dep-01-triaje.md` (sharp y la cadena de transformers/LanceDB; electron-builder → sprintf-js; mammoth/argparse; typography/postcss-selector-parser). No hay avisos nuevos. El único arreglo que npm propone para los 16 es una bajada de versión mayor, rechazada. `pdfjs-dist` aparece como dependencia no declarada en dos scripts de corpus: llega por `pdf-parse` y sólo se usa en herramientas de mantenimiento.

### Contenido del instalador

Se completa en el manifiesto del piloto (`npm run pilot:manifest`): recursos `legal-runtime` idénticos a los fuentes por hash, `THIRD-PARTY-NOTICES.txt` presente, asar sin `.env`, `byok-settings`, `CaseVault`, `reports`, `scratch` ni claves. El instalador **no está firmado** (decisión de la fase: build interno).

## Hallazgos previos re-evaluados

| ID | Estado | Evidencia de cierre |
| --- | --- | --- |
| SEC-01 | **cerrado** | `trusted-ipc.ts`, `trusted-ipc.test.ts` (7 casos), `security-<sha7>.json` SEC-01 `ok`; corrección `on()` en `3d242cd` |
| SEC-02 | **cerrado con limitación aceptada** | `content-security-policy.ts`, `csp.ts`, `security-<sha7>.json` SEC-02 `ok`; `frame-ancestors` no aplica a `file://` |
| SEC-03 | **cerrado** | `sanitizer.ts`, `sanitizer.test.ts`, `data-<sha7>.json` SEC-03 `ok` |
| DATA-01 | **mitigado** | `portable-backup.ts`, `data-<sha7>.json` DATA-01 `ok`; falta restauración en otro usuario de Windows (escenario RES-03 del piloto) |
| DATA-02 | **cerrado** | `rag.ts` (fragmentos cifrados, reescritura física, purga al arrancar), `data-<sha7>.json` DATA-02 `ok`. La ausencia de texto no acredita borrado forense |
| DATA-03 | **cerrado** | `case-vault.ts` (`migratePlaintextMetadata`), `data-<sha7>.json` DATA-03 `ok` |
| DEP-01 | **abierto, no bloquea el piloto** | 16 avisos sin parche compatible, triados; falta aceptación formal del responsable |

## Hallazgos nuevos

| ID | Prioridad | Descripción | Estado |
| --- | --- | --- | --- |
| SEC-04 | P2 | `vault:import-all` aceptaba una ruta absoluta del renderer y la leía con `readFileSync` | corregido en `3d242cd` |
| SEC-05 | P2 | `ipcMain.on` protegido lanzaba en el listener (excepción no capturada en main) | corregido en `3d242cd` |
| SEC-06 | P3 | El fallback de modelo Gemini se dispara también con 429/403/400/402 y "Probar y conectar" guarda el modelo alternativo que respondió, sustituyendo la elección del usuario | abierto; decisión de producto del responsable (es la resiliencia multi-modelo introducida en `1a0f212`) |

## Veredicto

**Pasa con observaciones.** Los seis hallazgos P1 de seguridad y datos de la auditoría anterior quedan cerrados o mitigados con evidencia automatizada; DATA-01 termina de cerrarse en el piloto. DEP-01 sigue abierto por aceptación pendiente, sin avisos nuevos ni críticos. Ningún hallazgo bloquea el piloto interno sin firma.

## Límites

- El ensayo de seguridad replica las `webPreferences` del producto en una ventana de ensayo; la configuración real de `index.ts` se verificó estáticamente.
- No se probaron proveedores reales de IA ni se inspeccionaron perfiles reales de usuario.
- Sin firma Authenticode: SmartScreen advertirá en los equipos del piloto.
