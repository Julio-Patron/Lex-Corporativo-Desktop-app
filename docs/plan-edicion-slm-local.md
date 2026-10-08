# Plan: edición con modelo de lenguaje local (SLM)

> Estado: aprobado y en ejecución. Fase 0 (decisión) y Fase 2 (abstracción de motor)
> completadas. La revisión de la decisión de producto está registrada en
> `docs/arquitectura-procesamiento-y-gate-publicacion.md`. BYOK sigue siendo el único motor
> publicable hasta cumplir los gates de §8.

## 0. Decisiones confirmadas

| Tema | Decisión |
| --- | --- |
| Producto | Un solo instalador por plataforma. El motor local es un modo, no una edición separada. Una eventual oferta comercial "Local" se resuelve con licencia, no con otro build. |
| Plataformas | Windows, macOS y Linux. |
| Distribución del modelo | El modelo **no** va en el instalador. La app lo descarga en segundo plano desde el primer arranque (§5.2), mientras el resto de las funciones ya están disponibles. |
| Alojamiento del modelo | Almacenamiento propio con SHA-256 fijado (GitHub Releases limita cada archivo a 2 GiB y un 4B Q4 ronda los 2.5 GB). |
| BYOK | Se mantiene. Con ambos motores configurados, el motor se elige **por tarea** (política "preferir local"). |
| Modo híbrido | Pospuesto hasta tener métricas de detección local de datos personales. |
| Modelo por defecto | Familia Qwen (Apache 2.0). Gemma sólo tras revisión legal de su licencia. |

## 1. Objetivo

Ofrecer una edición de Lex Corporativo en la que la generación también pueda ejecutarse
en el equipo del usuario con un modelo pequeño (clase 3–4 B parámetros, p. ej. Qwen 4B o
Gemma 4B). El fin es que ningún extracto documental salga del equipo, que la herramienta
funcione sin conexión y sin API key, y que el costo por operación sea cero.

No se busca igualar a un modelo de frontera. La versión se diseña alrededor de lo que un
SLM hace bien (extraer, clasificar, resumir y redactar dentro de un molde) y deja el
razonamiento jurídico pesado a las reglas deterministas, a la validación local y, cuando
el usuario lo autorice, al proveedor BYOK.

## 2. Diagnóstico de la arquitectura actual

### 2.1 Lo que ya favorece una ejecución local

| Pieza | Archivo | Por qué ayuda |
| --- | --- | --- |
| RAG 100 % local (LanceDB + MiniLM ONNX) | `src/main/lib/rag.ts` | La fundamentación no depende del modelo generativo. |
| Política de densidad por motor | `prepareLegalSourcesForEngine` (`rag.ts`) | Ya existe un modo `'local'` (4 fuentes × 1,400 caracteres) sin uso. |
| Tipo `AiExecutionMode = 'local' \| 'byok'` | `src/main/lib/byok-settings.ts` | Vestigio aprovechable para la selección de motor. |
| Validación de citas y reparación | `src/main/lib/legal-grounding.ts` | Es el principal control de alucinaciones y no depende del proveedor. |
| Auditoría determinista | `src/main/lib/core-legal/business-core.ts` | Sirve como esqueleto que el SLM sólo complementa. |
| Rehidratación de fundamentos | `hydrateByokAnalysisFoundations` (`analyze.handler.ts`) | El modelo puede emitir sólo IDs; título, ley y extracto se reconstruyen localmente. |
| Worker separado para PDF | `pdf-worker` en `electron.vite.config.ts` | Patrón ya probado para mover cómputo pesado fuera del proceso principal. |
| Inyección de dependencias | `dependencyOverrides` de `processAnalyzePayload` | Permite probar el motor local con dobles. |
| Bitácora con hashes | `src/main/lib/traceability.ts` | Puede registrar hash del modelo, cuantización y semilla. |

### 2.2 Lo que un SLM no soportará tal cual

1. **Un contrato JSON monolítico.** `BYOK_ANALYSIS_JSON_SCHEMA` exige 15 campos raíz, riesgos
   anidados con fundamentos completos (id, título, ley, artículo, extracto, score) y
   `groundingClaims` que repiten textualmente el resumen y cada explicación. Un 4B pierde
   coherencia en salidas largas y anidadas.
