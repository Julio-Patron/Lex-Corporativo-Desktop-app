# Escenarios del piloto 1.0.0-rc.19

Cada escenario tiene identificador, ruta en la aplicación, prerrequisitos, pasos, resultado esperado y prioridad. **P0** es obligatorio para todas las personas participantes; **P1** debe cubrirse al menos por dos personas; **P2** es deseable. La última columna indica qué hallazgo de auditoría o gate de publicación ayuda a cerrar.

Registra cada ejecución con la plantilla de retroalimentación, incluso cuando el resultado sea el esperado. Usa únicamente documentos anonimizados.

## Instalación y ciclo de vida

| ID | Pr. | Escenario | Pasos | Esperado | Cierra |
| --- | --- | --- | --- | --- | --- |
| INS-01 | P0 | Verificar hash e instalar | `Get-FileHash` del instalador; comparar con el manifiesto; ejecutar; SmartScreen → Más información → Ejecutar de todas formas; instalar en la ruta por defecto | Hash coincide; instalación por usuario sin pedir administrador; acceso directo creado | Gate 11 (parcial) |
| INS-02 | P0 | Arranque en frío ×5 | Cerrar la app; abrirla y cronometrar hasta ver el Buscador; repetir 5 veces | Mediana < 5 s, ninguna muestra > 15 s. Anotar las cinco cifras | PERF-01 |
| INS-03 | P1 | Ruta con espacios y acentos | Instalar en una carpeta con espacios y acentos (por ejemplo `C:\Pruebas Jurídicas\Lex`) | Arranca y funciona igual | — |
| INS-04 | P0 | Desinstalar y reinstalar | Crear un asunto; desinstalar desde Configuración de Windows; comprobar que `%APPDATA%\Lex Corporativo` sigue; reinstalar | Los asuntos siguen tras reinstalar; la desinstalación no borra datos (por diseño) | Gate 11 (parcial) |
| INS-05 | P1 | Buscar actualizaciones | Configuración → Acerca de → Buscar actualizaciones | Mensaje de que no hay actualización disponible; nada se descarga | — |

## Buscador normativo (`/`)

| ID | Pr. | Escenario | Pasos | Esperado | Cierra |
| --- | --- | --- | --- | --- | --- |
| BUS-01 | P0 | Consulta libre por materia | Escribir una pregunta fiscal (p. ej. "plazo para presentar declaración anual personas morales") con red desconectada | Resultados con artículos citados del corpus local; sin red funciona | — |
| BUS-02 | P0 | Abrir texto oficial | Desde un resultado, abrir «Texto oficial» | Se abre en el navegador el texto vigente de esa ley en la Cámara de Diputados (la RMF, en la página del SAT) | — |
| BUS-03 | P1 | Consulta ambigua entre materias | Pregunta que mezcle laboral y fiscal (p. ej. "retención de ISR en finiquito") | La app sugiere o enruta la materia; los resultados son pertinentes | — |
| BUS-04 | P1 | Sin resultados | Consulta fuera del corpus (p. ej. derecho penal) | Mensaje de abstención claro, sin inventar fuentes | Política de grounding |

## Leyes (`/leyes`)

| ID | Pr. | Escenario | Pasos | Esperado | Cierra |
| --- | --- | --- | --- | --- | --- |
| LEY-01 | P0 | Lista de leyes | Abrir Leyes, buscar «LFT» y filtrar por materia | Aparecen las 16 leyes y reglamentos con su número de artículos o reglas; el filtro funciona | — |
| LEY-02 | P1 | Texto oficial | En una ley, abrir «Texto oficial» | Se abre en el navegador el PDF vigente de la Cámara de Diputados; la RMF abre la página del SAT y las RGCE su compilación oficial | — |

## Auditar documento (`/estudio/auditar`)

