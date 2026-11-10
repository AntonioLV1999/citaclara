---

description: "Lista de tareas de implementación del núcleo de agenda"
---

# Tareas: Núcleo de agenda

**Entrada**: documentos de diseño de `specs/001-nucleo-agenda/`. Las fases 1 a 8 (T001 a T073) son de la versión aprobada el 06/11/2026, ya implementada. Las fases 9 a 14 (T074 a T124), del 11/11/2026, implementan en una sola pasada los **dos cambios del 10/11/2026**, según el plan revisado.

**Requisitos previos**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md)

**Tests**: obligatorios (constitución, principios III y VI; FR-035). Se escriben primero y deben fallar antes de implementar.

**Organización**: las tareas se agrupan por historia de usuario, para implementar y probar cada una por separado.

## Formato: `[ID] [P?] [Historia] Descripción`

- **[P]**: se puede hacer en paralelo (archivos distintos, sin dependencias pendientes)
- **[US1]…[US6]**: historia de usuario de la spec (US1 es la «Historia de usuario 1»)

## Convenciones para todas las tareas

- **Código**: JavaScript con módulos ES sobre Node 26, sin dependencias de producción. Vocabulario del dominio en español.
- **Nombres de test**: cada test empieza por lo que comprueba: `RN1`, `FR-025`, `SC-001`, o `H1-E6` para el escenario de aceptación 6 de la historia 1. Los casos límite usan `CL`, seguido de su nombre. T064 comprueba esta trazabilidad.
- **Reloj**: los servicios y el servidor reciben `ahora()`, que devuelve un `Date`. Nada fuera de `src/principal.js` lee el reloj directamente.
- **Clínica**: toda consulta filtra por la clínica de la sesión (FR-004).
- **Textos**: los mensajes salen literalmente de [contracts/interfaz-web.md](contracts/interfaz-web.md).

---

## Fase 1: Preparación

**Propósito**: inicializar el proyecto

- [X] T001 Crear `package.json` con `"type": "module"`, `"engines": { "node": ">=26" }`, `@playwright/test` como única dependencia de desarrollo, y los scripts `start` (`node src/principal.js`), `semilla` (`node src/semilla/comando.js`), `test` (`node --test "tests/{unit,integracion,concurrencia}/**/*.test.js"`) y `test:e2e` (`playwright test`) en package.json
- [X] T002 [P] Crear .gitignore con `node_modules/`, `datos/`, `test-results/` y `playwright-report/`
- [X] T003 [P] Crear playwright.config.js con Chromium, dos proyectos (`movil`, 360 × 740; `portatil`, 1366 × 768), `testDir: tests/e2e`, y `webServer` que arranca `node tests/e2e/servidor-e2e.js`

---

## Fase 2: Base común (bloquea todas las historias)

**Propósito**: almacén con sus garantías, dominio puro, servidor con control de sesión y utilidades de test

**⚠️ CRÍTICO**: ninguna historia puede empezar hasta terminar esta fase

### Tests de la base (primero, deben fallar)

- [X] T004 [P] Escribir tests de `ahoraEnZona(date, zona)`, `sumarMinutos(texto, min)`, `diaDeSemana(texto)` y `esDiaLaborable(texto)` para `Europe/Madrid` y `Atlantic/Canary`, incluido el paso de mes y año, en tests/unit/tiempo.test.js
- [X] T005 [P] Escribir tests FR-024 y FR-026 de formato: `05/11/2026`, `09:05`, `40,00 €`, `1.234,56 €`, `0,05 €`, y etiquetas de FR-027, en tests/unit/formato.test.js
- [X] T006 [P] Escribir tests FR-016 y FR-018 de huecos: día vacío, citas contiguas, citas que tocan apertura o cierre, canceladas y no asistidas que no ocupan, día de hoy con tramo pasado no reservable y día pasado sin nada reservable, en tests/unit/huecos.test.js
- [X] T007 [P] Crear utilidades de test en tests/ayudas/escenario.js: `crearEscenario()` con base temporal y dos clínicas (cada una con profesionales de fisioterapia y nutrición, los 4 servicios y pacientes), `relojFijo(iso)`, `sesionDePrueba(bd, clinicaId)` que devuelve la cookie, y `peticion(servidor, opciones)`
- [X] T008 Escribir tests del almacén con escritura directa, saltándose los servicios, en tests/integracion/esquema.test.js: RN1 (solape exacto, parcial, contenido y contiguo aceptado; ignora canceladas y no asistidas; vigila también una inserción `completada`), RN3 (`fin` incorrecto abortado), RN4 (transiciones inválidas, desde estado definitivo, e inmutabilidad de profesional, servicio, paciente, inicio y fin), RN7 (especialidad distinta abortada), misma clínica (referencias cruzadas abortadas) y FR-011 (`inicio` con minutos fuera de 00, 15, 30 o 45 rechazado) (depende de T007)
- [X] T009 Escribir tests del servidor en tests/integracion/servidor.test.js: FR-001 con una ruta de prueba protegida (GET redirige a `/acceso`, POST da 401 sin efecto), rechazo de rutas de estáticos fuera de su carpeta, página 500 en español sin detalles internos, y escape de HTML en `src/web/plantilla.js` (depende de T007)

### Implementación de la base

- [X] T010 [P] Implementar `ahoraEnZona`, `sumarMinutos`, `diaDeSemana` y `esDiaLaborable` sobre texto `AAAA-MM-DDTHH:MM`, usando `Intl` solo en `ahoraEnZona`, en src/dominio/tiempo.js
- [X] T011 [P] Implementar `fecha`, `hora`, `euros(centimos)` y `etiquetaEstado` en src/dominio/formato.js
- [X] T012 Implementar `calcularHuecos({ dia, citas, ahora })`, con horario 09:00–20:00 y resta de tramos de citas `reservada` y `completada`, devolviendo tramos `[inicio, fin)` con su indicador `reservable`, en src/dominio/huecos.js (depende de T010)
- [X] T013 [P] Crear src/datos/esquema.sql con las tablas de [data-model.md](data-model.md). Restricciones literales: `zona_horaria` «`Europe/Madrid` o `Atlantic/Canary`»; `duracion_min` «Mayor que 0 y múltiplo de 15»; `precio_centimos` «Mayor o igual que 0»; `nombre` del paciente «Obligatorio, no vacío tras recortar espacios»; `telefono` «Obligatorio»; `email` «Opcional»; `inicio` «minutos en 00, 15, 30 o 45»; `estado` «`reservada`, `completada`, `cancelada` o `no_asistida`». Índice `(profesional_id, inicio)`. Disparadores de la tabla «Dónde se hace cumplir cada regla»: RN1 con `RAISE(ABORT, 'SOLAPE')`, RN3, RN4 con inmutabilidad, RN7 y misma clínica
- [X] T014 Implementar `abrirBd(ruta)` con WAL, `foreign_keys = ON`, espera de bloqueo de 5.000 ms y aplicación del esquema, y `transaccionInmediata(bd, fn)` con `BEGIN IMMEDIATE`, `COMMIT` y `ROLLBACK`, en src/datos/bd.js (depende de T013)
- [X] T015 [P] Implementar consultas de clínica, profesionales y servicios, incluidos los servicios de una especialidad, en src/datos/catalogo.js (depende de T014)
- [X] T016 [P] Implementar crear, buscar por hash y borrar sesión en src/datos/sesiones.js (depende de T014)
- [X] T017 Implementar `hashClave` y `comprobarClave` con `scrypt` y sal, comparando en tiempo constante con cada clínica, y `abrirSesion`, `clinicaDeSesion` y `cerrarSesion` con token aleatorio guardado como SHA-256, en src/servicios/acceso.js (depende de T015, T016)
- [X] T018 [P] Implementar la plantilla `html` con escape automático, salvo contenido marcado como seguro, y el `layout` común en español con cabecera, botón «Salir» y `lang="es-ES"`, en src/web/plantilla.js
- [X] T019 [P] Crear src/web/estaticos/estilos.css: diseño limpio desde 360 píxeles, contraste de al menos 4,5:1, controles de al menos 44 × 44 píxeles, y estilos de estado que no dependan solo del color (FR-017, FR-028)
- [X] T020 Implementar `crearServidor({ bd, ahora })` con `node:http`: enrutado por método y patrón, lectura de formularios, cookies (`HttpOnly`, `SameSite=Strict`, sin `Max-Age`), estáticos, `requerirSesion` aplicado por defecto a toda ruta salvo `/acceso` y estáticos, y página 500 en español, en src/web/servidor.js (depende de T017, T018)
- [X] T021 Implementar el arranque, con `PORT` (3000 por defecto), base en `datos/citaclara.db`, creación de la carpeta y `ahora = () => new Date()`, en src/principal.js (depende de T020)

