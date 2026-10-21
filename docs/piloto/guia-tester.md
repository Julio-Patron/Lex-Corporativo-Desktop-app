# Guía para personas que prueban Lex Corporativo (piloto 1.0.0-rc.17)

Gracias por participar. Este documento explica qué vas a instalar, cómo hacerlo y qué esperamos de ti durante el piloto. Lee la sección de privacidad antes de cargar cualquier documento.

## 1. Qué es y qué no es este build

- Es un **candidato interno** para pruebas con usuarios. No es la versión comercial.
- **No está firmado digitalmente.** Windows mostrará una advertencia de SmartScreen al ejecutarlo. Es esperado; abajo está el procedimiento.
- **No lo uses con expedientes reales.** Usa documentos anonimizados o de prueba. Las salidas de la herramienta requieren revisión profesional y no constituyen un dictamen.
- Todo lo que generes queda en tu equipo. La única información que sale de tu computadora es el texto que tú decidas enviar al proveedor de IA con tu propia clave (ver sección 5).

## 2. Requisitos

| Requisito | Valor |
| --- | --- |
| Sistema | Windows 10 22H2 o Windows 11, 64 bits |
| Memoria | 8 GB o más |
| Disco | 1.5 GB libres |
| Permisos | No se requiere administrador; la instalación es por usuario |
| Red | Opcional. Sin red funcionan búsqueda, lector de leyes, auditoría por reglas y portafolio. Con IA se necesita red y tu clave |

## 3. Verificar el archivo antes de instalar

Recibirás un enlace privado al instalador `Lex-Corporativo-Setup-1.0.0-rc.17.exe` y a `manifiesto-instalador.md`, que contiene el hash SHA-256 oficial. Antes de ejecutar nada, abre PowerShell en la carpeta de descarga y compara:

```powershell
Get-FileHash .\Lex-Corporativo-Setup-1.0.0-rc.17.exe -Algorithm SHA256
```

Si el hash no coincide con el del manifiesto, **no instales** y avisa al responsable del piloto.

## 4. Instalación

1. Ejecuta el instalador. Windows mostrará "Windows protegió su PC".
2. Haz clic en **Más información** y luego en **Ejecutar de todas formas**. Esto ocurre porque el build interno no está firmado; la versión comercial sí lo estará.
3. Acepta la ruta propuesta (`%LOCALAPPDATA%\Programs\Lex Corporativo`) o elige otra. No requiere administrador.
4. Al terminar, abre **Lex Corporativo** desde el acceso directo del escritorio o del menú Inicio.
5. El primer arranque tarda unos segundos mientras copia la base legal a tu perfil. Anota el tiempo aproximado, lo pediremos en el formulario de instalación.

Tus datos se guardan en `%APPDATA%\Lex Corporativo`. Esa carpeta **no se borra al desinstalar**; la sección 7 explica cómo eliminarla.

## 5. Conectar tu cuenta de IA (opcional)

Las funciones de análisis con IA y redacción requieren una clave propia de uno de estos proveedores. Sin clave puedes usar el buscador, el lector de leyes, la auditoría por reglas y el portafolio.

| Proveedor | Dónde obtener la clave | Modelo por defecto |
| --- | --- | --- |
| Google Gemini | Google AI Studio → "Get API key" | gemini-3.5-flash-lite |
| OpenAI | platform.openai.com → API keys | gpt-4o-mini |
| Anthropic | console.anthropic.com → API keys | claude-sonnet-4-20250514 |

Recomendaciones:

- Crea una clave **exclusiva para el piloto** con límite de gasto bajo y bórrala al terminar.
- Cárgala en **Configuración → IA**: elige el proveedor, pega la clave, activa "Funciones con IA activadas" y usa el botón de probar conexión. La clave se guarda cifrada con el cifrado de Windows de tu usuario.
- Si la clave es inválida o se agota la cuota, la aplicación debe mostrar un error claro y, en Auditar, volver a la revisión básica por reglas. Si ves otra cosa, repórtalo.
- **Nunca compartas tu clave** por el canal del piloto, ni la pegues en capturas de pantalla.

## 6. Qué probar

El documento `escenarios-piloto.md` lista los recorridos por área con su prioridad. Los marcados **P0** son obligatorios para todas las personas participantes. Dedica la primera sesión a instalar, conectar la clave y recorrer el Buscador, Leyes y Auditar. En sesiones posteriores cubre Redactor, Portafolio, respaldo y recuperación.

Al terminar cada escenario, llena la plantilla de `plantilla-retroalimentacion.md` aunque el resultado haya sido correcto: nos interesa saber también qué funcionó y qué te pareció confuso.

## 7. Privacidad y borrado

- Todo se procesa y guarda en tu equipo: portafolio cifrado, base legal, copia de recuperación y bitácora de trazabilidad (que contiene hashes y tiempos, nunca el texto de tus documentos).
- Cuando usas una función con IA, la aplicación te muestra **qué se enviará** al proveedor antes de hacerlo. Sólo ese texto sale del equipo.
- Las actualizaciones automáticas están **apagadas** por defecto y con "Privacidad estricta" activa. Déjalas así durante el piloto. Si pulsas "Buscar actualizaciones", la respuesta esperada es que no hay actualización.
- Para borrar todo al terminar: (1) Configuración → Datos → **Eliminar todos los datos**; (2) Configuración → IA → quitar la clave; (3) desinstala desde Configuración de Windows → Aplicaciones; (4) borra manualmente `%APPDATA%\Lex Corporativo`. El detalle está en `datos-y-privacidad-piloto.md`.

## 8. Cómo reportar

Usa la plantilla de `plantilla-retroalimentacion.md` y el canal que te indique el responsable del piloto (repositorio privado de incidencias u hoja compartida). Para cualquier problema de **pérdida de datos, fuga de información o imposibilidad de usar la aplicación**, avisa de inmediato por el canal directo además de registrarlo: esos casos se atienden el mismo día.

Incluye siempre la versión (`1.0.0-rc.17`), tu versión de Windows (`winver`) y los pasos exactos. Las capturas no deben contener datos reales.
