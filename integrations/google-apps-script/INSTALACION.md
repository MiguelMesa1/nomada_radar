# Nómada Radar · Una pestaña Ventas por año

## Archivos de origen

Las hojas y el endpoint se configuran en las propiedades de la secuencia de comandos, sin publicar enlaces privados en el repositorio.

| Propiedad | Valor |
| --- | --- |
| `RADAR_ENDPOINT` | URL HTTPS de la función `sheets-push`. |
| `RADAR_ARCHIVO_INICIAL` | ID del archivo principal, que contiene Ventas e IDS. |
| `RADAR_ARCHIVOS_ANUALES` | Array JSON de IDs de archivos, por ejemplo `["ID_ARCHIVO_2026","ID_ARCHIVO_2027"]`. |
| `RADAR_TOKEN` | Token privado compartido con el receptor. |

En cada archivo debe existir una sola pestaña `Ventas`, con encabezados en la fila 1. Se ignoran las otras pestañas, incluso las mensuales. El mes se calcula por **Fecha**.

## Instalar o reemplazar el script anterior

1. Abre el archivo de **2026 → Extensiones → Apps Script**.
2. Reemplaza todo `Código.gs` por el contenido de `NomadaRadar.gs` de esta carpeta y guarda. Usa un solo proyecto de Apps Script para los dos años.
3. En **Configuración del proyecto → Propiedades del script**, crea las cuatro propiedades de la tabla anterior. Para `RADAR_TOKEN`, el valor está después de `RADAR_TOKEN=` en el archivo local `.env.radar-script.local` de la raíz del proyecto. Si ya lo configuraste, conserva su valor. No uses la clave administrativa de InsForge.
4. Selecciona **instalarRadar**, pulsa **Ejecutar** y autoriza con la cuenta de Google que puede leer ambos archivos.
5. Primero se completa una carga válida; después se instala el disparador **cada 4 horas**, sustituyendo los disparadores anteriores de sincronización de esa misma cuenta.
6. Recarga el Sheets para ver el menú **Nómada Radar**. En la app entra con tu cuenta real y pulsa **Actualizar**. El modo `?demo=1` muestra datos ficticios.

Para la carga automática cada 4 horas no necesitas desplegarlo como aplicación web. Para el botón inmediato de Radar sigue ACTUALIZAR-DESDE-RADAR.md. No necesitas cuenta de servicio ni publicar tu hoja. Puede funcionar con el computador apagado, mientras Google y el proyecto InsForge estén disponibles. El horario solo se activa después de autorizar y ejecutar `instalarRadar`.

## Encabezados y ventas

El orden de columnas es libre. Se leen únicamente:

| Columna | Regla |
| --- | --- |
| Fecha | Obligatoria; fecha completa como 15/10/2026. El mes y año proceden de esta celda. |
| POST ID | Encabezado obligatorio; una celda vacía cuenta como venta sin atribuir. |
| Ciudad | Encabezado obligatorio. |
| Departamento | Encabezado obligatorio. |
| Total Pedido o Total del pedido | COP: `524.000 pesos`, `$524.000`, `COP 524000`, `524,000.00`, `524 000`, `524 mil` o `1,5 millones`. Puede faltar en históricos. Vacío significa pendiente, no cero. Se admiten decimales en cero, sin redondear centavos ni sumar varios importes escritos en una celda. |
| Linea | Opcional. |
| Estado | Opcional; vacío significa confirmado. Para cancelaciones usa cancelado. |

Una fila es una venta distinta; dos filas idénticas cuentan dos ventas. Las filas vacías no cuentan y mantienen sus posiciones. Nombres, teléfonos, productos, links y direcciones no se leen ni se envían. Una pestaña sin ventas puede tener solo encabezados; sin encabezados se detiene la carga.

## Trabajo diario

- Agrega las ventas nuevas al final de `Ventas` del archivo anual correspondiente.
- No crees otra pestaña cada mes; filtra las fechas en Radar.
- Para corregir septiembre por octubre, cambia **Fecha en la misma fila**. La siguiente carga actualiza el mes sin duplicar la venta.
- Completar un total pendiente actualiza la misma venta.
- **Sincronizar ahora** en el menú del Sheets importa de inmediato. **Actualizar** en la app consulta la última carga guardada.

La identidad interna es **archivo + ID de pestaña + número de fila**. Conserva la pestaña y agrega al final. Evita eliminar filas, dejar huecos al borrar ventas o mover ventas entre archivos: sin un ID propio no se pueden reconocer automáticamente esos traslados. Si faltan posiciones ya importadas, se bloquea la carga y se conserva la anterior. Para cancelar, cambia Estado en la propia fila.

No combines el lector alternativo por cuenta de servicio con este script: tienen identidades diferentes. Al revisar esta adaptación la base no tenía ventas importadas, por lo que no fue necesario migrar registros de la estructura mensual.

## Catálogo compartido IDS

La pestaña **IDS del archivo de 2026** es el catálogo común para todos los años. Cada columna contiene una marca o modelo en la fila 1 y sus Post ID debajo, con el formato existente (XTZ 125, NS 200, etc.). No hace falta duplicar IDS en 2027.

