---

description: "Lista de tareas de implementación del portal del paciente"
---

# Tareas: Portal del paciente

**Entrada**: documentos de diseño de `specs/002-portal-paciente/`, sobre `master` en `f965be1`, que ya implementa los dos cambios de la 001.

**Requisitos previos**: [plan.md](plan.md), [spec.md](spec.md) (aprobada el 12/11/2026), [research.md](research.md), [data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md)

**Tests**: obligatorios (constitución, principios III y VI; 002/FR-024). Se escriben primero y deben fallar antes de implementar.

**Organización**: las tareas se agrupan por historia de usuario, para implementar y probar cada una por separado.

## Formato: `[ID] [P?] [Historia] Descripción`

- **[P]**: se puede hacer en paralelo (archivos distintos, sin dependencias pendientes)
- **[US1]…[US4]**: historia de usuario de la spec (US1 es la «Historia de usuario 1»)

## Convenciones para todas las tareas

- **Código**: JavaScript con módulos ES sobre Node 26, sin dependencias nuevas. Vocabulario del dominio en español, con el estilo de los módulos de la 001.
- **Nombres de test** (FR-035 de la 001, 002/FR-024): cada test empieza por lo que comprueba. Las reglas, sin prefijo: `RP1` a `RP7`. Lo demás de esta spec, con `002/`: `002/FR-017`, `002/SC-005`, `002/H3-E7` y `002/CL <nombre del caso límite>`. Un test puede nombrar después reglas de la 001 (`RN8`), que no cuentan como cobertura de la 001.
- **Reloj de la clínica**: «ahora» se lee siempre con `ahoraLocal(contexto, zona)` de `src/dominio/tiempo.js`. Los tests lo fijan con `momentoFijado`, por defecto `'2026-11-04T12:00'`, el momento de [Datos de los ejemplos](spec.md#datos-de-los-ejemplos).
- **Tiempo real**: las esperas (30 minutos de inactividad y el bloqueo por intentos) se miden con `contexto.relojReal()`, que por defecto es `Date.now` y que los tests sustituyen. Nunca con `ahoraLocal` (FR-043 de la 001, «Esperas»).
- **Cancelar**: solo con `cancelarCita(contexto, citaId, 'portal')` de `src/servicios/cancelar.js` (FR-038 de la 001). Ningún módulo de esta feature importa `registrarCancelacion`, `cambiarEstado`, `insertarCita` ni `crearCita`.
- **Textos**: literales de [contracts/portal-web.md](contracts/portal-web.md#mensajes). Todo dato se escapa con la plantilla `html` de `src/web/plantilla.js`.
- **Enlaces en los tests de 002/FR-025, 002/FR-003 y RP7**: generados con `randomBytes(16).toString('hex')` o por el almacén, nunca los de demostración de la semilla (002/FR-025).
- **Datos de los ejemplos**: los tests que citan pacientes de la spec cargan la semilla por defecto (`generar({ semilla: SEMILLA, lunes: LUNES_POR_DEFECTO })`) en una base temporal y buscan la ficha por nombre.
- **La suite de la 001 sigue en verde** tras cada tarea que toque uno de sus módulos.

---

## Fase 1: Preparación

**Propósito**: comprobar la base y preparar el entorno de pruebas del portal

- [X] T001 Ejecutar `npm test` y `npm run test:e2e` (scripts de package.json) en la rama rebasada, y anotar en el mensaje del commit de T003 que la base está en verde. Si algo falla, parar: es un defecto de la 001 y se avisa a su propietario
- [X] T002 [P] Crear specs/002-portal-paciente/checklists/entrega.md con el protocolo manual de 002/SC-002, 002/SC-003, 002/SC-008 y 002/SC-009 (SC-010): para SC-002 y SC-003, al menos 10 personas sin instrucciones, con un móvil, el enlace de un paciente de la semilla y el reloj del 04/11/2026 a las 12:00, cronometrando «localizar la próxima cita» (umbral: 9 de cada 10 en menos de 1 minuto) y «cancelar una cita» (9 de cada 10 a la primera y en menos de 30 segundos); para SC-008 y SC-009, la semana de referencia que anota recepción antes de la puesta en marcha, y la medición a las 8 semanas (umbral: 50 %). Con una casilla y un hueco para fecha, responsable y resultado de cada criterio
- [X] T003 [P] Ampliar playwright.config.js: un segundo `webServer` con `node tests/e2e/servidor-portal-e2e.js` en el puerto 3101 (`url: http://127.0.0.1:3101/acceso`), dos proyectos nuevos, `portal-movil` (360 × 740) y `portal-portatil` (1366 × 768), con `testMatch: /portal-.*\.spec\.js/` y `baseURL` en el puerto 3101, y `testIgnore: /portal-.*\.spec\.js/` en los proyectos `movil` y `portatil` existentes, que no cambian
- [X] T004 [P] Crear tests/e2e/servidor-portal-e2e.js, copiando el patrón de tests/e2e/servidor-e2e.js: base temporal, semilla por defecto, `momentoFijado: '2026-11-04T12:00'` y `direccion: 'http://127.0.0.1:3101'`, escuchando en `process.env.PORT`

---

## Fase 2: Base común (bloquea todas las historias)

**Propósito**: esquema versión 3, sesiones de paciente, tres clases de ruta, dirección pública, plantilla del portal y utilidades de test

**⚠️ CRÍTICO**: ninguna historia puede empezar hasta terminar esta fase

### Tests de la base (primero, deben fallar)

- [X] T005 [P] Escribir tests del almacén en tests/integracion/esquema-002.test.js, con escritura directa:
  - `002/FR-001`: un `INSERT INTO paciente` sin `enlace` recibe uno de 32 caracteres hexadecimales en minúscula, distinto en cada ficha; un `enlace` `NULL` explícito se rechaza (`NOT NULL`).
  - `002/FR-025`: se rechaza un enlace de 31 o 33 caracteres, con mayúsculas o con un carácter no hexadecimal (`CHECK (length(enlace) = 32 AND enlace NOT GLOB '*[^0-9a-f]*')`), y dos fichas con el mismo enlace (índice único `paciente_enlace`).
  - `RP1`: insertar en `sesion_paciente` una fila con `cita_id` de una cita de otro paciente aborta; con una cita del mismo paciente se acepta; con `cita_id` `NULL` se acepta.
  - `002/FR-004`: `sesion_paciente.ultima_actividad` es obligatoria.
  - `RP6`: `enlace_cancelacion` exige `token_hash` (clave primaria) y `cita_id` existente.
  - `PRAGMA user_version` es 3, y abrir un archivo de la versión 2 lanza `EsquemaAntiguo` sin modificarlo.
- [X] T006 [P] Añadir tests a tests/unit/formato.test.js:
  - `002/FR-010 nombreDiaCorto`: de 0 a 6, «dom», «lun», «mar», «mié», «jue», «vie» y «sáb».
  - `002/FR-008 tramoCita`: `{ inicio: '2026-11-09T18:00', fin: '2026-11-09T18:45' }` → «lun 09/11/2026, 18:00–18:45», con raya `–` (U+2013).
  - `002/FR-011 enlaceTelefono`: «000 200 000» → `tel:000200000`, y «+34 600 000 003» → `tel:+34600000003`.
- [X] T007 [P] Escribir tests del servidor en tests/integracion/servidor-002.test.js, con rutas de prueba en `rutasExtra` (`{ paciente: true, alcance: 'ficha' }`, `{ paciente: true, alcance: 'cita' }` y `{ paciente: true, alcance: 'cualquiera' }`):
  - `002/FR-005`: sin cookie, con una cookie `sesion_paciente` inventada, con la sesión de recepción en `sesion` y con la sesión de recepción puesta en `sesion_paciente`, cada ruta de paciente responde 401 con «Tu sesión ha terminado», y su manejador no se llama.
  - `RP6`: una sesión de alcance de cita no abre la ruta de alcance `ficha`, y una de ficha no abre la de alcance `cita`. Las dos abren la de alcance `cualquiera`.
  - `002/FR-004`: con `relojReal` inyectado, una sesión usada hace 29 minutos 59 segundos sigue valiendo y renueva `ultima_actividad`; una usada hace 30 minutos y 1 segundo da 401 y su fila desaparece. Igual con `momentoFijado` puesto (las esperas cuentan tiempo real).
  - `002/FR-025`: las respuestas de las rutas de paciente llevan `referrer-policy: no-referrer` y `cache-control: no-store`.
  - El contexto del manejador recibe `paciente`, `clinica` (la de la ficha), `citaDelAlcance` (`null` en alcance de ficha), `relojReal` y `direccion`.
  - `servidor.rutasRegistradas` expone `paciente` y `alcance` de cada ruta, y una ruta de paciente sale con `publica: true`.
- [X] T008 [P] Escribir tests `FR-042` de `esDireccionValida` en tests/unit/direccion.test.js: acepta `http://localhost:3000` y `https://citas.example.com`; rechaza el texto vacío, `ftp://x`, `citas.example.com` sin esquema y `https://citas.example.com/`, con barra final

### Implementación de la base

- [X] T009 Pasar src/datos/esquema.sql a la versión 3 ([data-model.md](data-model.md#esquema-versión-3)), y actualizar el comentario de cabecera:
  - `paciente.enlace`: `TEXT NOT NULL DEFAULT (lower(hex(randomblob(16)))) CHECK (length(enlace) = 32 AND enlace NOT GLOB '*[^0-9a-f]*')`, conservando el índice único.
  - `sesion_paciente`: añadir `cita_id INTEGER REFERENCES cita (id)` (nulo: alcance de ficha) y `ultima_actividad INTEGER NOT NULL` (milisegundos de tiempo real), y un disparador `BEFORE INSERT` que aborte con `RAISE(ABORT, 'SESION_CITA')` si `cita_id` no es nulo y la cita no es de `paciente_id`.
  - Tabla nueva `enlace_cancelacion (token_hash TEXT PRIMARY KEY, cita_id INTEGER NOT NULL REFERENCES cita (id))`, con índice por `cita_id`.
- [X] T010 Cambiar `VERSION_ESQUEMA` a 3 en src/datos/bd.js (depende de T009)
- [X] T011 [P] En src/datos/pacientes.js, que `crearPaciente` omita la columna `enlace` del `INSERT` cuando no la recibe, para que actúe el valor por defecto del almacén, y actualizar su comentario (las fichas del alta ya nacen con enlace)
- [X] T012 [P] En src/semilla/carga.js, que `borrarClinica` borre, antes que las citas, los `enlace_cancelacion` de las citas de esa clínica, y que el borrado de `sesion_paciente` siga antes que el de `paciente` (002/CL Regenerar la semilla)
- [X] T013 [P] Implementar `nombreDiaCorto(numero)`, `tramoCita(cita)` y `enlaceTelefono(telefono)` en src/dominio/formato.js, junto a `nombreDia`
- [X] T014 [P] Crear src/dominio/direccion.js con `esDireccionValida(texto)`, que acepta `^https?://[^\s/]+(:\d+)?$` y nada más
- [X] T015 [P] Crear src/datos/sesiones-paciente.js con `crearSesionPaciente(bd, { tokenHash, pacienteId, citaId, ahoraReal })`, `sesionPacientePorHash(bd, tokenHash)`, `tocarSesionPaciente(bd, tokenHash, ahoraReal)`, `borrarSesionPaciente(bd, tokenHash)` y `borrarSesionesDeFicha(bd, pacienteId)`
- [X] T016 Crear src/servicios/acceso-paciente.js con la parte de sesiones del modelo común ([modelo-acceso.md](contracts/modelo-acceso.md#sesión-de-paciente)): `abrirSesionPaciente(contexto, pacienteId, citaId)` devuelve un token de 32 bytes aleatorios en hexadecimal y guarda su SHA-256; `sesionDePaciente(contexto, token, alcance)` devuelve `{ paciente, clinica, citaDelAlcance }` o `null` si no existe, si han pasado más de 30 minutos de `relojReal()` desde `ultima_actividad` (y entonces la borra) o si el alcance no encaja; si vale, la toca; `cerrarSesionPaciente(contexto, token)` (depende de T015)
- [X] T017 Añadir a src/web/plantilla.js `layoutPortal({ titulo, clinica, contenido })`, con el nombre de la clínica, «Llamar a la clínica: {teléfono}» como enlace `tel:` y un botón «Salir» (`POST /portal/salir`), sin el menú de recepción ni el aviso de reloj fijado, y las páginas del paciente con los textos literales del contrato: `paginaSesionTerminada()` (401), `paginaHasSalido()` (200), `paginaEnlaceNoValido()` (404, idéntica byte a byte siempre: sin datos de clínica ni de paciente), `paginaDemasiadosIntentos()` (429) y `paginaCitaNoEncontrada(clinica)` (404) (depende de T013)
- [X] T018 Ampliar src/web/servidor.js (depende de T016 y T017):
  - `crearServidor` recibe además `relojReal` (por defecto `Date.now`) y `direccion` (por defecto `http://localhost:3000`), y los pasa en el contexto con `ip` (`req.socket.remoteAddress`).
  - Rutas con `paciente: true`: no pasan por el filtro de recepción, leen solo la cookie `sesion_paciente`, llaman a `sesionDePaciente(contexto, token, ruta.alcance)` y, si da `null`, responden con `paginaSesionTerminada()`. Si vale, el manejador recibe `paciente`, `clinica` y `citaDelAlcance`.
  - El filtro de recepción no cambia: solo lee `sesion` y la tabla `sesion` (FR-037 de la 001).
  - Las respuestas de rutas de paciente y de `GET /e/:token` llevan `referrer-policy: no-referrer`.
  - `rutasRegistradas` incluye `paciente` y `alcance`, y `paciente: true` implica `publica: true`.
- [X] T019 Leer `CITACLARA_DIRECCION` en src/principal.js: sin valor, `http://localhost:${puerto}`; con un valor que no cumple `esDireccionValida`, terminar con «La dirección pública CITACLARA_DIRECCION no es válida. Escríbela como http://… o https://…, sin barra al final, por ejemplo https://citas.example.com.»; pasarla a `crearServidor` (depende de T014 y T018)
- [X] T020 [P] Actualizar tests/ayudas/escenario.js: `sesionPacienteDePrueba(bd, pacienteId, { citaId = null, ahoraReal = Date.now() } = {})` inserta también `cita_id` y `ultima_actividad`; la clínica `a` de `crearEscenario` lleva `telefono: '000 300 000'`. Comprobar que la suite de la 001 sigue en verde (depende de T009)
- [X] T021 [P] Crear tests/ayudas/portal.js con: `escenarioSemilla({ momentoFijado = '2026-11-04T12:00', relojReal } = {})`, que carga la semilla por defecto en una base temporal y levanta el servidor; `fichaPorNombre(bd, nombre)`; `citaDe(bd, pacienteId, inicio)`; `entrarComoPaciente(servidor, enlace)`, que abre `/e/<enlace>` y devuelve la cookie `sesion_paciente`; `enlaceCancelacionDePrueba(bd, citaId)`, que genera un token aleatorio de 32 caracteres hexadecimales e inserta su SHA-256 en `enlace_cancelacion`; y `tokenInventado()` (depende de T020)

**Punto de control**: base lista. `npm test` en verde, salvo los tests nuevos de las historias.

---

## Fase 3: Historia de usuario 1 - Entrar sin cuenta ni contraseña (Prioridad: P1) 🎯 MVP

**Objetivo**: el paciente entra con su enlace personal; recepción copia y anula enlaces desde la agenda; el modelo común rechaza igual cualquier enlace no válido, limita los intentos y aísla las sesiones.

**Prueba independiente**: con la semilla, copiar desde la agenda el enlace de pacientes con y sin correo y entrar con ellos; probar enlaces de los dos tipos inventados, anulados y caducados; anular un enlace personal con enlaces de cancelación vivos.

### Tests de la historia 1 (primero, deben fallar)

- [X] T022 [P] [US1] Escribir tests de `GET /e/:token` en tests/integracion/rutas-enlace.test.js, con `escenarioSemilla`:
  - `002/H1-E2`: el enlace personal de Isabel Navarro responde 303 a `/portal` con la cookie `sesion_paciente` `HttpOnly; SameSite=Lax; Path=/` y sin `Max-Age`, y `/portal` muestra su nombre.
  - `002/H1-E3 002/FR-003`: dan estado y cuerpo idénticos byte a byte: un token inventado de 32 caracteres hexadecimales, uno de 31, uno con mayúsculas, uno con un guion, el enlace personal anterior a una anulación, un enlace de cancelación inexistente, uno cuya cita empezó (`inicio <= ahoraLocal`, RR6 de la 003) y uno borrado por RP7. Ninguno contiene «Eleva», el nombre de un paciente ni «cancelación».
  - `002/FR-025`: los tokens de este archivo son aleatorios, y ninguno coincide con un enlace de la semilla.
  - `RP6`: un enlace de cancelación vigente responde 303 a `/cancelar` y abre una sesión con `cita_id` de su cita; esa sesión no abre `/portal`.
  - `002/H1-E4 002/FR-004`, con `relojReal` inyectado: tras 10 enlaces no válidos en 10 minutos desde la misma IP, el undécimo y cualquier enlace válido responden 429 con «Demasiados intentos»; a los 15 minutos y 1 segundo de tiempo real, el enlace válido vuelve a entrar. 9 fallos, 11 minutos de espera y otros 9 fallos no bloquean. Los enlaces inventados de los dos tipos cuentan juntos. Las peticiones a `/portal` no cuentan. Con `momentoFijado` puesto ocurre lo mismo.
  - `002/H1-E7`: tras `POST /portal/salir`, la cookie llega con `Max-Age=0`, la fila de la sesión desaparece y `/portal` responde 401.
  - `002/CL Sesión de recepción y de paciente en el mismo navegador`: con las dos cookies, salir del portal no cierra la sesión de recepción, y `POST /salir` de recepción no cierra la de paciente.
- [X] T023 [P] [US1] Escribir tests de la anulación en tests/integracion/acceso-paciente.test.js:
  - `RP7 002/H1-E5`: `anularEnlace` devuelve un enlace nuevo de 32 caracteres hexadecimales distinto del anterior; el anterior da la respuesta uniforme; las sesiones de esa ficha, de los dos alcances, desaparecen y su siguiente petición responde 401; el enlace nuevo entra.
  - `RP7 002/H1-E6`: David Gil, con su cita del 09/11/2026 a las 18:00 y un `enlaceCancelacionDePrueba` para ella. Tras anular su enlace personal, el de cancelación da la respuesta uniforme y la cita sigue `reservada`, con la fila idéntica.
  - `RP7`: los enlaces de cancelación y las sesiones de otras fichas no cambian, y ninguna fila de `cita` cambia.
  - `002/CL Enlace personal reenviado`: quien tenga el enlace ve las citas de la ficha, y tras anularlo ya no.
- [X] T024 [P] [US1] Escribir tests de aislamiento en tests/integracion/rutas-acceso-paciente.test.js:
  - `002/H1-E8 002/FR-005`: con una sesión de paciente de David Gil, de alcance de ficha y de alcance de cita, en su cookie o puesta en `sesion`, todas las rutas no públicas de `servidor.rutasRegistradas` responden como sin sesión (303 a `/acceso` o 401), sin datos de la agenda.
  - `002/FR-005`: la sesión de recepción de `eleva-demo` responde 401 en `/portal` y en `/portal/citas/:id/cancelar`.
  - `002/FR-026`: las rutas con `publica: true` son exactamente `GET /acceso`, `POST /acceso`, `GET /e/:token`, `GET /portal`, `GET /portal/citas/:id/cancelar`, `POST /portal/citas/:id/cancelar` y `POST /portal/salir`, y todas las de `/portal` tienen `paciente: true`.
  - `002/CL Teléfono compartido por varias fichas`: dos fichas con el mismo teléfono tienen enlaces distintos, y cada uno solo muestra las citas de su ficha.
  - `002/CL Regenerar la semilla`: tras volver a cargar la semilla, una sesión de paciente abierta responde 401.
  - `002/CL Correo de recordatorio reenviado`: una sesión abierta con un enlace de cancelación no abre `/portal` ni ninguna cita distinta de la suya.
  - `002/SC-004 RP1`: para cada uno de los 40 pacientes de la semilla, con su enlace personal, `GET` y `POST /portal/citas/:id/cancelar` de una cita reservada futura de otro paciente responden 404 sin su nombre; y con un `enlaceCancelacionDePrueba` de una de sus citas, la sesión abierta no alcanza `/portal` ni otra cita. Al final, ninguna fila de `cita` ha cambiado: cero accesos a datos ajenos.
- [X] T025 [US1] Ampliar en tests/integracion/rutas-acceso.test.js la lista esperada del test «FR-001 solo la pantalla de acceso es pública» con `GET /e/:token` y las cuatro rutas de `/portal` del contrato, y con nada más, como prevé FR-001 de la 001
- [X] T026 [P] [US1] Escribir tests de recepción en tests/integracion/rutas-enlace-ficha.test.js, con la sesión de `eleva-demo`:
  - `002/H1-E1`: en la agenda, cada cita lleva «Enlace del paciente»; desde una cita de Isabel Navarro, que no tiene correo, `GET /citas/:id/enlace` muestra «Enlace de Isabel Navarro», un campo de solo lectura con `<direccion>/e/<su enlace>`, «Copiar enlace» y «Dáselo al paciente por el medio que uses con él. CitaClara no lo envía.».
  - `002/FR-002`: `GET /citas/:id/enlace/anular` muestra la confirmación con los textos del contrato y no cambia nada; `POST /citas/:id/enlace/anular` responde 303 a `/citas/:id/enlace?nuevo=1`, que muestra «El enlace anterior ya no funciona. Este es el nuevo.» y el enlace nuevo. Ninguna de las dos rutas envía nada ni cambia citas.
  - `002/FR-002`: una cita de otra clínica responde 404, y sin sesión de recepción, 303 a `/acceso` o 401.
  - `002/SC-001`: los 40 pacientes de la semilla tienen enlace, de 32 caracteres hexadecimales y todos distintos, sin ningún alta; una ficha creada en el alta de una cita (`POST /citas` con paciente nuevo) también tiene enlace.

### Implementación de la historia 1

- [X] T027 [P] [US1] Crear src/datos/enlaces.js con `pacientePorEnlace(bd, token)` y `enlaceCancelacionPorHash(bd, tokenHash)`, que devuelve la cita (con `paciente_id`, `clinica_id` e `inicio`) o `undefined`
- [X] T028 [US1] Añadir el límite de intentos a src/servicios/acceso-paciente.js: constantes `INTENTOS_MAXIMOS = 10`, `VENTANA_MS = 10 * 60_000` y `BLOQUEO_MS = 15 * 60_000`; un `Map` en memoria por IP con los fallos dentro de la ventana y el fin del bloqueo; `ipBloqueada(ip, ahoraReal)` y `registrarFallo(ip, ahoraReal)`. Exportar una función para vaciarlo, solo para los tests
- [X] T029 [US1] Añadir `resolverEnlace(contexto, token)` a src/servicios/acceso-paciente.js, en el orden de [modelo-acceso.md](contracts/modelo-acceso.md#resolución-de-un-enlace): bloqueo → forma `/^[0-9a-f]{32}$/` → enlace personal (sesión de ficha) → SHA-256 en `enlace_cancelacion` con `ahoraLocal(contexto, zona de la clínica de la cita) < cita.inicio` (sesión de cita; comentario: «vigencia de RR6 de la 003, decisión D5») → fallo registrado. Devuelve `{ bloqueado }`, `{ noValido }` o `{ token, destino }` (depende de T027 y T028)
- [X] T030 [US1] Crear src/web/rutas/enlace.js con `GET /e/:token` (`publica: true`): 429 con `paginaDemasiadosIntentos()`, 404 con `paginaEnlaceNoValido()`, o 303 al destino con la cookie `sesion_paciente=<token>; HttpOnly; SameSite=Lax; Path=/`. Registrarla en src/web/servidor.js (depende de T029)
- [X] T031 [US1] Crear src/web/rutas/portal.js con `GET /portal` (alcance `ficha`), de momento con el título «Tus citas» y el nombre del paciente dentro de `layoutPortal`, y `POST /portal/salir` (alcance `cualquiera`), que llama a `cerrarSesionPaciente`, borra la cookie con `Max-Age=0` y responde `paginaHasSalido()`. Registrarlas en src/web/servidor.js
- [X] T032 [US1] Añadir `anularEnlace(bd, clinicaId, pacienteId)` a src/datos/pacientes.js: en una `transaccionInmediata`, `UPDATE paciente SET enlace = lower(hex(randomblob(16)))`, borrado de los `enlace_cancelacion` de las citas de la ficha y `borrarSesionesDeFicha`; devuelve el enlace nuevo. Comentario: «RP7: el enlace anterior, los de cancelación y las sesiones caen a la vez» (depende de T015)
- [X] T033 [P] [US1] Crear src/web/vistas/enlace-ficha.js con `vistaEnlace({ clinica, cita, enlaceCompleto, nuevo, momentoFijado })` y `vistaAnularEnlace(...)`, con el `layout` de recepción y los textos de [portal-web.md](contracts/portal-web.md#presentación-de-los-añadidos-de-recepción). El campo del enlace es `readonly` y la página carga `copiar.js`
- [X] T034 [US1] Crear src/web/rutas/enlace-ficha.js con `GET /citas/:id/enlace`, `GET /citas/:id/enlace/anular` y `POST /citas/:id/enlace/anular` (rutas de recepción; 404 con `paginaNoEncontrada` si la cita no es de la clínica), construyendo el enlace como `${contexto.direccion}/e/${paciente.enlace}`. Registrarlas en src/web/servidor.js (depende de T032 y T033)
- [X] T035 [P] [US1] Crear src/web/estaticos/copiar.js: el botón «Copiar enlace» usa `navigator.clipboard.writeText`; si no existe o falla, selecciona el texto del campo y muestra «Pulsa Ctrl+C para copiarlo.» en una región `aria-live`
- [X] T036 [US1] Añadir el enlace «Enlace del paciente» a cada cita de la agenda, junto al del correo, en src/web/vistas/agenda.js

**Punto de control**: con el enlace de David Gil se entra en «Tus citas» y se sale; recepción copia y anula enlaces; los tests de la historia 1 en verde.

---

## Fase 4: Historia de usuario 2 - Ver mis citas (Prioridad: P1)

**Objetivo**: el paciente ve primero su próxima cita, el resto de sus citas futuras y su historial, con las etiquetas de la agenda.

**Prueba independiente**: entrar como cada paciente de la tabla de [Datos de los ejemplos](spec.md#datos-de-los-ejemplos) y comparar con la semilla. Aporta valor aunque aún no se pueda cancelar.

### Tests de la historia 2 (primero, deben fallar)

- [X] T037 [P] [US2] Escribir tests del dominio en tests/unit/portal.test.js, con citas construidas a mano y `ahora = '2026-11-04T12:00'`:
  - `RP2`: una reservada con inicio a las 12:01 va a próximas; con inicio a las 12:00 (`sinCerrar`) y a las 11:45, al historial; completadas, no asistidas y canceladas, al historial, también la cancelada de fecha futura (`002/CL Cita cancelada de fecha futura`).
  - `002/FR-007`: próximas de la más cercana a la más lejana, e historial de la más reciente a la más antigua.
  - `002/FR-009`: una sin cerrar se etiqueta «Pendiente de confirmar por la clínica»; una cancelada con origen `portal` o `correo` y momento `2026-11-04T12:00`, «Cancelada por el paciente el 04/11/2026 a las 12:00»; con origen `recepcion`, «Cancelada»; una reservada futura, «Reservada».
  - `RP3 002/FR-013`: una próxima a las 14:00 es cancelable; una a las 13:59 no lo es y lleva `limite` `2026-11-04T11:59`, el que da `limiteCancelacion` de la 001, sin cifra propia.
  - `002/CL Cita que empieza justo ahora`: con `ahora` igual a su inicio, deja de ser próxima y se etiqueta como sin cerrar.
  - `002/CL Días de cambio de hora`: una cita del 29/03/2027 a las 09:00 conserva «09:00», y su límite es `2027-03-29T07:00`.
- [X] T038 [P] [US2] Escribir tests de `GET /portal` en tests/integracion/rutas-portal.test.js, con `escenarioSemilla` y entrando por el enlace de cada paciente:
  - `002/H2-E1`: David Gil ve en «Próximas citas», en este orden, «lun 09/11/2026, 18:00–18:45» con «Sesión de fisioterapia con María» y «lun 09/11/2026, 19:00–19:30» con «Consulta de nutrición con Lucía», y la página dice «Horas en hora peninsular».
  - `002/H2-E2`: su historial tiene 11 citas, de la más reciente a la más antigua, y la del 23/09/2026 con Lucía aparece como «No asistida».
  - `002/H2-E3`: su cita del 02/11/2026 a las 15:15 aparece en el historial como «Pendiente de confirmar por la clínica», sin enlace «Cancelar».
  - `002/H2-E4 002/FR-012`: Rocío Marín ve «No tienes citas próximas. Para pedir una, llama a la clínica.», el enlace `tel:000200000` y 8 citas «Completada».
  - `002/H2-E5`: con `momentoFijado: '2026-11-04T12:16'`, la cita de Javier Peña de las 12:15 ya no está en próximas, sino en el historial.
  - `002/H2-E7 RP1`: la página de un paciente no contiene el nombre de ningún otro paciente, y `GET /portal/citas/<id de una cita ajena>/cancelar` responde lo mismo que con un id inexistente.
  - `002/FR-008`: ninguna página del portal contiene «€».
  - `002/FR-011`: la cabecera muestra «Clínica Eleva» y un enlace `href="tel:000200000"`.
  - `002/FR-013`: Javier Peña ve en su cita de las 12:15 «Ya no se puede cancelar desde aquí: se podía hasta el mié 04/11/2026 a las 10:15. Si no puedes venir, llama a la clínica.», con el enlace de llamada, y sin «Cancelar».
  - `002/SC-006`: la página de Isabel Navarro, con 19 citas, responde en menos de 2.000 ms, medido 10 veces.
- [X] T039 [P] [US2] Escribir en tests/e2e/portal-paciente.spec.js el test `002/H2-E6 002/FR-022`: en una ventana de 360 × 640, la página de Isabel Navarro muestra la primera próxima cita y su botón «Cancelar» dentro de la ventana sin desplazarse, y `document.documentElement.scrollWidth` no supera 360

### Implementación de la historia 2

- [X] T040 [P] [US2] Crear src/datos/portal.js con `citasDeFicha(bd, clinicaId, pacienteId)`: `inicio`, `fin`, `estado`, `origen_cancelacion`, `momento_cancelacion`, nombre del servicio y nombre del profesional, filtrado por clínica y paciente, sin leer `precio_centimos`
- [X] T041 [P] [US2] Crear src/dominio/portal.js con `citasDelPaciente(citas, ahora)` → `{ proximas, historial }`, donde cada cita lleva `etiqueta`, `cancelable` y, si es próxima y no cancelable, `limite`, usando solo `sinCerrar`, `dentroDePlazo` y `limiteCancelacion` de src/dominio/estados.js y `etiquetaCita` de src/dominio/formato.js
- [X] T042 [US2] Crear src/web/vistas/portal.js con `vistaPortal({ clinica, paciente, proximas, historial, aviso })` según [portal-web.md](contracts/portal-web.md#presentación-del-portal): título «Tus citas», nombre, `etiquetaZona`, «Próximas citas» (con «Cancelar» → `/portal/citas/:id/cancelar`, o el texto del límite con el enlace de llamada) o el mensaje sin citas, e «Historial». Estado siempre en texto, con una clase por estado (depende de T013)
- [X] T043 [US2] Completar `GET /portal` en src/web/rutas/portal.js con `citasDeFicha`, `citasDelPaciente` y `vistaPortal`, con `ahoraLocal(contexto, clinica.zona_horaria)` (depende de T040, T041 y T042)
- [X] T044 [P] [US2] Añadir los estilos del portal a src/web/estaticos/estilos.css: una columna desde 360 píxeles, tarjetas de cita compactas para que la primera entre en 360 × 640 con su botón, controles de al menos 44 × 44 píxeles y contraste de al menos 4,5:1, reutilizando las variables y clases de estado de la 001

**Punto de control**: cada paciente de la tabla ve sus citas como dice la spec; los tests de las historias 1 y 2 en verde.

---

## Fase 5: Historia de usuario 3 - Cancelar una cita futura (Prioridad: P1)

**Objetivo**: el paciente cancela una cita dentro del plazo de RN8 de la 001, con confirmación, y siempre ve un mensaje claro según el resultado de FR-038.

**Prueba independiente**: cancelar citas de la semilla antes y después del límite, y comprobar el estado, la agenda y los rechazos.

### Tests de la historia 3 (primero, deben fallar)

- [ ] T045 [P] [US3] Escribir tests en tests/integracion/rutas-portal-cancelar.test.js, con `escenarioSemilla`:
  - `002/H3-E1 002/FR-014`: `GET /portal/citas/:id/cancelar` de la cita de David Gil del 09/11/2026 a las 18:00 muestra «¿Cancelar esta cita?», la cita completa, «Si la cancelas, no se puede deshacer.», «Sí, cancelar la cita» y «No, volver a mis citas», y no cambia la fila.
  - `002/H3-E2 002/FR-016 RP4`: tras el `POST`, 200 con «Cita cancelada», la cita y el enlace de llamada; la fila tiene `estado` `cancelada`, `origen_cancelacion` `portal` y `momento_cancelacion` `2026-11-04T12:00`; `/portal` la muestra en el historial como «Cancelada por el paciente el 04/11/2026 a las 12:00», y la de las 19:00 sigue «Reservada».
  - `002/H3-E3`: «No, volver a mis citas» enlaza a `/portal`, y tras abrir la confirmación sin confirmar la fila es idéntica.
  - `002/H3-E4 002/FR-017`: la confirmación de la cita de Javier Peña de las 12:15 no tiene botón y explica el límite de las 10:15; su `POST` responde 409 con «Ya no se puede cancelar desde aquí» y «Se podía cancelar hasta el mié 04/11/2026 a las 10:15», con el enlace de llamada, y la fila no cambia.
  - `002/H3-E5`: la misma cita, cancelada con `cancelarCita(…, 'portal')` y con `cancelarCita(…, 'correo')` sin pasar por la pantalla, da `fuera_de_plazo` y no cambia.
  - `002/H3-E6 002/FR-017`: tras cancelar la cita con `cancelarCita(…, 'recepcion')`, el `POST` del portal responde 409 con la página «Tus citas» y «Esta cita ya está cancelada. No tienes que hacer nada más.»; el origen sigue siendo `recepcion` y el momento, el de recepción.
  - `002/H3-E7 002/FR-017`: dos `POST` seguidos, y otros dos lanzados a la vez con `Promise.all`, responden los dos 200 con «Cita cancelada», sin error, y la fila tiene un solo origen y un solo momento.
  - `002/FR-017`: una cita completada del historial responde 409 con «Esta cita ya no se puede cancelar» y «Consta como completada»; una no asistida, «Consta como no asistida».
  - `RP1 002/FR-015`: el `POST` de una cita de otro paciente responde 404 con el mismo cuerpo que el de un id inexistente, y la fila no cambia.
  - `002/CL El plazo vence con la página abierta`: dos servidores sobre la misma base, uno con `momentoFijado` 10:14 y otro con 10:16; la confirmación abierta en el primero se envía al segundo y da «fuera de plazo».
  - `002/CL Cancelar y completar a la vez`: `aplicarAccion(…, 'completar')` de recepción y el `POST` del portal sobre una cita a las 11:45 con `momentoFijado` 12:00 dan un solo cambio de estado, y el portal responde con el mensaje del estado resultante.
  - `002/CL Cita ya empezada y sin cerrar`: la cita de David Gil del 02/11/2026 a las 15:15 da «fuera de plazo» por `POST`, y sigue reservada.
  - `002/CL Cancelación con la clínica cerrada`: la cita de Isabel Serrano del 09/11/2026 a las 10:30 se cancela con `momentoFijado` `2026-11-09T08:30`, y con `2026-11-09T08:31` da «fuera de plazo».
  - `002/CL Paciente que quiere cambiar la cita`: la confirmación de una cancelación lleva el enlace de llamada.
- [ ] T046 [P] [US3] Escribir en tests/unit/portal-escrituras.test.js dos tests sobre el texto de los módulos src/web/rutas/portal.js, src/servicios/cancelar-portal.js, src/dominio/portal.js y src/datos/portal.js: `RP5`, ninguno contiene `registrarCancelacion`, `cambiarEstado`, `insertarCita`, `crearCita` ni `UPDATE`/`INSERT`/`DELETE` sobre `cita`; y `RP4`, la única llamada a `cancelarCita` está en src/servicios/cancelar-portal.js y usa el canal `'portal'`
- [ ] T047 [P] [US3] Añadir a tests/e2e/portal-paciente.spec.js el test `002/H3-E2` en el móvil: entrar con el enlace de un paciente con una cita cancelable, pulsar «Cancelar», confirmar, ver «Cita cancelada» y, al volver a «Tus citas», la etiqueta «Cancelada por el paciente el 04/11/2026 a las 12:00»

### Implementación de la historia 3

- [ ] T048 [US3] Crear src/servicios/cancelar-portal.js con `cancelarDesdePortal(contexto, citaId)`: lee la cita con `citaPorId(bd, clinica.id, citaId)` y, si no existe o su `paciente_id` no es el de `contexto.paciente`, devuelve `{ caso: 'no_encontrada' }` (comentario: «la comprobación no envejece: `cita_rn4` impide cambiar el paciente»); si no, llama a `cancelarCita(contexto, citaId, 'portal')` y traduce el resultado a `hecha` (`cancelada_ahora`, o `ya_cancelada` con origen `portal` o `correo`), `ya_cancelada_por_clinica`, `fuera_de_plazo` (con `limite`) o `no_cancelable` (con `estado`), según [research.md §8](research.md#8-cancelar-desde-el-portal-rp1-rp4-fr-014-a-fr-017)
- [ ] T049 [US3] Añadir a src/web/vistas/portal.js `vistaConfirmarCancelacion({ clinica, cita, limite })`, sin botón y con la explicación del límite si la cita ya no es cancelable, y `vistaResultadoCancelacion({ clinica, caso, cita, limite, estado })` con los textos literales del contrato
- [ ] T050 [US3] Añadir a src/web/rutas/portal.js `GET /portal/citas/:id/cancelar` y `POST /portal/citas/:id/cancelar` (alcance `ficha`): 404 con `paginaCitaNoEncontrada` para `no_encontrada`; 200 para `hecha`; 409 con `vistaPortal` y su `aviso` para `ya_cancelada_por_clinica`; 409 para `fuera_de_plazo` y `no_cancelable`. Registrarlas en src/web/servidor.js (depende de T048 y T049)

**Punto de control**: las tres historias P1 funcionan; un paciente entra, ve y cancela. Los tests de las historias 1 a 3 en verde.

---

## Fase 6: Historia de usuario 4 - Recepción aprovecha el hueco liberado (Prioridad: P2)

**Objetivo**: recepción ve en la agenda los huecos que liberan los pacientes y los vuelve a reservar sin solapes.

**Prueba independiente**: cancelar una cita desde el portal y comprobar el tramo libre, la marca de la cita y la lista de huecos, con reservas simultáneas sobre ese tramo.

### Tests de la historia 4 (primero, deben fallar)

- [ ] T051 [P] [US4] Escribir tests en tests/integracion/huecos-liberados.test.js, con `escenarioSemilla` y la sesión de `eleva-demo`:
  - `002/H4-E1 002/FR-018`: tras cancelar desde el portal la cita de Cristina Ortega del 11/11/2026 de 11:15 a 12:00 con Lucía, la agenda de Lucía de ese día muestra «Libre» de 10:00 a 13:15 y la cita cancelada sigue visible.
  - `002/H4-E2`: recepción reserva una consulta a las 11:15 por `POST /citas`, se acepta, y la agenda muestra la cancelada y la nueva sin confundirlas.
  - `002/H4-E5 002/FR-019`: en la agenda de María y en la de Jorge, de cualquier día, la sección «Huecos liberados por pacientes» muestra «mié 11/11/2026, 11:15–12:00, Lucía» como enlace a `/agenda?profesional=<id de Lucía>&dia=2026-11-11`.
  - `002/H4-E6`: en esa agenda, la cita se etiqueta «Cancelada por el paciente el 04/11/2026 a las 12:00».
  - `002/H4-E7`: el hueco sale de la lista tras reservar todo su tramo, tras reservar solo una parte que se cruce con él (una consulta a las 11:30), y con `momentoFijado` `2026-11-11T11:15`.
  - `002/H4-E8`: una cita cancelada por recepción se muestra «Cancelada» y no entra en la lista.
  - `002/FR-019`: un hueco liberado por el correo (cita cancelada con `cancelarCita(…, 'correo')`) también entra; la lista va del más cercano al más lejano; un mismo tramo cancelado dos veces sale una sola vez; las canceladas de la historia de la semilla (origen `recepcion`) no salen; sin huecos, «Ningún paciente ha liberado huecos próximos.».
  - `002/FR-020`: cargar la agenda no crea, mueve ni cambia ninguna cita.
  - `002/CL Huecos con poco margen`: un hueco cuya cita empieza a las 12:15 con `momentoFijado` 12:00 sale en la lista, y con 12:15 ya no.
- [ ] T052 [P] [US4] Escribir tests de concurrencia en tests/concurrencia/hueco-liberado.test.js, con el patrón de barrera de tests/concurrencia/solape.test.js y los trabajadores existentes tests/concurrencia/trabajador.js y tests/concurrencia/trabajador-cancelar.js (canal `portal`), en bloques posteriores al 09/11/2026 a las 08:00, el «ahora» de trabajador.js:
  - `002/SC-005 002/H4-E3 RN1`: 1.000 rondas; en cada una se cancela por el portal una cita reservada y 4 procesos reservan a la vez su tramo exacto o uno que se cruza. Exactamente una reserva prospera, las demás reciben el rechazo de solape, y al final no hay ningún par de citas `reservada` o `completada` del mismo profesional que se crucen.
  - `002/SC-005 002/H4-E4`: 1.000 rondas; en cada una, un proceso cancela por el portal y otros 3 reservan el mismo tramo a la vez. Cero solapes, y si una reserva prospera, la cancelación ya está registrada en la base.

### Implementación de la historia 4

- [ ] T053 [US4] Añadir `huecosLiberados(bd, clinicaId, ahora)` a src/datos/portal.js, según [data-model.md](data-model.md#hueco-liberado): citas `cancelada` con `origen_cancelacion IN ('portal', 'correo')` y `inicio > ahora`, sin ninguna cita `reservada` o `completada` del mismo profesional con `inicio < fin_hueco AND inicio_hueco < fin`; una fila por profesional, inicio y fin; orden por inicio; con el id y el nombre del profesional
- [ ] T054 [US4] En src/web/rutas/agenda.js, pasar `huecosLiberados(bd, clinica.id, momento)` a la vista; en src/web/vistas/agenda.js, pintar la sección «Huecos liberados por pacientes» encima de la agenda del día, con `tramoCita` y el nombre del profesional, cada hueco como enlace a su agenda, o el texto sin huecos (depende de T053)

**Punto de control**: todas las historias funcionan por separado; los tests de concurrencia, con cero solapes.

---

## Fase 7: Cierre y aspectos transversales

**Propósito**: interfaz en navegador real, trazabilidad, documentación y validación de punta a punta

- [ ] T055 [P] Crear tests/e2e/portal-accesibilidad.spec.js con `auditarPantalla` de tests/e2e/ayudas.js, en los proyectos `portal-movil` y `portal-portatil`:
  - `002/FR-021 002/SC-007`: sin desplazamiento horizontal, contraste de al menos 4,5:1 y controles de al menos 44 × 44 píxeles en «Tus citas», la confirmación, cada resultado de cancelar, «Este enlace no funciona», «Demasiados intentos», «Tu sesión ha terminado» y «Has salido», y en las pantallas de recepción «Enlace de…», su anulación y la agenda con la lista de huecos.
  - `002/SC-007 002/FR-010 002/CL Reloj del móvil equivocado o paciente en otra zona horaria`: la página de David Gil muestra las mismas horas con `timezoneId` `Europe/Madrid`, `Atlantic/Canary` y `America/New_York`.
  - `002/FR-023`: con el navegador en inglés (`locale: 'en-US'`), los textos del portal siguen en español.
- [ ] T056 [P] Añadir a tests/e2e/portal-paciente.spec.js el test `002/SC-001` en el portátil: desde la agenda de María, abrir «Enlace del paciente» de una cita y pulsar «Copiar enlace» (con el permiso `clipboard-write` concedido); el portapapeles contiene `http://127.0.0.1:3101/e/<32 caracteres>`, y el recorrido completo dura menos de 30 segundos
- [ ] T057 Crear tests/unit/trazabilidad-002.test.js, con el patrón de tests/unit/trazabilidad.test.js sobre specs/002-portal-paciente/spec.md:
  - `002/SC-010 la spec tiene las reglas, escenarios y criterios esperados`: reglas `RP1` a `RP7`, 30 escenarios (8, 7, 7 y 8 por historia) y 10 criterios.
  - `002/SC-010 cada regla, escenario y criterio tiene un test que empieza por él`: `RPn` sin prefijo, y escenarios y criterios como `002/Hx-Ey` y `002/SC-nnn`, salvo 002/SC-002, 002/SC-003, 002/SC-008 y 002/SC-009.
  - `002/SC-010 los criterios medidos a mano tienen protocolo` en specs/002-portal-paciente/checklists/entrega.md.
- [ ] T058 [P] Completar el apartado «Dirección pública del producto (FR-042)» de specs/001-nucleo-agenda/contracts/configuracion.md con la tabla de `CITACLARA_DIRECCION`, su valor por defecto, el mensaje de error y que la leen el servidor y la 003, tal como reserva ese contrato para la primera feature que construya enlaces
- [ ] T059 Ejecutar `npm test` y `npm run test:e2e` completos: la suite de la 001 y la de la 002 en verde, sin ningún test desactivado ni relajado (principio VI). Si aparece un solape en cualquier prueba, parar: bloquea la entrega (principio III)
- [ ] T060 Recorrer a mano los 12 escenarios de specs/002-portal-paciente/quickstart.md con `CITACLARA_AHORA=2026-11-04T12:00`, y anotar el resultado en specs/002-portal-paciente/checklists/entrega.md

---

## Dependencias y orden de ejecución

### Dependencias entre fases

- **Preparación (fase 1)**: sin dependencias. T001 va primero, y si falla, nada sigue.
- **Base común (fase 2)**: depende de la fase 1, y bloquea todas las historias.
- **Historias (fases 3 a 6)**: dependen de la fase 2.
- **Cierre (fase 7)**: depende de las historias que se quieran entregar. T057 solo pasa cuando están todas.

### Dependencias entre historias

- **US1 (P1)**: tras la fase 2. Es la entrada a todo lo demás: sin enlace no hay portal.
- **US2 (P1)**: tras la fase 2. Usa `GET /portal` de T031 y la entrada de T030, pero se puede probar con `sesionPacienteDePrueba` sin esperar al resto de US1.
- **US3 (P1)**: depende de US2 (T042 y T043), porque la confirmación y el mensaje de «ya está cancelada» se pintan sobre la vista del portal.
- **US4 (P2)**: tras la fase 2. Sus tests cancelan con `cancelarCita(…, 'portal')` directamente, así que no depende de US3 para probarse; el escenario 1 de punta a punta sí usa la ruta de US3.

### Dentro de cada historia

- Los tests, primero, y deben fallar.
- Datos y dominio antes que servicios; servicios antes que rutas; rutas antes que vistas que las enlazan.
- Cada historia termina con su punto de control en verde.

### Archivos que tocan varias historias

- src/web/rutas/portal.js: T031 (US1), T043 (US2) y T050 (US3), en ese orden.
- src/web/vistas/portal.js: T042 (US2) y T049 (US3).
- src/web/vistas/agenda.js: T036 (US1) y T054 (US4).
- src/datos/portal.js: T040 (US2) y T053 (US4).
- src/web/servidor.js: T018 (base), y el registro de rutas en T030, T031, T034 y T050.
- tests/e2e/portal-paciente.spec.js: T039, T047 y T056.

### Oportunidades de paralelismo

- Fase 1: T002, T003 y T004.
- Fase 2: los tests T005 a T008; después T011 a T015, y T020 y T021.
- US1: los tests T022, T023, T024 y T026; después T027, T033 y T035.
- US2: los tests T037, T038 y T039; después T040, T041 y T044.
- US3: los tests T045, T046 y T047.
- US4: los tests T051 y T052.
- Con la fase 2 terminada, US1, US2 y US4 pueden avanzar a la vez, respetando los archivos compartidos de arriba.

---

## Ejemplo de paralelismo: historia 1

```text
# Tests de la historia 1, a la vez:
Tarea: "T022 tests de GET /e/:token en tests/integracion/rutas-enlace.test.js"
Tarea: "T023 tests de la anulación en tests/integracion/acceso-paciente.test.js"
Tarea: "T024 tests de aislamiento en tests/integracion/rutas-acceso-paciente.test.js"
Tarea: "T026 tests de recepción en tests/integracion/rutas-enlace-ficha.test.js"

# Piezas independientes de la historia 1, a la vez:
Tarea: "T027 búsquedas de enlaces en src/datos/enlaces.js"
Tarea: "T033 vistas del enlace en src/web/vistas/enlace-ficha.js"
Tarea: "T035 script de copiar en src/web/estaticos/copiar.js"
```

## Ejemplo de paralelismo: historia 2

```text
Tarea: "T037 tests del dominio en tests/unit/portal.test.js"
Tarea: "T038 tests de GET /portal en tests/integracion/rutas-portal.test.js"
Tarea: "T039 test de 360 × 640 en tests/e2e/portal-paciente.spec.js"

Tarea: "T040 citasDeFicha en src/datos/portal.js"
Tarea: "T041 citasDelPaciente en src/dominio/portal.js"
Tarea: "T044 estilos del portal en src/web/estaticos/estilos.css"
```

---

## Estrategia de implementación

### Primero el MVP

1. Completar las fases 1 y 2.
2. Completar la fase 3 (US1) y la fase 4 (US2).
3. **Parar y validar**: un paciente entra con su enlace y ve sus citas. Ya quita las llamadas de «¿cuándo tengo la cita?».
4. Completar la fase 5 (US3): con ella se cumplen las tres historias P1, y el portal hace lo que pidió Sonia.

US1 sola se puede validar con tests, pero no aporta nada visible al paciente: la primera demo útil necesita también US2.

### Entrega incremental

1. Base lista.
2. US1 → entrar, salir, copiar y anular enlaces.
3. US2 → ver las citas.
4. US3 → cancelar. Fin de las historias P1.
5. US4 → huecos liberados en la agenda, con las pruebas de solape.
6. Fase 7 → accesibilidad, trazabilidad, contrato de la 001 y validación manual.

### Condición para integrar

La spec está aprobada desde el 12/11/2026. El merge en `master` exige la suite completa en verde (T059), cero solapes (T052) y la trazabilidad de T057 en verde.

---

## Notas

- Comprobar que cada test falla antes de implementar.
- Hacer commit tras cada tarea o grupo lógico.
- Si un solape aparece en cualquier prueba, es un defecto de máxima gravedad y bloquea la entrega (principio III).
- Ningún test se desactiva ni se relaja. Si deja de ser válido, primero se corrige la spec (principio VI).
- Los cambios en módulos de la 001 (esquema, servidor, agenda, semilla y el test de FR-001) son los que prevén FR-001, FR-013, FR-037 y FR-042 de la 001. Si una tarea necesita algo más de la 001, se pide a su propietario y no se aplica por cuenta propia.
