# Publicar Nómada Radar

## Proyecto y compilación

Conecta el repositorio a un proyecto separado con framework **Next.js**, directorio raíz del repositorio y **Node.js 24.x**. Mantén los valores predeterminados de instalación y salida. La compilación habitual es `npm run build`; si una instalación local de Windows presenta un fallo de Turbopack, verifica con `npx next build --webpack`.

Antes de publicar:

```powershell
npm ci
npm test
npm run typecheck
npm run build
```

Las migraciones se aplican al backend desde un entorno autorizado; nunca se ejecutan automáticamente durante la compilación del frontend. La migración `20261022150000_radar-sync-efficiency.sql` conserva las ventas, compacta solo diagnósticos derivados y verifica una importación sin cambios dentro de una subtransacción que se revierte. Antes de aplicarla en una instalación existente, archiva en privado el historial de incidencias que quieras conservar.

## Variables

Guarda los valores en **Settings → Environment Variables**. No subas `.env.local` ni copies claves al README, a commits o al navegador.

| Variable | Entornos | Observación |
| --- | --- | --- |
| `NEXT_PUBLIC_INSFORGE_URL` | Preview y Production | URL del backend existente. |
| `NEXT_PUBLIC_INSFORGE_ANON_KEY` | Preview y Production | Solo la clave pública; las políticas RLS siguen siendo obligatorias. |
| `INSFORGE_API_KEY` | Preview y Production | Cifrada; exclusivamente en el servidor. |
| `GOOGLE_APPS_SCRIPT_SYNC_URL` | Preview y Production | URL privada de configuración de la aplicación web `/exec`. |
| `GOOGLE_APPS_SCRIPT_SYNC_TOKEN` | Preview y Production | Cifrada; no usar prefijo `NEXT_PUBLIC_`. |
| `VALID_SALE_STATES` | Preview y Production | Conservar los estados utilizados en local. |
| `RADAR_APP_ORIGIN` | Production | Origen HTTPS exacto, sin ruta ni barra final. |
| `NEXT_PUBLIC_RADAR_XTZ_125_ROW` | Opcional, ambos | Conservar solo si existe una corrección histórica configurada. |

En Preview, deja `RADAR_APP_ORIGIN` sin definir: la comprobación de origen usará la URL exacta de ese despliegue a través de `VERCEL_URL`. No copies el origen local a Vercel ni permitas globalmente `*.vercel.app`. Si usas un dominio propio en Preview, configura su origen exacto para ese entorno.

Las vistas previas con estas credenciales acceden al backend real y permiten escrituras según el rol de cada usuario. Conserva la protección de acceso de Vercel y no compartas accesos administrativos para probarlas.

Después de modificar variables, genera un nuevo despliegue. Las variables públicas se incorporan durante la compilación.

## Consumo y sincronización

- Google Apps Script mantiene el disparador de cuatro horas; no añadas otro programador en Vercel.
- Navegar y cambiar fechas consulta PostgreSQL, no los archivos de Sheets.
- **Actualizar** ejecuta una verificación completa del origen. Sin un ID de pedido estable no debe sustituirse por una lectura exclusiva de las últimas filas: se perderían correcciones anteriores.
- Los datos sin cambios no generan versiones nuevas de ventas o interacciones. Los pendientes de calidad se guardan como estado vigente, evitando otra copia por hora.
- No compartas caché entre usuarios para abaratar consultas privadas. La app conserva límites de solicitudes, autorización y respuestas sin caché.

Revisa los límites y las condiciones del plan de alojamiento antes de usarlo. Vercel reserva Hobby para uso personal no comercial; no cambies de plan ni actives complementos de pago de forma automática.

## Comprobación de la publicación

Comprueba ingreso, consulta de fechas, clasificación según el rol, cierre de sesión y actualización. La sincronización debe conservar los pedidos y mostrar una fecha nueva. Un fallo de Google no debe presentarse como actualización exitosa.

La frecuencia y los enlaces automáticos de anuncios de Meta requieren una integración adicional. Guardar enlaces manuales de publicaciones en el catálogo no equivale a conectar Marketing API.

Las hojas de origen deben tener sus propios permisos. Ocultar sus enlaces en Radar no protege un archivo público; migra primero cualquier bot que dependa del enlace anónimo antes de restringirlo.