| ID | Pr. | Escenario | Pasos | Esperado | Cierra |
| --- | --- | --- | --- | --- | --- |
| AUD-01 | P0 | Revisión básica sin clave | Sin clave activa, cargar un PDF anonimizado, elegir materia, Auditar | Resultado "revisión básica por reglas" con hallazgos deterministas y aviso de que la IA requiere clave | — |
| AUD-02 | P0 | Revisión con IA | Con clave activa, repetir con el mismo PDF | Resultado con afirmaciones que citan `FUENTE_ID` del corpus o fragmentos `doc:N`; fuentes consultables | Gate 8 (parcial) |
| AUD-03 | P0 | Ver qué se envía | Antes de auditar con IA, abrir el detalle de lo que se enviará al proveedor | Lista de secciones y conteo de caracteres; no se envían archivos originales ni la bóveda | — |
| AUD-04 | P1 | DOCX | Repetir AUD-02 con un DOCX | Igual que con PDF | — |
| AUD-05 | P1 | Archivo dañado, vacío o muy grande | Cargar un PDF corrupto, un archivo vacío y uno de más de 50 páginas | Error claro sin cerrar la app; el grande se procesa o avisa del recorte | — |
| AUD-06 | P0 | Clave inválida | Cambiar la clave por una inventada y auditar | Error claro del proveedor sin mostrar la clave; opción de volver a la revisión básica | SEC-03 |
| AUD-07 | P1 | Sin red con clave activa | Desconectar la red y auditar con IA | Cae a la revisión básica e informa el motivo (`fallbackReason`) | — |

## Generar documento (`/estudio/generar`)

| ID | Pr. | Escenario | Pasos | Esperado | Cierra |
| --- | --- | --- | --- | --- | --- |
| GEN-01 | P0 | Generar desde plantilla | Elegir una plantilla de tu materia, llenar campos, generar con IA | Borrador coherente; los datos no proporcionados aparecen como `[DATO FALTANTE]`; citas verificables | Gate 8 (parcial) |
| GEN-02 | P0 | Exportar | Exportar el borrador a DOCX y a PDF | Archivos abren en Word y en un lector PDF con el formato esperado | — |
| GEN-03 | P0 | Guardar en portafolio | Guardar el borrador en un asunto | Aparece en el asunto con fecha | — |
| GEN-04 | P1 | Sin clave | Desactivar la IA e intentar generar | Mensaje de que la redacción requiere clave; sin error técnico | — |

## Portafolio (`/estudio/portafolio`)

| ID | Pr. | Escenario | Pasos | Esperado | Cierra |
| --- | --- | --- | --- | --- | --- |
| POR-01 | P0 | Crear y renombrar asunto | Crear un asunto, renombrarlo | Nombre actualizado; sin duplicados | DATA-03 |
| POR-02 | P0 | Adjuntar actividad | Guardar en el asunto un análisis y un borrador | Ambos visibles con su fecha; se pueden reabrir | — |
| POR-03 | P1 | Eliminar | Eliminar un borrador y luego el asunto completo | Confirmación previa; desaparecen; sin rastros en la lista | — |
| POR-04 | P1 | Conservación | Configuración → Datos → cambiar conservación a 30 días y volver a "hasta que yo los elimine" | Cambio aplicado; ningún asunto reciente desaparece | — |
| POR-05 | P2 | Exportar desde asunto | Exportar a PDF/DOCX un análisis guardado | Archivo correcto | — |

## Configuración (`/configuracion`)

