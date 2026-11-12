---

description: "Lista de tareas de implementación de los recordatorios de cita"
---

# Tareas: Recordatorios de cita

**Entrada**: documentos de diseño de `specs/003-recordatorios-cita/`, con la spec aprobada el 12/11/2026

**Requisitos previos**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md)

**Tests**: obligatorios (constitución, principios III y VI; FR-023 y FR-024 de esta spec). Se escriben primero y deben fallar antes de implementar.

**Organización**: las tareas se agrupan por historia de usuario, para implementar y probar cada una por separado. Las tres historias P1 siguen el orden de la spec, porque cada una usa lo anterior: la 2 necesita recordatorios con enlace (historia 1), y la 3 abre ese enlace contra el servidor (historia 2).

## Nombres de la 002

Anotados en T002 sobre `master` en `f2541d0`, con la 002 integrada. Todas las piezas que usan estas tareas existen y se exportan, así que no hay nada que pedir a la 002.

| Pieza | Nombre real |
|-------|-------------|
| Generador único del token | No es una función JS: es `lower(hex(randomblob(16)))` de SQLite (contrato `modelo-acceso.md`, «Generador único»). La 003 lo pide al almacén con `SELECT lower(hex(randomblob(16)))`, como `anularEnlace` en `src/datos/pacientes.js` |
| Respuesta uniforme | `paginaEnlaceNoValido()` de `src/web/plantilla.js`, código 404 |
| Registro de rutas de paciente con su alcance | Entradas `{ metodo, patron, paciente: true, alcance: 'cita', manejador }` en la lista de rutas de `crearServidor` (`src/web/servidor.js`), que las atiende con `atenderPaciente` y `Referrer-Policy: no-referrer`. Sin sesión: `paginaSesionTerminada()` (401) |
| Contexto de esas rutas | `{ ...base, paciente, clinica, citaDelAlcance, tokenPaciente, formulario }`, de `sesionDePaciente` en `src/servicios/acceso-paciente.js`. `citaDelAlcance` es la fila de `citaPorId` |
| Resolución del enlace | `resolverEnlace` en `src/servicios/acceso-paciente.js` y `GET /e/:token` en `src/web/rutas/enlace.js`, que redirige con 303 a `/cancelar` |
| Plantilla de las páginas del paciente | `layoutPortal({ titulo, clinica, contenido })` y `enlaceLlamada(clinica, clase)` de `src/web/plantilla.js`; `enlaceTelefono` de `src/dominio/formato.js` |
| Lectura de `CITACLARA_DIRECCION` | En `src/principal.js`, con `esDireccionValida` de `src/dominio/direccion.js` y el mensaje `DIRECCION_NO_VALIDA`; el servidor la recibe como `crearServidor({ direccion })` |
| Borrado de enlaces en `borrarClinica` | `DELETE FROM enlace_cancelacion WHERE cita_id IN (SELECT id FROM cita WHERE clinica_id = ?)` en `src/semilla/carga.js` |
| Anulación del enlace personal (RP7) | `anularEnlace(bd, clinicaId, pacienteId)` de `src/datos/pacientes.js` |
| Huecos liberados (002/FR-019) | `huecosLiberados(bd, clinicaId, ahora)` de `src/datos/portal.js` |

## Formato: `[ID] [P?] [Historia] Descripción`

- **[P]**: se puede hacer en paralelo (archivos distintos, sin dependencias pendientes)
- **[US1]…[US4]**: historia de usuario de la spec (US1 es la «Historia de usuario 1»)

## Convenciones para todas las tareas

- **Código**: JavaScript con módulos ES sobre Node 26, sin dependencias nuevas. Vocabulario del dominio en español, con el estilo de `src/` (comentarios breves que citan el requisito).
- **Nombres de test** (FR-023; FR-035 de la 001): cada test empieza por el identificador que comprueba. Las reglas, sin prefijo: `RR1` a `RR6`. Lo demás de esta spec, con `003/`: `003/FR-007`, `003/SC-003`, `003/H2-E5` (escenario 5 de la historia 2) y `003/CL` seguido del nombre del caso límite. Nunca un identificador de la 001 sin prefijo al principio, porque contaría como cobertura de la 001.
- **Reloj**: «ahora» se lee siempre con `ahoraLocal(contexto, zona)` de `src/dominio/tiempo.js`. Los tests fijan el momento con `contexto.momentoFijado`. Las esperas (el programador) usan un `relojReal()` inyectado, nunca `ahoraLocal`.
- **Cancelar**: solo con `cancelarCita(contexto, citaId, 'correo')` de `src/servicios/cancelar.js` (FR-038 de la 001). Ningún módulo de la 003 importa `registrarCancelacion`.
- **Modelo de acceso**: el de [modelo-acceso.md de la 002](../002-portal-paciente/contracts/modelo-acceso.md), tal cual. Ni ruta pública, ni respuesta para enlaces no válidos, ni contador de intentos propios.
- **Textos**: literales de [correo-recordatorio.md](contracts/correo-recordatorio.md), [pantalla-cancelar.md](contracts/pantalla-cancelar.md) y [proceso-recordatorios.md](contracts/proceso-recordatorios.md).
- **Ayudas de test**: las de `tests/ayudas/escenario.js` (`crearEscenario`, `citaDirecta`, `relojFijo`, `escuchar`, `detener`, `peticion`, `textoVisible`), ampliadas solo si hace falta.

