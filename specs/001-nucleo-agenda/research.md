# Investigación: Núcleo de agenda

**Feature**: [spec.md](spec.md) | **Fecha**: 05/11/2026; secciones 8 a 16 del 11/11/2026

Entorno comprobado: Node 26.13 y npm 11.20 disponibles; sin PostgreSQL ni Python utilizable; Docker 19.03 (2019). El 05/11/2026 el repositorio no tenía código. Las secciones 1 a 7 son de la versión aprobada el 06/11/2026, ya implementada. Las secciones 8 a 16 diseñan los dos cambios del 10/11/2026 sobre ese código.

## 1. Garantía contra el solape (RN1, principio III)

- **Decisión**: SQLite con un disparador `BEFORE INSERT` que aborta la escritura si existe una cita reservada o completada del mismo profesional que se cruza con la nueva. Cada alta se ejecuta en una transacción `BEGIN IMMEDIATE`.
- **Razón**: la regla vive en el almacén, de modo que se cumple sea cual sea el origen de la cita, incluida la semilla. SQLite admite un único escritor a la vez, así que la comprobación y la inserción no pueden intercalarse entre dos peticiones, ni siquiera desde procesos distintos.
- **Alternativas descartadas**:
  - PostgreSQL con restricción de exclusión: es la garantía declarativa clásica, pero exige instalar y operar un servidor para clínicas de 2 a 5 profesionales. Es la vía de migración si algún día hacen falta varios servidores.
  - Comprobar en la aplicación y después insertar: tiene una ventana de carrera, y es justo el fallo que prohíbe el principio III.
  - Índice único sobre el inicio: no detecta solapes parciales.
- **Comprobación empírica**: 4 procesos y 1.000 rondas de tramos que se cruzan, sobre un archivo compartido. Resultado: 1.000 citas, 0 solapes, 0 errores de bloqueo.
- **Límite de esa prueba**: un mismo proceso ganó las 1.000 rondas, de modo que hubo poca simultaneidad real dentro de cada ronda. Valida el mecanismo, pero no sirve como test final. El test de SC-001 debe sincronizar los procesos con una barrera en cada ronda.

## 2. Plataforma y dependencias (principio IV)

- **Decisión**: Node 26 con JavaScript y módulos ES, usando solo la biblioteca estándar en producción: `node:http`, `node:sqlite`, `node:crypto` y `node:test`. Cero dependencias de producción.
- **Razón**: Node es lo que hay instalado, y su biblioteca estándar cubre servidor, almacén, hash de la clave y tests. `node:sqlite` carga sin aviso experimental en 26.13.
- **Alternativas descartadas**: un framework web (unas 12 rutas no lo justifican) y TypeScript (paso de compilación sin necesidad en la spec).
- **Única dependencia de desarrollo**: `@playwright/test`. FR-028 y SC-007 solo se pueden comprobar en un navegador real: desbordamiento a 360 píxeles, tamaño de controles y contraste calculado.

## 3. Interfaz (principio VII)

- **Decisión**: HTML generado en el servidor, formularios con redirección tras POST, una hoja de estilos propia y dos scripts pequeños de mejora: búsqueda de paciente y resumen del alta.
- **Razón**: es lo más simple que cumple la spec. No hay estado de cliente que sincronizar, y tras cada rechazo la pantalla refleja la agenda real (FR-019).
- **Confirmaciones (FR-021)**: una página propia, que funciona sin JavaScript y se prueba igual que el resto.
- **Alternativa descartada**: aplicación de una sola página. Añade compilación, dependencias y una API que nadie más usa.
- **Campos de fecha (FR-024)**: de texto, en `dd/mm/aaaa`. `<input type="date">` pinta la fecha según el idioma del navegador, no el de la página: con Chromium en inglés, el 05/11/2026 se ve como `11/05/2026`. A cambio se pierde el calendario nativo.
- **Validación de formularios (FR-027)**: la hace el servidor, con `novalidate` en el HTML. Los avisos nativos salen en el idioma del navegador, no en el de la página.
- **Cambio de profesional en el alta (FR-019)**: un `POST /citas/nueva` que solo repinta el formulario. Con `GET`, el nombre y el teléfono del paciente quedarían en la URL y en el historial.
- **Seguridad de las vistas**: todo dato se escapa al generar HTML, mediante una única función de plantilla.

## 4. Representación del tiempo (principio II, FR-023 a FR-025)