2. **Presupuestos dimensionados para la nube.** `maxInputChars` = 60,000 por defecto (hasta
   200,000), hasta 24 fragmentos × 3,500 caracteres, 8 fuentes × 3,200 caracteres y
   `maxOutputTokens: 12_000`. En CPU, procesar ~15,000 tokens de entrada puede tardar varios
   minutos y la caché KV puede consumir varios GB de RAM.
3. **Auditoría integral 360°.** Multiplica materias y fundamentos en una sola llamada.
4. **Redacción de documento completo en una pasada.** `STRUCTURED_GROUNDED_OUTPUT_JSON_SCHEMA`
   admite hasta 200 claims.
5. **Acoplamiento a BYOK.** `generateByokText`, `getActiveByokConfig`, `runtime:get-health`
   (`legalGenerationReady` exige API key), la UI (`useAiGuard`, `AiPanel`) y los mensajes
   ("Configura y activa una API key…") asumen proveedor remoto.
6. **Tiempos de espera y reintentos HTTP** (`fetchJson`, 180 s) que no aplican a un motor local.

## 3. Decisiones técnicas propuestas

### 3.1 Runtime de inferencia

**Recomendado: `node-llama-cpp` (llama.cpp con bindings para Node) en un `utilityProcess` de Electron.**

- Usa modelos GGUF cuantizados, que es el formato estándar para Qwen y Gemma.
- Trae binarios precompilados para CPU, Vulkan, CUDA y Metal, lo que evita compilar en la máquina del usuario.
- Convierte JSON Schema a gramática GBNF, de modo que la salida siempre es JSON parseable.
- Ofrece streaming de tokens, cancelación y conteo de tokens con el tokenizer real.

Alternativas descartadas como opción principal:

| Opción | Motivo |
| --- | --- |
| Ollama externo | Requiere instalación aparte, expone un puerto local y su versión queda fuera de control. Puede ofrecerse como modo avanzado. |
| `llama-server` como sidecar HTTP | Es viable, pero añade un puerto en localhost y la gestión de su ciclo de vida. Conviene como respaldo si `node-llama-cpp` falla en Electron/Windows. |
| ONNX Runtime GenAI / Transformers.js | Hoy tiene menos soporte de gramáticas y menos rendimiento en CPU para modelos de 4B. |

Aislamiento: el modelo corre en un `utilityProcess` dedicado (`src/main/llm/local-llm-worker.ts`,
nueva entrada en `electron.vite.config.ts`, como `pdf-worker`). Si un driver de GPU falla, se
cae el worker, no la aplicación, y el proceso principal lo reinicia en modo CPU.

### 3.2 Modelos candidatos

La elección final debe salir de la evaluación de la Fase 1, no de benchmarks públicos.

| Modelo (GGUF Q4_K_M aprox.) | Licencia | Notas |
| --- | --- | --- |
| Qwen3 4B Instruct (o la versión vigente de la familia) | Apache 2.0 | **Candidato principal.** Buen español, buen seguimiento de JSON y contexto largo. Hay que desactivar el modo "thinking" o presupuestarlo. |
| Gemma 3 4B IT (o la versión vigente) | Gemma Terms of Use | Buen español. **Requiere revisión legal** de las cláusulas de uso y redistribución antes de empaquetarlo comercialmente. |
| Qwen 1.5–2B / Gemma 1B | Igual que sus familias | Nivel "ligero" para equipos con 8 GB de RAM: sólo asistente, clasificación y extracción. |
| Phi-4-mini | MIT | Alternativa de control para la evaluación. |

Estimación de recursos (a validar en la Fase 1): un 4B en Q4_K_M ocupa ~2.5 GB en disco y
~3–4 GB de RAM con 8K de contexto. Las velocidades típicas son del orden de decenas de tok/s
en prefill y 5–15 tok/s en generación con CPU, y varias veces más con GPU.

### 3.3 Perfiles de hardware

`node-llama-cpp` detecta GPU y VRAM. La aplicación clasifica el equipo al iniciar, por plataforma:

| Perfil | Requisito orientativo | Modelo | Contexto | Funciones locales |
| --- | --- | --- | --- | --- |
| Ligero | 8 GB RAM, sólo CPU | 1.5–2B | 4K | Asistente, clasificación, extracción de datos |
| Estándar | 16 GB RAM, CPU moderna | 4B Q4 | 8K | + análisis descompuesto, cláusula individual |
| Acelerado | GPU ≥ 6 GB VRAM (Windows/Linux) o Apple Silicon con ≥ 16 GB | 4B Q4/Q5 | 16K | + redacción por secciones, auditoría de 2 materias |

