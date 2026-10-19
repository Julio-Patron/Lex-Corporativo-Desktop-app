# Triaje de reportes y criterios de salida del piloto

## Operación durante el piloto

- **Triaje diario** por el responsable del producto con apoyo del asistente: asignar severidad definitiva, detectar duplicados, vincular con escenario y con hallazgo de auditoría si aplica, registrar decisión.
- **S1**: corrección inmediata; nuevo build `1.0.0-rc.18` (o siguiente) distribuido por el mismo enlace privado con su manifiesto y hash; aviso a todas las personas participantes. Ningún tag ni release en GitHub.
- **S2**: corrección en el lote semanal; si se acumulan dos o más S2 sin alternativa, se adelanta el build.
- **S3 y S4**: backlog posterior al piloto, salvo que el responsable decida incluirlos en un lote.
- **Congelación**: durante el piloto sólo entran a `main` commits `fix(...)` derivados de reportes del piloto y `docs(...)`. Cualquier `feat(...)` espera al cierre.
- Cada build de corrección repite la evidencia automática (`npm run ci:quality`, `npm run ci:windows`, auditorías de datos, seguridad y rendimiento) sobre su SHA y actualiza `docs/piloto/manifiesto-instalador.md`.

## Registro de aceptación

Cada ejecución de escenario se anota en la matriz de aceptación con: escenario, resultado esperado, resultado observado, persona responsable, fecha, SHA del código, entorno (Windows, equipo), enlace a la evidencia, versión y hash del instalador. Una casilla no se marca por haber generado un reporte: se marca cuando el resultado observado coincide con el esperado.

## Criterios de salida (propuestos; el responsable confirma los números)

| Criterio | Umbral |
| --- | --- |
| Personas participantes que completan todos los escenarios P0 | ≥ 3 (sugerido 3 a 5) |
| Instalación exitosa (INS-01) | 100 % de los equipos |
| Reportes S1 abiertos al cierre | 0 |
| Reportes S2 abiertos al cierre | ≤ 2, cada uno con alternativa documentada |
| Arranque en frío dentro de umbral (INS-02: mediana < 5 s, máx < 15 s) | ≥ 80 % de los equipos |
| RES-03 (restauración en otro usuario de Windows) completado con contenido idéntico | al menos 1 vez |
| CFG-01 completado con los tres proveedores (entre todas las personas) | Gemini, OpenAI y Anthropic |
| Encuesta de cierre: utilidad percibida en Buscador, Auditar y Generar | promedio ≥ 4 / 5 |

## Qué cierra el piloto y qué no

Cierra o avanza: PERF-01 (cinco muestras del instalador por equipo), DATA-01 (RES-03), gate 8 parcialmente (proveedores reales con claves de las personas participantes), gate 13 (REC-01/02), gate 14 (RES-03), gate 15 parcialmente (A11Y-01/02).

No cierra: firma Authenticode (gate 11 completo y preflight estricto, gate 9), CI alojado con protecciones de rama y entornos (O9), release comercial (gate 12), trazabilidad del instalador final por hash firmado (gate 16), procedimiento de retirada ensayado (gate 17). Estos siguen en `docs/arquitectura-procesamiento-y-gate-publicacion.md` como pendientes.

## Al cerrar el piloto

1. Consolidar reportes por área y severidad; anexar la encuesta.
2. Actualizar `docs/auditorias/hallazgos-2026-10-19.json` con los hallazgos cerrados por el piloto (PERF-01, DATA-01) y los nuevos hallazgos PIL-xx que queden abiertos.
3. Decidir la siguiente fase: candidato firmado (requiere certificado, huella y `DISTRIBUTION_REPOSITORY`) o nuevo ciclo de piloto.
4. Pedir a las personas participantes que ejecuten el borrado completo de `datos-y-privacidad-piloto.md` y revoquen sus claves de prueba.