---

## Fase 1: Preparación

**Propósito**: comprobar que la base tiene lo que el plan usa

- [X] T001 Comprobar que el modelo común de acceso de la 002 está en `master` (tabla `enlace_cancelacion`, `GET /e/:token`, respuesta uniforme, sesiones de alcance `cita`, `CITACLARA_DIRECCION` y generador único del token) y rebasar `003-recordatorios-cita` sobre `master`. Si no está, **detenerse**: ninguna tarea siguiente puede empezar (plan, «Requisitos previos»). Después, `npm test` y `npm run test:e2e` en verde antes de tocar nada
- [X] T002 Anotar al principio de este archivo, en una sección «Nombres de la 002», los nombres reales que exporta la 002 para: el generador único del token, la respuesta uniforme (función y código), el registro de rutas de paciente con su alcance, el contexto de esas rutas (`citaDelAlcance`), la plantilla `layoutPortal`, la lectura de `CITACLARA_DIRECCION` y el borrado de enlaces en `borrarClinica`. Si alguna pieza que usan estas tareas no se exporta, pedirla a la 002 en lugar de crearla aquí (constitución, «Flujo de trabajo»)
- [X] T003 Añadir el script `"recordatorios": "node src/recordatorios.js"` en package.json

---

## Fase 2: Base (requisitos que bloquean todas las historias)

**Propósito**: almacén, configuración compartida y semilla, que necesitan todas las historias

**⚠️ CRÍTICO**: ninguna historia puede empezar hasta terminar esta fase

### Tests de la base (primero, deben fallar)

- [X] T004 [P] Test de esquema en tests/integracion/esquema.test.js: `003/FR-020 la tabla recordatorio existe con cita_id como clave primaria`, que una segunda fila con el mismo `cita_id` se rechaza (RR1 en el almacén), que `modo` solo admite `'simulado'` o `'real'` (`CHECK`), que `cita_id` referencia `cita`, y que `PRAGMA user_version` es 4. Actualizar el test que comprobaba la versión 3 de la 002
- [X] T005 [P] Tests de configuración en tests/unit/configuracion.test.js: `003/FR-003 configuración compartida`: `CITACLARA_AHORA` válido y mal escrito, con el mensaje literal de [configuracion.md de la 001](../001-nucleo-agenda/contracts/configuracion.md); `CITACLARA_DIRECCION` válida, mal escrita (mensaje de la 002) y por defecto `http://localhost:<PORT>` con `PORT` 3000 si no hay valor; `CITACLARA_SMTP` presente o ausente (`smtpConfigurado`)
- [X] T006 [P] Test de semilla en tests/integracion/semilla-recordatorios.test.js: `003/CL Regenerar los datos de demostración`: con recordatorios y enlaces de cancelación creados, volver a cargar la semilla los borra junto con las citas, y un enlace anterior abierto por `GET /e/:token` da la respuesta uniforme

### Implementación de la base