| Plataforma | Backend de inferencia | Perfil esperado |
| --- | --- | --- |
| macOS Apple Silicon | Metal, memoria unificada | Acelerado (es la plataforma más favorable) |
| macOS Intel | CPU | Ligero o Estándar |
| Windows x64 | CPU, Vulkan; CUDA como descarga opcional | Según RAM y GPU |
| Linux x64 | CPU, Vulkan; CUDA como descarga opcional | Según RAM y GPU |

## 4. Adaptación funcional a las capacidades del SLM

Principio rector: **el SLM lee y redacta dentro de moldes; las reglas y el validador deciden.**

### 4.1 Contrato de salida con gramática

- Generar el JSON Schema **por solicitud**, con `sourceIds` como `enum` de los IDs recuperados
  (`FUENTE_ID` legales + `doc:N`). Con gramática GBNF, el modelo **no puede** citar un ID
  inexistente, lo que elimina por construcción la falla `unknown_source_id`.
- El modelo emite sólo IDs de fundamentos. Título, ley, artículo y extracto se rehidratan
  con `hydrateByokAnalysisFoundations`.
- `groundingClaims` se construye en código a partir de cada hallazgo (texto + IDs) en lugar
  de pedir al modelo que repita sus propios textos.
- Esquemas cortos y planos, con límites de longitud (`maxLength`, `maxItems`) que la
  gramática sí hace cumplir.

### 4.2 Análisis documental descompuesto (map → reduce)

Se reemplaza la llamada única por una cadena de tareas pequeñas, cada una con su esquema:

1. **Esqueleto determinista.** `generateDeterministicLegalAudit` + `EvidenceMapper` producen
   tipo de documento, faltantes por materia y suficiencia documental.
2. **Extracción por fragmento (map).** Para cada fragmento relevante (≤ 1,500 tokens), extrae
   partes, obligaciones, montos, plazos y cláusulas presentes, con sus `doc:N`.
   Es paralelizable en lotes y cacheable por hash del fragmento.
3. **Fusión determinista.** Deduplicación y normalización en código.
4. **Evaluación de riesgos (reduce acotado).** Una llamada por materia con: hechos extraídos,
   faltantes del esqueleto y ≤ 4 fundamentos (`prepareLegalSourcesForEngine(..., 'local')`).
   Devuelve como máximo N riesgos `{título, severidad, explicación ≤ 600 caracteres, sourceIds}`.
5. **Resumen ejecutivo.** Llamada corta sobre los hallazgos ya validados.
6. **Validación** con `validateStructuredGroundedOutput`. Si falla, la reparación se hace
   **sólo sobre el hallazgo rechazado** (no sobre todo el dictamen) y, si persiste, se descarta
   ese hallazgo y se conserva el resto, marcándolo en el reporte.

La auditoría integral 360° queda limitada por perfil (p. ej. 2 materias en Acelerado) y se
ejecuta materia por materia.

### 4.3 Redacción por secciones

- Machote primero: `lib/template-bodies.ts` define la estructura y el SLM redacta o ajusta
  una sección a la vez (claims de 1–3 por llamada) con el contexto legal de esa sección.
- Corrección de documento propio: por cláusula, con diff visible.
- "Cláusula para un hallazgo" (ya existe en Revisar) es el caso de uso ideal: entrada corta,
  salida corta y fundamentos acotados.

### 4.4 Funciones nuevas que la ejecución local hace posibles

- **Asistente de la app** (`assistant.handler.ts`): contexto pequeño y cero riesgo jurídico. Es
  el primer candidato a migrar.
- **Análisis sin divulgación.** La pantalla de divulgación (`ByokDataDisclosure`) pasa a
  "destino: este equipo". Es un argumento comercial directo para despachos con secreto profesional.
- **Procesamiento por lotes del portafolio:** clasificar, etiquetar y extraer vencimientos de
  muchos documentos de la bóveda sin costo por llamada.
- **Expansión de consultas para RAG.** El SLM reformula la consulta del usuario en términos
  legales antes de `searchLegalArticles` (complementa `legal-query-expansion.ts`).