- **Decisión**: inicio y fin se guardan como hora local de la clínica, en texto `AAAA-MM-DDTHH:MM`, sin convertir a UTC. La clínica guarda su zona (`Europe/Madrid` o `Atlantic/Canary`). «Ahora» se obtiene del reloj del servidor, convertido a esa zona con `Intl`.
- **Razón**: la regla de negocio es que las 10:00 siguen siendo las 10:00 a ambos lados del cambio de hora, y la hora local la cumple sin ninguna conversión. Además, la comparación de textos ordena bien, por lo que el disparador de solape es directo. Comprobado con `Intl`: ambas zonas dan la hora correcta en la madrugada del 25/10/2026.
- **Alternativa descartada**: guardar UTC. Es la opción habitual para instantes globales, pero obliga a convertir en cada lectura y comparación y mueve la hora local si cambian las reglas de horario de verano. Una cita de clínica es una hora de pared, y nunca se compara entre clínicas.
- **Cambio de hora**: los dos cambios anuales caen en domingo y la clínica abre de lunes a viernes (FR-012), así que esas horas se rechazan como fuera de horario, sin lógica adicional. Si una spec futura abre los domingos, deberá añadir el rechazo específico; los tests de FR-025 lo avisarán.
- **Reloj inyectable**: los servicios reciben una función `ahora()`, y los tests fijan el momento sin tocar el reloj del sistema.

## 5. Importes (principio II)

- **Decisión**: precios en céntimos enteros, y formato `1.234,56 €` en una sola función.
- **Razón**: con enteros no hay redondeo. La 001 no suma importes, de modo que no hace falta regla de redondeo.

## 6. Acceso (FR-001 a FR-004)

- **Decisión**: la clave se guarda con `scrypt` y sal. Al entrar, se compara con la de cada clínica. La sesión es un token aleatorio cuyo hash se guarda en el almacén, en una cookie `HttpOnly`, `SameSite=Strict`, sin `Max-Age`.
- **Razón**: `SameSite=Strict` cubre los envíos cruzados sin añadir tokens en cada formulario. Comparar con cada clínica es lo más simple con una clínica, y evita pedir un identificador que recepción tendría que recordar.
- **Deuda consciente**: sin usuarios individuales, sin rotación de clave, sin límite de intentos, sin caducidad de sesión y sin cifrado de la conexión: el servidor habla HTTP y la cookie no lleva `Secure`. Comparar clínica a clínica deja de ser viable con muchas clínicas. Desde el 10/11/2026, esta deuda la vigila la puerta de FR-039 (condiciones 1 y 2, riesgo d), que no exige código en la 001.

## 7. Semilla determinista (principio V, FR-029 a FR-034)

- **Decisión**: una función pura `generar({ semilla, lunes })` con un generador pseudoaleatorio propio de pocas líneas (mulberry32). No lee el reloj ni usa `Math.random`. Las citas se calculan como semana relativa, día de la semana y minuto, y solo al final se convierten en fechas a partir del lunes.
- **Razón**: separar el contenido relativo de las fechas hace que cambiar de lunes no pueda alterar citas ni cifras (FR-032). Los porcentajes se aplican con recuentos exactos sobre una lista barajada, no por sorteo cita a cita, lo que garantiza los márgenes de FR-030.
- **Sal de la clave de demostración**: fija y derivada de la semilla, para que el resultado sea idéntico (SC-005).
- **Comparación**: un resumen SHA-256 de los registros en orden canónico. Comparar archivos de base de datos no serviría, porque su formato binario puede variar.
- **Inserción**: la semilla escribe por la misma tabla y con los mismos disparadores, de forma que RN1 también la vigila. RN2 se aplica en el servicio de alta, por lo que la historia queda exenta sin ningún caso especial.

## 8. Operación única de cancelar (FR-038, RN8)