- [X] T007 Añadir la tabla `recordatorio` en src/datos/esquema.sql: `cita_id INTEGER PRIMARY KEY REFERENCES cita(id)`, `enviado_en TEXT NOT NULL` (hora local `AAAA-MM-DDTHH:MM`), `direccion TEXT NOT NULL`, `modo TEXT NOT NULL CHECK (modo IN ('simulado', 'real'))`, con un comentario que cite RR1 y FR-020; y subir `VERSION_ESQUEMA` a 4 en src/datos/bd.js ([data-model.md](data-model.md))
- [X] T008 [P] Crear src/configuracion.js con `leerConfiguracion(entorno)`, que devuelve `{ momentoFijado, direccion, puerto, smtpConfigurado }` o lanza un error con el mensaje literal del ajuste mal escrito ([research.md §9](research.md#9-configuración-que-comparte-el-proceso-con-el-servidor-fr-003-hu3-e3)). Reutiliza `esMomentoValido` y la validación de dirección de la 002 (T002)
- [X] T009 Cambiar src/principal.js para leer los ajustes con `leerConfiguracion(process.env)` en lugar de leerlos por su cuenta, sin cambiar sus mensajes ni su comportamiento (depende de T008)
- [X] T010 En `borrarClinica` de src/semilla/carga.js, borrar los `recordatorio` de las citas de la clínica antes que las citas (`DELETE FROM recordatorio WHERE cita_id IN (SELECT id FROM cita WHERE clinica_id = ?)`), junto al borrado de enlaces de cancelación de la 002

**Punto de control**: T004 a T006 en verde y el resto de la suite sin cambios

---

## Fase 3: Historia de usuario 1 - Recibir un recordatorio de la cita (Prioridad: P1) 🎯 MVP

**Objetivo**: cada día, a las 08:00 locales y sin intervención, cada cita reservada del día siguiente de un paciente con correo recibe un único recordatorio con su enlace de cancelación

**Prueba independiente**: con los datos de demostración, ejecutar el proceso para un momento dado, comprobar que cada cita que toca tiene un recordatorio y repetirlo para comprobar que no aparece ninguno más

### Tests de la historia 1 (primero, deben fallar)

- [X] T011 [P] [US1] Tests de la ventana en tests/unit/recordatorio-ventana.test.js: `RR3 la ventana es el día natural siguiente` (desde `2026-11-02T08:00`, de `2026-11-03T00:00` incluido a `2026-11-04T00:00` excluido); `003/CL Días de cambio de hora` con ejecuciones el 27/03/2027, el 28/03/2027, el 30/10/2027 y el 31/10/2027 en `Europe/Madrid` y `Atlantic/Canary`; `003/CL Fines de semana y festivos` (ejecución en domingo, ventana del lunes); `003/CL Ejecución retrasada` (a las 08:00 y a las 23:59 del mismo día, misma ventana)
- [X] T012 [P] [US1] Tests del correo en tests/unit/recordatorio-correo.test.js, contra `componerRecordatorio` y el ejemplo literal de [correo-recordatorio.md](contracts/correo-recordatorio.md): `003/FR-007` (clínica, nombre, profesional, servicio, día de la semana, fecha, hora y enlace en su línea); `003/FR-008` (`dd/mm/aaaa`, 24 horas, línea de zona); `003/H1-E10` (clínica de `Atlantic/Canary`: «Horas en hora de Canarias.» y `Date` con `+0000` en invierno); `003/FR-009` (español, texto plano, `charset=UTF-8`, líneas CRLF); `003/FR-010` (el cuerpo dice que el hueco queda libre; asunto y cuerpo no contienen el teléfono ni el correo del paciente ni su enlace personal; `To` es solo la dirección); asunto y remitente con codificación RFC 2047 que, descodificados, dan el texto del contrato; sin `Message-ID`
- [X] T013 [P] [US1] Tests del proceso en tests/integracion/recordatorios.test.js, con `ejecutarRecordatorios` y un `enviar` en memoria que guarda los mensajes, con el reloj fijado:
  - `003/H1-E1 RR2` cita reservada de mañana con correo: un mensaje y un `recordatorio` con `enviado_en` igual al momento fijado, `direccion` de la ficha y `modo` `'simulado'`, y una fila de `enlace_cancelacion` cuyo `token_hash` es el SHA-256 del token del enlace del mensaje
  - `003/H1-E2 RR1 003/FR-002` una segunda ejecución el mismo día y otra al día siguiente no envían nada más
  - `003/H1-E4` citas de hoy y de pasado mañana: nada
  - `003/H1-E5 RR2` citas completadas, canceladas y no asistidas de mañana, insertadas con `citaDirecta`: nada
  - `003/H1-E6 RR2` paciente sin correo: nada, y el resumen cuenta 1 en `sinCorreo`
  - `003/H1-E7` dos citas del mismo paciente: dos mensajes, cada uno con su enlace
  - `003/H1-E9 RR5` cita recordada, cancelada por recepción y sustituida por otra de pasado mañana: la ejecución de mañana recuerda la nueva
  - `RR2 el correo es el de la ficha al enviar`: cambiado con `guardarCorreo` (FR-041 de la 001) antes de ejecutar, el mensaje va a la dirección nueva; quitado, la cita cuenta como sin correo
  - `003/CL Cita cancelada justo antes del envío`: cancelada entre la consulta de la ventana y la reserva, no sale (se provoca con un `enviar` que cancela la cita siguiente antes de devolver)
  - `003/CL Cita creada después de la ejecución`: una cita de mañana creada tras la ejecución de las 08:00 no se recuerda hasta que se lanza otra ejecución ese día
  - `003/CL Un día sin ejecución`: sin ejecución el día D, la ejecución de D+1 no recuerda las citas de D+1
  - `003/CL Correo compartido en una familia`: dos fichas con el mismo correo, dos mensajes con enlaces distintos
- [X] T014 [P] [US1] Tests de fallos y resumen en tests/integracion/recordatorios-fallos.test.js: `003/H1-E8 003/FR-005`, con un `enviar` que lanza en una cita concreta: las demás salen, esa cita no tiene `recordatorio` ni `enlace_cancelacion`, el resumen cuenta 1 en `fallidos`, y otra ejecución dentro de la ventana la envía; `003/CL Fallo a mitad de ejecución`: un `enviar` que lanza a partir de la tercera cita y una segunda ejecución sin fallos, sin repetir las dos primeras; `003/FR-006` línea literal del resumen de [proceso-recordatorios.md](contracts/proceso-recordatorios.md) en la salida y al final de `recordatorios.log` en una carpeta temporal, con la línea extra por cita fallida, que no contiene la dirección de correo
- [X] T015 [P] [US1] Test de 365 días en tests/integracion/recordatorios-365-dias.test.js: `003/SC-004 003/FR-004 RR3`, dos clínicas (`Europe/Madrid` y `Atlantic/Canary`), cada día del 02/11/2026 al 01/11/2027 con citas a las 09:00 y a las 19:45 del día siguiente, una ejecución con el momento fijado a las 08:00 de cada día y, al final, exactamente un recordatorio por cita
- [X] T016 [P] [US1] Test de concurrencia en tests/concurrencia/recordatorios.test.js con un trabajador tests/concurrencia/trabajador-recordatorios.js, con el mismo método de barrera que tests/concurrencia/cancelacion.test.js: `003/H1-E3 003/SC-003 RR1` 4 procesos, 1.000 rondas, cada ronda con 3 citas nuevas en la ventana, sobre el mismo archivo y la misma carpeta de salida; en cada ronda, un recordatorio y un fichero `.eml` por cita
- [X] T017 [P] [US1] Tests del programador en tests/unit/programador.test.js, con `relojReal` y `ejecutar` inyectados y el intervalo disparado a mano: `003/FR-001` a las 07:59 no ejecuta, a las 08:00 ejecuta una vez, a las 08:01 del mismo día no repite, al día siguiente vuelve a ejecutar, también los sábados y domingos; dos clínicas en `Europe/Madrid` y `Atlantic/Canary` se ejecutan con una hora real de diferencia; `003/CL Ejecución retrasada` arrancado a las 10:00, ejecuta en la comprobación inicial; con `momentoFijado` en el contexto, el disparo sigue al reloj real; `parar()` detiene el intervalo

### Implementación de la historia 1

- [X] T018 [P] [US1] Crear src/dominio/recordatorio.js con `ventana(hoy)` → `{ dia, desde, hasta }` usando `sumarDias` (RR3, [research.md §3](research.md#3-ventana-de-recordatorio-rr3-fr-004-sc-004)) y `componerRecordatorio({ clinica, paciente, cita, profesional, servicio, ahora, enlace })` → texto del `.eml` según [correo-recordatorio.md](contracts/correo-recordatorio.md): RFC 2047 en base64 para asunto y remitente, `Date` con el desfase de `Intl.DateTimeFormat` y `timeZoneName: 'longOffset'`, CRLF, y `fecha`, `hora`, `nombreDia` y `etiquetaZona` de src/dominio/formato.js
- [X] T019 [P] [US1] Crear src/datos/recordatorios.js con `citasDeLaVentana(bd, clinicaId, { desde, hasta })` (reservadas, `inicio >= desde AND inicio < hasta`, sin fila en `recordatorio`, con el nombre y el correo de la ficha, el profesional y el servicio, ordenadas por `inicio` y `id`), `reservarEnvio(bd, { citaId, desde, hasta, ahora, tokenHash })` y `anularEnvio(bd, citaId, tokenHash)`, según «Consultas» de [data-model.md](data-model.md). `reservarEnvio` vuelve a leer la cita y la ficha, comprueba RR2 y que no haya recordatorio, inserta `recordatorio` (`modo = 'simulado'`, `direccion` = correo de la ficha en ese momento) y `enlace_cancelacion`, y devuelve los datos del mensaje o `null`. Las dos escrituras, dentro de `transaccionInmediata`
- [X] T020 [US1] Crear src/servicios/salida-correo.js con `crearEscritorEml(carpeta = 'datos/salida-correo')`, que crea la carpeta si no existe y escribe cada mensaje en `recordatorio-<cita_id>-<8 hexadecimales al azar>.eml` con la opción `wx`, sin sobrescribir nunca ni abrir conexiones de red (FR-019, [research.md §5](research.md#5-modo-de-envío-fr-018-a-fr-020-hu3))
- [X] T021 [US1] Crear src/servicios/recordatorios.js con `ejecutarRecordatorios(contexto, { clinicas, direccion, enviar, smtpConfigurado, registro })` según [proceso-recordatorios.md](contracts/proceso-recordatorios.md): por clínica, calcula la ventana con `ahoraLocal`, recorre `citasDeLaVentana`, genera el token con el generador único de la 002 (T002), reserva, compone el enlace `<direccion>/e/<token>`, envía fuera de la transacción y, si `enviar` lanza, llama a `anularEnvio` y cuenta la cita como fallida sin detener las demás (FR-005). Devuelve `{ clinica, hoy, ventana, enviados, sinCorreo, fallidos }` por clínica y escribe las líneas del resumen en la salida y al final de `registro` (por defecto `datos/recordatorios.log`) (FR-006). Depende de T018 a T020
- [X] T022 [US1] Crear src/servicios/programador.js con `programarRecordatorios({ contexto, clinicas, relojReal, ejecutar, cadaMs = 60_000 })` → `{ parar }`: comprobación inicial y una cada `cadaMs`, con `ahoraEnZona(relojReal(), zona)`, ejecutando una vez por clínica y fecha local cuando son las 08:00 o más ([research.md §2](research.md#2-disparo-diario-fr-001-fr-002-casos-límite-de-ejecución))
- [X] T023 [US1] Crear src/recordatorios.js (FR-002): lee la configuración con `leerConfiguracion(process.env)` y termina con el mensaje si falla; abre `datos/citaclara.db` explicando `EsquemaAntiguo` igual que src/principal.js; ejecuta `ejecutarRecordatorios` para todas las clínicas con `crearEscritorEml()`; termina con código 1 si hay fallidos y 0 si no
- [X] T024 [US1] En src/principal.js, arrancar `programarRecordatorios` con el contexto del servidor, `relojReal: () => new Date()` y `ejecutar` = `ejecutarRecordatorios` de una clínica con `crearEscritorEml()` (FR-001). Los servidores de tests/ayudas/escenario.js y tests/e2e/servidor-e2e.js no lo arrancan

**Punto de control**: T011 a T017 en verde; `CITACLARA_AHORA=2026-11-02T08:00 npm run recordatorios` deja cuatro ficheros, y repetirlo no deja más

---

## Fase 4: Historia de usuario 2 - Cancelar la cita desde el correo (Prioridad: P1)

**Objetivo**: el paciente abre el enlace, ve la cita, confirma y la cita queda cancelada con origen «correo», sin clave de clínica

**Prueba independiente**: abrir el enlace de un recordatorio sin clave de clínica, cancelar y comprobar en la agenda que la cita está cancelada y que su tramo admite una reserva nueva

### Tests de la historia 2 (primero, deben fallar)

- [X] T025 [P] [US2] Tests de la pantalla en tests/integracion/rutas-cancelar.test.js, con recordatorios creados por `ejecutarRecordatorios` y un `enviar` en memoria, abriendo el enlace con `GET /e/:token`, siguiendo la redirección 303 a `/cancelar` y comparando con los literales de [pantalla-cancelar.md](contracts/pantalla-cancelar.md):
  - `003/H2-E1 003/FR-011 003/FR-012 003/FR-013` muestra clínica, profesional, servicio, día y hora, el aviso de que no se puede deshacer y el botón; no muestra el nombre, el teléfono ni el correo del paciente, ni otras citas, ni el precio; la cita sigue `reservada`
  - `003/H2-E2 RR4 003/FR-014 003/FR-016` `POST /cancelar`: «Cita cancelada», la cita queda `cancelada` con `origen_cancelacion = 'correo'` y `momento_cancelacion` igual al momento fijado
  - `003/H2-E4 003/CL Doble pulsación al confirmar` reabrir el enlace y un segundo `POST`: «Esta cita ya está cancelada», 200, sin botones, y el origen y el momento siguen siendo los primeros
  - `003/H2-E5 RR6` con el momento fijado en el inicio y después, para una cita reservada y otra cancelada: el enlace da la respuesta uniforme de la 002, idéntica a la de un token inventado
  - `003/CL Pantalla abierta hasta el inicio` `GET /cancelar` abierto antes del inicio y `POST` con el reloj ya en el inicio: respuesta uniforme y cita sin cambios
  - `003/H2-E6 RR4` cita de las 10:00 con el reloj a las 08:01: «Ya no se puede cancelar desde aquí», el límite de las 08:00 y el teléfono como enlace `tel:`; con una clínica sin teléfono, termina en «llama a la clínica.»; la cita no cambia
  - `003/CL Pantalla abierta mientras vence el plazo` `GET` a las 07:55 y `POST` a las 08:01: 409 con el mensaje de fuera de plazo; `003/CL Justo en el límite` `POST` a las 08:00: «Cita cancelada»
  - `003/H2-E7 RR6` enlace con un carácter cambiado o inventado: respuesta uniforme, sin datos
  - `003/H2-E8 003/FR-015` abrir el enlace y `GET /cancelar` varias veces sin `POST`: la cita sigue `reservada`
  - `003/H2-E10 RR6` tras anular el enlace personal de la ficha con la función de la 002 (RP7): el enlace de cancelación da la respuesta uniforme y la cita sigue `reservada`
  - `RR6 un enlace solo da acceso a su cita`: con la sesión de una cita, ninguna ruta de recepción ni `/portal` de alcance `ficha` se abre, y la clave de clínica no abre `/cancelar` (002/FR-005)
  - `003/CL Hueco cancelado y vuelto a ocupar`: cita antigua cancelada y otra nueva en el mismo tramo; el enlace antiguo muestra «ya está cancelada» y la nueva sigue `reservada`
  - `003/CL Paciente y recepción cancelan a la vez` y `003/CL Portal y correo cancelan a la vez`: cancelada antes por recepción o por el portal, el `POST` del correo da «ya está cancelada» y el origen sigue siendo el primero
  - `003/CL Paciente cancela mientras recepción marca otro estado`: completada o marcada como no asistida por recepción (con el reloj en el inicio), el enlace ya está caducado y da la respuesta uniforme; y con `cancelarCita` y `aplicarAccion` en la misma cita, solo una prospera (RN4 de la 001)
- [X] T026 [P] [US2] Test de la agenda en tests/integracion/rutas-cancelar.test.js: `003/H2-E3 003/SC-006` tras cancelar desde el correo, la siguiente carga de la agenda de recepción muestra la cita cancelada y su tramo libre, y `crearCita` en ese tramo se acepta
- [X] T027 [P] [US2] Test de concurrencia en tests/concurrencia/cancelar-correo.test.js con un trabajador tests/concurrencia/trabajador-cancelar-correo.js: `003/FR-024 RR4` 1.000 rondas con barrera; en cada ronda, un proceso hace `POST /cancelar` de una cita dentro de plazo y otros tres intentan reservar a la vez el mismo tramo y un tramo que se cruza; al final de cada ronda, ninguna pareja de citas `reservada` o `completada` del profesional se solapa, y como mucho una reserva prospera por tramo
- [X] T028 [P] [US2] Test de importaciones en tests/unit/recordatorios-escritura.test.js: `RR4 la 003 solo cancela con cancelarCita`: ningún archivo de src/servicios/recordatorios.js, src/web/rutas/cancelar.js ni src/web/vistas/cancelar.js importa `registrarCancelacion` ni escribe `UPDATE cita`
- [X] T029 [P] [US2] Tests de interfaz en tests/e2e/cancelar-correo.spec.js, en los proyectos `movil` y `portatil`, con `auditarPantalla` de tests/e2e/ayudas.js: `003/H2-E9 003/FR-017` las variantes de confirmación, cancelada, ya cancelada y fuera de plazo, sin desplazamiento horizontal a 360 píxeles, contraste de al menos 4,5:1 y controles de al menos 44 × 44 píxeles; el recorrido abrir enlace → confirmar → «Cita cancelada» sin JavaScript

### Implementación de la historia 2

- [X] T030 [P] [US2] Crear src/web/vistas/cancelar.js con las cuatro pantallas de [pantalla-cancelar.md](contracts/pantalla-cancelar.md) sobre la plantilla de paciente de la 002 (T002): confirmación con formulario `POST /cancelar` y botón «Sí, cancelar la cita», cancelada, ya cancelada y fuera de plazo con el enlace `tel:` del teléfono de la clínica. Fechas con `nombreDia` en minúscula, `fecha` y `hora`, y la línea de `etiquetaZona`. Todo dato, escapado con `html`/`seguro` de src/web/plantilla.js
- [X] T031 [US2] Crear src/web/rutas/cancelar.js con `GET /cancelar` y `POST /cancelar` como rutas de paciente de alcance `cita` (mecanismo de la 002, T002). Las dos comprueban primero `ahoraLocal(contexto, zona) < cita.inicio` y, si no, dan la respuesta uniforme de la 002. `GET` elige la pantalla según el estado y `dentroDePlazo`, con `limiteCancelacion`. `POST` llama a `cancelarCita(contexto, cita.id, 'correo')` y responde según el resultado: `cancelada_ahora` 200, `ya_cancelada` 200, `fuera_de_plazo` 409 con su `limite`, `no_cancelable` o `null` con la respuesta uniforme ([research.md §7](research.md#7-pantalla-de-cancelación-fr-011-a-fr-017-hu2)). Depende de T030
- [X] T032 [US2] Registrar las rutas de src/web/rutas/cancelar.js en src/web/servidor.js junto a las rutas de paciente de la 002, con `Referrer-Policy: no-referrer`, y comprobar que el recorrido de rutas de la 001 y la 002 (FR-001, FR-037 de la 001, 002/FR-005) sigue en verde con ellas
- [X] T033 [US2] Añadir a tests/e2e/servidor-e2e.js lo que necesita T029: recordatorios generados con `ejecutarRecordatorios` y un `enviar` que guarda los enlaces en un archivo temporal que leen los tests, sin cambiar el momento fijado ni las citas que usan los tests de la 001 y la 002
  - **Al implementar**: hecho en un servidor propio, tests/e2e/servidor-correo-e2e.js (puerto 3102, proyectos `correo-movil` y `correo-portatil`), con el mismo reloj que servidor-e2e.js, que no cambia. En el servidor compartido, cada cancelación desde el correo entraba en la lista de huecos liberados de la 002 (002/FR-019) y rompía tres tests de recepción de la 001. Es el mismo arreglo que usa la 002 con servidor-portal-e2e.js

**Punto de control**: T025 a T029 en verde; el paso 4 de [quickstart.md](quickstart.md) funciona

---

## Fase 5: Historia de usuario 3 - Comprobar los recordatorios sin servidor de correo (Prioridad: P1)

**Objetivo**: sin servidor de correo, o con uno configurado mientras no se cumpla FR-039 de la 001, cada recordatorio queda como un `.eml` que se abre con cualquier programa de correo y cuyo enlace funciona

**Prueba independiente**: sin servidor de correo configurado, ejecutar el proceso con los datos de demostración y abrir los ficheros generados

### Tests de la historia 3 (primero, deben fallar)

- [ ] T034 [P] [US3] Tests del modo simulado en tests/integracion/salida-correo.test.js, con `crearEscritorEml` en una carpeta temporal: `003/H3-E1 003/FR-019` un fichero `.eml` por recordatorio, con un fichero previo del mismo número de cita que no se sobrescribe; `003/H3-E2 003/FR-020` el recordatorio simulado cuenta como enviado y no se repite; `003/H3-E4 003/FR-018` con `smtpConfigurado: true`, los mismos ficheros, el aviso literal de [proceso-recordatorios.md](contracts/proceso-recordatorios.md) una sola vez y ningún módulo de red cargado (se comprueba que src/servicios no importa `node:net`, `node:tls` ni `node:dns`)
- [ ] T035 [P] [US3] Test de contenido en tests/integracion/salida-correo.test.js: `003/H3-E3` el fichero se lee con un analizador mínimo de cabeceras y cuerpo: `To`, asunto descodificado, datos de la cita; y el enlace, abierto contra un servidor de pruebas creado con el mismo `momentoFijado` que el proceso, lleva a la pantalla de confirmación de esa cita
- [ ] T036 [P] [US3] Test de determinismo en tests/integracion/salida-correo.test.js: `003/H3-E5` dos bases cargadas con la semilla por defecto y procesadas con el mismo momento dan los mismos destinatarios y el mismo contenido, salvo el token del enlace (se compara tras sustituir `/e/<32 hexadecimales>` por un marcador)
- [ ] T037 [P] [US3] Test de la semilla en tests/integracion/recordatorios-semilla.test.js: `003/FR-022 003/FR-021 003/SC-002` con la semilla por defecto y `2026-11-02T08:00`, el resumen es «4 enviados, 1 sin correo, 0 fallidos» para el martes 03/11/2026, con los destinatarios de Paula Gómez, Javier Navarro, Luis Delgado y Óscar Domínguez; la semilla tiene 57 reservas futuras, 43 de fichas con correo y 14 sin él; las cifras y resúmenes de FR-030 de la 001 no cambian tras ejecutar el proceso; y, ejecutando a las 08:00 de cada día del 01/11/2026 al 12/11/2026, cada una de las 43 reservas futuras con correo tiene exactamente un recordatorio y ninguna de las 14 sin correo tiene uno
- [ ] T038 [P] [US3] Test del proceso de línea de órdenes en tests/integracion/comando-recordatorios.test.js: `003/FR-002 003/FR-003` lanzar `node src/recordatorios.js` como proceso hijo en un directorio temporal con la semilla cargada y `CITACLARA_AHORA=2026-11-02T08:00`: código 0, la línea de resumen en la salida y en `datos/recordatorios.log`, cuatro ficheros; con `CITACLARA_AHORA` mal escrito, no arranca y da el mensaje literal; con `CITACLARA_SMTP`, el aviso

### Implementación de la historia 3

- [ ] T039 [US3] En src/servicios/recordatorios.js, escribir el aviso de `CITACLARA_SMTP` cuando `smtpConfigurado` es `true`, una sola vez tras los resúmenes, sin cambiar el envío; y en src/recordatorios.js, pasar `smtpConfigurado` desde la configuración (FR-018)
- [ ] T040 [US3] Corregir lo que fallen T034 a T038 en src/servicios/salida-correo.js, src/dominio/recordatorio.js y src/recordatorios.js, sin cambiar los textos de los contratos

**Punto de control**: T034 a T038 en verde; los pasos 1, 2, 3 y 6 de [quickstart.md](quickstart.md) funcionan

---

## Fase 6: Historia de usuario 4 - Saber que el paciente ha cancelado (Prioridad: P2)

**Objetivo**: recepción distingue en la agenda las citas canceladas desde el correo de las que canceló ella

**Prueba independiente**: cancelar una cita desde el correo y otra desde recepción, y comparar cómo se muestran

La etiqueta ya la da `etiquetaCita` de la 001 (FR-027), y la lista de huecos, la 002 (002/FR-019). Esta historia solo añade tests.

### Tests de la historia 4

- [ ] T041 [P] [US4] Tests de la agenda en tests/integracion/agenda-cancelada-correo.test.js: `003/H4-E1 003/FR-016` la cita cancelada desde el correo con el reloj fijado en `2026-11-02T08:00` se muestra como «Cancelada por el paciente el 02/11/2026 a las 08:00», igual que una cancelada desde el portal; `003/H4-E2` la cancelada por recepción, como «Cancelada»; y el tramo cancelado desde el correo aparece en la lista de huecos liberados de la 002
- [ ] T042 [US4] Si T041 falla, corregir solo el código de la 003 que lo cause. Si la causa está en `etiquetaCita` o en la lista de huecos, pedir el cambio a la 001 o a la 002

**Punto de control**: todas las historias funcionan

---

## Fase 7: Cierre

**Propósito**: trazabilidad, entrega y validación de extremo a extremo

- [ ] T043 [P] Crear tests/unit/trazabilidad-003.test.js ([research.md §10](research.md#10-trazabilidad-fr-023-sc-007)): `003/SC-007 la spec tiene las reglas, escenarios y criterios esperados` (RR1 a RR6; 27 escenarios: 10, 10, 5 y 2 por historia; SC-001 a SC-007) y `003/SC-007 cada regla, escenario y criterio aparece en un nombre de test`, contando solo los nombres que empiezan por un identificador de la 003 (`RR\d` o `003/…`) y dejando fuera SC-001 y SC-005, medidos a mano. Un `003/H1-E1` no debe contar como `H1-E1` de la 001, ni al revés
- [ ] T044 [P] Crear specs/003-recordatorios-cita/checklists/entrega.md con el formato de la de la 001: el protocolo de SC-005 (al menos 10 personas sin ayuda, cancelación desde el correo en menos de 1 minuto, también en móvil, umbral 9 de cada 10) y el de SC-001 (tasa de no asistencia con RA3 y ocupación con RA4 de la 004 durante 3 meses, frente a las dos cifras de partida que aporta la clínica), sin rellenar; y las puertas de calidad de la constitución para esta feature
- [ ] T045 [P] Añadir `CITACLARA_SMTP` y el uso del proceso de recordatorios a specs/001-nucleo-agenda/contracts/configuracion.md, en el apartado que ya cita a la 003, sin cambiar lo demás
- [ ] T046 Ejecutar `npm test` y `npm run test:e2e` y dejarlos en verde, incluidas las trazabilidades de la 001, la 002 y la 003. Ningún test se desactiva ni se relaja (principio VI)
- [ ] T047 Recorrer [quickstart.md](quickstart.md) de principio a fin y corregir en el producto, o en la guía si estaba mal, cualquier diferencia

---

## Dependencias y orden de ejecución

### Dependencias entre fases

- **Preparación (fase 1)**: T001 bloquea todo. Sin el modelo común de la 002 en `master`, no se empieza.
- **Base (fase 2)**: depende de la fase 1 y bloquea todas las historias.
- **Historia 1 (fase 3)**: depende de la base.
- **Historia 2 (fase 4)**: depende de la historia 1, porque sus tests generan los enlaces con `ejecutarRecordatorios`.
- **Historia 3 (fase 5)**: depende de la historia 1 (proceso y escritor) y, para T035, de la historia 2 (pantalla).
- **Historia 4 (fase 6)**: depende de la historia 2.
- **Cierre (fase 7)**: depende de todas.

### Dentro de cada historia

- Los tests se escriben primero y deben fallar.
- Dominio y datos antes que servicios; servicios antes que rutas y procesos.
- T021 depende de T018 a T020; T031 de T030; T032 de T031.

### Condición para integrar

Todas las tareas hechas, la suite en verde (T046) y la lista de entrega revisada (T044), salvo las mediciones con personas, que quedan anotadas como pendientes.

### Oportunidades de paralelismo

- Fase 2: T004 a T006 entre sí, y T007 con T008.
- Historia 1: T011 a T017 entre sí, y T018 con T019.
- Historia 2: T025 a T029 entre sí, y T030 con cualquiera de esos tests.
- Historia 3: T034 a T038 entre sí.
- Cierre: T043 a T045 entre sí.

---

## Ejemplo de paralelismo: historia 1

```text
# Tests de la historia 1, a la vez:
Tarea: "T011 Tests de la ventana en tests/unit/recordatorio-ventana.test.js"
Tarea: "T012 Tests del correo en tests/unit/recordatorio-correo.test.js"
Tarea: "T013 Tests del proceso en tests/integracion/recordatorios.test.js"
Tarea: "T016 Concurrencia en tests/concurrencia/recordatorios.test.js"
Tarea: "T017 Programador en tests/unit/programador.test.js"

# Después, dominio y datos a la vez:
Tarea: "T018 Ventana y correo en src/dominio/recordatorio.js"
Tarea: "T019 Consultas en src/datos/recordatorios.js"
```

## Ejemplo de paralelismo: historia 2

```text
Tarea: "T025 Pantalla en tests/integracion/rutas-cancelar.test.js"
Tarea: "T027 Solape en tests/concurrencia/cancelar-correo.test.js"
Tarea: "T029 Interfaz en tests/e2e/cancelar-correo.spec.js"
Tarea: "T030 Vista en src/web/vistas/cancelar.js"
```

---

## Estrategia de implementación

### Primero el MVP (historia 1)

1. Fases 1 y 2.
2. Fase 3: el proceso recuerda cada cita una sola vez y deja los `.eml`.
3. **Parar y validar**: pasos 1 a 3 de [quickstart.md](quickstart.md). El correo ya avisa, aunque el enlace aún no lleve a ninguna pantalla.

### Entrega incremental

1. Historia 1: recordatorios sin duplicados (MVP).
2. Historia 2: cancelar desde el correo, que es lo que convierte una no asistencia en un hueco.
3. Historia 3: comprobación del modo simulado, del determinismo y de las cifras de la semilla.
4. Historia 4: comprobación de cómo lo ve recepción.

Cada historia deja la suite en verde antes de seguir.

---

## Notas

- [P] = archivos distintos y sin dependencias pendientes.
- Un commit por tarea o grupo lógico, citando los identificadores de las tareas.
- Si una tarea necesita cambiar la spec, el contrato de la 002 o código de la 001 fuera de lo previsto en el plan, se para y se pide al propietario (constitución, «Flujo de trabajo»).