- Agregar un ID lo incorpora al catálogo, incluso si aún no tiene ventas. El encabezado de su columna aparece como Producto/modelo en Radar.
- Retirar un ID lo deja inactivo después de sincronizar, conservando sus ventas e indicadores históricos. Volver a agregarlo lo reactiva.
- Un ID puede aparecer repetido dentro del mismo modelo; se consolida una sola vez. Si aparece bajo dos modelos distintos se detiene la carga para corregirlo.
- La pestaña IDS debe seguir existiendo y conservar encabezados. Quitar todos los IDs manteniendo los encabezados desactiva todos los IDs administrados por esa lista.
- Los IDs creados manualmente en Radar que nunca hayan estado en IDS no se desactivan al sincronizar. Para los administrados por IDS, edita modelo y presencia en la hoja; cambios manuales de esos campos se vuelven a ajustar en la siguiente carga. Los nombres de creativo, campañas y otros detalles se pueden completar en Radar.
- Mantén los IDs como texto para conservar ceros iniciales y evitar notación científica.

Para activar esta ampliación, reemplaza Código.gs por la versión actualizada, conserva RADAR_TOKEN y ejecuta **instalarRadar**. No crees otro proyecto ni otro disparador. La carga incluye ventas y catálogo en una sola transacción; si falla cualquiera, se conserva el estado anterior.

## Para 2028 y otros años

Crea el archivo anual y una pestaña `Ventas` con encabezados. Desde el archivo original usa **Nómada Radar → Agregar archivo de otro año**, pega el enlace y pulsa **Sincronizar ahora**. Conserva acceso a todos los archivos anteriores. No instales otro script en el archivo nuevo.

Los archivos anuales configurados se combinan con los que se agreguen posteriormente desde el menú.

## Interacciones y conversión

La pestaña **Conteo POST ID** puede tener varios bloques: en fila 1, `INTERACCIONES OCTUBRE`, `INTERACCIONES NOVIEMBRE`, etc.; debajo, `Post ID` e `Interacciones`. El año se toma del nombre del archivo (`Pedidos Bot 2026`), o se puede incluir en el título del bloque (`INTERACCIONES ENERO 2027`). No hace falta usar B1 para el mes cuando los bloques ya lo nombran.

La pestaña **Todos los ID** registra una interacción por fila con `# ID`, `Mes` y `Fecha`. La fecha admite `2026-10-16`, `16/10/2026`, un valor de fecha de Google Sheets o `2026-10-14T19:07:22-05:00`. Se agrupa siempre por día de Colombia; si hay Fecha, esa celda determina el mes. Mes solo permite conservar el periodo de las filas históricas sin fecha.

Los informes mensuales usan el conteo del bloque del mes. Los rangos personalizados usan el detalle por fecha únicamente si no hay filas sin fecha en los meses seleccionados. No se suman el resumen y el detalle: son dos maneras de medir las mismas interacciones. Una celda de conteo vacía es desconocida; cero es un conteo conocido. Las fechas inválidas y los conteos negativos detienen la carga completa.

**Conversión = ventas del periodo / interacciones del mismo periodo × 100.** No equivale a clientes únicos; varias ventas pueden proceder de una misma interacción. Si falta una base compatible con el periodo o el denominador es cero, Radar muestra —. Los conteos de otros meses no se reutilizan para llenar periodos sin información. Noviembre y diciembre vacíos permanecen sin interacciones registradas.

Reemplaza Código.gs por la versión actual y ejecuta instalarRadar para que el disparador envíe también las interacciones. Para generar de nuevo los validadores compartidos después de editar sus fuentes: `node scripts/build-apps-script.mjs`.

## Errores y límites

**Ver archivos y último resultado** muestra el último OK/error. En Apps Script revisa **Ejecuciones** y **Activadores**. Un archivo sin acceso, una pestaña ausente, una fecha inválida o un total escrito inválido detienen la carga completa; no se guarda solo una parte de los archivos.

Se solicita una ejecución cada 4 horas; Google decide el instante y puede retrasarla. La carga tiene un límite de **50.000 filas físicas y 8 MB**. Si se excede, habrá que dividir el procesamiento conservando el histórico. Las cuotas dependen de la cuenta y pueden cambiar. Referencias: [disparadores horarios](https://developers.google.com/apps-script/reference/script/clock-trigger-builder), [cuotas de Apps Script](https://developers.google.com/apps-script/guides/services/quotas).

## Mantenimiento del receptor

El receptor InsForge `sheets-push` ya admite Ventas; no cambia cada año. Usa los mismos validadores probados de la app. Para modificar y publicar su código, con Node.js 24:

```powershell
node scripts/build-sheets-function.mjs
npx -y @insforge/cli functions deploy sheets-push --file functions/sheets-push.bundle.mjs
```

`RADAR_SHEETS_TOKEN` en InsForge debe coincidir con `RADAR_TOKEN` de Apps Script. La clave administrativa `API_KEY` queda únicamente en el servidor. `.env.radar-script.local` está excluido de Git.
