# Manifiesto del instalador del piloto

Build interno **sin firma** para pruebas con usuarios. No es un release comercial. Lo genera el workflow `build-installer.yml` de GitHub Actions con `npm run pilot:manifest`; el `pilot-manifest.json` completo viaja dentro del artefacto.

**Build vigente del piloto** (GitHub Actions, corrida `39253335020`):

| Campo | Valor |
| --- | --- |
| Versión | 1.0.0-rc.17 |
| Commit de construcción | `6f68681adc0562c3a33b83c9deccb09c14a9a7c3` (`main`) |
| Instalador | `Lex-Corporativo-Setup-1.0.0-rc.17.exe` |
| SHA-256 | `3a4402a3af254d0c0d1f97306eca029e0dbe1d701ca2f02e318f8561875771d1` |
| Tamaño | 338.6 MB (355 007 236 bytes) |
| Firma Authenticode | NotSigned (build interno sin firma; SmartScreen mostrará advertencia) |
| Fecha de construcción | 2026-10-19T12:40Z |
| Node / Electron / electron-builder | v24.21.0 / 42.11.15 / 26.15.3 |
| Artefacto | `Lex-Corporativo-Setup-1.0.0-rc.17-6f68681adc0562c3a33b83c9deccb09c14a9a7c3` (instalador, blockmap, `latest.yml`, `pilot-manifest.json`; caduca a los 30 días) |
| Verificación | pass (8/8 comprobaciones) |

Para descargarlo: GitHub → Actions → Build Installer → corrida `39253335020` → Artifacts, o `gh run download 39253335020`. El responsable lo sube al enlace privado del piloto junto con este documento.

Incluye las correcciones posteriores al cierre (`2a946bd`): asuntos indescifrables excluidos del respaldo con aviso, respuesta a `sendSync` rechazado, `hasFallback` ante sustitución de modelo y tolerancia de `getInfo()` en PDF.

Build local previo, superado: commit `e12c206`, SHA-256 `262dda2e…e247d`, 355 006 373 bytes; su evidencia está en `docs/auditorias/evidencia-2026-10-19.json`. El código entre ambos builds sólo difiere en las correcciones anteriores, cubiertas por `npm test` (234/234) y por la corrida de CI `39253334994`.

## Verificar antes de instalar

```powershell
Get-FileHash .\Lex-Corporativo-Setup-1.0.0-rc.17.exe -Algorithm SHA256
```

El valor debe ser exactamente `3A4402A3AF254D0C0D1F97306ECA029E0DBE1D701CA2F02E318F8561875771D1`. Si no coincide, no instales y avisa al responsable del piloto.

## Evidencia asociada

| Control | Resultado |
| --- | --- |
| `ci:quality` (11 pasos, ABI Node) | pass |
| `ci:windows` (8 pasos, Electron: vault, recuperación, UI) | pass |
| Auditoría de datos | pass (5/5) |
| Auditoría de seguridad | pass (3/3) |
| Auditoría de rendimiento | pass (arranque mediana 1 183 ms, máx 1 212 ms; búsqueda caliente 65 ms) |
| `npm audit` | 16 avisos triados (4 altos, 12 moderados), sin críticos ni nuevos |
| Preflight (no estricto) | pass con 3 advertencias de firma, esperadas sin certificado |

## Distribución

Enlace privado proporcionado por el responsable del piloto. Cada push a `main` que toque código genera un artefacto nuevo; un build de corrección (`1.0.0-rc.18`) se distribuirá por el mismo canal con su propio manifiesto. Si se prefiere un enlace de GitHub, ejecutar el workflow manualmente con `publish_prerelease` crea el tag y un pre-release con los mismos archivos.
