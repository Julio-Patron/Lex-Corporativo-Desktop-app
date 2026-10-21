# Manifiesto del instalador del piloto

Build interno **sin firma** para pruebas con usuarios. No es un release comercial. Lo genera el workflow `build-installer.yml` de GitHub Actions con `npm run pilot:manifest`; el `pilot-manifest.json` completo viaja dentro del artefacto.

**Build vigente del piloto** (GitHub Actions, corrida `39670134168`):

| Campo | Valor |
| --- | --- |
| Versión | 1.0.0-rc.19 |
| Commit de construcción | `f78b52bb183fb155ced7ed433b03b2972e045d20` (`main`, fusión del PR #3) |
| Instalador | `Lex-Corporativo-Setup-1.0.0-rc.19.exe` |
| SHA-256 | `04cdc2fe57f06e81119e08cc4e9b09e6b6ade0ac319e4afa3527b7e5bb4bedea` |
| Tamaño | 338.2 MB (354 625 877 bytes) |
| Firma Authenticode | NotSigned (build interno sin firma; SmartScreen mostrará advertencia) |
| Fecha de construcción | 2026-10-21T20:29Z |
| Node / Electron / electron-builder | v24.21.0 / 42.11.15 / 26.15.3 |
| Artefacto | `Lex-Corporativo-Setup-1.0.0-rc.19-f78b52bb183fb155ced7ed433b03b2972e045d20` (instalador, blockmap, `latest.yml`, `pilot-manifest.json`; caduca el 2026-11-20) |
| Verificación | pass (8/8 comprobaciones); el SHA-256 del instalador descargado coincide con el del `pilot-manifest.json` |

Para descargarlo: GitHub → Actions → Build Installer → corrida `39670134168` → Artifacts, o `gh run download 39670134168`. El responsable lo sube al enlace privado del piloto junto con este documento.

Cambios frente a 1.0.0-rc.18:

- Leyes actualizadas al 20 de octubre de 2026: 2.ª y 3.ª resoluciones de modificaciones a la RMF, 2.ª de las RGCE y decreto de la LIGIE del 13-10-2026 (`da0510e`).
- Artículos corregidos: siete errores de segmentación y 164 artículos con sufijo que estaban dentro del anterior, por ejemplo Código de Comercio 1390 Bis 1 a 50 (`4e6bc3f`). Las disposiciones pasan de 7,348 a 7,515 y el almacén de vectores se regenera. Detalle en `docs/auditorias/corpus-2026-10-20.md`.
- Las citas y la búsqueda reconocen artículos con sufijo numerado o letra separada, como «1390 Bis 12» o «17 A» (`e6c51a2`).
- La página Leyes sólo lista las leyes con enlace a su texto oficial; se retiran el lector y las descargas (`7fbf399`).

Builds anteriores, superados:

- 1.0.0-rc.18, commit `d11df09`, SHA-256 `31c238f7…fa76`, 354 362 006 bytes, corrida `39540767960`.
- 1.0.0-rc.17, commit `6f68681`, SHA-256 `3a4402a3…71d1`, 355 007 236 bytes, corrida `39253335020`.

## Verificar antes de instalar

```powershell
Get-FileHash .\Lex-Corporativo-Setup-1.0.0-rc.19.exe -Algorithm SHA256
```

El valor debe ser exactamente `04CDC2FE57F06E81119E08CC4E9B09E6B6ADE0AC319E4AFA3527B7E5BB4BEDEA`. Si no coincide, no instales y avisa al responsable del piloto.

## Evidencia asociada

| Control | Resultado |
| --- | --- |
| CI, corrida `39670134166`: TypeScript, bóveda en Node y gates legales | pass |
| CI, corrida `39670134166`: bóveda, recuperación e interfaz en Electron (Windows) | pass |
| `npm test` en CI (Ubuntu y Windows) | 269 de 269 pass, 49 archivos, ninguna omitida |
| Controles de publicación (`test:release-controls`) | pass (8/8) |
| Gobernanza del corpus, conocimiento legal, recuperación, evaluación RAG y fallas deliberadas de los gates | pass en CI |
| Recorrido de interfaz (`test:ui:electron`) | pass en CI |
| Auditorías de datos, seguridad y rendimiento, `npm audit` y preflight | No se repitieron para rc.19; siguen vigentes los resultados de rc.17 (`docs/auditorias/*-2026-10-19.md`). rc.19 cambia el corpus, el almacén de vectores, la búsqueda de citas y la página Leyes; no toca bóveda, cifrado, red ni dependencias (el lockfile sólo cambia la versión). |

## Distribución

Enlace privado proporcionado por el responsable del piloto. Cada push a `main` que toque código genera un artefacto nuevo; el siguiente build de corrección (`1.0.0-rc.20`) se distribuirá por el mismo canal con su propio manifiesto. Si se prefiere un enlace de GitHub, ejecutar el workflow manualmente con `publish_prerelease` crea el tag y un pre-release con los mismos archivos.
