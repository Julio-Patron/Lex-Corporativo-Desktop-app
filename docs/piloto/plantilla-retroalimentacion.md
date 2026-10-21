# Plantilla de retroalimentación del piloto

Copia este bloque por cada escenario ejecutado o incidencia encontrada. Un formulario por escenario, aunque el resultado haya sido correcto. No incluyas datos reales en texto ni en capturas.

```
ID del reporte:            PIL-___ (lo asigna el responsable)
Fecha y hora:
Persona que prueba:        (nombre o alias acordado)
Versión de la app:         1.0.0-rc.18
SHA-256 del instalador:    (copiar del manifiesto)
Windows:                   (resultado de winver, p. ej. Windows 11 Pro 24H2)
Proveedor de IA usado:     ninguno / Gemini / OpenAI / Anthropic   Modelo:
Escenario:                 (ID de escenarios-piloto.md, p. ej. AUD-02; o "libre")

Pasos realizados:
1.
2.
3.

Resultado esperado:

Resultado observado:

Severidad:                 S1 / S2 / S3 / S4 / OK (ver tabla)
Reproducible:              siempre / a veces / una vez
Evidencia:                 (captura sin datos reales, nombre del archivo de prueba, hora exacta)
Impacto en tu trabajo:     (una o dos frases: ¿te detendría usar la herramienta?)
Comentario libre:          (qué te confundió, qué esperabas, qué te gustó)
```

## Severidades

| Nivel | Significado | Ejemplos |
| --- | --- | --- |
| **S1** | Bloquea el uso, pierde datos o expone información | No instala; pierde un asunto; muestra la clave de IA en un error; envía datos sin avisar |
| **S2** | Una función principal falla sin alternativa | Auditar con IA nunca termina; el respaldo no restaura; el PDF exportado está vacío |
| **S3** | Falla con alternativa razonable | El botón queda fuera de vista pero se alcanza con scroll; el modelo de respaldo funciona aunque el elegido no |
| **S4** | Mejora, texto confuso o preferencia | Etiqueta ambigua; orden de pasos poco claro; estética |
| **OK** | El escenario se completó como se esperaba | — |

## Encuesta de cierre (una vez por persona, al final del piloto)

Califica de 1 (nada) a 5 (mucho):

| Pregunta | 1–5 |
| --- | --- |
| El Buscador me ayudó a encontrar el fundamento que necesitaba | |
| La auditoría de documentos señaló riesgos útiles | |
| El Redactor produjo un punto de partida aprovechable | |
| El Portafolio me permitió organizar el trabajo | |
| Entendí en todo momento qué información salía de mi equipo | |
| Instalar y configurar la clave fue sencillo | |
| Usaría esta herramienta en mi práctica diaria | |

Comentario final (qué cambiarías primero):
