# Investigación: Recordatorios de cita

**Feature**: [spec.md](spec.md) | **Fecha**: 11/11/2026

Punto de partida comprobado el 11/11/2026: la rama está rebasada sobre `master` (`f965be1`), que implementa los dos cambios de la 001 con la suite en verde (416 tests de `npm test` y 66 de `npm run test:e2e`, según ese commit). La 002 tiene plan, pero no código: su [modelo común de acceso](../002-portal-paciente/contracts/modelo-acceso.md) se lee en la rama `002-portal-paciente`. Node 26.13, sin Python utilizable.

## 1. Qué pone la 003 y qué hereda de la 002 (RR6, D2)

- **Decisión**: la 003 usa el modelo común de la 002 tal cual, como pide su contrato. La 002 crea la tabla `enlace_cancelacion`, la ruta única `GET /e/:token`, la vigencia de RR6 al resolver, la respuesta uniforme, el límite de intentos, las sesiones con alcance de una cita y la anulación de RP7. La 003 pone:
  - la generación de un enlace por recordatorio, con el generador único de la 002, insertando `(sha256(token), cita_id)`;
  - el enlace completo `<CITACLARA_DIRECCION>/e/<token>`;
  - la pantalla `GET /cancelar` y `POST /cancelar`, como ruta de paciente de alcance `cita`.
- **Consecuencia de orden**: la 003 no se puede implementar hasta que el modelo común de la 002 esté en `master`. La 002 sigue en Borrador (propietaria: Sara), y su plan pide su aprobación antes de implementar.
- **Lo que la 003 comprueba además en `/cancelar`**: la sesión de alcance de cita se abre cuando se abre el enlace, pero la pantalla puede seguir abierta hasta después del inicio (caso límite «Pantalla abierta hasta el inicio»). Por eso `GET` y `POST /cancelar` vuelven a comprobar `ahoraLocal < cita.inicio` y, si no se cumple, responden con la respuesta uniforme de la 002, sin redefinirla.
- **Alternativas descartadas**:
  - Que la 003 implemente su parte del modelo común antes que la 002: sería otra ruta pública, otra respuesta y otro contador, justo lo que prohíbe el contrato y 002/FR-026.
  - Esperar a que la 002 entre entera: no hace falta el portal, solo el modelo común. Si la 002 se implementa por partes, basta con que el modelo común entre primero.

## 2. Disparo diario (FR-001, FR-002, casos límite de ejecución)

- **Decisión**: un programador dentro del servidor (`src/servicios/programador.js`), que arranca `src/principal.js`. Cada minuto, con el reloj real, mira cada clínica: si en su zona ya son las 08:00 o más y en este proceso aún no se ha ejecutado para esa fecha local, ejecuta el proceso para esa clínica y anota la fecha. Además, `npm run recordatorios` lanza el mismo proceso a mano para todas las clínicas (FR-002).
- **Razón**:
  - «Sin intervención de la clínica» se cumple sin pedir a nadie que configure el programador del sistema operativo, que es distinto en Windows y en Linux y no se puede probar con `node:test`.
  - **Ejecución retrasada**: si el servidor arranca a las 10:00, la condición «08:00 o más» ya se cumple y el proceso sale en el primer minuto, con la misma ventana (RR3).
  - **Reinicio el mismo día**: la fecha anotada está en memoria, así que tras un reinicio el proceso vuelve a salir. No envía nada nuevo, porque RR1 lo garantiza el almacén (§4), y por eso no hace falta guardar las ejecuciones.
  - **Una hora por clínica**: la zona de cada clínica decide su 08:00. Con Madrid y Canarias, el proceso sale a las 08:00 de cada una, con una hora real de diferencia.
