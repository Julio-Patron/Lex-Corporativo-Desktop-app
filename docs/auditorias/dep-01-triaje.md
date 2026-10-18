# DEP-01. Triaje de avisos npm

Fecha del triaje: 17 de octubre de 2026. Base del hallazgo: `reports/audits/npm-audit-2026-10-17.json` (36 paquetes, 18 altos y 18 moderados, ninguno crítico). Ese informe cuenta paquetes, no fallos explotables del producto.

No se usó `npm audit fix --force`. No se bajó ninguna dependencia de producción a una versión mayor anterior. Los “arreglos” que npm proponía para `@lancedb/lancedb@0.30.0`, `@xenova/transformers@1.4.2`, `electron-builder@26.5.0`, `@tailwindcss/typography@0.5.4` y `mammoth@0.3.29` son bajadas de línea y se rechazaron.

## Actualizaciones aplicadas

Quedan dentro de la misma línea mayor que ya declaraba `package.json`, o son overrides de transitivas con parche publicado.

| Paquete | Antes | Ahora | Por qué |
| --- | --- | --- | --- |
| electron | 42.6.1 | ^42.11.15 | Cubre GHSA-qmv3-fv6v-rmhq (caché del preload en sandbox, corregido en 42.10.0) y los otros tres avisos de la serie 42.9.2. |
| react-router-dom | 7.18.1 | ^7.18.4 | El parche 7.18.2 cierra el aviso RSC. La aplicación usa `HashRouter` y no ejecuta acciones RSC. |
| vitest | 4.1.10 | ^4.1.12 | Parche de `@vitest/mocker`. Solo corre en pruebas. |
| postcss | 8.5.16 | ^8.5.30 | Parche de lectura de mapas de fuente. Solo corre al construir el CSS. |
| @xmldom/xmldom | 0.8.13 | 0.8.15 | `mammoth` analiza el XML de los DOCX del usuario. 0.8.15 sigue en `^0.8.6` y conserva `lib/dom`, que mammoth importa. |
| dompurify | 3.4.11 | 3.4.17 | Transitiva de `jspdf`. El exportador no llama a `html()`. |
| protobufjs | 7.6.2 forzado | 7.6.6 y 7.6.5 | El override anterior fijaba una versión vulnerable. `@huggingface/transformers` quedó en 7.6.6. La copia de `@xenova/transformers` quedó en 7.6.5. Las dos salen de `<=7.6.4`. |
| js-yaml | 4.2.0 | 4.3.2 | Lo usa `electron-updater` para el manifiesto de actualización. No se pasó a la línea 5. |
| tar, brace-expansion, fast-uri, http-cache-semantics, source-map-js, nanoid 3, browserslist, baseline-browser-mapping, undici 6 y 7 | ver `overrides` | parche de la misma línea | Herramientas de empaquetado, construcción o instalación. No se subió undici a la 8 ni fast-uri a la 4. |

`better-sqlite3` no cambia de versión. Hay que recompilarlo para el ABI de Node y para el de Electron 42.11.

## Avisos que siguen en npm y no se aplican al producto

| Paquete | Aviso | Decisión |
| --- | --- | --- |
| electron, ventanas | GHSA-gr2m-v5gq-v685 | `setWindowOpenHandler` deniega toda ventana nueva. Igual se sube Electron. |
| electron, protocolos | GHSA-j84w-jfhq-vhvj | No hay `protocol.handle` ni registro de `file:` o `http:`. `lexcorp:` es un enlace del sistema, leído en el proceso principal. |
| electron, webview | GHSA-9qh4-3jw8-366w | El código no usa `<webview>`. |
| react-router | GHSA-qwww-vcr4-c8h2 | `HashRouter` local. No hay modo RSC ni acciones de servidor. |
| sharp y libvips | GHSA-f88m-g3jw-g9cj, GHSA-rgj7-g3m4-5g8c, GHSA-wq5f-xc86-pv6w | `@xenova/transformers` importa `sharp` al reexportar `utils/image.js`. La aplicación solo llama a `pipeline('feature-extraction')` con texto. No decodifica imágenes del usuario. El parche exige sharp 0.35, fuera de `^0.32.0` y de la copia 0.33.5. No se fuerza esa subida. |
| @lancedb/lancedb y @huggingface/transformers | el aviso es la cadena sharp / onnxruntime | `@huggingface/transformers` es dependencia opcional de LanceDB. El código no importa `@lancedb/lancedb/embedding/transformers`. Bajar LanceDB a 0.30.0 no es el arreglo. |
| @xenova/transformers | el aviso es sharp | Misma decisión que sharp. El modelo MiniLM sigue fijado. |
| mammoth / argparse / sprintf-js | GHSA-hp3w-g68c-fv3c | `sprintf-js@1.1.3` no tiene versión corregida. mammoth lo usa en su CLI (`argparse`), no al leer el DOCX. El mismo paquete llega por `roarr` en electron-builder. |
| electron-builder, app-builder-lib, dmg-builder, electron-builder-squirrel-windows, @electron/get, global-agent, roarr | cadena hasta sprintf-js | Solo empaquetan. electron-builder ya está en 26.15.3. Bajarlo a 26.5.0 dejaría el mismo `sprintf-js` sin parche y rompería el empaquetado actual. |
| @tailwindcss/typography y postcss-selector-parser | GHSA-rj75-hqrm-r3gf | El parser 6.0.10 corre al compilar nuestro CSS. El arreglo es la línea 7.1.6, incompatible con el plugin de tipografía sin otro salto. No hay CSS de terceros en esa compilación. |
| dompurify, si npm aún lo cita | XSS en ganchos de saneado | El PDF se dibuja con la API de texto de jsPDF. No hay llamada a `html()`, que es la que carga DOMPurify. Aun así se fijó 3.4.17. |
| vitest, postcss, browserslist, baseline-browser-mapping, source-map-js, brace-expansion, tar, undici, fast-uri, http-cache-semantics, nanoid 3, js-yaml | denegación de servicio o lectura en herramientas | No están en el flujo del documento del usuario, salvo js-yaml en el actualizador y xmldom en mammoth, que sí se actualizan. El resto se parchea para que el árbol de desarrollo deje de arrastrar el aviso. |

