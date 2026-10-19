# Manifiesto del instalador del piloto

Build interno **sin firma** para pruebas con usuarios. No es un release comercial. Generado con `npm run pilot:manifest`; el detalle completo está en `release/pilot-manifest.json` (local) y consolidado en `docs/auditorias/evidencia-2026-10-19.json`.

| Campo | Valor |
| --- | --- |
| Versión | 1.0.0-rc.17 |
| Commit de construcción | `e12c206295d3194d1d41aaae94d5dc5f69e6b3a8` |
| Código auditado | `56aa94b` (el commit de construcción sólo añade documentación) |
| Instalador | `Lex-Corporativo-Setup-1.0.0-rc.17.exe` |
| SHA-256 | `262dda2e6745882fb27c392ad2c3552ae3066d96342f195299728040410e247d` |
| Tamaño | 338.6 MB (355 006 373 bytes) |
| Firma Authenticode | NotSigned (build interno sin firma; SmartScreen mostrará advertencia) |
| Fecha de construcción | 2026-10-19T12:10:30Z |
| Node / Electron / electron-builder | v24.21.0 / 42.11.15 / 26.15.3 |
| Recursos empaquetados | corpus 16 archivos, vectores LanceDB 24 archivos, modelo MiniLM 4 archivos; hashes idénticos a los fuentes |
| Contenido del asar | 19 861 entradas; sin `.env`, `byok-settings`, `CaseVault`, `reports`, `scratch` ni claves |
| Verificación | pass (8/8 comprobaciones) |

## Verificar antes de instalar

```powershell
Get-FileHash .\Lex-Corporativo-Setup-1.0.0-rc.17.exe -Algorithm SHA256
```

El valor debe ser exactamente `262DDA2E6745882FB27C392AD2C3552AE3066D96342F195299728040410E247D`. Si no coincide, no instales y avisa al responsable del piloto.

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

Enlace privado proporcionado por el responsable del piloto. Sin tag ni release en GitHub. Un build de corrección (`1.0.0-rc.18`) se distribuirá por el mismo canal con su propio manifiesto.
