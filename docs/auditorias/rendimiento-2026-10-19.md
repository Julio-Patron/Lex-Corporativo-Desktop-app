# Auditoría de rendimiento — 19 de octubre de 2026

## Alcance

Arranque del proceso hasta la pantalla de inicio, recarga, primera búsqueda y búsqueda caliente, lectura de la ley más extensa (RMF), revisión básica sintética, exportación PDF y DOCX, memoria antes y después, avisos de CSP, y tamaño del paquete. Re-evalúa PERF-01.

## Entorno

| Elemento | Valor |
| --- | --- |
| Código | `main` @ `2ccc31b`, versión 1.0.0-rc.17 |
| Electron | 42.11.15 |
| Equipo | AMD Ryzen 7 7730U, 39 GB RAM, Windows 11 Pro 10.0.26300 |
| Método | `npm run audit:performance:electron`: 5 procesos Electron nuevos con perfil temporal, ventana oculta, handlers reales; 5 muestras por operación y proceso (25 por operación) |
| Evidencia | `reports/audits/performance-2ccc31b.json` (consolidado en `evidencia-2026-10-19.json`) |

## Umbrales

Provisionales del 17 de octubre de 2026 (`docs/relevo-ux-ui.md`), ahora codificados en `scripts/audit-performance-electron.mjs`; el comando falla si se superan (salvo `--report-only`). Pendiente de confirmación por el responsable (decisión O2).

| Métrica | Umbral | Observado | Cumple |
| --- | --- | --- | --- |
| Arranque hasta Inicio, mediana | < 5 000 ms | 1 204 ms | sí |
| Arranque hasta Inicio, máximo | < 15 000 ms | 1 237 ms | sí |
| Búsqueda caliente, mediana | < 500 ms | 65 ms | sí |

Estado del reporte: `pass`.

## Resultados completos (ms)

| Operación | Mínimo | Mediana | p95 | Máximo |
| --- | --- | --- | --- | --- |
| Proceso → Inicio (5 muestras) | 1 077 | 1 204 | 1 237 | 1 237 |
| Recarga de Inicio | 359 | 383 | 398 | 398 |
| Primera búsqueda (carga del modelo) | 241 | 269 | 281 | 281 |
| Búsqueda caliente | 57 | 65 | 76 | 77 |
| Lectura de la RMF (> 100 000 caracteres) | 8 | 9 | 10 | 10 |
| Revisión básica sintética (sin IA) | 403 | 484 | 606 | 624 |
| Exportación PDF | 56 | 68 | 153 | 177 |
| Exportación DOCX | 10 | 13 | 33 | 33 |

Memoria (suma del conjunto de trabajo de todos los procesos): 443–450 MiB antes de cargar el modelo y los exportadores; 815–845 MiB después. Puede contar memoria compartida; no indica fuga en 5 procesos cortos. Avisos de CSP en consola: ninguno.

Comparación con a718988 (Electron 42.6.1): la mediana de arranque bajó de 1 931 a 1 204 ms y la búsqueda caliente de 122 a 65 ms. La muestra atípica de 30 312 ms del 17 de octubre no reapareció en las 10 muestras de las dos corridas de hoy (máximos 8 188 ms en la corrida previa al bump y 1 237 ms en la final); la causa más probable es el primer arranque tras recompilar módulos nativos con antivirus activo. Sigue sin aislarse; el piloto cronometra cinco arranques por equipo.

## Tamaño del paquete

| Artefacto | Tamaño |
| --- | --- |
| `Lex-Corporativo-Setup-1.0.0-rc.17.exe` | 355 006 471 bytes (338.6 MB) |
| `app.asar` | ver `release/pilot-manifest.json` |
| `out/` (main + preload + renderer) | ver `evidencia-2026-10-19.json` |

El instalador incluye el corpus (16 ordenamientos), la base LanceDB y el modelo MiniLM cuantizado; no incluye ningún LLM.

## Hallazgos previos re-evaluados

| ID | Estado | Motivo |
| --- | --- | --- |
| PERF-01 | **mitigado** | Umbrales codificados y cumplidos en el ensayo con holgura. El cierre exige cinco muestras de arranque en frío del instalador en Windows limpio (smoke test del responsable y escenario INS-02 del piloto, por equipo) y la confirmación de los umbrales (O2). |

## Hallazgos nuevos

Ninguno bloqueante. Observación CODE-03 (salud de código): `EstudioLayout` recarga y descifra todo el portafolio en cada cambio de ruta; con portafolios grandes puede notarse. Medir en el piloto (POR-*).

## Veredicto

**Pasa.** Todas las métricas dentro de los umbrales provisionales con margen amplio; sin avisos de CSP.

## Límites

- Ventana oculta y main de ensayo con handlers reales: no mide el main completo del producto instalado ni el tiempo de pintado.
- Perfiles nuevos y caché del sistema operativo sin purgar: no equivale a arranque tras reiniciar Windows.
- Revisión básica y documento sintético; sin proveedores de IA.
- Exportación con diálogo simulado; no incluye el tiempo de elección del usuario.