## Licencias de lo que el instalador redistribuye

El inventario de octubre marcó `base-64` y `json-bignum` como “sin metadato”. Los dos usan el campo antiguo `licenses[].type = MIT`. `base-64` incluye `LICENSE-MIT.txt`. `json-bignum` no trae archivo LICENSE; el metadato MIT está en su `package.json`. `json-bignum` entra por `apache-arrow`, que sí va en el paquete. `base-64` entra por `digest-fetch`, opcional.

Binarios de Windows x64 que el empaquetador incluye desde dependencias de producción:

| Binario | Licencia revisada |
| --- | --- |
| `@img/sharp-win32-x64` (`libvips-42.dll`, `libvips-cpp.dll`, `sharp-win32-x64.node`) | `Apache-2.0 AND LGPL-3.0-or-later`. El `LICENSE` del paquete solo reproduce Apache-2.0. libvips 8.15.3 es LGPL-3.0-or-later. |
| sharp 0.32.6 dentro de `@xenova/transformers` | libvips 8.14.5 en `vendor/8.14.5`, también LGPL-3.0-or-later, con su propio aviso. |
| `onnxruntime-node` | MIT |
| `@lancedb/lancedb-win32-x64-msvc` | Apache-2.0 |
| `better-sqlite3` | MIT |
| Electron | MIT, con los avisos de Chromium del propio runtime |

La muestra de 30,3 s y el instalador firmado no forman parte de este triaje. PERF-01 y el paso 12 siguen abiertos.

## Resultado de `npm audit` después del triaje

Quedan 16 paquetes: 4 altos y 12 moderados. Ninguno crítico. Los 20 que salieron del informe son los de la tabla de actualizaciones. Los 16 que siguen tienen como único “arreglo” de npm una bajada de versión mayor, y están en la tabla de no aplicables:

- Altos: `sharp`, `@xenova/transformers`, `@huggingface/transformers`, `@lancedb/lancedb`.
- Moderados: la cadena de `electron-builder` hasta `sprintf-js` (siete paquetes), `mammoth` / `argparse` / `sprintf-js`, y `@tailwindcss/typography` / `postcss-selector-parser`.

`npx tsc --noEmit` pasó. `npm test` con el ABI de Node pasó 213 pruebas, incluidas las de la bóveda. `better-sqlite3` queda compilado para Electron 42.11.15 (ABI 146) y abre SQLite 3.53.2 dentro de ese runtime.

`electron-builder --dir --publish never` generó `release/win-unpacked` con Electron 42.11.15. El ejecutable no quedó firmado. `resources/THIRD-PARTY-NOTICES.txt` está fuera del asar. Las DLL de libvips 8.15.3 y 8.14.5 están en `app.asar.unpacked`. `@xmldom/xmldom` 0.8.15 viaja dentro del asar, junto a mammoth. El instalador NSIS firmado y el Windows limpio siguen en el paso 12.

## Qué no cierra DEP-01

El hallazgo sigue abierto. Cada aviso quedó actualizado o justificado, y los dos ABI y el directorio desempaquetado ya se probaron. No hay instalador firmado ni aceptación del responsable sobre los 16 avisos que siguen sin parche compatible.