**Punto de control**: T004 a T009 en verde. Las historias pueden empezar.

---

## Fase 3: Historia de usuario 1 - Reservar una cita sin solapes (Prioridad: P1) 🎯 MVP

**Objetivo**: registrar citas con garantía de no solape, incluida la ficha mínima de un paciente nuevo

**Prueba independiente**: crear una cita en un hueco libre e intentar crear otras que la solapen, de una en una y a la vez

### Tests de la historia 1 (primero, deben fallar)

- [X] T022 [P] [US1] Escribir tests de `validarAlta`: RN2 (hora pasada rechazada, mismo minuto aceptado), RN3, FR-011, FR-012 (sábado, domingo, antes de las 09:00, fin después de las 20:00, fin exacto a las 20:00 aceptado) y datos del paciente («al menos 9 dígitos, admite `+` y espacios»; correo opcional «con forma de correo»), en tests/unit/reglas-alta.test.js
- [X] T023 [P] [US1] Escribir tests del servicio de alta: H1-E1 a H1-E11, CL «servicio no cabe en el hueco», CL «mismo paciente, dos profesionales», CL «datos de otra clínica», y RN1 con el mensaje que nombra la cita que lo impide, en tests/integracion/alta-cita.test.js
- [X] T024 [P] [US1] Escribir tests de rutas según [contracts/interfaz-web.md](contracts/interfaz-web.md): `GET /citas/nueva` con y sin datos rellenados (FR-006), solo servicios de la especialidad (FR-008), resumen de duración, precio y fin (FR-009), `POST /citas` con 303, 409 y 422 y sus mensajes literales, conservación de lo escrito y huecos actuales tras el rechazo (FR-019), CL «doble pulsación», `GET /pacientes/buscar` sin distinguir acentos ni mayúsculas (FR-007) y escape del nombre de paciente, en tests/integracion/rutas-alta.test.js
- [X] T025 [P] [US1] Escribir el test SC-001 de concurrencia con 4 procesos hijo por `fork` sobre un archivo compartido, en tests/concurrencia/solape.test.js y tests/concurrencia/trabajador.js. **Barrera en cada ronda**: el padre envía a todos los procesos un instante común unos milisegundos por delante, cada uno espera activamente hasta ese instante e intenta su alta, y el padre recoge todas las respuestas antes de la siguiente ronda. 1.000 rondas, alternando hueco exacto y cruce parcial. Comprobar en cada ronda exactamente un alta y los demás rechazos por `SOLAPE`, y al final cero solapes. **Comprobar también que ganan al menos 2 procesos distintos**, porque si siempre gana el mismo la prueba no demuestra simultaneidad
- [X] T026 [P] [US1] Escribir el test RN1 por HTTP con peticiones `POST /citas` lanzadas a la vez sobre el mismo servidor (100 rondas: exactamente un 303 y el resto 409), incluido un caso con paciente nuevo que no deja ficha, en tests/concurrencia/solape-http.test.js

### Implementación de la historia 1

- [X] T027 [P] [US1] Implementar `validarAlta` y la validación de paciente, con horario lunes a viernes de 09:00 a 20:00, en src/dominio/reglas.js
- [X] T028 [P] [US1] Implementar `crearPaciente` y `buscarPacientes`, filtrando en Node con normalización de acentos y mayúsculas sobre nombre y teléfono, en src/datos/pacientes.js
- [X] T029 [P] [US1] Implementar `insertarCita`, `citasDelDia` y `citaQueSolapa` en src/datos/citas.js
- [X] T030 [US1] Implementar `crearCita` en una sola `transaccionInmediata`: validar, crear ficha si es nueva, insertar y traducir el aborto `SOLAPE` al resultado con la cita que lo impide, sin dejar ficha si se rechaza (FR-010, FR-013), en src/servicios/alta-cita.js (depende de T027, T028, T029)
- [X] T031 [P] [US1] Implementar la vista del formulario con selección de profesional, servicio, paciente existente o nuevo, día y hora, mensaje de error, huecos actuales y datos conservados, en src/web/vistas/alta.js
- [X] T032 [P] [US1] Implementar la búsqueda de paciente y el resumen de duración, precio y fin como mejora del formulario, en src/web/estaticos/alta.js
- [X] T033 [US1] Implementar `GET /citas/nueva` y `POST /citas` en src/web/rutas/citas.js (depende de T030, T031)
- [X] T034 [P] [US1] Implementar `GET /pacientes/buscar`, que devuelve un fragmento HTML, en src/web/rutas/pacientes.js (depende de T028)

**Punto de control**: T022 a T026 en verde. RN1 y RN2 quedan garantizadas.

---

## Fase 4: Historia de usuario 2 - Ver la agenda del día de un profesional (Prioridad: P1)

**Objetivo**: ver de un vistazo citas y huecos por profesional y día

**Prueba independiente**: abrir la agenda de cada profesional y comprobar que coincide con las citas del día

### Tests de la historia 2 (primero, deben fallar)

- [X] T035 [P] [US2] Escribir tests de `GET /agenda`: H2-E1 a H2-E4, FR-014, FR-015, FR-017 (estado con texto), FR-023 («Horas en hora peninsular» y «Horas en hora de Canarias»), CL «hueco liberado y vuelto a ocupar» y CL «reloj del dispositivo», y `GET /` redirigiendo a `/agenda`, en tests/integracion/rutas-agenda.test.js

### Implementación de la historia 2

- [X] T036 [P] [US2] Implementar la vista de agenda: selector de profesional, navegación de días, citas y huecos en orden horario, citas que no ocupan diferenciadas, y enlace a `/citas/nueva` solo en tramos reservables, en src/web/vistas/agenda.js
- [X] T037 [US2] Implementar `GET /` y `GET /agenda`, con hoy según la zona de la clínica y primer profesional por defecto, usando `calcularHuecos`, en src/web/rutas/agenda.js (depende de T036)
- [X] T038 [US2] Añadir a src/web/estaticos/estilos.css los estilos propios de la agenda, sin desplazamiento horizontal desde 360 píxeles

**Punto de control**: T035 en verde. H2-E5, a 360 píxeles, se comprueba en T059.

---

## Fase 5: Historia de usuario 3 - Registrar qué pasó con la cita (Prioridad: P2)

**Objetivo**: marcar citas como completadas, canceladas o no asistidas

**Prueba independiente**: aplicar cada acción sobre citas reservadas y comprobar estado, rechazos y efecto en los huecos

### Tests de la historia 3 (primero, deben fallar)

- [X] T039 [P] [US3] Escribir tests de `accionesPermitidas`: RN4, RN5 y RN6, en tests/unit/estados.test.js
- [X] T040 [P] [US3] Escribir tests del servicio: H3-E1 a H3-E5, FR-022 (ningún estado cambia sin acción), CL «cita reservada ya pasada sin cerrar», CL «cancelación registrada tarde» y CL «dos acciones de estado a la vez», en tests/integracion/cambio-estado.test.js
- [X] T041 [P] [US3] Escribir tests de rutas: H3-E6 y FR-021 (la página de confirmación avisa de que no se puede deshacer, y `GET` no cambia nada), `POST /citas/:id/estado` con 303 y 409 y mensajes literales, 404 para citas de otra clínica, en tests/integracion/rutas-estado.test.js

### Implementación de la historia 3

- [X] T042 [P] [US3] Implementar `accionesPermitidas(cita, ahora)` y la correspondencia entre acción y estado, en src/dominio/estados.js
- [X] T043 [US3] Añadir `citaPorId` y `cambiarEstado`, limitado a citas `reservada`, a src/datos/citas.js
- [X] T044 [US3] Implementar `aplicarAccion` en `transaccionInmediata` en src/servicios/cambio-estado.js (depende de T042, T043)
- [X] T045 [P] [US3] Implementar la vista de confirmación en src/web/vistas/confirmar.js
- [X] T046 [US3] Implementar `GET /citas/:id/confirmar` y `POST /citas/:id/estado` en src/web/rutas/estado.js (depende de T044, T045)
- [X] T047 [US3] Mostrar en src/web/vistas/agenda.js solo las acciones que devuelve `accionesPermitidas`, enlazando a la confirmación (depende de T042)