- **Reloj**: esperar a las 08:00 es una espera, y se mide con el tiempo real también con el reloj fijado (FR-043 de la 001, «Esperas»). La ventana, en cambio, se calcula con `ahoraLocal` (FR-003). Con el reloj fijado, el programador sale una vez por día real y siempre calcula la misma ventana, sin duplicar nada.
- **Pruebas**: el programador recibe el reloj real y la función de ejecutar como parámetros, y su test avanza el reloj a mano, sin esperar minutos reales. Los servidores de los tests y de Playwright no arrancan el programador: solo lo arranca `principal.js`.
- **Alternativas descartadas**:
  - `cron` o el Programador de tareas de Windows: es la opción habitual para un proceso diario, pero exige un paso de instalación en cada máquina y no se puede probar dentro de la suite.
  - Una tabla de ejecuciones para no repetir: RR1 ya impide los duplicados, y la tabla solo ahorraría una ejecución que no envía nada.
  - Una dependencia de programación de tareas: un temporizador de un minuto basta (principio IV).

## 3. Ventana de recordatorio (RR3, FR-004, SC-004)

- **Decisión**: para una clínica, `hoy = ahoraLocal(contexto, zona).slice(0, 10)`, `mañana = sumarDias(hoy, 1)` y `pasado = sumarDias(hoy, 2)`. La ventana son las citas con `inicio >= 'mañanaT00:00'` y `inicio < 'pasadoT00:00'`.
- **Razón**: las citas se guardan como hora local de la clínica en texto (research de la 001, §4), y `sumarDias` es aritmética de calendario que no conoce el cambio de hora. Un día de 23 o 25 horas sigue siendo un día natural, de modo que ninguna cita cae fuera de la ventana de su víspera ni entra en dos (caso límite «Días de cambio de hora»).
- **Prueba de SC-004**: 365 ejecuciones seguidas, del 02/11/2026 al 01/11/2027, con el reloj fijado a las 08:00 de cada día, en una clínica de `Europe/Madrid` y otra de `Atlantic/Canary`. Incluye el 28/03/2027 y el 31/10/2027. Cada día tiene citas al principio y al final del horario del día siguiente, y al terminar cada cita tiene exactamente un recordatorio.
- **Alternativa descartada**: una ventana de 24 a 48 horas desde «ahora» (la redacción del encargo). La spec la sustituyó por el día natural siguiente (RR3), y una ventana en horas sí depende del cambio de hora.

## 4. Un recordatorio como máximo (RR1, FR-005, SC-003)

- **Decisión**: la tabla `recordatorio` tiene la cita como clave primaria. Cada cita se procesa en dos pasos:
  1. **Reserva del envío**, en una transacción `BEGIN IMMEDIATE`: se vuelve a leer la cita y su ficha, se comprueba RR2 (reservada, dentro de la ventana, con correo) y que no tenga recordatorio, y se insertan a la vez el `recordatorio` y el `enlace_cancelacion`.
  2. **Envío**, fuera de la transacción. Si falla, otra transacción borra ese recordatorio y ese enlace, y la cita cuenta como fallida: otra ejecución puede volver a enviarla mientras siga en la ventana (FR-005, HU1-E8).
- **Razón**: la garantía la da el almacén, como pide RR1. Con un solo escritor a la vez en SQLite, dos ejecuciones simultáneas no pueden reservar la misma cita: la segunda ve el recordatorio de la primera, o choca con la clave primaria y la omite. Enviar fuera de la transacción evita bloquear la agenda mientras se escribe el fichero o, en el futuro, mientras se habla con un servidor de correo.
- **Cita cancelada justo antes del envío**: el paso 1 comprueba el estado en el momento de reservar, que es inmediatamente anterior al envío.
- **Riesgo aceptado**: si el proceso muere entre el paso 1 y el 2, la cita queda como recordada sin que haya salido el correo, y no se reintenta. Es la consecuencia de que RR1 diga «como máximo»: reintentar exigiría saber si el envío llegó a salir, y si salió, habría un duplicado. La ventana es de milisegundos. El caso límite «Fallo a mitad de ejecución» se cumple para las citas ya enviadas y para las que aún no se habían empezado.
- **Prueba de SC-003**: 4 procesos con barrera en cada ronda, como el test de SC-013 de la 001, ejecutando el proceso sobre el mismo archivo y la misma carpeta de salida. 1.000 rondas, cada una con citas nuevas en la ventana. En cada ronda, un recordatorio y un fichero por cita.
- **Alternativas descartadas**:
  - Enviar y después registrar: entre dos ejecuciones simultáneas, las dos enviarían.
  - Un estado «enviando» con reintento de los que se quedan colgados: o duplica (si el envío salió) o pierde (si no), y añade un estado sin aportar garantía.

