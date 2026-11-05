---

description: "Lista de tareas de implementación del núcleo de agenda"
---

# Tareas: Núcleo de agenda

**Entrada**: documentos de diseño de `specs/001-nucleo-agenda/`

**Requisitos previos**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md)

**Tests**: obligatorios (constitución, principios III y VI; FR-035). Se escriben primero y deben fallar antes de implementar.

**Organización**: las tareas se agrupan por historia de usuario, para implementar y probar cada una por separado.

## Formato: `[ID] [P?] [Historia] Descripción`

- **[P]**: se puede hacer en paralelo (archivos distintos, sin dependencias pendientes)
- **[US1]…[US5]**: historia de usuario de la spec (US1 es la «Historia de usuario 1»)

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

### Condición para integrar

La spec está aprobada por su propietario desde el 06/11/2026 (principio I). Antes del merge, la suite debe estar en verde (principio VI) y SC-002 y SC-003 deben estar medidos (T068).

### Oportunidades de paralelismo

- Fase 2: T004 a T007 entre sí; T010, T011, T013, T018 y T019 entre sí.
- Tras la fase 2: US1, US2, US4 y US5 pueden avanzar a la vez, porque tocan archivos distintos. Solo comparten el registro de rutas en src/web/servidor.js, que es el punto de conflicto a vigilar.
- Fase 8: T059, T061, T062 y T063 entre sí.

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

---

## Notas

- Comprobar que cada test falla antes de implementar.
- Hacer commit tras cada tarea o grupo lógico.
- Si un solape aparece en cualquier prueba, es un defecto de máxima gravedad y bloquea la entrega (principio III).
- Ningún test se desactiva ni se relaja. Si deja de ser válido, primero se corrige la spec (principio VI).
