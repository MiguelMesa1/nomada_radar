# Habilitar Actualizar en la app

La programación cada 4 horas funciona con un disparador de Google. Para que el botón de Radar ejecute ese mismo proceso inmediatamente, se necesita una implementación web de Apps Script. Este paso se hace una sola vez.

1. En el proyecto Apps Script del archivo 2026 reemplaza **Código.gs** por el contenido completo de **NomadaRadar.gs** actualizado. Guarda. Conserva `RADAR_TOKEN` en las propiedades.
2. Ejecuta **instalarRadar** y autoriza los permisos si Google lo solicita. Mantén un único proyecto para todos los años.
3. Arriba a la derecha entra a **Implementar → Nueva implementación**.
4. En el engranaje de tipo elige **Aplicación web**.
5. En **Ejecutar como**, selecciona tu cuenta propietaria del disparador (la que accede a ambos archivos).
6. En **Quién tiene acceso**, selecciona **Cualquier persona** para que el servidor de Radar pueda llamar al endpoint sin iniciar sesión en Google. Esto no comparte las hojas ni devuelve sus datos: cada llamada exige el token privado de integración. Si tu organización bloquea esta opción, conserva el disparador cada 4 horas y consulta al administrador de Google.
7. Pulsa **Implementar**, autoriza y copia la URL terminada en **/exec**. Configura esa URL en la variable privada `GOOGLE_APPS_SCRIPT_SYNC_URL` del servidor. No compartas el token por chat.

Para actualizar una implementación existente: **Implementar → Gestionar implementaciones → Editar → Nueva versión → Implementar**. Copiar código al editor sin actualizar la implementación no cambia su versión publicada.

El servidor necesita `GOOGLE_APPS_SCRIPT_SYNC_URL` con esa URL y `GOOGLE_APPS_SCRIPT_SYNC_TOKEN` con el mismo valor de `RADAR_TOKEN`. Son variables privadas, nunca `NEXT_PUBLIC_*`. Reinicia el servidor local después de configurarlas. La app comprueba el rol principal/analista y el origen de la solicitud antes de ejecutar la importación.

Una respuesta exitosa indica que la carga terminó; entonces se vuelve a consultar el informe. Si falta configuración o falla la carga, la app muestra el error y conserva los últimos datos disponibles. No anuncia una actualización exitosa si solo logró volver a leer la base anterior.

Referencia oficial de Google: [publicar una aplicación web de Apps Script](https://developers.google.com/apps-script/guides/web).