## 5. Modo de envío (FR-018 a FR-020, HU3)

- **Decisión**: la v1 solo tiene el modo simulado. Cada recordatorio se escribe como un fichero `.eml` en `datos/salida-correo/`, creado con la opción `wx`, que falla si el fichero ya existe en lugar de sobrescribirlo. El nombre es `recordatorio-<cita>-<8 caracteres hexadecimales al azar>.eml`.
- **Servidor configurado**: el ajuste es `CITACLARA_SMTP`. Si tiene valor, el proceso lo indica en el resumen y sigue en modo simulado, porque FR-039 de la 001 no se cumple (FR-018, HU3-E4). El proceso no abre ninguna conexión de red.
- **Razón**: FR-018 exige el modo simulado mientras FR-039 no se cumpla, que es el estado actual y lo seguirá siendo hasta que haya conexión cifrada y revisión de protección de datos. Escribir hoy el envío real sería construir algo que no se puede usar ni probar con datos reales (principio IV). Es el mismo criterio que siguió la 001 con las migraciones (research de la 001, §16). El envío real lo diseñará el cambio que acompañe al cumplimiento de FR-039, y solo tendrá que sustituir la función de envío, que el proceso ya recibe como parámetro.
- **El ajuste existe sin el envío real** porque HU3-E4 necesita poder decir «hay un servidor configurado»: el test comprueba que, con `CITACLARA_SMTP`, se escriben los ficheros y no sale nada.
- **Nombre del fichero**: el número de cita no basta, porque regenerar la semilla reutiliza números y no se puede sobrescribir (FR-019). La parte al azar evita la colisión sin leer la carpeta.
- **Modo registrado**: `recordatorio.modo` admite `simulado` y `real`, como dice la entidad de la spec. En la v1 solo se escribe `simulado`.
- **Alternativas descartadas**:
  - Un cliente SMTP propio sobre `node:net` y `node:tls`, o la dependencia `nodemailer`: código o dependencia sin uso posible hasta FR-039.
  - Nombrar el fichero por fecha y hora: con el reloj fijado, dos ejecuciones darían el mismo nombre.

## 6. Formato del correo (FR-007 a FR-010, HU3-E3, HU3-E5)

- **Decisión**: mensaje RFC 5322 en texto plano, `text/plain; charset=UTF-8`, `Content-Transfer-Encoding: 8bit`, con líneas terminadas en CRLF. Las cabeceras con caracteres no ASCII (asunto y nombre del remitente) se codifican según RFC 2047 en base64. El texto literal está en [contracts/correo-recordatorio.md](contracts/correo-recordatorio.md).
- **Razón**:
  - El texto plano se lee bien en cualquier móvil (FR-009), lo abre cualquier programa de correo y se puede comprobar en un test leyendo el fichero.
  - `8bit` deja el cuerpo legible en un editor, lo que facilita la demostración. Los programas de correo actuales lo aceptan.
