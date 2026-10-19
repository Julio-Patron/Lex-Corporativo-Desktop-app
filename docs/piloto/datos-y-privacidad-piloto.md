# Datos y privacidad durante el piloto

## Qué guarda la aplicación en tu equipo

Todo vive en tu perfil de usuario de Windows, en `%APPDATA%\Lex Corporativo`:

| Archivo o carpeta | Contenido | Protección |
| --- | --- | --- |
| `byok-settings.json` | Preferencias y tu clave de IA | La clave está cifrada con el cifrado de Windows (DPAPI) de tu usuario; no se puede leer desde otra cuenta |
| `CaseVault\vault.db` | Portafolio: asuntos, documentos, análisis, borradores | Contenido, nombres de asunto y nombres de archivo cifrados con DPAPI |
| `draft-recovery.bin` | Copia de la redacción en curso para recuperarla tras un cierre | Cifrada con DPAPI; se borra al guardar o descartar |
| `lance_data\` | Copia de la base legal y una tabla temporal con fragmentos de los documentos que auditas | Los fragmentos temporales se cifran al indexarlos, se eliminan al terminar cada auditoría y el archivo se reescribe; además se purgan al arrancar los que tengan más de 24 horas |
| `logs\trace_ledger.jsonl` | Bitácora de trazabilidad: hashes, modelo usado, tiempos, motivo de respaldo | No contiene texto de documentos ni claves. Puedes exportarla desde Configuración → Datos |

La base legal instalada (16 ordenamientos) se copia desde el instalador a esa carpeta la primera vez que abres la aplicación.

## Qué sale de tu equipo

- **Nada**, mientras no uses funciones con IA y no actives actualizaciones.
- Al **auditar o redactar con IA**, la aplicación envía al proveedor que elegiste (Gemini, OpenAI o Anthropic) el texto de la tarea, los fragmentos legales recuperados, el contrato de salida y el texto extraído del documento, recortado al límite que configures. Antes de enviar puedes ver el desglose. No se envían los archivos originales, la bóveda ni la clave de otros proveedores.
- Si pulsas **Buscar actualizaciones** o activas las actualizaciones automáticas, la aplicación consulta GitHub para saber si existe una versión nueva. Durante el piloto déjalas apagadas (es el valor por defecto con Privacidad estricta).

## Reglas del piloto

1. Usa sólo documentos **anonimizados o de prueba**. No cargues expedientes reales.
2. Crea una clave de IA **exclusiva** para el piloto, con límite de gasto, y revócala al terminar.
3. En reportes y capturas no incluyas datos personales ni la clave.
4. Si observas que la aplicación muestra o guarda algo que no debería (una clave en un mensaje de error, texto de un documento en la bitácora), repórtalo como **S1** de inmediato.

## Borrado completo al terminar

La desinstalación **no** borra tus datos: es una decisión de diseño para que una reinstalación o actualización no pierda el portafolio. Para eliminar todo:

1. Abre la aplicación → Configuración → Datos → **Eliminar todos los datos** (escribe `ELIMINAR` para confirmar). Esto borra el portafolio y la copia de recuperación.
2. Configuración → IA → quita la clave de cada proveedor que hayas configurado.
3. Cierra la aplicación y desinstálala desde Configuración de Windows → Aplicaciones → Lex Corporativo.
4. Borra manualmente la carpeta `%APPDATA%\Lex Corporativo` (pega esa ruta en el Explorador de archivos). Con esto desaparecen la base legal copiada, la bitácora y cualquier residuo.
5. Revoca la clave de IA en el panel del proveedor.

Si restauraste un respaldo en otra cuenta de Windows para el escenario RES-03, repite los pasos 1 a 4 también en esa cuenta y borra el archivo de respaldo cuando termines.