- **Seudonimización local antes de BYOK (modo híbrido opcional).** El SLM y reglas detectan
  nombres, RFC, CURP, domicilios y montos, los sustituyen por marcadores, envían el texto
  seudonimizado al proveedor y restauran los datos al recibir la respuesta. Requiere
  consentimiento explícito y queda registrado en la bitácora.
- **Funcionamiento sin conexión** de todo el flujo.

## 5. Cambios de arquitectura

### 5.1 Abstracción de motor generativo

Nuevo módulo `src/main/lib/llm/`:

```ts
interface GenerationEngine {
  id: 'local' | 'gemini' | 'openai' | 'anthropic';
  capabilities: { maxContextTokens: number; grammar: boolean; streaming: boolean };
  countTokens(text: string): Promise<number>;
  generate(input: {
    systemInstruction?: string;
    prompt: string;
    jsonSchema?: ByokJsonSchema;
    maxOutputTokens: number;
    temperature?: number;
    seed?: number;
    signal?: AbortSignal;
    onToken?: (chunk: string) => void;
  }): Promise<string>;
}
```

- `byok-client.ts` se adapta como implementación remota sin cambiar su comportamiento.
- `local-engine.ts` habla con el worker vía `MessagePort`, con una cola de un trabajo a la vez
  (similar a `lanceDbWriteMutex`), cancelación y progreso.
- `composeLimitedByokPrompt` se generaliza para presupuestar en **tokens** del motor activo,
  no en caracteres.
- Los handlers (`analyze`, `draft`, `assistant`) eligen la estrategia por motor:
  `strategy = engine.id === 'local' ? decomposedPipeline : monolithicPipeline`.

### 5.2 Configuración y gestor de modelos

- `ai-settings.json` (o una extensión de `byok-settings.json` con migración): `engine`,
  `localModelId`, `hardwareProfile`, `contextTokens`, `gpuLayers`, `allowHybrid`.
- Registro de modelos permitidos en `src/shared/local-models.ts`: id, URL, **SHA-256**, tamaño,
  licencia, perfil mínimo y plantilla de chat.
- **Descarga en paralelo desde el primer arranque.** El instalador no incluye el modelo. Al abrir
  la app por primera vez, el proceso principal detecta el perfil de hardware, elige el modelo del
  registro y lo descarga en segundo plano a `userData/models/`, con reanudación, verificación
  SHA-256, progreso visible y cancelación, respetando el proxy del sistema. Mientras tanto ya
  funcionan portafolio, leyes, búsqueda, revisión básica y BYOK; las funciones locales se activan
  al terminar. La descarga no la hace el instalador porque `.dmg` y AppImage no tienen paso de
  instalación y el perfil de hardware sólo se detecta con la app en ejecución.
- Con privacidad estricta activa, la descarga requiere consentimiento en la pantalla de bienvenida;
  nunca se inicia sin que el usuario lo autorice.
- El GGUF es idéntico en las tres plataformas: un solo archivo alojado sirve a todas. Para
  instalaciones sin red se puede ofrecer, por plataforma, un paquete offline con el modelo.
- Sólo se cargan archivos cuyo hash esté en el registro: no se aceptan GGUF arbitrarios del usuario.
- Nuevos canales IPC (handler + `preload/index.ts` + `preload/types.ts`, todos validados con zod):
  `llm:get-status`, `llm:download-model`, `llm:cancel-download`, `llm:delete-model`,
  `llm:benchmark`, evento `llm:progress`.

### 5.3 Salud y capacidades

- `runtime:get-health` agrega los checks `localModel` (archivo presente y hash válido) y
  `localRuntime` (worker cargado, backend CPU/GPU).
- `legalGenerationReady = vault && legalSearch && (byokReady || localReady)`.
- Una capacidad por función (`analysisLocal`, `draftSectionLocal`, `integralLocal`) según el
  perfil de hardware, para que la UI oculte o advierta lo que el equipo no soporta.

### 5.4 Interfaz (renderer)

- `AiPanel`: selector de motor (Local / API propia / Híbrido), estado del modelo, descarga con
  barra de progreso, prueba de rendimiento y recomendación de perfil.
- `useAiGuard`: dejar de exigir API key cuando el motor local está listo.
- Progreso con streaming y tiempo estimado; botón **Cancelar** real (AbortSignal hasta el worker).
- Etiqueta visible del motor usado en cada resultado (`engine: 'local_slm'`) y en las exportaciones.
- Textos en español que no prometan la calidad de un modelo de frontera.