- **Decisión**: una sola función de servicio, `cancelarCita(contexto, citaId, canal)`, en `src/servicios/cancelar.js`. Es la única que escribe una cancelación. La acción «cancelar» de recepción la llama con el canal `recepcion`, y la 002 y la 003 la llamarán con `portal` y `correo`. Su contrato está en [operacion-cancelar.md](contracts/operacion-cancelar.md).
- **Indivisible**: todo ocurre dentro de `transaccionInmediata`: leer la cita, comprobar estado y plazo, y un único `UPDATE` que pone a la vez el estado, el origen y el momento. Como SQLite admite un solo escritor, dos cancelaciones simultáneas no pueden leer las dos «reservada»: la segunda ya ve la cita cancelada y obtiene «ya estaba cancelada», con el origen de la primera (H6-E9).
- **Orden de los resultados**: el de la tabla de FR-038. «Ya estaba cancelada» y «no cancelable» se comprueban antes que el plazo, así que un paciente que llega tarde a una cita ya cancelada recibe «ya estaba cancelada», que es lo que la 002 necesita para su mensaje (002/FR-017).
- **Cita inexistente o de otra clínica**: la función devuelve `null` y no hace nada. No es un quinto resultado: FR-038 recibe una cita, y sin cita la operación no llega a ocurrir. Cada canal responde como ya lo hace ante lo que no encuentra (recepción, con 404).
- **Canal no válido**: es un error de programación, no de la persona, así que la función lanza una excepción. Ninguna pantalla deja elegir el canal.
- **Recepción**: con `recepcion` no hay plazo (RN5), y «ya estaba cancelada» y «no cancelable» se traducen al mensaje de H3-E5, «Esta cita ya está {estado} y no se puede cambiar.», con 409, que es lo que la agenda ya respondía. Completar y marcar como no asistida siguen en `cambio-estado.js`, con otra escritura que no admite el estado `cancelada`.
- **Alternativas descartadas**:
  - Que cada canal haga su propio `UPDATE`: es lo que FR-038 prohíbe, y abriría tres versiones del plazo.
  - Un disparador que compruebe RN8: el plazo depende del reloj, que el almacén no conoce, y el reloj puede estar fijado (FR-043). El almacén sí garantiza lo que no depende del reloj: que una cancelada tenga siempre origen y momento (§9).

## 9. Plazo, origen y momento (RN8, FR-036)

- **Cálculo del límite**: `límite = sumarMinutos(inicio, -120)`, con la aritmética de hora de pared que ya usa `src/dominio/tiempo.js`, que no conoce el cambio de hora. Es lo que pide RN8: el límite se cuenta sobre el reloj local del día de la cita. Como cae siempre entre las 07:00 y las 17:30 del mismo día laborable, nunca toca la hora que no existe o que se repite.
- **Minuto incluido**: «ahora» se lleva a la hora local con minutos (`ahoraEnZona`), que descarta los segundos. Se acepta si `ahora <= límite`: las 16:00:59 son «16:00» y entran; las 16:01:00 no.
- **Momento registrado**: el «ahora» local de la cancelación, en `AAAA-MM-DDTHH:MM`, el mismo formato que `inicio`, como pide D4 para la semilla. Con el reloj fijado, es el momento fijado (FR-043).
- **Valores del origen**: `recepcion`, `portal` y `correo`, sin tilde, como fija D4 para los resúmenes. La interfaz nunca los muestra tal cual: muestra las etiquetas de FR-027.
- **Garantía en el almacén**: una restricción `CHECK` de la tabla `cita` exige que una cita tenga origen y momento si y solo si está cancelada ([data-model.md](data-model.md)). Así ninguna vía, ni siquiera una escritura directa, puede dejar una cancelada sin origen (SC-011) ni poner origen a otra cita. Que no se corrijan después ya lo garantiza `cita_rn4`, que rechaza cualquier `UPDATE` de una cita que no está reservada, y que por eso **no cambia**.

## 10. Etiquetas y cita sin cerrar (FR-027, FR-040)

- **Etiqueta**: una sola función de formato, `etiquetaCita(cita)`, devuelve «Cancelada por el paciente el 08/11/2026 a las 19:30» si el origen es `portal` o `correo`, y la etiqueta de su estado en los demás casos. La agenda la usa en lugar de `etiquetaEstado`. La 002 la reutilizará para que el paciente vea la misma etiqueta que la agenda.
- **Cita sin cerrar**: una función pura `sinCerrar(cita, ahora)` (`estado === 'reservada' && inicio <= ahora`) en `src/dominio/estados.js`, y `accionesPermitidas` pasa a usarla para RN5, que tiene la misma frontera. Es la expresión en código de «la única definición» de FR-040, y la importarán la 002 y la 004. La agenda no cambia: la cita sin cerrar ya se ve como «Reservada».
- **Sin «Pendiente de confirmar por la clínica» en la 001**: solo lo muestran los canales del paciente (D6). Añadirlo aquí sería alcance de la 002.