**Punto de control**: T039 a T041 en verde.

---

## Fase 6: Historia de usuario 4 - Entrar con la clave de la clínica (Prioridad: P2)

**Objetivo**: pantallas de entrada y salida sobre el control de sesión de la base

**Prueba independiente**: intentar ver y modificar datos sin clave, con clave incorrecta y con la correcta

### Tests de la historia 4 (primero, deben fallar)

- [X] T048 [P] [US4] Escribir tests: H4-E1 a H4-E4; FR-001 recorriendo **todas** las rutas registradas sin sesión; FR-002 (la clave no aparece en ninguna respuesta y no se guarda en claro); FR-003; FR-004 y CL «datos de otra clínica» (una sesión no ve ni toca datos de otra clínica por identificador), en tests/integracion/rutas-acceso.test.js

### Implementación de la historia 4

- [X] T049 [P] [US4] Implementar la vista de acceso en src/web/vistas/acceso.js
- [X] T050 [US4] Implementar `GET /acceso`, `POST /acceso` y `POST /salir` en src/web/rutas/acceso.js (depende de T049)

**Punto de control**: T048 en verde. Recepción ya puede entrar en el navegador.

---

## Fase 7: Historia de usuario 5 - Disponer de datos de demostración reproducibles (Prioridad: P2)

**Objetivo**: semilla determinista de Clínica Eleva según [contracts/semilla.md](contracts/semilla.md)

**Prueba independiente**: generar los datos dos veces y comparar el resultado

### Tests de la historia 5 (primero, deben fallar)

- [X] T051 [P] [US5] Escribir tests del generador: H5-E2, H5-E3, FR-029 (clínica, 3 profesionales, 40 pacientes, 4 servicios con sus duraciones y precios exactos), FR-030, FR-031 (solo `reservada`, y huecos libres cada día laborable), FR-032 y SC-005 (dos llamadas idénticas; cambiar de lunes mantiene el resumen sin fechas; sin acceso al reloj ni a `Math.random`), FR-033 (como mucho una primera visita completada por paciente y especialidad), FR-034 (correos en `example.com`, teléfonos en rango no asignado), SC-006, en tests/unit/semilla-generador.test.js
- [X] T052 [P] [US5] Escribir tests de carga: H5-E1 (repetir no duplica), FR-033 (los disparadores aceptan todos los registros), clave `eleva-demo` válida, `--lunes` que no es lunes falla sin escribir, y un fallo a mitad deja los datos anteriores intactos, en tests/integracion/semilla-carga.test.js

### Implementación de la historia 5

- [X] T053 [P] [US5] Implementar mulberry32 con `entero`, `elegir` y `barajar` en src/semilla/azar.js
- [X] T054 [P] [US5] Definir la semilla numérica, profesionales, servicios y listas de nombres ficticios en español en src/semilla/datos-base.js
- [X] T055 [US5] Implementar el generador puro `generar({ semilla, lunes })` con las reglas de [data-model.md](data-model.md): citas como semana relativa, día y minuto, sin solapes; «Entre 3 y 5 citas por profesional y día en la historia»; menos en las futuras; recuentos exactos `redondear(0,10 × N)` y `redondear(0,08 × N)`; fechas calculadas solo al final; sal de la clave derivada de la semilla, en src/semilla/generador.js (depende de T053, T054)
- [X] T056 [US5] Implementar `cargar(bd, datos)`, que sustituye Clínica Eleva en una transacción, y `resumen(datos)` con los dos SHA-256 en orden canónico, en src/semilla/carga.js (depende de T055)
- [X] T057 [US5] Implementar el comando con `--lunes` (por defecto `2026-11-02`), validación del lunes y la salida del contrato, en src/semilla/comando.js (depende de T056)
- [X] T058 [US5] Ejecutar `npm run semilla` y anotar en FR-030 de specs/001-nucleo-agenda/spec.md las cifras exactas y los dos resúmenes (principio V) (depende de T057)

**Punto de control**: T051 y T052 en verde. La demo completa ya funciona.

---

## Fase 8: Cierre y aspectos transversales

**Propósito**: comprobaciones que necesitan todas las historias

- [X] T059 [P] Crear tests/e2e/servidor-e2e.js (base temporal con la semilla por defecto y reloj fijado en un miércoles de las semanas futuras, a las 10:00) y tests/e2e/accesibilidad.spec.js con FR-028, H2-E5 y SC-007 en los dos proyectos, en todas las pantallas: sin desbordamiento horizontal, controles de al menos 44 × 44 píxeles y contraste calculado de al menos 4,5:1 en texto normal
- [X] T060 Crear tests/e2e/flujo-recepcion.spec.js con los escenarios 1 a 8 de [quickstart.md](quickstart.md), incluido el rechazo con dos pestañas (depende de T059 para el servidor)
- [X] T061 [P] Escribir tests FR-025 y SC-009 en tests/integracion/hora-local.test.js: citas del 23/10/2026 y del 26/10/2026 a las 10:00 conservan la hora; reloj del servidor en Madrid y en Canarias; el 25/10/2026, el 28/03/2027 y el 31/10/2027 se rechazan con mensaje claro, en las dos zonas; `TZ` del proceso cambiada no altera lo mostrado
- [X] T062 [P] Escribir el test SC-004 sobre la semilla completa: `GET /agenda` en menos de 1 segundo, en tests/integracion/rendimiento.test.js
- [X] T063 [P] Escribir test FR-027: recorrer las pantallas y mensajes del contrato comprobando que no aparecen `no_asistida`, `reservada` sin etiquetar, `SOLAPE`, `SQLITE` ni trazas, en tests/integracion/textos.test.js
- [X] T064 Escribir el test SC-008 en tests/unit/trazabilidad.test.js: leer spec.md, extraer RN1 a RN7, cada escenario (`H{n}-E{m}`) y cada SC, y fallar si alguno no aparece en un nombre de test de `tests/`, salvo SC-002 y SC-003, que se miden a mano
- [X] T065 Crear specs/001-nucleo-agenda/checklists/entrega.md con el protocolo de SC-002 y SC-003 (tareas, cronómetro, número de personas y umbrales) y las puertas de calidad de la constitución. **Hacer las sesiones con personas queda fuera del alcance de un agente: la lista se entrega sin rellenar esos resultados.**
- [X] T066 Ejecutar `npm test`, `npm run test:e2e` y la verificación de semilla de [quickstart.md](quickstart.md), y corregir lo que falle sin relajar ningún test (principio VI)

- [X] T067 Sustituir `<input type="date">` por campos de texto `dd/mm/aaaa` con `leerDia` y `fechaEscrita`, en src/web/vistas/alta.js y src/web/vistas/agenda.js, y escribir los tests FR-024, incluido tests/e2e/fecha-idioma.spec.js con Chromium en inglés
- [ ] T068 Hacer las sesiones de SC-002 y SC-003 con al menos 10 personas y registrar los resultados en specs/001-nucleo-agenda/checklists/entrega.md. **Tarea de personas: condición de merge, no la puede hacer un agente.**
- [X] T069 No ofrecer reservar en huecos donde no cabe ningún servicio del profesional (FR-006), en src/web/rutas/agenda.js y src/web/vistas/agenda.js, con sus tests en tests/integracion/rutas-agenda.test.js
- [X] T070 Indicar la hora local en la página de confirmación (FR-023), en src/web/vistas/confirmar.js, con su test en tests/integracion/rutas-estado.test.js
- [X] T071 Conservar lo escrito al cambiar de profesional en el alta (FR-019), con `POST /citas/nueva`, en src/web/rutas/citas.js, src/web/vistas/alta.js y src/web/estaticos/alta.js, con sus tests en tests/integracion/rutas-alta.test.js y tests/e2e/flujo-recepcion.spec.js
- [X] T072 Añadir `novalidate` a los formularios de alta y de acceso (FR-027), en src/web/vistas/alta.js y src/web/vistas/acceso.js, con sus tests en tests/integracion/rutas-alta.test.js y tests/e2e/fecha-idioma.spec.js
- [X] T073 Repetir `npm test`, `npm run test:e2e` y la verificación de semilla tras T067 a T072, y marcar las puertas de calidad en specs/001-nucleo-agenda/checklists/entrega.md (depende de T067, T069, T070, T071, T072)