### 5.5 Trazabilidad y seguridad

- La bitácora registra: `engine`, id y SHA-256 del modelo, cuantización, contexto, semilla,
  temperatura, tokens de entrada y salida, y duración.
- `temperature: 0` y semilla fija por defecto, para resultados reproducibles.
- El worker no necesita red: no se le pasa `net` ni se hacen `fetch` desde él.
- La CSP del renderer no cambia: todo sigue pasando por main.
- La purga de vectores temporales y de caché de extracciones conserva el `USER_DOCUMENT_TTL_MS`.

### 5.6 Empaquetado

- `node-llama-cpp` en `asarUnpack` (binarios nativos). Por plataforma: Metal en macOS
  (arm64 y x64); CPU + Vulkan en Windows y Linux, con CUDA como descarga opcional por su tamaño.
- macOS: firma y notarización (cuenta Apple Developer), incluidos los binarios nativos fuera del
  asar (`node-llama-cpp`, `better-sqlite3`). electron-updater necesita además el target `zip`.
- Linux: AppImage. La bóveda depende de un llavero activo (gnome-keyring/kwallet); sin él
  `safeStorage` cae a `basic_text` y `case-vault.ts` rechaza escrituras. La app debe explicarlo y
  la documentación debe declararlo como requisito.
- `release.yml` pasa de sólo Windows a una matriz Windows/macOS/Linux.
- `release-preflight.mjs`: verificar binarios del runtime y registro de modelos con hashes, y
  exigir firma de macOS en modo estricto (hoy sólo la exige en Windows).
- CI: prueba de humo del runtime local con un GGUF diminuto (pocos MB) en Electron real, en
  Windows, macOS y Linux, análoga a `test:vault:electron`; la prueba de la bóveda se extiende a macOS.
- RAM: MiniLM + LanceDB + SLM coexisten, así que conviene descargar el SLM tras un periodo de
  inactividad configurable.

## 6. Evaluación de calidad

Nuevo `scripts/evaluate-local-llm.mjs` (`npm run eval:local-llm`), que reutiliza el conjunto de
`eval:legal-rag` y agrega un conjunto dorado de ~50 documentos anonimizados por materia,
revisados por un abogado.

| Métrica | Umbral inicial propuesto |
| --- | --- |
| JSON válido contra zod | ≥ 99 % (debe ser ~100 % con gramática) |
| Hallazgos que pasan grounding sin reparación | ≥ 85 % |
| Precisión de citas (cita pertinente según abogado) | ≥ 90 % |
| Recall de cláusulas faltantes frente al conjunto dorado | ≥ 70 % y nunca menor que la revisión básica |
| Falsos riesgos "alta" severidad | ≤ 5 % |
| Latencia p95, análisis de 10 páginas, perfil Estándar | ≤ 3 min |
| Latencia p95, asistente | ≤ 15 s |

Se compara Qwen frente a Gemma frente a la revisión básica y frente a BYOK sobre el mismo
conjunto. Los resultados van a `reports/` (gitignored), como los demás audits.

## 7. Fases

| Fase | Contenido | Entregable / gate | Estimación |
| --- | --- | --- | --- |
| **0. Decisión** | Revisar la decisión de producto; actualizar `arquitectura-procesamiento-y-gate-publicacion.md` y `CLAUDE.md`; revisión legal de licencias (Gemma vs Apache 2.0); definir si es edición separada o modo dentro del mismo producto. | ADR aprobado | 1 semana |
| **1. Prueba de concepto** | `node-llama-cpp` en `utilityProcess` dentro de Electron; medir RAM, prefill y generación en al menos un Windows sin GPU, una Mac Apple Silicon y un Linux; probar gramática JSON con el esquema de hallazgo; comparar Qwen y Gemma con 10 documentos. | Informe go/no-go con cifras reales | 1–2 semanas |
| **2. Abstracción de motor** | `GenerationEngine`, adaptación de BYOK, presupuesto en tokens; **sin cambio de comportamiento** (todas las pruebas existentes en verde). | PR con refactor y pruebas | 1 semana |
| **3. Runtime y gestor de modelos** | Worker, cola, cancelación, registro de modelos, descarga en segundo plano desde el primer arranque, IPC, health, AiPanel y pantalla de bienvenida. | Modelo descargable y funcionando en ajustes | 2 semanas |
| **4. Primeras funciones locales** | Asistente, clasificación, extracción de datos y expansión de consultas. | Funciones en modo local con pruebas | 1–2 semanas |
| **5. Análisis descompuesto** | Pipeline map→reduce, reparación por hallazgo, integración con el esqueleto determinista, UI de progreso. | `eval:local-llm` cumpliendo umbrales | 3 semanas |
| **6. Redacción por secciones** | Machote primero, cláusula por hallazgo, corrección por cláusula. | Eval de redacción y revisión del abogado | 2 semanas |
| **7. Modo híbrido (opcional)** | Seudonimización local + BYOK + restauración, con consentimiento y bitácora. | Pruebas de no-fuga de datos | 2 semanas |
| **8. Endurecimiento y release** | Pruebas de humo en CI por plataforma, preflight, perfiles de hardware, matriz de release con firma y notarización de macOS, gates de §8. | Release candidato | 2 semanas |