## 11. Sesiones de paciente separadas (FR-037)

- **Decisión**: una tabla propia, `sesion_paciente`, con lo mínimo (el hash del token y el paciente), y una cookie propia, `sesion_paciente`. El servidor de recepción solo lee la cookie `sesion` y solo busca en la tabla `sesion`, así que un token de paciente, se presente en la cookie que se presente, no abre ninguna ruta de recepción: se trata como la ausencia de sesión.
- **Por qué la tabla está en la 001**: FR-037 obliga a que el almacén sea propio, y H4-E5 y SC-012 exigen probar el rechazo con una sesión de paciente válida. La 001 no crea sesiones de paciente: sus tests las insertan directamente. Cómo se abren, cuánto duran y qué más guardan es del modelo de acceso de la 002, que ampliará la tabla.
- **Cobertura de rutas**: el test recorre `servidor.rutasRegistradas`, de modo que las rutas que añadan la 002 y la 004 quedan cubiertas sin tocarlo, y una ruta del panel de la 004 que no lo cumpla haría fallar SC-012.
- **Salir**: `POST /salir` solo borra la sesión y la cookie de recepción. Ninguna ruta de la 001 toca la de paciente.
- **Semilla**: al sustituir Clínica Eleva, borra también las sesiones de paciente de sus pacientes, igual que ya cierra las de recepción.
- **Alternativa descartada**: una sola tabla `sesion` con una columna de tipo. Es justo lo que FR-037 descarta, y un error en un filtro bastaría para que una sesión de paciente abriera la agenda.

## 12. Correo de la ficha desde la cita (FR-041)

- **Decisión**: cada cita de la agenda lleva un enlace, «Añadir correo» o «Cambiar correo», a `GET /citas/:id/correo`, una página con un solo campo y la indicación de que basta dejarlo en blanco para quitarlo. `POST /citas/:id/correo` valida con la misma regla de FR-013 (`validarPaciente`) y guarda solo `paciente.email`, o `NULL` si llega vacío. Después redirige a la agenda de ese día.
- **Por la cita y no por el paciente**: FR-041 pide hacerlo «desde una cita de la agenda», y así no hace falta ninguna pantalla de pacientes, que FR-013 sigue prohibiendo. Se ofrece en citas de cualquier estado, porque el correo es de la ficha y no de la cita.
- **Lo que no hace**: no edita nombre ni teléfono, no toca la cita y no envía nada. El test lo comprueba leyendo la ficha y la cita antes y después.
- **Sin disparador**: no escribe en la agenda, y el correo no tiene ninguna regla que dependa de otros registros, así que basta la validación del servicio, igual que en el alta.

## 13. Momento de referencia (FR-043)

- **Decisión**: una variable de entorno, `CITACLARA_AHORA`, con la fecha y la hora local de la clínica en `AAAA-MM-DDTHH:MM`. Es el único ajuste para todos los procesos, y un proceso hijo hereda las variables de entorno sin hacer nada, de modo que el de recordatorios de la 003 la recibe igual. Su contrato está en [configuracion.md](contracts/configuracion.md).
- **Cómo entra en el código**: el contexto que reciben las rutas y los servicios gana un campo, `momentoFijado`, que es ese texto o `null`. Una sola función, `ahoraLocal(contexto, zona)`, devuelve `momentoFijado` si existe y, si no, `ahoraEnZona(contexto.ahora(), zona)`. Los cuatro puntos que hoy llaman a `ahoraEnZona(ahora(), …)` pasan a llamarla, y también `cancelarCita`.
- **Por qué no sustituir `ahora()`**: el momento se expresa en hora local, y `ahora()` devuelve un instante. Convertir uno en otro exige elegir una zona, y el momento fijado vale para la clínica sea cual sea su zona. Además, así no cambian los 18 archivos de test que inyectan `ahora()`.
- **No avanza**: con el ajuste, «ahora» es siempre el mismo texto mientras el proceso siga en marcha, como pide FR-043.
- **Esperas en tiempo real**: la 001 no tiene esperas. La regla de FR-043 queda en el contrato para la 002: la inactividad de una sesión o un bloqueo se miden con `Date.now()`, nunca con `ahoraLocal`.
- **Aviso**: la plantilla común muestra en todas las pantallas de recepción, también en la de acceso, «Reloj de demostración: la hora está fijada en el miércoles 04/11/2026 a las 12:00 y no avanza.», con la fecha y la hora del ajuste.
- **Ajuste mal escrito**: el servidor no arranca y explica el formato esperado. Arrancar con la hora real sería peor, porque la demostración mostraría otras cifras sin avisar.
- **Alternativa descartada**: un parámetro de línea de órdenes, `--ahora`, como `--lunes` de la semilla. Cada proceso tendría que repetirlo y reenviarlo, y FR-043 pide un solo ajuste.