| ID | Pr. | Escenario | Pasos | Esperado | Cierra |
| --- | --- | --- | --- | --- | --- |
| CFG-01 | P0 | Conectar proveedor | Cargar clave del proveedor que tengas; probar conexión | Conexión correcta; modelo mostrado. Si tienes más de un proveedor, repite con cada uno | Gate 8 |
| CFG-02 | P1 | Cambiar modelo | Cambiar el identificador del modelo por otro válido y por uno inexistente | El válido funciona; el inexistente da error claro o cae al modelo de respaldo e informa cuál se usó | — |
| CFG-03 | P2 | Texto máximo por operación | Bajar el límite y auditar un documento largo | El resultado indica que se recortó texto | — |
| CFG-04 | P0 | Privacidad y actualizaciones | Comprobar que "Privacidad estricta" está activa; desactivarla; activar actualizaciones; buscar actualizaciones; volver a dejar todo como estaba | No hay actualización; al reactivar privacidad estricta las actualizaciones se apagan solas | — |
| CFG-05 | P1 | Exportar bitácora | Configuración → Datos → Exportar bitácora; abrir el archivo | Sólo hashes, modelos, tiempos y razones; **ningún texto de tus documentos ni claves** | SEC-03 |

## Respaldo y restauración (Configuración → Datos)

| ID | Pr. | Escenario | Pasos | Esperado | Cierra |
| --- | --- | --- | --- | --- | --- |
| RES-01 | P0 | Crear respaldo | Crear respaldo con contraseña de 8 o más caracteres | Archivo `.json` guardado; al abrirlo con el Bloc de notas no se lee ningún nombre de asunto ni texto | DATA-01 |
| RES-02 | P1 | Contraseña corta | Intentar con 7 caracteres | Rechazo con mensaje claro | — |
| RES-03 | **P0** | **Restaurar en otro usuario de Windows** | En otra cuenta de Windows del mismo equipo (o en otro equipo) instalar la app y restaurar el respaldo con la misma contraseña; comparar asuntos, documentos y borradores con el original | Todo coincide; mismo número de asuntos; contenido idéntico | **DATA-01, gate 14** |
| RES-04 | P1 | Contraseña incorrecta | Restaurar con otra contraseña | Rechazo; el portafolio no cambia | — |
| RES-05 | P1 | Importar dos veces | Restaurar el mismo archivo dos veces | La segunda no duplica nada e informa cuántos se omitieron | — |
| RES-06 | P1 | Conflicto | Modificar un asunto y restaurar un respaldo anterior | Aviso de conflicto; nada cambia hasta confirmar el reemplazo | — |
| RES-07 | P2 | Archivo truncado | Recortar el archivo de respaldo con un editor y restaurar | Mensaje de archivo dañado; el portafolio no cambia | — |

## Recuperación de redacción pendiente

| ID | Pr. | Escenario | Pasos | Esperado | Cierra |
| --- | --- | --- | --- | --- | --- |
| REC-01 | P0 | Cerrar con la X | Redactar sin guardar; cerrar la ventana; reabrir | El borrador reaparece con título, plantilla y campos | Gate 13 |
| REC-02 | P1 | Matar el proceso | Redactar; terminar "Lex Corporativo" desde el Administrador de tareas; reabrir | El borrador reaparece | Gate 13 |
| REC-03 | P1 | Guardar limpia la recuperación | Guardar el borrador en un asunto; cerrar; reabrir | No se ofrece recuperación duplicada | — |
| REC-04 | P2 | Reinstalar con borrador pendiente | Dejar un borrador sin guardar; reinstalar; abrir | El borrador reaparece | — |

## Accesibilidad básica

| ID | Pr. | Escenario | Pasos | Esperado | Cierra |
| --- | --- | --- | --- | --- | --- |
| A11Y-01 | P1 | Teclado | Recorrer las seis rutas sólo con Tab, Shift+Tab, Enter y Esc | Todo control alcanzable; foco visible; los diálogos se cierran con Esc | Gate 15 (parcial) |
| A11Y-02 | P1 | Zoom y escala | Zoom 150 % (Ctrl +) y escala de Windows 125 % | Sin texto cortado ni controles ocultos; el botón Auditar alcanzable con desplazamiento | — |
| A11Y-03 | P2 | Lector de pantalla | Con NVDA o Narrador, recorrer Buscador y Configuración | Etiquetas de botones y campos anunciadas con sentido | — |