Total orientativo: 4–5 meses con una persona. Las fases 4 y 5 pueden traslaparse con la 6.

## 8. Gates adicionales de publicación

A los 12 gates vigentes se suman:

1. `npm run eval:local-llm` cumple los umbrales de §6 con el modelo publicado en el registro.
2. Prueba de humo del runtime local en Electron real en cada plataforma publicada (CI).
3. Hash del modelo verificado en preflight y registrado en el manifiesto de release.
4. Prueba en equipo de 8 GB y en uno de 16 GB sin GPU, y en una Mac Apple Silicon: sin bloqueos de
   la UI ni cierres por memoria.
5. Primer arranque con descarga del modelo en segundo plano: interrupción y reanudación, hash
   inválido rechazado, proxy corporativo y privacidad estricta sin consentimiento (no descarga).
6. El gate vigente "instalación, primera apertura, actualización y desinstalación en Windows limpio"
   se aplica a cada plataforma publicada; en macOS además firma y notarización aceptadas.
7. Revisión legal de la licencia del modelo distribuido y de los avisos al usuario.

## 9. Riesgos y mitigaciones

| Riesgo | Mitigación |
| --- | --- |
| Alucinación jurídica en un modelo pequeño | Gramática con `enum` de IDs, salida corta, validación local obligatoria, esqueleto determinista y descarte por hallazgo. |
| Latencia inaceptable en CPU | Perfiles de hardware, descomposición, caché por fragmento, streaming, cancelación y límites por perfil. |
| Presión de memoria (SLM + LanceDB + MiniLM) | Un trabajo a la vez, descarga por inactividad, contexto acotado y advertencia en el perfil Ligero. |
| Fallos de drivers GPU | Worker aislado, reinicio automático en CPU y opción "forzar CPU". |
| Descarga de ~2.5 GB fallida o lenta | Reanudación, verificación de hash, la app funciona sin el modelo y el modelo Ligero como alternativa. |
| Firma y notarización de macOS | Cuenta Apple Developer y pipeline de notarización desde la Fase 8; sin ellas macOS bloquea la app. |
| Linux sin llavero | Mensaje claro en la app y requisito documentado; la bóveda no escribe sin cifrado. |
| Licencia del modelo | Preferir Apache 2.0 (Qwen); Gemma sólo tras revisión legal. |
| Calidad desigual en español jurídico mexicano | Conjunto dorado propio; ajuste fino LoRA como línea futura, fuera de este alcance. |
| Mantenimiento de dos rutas (monolítica vs descompuesta) | Abstracción común, validador y bitácora compartidos; con el tiempo la ruta descompuesta podría servir también a BYOK y reducir su costo. |
| Expectativas del usuario | Etiquetado claro del motor y comparación honesta con la API propia en la UI y la documentación. |

## 10. Preguntas abiertas

1. ¿Las tres plataformas se publican a la vez o en etapas? (Sugerencia: Windows, luego macOS, luego Linux.)
2. ¿Hardware mínimo comercialmente aceptable para el público objetivo (despachos y áreas legales)?
3. ¿Quién valida el conjunto dorado y con qué frecuencia se re-evalúa al cambiar de modelo?
4. ¿Proveedor de almacenamiento para alojar el modelo?
5. ¿Se contempla una instalación en servidor compartido por varios usuarios de un despacho? (Cambiaría la arquitectura del motor.)
