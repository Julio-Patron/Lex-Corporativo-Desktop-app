# Arquitectura de procesamiento y gate de publicación

> Estado por gate al 19 de octubre de 2026: ver la sección 7 de [plan-cierre-desarrollo-y-piloto.md](plan-cierre-desarrollo-y-piloto.md). Los gates de este documento aplican al release comercial; el piloto interno sin firma no es un release.

## Decisión de producto

Lex Corporativo Desktop es una estación BYOK. La generación requiere una API key del usuario para Gemini, OpenAI o Anthropic. No se incluye ni se ofrece inferencia mediante GGUF, Rust o un LLM local.

Permanecen locales:

- bóveda SQLite y portafolio;
- corpus jurídico de las cinco materias (mercantil, laboral, comercio exterior, aduanal y fiscal; 16 ordenamientos);
- LanceDB y MiniLM;
- extracción y selección de fragmentos;
- reglas deterministas y CFDI;
- validación de citas y afirmaciones;
- trazabilidad mediante hashes.

En una operación generativa se transmiten por HTTPS la instrucción, los extractos documentales seleccionados, los fundamentos recuperados y el contrato de salida. No se transmiten el archivo binario original, la bóveda completa ni otros asuntos.

## Política de grounding

LanceDB y el corpus verificado son la fuente común de fundamentación. La API recibe hasta ocho disposiciones con extractos limitados y diversidad entre ordenamientos. Si no se recupera evidencia jurídica suficiente, la operación se abstiene antes de contactar al proveedor. Toda respuesta jurídica pasa después por validación local.

## Estado técnico

| Elemento | Estado |
| --- | --- |
| Electron main, preload y renderer | Integrado |
| Bóveda SQLite | Integrada y probada |
| Corpus fuente | 16 ordenamientos y 7,348 disposiciones; consultar el manifiesto canónico para cifras posteriores |
| LanceDB y embeddings | Integrados |
| BYOK multiproveedor | Integrado |
| Validación de fundamentación | Integrada |
| Motor generativo local | Fuera del producto |
| Instalador firmado | Pendiente |

## Gates obligatorios

1. `npm run lint`.
2. `npm test`.
3. `npm run test:vault:electron`.
4. `npm run audit:corpus-governance:strict`.
5. `npm run audit:legal-knowledge:strict`. El modo sin `:strict` informa incumplimientos, pero no garantiza que éstos produzcan un código de salida de error.
6. `npm run audit:legal-retrieval`.
7. `npm run eval:legal-rag`.
8. Pruebas reales de conexión y generación con Gemini, OpenAI y Anthropic.
9. `npm run preflight:release:strict`.
10. `npm run build:electron`.
11. Instalación, primera apertura, actualización y desinstalación en Windows limpio.
12. Firma, hash y manifiesto de release.
13. `npm run test:recovery:electron`: cierre, recarga, reinicio y escritura en curso sin pérdida de la redacción confirmada.
14. Exportación y restauración del respaldo en otro perfil de Windows, con protección y alcance documentados y contenido, adjuntos y relaciones verificados; archivos inválidos e importaciones repetidas no deben dañar datos existentes.
15. Matriz de aceptación de rendimiento, accesibilidad y proveedores, con criterios acordados, responsables y evidencias conforme al [roadmap de entrega](relevo-ux-ui.md#matriz-de-aceptación-de-las-fases-2-a-6).
16. Trazabilidad de los insumos de construcción, incluida revisión y hashes del modelo y tokenizador, y aceptación del instalador final por hash. Comparar los insumos con el candidato anterior al merge y repetir las pruebas según el impacto documentado; si no puede delimitarse, repetir la matriz aplicable completa. Publicar los artefactos aceptados sin reconstruirlos.
17. Procedimiento de retirada ensayado en el canal de prueba, incluida atención a usuarios que ya instalaron la versión y conservación de sus datos.

No se debe crear un release comercial mientras alguno de estos gates permanezca pendiente.

CI debe comprobar que los controles de conocimiento jurídico e integridad del manifiesto bloquean ante incumplimientos controlados en una copia aislada. La existencia de un reporte no acredita que el control haya aprobado. Los resultados históricos conservan su alcance original y no acreditan automáticamente estos requisitos ampliados.