---

# Segunda pasada: cambios del 10/11/2026

**Alcance**: RN8, FR-027, FR-029, FR-030, FR-035 a FR-038, FR-040, FR-041 y FR-043, con HU2-E6, HU4-E5, HU5-E4, HU5-E5, HU6 y SC-010 a SC-013. **Sin código**: FR-039 (condición de entrega) y FR-042 (lo crea la primera feature que lo necesite).

**Estado de partida**: la suite solo falla en tests/unit/trazabilidad.test.js, por los 18 identificadores de los cambios (S-18). Cualquier otro fallo es una regresión.

## Convenciones añadidas en esta pasada

- **«Ahora» local**: se obtiene siempre con `ahoraLocal(contexto, zona)` de src/dominio/tiempo.js, nunca con `ahoraEnZona(ahora(), …)` directamente. Devuelve `contexto.momentoFijado` si existe (FR-043).
- **Cancelar**: solo `cancelarCita(contexto, citaId, canal)` de src/servicios/cancelar.js escribe una cancelación ([contracts/operacion-cancelar.md](contracts/operacion-cancelar.md)).
- **Valores guardados**: el origen es `recepcion`, `portal` o `correo`, sin tilde, y nunca se muestra tal cual. Los momentos van en `AAAA-MM-DDTHH:MM`.
- **Nombres de test**: según FR-035. Los de esta pasada empiezan por un identificador de la 001 sin prefijo.
- **Esperas en tiempo real**: la 001 no tiene esperas. Ninguna tarea usa `ahoraLocal` para medir tiempo transcurrido.

---

## Fase 9: Base de la segunda pasada (bloquea las historias de esta pasada)

**Propósito**: esquema en versión 2, momento de referencia en el contexto y test de trazabilidad con la convención nueva

**⚠️ CRÍTICO**: ninguna historia de esta pasada puede empezar hasta terminar esta fase

### Tests de la base (primero, deben fallar)

- [ ] T074 [P] Actualizar tests/unit/trazabilidad.test.js según FR-035 y SC-008. (1) El recuento esperado pasa a `['RN1', …, 'RN8']`, 42 escenarios y 13 criterios. (2) «Todos los tests empiezan por lo que comprueban» admite además `RP\d`, `RR\d`, `RA\d` y `\d{3}/(FR-\d{3}|SC-\d{3}|H\d-E\d|CL)`. (3) La cobertura de la 001 solo cuenta los nombres que **empiezan** por un identificador de la 001 sin prefijo (`RN`, `FR-`, `SC-`, `H\d-E\d` o `CL`). Dentro de ellos, un identificador solo cuenta si no lleva delante una barra, una letra, un dígito ni un guion. (4) Añadir tests `FR-035` de la propia regla: `002/SC-010 …` no cuenta como `SC-010`, y `RP1 … RN8` no cuenta como `RN8`. No se relaja nada más (principio VI). Al terminar, el test sigue en rojo y lista **exactamente** los 18 identificadores: RN8, H2-E6, H4-E5, H5-E4, H5-E5, H6-E1 a H6-E9 y SC-010 a SC-013
- [ ] T075 [P] Escribir tests del esquema v2 en tests/integracion/esquema.test.js, con escritura directa:
  - `FR-036 SC-011`: se aborta insertar una `cancelada` sin origen o sin momento, una `reservada`, `completada` o `no_asistida` con origen o con momento, un origen fuera de `recepcion`, `portal` y `correo`, y un `UPDATE` a `cancelada` sin origen. `cita_rn4` rechaza cambiar después el origen o el momento.
  - `FR-029`: `paciente.enlace` solo admite «32 caracteres hexadecimales en minúscula» (se rechazan mayúsculas, 31 caracteres y letras fuera de `a-f`). Es único entre los no nulos, y admite varios nulos. `clinica.telefono` admite nulo.
  - `FR-037`: existe la tabla `sesion_paciente`, que referencia a `paciente`.
  - Versión: un archivo nuevo queda con `PRAGMA user_version = 2`, y se reabre sin error. Un archivo con tablas y otra versión lanza un error que dice que hay que borrarlo y ejecutar `npm run semilla`, sin modificar el archivo.
- [ ] T076 [P] Escribir tests `FR-043` en tests/unit/tiempo.test.js:
  - `ahoraLocal({ ahora, momentoFijado: '2026-11-04T12:00' }, zona)` devuelve `'2026-11-04T12:00'` en `Europe/Madrid` y en `Atlantic/Canary`, y no cambia aunque `ahora()` avance.
  - Con `momentoFijado: null`, coincide con `ahoraEnZona(ahora(), zona)`.
  - `esMomentoValido` acepta `2026-11-04T12:00` y rechaza `2026-11-04 12:00`, `2026-02-30T12:00`, `2026-11-04T24:00`, `2026-11-04T12:00:00`, `2026-11-04T12:5` y el texto vacío.
- [ ] T077 [P] Ampliar tests/ayudas/escenario.js:
  - `citaDirecta` acepta `origen` y `momento`. Si `estado` es `'cancelada'` y no se pasan, usa por defecto `origen: 'recepcion'` y `momento` igual a `inicio`, como la semilla. Así los tests que ya insertan canceladas siguen siendo válidos con la restricción nueva.
  - Nueva `sesionPacienteDePrueba(bd, pacienteId)`: inserta en `sesion_paciente` el SHA-256 de un token aleatorio y devuelve el token.

### Implementación de la base

- [ ] T078 Pasar src/datos/esquema.sql a la versión 2 según [data-model.md](data-model.md):
  - `clinica.telefono TEXT`, que admite nulo.
  - `paciente.enlace TEXT` con `CHECK (enlace IS NULL OR (length(enlace) = 32 AND enlace NOT GLOB '*[^0-9a-f]*'))` y un índice único parcial `WHERE enlace IS NOT NULL`.
  - En `cita`, `origen_cancelacion TEXT CHECK (origen_cancelacion IN ('recepcion', 'portal', 'correo'))` y `momento_cancelacion TEXT`.
  - Restricción de tabla: «`origen_cancelacion` y `momento_cancelacion` son los dos no nulos si `estado = 'cancelada'`, y los dos nulos en cualquier otro estado».
  - Tabla `sesion_paciente (token_hash TEXT PRIMARY KEY, paciente_id INTEGER NOT NULL REFERENCES paciente (id))`.
  - `cita_rn4` **no cambia**.
