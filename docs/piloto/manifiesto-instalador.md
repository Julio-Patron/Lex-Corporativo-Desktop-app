# Manifiesto del instalador del piloto

Build interno **sin firma** para pruebas con usuarios. No es un release comercial. Lo genera el workflow `build-installer.yml` de GitHub Actions con `npm run pilot:manifest`; el `pilot-manifest.json` completo viaja dentro del artefacto.

**Build vigente del piloto** (GitHub Actions, corrida `39540767960`):

| Campo | Valor |
| --- | --- |
| Versión | 1.0.0-rc.18 |
| Commit de construcción | `d11df099bb74a9ebfba78041f6cc0047f47a6f39` (`main`) |
| Instalador | `Lex-Corporativo-Setup-1.0.0-rc.18.exe` |
| SHA-256 | `31c238f71f5c555c2eef7dfca5f00f01c63f2167dccb64e07cb169991a6ffa76` |
| Tamaño | 337.9 MB (354 362 006 bytes) |
| Firma Authenticode | NotSigned (build interno sin firma; SmartScreen mostrará advertencia) |
| Fecha de construcción | 2026-10-21T03:53Z |
| Node / Electron / electron-builder | v24.21.0 / 42.11.15 / 26.15.3 |
| Artefacto | `Lex-Corporativo-Setup-1.0.0-rc.18-d11df099bb74a9ebfba78041f6cc0047f47a6f39` (instalador, blockmap, `latest.yml`, `pilot-manifest.json`; caduca el 2026-11-20) |
| Verificación | pass (8/8 comprobaciones) |

Para descargarlo: GitHub → Actions → Build Installer → corrida `39540767960` → Artifacts, o `gh run download 39540767960`. El responsable lo sube al enlace privado del piloto junto con este documento.

Cambios frente a 1.0.0-rc.17:

- Lote 1 de la revisión de interfaz (U-01, U-06, U-07, U-08, U-09, U-10, U-12, U-14, U-19) y textos visibles en lenguaje cotidiano (`14762ff`). Detalle en `docs/revisiones/interfaz-y-flujo-2026-10-19.md`.
- Redacción con IA desde una plantilla: entrega el documento completo a partir del machote y lista al final, en «Fundamentos», los artículos de cada sección (`ba6d6dd`).

Build anterior, superado: 1.0.0-rc.17, commit `6f68681`, SHA-256 `3a4402a3…71d1`, 355 007 236 bytes, corrida `39253335020`.

## Verificar antes de instalar

```powershell
Get-FileHash .\Lex-Corporativo-Setup-1.0.0-rc.18.exe -Algorithm SHA256
```

El valor debe ser exactamente `31C238F71F5C555C2EEF7DFCA5F00F01C63F2167DCCB64E07CB169991A6FFA76`. Si no coincide, no instales y avisa al responsable del piloto.

## Evidencia asociada

| Control | Resultado |
| --- | --- |
| CI, corrida `39540768148`: TypeScript, bóveda en Node y gates legales | pass |
| CI, corrida `39540768148`: bóveda, recuperación e interfaz en Electron (Windows) | pass |
| `npm test` local | 227 pass, 14 omitidas (bóveda con el módulo nativo compilado para Electron) |
| Controles de publicación (`test:release-controls`) | pass (8/8) |
| Recorrido de interfaz (`test:ui:electron`, 6 tamaños y zooms) | pass, sin recortes ni desbordes |
| Auditorías de datos, seguridad y rendimiento, `npm audit` y preflight | No se repitieron para rc.18; siguen vigentes los resultados de rc.17 (`docs/auditorias/*-2026-10-19.md`). rc.18 cambia interfaz, textos y el prompt y la validación de la redacción con IA; no toca bóveda, cifrado, red ni dependencias. |

## Distribución

Enlace privado proporcionado por el responsable del piloto. Cada push a `main` que toque código genera un artefacto nuevo; el siguiente build de corrección (`1.0.0-rc.19`) se distribuirá por el mismo canal con su propio manifiesto. Si se prefiere un enlace de GitHub, ejecutar el workflow manualmente con `publish_prerelease` crea el tag y un pre-release con los mismos archivos.
