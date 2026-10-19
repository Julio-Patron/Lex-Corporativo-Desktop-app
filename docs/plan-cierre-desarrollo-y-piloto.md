# Plan de cierre de la fase de desarrollo y arranque del piloto

Estado al 19 de octubre de 2026. Código de referencia: `main` @ `56aa94b`, versión `1.0.0-rc.17`; instalador construido en `e12c206` (SHA-256 `262dda2e…e247d`, ver `piloto/manifiesto-instalador.md`). Este documento es la fuente vigente; `relevo-ux-ui.md` queda como historia. El índice de documentos vigentes e históricos está en [README.md](README.md).

Convención de SHA: los informes citan el commit de código que auditan. La evidencia automática y el instalador se regeneran sobre el último commit, que puede diferir del anterior sólo en documentación; el manifiesto del piloto lo comprueba y registra ambos.

## 1. Decisiones

| Decisión | Valor | Motivo |
| --- | --- | --- |
| Rama de trabajo | `main` directamente | La rama `desarrollo` se integró (PR #2) y se eliminó |
| Versión del piloto | `1.0.0-rc.17` | En semver `beta` < `rc`: un `beta.1` instalado vería el `rc.16` publicado como actualización. El release `v1.0.0-rc.16` de GitHub se considera obsoleto |
| Firma | Sin firma (build interno) | No hay certificado de código en esta fase; SmartScreen advertirá y la guía del tester lo explica |
| Distribución | Enlace privado + SHA-256 en `docs/piloto/manifiesto-instalador.md` | Sin `git tag` (dispararía `release.yml`, que falla sin secretos) y sin GitHub Release |
| Claves de IA | Cada persona participante usa la suya | Decisión del responsable |
| Qué NO es | No es release comercial | Gates 8, 9 estricto, 11 firma, 12, 15, 16 y 17 de `arquitectura-procesamiento-y-gate-publicacion.md` siguen abiertos |

## 2. Checklist de cierre de desarrollo

| # | Tarea | Estado | Evidencia |
| --- | --- | --- | --- |
| 1 | Auditoría de rendimiento con umbrales codificados | ✅ | `auditorias/rendimiento-2026-10-19.md`, `reports/audits/performance-<sha7>.json` |
| 2 | Auditoría de salud de código (métricas, código muerto, revisión asistida de 15 hallazgos) | ✅ | `auditorias/salud-codigo-2026-10-19.md` |
| 3 | Auditoría de seguridad y datos con ensayos en Electron | ✅ | `auditorias/seguridad-2026-10-19.md`, `reports/audits/{security,data}-<sha7>.json` |
| 4 | Auditoría de pruebas (234 pruebas, cobertura, suites Electron, gates) | ✅ | `auditorias/pruebas-2026-10-19.md` |
| 5 | Re-evaluación de los 8 hallazgos de a718988 y registro de los nuevos | ✅ | `auditorias/hallazgos-2026-10-19.json` |
| 5a | Revisión de calidad de la documentación (F1.G): errores y enlaces rotos corregidos, índice vigente/histórico | ✅ | `revisiones/documentacion-2026-10-19.md`, `docs/README.md` |
| 5b | Revisión de calidad de interfaz y flujo (F1.H): recorrido por las seis rutas y textos contra las reglas de voz; textos corregidos, rediseños al piloto | ✅ | `revisiones/interfaz-y-flujo-2026-10-19.md` |
| 6 | Correcciones derivadas (9 de 15 hallazgos de la revisión) con pruebas RED→GREEN | ✅ | commit `3d242cd` |
| 7 | Limpieza del repositorio con evidencia por elemento | ✅ | `auditorias/limpieza-2026-10-19.md`, commit `46b46b6` |
| 8 | Bump a `1.0.0-rc.17` | ✅ | commit `3983df3` |
| 9 | Evidencia automática completa sobre el SHA final (`ci:quality`, `ci:windows`, auditorías, `npm audit`, preflight) | ✅ | `auditorias/evidencia-2026-10-19.json` |
| 10 | Instalador NSIS sin firma construido y manifiesto del piloto | ✅ | `piloto/manifiesto-instalador.md`, `release/pilot-manifest.json` (local) |
| 11 | Kit del piloto (guía, escenarios, plantilla, triaje, datos y privacidad) | ✅ | `docs/piloto/` |
| 12 | Smoke test en Windows limpio (VM o usuario nuevo), 5 arranques cronometrados | ⬜ responsable | matriz de aceptación (INS-01..05) |
| 13 | Subir instalador + manifiesto al enlace privado y convocar a 3–5 personas | ⬜ responsable | — |
| 14 | Congelación: durante el piloto sólo `fix(...)` y `docs(...)` en `main` | regla vigente | — |

## 3. Checklist de empaquetado (repetible para cada build de corrección)

Precondición: `git status --porcelain` vacío; versión incrementada en `package.json` (`npm version 1.0.0-rc.N --no-git-tag-version`) y confirmada.

```bash
npm rebuild better-sqlite3           # ABI Node
npm run ci:quality                   # 11 pasos; reports/ci/quality/summary.json → pass
npm run ci:windows                   # Node → predev:electron → build → vault, recovery, UI
npm run audit:data:electron          # pass
npm run audit:security:electron      # pass
npm run audit:performance:electron   # pass (umbrales provisionales)
npm run audit:cleanup
npm audit --json > reports/audits/npm-audit-<sha7>.json
npm run preflight:release            # pass con 3 warn (firma, huella, repositorio): esperado sin certificado
npm run build:electron               # release/Lex-Corporativo-Setup-<version>.exe (+ .blockmap, latest.yml)
git status --porcelain               # vacío; si resources/icon.ico cambió, confirmarlo y repetir
npm run pilot:manifest               # release/pilot-manifest.json + bloque para docs/piloto/manifiesto-instalador.md
node scripts/collect-audit-evidence.mjs <sha7> <fecha>   # docs/auditorias/evidencia-<fecha>.json
```

Comprobaciones manuales sobre el artefacto: `Get-FileHash -Algorithm SHA256` coincide con el manifiesto; `Get-AuthenticodeSignature` → `NotSigned` (documentado); `release/win-unpacked/resources/` contiene `THIRD-PARTY-NOTICES.txt` y `legal-runtime/{corpus,lance_data,models,embeddings.lock.json,corpus-manifest.json}`.

Qué no hacer: `git tag v*` (dispara el workflow de candidato firmado, que falla sin secretos); `gh release create`; `npm run preflight:release:strict` (fallará por diseño hasta tener certificado).

## 4. Smoke test en Windows limpio (responsable)

1. Copiar el `.exe` a una VM o a una cuenta de usuario estándar nueva; verificar el hash.
2. Ejecutar → SmartScreen → "Más información" → "Ejecutar de todas formas" → instalar en la ruta por defecto (`%LOCALAPPDATA%\Programs\Lex Corporativo`), sin administrador.
3. Arranque en frío ×5 con cronómetro hasta ver el Buscador: mediana < 5 s, máximo < 15 s. Registrar las cinco cifras (cierra PERF-01 junto con las muestras del piloto).
4. Comprobar `%APPDATA%\Lex Corporativo` (`byok-settings.json`, `CaseVault\`, `lance_data\`, `logs\`).
5. Buscador sin red; Leyes (RMF); Auditar sin clave (revisión básica); Configuración: "Privacidad estricta" activa y "Buscar actualizaciones" → sin actualización.
6. Desinstalar desde Configuración de Windows → la carpeta de datos permanece (por diseño) → reinstalar → los datos siguen.
7. Registrar en la matriz: escenario, esperado, observado, responsable, fecha, SHA, entorno, evidencia, versión y hash.

## 5. Plan del piloto

| Fase | Contenido | Documento |
| --- | --- | --- |
| Convocatoria | 3–5 personas, perfil jurídico, Windows 10/11 x64, con clave propia de al menos un proveedor | — |
| Kit | Guía de instalación y claves, escenarios por área con prioridad P0/P1/P2, plantilla de reporte, reglas de datos | `piloto/guia-tester.md`, `piloto/escenarios-piloto.md`, `piloto/plantilla-retroalimentacion.md`, `piloto/datos-y-privacidad-piloto.md` |
| Sesión 1 | INS-01..05, CFG-01, BUS-01..02, LEY-01, AUD-01..03 | — |
| Sesiones siguientes | GEN-*, POR-*, RES-* (RES-03 obligatorio al menos una vez), REC-*, A11Y-* | — |
| Operación | Triaje diario; S1 → rc.18 inmediato por el mismo enlace; S2 → lote semanal; S3/S4 → backlog | `piloto/triaje-y-criterios-salida.md` |
| Cierre | Criterios de salida; encuesta; actualización de `hallazgos-2026-10-19.json` (PERF-01, DATA-01, PIL-xx); borrado de datos y revocación de claves | `piloto/triaje-y-criterios-salida.md` |
| Duración sugerida | 2–3 semanas | — |

## 6. Decisiones pendientes del responsable

| # | Decisión | Valor por defecto si no se decide |
| --- | --- | --- |
| O2 | Confirmar umbrales de rendimiento (arranque < 5 s mediana / < 15 s máx; búsqueda < 500 ms) o añadir revisión < 3 s, RMF < 1.5 s, memoria < 1.5 GiB | provisionales del 17-oct |
| O3 | Aceptar formalmente los 16 avisos npm de DEP-01 | DEP-01 queda abierto sin bloquear el piloto |
| O6 | Equipo o VM Windows limpio para el smoke test; segunda cuenta de Windows para RES-03 | bloquea el cierre de PERF-01 y DATA-01 |
| O8 | Lista de personas, duración, canal de reporte (Issues privado o hoja), umbrales de salida | propuestos en `triaje-y-criterios-salida.md` |
| O9 | Protecciones de `main`, secretos de firma, entornos de GitHub | post-piloto |
| O10 | Retirar o marcar como pre-release las releases rc obsoletas en GitHub | el responsable lo hace en GitHub |
| SEC-06 | Limitar el fallback de modelo a "no encontrado" o no persistir el modelo resuelto desde "Probar y conectar" | se conserva el comportamiento actual |

## 7. Estado de los gates de publicación (referencia)

| Gate | Estado tras esta fase |
| --- | --- |
| 1–7 (lint, test, vault Electron, gobernanza, conocimiento jurídico, recuperación, evaluación RAG) | pasan en `evidencia-2026-10-19.json` |
| 8 proveedores reales | parcial en el piloto (CFG-01, AUD-02, GEN-01) |
| 9 preflight estricto | falla por diseño sin certificado |
| 10 build:electron | pasa (sin firma) |
| 11 instalación/actualización/desinstalación en Windows limpio | smoke test + INS-* del piloto, sin firma |
| 12 firma, hash y manifiesto de release | pendiente (certificado) |
| 13 recuperación Electron | pasa; REC-* lo repite en instalado |
| 14 respaldo en otro perfil | RES-03 del piloto |
| 15 matriz de aceptación (rendimiento, accesibilidad, proveedores) | parcial en el piloto |
| 16 trazabilidad de insumos | manifiesto del piloto (sin firma) |
| 17 retirada ensayada | pendiente |