- **Cabeceras**: `From`, `To` (solo la dirección, FR-010), `Subject`, `Date`, `MIME-Version`, `Content-Type` y `Content-Transfer-Encoding`. Sin `Message-ID`, que es opcional al escribir un fichero y rompería HU3-E5 al ser distinto en cada ejecución.
- **Remitente**: `Clínica Eleva <recordatorios@citaclara.invalid>`, con el nombre de la clínica. El dominio `.invalid` está reservado y no puede recibir correo, y vale mientras solo exista el modo simulado. La dirección real del remitente la fijará el envío real.
- **`Date`**: el «ahora» de la ejecución, convertido a la forma de RFC 5322 con el desfase de la zona de la clínica en ese momento (por ejemplo, `Mon, 02 Nov 2026 08:00:00 +0100`). El desfase se obtiene con `Intl.DateTimeFormat` y `timeZoneName: 'longOffset'`. Con el mismo momento de referencia, la cabecera es la misma (HU3-E5).
- **Determinismo (HU3-E5)**: el contenido depende solo de la cita, la ficha, la clínica, el «ahora» y el enlace. Entre dos ejecuciones con los mismos datos y el mismo momento, solo cambian el token del enlace y el nombre del fichero.
- **Fecha y hora (FR-008)**: `fecha` y `hora` de `src/dominio/formato.js`, el día de la semana con `nombreDia`, y la línea de zona con `etiquetaZona` de la 001 («Horas en hora peninsular» o «Horas en hora de Canarias»).
- **Alternativas descartadas**:
  - HTML, o HTML y texto alternativos: más superficie de escape y de compatibilidad, sin que la spec lo pida.
  - `quoted-printable` o base64 en el cuerpo: más robustos ante servidores antiguos, pero solo hay modo simulado y el fichero dejaría de leerse a simple vista.

## 7. Pantalla de cancelación (FR-011 a FR-017, HU2)

- **Decisión**: `GET /cancelar` y `POST /cancelar`, de alcance `cita` en el modelo de la 002. Llegan desde `GET /e/:token`, que redirige con 303 tras abrir la sesión. La vista usa la plantilla de las páginas del paciente de la 002 (`layoutPortal`), sin el menú de recepción ni el aviso del reloj fijado.
- **`GET`**, según la cita del alcance y «ahora»:
  - Cita ya empezada (`ahoraLocal >= inicio`): respuesta uniforme de la 002 (RR6).
  - Cancelada: el mensaje de «ya estaba cancelada», sin acciones (HU2-E4).
  - Reservada y fuera de plazo (`!dentroDePlazo`): el mensaje de «fuera de plazo», con el límite de `limiteCancelacion` y el teléfono (HU2-E6).
  - Reservada y dentro de plazo: los datos de la cita, el aviso de que no se puede deshacer y el botón (HU2-E1, FR-013).
- **`POST`**: vuelve a comprobar el inicio y llama a `cancelarCita(contexto, cita.id, 'correo')`. Muestra el mensaje del resultado (FR-014). `no_cancelable` no puede darse antes del inicio (RN5 de la 001); si llegara a darse, responde con la respuesta uniforme, igual que un enlace caducado.
- **Por qué `GET` también mira el plazo**: HU2-E6 pide el mensaje al abrir el enlace, y no solo al confirmar. La decisión vinculante sigue siendo la de `cancelarCita` en el `POST` (FR-014), así que una pantalla abierta antes del límite y confirmada después recibe «fuera de plazo».
- **Nada cambia al abrir** (FR-015, HU2-E8): `GET /e/:token` y `GET /cancelar` no escriben en la agenda. Solo el `POST` cancela, y la cookie de paciente lleva `SameSite=Lax`, así que un formulario de otro sitio no la envía.
- **Teléfono (HU2-E6)**: el de la clínica (FR-029 de la 001), como enlace `tel:` del tamaño táctil de FR-028. Si la clínica no tiene teléfono, como en algunos tests, el mensaje dice «llama a la clínica» sin número.
- **Sin datos de la ficha** (FR-012): la pantalla no muestra el nombre del paciente, solo la clínica, el profesional, el servicio, la fecha y la hora.
- **Doble pulsación**: el botón no se desactiva con JavaScript. `cancelarCita` ya da «cancelada ahora» a la primera y «ya estaba cancelada» a la segunda, y la segunda ve el mensaje de cita ya cancelada, sin error.

