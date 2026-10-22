# Nómada Radar

Panel privado de Nómada Moto Partes para analizar ventas, publicaciones (Post ID), líneas e interacciones. Importa datos de Google Sheets y permite consultar el mes actual, un día concreto o un rango de fechas, en hora de Colombia.

## Funcionalidades

- **Inicio:** ventas, valor conocido, ticket promedio, publicaciones, líneas y ciudades líderes.
- **Post ID:** rendimiento de publicaciones, encabezados que ordenan la tabla en ambos sentidos y detalle lateral con ventas diarias, cantidades sobre las barras, fecha al señalar y destinos de los pedidos.
- **Interacciones:** ranking, evolución diaria, participación, Post ID con ventas, línea más consultada y conversión. Permite abrir un día desde el gráfico.
- **Conversión:** selecciona Mes, Día o Rango para comparar ventas e interacciones del mismo periodo, incluso entre meses. Los rangos parciales requieren interacciones con fecha; si faltan, la tasa se muestra sin dato. Principal y Analista pueden usar **Asignar línea** junto a un Post ID sin clasificación, sin salir del informe.
- **Líneas:** botón **Añadir línea** para guardar modelos nuevos, como Pulsar 135, y usarlos en publicaciones y filtros aunque todavía no tengan ventas. Disponible para Principal y Analista. Incluye comparaciones y publicaciones más vendedoras. Agrupa equivalencias como Pulsar/Pulsar 180, Boxer/Boxer CT 100 y NS/NS 200; Superlander se conserva como grupo propio.
- **Ubicaciones:** mapa y ranking por ciudad o departamento, filtrables por línea y Post ID.
- **Catálogo:** creación, edición y activación de publicaciones; cada Post ID se clasifica por línea.
- **Calidad y Administración:** revisión de datos, sincronización y cuentas con roles Principal, Analista y Visualizador.
- Exportación CSV, temas claro/oscuro, diseño adaptable y estados de carga y error.

## Tecnologías y dependencias

| Tecnología | Versión | Uso |
| --- | --- | --- |
| Next.js | 16.4.1 | Aplicación, rutas y API del servidor. |
| React / React DOM | 19.3.1 | Interfaz. |
| TypeScript | 7.0.2 | Tipado y comprobación del código. |
| Tailwind CSS / PostCSS | 4.3.3 / 8.5.30 | Estilos y compilación CSS. |
| InsForge SDK | 1.5.2 | Autenticación y PostgreSQL con políticas RLS. |
| Recharts | 3.10.1 | Gráficos. |
| Radix UI Dialog | 1.3.1 | Modales y paneles accesibles. |
| Lucide React | 1.57.0 | Iconos. |
| Zod | 4.6.7 | Validación de entradas e importaciones. |
| Vitest | 5.0.4 | Pruebas unitarias. |
| Playwright | 1.62.1 | Verificaciones en navegador. |

También utiliza clsx, class-variance-authority, tailwind-merge, server-only, Autoprefixer y tipos de Node/React. El listado completo está en [package.json](package.json); [package-lock.json](package-lock.json) fija las versiones para instalar de forma reproducible.

## Requisitos

- Node.js **24.x**, la misma versión principal utilizada en el alojamiento.
- npm y Git.
- Para datos reales: un proyecto InsForge configurado y una cuenta autorizada en Radar.
- Para sincronizar: acceso a los archivos de Google Sheets y al proyecto Apps Script.

## Ejecutar en local

```powershell
git clone https://github.com/MiguelMesa1/nomada_radar.git
cd nomada_radar
npm ci
Copy-Item .env.example .env.local
```

Completa `.env.local` con tu configuración y ejecuta:

```powershell
npm run dev
```