- [ ] T079 En `abrirBd` de src/datos/bd.js:
  - Archivo sin tablas: aplicar el esquema y fijar `PRAGMA user_version = 2`.
  - Con tablas y versión 2: seguir como hasta ahora.
  - Con tablas y otra versión: lanzar un error propio, `EsquemaAntiguo`, sin modificar el archivo, con un mensaje en español que nombra el archivo y dice que hay que borrarlo y ejecutar `npm run semilla` ([research.md §16](research.md#16-cambio-de-esquema-sobre-un-archivo-existente)) (depende de T078)
- [ ] T080 [P] Añadir a src/dominio/tiempo.js `esMomentoValido(texto)` (formato exacto `AAAA-MM-DDTHH:MM`, con fecha y hora posibles, reutilizando `esFechaValida`) y `ahoraLocal(contexto, zona)`, que devuelve `contexto.momentoFijado ?? ahoraEnZona(contexto.ahora(), zona)`
- [ ] T081 Hacer que `crearServidor({ bd, ahora, momentoFijado = null, rutasExtra })` de src/web/servidor.js incluya `momentoFijado` en el contexto que recibe cada manejador y lo exponga como `servidor.momentoFijado` (depende de T080)
- [ ] T082 Sustituir las cuatro llamadas a `ahoraEnZona(ahora(), clinica.zona_horaria)` por `ahoraLocal(contexto, clinica.zona_horaria)` en src/servicios/alta-cita.js, src/servicios/cambio-estado.js, src/web/rutas/agenda.js y src/web/rutas/citas.js. Comprobar que el contexto con `momentoFijado` llega a `crearCita` y a `aplicarAccion` (depende de T081)
- [ ] T083 En src/principal.js:
  - Leer `CITACLARA_AHORA` **antes** de crear `datos/` o abrir la base. Si tiene valor y no pasa `esMomentoValido`, escribir en stderr, literalmente, «El momento de referencia CITACLARA_AHORA no es válido. Escríbelo como AAAA-MM-DDTHH:MM, por ejemplo 2026-11-04T12:00.» y terminar con código 1.
  - Ante `EsquemaAntiguo`, escribir su mensaje sin traza y terminar con código 1.
  - Pasar `momentoFijado` a `crearServidor`.
  - Seguir con `ahora = () => new Date()` (depende de T079, T081)

**Punto de control**: T075 y T076 en verde. T074, en rojo con los 18 identificadores y nada más. **Rojo esperado y transitorio**, por la restricción de T078:
- Las cancelaciones de recepción en tests/integracion/cambio-estado.test.js y tests/integracion/rutas-estado.test.js, hasta T096.
- Lo que carga la semilla (tests/unit/semilla-generador.test.js, tests/integracion/semilla-carga.test.js, tests/integracion/rendimiento.test.js y las pruebas e2e), hasta T104.

Cualquier otro fallo es una regresión.

---

## Fase 10: Historia de usuario 6 - Cancelación por el paciente: plazo, origen y etiqueta (Prioridad: P2) 🎯 MVP de esta pasada

**Objetivo**: la operación única de cancelar (FR-038) con plazo del paciente (RN8), y origen y momento registrados (FR-036) y visibles en la agenda (FR-027)

**Prueba independiente**: con el reloj fijado, aplicar `cancelarCita` antes, en y después del minuto límite por cada canal, y comprobar el resultado, el origen guardado y la etiqueta de la agenda

### Tests de la historia 6 (primero, deben fallar)

- [ ] T084 [P] [US6] Escribir tests en tests/unit/estados.test.js:
  - `FR-040 sinCerrar`: es cierto para una reservada con `inicio` igual a «ahora» o anterior, y falso un minuto antes del inicio y en completadas, canceladas y no asistidas pasadas.
  - `RN5`: `accionesPermitidas` usa la misma frontera.
  - `RN8 limiteCancelacion`: `2026-11-16T18:00` → `2026-11-16T16:00`, `2027-03-29T09:00` → `2027-03-29T07:00` y `2026-10-26T09:00` → `2026-10-26T07:00`.
  - `RN8 dentroDePlazo`: con inicio a las 18:00, cierto a las 16:00 y falso a las 16:01.
- [ ] T085 [P] [US6] Escribir tests `FR-027` de `etiquetaCita` en tests/unit/formato.test.js:
  - Origen `portal` o `correo` con momento `2026-11-08T19:30`: «Cancelada por el paciente el 08/11/2026 a las 19:30», idéntica con los dos canales.
  - Origen `recepcion`: «Cancelada».
  - «Reservada» también para una cita sin cerrar, y «Completada» y «No asistida».
  - Nunca devuelve «Pendiente de confirmar por la clínica».
- [ ] T086 [P] [US6] Escribir tests del servicio en tests/integracion/cancelar.test.js, con `relojFijo` y `momentoFijado`. Cita a las 18:00 de un lunes futuro salvo que se diga otra cosa:
  - `H6-E1`: a las 15:59, por `portal` y por `correo`, da `cancelada_ahora` con `origen` igual al canal y `momento` `…T15:59`, y `citaQueSolapa` ya no la encuentra.
  - `H6-E2`: aceptada a las 16:00:00 y a las 16:00:59, con segundos en `relojFijo`.
  - `H6-E3`: a las 16:01, a las 17:30 y a las 18:05 da `fuera_de_plazo` con `limite` `…T16:00`. La cita sigue reservada, sin origen ni momento.
  - `H6-E4`: `recepcion` a las 17:59 y a las 18:30 da `cancelada_ahora` con origen `recepcion`.
  - `H6-E5`: cita el 29/03/2027 a las 09:00. `portal` a las 07:00 (`2027-03-29T07:00:00+02:00`) se acepta, y a las 07:01 se rechaza. Lo mismo en una clínica de `Atlantic/Canary`.
  - `SC-010`: la misma tabla de casos, por `portal` y por `correo`, da el mismo resultado, también para citas el 23/10/2026 y el 26/10/2026 a las 18:00.
  - `FR-043`: con `momentoFijado` `…T16:00` se acepta y se registra ese momento; con `…T16:01` se rechaza.
  - `FR-038`, orden de resultados: una ya cancelada da `ya_cancelada`, con el origen y el momento previos, aunque esté fuera de plazo; una completada o no asistida da `no_cancelable` con su `estado`, aunque esté fuera de plazo; todo resultado incluye `cita`.
  - `H6-E8`: tras cada resultado distinto de `cancelada_ahora`, la fila de la cita es idéntica a la de antes.
  - `FR-038`: una cita inexistente o de otra clínica devuelve `null` sin efecto, y un canal no válido (`'Recepción'`, `''`, `undefined`) lanza una excepción.
  - `FR-036`: en Canarias, el momento es la hora local de la clínica.
- [ ] T087 [P] [US6] Escribir el test `H6-E9 SC-013` de concurrencia en tests/concurrencia/cancelacion.test.js y tests/concurrencia/trabajador-cancelar.js, con el mismo esquema de barrera que tests/concurrencia/solape.test.js:
  - 4 procesos por `fork` sobre un archivo compartido, dos con canal `portal` y dos con `correo`, todos con `momentoFijado` dentro del plazo.
  - 1.000 rondas. En cada una, el padre inserta una cita reservada nueva con `citaDirecta`, envía el instante común y recoge todas las respuestas.
  - Comprobar en cada ronda exactamente un `cancelada_ahora` y tres `ya_cancelada`, con el `origen` y el `momento` del ganador, y que la fila guardada tiene ese origen.
  - Al final, que han ganado al menos 2 procesos distintos y los dos canales.
- [ ] T088 [P] [US6] Escribir tests `FR-038 SC-013` en tests/integracion/operacion-unica.test.js:
  - Recorriendo src/, solo src/servicios/cancelar.js importa `registrarCancelacion`.
  - Ningún archivo de src/ salvo src/datos/citas.js contiene `UPDATE cita`.
  - `cambiarEstado(bd, id, 'cancelada')` lanza una excepción y la cita no cambia.
- [ ] T089 [P] [US6] Ampliar tests/integracion/cambio-estado.test.js y tests/integracion/rutas-estado.test.js:
  - `H3-E5 FR-038`: cancelar desde recepción una cita ya cancelada da 409 con «Esta cita ya está cancelada y no se puede cambiar.», y una completada, «Esta cita ya está completada y no se puede cambiar.».
  - `FR-036`: la cancelación de recepción guarda origen `recepcion` y como momento el «ahora» local, también con `momentoFijado`.
  - `CL dos acciones de estado a la vez`: cancelar y completar a la vez, con la cancelación por la operación única.
- [ ] T090 [P] [US6] Ampliar tests/integracion/rutas-agenda.test.js:
  - `H6-E6`: canceladas con origen `portal` y `correo` y momento `2026-11-08T19:30` muestran «Cancelada por el paciente el 08/11/2026 a las 19:30», y su tramo es libre y reservable.
  - `H6-E7`: con origen `recepcion`, «Cancelada», sin fecha ni hora.
  - `SC-011`: cada cancelada muestra la etiqueta de su origen.
  - `FR-040`: una cita sin cerrar se ve como «Reservada».
  - `FR-027`: el texto visible nunca contiene «Pendiente de confirmar por la clínica», `recepcion` ni `portal`.

### Implementación de la historia 6

- [ ] T091 [P] [US6] Añadir a src/dominio/estados.js `sinCerrar(cita, ahora)` (`cita.estado === 'reservada' && cita.inicio <= ahora`), `limiteCancelacion(inicio)` (`sumarMinutos(inicio, -120)`) y `dentroDePlazo(inicio, ahora)` (`ahora <= limiteCancelacion(inicio)`). Hacer que `accionesPermitidas` use `sinCerrar` para RN5
- [ ] T092 [P] [US6] Añadir `etiquetaCita(cita)` a src/dominio/formato.js: con `estado` `cancelada` y `origen_cancelacion` `portal` o `correo`, `Cancelada por el paciente el ${fecha} a las ${hora}` a partir de `momento_cancelacion`, con `fecha` y `hora` de ese mismo módulo; en los demás casos, `etiquetaEstado(cita.estado)`
- [ ] T093 [US6] En src/datos/citas.js:
  - Añadir `registrarCancelacion(bd, id, origen, momento)`, un único `UPDATE cita SET estado = 'cancelada', origen_cancelacion = ?, momento_cancelacion = ? WHERE id = ? AND estado = 'reservada'`.
  - Hacer que `cambiarEstado` solo admita `completada` y `no_asistida`, y lance una excepción con cualquier otro estado.
- [ ] T094 [US6] Crear src/servicios/cancelar.js con `cancelarCita(contexto, citaId, canal)` según [contracts/operacion-cancelar.md](contracts/operacion-cancelar.md):
  - `CANALES = ['recepcion', 'portal', 'correo']`. Un canal no válido lanza una excepción antes de abrir la transacción.
  - Dentro de una sola `transaccionInmediata`: `citaPorId`, o `null` si no existe. Después, en este orden: `ya_cancelada` con `origen` y `momento`; `no_cancelable` con `estado`; si el canal no es `recepcion` y `!dentroDePlazo(inicio, ahoraLocal(contexto, zona))`, `fuera_de_plazo` con `limite`; si no, `registrarCancelacion` con `momento = ahoraLocal(…)` y `cancelada_ahora` con `origen` y `momento`.
  - Todos los resultados incluyen `cita`.
  - (depende de T080, T091, T093)
- [ ] T095 [US6] Revisar que el contexto que reciben `aplicarAccion` y `cancelarCita` es `{ bd, clinica, ahora, momentoFijado }`, como fija el contrato, sin campos con otro nombre, en src/web/rutas/estado.js (depende de T082)
- [ ] T096 [US6] En `aplicarAccion` de src/servicios/cambio-estado.js, delegar la acción `cancelar` en `cancelarCita(contexto, id, 'recepcion')`:
  - `null` da `no_encontrado`.
  - `ya_cancelada` y `no_cancelable` dan `rechazo` con «Esta cita ya está {estado} y no se puede cambiar.», con el estado en minúscula según `etiquetaEstado`.
  - `cancelada_ahora` da `ok`.
  - Completar y marcar como no asistida siguen por `cambiarEstado`.
  - (depende de T094)
- [ ] T097 [US6] Usar `etiquetaCita(cita)` en lugar de `etiquetaEstado(cita.estado)` en src/web/vistas/agenda.js, manteniendo la clase de estado (depende de T092)

**Punto de control**: T084 a T090 en verde, y vuelven a verde las cancelaciones de recepción. En la trazabilidad ya solo faltan H2-E6, H4-E5, H5-E4, H5-E5 y SC-012.

---

## Fase 11: Historia de usuario 5 - Datos de demostración reproducibles: datos nuevos y reloj fijado (Prioridad: P2)

**Objetivo**: semilla con teléfono, enlaces y origen de las canceladas, que reproduce los resúmenes de FR-030, y servidor con reloj fijado y aviso (FR-043)

**Prueba independiente**: generar la semilla y comparar cifras y resúmenes con FR-030; arrancar con `CITACLARA_AHORA=2026-11-04T12:00` y abrir la agenda

### Tests de la historia 5 (primero, deben fallar)

- [ ] T098 [P] [US5] Ampliar tests/unit/semilla-generador.test.js:
  - `H5-E4 FR-029`, clínica: las claves en este orden exacto, `['nombre', 'zona_horaria', 'telefono', 'clave_hash', 'clave_sal']`, con `telefono` `000 200 000`.
  - Pacientes: claves `['nombre', 'telefono', 'email', 'enlace']`. Los 40 enlaces cumplen `/^[0-9a-f]{32}$/` y son distintos. El del paciente *n* es igual a los 32 primeros caracteres del SHA-256 de `citaclara-enlace-20261102-<n>`. El primero, de David Gil, es `c73f5e835397826416bda7b3e5323d02`. Con otro lunes, los enlaces no cambian.
  - Las 37 canceladas llevan, justo tras `fin`, `origen_cancelacion: 'recepcion'` y `momento_cancelacion` igual a `inicio`. Ninguna otra cita tiene esas claves (`Object.hasOwn`).
  - `FR-030 SC-005`, con el lunes por defecto: 463 citas de historia (380, 46 y 37), 57 futuras y 40 pacientes. Resumen de contenido `ae3ce97082c1ccf185b546cb8665f7267d56768f330d5f23a92ed5492e30334f` y resumen sin fechas `0937418925ee10348d05a9541c24107a5098ea82a585ce8c57f5f6b5b85a3329`, escritos literalmente en el test.
  - `FR-032`: con `2026-11-09` y `2027-01-04`, el resumen sin fechas es el mismo.
- [ ] T099 [P] [US5] Ampliar tests/integracion/semilla-carga.test.js:
  - `H5-E4 SC-011`: en la base, la clínica tiene teléfono, los 40 pacientes tienen enlace y las 37 canceladas tienen origen `recepcion` y momento igual a su inicio. Ninguna cancelada queda sin origen.
  - `FR-032`: repetir la carga borra las sesiones de paciente de los pacientes de Clínica Eleva, creadas con `sesionPacienteDePrueba`, y no las de otra clínica.
  - `H6-E7`: la agenda muestra esas canceladas como «Cancelada».
  - `FR-032`: `node src/semilla/comando.js` con `cwd` en una carpeta temporal cuyo `datos/citaclara.db` tiene el esquema antiguo termina con código 1, explica que hay que borrarlo, y deja el archivo intacto.
- [ ] T100 [P] [US5] Escribir tests/integracion/reloj-fijado.test.js con la semilla cargada y `crearServidor({ momentoFijado: '2026-11-04T12:00', ahora: relojFijo('2026-11-20T09:00:00+01:00') })`:
  - `H5-E5`: `GET /agenda` se abre el 04/11/2026; los huecos anteriores a las 12:00 no ofrecen reservar; `POST /citas` a las 11:45 da 422 con el mensaje de RN2, y a las 12:00 se acepta.
  - El aviso «Reloj de demostración: la hora está fijada en el miércoles 04/11/2026 a las 12:00 y no avanza.» aparece en `/acceso`, `/agenda`, `/citas/nueva`, la confirmación y la página 404.
  - Sin `momentoFijado`, el aviso no aparece.
  - `FR-043`: dos peticiones con `ahora()` distinto ven el mismo día y los mismos huecos reservables.
  - `FR-043`: `node src/principal.js` con `CITACLARA_AHORA=2026-11-04 12:00` y `cwd` temporal termina con código distinto de 0, escribe el mensaje literal de [contracts/configuracion.md](contracts/configuracion.md) y no crea `datos/`.

### Implementación de la historia 5

- [ ] T101 [P] [US5] Añadir `telefono: '000 200 000'` a `CLINICA` en src/semilla/datos-base.js, justo tras `zona_horaria`
- [ ] T102 [US5] En src/semilla/generador.js:
  - Añadir `enlace` a cada paciente, tras `email`, derivado como dice FR-029, con `node:crypto` y la `semilla` de los parámetros.
  - Al convertir las citas de la historia en fechas, añadir a las canceladas, justo tras `fin`, `origen_cancelacion: 'recepcion'` y `momento_cancelacion` igual a su `inicio`.
  - Comprobar que la clínica conserva el orden `nombre`, `zona_horaria`, `telefono`, `clave_hash`, `clave_sal`.
  - (depende de T101)
- [ ] T103 [US5] Ampliar `crearPaciente` de src/datos/pacientes.js con `enlace = null`, e `insertarCita` de src/datos/citas.js con `origenCancelacion = null` y `momentoCancelacion = null`, en el mismo `INSERT` (depende de T093)
- [ ] T104 [US5] En src/semilla/carga.js:
  - Insertar `telefono` en `clinica`, `enlace` en `paciente`, y el origen y el momento en el `INSERT` de la cita, porque `cita_rn4` rechazaría un `UPDATE`.
  - En `borrarClinica`, borrar antes de `paciente` las filas de `sesion_paciente` de sus pacientes.
  - En `resumen`, quitar `momento_cancelacion` del resumen sin fechas, además de `inicio` y `fin`.
  - (depende de T102, T103)
- [ ] T105 [US5] En src/semilla/comando.js, ante `EsquemaAntiguo`, escribir su mensaje sin traza y terminar con código 1 sin escribir nada (depende de T079)
- [ ] T106 [US5] Añadir `avisoRelojFijado(momento)` a src/dominio/formato.js, que devuelve «Reloj de demostración: la hora está fijada en el {día de la semana} {dd/mm/aaaa} a las {HH:MM} y no avanza.», con el día en minúscula a partir de `nombreDia(diaDeSemana(…))` (depende de T092, por el mismo archivo)
- [ ] T107 [US5] Pintar el aviso en todas las pantallas de recepción (depende de T081, T106):
  - En src/web/plantilla.js, `layout` acepta `momentoFijado` y, si existe, pinta `avisoRelojFijado` bajo la cabecera, en un bloque con texto, no solo color, y contraste de al menos 4,5:1.
  - Pasar `momentoFijado` a `paginaMensaje`, `paginaNoEncontrada`, `paginaSinSesion` y `paginaFallo`.
  - Pasar `contexto.momentoFijado` desde src/web/vistas/acceso.js, src/web/vistas/agenda.js, src/web/vistas/alta.js, src/web/vistas/confirmar.js y las páginas genéricas de src/web/servidor.js.
  - Estilo del bloque en src/web/estaticos/estilos.css.
- [ ] T108 [US5] Ejecutar `npm run semilla` y comprobar que las cifras y los dos resúmenes coinciden con FR-030 de specs/001-nucleo-agenda/spec.md. Si no coinciden, corregir la implementación (orden y nombre de los campos), **nunca la spec** (historial, D4) (depende de T104)

**Punto de control**: T098 a T100 en verde, y vuelven a verde los tests que cargan la semilla. En la trazabilidad ya solo faltan H2-E6, H4-E5 y SC-012.

---

## Fase 12: Historia de usuario 2 - Ver la agenda: correo de la ficha desde la cita (Prioridad: P1)

**Objetivo**: añadir, corregir o quitar el correo de la ficha desde una cita de la agenda (FR-041)

**Prueba independiente**: desde una cita, guardar un correo mal escrito, uno válido y uno vacío, y comprobar la ficha, la cita y la agenda

### Tests de la historia 2 (primero, deben fallar)

- [ ] T109 [P] [US2] Escribir tests/integracion/rutas-correo.test.js según [contracts/interfaz-web.md](contracts/interfaz-web.md):
  - `H2-E6`: en una ficha sin correo, `POST /citas/:id/correo` con un correo válido redirige con 303 a la agenda del profesional y del día de la cita, y guarda el correo. Un correo mal escrito también se corrige.
  - `FR-041`: vacío o solo espacios lo quita, con `email` `NULL`.
  - `FR-013`: un correo no válido da 422 con «Ese correo no parece válido. Revísalo o déjalo en blanco.», conserva lo escrito y no cambia la ficha.
  - `FR-041`: nombre, teléfono y todas las columnas de la cita quedan idénticos antes y después.
  - `FR-041`: `GET` muestra el título «Correo de {paciente}», el campo «Correo electrónico» con el valor actual, «Déjalo en blanco para quitarlo. Guardarlo no envía ningún mensaje.», los botones «Guardar correo» y «Volver a la agenda», y el nombre y el teléfono como texto, sin campo. El formulario lleva `novalidate`.
  - `FR-041`: funciona en citas reservadas, completadas, canceladas y no asistidas.
  - `FR-004`: una cita de otra clínica o inexistente da 404 en `GET` y en `POST`, sin cambios.
  - El nombre del paciente se escapa.
- [ ] T110 [P] [US2] Ampliar tests/integracion/rutas-agenda.test.js con `FR-041`: cada cita, en cualquier estado, enlaza a `/citas/:id/correo` con «Añadir correo» si la ficha no tiene correo y «Cambiar correo» si lo tiene. Ampliar «FR-001 están registradas las rutas del contrato» en tests/integracion/rutas-acceso.test.js con `GET /citas/:id/correo` y `POST /citas/:id/correo`

### Implementación de la historia 2

- [ ] T111 [US2] Añadir a src/datos/pacientes.js `cambiarCorreo(bd, clinicaId, pacienteId, email)`, que solo actualiza `paciente.email`. Añadir `paciente.email AS paciente_email` a la consulta común de src/datos/citas.js, para que la agenda no haga consultas por cita (SC-004) (depende de T103)
- [ ] T112 [P] [US2] Extraer de `validarPaciente` en src/dominio/reglas.js una `validarCorreo(texto)` con la misma regla de FR-013, «con forma de correo», y usarla en las dos
- [ ] T113 [US2] Crear src/servicios/correo-ficha.js con `guardarCorreo(contexto, citaId, texto)`: localiza la cita en la clínica de la sesión; recorta, y un texto vacío es `null`; valida con `validarCorreo`; llama a `cambiarCorreo`. Devuelve `{ ok: true, cita }`, `{ ok: false, motivo: 'no_encontrado' }` o `{ ok: false, motivo: 'rechazo', mensaje }`. No envía nada (depende de T111, T112)
- [ ] T114 [P] [US2] Crear la vista src/web/vistas/correo.js con los textos literales del contrato, la hora local de la cita (FR-023), `novalidate` y el valor escrito conservado tras un 422
- [ ] T115 [US2] Crear src/web/rutas/correo.js con `GET /citas/:id/correo` y `POST /citas/:id/correo` (303 a `/agenda?profesional=…&dia=dd/mm/aaaa` del día de la cita; 422; 404), y registrar `rutasCorreo` en src/web/servidor.js (depende de T113, T114)
- [ ] T116 [US2] Añadir a cada cita de src/web/vistas/agenda.js el enlace «Añadir correo» o «Cambiar correo», según `paciente_email`, con tamaño táctil de al menos 44 × 44 píxeles (depende de T097, T111)

**Punto de control**: T109 y T110 en verde. En la trazabilidad ya solo faltan H4-E5 y SC-012.

---

## Fase 13: Historia de usuario 4 - Sesiones de paciente separadas (Prioridad: P2)

**Objetivo**: demostrar que una sesión de paciente no abre nada de recepción (FR-037)

**Prueba independiente**: con una sesión de paciente válida, en su cookie y en la de recepción, recorrer todas las rutas registradas

### Tests de la historia 4 (primero, deben fallar)

- [ ] T117 [P] [US4] Escribir tests/integracion/sesiones-paciente.test.js con una sesión creada con `sesionPacienteDePrueba`:
  - `H4-E5 SC-012`: para cada ruta no pública de `servidor.rutasRegistradas`, incluida una ruta de `rutasExtra` que simula el panel de la 004, el token de paciente en la cookie `sesion_paciente`, y también puesto en la cookie `sesion`, hace que `GET` redirija a `/acceso` y `POST` dé 401 sin efecto. Ninguna respuesta contiene datos de pacientes.
  - `CL sesión de recepción y de paciente en el mismo navegador`: con las dos cookies, recepción funciona con normalidad. `POST /salir` solo borra la fila de `sesion`; la de `sesion_paciente` sigue, y la respuesta no envía ninguna cabecera `set-cookie` para `sesion_paciente`.
  - `FR-037`: no hay ninguna ruta de la 001 que cree o lea sesiones de paciente.

### Implementación de la historia 4

- [ ] T118 [US4] Comprobar en src/web/servidor.js, src/servicios/acceso.js y src/web/rutas/acceso.js que solo se lee la cookie `sesion`, solo se busca en la tabla `sesion` y `POST /salir` solo cierra la de recepción. Corregir lo que haga fallar T117 y dejar en `atender` un comentario que cite FR-037. La tabla de T078 ya da la separación, así que esta tarea puede no necesitar más cambios: se deja constancia en el commit (depende de T117)

**Punto de control**: T117 en verde. **La trazabilidad, en verde**: termina el rojo de S-18.

---

## Fase 14: Cierre de la segunda pasada

**Propósito**: interfaz en navegador, textos y verificación completa

- [ ] T119 [P] Cambiar tests/e2e/servidor-e2e.js para que arranque con `momentoFijado: '2026-11-04T10:00'` en lugar de un `ahora` fijo, de modo que todas las pruebas e2e vean el aviso del reloj
- [ ] T120 [P] Añadir a tests/e2e/accesibilidad.spec.js la página de correo y el aviso del reloj, con FR-028 y SC-007 en los dos proyectos: sin desbordamiento horizontal, controles de al menos 44 × 44 píxeles y contraste de al menos 4,5:1 (depende de T119)
- [ ] T121 Añadir a tests/e2e/flujo-recepcion.spec.js los escenarios 7, 10, 11, 12 y 13 de [quickstart.md](quickstart.md): cancelar y ver «Cancelada» sin fecha; el aviso, también en el acceso; añadir un correo mal escrito y después uno bien; quitarlo; y cancelar una cita ya cancelada desde dos pestañas (depende de T119)
- [ ] T122 [P] Ampliar tests/integracion/textos.test.js (FR-027) con la página de correo, el 409 de la doble cancelación y el aviso del reloj. Comprobar que no aparecen `recepcion`, `portal`, `cancelada_ahora`, `ya_cancelada`, `fuera_de_plazo`, `no_cancelable`, `SQLITE` ni `CHECK constraint`
- [ ] T123 Añadir a specs/001-nucleo-agenda/checklists/entrega.md:
  - Las puertas de esta pasada: trazabilidad en verde, resúmenes de FR-030 reproducidos y SC-013 en 1.000 rondas.
  - Que FR-039 no se cumple mientras su fecha de comprobación esté pendiente, así que el producto solo se usa con la semilla.
  - Que SC-002 y SC-003 siguen pendientes de T068.
- [ ] T124 Ejecutar `npm test`, `npm run test:e2e`, la verificación de semilla de [quickstart.md](quickstart.md) (dos ejecuciones y `--lunes 2026-11-09`) y los escenarios manuales 10 a 13 con `CITACLARA_AHORA=2026-11-04T12:00`. Corregir lo que falle sin relajar ningún test (principio VI), y marcar las puertas en specs/001-nucleo-agenda/checklists/entrega.md (depende de todas las tareas anteriores de esta pasada)

---

## Dependencias y orden de ejecución

### Dependencias entre fases

- **Preparación (fase 1)**: sin dependencias.
- **Base común (fase 2)**: depende de la fase 1 y bloquea todas las historias.
- **Historias (fases 3 a 7)**: dependen de la fase 2.
- **Cierre (fase 8)**: depende de todas las historias.

### Dependencias entre historias

- **US1**: solo depende de la base.
- **US2**: solo depende de la base. Sus enlaces apuntan a `/citas/nueva`, pero sus tests solo comprueban la URL.
- **US3**: depende de la base. T043 amplía el archivo de T029 y T047 amplía el de T036, así que esas tareas van después.
- **US4**: solo depende de la base. T048 recorre todas las rutas, por lo que da más cobertura si se ejecuta tras US1 a US3.
- **US5**: solo depende de la base.

### Dentro de cada historia

Tests primero y en rojo, después datos y dominio, servicios, vistas y rutas.

### Segunda pasada (fases 9 a 14)

- **Base (fase 9)**: depende de que la primera pasada esté hecha, y bloquea las fases 10 a 13.
- **Orden de las historias: US6 → US5 → US2 → US4**. No sigue la prioridad (US2 es P1) por una razón técnica: la restricción de T078 rompe las cancelaciones de recepción hasta T096 y la carga de la semilla hasta T104. Hacer primero US6 y US5 acorta ese rojo transitorio. US2 y US4 solo dependen de la base y no rompen nada.
- **US6**: solo depende de la base. Es la pieza que heredan la 002 y la 003.
- **US5**: depende de la base. T103 amplía src/datos/citas.js después de T093 (US6), y T106 amplía src/dominio/formato.js después de T092 (US6).
- **US2**: depende de la base. T111 va después de T103 (mismo archivo), y T116 después de T097 (misma vista).
- **US4**: solo depende de la base. T117 recorre todas las rutas registradas, así que da más cobertura después de US2, que añade dos.
- **Cierre (fase 14)**: depende de las fases 10 a 13.

### Condición para integrar

La spec está aprobada por su propietario desde el 06/11/2026, y sus dos cambios, desde el 10/11/2026 (principio I). Antes del merge, la suite debe estar en verde tras los últimos cambios (principio VI, T124), incluida la trazabilidad, y SC-002 y SC-003 deben estar medidos (T068). La 002, la 003 y la 004 no planifican ni tocan `src/` hasta que `master` esté en verde (S-18).

### Oportunidades de paralelismo

- Fase 2: T004 a T007 entre sí; T010, T011, T013, T018 y T019 entre sí.
- Tras la fase 2: US1, US2, US4 y US5 pueden avanzar a la vez, porque tocan archivos distintos. Solo comparten el registro de rutas en src/web/servidor.js, que es el punto de conflicto a vigilar.
- Fase 8: T059, T061, T062 y T063 entre sí.
- Fase 9: T074 a T077 entre sí; T080 en paralelo con T078 y T079.
- Fase 10: T084 a T090 entre sí; T091 y T092 entre sí.
- Fase 11: T098 a T100 entre sí; T101 en paralelo con T103.
- Fase 12: T109 y T110 entre sí; T112 y T114 entre sí.
- Fase 14: T119 y T122 entre sí.
- **Archivos compartidos en la segunda pasada**, a vigilar si se trabaja en paralelo: src/datos/citas.js (T093, T103, T111), src/dominio/formato.js (T092, T106), src/web/vistas/agenda.js (T097, T107, T116) y src/web/servidor.js (T081, T107, T115).

---

## Ejemplo de paralelismo: historia 1

```text
# Todos los tests a la vez (archivos distintos):
T022 tests/unit/reglas-alta.test.js
T023 tests/integracion/alta-cita.test.js
T024 tests/integracion/rutas-alta.test.js
T025 tests/concurrencia/solape.test.js
T026 tests/concurrencia/solape-http.test.js

# Después, las piezas independientes a la vez:
T027 src/dominio/reglas.js
T028 src/datos/pacientes.js
T029 src/datos/citas.js
T031 src/web/vistas/alta.js
T032 src/web/estaticos/alta.js
```

## Ejemplo de paralelismo: historia 6

```text
# Todos los tests a la vez (archivos distintos):
T084 tests/unit/estados.test.js
T085 tests/unit/formato.test.js
T086 tests/integracion/cancelar.test.js
T087 tests/concurrencia/cancelacion.test.js y trabajador-cancelar.js
T088 tests/integracion/operacion-unica.test.js
T089 tests/integracion/cambio-estado.test.js y rutas-estado.test.js
T090 tests/integracion/rutas-agenda.test.js

# Después, las funciones puras a la vez:
T091 src/dominio/estados.js
T092 src/dominio/formato.js

# Y en orden: T093 → T094 → T096, con T095 y T097 cuando estén sus dependencias.
```

---

## Estrategia de implementación

### Primero el MVP

1. Completar las fases 1 y 2.
2. Completar la fase 3 (US1).
3. **Parar y validar**: T025 demuestra la garantía capital con simultaneidad real.
4. Completar la fase 4 (US2), porque reservar sin ver huecos no sirve a recepción.

US1 y US2 se validan con tests automáticos. **La primera demo en navegador necesita además US4 (entrar) y US5 (datos).**

### Entrega incremental

1. Base lista.
2. US1 → reservas con garantía.
3. US2 → agenda visible.
4. US4 y US5 → primera demo real.
5. US3 → cierre de citas.
6. Fase 8 → accesibilidad, cambio de hora y trazabilidad.

### Segunda pasada

1. Fase 9: la trazabilidad queda en rojo con los 18 identificadores exactos, que sirven de lista de pendientes.
2. **MVP de la pasada, US6** (fase 10): la operación única de cancelar, con RN8 y SC-013. **Parar y validar**: T087 demuestra la indivisibilidad con simultaneidad real, y las cancelaciones de recepción vuelven a verde.
3. US5 (fase 11): semilla con los resúmenes de FR-030 y reloj fijado. La demo vuelve a funcionar.
4. US2 (fase 12): correo de la ficha.
5. US4 (fase 13): sesiones de paciente aisladas. La trazabilidad vuelve a verde.
6. Fase 14: navegador, textos y verificación completa. Se integra en `master` solo con todo en verde.

---

## Notas

- Comprobar que cada test falla antes de implementar.
- Hacer commit tras cada tarea o grupo lógico.
- Si un solape aparece en cualquier prueba, es un defecto de máxima gravedad y bloquea la entrega (principio III).
- Ningún test se desactiva ni se relaja. Si deja de ser válido, primero se corrige la spec (principio VI).
- Si la semilla no reproduce los resúmenes de FR-030, el defecto está en la implementación, no en la spec (historial, D4).
- Si dos cancelaciones simultáneas obtienen «cancelada ahora», es un defecto de máxima gravedad, como un solape.
- Fuera del alcance de estas tareas: el comentario «INFORME DE IMPACTO» que sigue en `.specify/memory/constitution.md` (aviso del plan).