## 8. Resumen de cada ejecución (FR-006)

- **Decisión**: cada ejecución devuelve un resumen por clínica (fecha de la ventana, enviados, omitidos sin correo y fallidos) y lo escribe en dos sitios: en la salida del proceso, y como una línea al final de `datos/recordatorios.log`. El texto literal está en [contracts/proceso-recordatorios.md](contracts/proceso-recordatorios.md).
- **Razón**: las ejecuciones programadas salen dentro del servidor, sin nadie mirando. Un fichero de texto que crece es lo mínimo que «deja» el resumen, y se puede leer sin herramientas. `datos/` ya está fuera del control de versiones.
- **Qué cuenta en cada apartado**: «enviados», las citas recordadas en esta ejecución; «sin correo», las reservadas de la ventana cuya ficha no tiene correo; «fallidos», las que no se pudieron escribir. Las citas que ya tenían recordatorio no cuentan en ningún apartado, porque no se ha hecho nada con ellas.
- **Alternativas descartadas**:
  - Una tabla de ejecuciones: nadie la consulta, y obligaría a una pantalla que la spec no pide.
  - Solo la salida del proceso: se pierde en las ejecuciones del programador.

## 9. Configuración que comparte el proceso con el servidor (FR-003, HU3-E3)

- **Decisión**: un módulo `src/configuracion.js` lee y valida `CITACLARA_AHORA`, `CITACLARA_DIRECCION`, `PORT` y `CITACLARA_SMTP`, con los mensajes de [configuracion.md de la 001](../001-nucleo-agenda/contracts/configuracion.md) y del [modelo común de la 002](../002-portal-paciente/contracts/modelo-acceso.md). Lo usan `src/principal.js` y `src/recordatorios.js`.
- **Razón**: HU3-E3 exige que el enlace del fichero funcione contra el servidor en marcha. El proceso tiene que construir la misma dirección que el servidor, también por defecto (`http://localhost:<PORT>`), y entender el momento de referencia igual. Con un solo módulo no puede haber dos interpretaciones del mismo ajuste (FR-042 y FR-043 de la 001).
- **Cambio en código de otros**: `principal.js` deja de leer las variables por su cuenta y llama a ese módulo. Los mensajes y el comportamiento no cambian.

## 10. Trazabilidad (FR-023, SC-007)

- **Decisión**: `tests/unit/trazabilidad-003.test.js`, con el mismo método que el de la 001: lee la spec, extrae RR1 a RR6, los 27 escenarios (10, 10, 5 y 2 por historia) y los 7 criterios, y comprueba que cada uno aparece en un nombre de test que empieza por un identificador de la 003. SC-001 y SC-005 quedan fuera, con la justificación de SC-007.
- **Identificadores de la 003**: `RR1` a `RR6` sin prefijo, y `003/FR-nnn`, `003/SC-nnn`, `003/Hx-Ey` y `003/CL` (FR-035 de la 001). El test de la 001 ya admite esas formas y no las cuenta como cobertura suya.

## 11. Pruebas de solape (FR-024, principio III)

- **Decisión**: un test de concurrencia con procesos y barrera en cada ronda. En cada ronda, un proceso confirma la cancelación por `POST /cancelar` de una cita dentro de plazo, y otros procesos intentan reservar a la vez el mismo tramo y un tramo que se cruza. Al terminar cada ronda, ningún profesional tiene dos citas que ocupen a la vez (RN1). 1.000 rondas, como las demás pruebas de concurrencia.
- **Razón**: cancelar no añade ocupación, y reservar pasa por el disparador `cita_solape` de la 001, así que el resultado esperado es que RN1 se mantenga siempre. El test lo demuestra por la ruta real del correo, como exige el principio III a toda feature que escribe en la agenda.