Abre [http://127.0.0.1:3000/ingreso](http://127.0.0.1:3000/ingreso). **Explorar demostración** muestra datos sintéticos y no escribe ventas reales. El ingreso normal requiere una cuenta previamente autorizada.

### Variables de entorno

| Variable | Finalidad |
| --- | --- |
| `NEXT_PUBLIC_INSFORGE_URL` | URL pública del backend. |
| `NEXT_PUBLIC_INSFORGE_ANON_KEY` | Clave pública del SDK, protegida por RLS; nunca usar una clave administrativa aquí. |
| `INSFORGE_API_KEY` | Clave administrativa, exclusiva del servidor. |
| `RADAR_APP_ORIGIN` | Origen exacto de la app, como `http://127.0.0.1:3000` en local o el origen HTTPS en producción. |
| `GOOGLE_APPS_SCRIPT_SYNC_URL` | URL de configuración privada de Apps Script terminada en `/exec`. |
| `GOOGLE_APPS_SCRIPT_SYNC_TOKEN` | Token privado compartido con la integración. |
| `VALID_SALE_STATES` | Estados de venta que cuentan en los informes. |
| `RADAR_TRUST_PROXY_HEADER` | Opcional: solo con un proxy confiable que sobrescriba ese encabezado y bloquee el acceso directo. |

La plantilla incluye variables opcionales del lector por cuenta de servicio, la verificación del receptor y una corrección histórica por fila. No son necesarias para el flujo habitual con Apps Script. `NEXT_PUBLIC_RADAR_XTZ_125_ROW` es un identificador público opcional de una fila histórica, no una credencial.

La plantilla no contiene claves ni enlaces de hojas reales. Reinicia el servidor después de cambiar variables. Ninguna credencial administrativa debe tener el prefijo `NEXT_PUBLIC_`.

## Backend y usuarios

Las migraciones SQL están en [migrations](migrations) y se aplican en orden al proyecto InsForge correspondiente. Incluyen tablas, políticas RLS, sincronización transaccional y límites de solicitudes. No recrees el backend si conectas una instalación existente.

`insforge.toml` contiene configuración sin claves. La configuración local de la CLI en `.insforge/` no se publica.

El registro público está deshabilitado. Para inicializar un backend nuevo, configura temporalmente `RADAR_ADMIN_EMAIL`, `RADAR_ADMIN_NAME` y `RADAR_ADMIN_PASSWORD` en `.env.local` y ejecuta:

```powershell
node scripts/bootstrap-admin.mjs
```

El script se niega a inicializar un backend que ya tiene usuarios. Retira esas tres variables al terminar. Los usuarios siguientes se autorizan desde **Administración**. Las contraseñas no se documentan ni se guardan en el repositorio.

## Google Sheets y sincronización

Cada archivo anual tiene una sola pestaña **Ventas**. Los meses se calculan por fecha; cada fila representa una venta.

- Columnas: `Fecha`, `POST ID`, `Ciudad`, `Departamento`, `Linea` y `Total del pedido`; `Estado` es opcional.
- El importe admite `335000`, `$145.000` o `335000 pesos`. Un total vacío se conserva como pendiente, no como cero.
- También admite miles con comas o espacios (`524,000`, `524 000`), formatos con decimales en cero (`524.000,00`, `524,000.00`, `524000.00`), etiquetas COP/COL$ y pesos colombianos, y unidades explícitas (`524 mil`, `524k`, `1,5 millones`). Los cálculos se conservan en pesos enteros, sin redondear centavos ni adivinar textos con varios precios.
- **IDS**, en el archivo principal, contiene una columna por línea y sus Post ID debajo.
- **Conteo POST ID** contiene bloques de interacciones mensuales.
- **Todos los ID** registra las interacciones. Su columna `Fecha`, en formato `YYYY-MM-DD` o ISO con zona horaria, permite consultar días.

La integración principal usa Apps Script, sin cuenta de servicio. Lee solo las columnas necesarias y no importa nombres, teléfonos ni direcciones de clientes. Un disparador de Google puede ejecutarla cada 4 horas con el computador apagado. **Actualizar** solicita una carga inmediata y vuelve a consultar el informe.

Las pantallas consultan PostgreSQL por el periodo seleccionado; no leen Google Sheets al navegar. La sincronización sí verifica todos los archivos anuales registrados para detectar correcciones históricas y filas omitidas. En PostgreSQL, ventas e interacciones sin cambios no se reescriben. Las incidencias de calidad conservan una sola instantánea vigente, que solo se sustituye cuando cambian los pendientes; los resúmenes de sincronización y la auditoría se conservan.

Consulta [la instalación de Apps Script](integrations/google-apps-script/INSTALACION.md) y [la actualización desde Radar](integrations/google-apps-script/ACTUALIZAR-DESDE-RADAR.md). Los IDs de archivos y el endpoint se configuran en las propiedades de la secuencia de comandos. El código versionado no contiene enlaces de hojas de una instalación particular.

El receptor está en [functions](functions). Para regenerar sus parsers desde el código probado:

```powershell
npm run build:receiver
npm run build:apps-script
```

Estos comandos generan código local; no despliegan servicios ni cambian el Apps Script ya instalado.

## Reglas de los indicadores

- Se usa `America/Bogota`. Los controles **Mes**, **Día** y fechas personalizadas cambian los informes.
- Las ventas con total pendiente cuentan en pedidos y se excluyen del ticket promedio. El valor vendido se identifica como parcial cuando corresponde.
- Conversión = ventas / interacciones de los mismos ID y fechas. No equivale a clientes únicos ni atribución individual y puede superar el 100 %.
- Los conteos mensuales y diarios no se suman. Los informes diarios requieren fechas completas; no se inventa la conversión si faltan datos compatibles.
- Sin ID de pedido propio, la importación identifica archivo, pestaña y fila. Evita mover o eliminar filas históricas: una carga que omite posiciones ya importadas se bloquea.
- El mapa representa destinos aproximados por ciudad; la tabla conserva las cifras del ranking.

## Verificación

```powershell
npm test
npm run typecheck
npm run build
```

Para verificar el navegador, instala Chromium y ejecuta la app en una consola:

```powershell
npx playwright install chromium
npm run start -- --port 3003
```

En otra consola:

```powershell
npm run test:browser
```

Los scripts usan Playwright instalado en el proyecto y datos de prueba controlados. `RADAR_QA_URL` permite cambiar la URL. Hay verificaciones adicionales en [scripts](scripts), como carga visual y seguridad. `verify-sheets-receiver.mjs` comprueba un servicio real y requiere configuración privada; no forma parte de las pruebas habituales.

## Producción

La app usa sesiones HttpOnly, verificación de roles en servidor y RLS, límites compartidos de peticiones y escritura, CSP con nonce y respuestas privadas sin caché. Los cambios de acceso y de clasificación quedan auditados. Las referencias de ventas muestran hoja y fila sin enlaces directos al archivo de origen.

La seguridad de Radar no protege una hoja de origen compartida públicamente. Antes de tratar la instalación como privada, el bot que carga ventas debe usar una cuenta autorizada y los archivos deben tener acceso restringido. Ocultar enlaces dentro de la app no sustituye esos permisos. Configura el origen HTTPS exacto en `RADAR_APP_ORIGIN`, usa claves exclusivas del servidor y cambia las contraseñas iniciales antes de publicar.

```powershell
npm ci
npm run build
npm run start
```

Configura las variables privadas en el alojamiento, usa HTTPS y conserva el origen correcto. La app incluye roles, límites de solicitudes, comprobación de origen, cookies HttpOnly, CSP y validación. La protección volumétrica de red depende también del proveedor de alojamiento.

Consulta [la publicación en Vercel](DEPLOYMENT.md) para configurar un proyecto separado, las variables y las comprobaciones previas. No se necesita un cron de Vercel: el disparador cada 4 horas permanece en Google Apps Script.

## Archivos excluidos de Git

[.gitignore](.gitignore) excluye los archivos `.env` salvo la plantilla, claves privadas, credenciales de servicios, configuración local, carpetas privadas de herramientas, datos de ventas, exportaciones, documentos fuente, copias, capturas y artefactos de pruebas o compilación.

El código, las migraciones, los recursos de marca, las licencias tipográficas y el lockfile sí forman parte del proyecto. El repositorio contiene el software; no contiene la base de datos ni las ventas.