## 14. Semilla: datos nuevos y resúmenes (FR-029, FR-030)

- **Decisión**: el generador añade los campos en el orden exacto que fija el historial (D4), porque los resúmenes son el SHA-256 del JSON del objeto generado:
  - Clínica: `nombre`, `zona_horaria`, `telefono`, `clave_hash`, `clave_sal`. Basta añadir `telefono: '000 200 000'` a `CLINICA` en `datos-base.js`, tras `zona_horaria`.
  - Paciente: `nombre`, `telefono`, `email`, `enlace`. El del paciente *n* (de 1 a 40) son los 32 primeros caracteres hexadecimales del SHA-256 de `citaclara-enlace-20261102-<n>`. Comprobado: el primero da `c73f5e835397826416bda7b3e5323d02`, el de FR-029.
  - Cita cancelada de la historia: tras `inicio` y `fin`, `origen_cancelacion: 'recepcion'` y `momento_cancelacion` igual a `inicio`. Las demás citas no llevan esos campos, ni siquiera vacíos.
- **Resumen sin fechas**: quita además `momento_cancelacion`, porque es una fecha.
- **Carga**: el origen y el momento van en el mismo `INSERT` de la cita, porque `cita_rn4` rechazaría un `UPDATE` posterior. El teléfono de la clínica y el enlace del paciente, también en su `INSERT`.
- **Cifras**: no cambian (463 citas de historia, 380 + 46 + 37, y 57 futuras). El test compara literalmente las cifras y los dos resúmenes con FR-030, que es su única fuente.
- **Teléfono de la clínica no obligatorio en el almacén**: algunos tests crean clínicas sin teléfono, como ya advierte el historial. La semilla siempre lo escribe, y su test lo comprueba.

## 15. Trazabilidad (FR-035)

- **Recuentos**: RN1 a RN8, 42 escenarios (11, 6, 6, 5, 5 y 9 por historia) y 13 criterios, como dice el historial del segundo cambio.
- **Forma de los nombres**: un test empieza por un identificador sin prefijo (`RN1`, `FR-001`, `SC-001`, `H1-E1`, `CL`), por una regla de otra spec (`RP1`, `RR1`, `RA1`) o por un identificador con prefijo (`002/FR-017`, `003/SC-001`, `004/H5-E8`, `002/CL`).
- **Cobertura de la 001**: solo cuentan los tests que empiezan por un identificador sin prefijo de la 001. Dentro de ellos, un identificador cuenta si no lleva delante una barra, una letra, un dígito ni un guion, y así `002/SC-010` deja de contar como `SC-010`.
- **El test de FR-001** («solo la pantalla de acceso es pública») no cambia en la 001: la 002 lo ampliará con sus rutas públicas, en el mismo cambio que las cree.

## 16. Cambio de esquema sobre un archivo existente

- **Problema**: `CREATE TABLE IF NOT EXISTS` no añade columnas a una tabla que ya existe, así que un `datos/citaclara.db` anterior seguiría con el esquema viejo y fallaría con un error interno.
- **Decisión**: el esquema lleva su número de versión en `PRAGMA user_version`, que pasa a ser 2. Al abrir el archivo, `abrirBd` crea el esquema si está vacío y fija la versión. Si tiene tablas y otra versión, no sigue, y explica que hay que borrar el archivo y volver a ejecutar `npm run semilla`.
- **Por qué no migrar**: FR-039 garantiza que solo hay datos de la semilla, que se regeneran en un segundo. Un sistema de migraciones sería preparación para un futuro que no está en ninguna spec (principio IV). Hará falta cuando la puerta de FR-039 se cumpla, y lo diseñará la spec que llegue entonces.
- **Alternativa descartada**: `ALTER TABLE … ADD COLUMN`. No puede añadir la restricción `CHECK` de tabla que une estado, origen y momento (§9), que es la garantía de SC-011.
