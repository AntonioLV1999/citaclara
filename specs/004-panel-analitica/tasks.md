---

description: "Lista de tareas de implementación del panel de analítica"
---

# Tareas: Panel de analítica

**Entrada**: documentos de diseño de `specs/004-panel-analitica/`, con la spec aprobada el 12/11/2026

**Requisitos previos**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/interfaz-panel.md](contracts/interfaz-panel.md), [quickstart.md](quickstart.md)

**Tests**: obligatorios (constitución, principio VI; FR-023 y SC-008). Se escriben primero y deben fallar antes de implementar.

**Organización**: las tareas se agrupan por historia de usuario, en orden de prioridad (US1, US2 y US5 son P1; US3 y US4, P2), para implementar y probar cada una por separado.

## Formato: `[ID] [P?] [Historia] Descripción`

- **[P]**: se puede hacer en paralelo (archivos distintos, sin dependencias pendientes)
- **[US1]…[US5]**: historia de usuario de la spec (US1 es la «Historia de usuario 1»)

## Convenciones para todas las tareas

- **Código**: JavaScript con módulos ES sobre Node 26, sin dependencias nuevas, sin biblioteca de gráficos y sin JavaScript en el navegador. Mismo estilo que `src/` de la 001: vocabulario del dominio en español y comentarios breves que citan la regla.
- **Nombres de test** (FR-023): cada test empieza por el identificador de la 004 que comprueba. Las reglas, sin prefijo: `RA1` a `RA8`. Lo demás, con `004/` delante: `004/H1-E1`, `004/SC-001`, `004/FR-013`, `004/CL límite de semana`. Un nombre que empiece por `FR-001` o `SC-001`, sin prefijo, es de la 001 y no cubre la 004. T005 comprueba esta trazabilidad.
- **Reloj**: los tests fijan el «ahora» con el momento de referencia de FR-043 de la 001 (`momentoFijado` de `crearServidor`), en `2026-11-04T12:00` para las cifras de referencia y en `2026-11-11T12:00` para el aviso de 31 citas sin cerrar. «Hoy» sale siempre de `ahoraLocal(contexto, clinica.zona_horaria)` de src/dominio/tiempo.js.
- **Cifras esperadas**: las de [Cifras de referencia](spec.md#cifras-de-referencia), escritas literalmente en los tests. Si un test no las reproduce, el defecto está en la implementación, no en la spec.
- **Textos**: los de [contracts/interfaz-panel.md](contracts/interfaz-panel.md), literalmente.
- **Solo lectura** (RA8, FR-018): ninguna tarea toca src/datos/esquema.sql, src/datos/bd.js ni src/semilla/. Los únicos archivos de la 001 que cambian son src/web/plantilla.js, src/web/servidor.js, src/web/estaticos/estilos.css, src/dominio/formato.js y tests/unit/formato.test.js, y su suite debe seguir en verde.

---

## Fase 1: Preparación

**Propósito**: comprobar la línea base y preparar las utilidades de test del panel

- [X] T001 Comprobar la línea base con los scripts de package.json: `npm test` (416) y `npm run test:e2e` (66) en verde sobre la rama rebasada. Si algo falla, parar: es una regresión de `master`, no de la 004
- [X] T002 Crear tests/ayudas/panel.js con `panelDeSemilla({ lunes = LUNES_POR_DEFECTO, momentoFijado = '2026-11-04T12:00', ahora })`: usa `crearEscenario()` de tests/ayudas/escenario.js, carga la semilla con `cargar(e.bd, generar({ semilla: SEMILLA, lunes }))`, arranca `crearServidor({ bd, ahora: ahora ?? relojFijo('2026-11-04T12:00:00+01:00'), momentoFijado })` con `escuchar`, abre una sesión de «Clínica Eleva» con `sesionDePrueba`, y devuelve `{ e, servidor, cookie, clinicaId, abrir(ruta = '/analitica'), cerrar() }`, donde `abrir` hace la `peticion` y devuelve `{ estado, texto, visible: textoVisible(texto), cabeceras }`

---

## Fase 2: Base común (bloquea todas las historias)

**Propósito**: formatos, periodo, lectura en un instante, ruta, menú, página con su aviso de citas sin cerrar y el componente de gráfico

**⚠️ CRÍTICO**: ninguna historia puede empezar hasta terminar esta fase

### Tests de la base (primero, deben fallar)

- [X] T003 [P] Añadir a tests/unit/formato.test.js tests `RA7` de `porcentaje(numerador, denominador)`: `porcentaje(13, 142)` es `9,2 %`; mitad exacta hacia arriba, `porcentaje(1, 16)` es `6,3 %` y `porcentaje(1, 80)` es `1,3 %`; `porcentaje(0, 50)` es `0,0 %`; `porcentaje(3, 0)` es `Sin datos`; `porcentaje(50, 50)` es `100,0 %`. Y tests `004/FR-014` de `horas(minutos)`: `6180` es `103 h`, `4170` es `69,5 h`, `79200` es `1.320 h`, `16470` es `274,5 h`, `735` es `12,25 h`, `45` es `0,75 h` y `0` es `0 h`
- [X] T004 [P] Escribir en tests/unit/analitica.test.js tests de periodo y pertenencia: `RA1` con «hoy» el miércoles 2026-11-04 el periodo va del 2026-09-07 al 2026-11-01 con 8 semanas de lunes a domingo en orden; con «hoy» el lunes 2026-11-09 y el domingo 2026-11-15, del 2026-09-14 al 2026-11-08; la semana en curso nunca está. `RA2` una cita del domingo 2026-11-01 a las 23:45 es de la octava semana, una del lunes 2026-09-07 a las 00:00 de la primera, y una del lunes 2026-11-02 queda fuera. `004/CL días de cambio de hora` el periodo con «hoy» el 2027-04-07 contiene el 28/03/2027 y sus semanas siguen siendo de 7 días. `RA4` la capacidad semanal es 3.300 minutos y sale de `APERTURA`, `CIERRE` y `esDiaLaborable`. `RA6` una cita `reservada` con `inicio <= ahora` cuenta como sin cerrar y no suma en nada; con `inicio` un minuto después de `ahora`, no es sin cerrar
- [X] T005 [P] Escribir tests/unit/trazabilidad-004.test.js, con la mecánica de tests/unit/trazabilidad.test.js y sin modificar ese archivo: lee specs/004-panel-analitica/spec.md y extrae las reglas (`/^- \*\*(RA\d+)/gm`), los criterios (`/^- \*\*(SC-\d{3})\*\*/gm`) y los escenarios por historia (`004/H{historia}-E{n}`). Tests `004/SC-008`: la spec tiene RA1 a RA8, 22 escenarios y 8 criterios; cada uno, salvo `SC-006`, aparece en un nombre de test que empieza por `RA\d` o por `004/`, con la frontera `(?<![/\p{L}\d_-])` delante del identificador (para escenarios y criterios, buscando `004/H1-E1` o `004/SC-001` literalmente); un nombre que empieza por `SC-001` sin prefijo no cubre `004/SC-001`; y specs/004-panel-analitica/checklists/entrega.md contiene `SC-006`. Queda en rojo hasta T047, y su lista de pendientes guía las fases siguientes
- [X] T006 Escribir en tests/integracion/rutas-analitica.test.js, con `panelDeSemilla()` de T002, los tests de la base: `004/FR-005` la página dice «Del 07/09/2026 al 01/11/2026: las 8 últimas semanas completas. La semana en curso no cuenta hasta que termina.»; `004/FR-003` el menú de `/agenda` y de `/analitica` tiene «Agenda», «Nueva cita», «Analítica» y «Salir» en ese orden, y `/acceso` no tiene el menú; `004/FR-016` con el reloj fijado aparece el aviso de FR-043 de la 001; `RA6` y `004/FR-011` con `momentoFijado: '2026-11-11T12:00'` aparece «Hay 31 citas sin cerrar en este periodo: ya ha pasado su hora y siguen como reservadas. No cuentan en ninguna cifra, y las cifras estarán completas cuando recepción las cierre.» con un enlace «Ir a la agenda» a `/agenda`, y con el reloj en el 04/11 no aparece; `RA6` con una sola cita sin cerrar, el texto en singular del contrato (depende de T002)

### Implementación de la base

- [X] T007 [P] Añadir a src/dominio/formato.js `porcentaje(numerador, denominador)`, que devuelve `Sin datos` si el denominador es 0 y si no calcula las décimas con enteros, `Math.floor((2000 * numerador + denominador) / (2 * denominador))`, y las escribe con coma decimal y ` %` (`9,2 %`); y `horas(minutos)`, que escribe las horas exactas sin redondear, con los miles con punto y hasta dos decimales sin ceros sobrantes (`103 h`, `69,5 h`, `12,25 h`, `1.320 h`) (hace pasar T003)
- [X] T008 Crear src/dominio/analitica.js, puro y sin acceso a la base, con: `periodoDe(hoy)` que devuelve `{ inicio, fin, semanas: [8 × { inicio, fin }] }` según RA1 (lunes en curso = `sumarDias(hoy, -((diaDeSemana(hoy) + 6) % 7))`, inicio = `sumarDias(lunes, -56)`, fin = `sumarDias(lunes, -1)`); `semanaDe(periodo, inicioCita)` que devuelve el índice 0 a 7 por la fecha local de inicio (RA2) o `-1` si queda fuera; `capacidadSemanal()` que suma `minutosEntre` de `APERTURA` a `CIERRE` de src/dominio/huecos.js por cada día laborable de la semana (RA4); `clasificar(cita, ahora)` que devuelve `completada`, `no_asistida`, `cancelada`, `sin_cerrar` (con `sinCerrar` de src/dominio/estados.js, FR-040) o `fuera`; y `calcularPanel({ hoy, ahora, profesionales, servicios, citas })` que por ahora devuelve `{ periodo, sinCerrar, capacidadSemanal }`, donde `sinCerrar` cuenta las citas del periodo clasificadas como `sin_cerrar` (hace pasar T004)
- [X] T009 Crear src/datos/analitica.js, solo con `SELECT`: `transaccionLectura(bd, fn)` que ejecuta `BEGIN` diferido, llama a `fn`, hace `COMMIT` y, si `fn` lanza, `ROLLBACK` y relanza (research.md §2); y `leerDatosPanel(bd, clinicaId, periodo)` que, dentro de esa transacción, lee los profesionales (`id`, `nombre`, orden de `id`), los servicios (`id`, `nombre`, `duracion_min`, `precio_centimos`, orden de `id`) y las citas del periodo con `SELECT cita.profesional_id, cita.servicio_id, cita.estado, cita.inicio, servicio.duracion_min, servicio.precio_centimos FROM cita JOIN servicio ON servicio.id = cita.servicio_id WHERE cita.clinica_id = ? AND cita.inicio >= ? AND cita.inicio < ?` con `${periodo.inicio}T00:00` y el lunes en curso a las `T00:00`. No une `paciente` ni lee `paciente_id`, `fin`, `origen_cancelacion` ni `momento_cancelacion` (FR-012, data-model.md)
- [X] T010 Crear src/web/vistas/analitica.js con `vistaAnalitica({ clinica, panel, momentoFijado })` que usa `layout` y `html` de src/web/plantilla.js: `<h1>Analítica</h1>`, la frase del periodo, el aviso de RA6 con `role="status"` en plural o singular según el contrato, y el componente `graficoBarras({ titulo, escala, filas: [{ etiqueta, cifra, proporcion }] })` que genera `<table class="grafico">` con `<caption>`, la escala en texto bajo el título, y por fila `<th scope="row">` con la etiqueta, la cifra en texto y `<span class="grafico__barra" aria-hidden="true" style="inline-size: N%">`, sin barra cuando la proporción es 0. Añadir también `escalaPorcentaje(valores)` (de 0 % al primer múltiplo de 10 % igual o superior al mayor, mínimo 10 %) y `escalaImporte(valores)` (de 0,00 € al mayor), con su texto «Escala de 0 % a 30 %» o «Escala desde 0,00 €» (research.md §7)
- [X] T011 Crear src/web/rutas/analitica.js con `rutasAnalitica = [{ metodo: 'GET', patron: '/analitica', manejador }]`, donde el manejador calcula `ahora = ahoraLocal(contexto, clinica.zona_horaria)` y `hoy = ahora.slice(0, 10)`, lee con `leerDatosPanel`, calcula con `calcularPanel` y devuelve `pagina(vistaAnalitica(...))`, ignorando `consulta`; registrarla en src/web/servidor.js junto a las demás rutas, sin marcarla como pública (depende de T008, T009 y T010)
- [X] T012 [P] Añadir en src/web/plantilla.js el enlace `<a class="boton boton--claro" href="/analitica">Analítica</a>` al menú principal, entre «Nueva cita» y el formulario de «Salir»
- [X] T013 [P] Añadir a src/web/estaticos/estilos.css los estilos de `.grafico` (tabla a todo el ancho, `caption` alineado a la izquierda, escala en `--tinta-suave`), de `.grafico__barra` (bloque de `block-size: 0.75rem` con fondo `--marca`, que en pantallas estrechas va bajo la etiqueta y la cifra) y de las tablas de recuentos, con números alineados a la derecha, sin desplazamiento horizontal a 360 píxeles y comprobando que la cabecera con cuatro controles sigue cabiendo a 360 píxeles (hace pasar T006 con T011 y T012)

**Punto de control**: `/analitica` abre con sesión, enseña el periodo y el aviso de RA6, y el menú tiene «Analítica». La suite de la 001 sigue en verde.

---

## Fase 3: Historia de usuario 1 - Ver los ingresos por servicio (Prioridad: P1) 🎯 MVP

**Objetivo**: los ingresos de cada servicio y su total, en céntimos exactos

**Prueba independiente**: con la semilla y el reloj en el 04/11/2026, cada importe es el número de completadas por el precio del servicio, y el total es 15.380,00 €

### Tests de la historia 1 (primero, deben fallar)

- [ ] T014 [P] [US1] Añadir a tests/unit/analitica.test.js tests `RA5`: con citas propias, los ingresos suman en céntimos el `precio_centimos` de cada completada y nada de las no asistidas, canceladas ni sin cerrar; un servicio sin completadas aparece con 0 citas y 0 céntimos; el orden es el de `id` de servicio; y `004/FR-013` el total es la suma de los servicios
- [ ] T015 [P] [US1] Añadir a tests/integracion/rutas-analitica.test.js tests `004/H1-E1` (filas «Sesión de fisioterapia» con «220 citas · 8.800,00 €», «Primera visita de fisioterapia» con «40 citas · 2.000,00 €», «Consulta de nutrición» con «82 citas · 2.870,00 €» y «Primera consulta de nutrición» con «38 citas · 1.710,00 €»), `004/H1-E2` («Total del periodo: 15.380,00 €»), `004/H1-E3` (con citas propias en `crearEscenario()`: una completada, una no asistida, una cancelada y una sin cerrar del mismo servicio dan «1 cita · 40,00 €») y `004/H1-E4` (un servicio sin completadas muestra «0 citas · 0,00 €»), y `004/FR-010` la frase llana de ingresos está visible bajo su `<h2>`

### Implementación de la historia 1

- [ ] T016 [US1] Ampliar `calcularPanel` en src/dominio/analitica.js con `ingresos: { servicios: [{ servicio, completadas, centimos }], total }`, sumando en enteros; si `total` no es igual a la suma de los servicios, lanzar un error (data-model.md, invariante 1) (hace pasar T014)
- [ ] T017 [US1] Añadir a src/web/vistas/analitica.js la sección «Ingresos por servicio», con su frase llana del contrato, el gráfico «Ingresos por servicio» con `escalaImporte`, la cifra «N citas · importe» (con `euros()`, singular «1 cita») y «Total del periodo: …» fuera de las barras (hace pasar T015)

**Punto de control**: la historia 1 se puede enseñar sola.

---

## Fase 4: Historia de usuario 2 - Ver la tasa de no asistencia por profesional (Prioridad: P1)

**Objetivo**: la tasa de RA3 por profesional y de la clínica, con sus recuentos

**Prueba independiente**: con la semilla, la tasa y los recuentos coinciden con la tabla de referencia de RA3

### Tests de la historia 2 (primero, deben fallar)

- [ ] T018 [P] [US2] Añadir a tests/unit/analitica.test.js tests `RA3`: la tasa es `{ numerador: noAsistidas, denominador: completadas + noAsistidas }`; las canceladas de origen `recepcion`, `portal` y `correo` se cuentan aparte y no entran en la tasa; un profesional con citas y ninguna no asistida tiene tasa 0 (que se muestra `0,0 %`) y uno sin citas, denominador 0. `RA7` la tasa de la clínica sale de los recuentos totales: con dos profesionales de 1 de 2 y 0 de 8, la clínica es 1 de 10 (10,0 %), no la media de 50 % y 0 %
- [ ] T019 [P] [US2] Añadir a tests/integracion/rutas-analitica.test.js tests `004/H2-E1` (filas de la tabla de recuentos `María | 129 | 13 | 9 | 9,2 %`, `Jorge | 131 | 14 | 13 | 9,7 %`, `Lucía | 120 | 19 | 15 | 13,7 %` y del gráfico «Tasa de no asistencia» con las mismas tasas), `004/H2-E2` (`Toda la clínica | 380 | 46 | 37 | 10,8 %`) y `004/H2-E3` (la frase llana de la tasa está visible bajo su `<h2>`, sin pulsar nada)

### Implementación de la historia 2

- [ ] T020 [US2] Ampliar `calcularPanel` en src/dominio/analitica.js con `noAsistencia: { profesionales: [{ profesional, completadas, noAsistidas, canceladas, tasa }], clinica: { completadas, noAsistidas, canceladas, tasa } }`, con la clínica desde los recuentos totales, y comprobar que la suma por profesional es igual a la de la clínica (invariante 2) (hace pasar T018)
- [ ] T021 [US2] Añadir a src/web/vistas/analitica.js la sección «No asistencia por profesional», con su frase llana, el gráfico «Tasa de no asistencia» (una fila por profesional y «Toda la clínica», cifra con `porcentaje()`, escala con `escalaPorcentaje`) y la tabla de recuentos con columnas «Profesional», «Completadas», «No asistidas», «Canceladas» y «Tasa» (hace pasar T019)

**Punto de control**: las historias 1 y 2 funcionan juntas y por separado.

---

## Fase 5: Historia de usuario 5 - Consultar sin riesgo: solo con clave y sin tocar nada (Prioridad: P1)

**Objetivo**: demostrar que el panel solo se abre con la sesión de recepción de su clínica, que no escribe nada y que no enseña datos de pacientes

**Prueba independiente**: sin sesión y con sesión de paciente se rechaza; el contenido de la base no cambia tras abrirlo; la página no tiene datos de pacientes

### Tests de la historia 5 (primero, deben fallar donde falte algo)

- [ ] T022 [P] [US5] Añadir a tests/integracion/rutas-analitica.test.js tests `004/H5-E1` (con sesión, el enlace «Analítica» del menú lleva a `/analitica` y responde 200), `004/H5-E2` y `004/FR-001` (sin cookie, `GET /analitica` da 303 a `/acceso` y `POST /analitica` da 401, sin «15.380», «María» ni ningún `%` en el cuerpo), y `004/H5-E8` (con `sesionPacienteDePrueba` de tests/ayudas/escenario.js, el token en la cookie `sesion_paciente` y también puesto en la cookie `sesion` da lo mismo que sin sesión, sin ninguna cifra)
- [ ] T023 [P] [US5] Añadir a tests/integracion/rutas-analitica.test.js el test `004/H5-E3` y `004/FR-002`: con la semilla cargada en `crearEscenario()`, añadir con `citaDirecta` completadas a «Clínica Sur»; el panel de «Clínica Eleva» sigue dando 15.380,00 € y el de «Clínica Sur» solo enseña sus profesionales, sus servicios y sus importes
- [ ] T024 [P] [US5] Añadir a tests/integracion/rutas-analitica.test.js los tests `004/H5-E4`, `004/SC-003` y `RA8`: tras abrir la sesión, volcar el contenido lógico de todas las tablas (`SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name` y, por cada una, `SELECT * FROM <tabla> ORDER BY rowid`), abrir `/analitica` 100 veces y comprobar que el volcado es idéntico; y que ninguna respuesta lleva cabecera `set-cookie`
- [ ] T025 [P] [US5] Añadir a tests/integracion/rutas-analitica.test.js el test `004/H5-E5`: la página no tiene ningún `<form>` ni botón; `POST`, `PUT` y `DELETE` sobre `/analitica` y `POST /analitica/exportar` con sesión dan 404, y el volcado de T024 no cambia
- [ ] T026 [P] [US5] Añadir a tests/integracion/rutas-analitica.test.js el test `004/H5-E6` y `004/FR-012`: la página completa no contiene ninguno de los nombres, teléfonos, correos ni enlaces de las filas de `paciente` de la semilla
- [ ] T027 [P] [US5] Escribir tests/unit/analitica-solo-lectura.test.js con el test `RA8` y `004/FR-018`: src/datos/analitica.js, src/dominio/analitica.js, src/web/rutas/analitica.js y src/web/vistas/analitica.js no contienen `INSERT`, `UPDATE`, `DELETE`, `REPLACE`, `CREATE`, `DROP`, `ALTER` ni `transaccionInmediata`, sin distinguir mayúsculas; y ninguno de ellos importa src/semilla/ ni src/datos/citas.js

### Implementación de la historia 5

- [ ] T028 [US5] Corregir lo que hayan sacado T022 a T027. Lo esperado es que pasen sin cambios con la base de la fase 2; si alguno falla, el arreglo va en los archivos de la 004, nunca relajando el test

**Punto de control**: las tres historias P1 están completas: es el MVP que Sara puede enseñar.

---

## Fase 6: Historia de usuario 3 - Ver la ocupación semanal por profesional (Prioridad: P2)

**Objetivo**: la ocupación de RA4 por profesional en cada semana y en el periodo, y la de la clínica

**Prueba independiente**: las 24 celdas y la tabla del periodo coinciden con las de referencia

### Tests de la historia 3 (primero, deben fallar)

- [ ] T029 [P] [US3] Añadir a tests/unit/analitica.test.js tests `RA4`: el tiempo de una cita es la `duracion_min` de su servicio; solo cuentan las completadas, y no las no asistidas, canceladas ni reservadas; la capacidad de la clínica es la semanal × 8 × número de profesionales. `004/CL profesional sin citas` una semana sin citas da 0 minutos y `0,0 %`. `004/CL festivos` un lunes con citas cuenta como día normal y la capacidad no baja. `RA7` la ocupación del periodo sale de los minutos del periodo, no de promediar las semanas
- [ ] T030 [P] [US3] Añadir a tests/integracion/rutas-analitica.test.js tests `004/H3-E1` (gráficos «Ocupación de María», «Ocupación de Jorge» y «Ocupación de Lucía», cada uno con «Semana del 07/09/2026» a «Semana del 26/10/2026» y «Las 8 semanas», con las 24 cifras de la tabla «Ocupación semanal por profesional» de referencia y 23,4 %, 23,2 % y 15,8 % en «Las 8 semanas»; los tres con la misma escala, «Escala de 0 % a 30 %»), `004/H3-E2` (tabla del periodo `María | 440 h | 103 h | 23,4 %`, `Jorge | 440 h | 102 h | 23,2 %`, `Lucía | 440 h | 69,5 h | 15,8 %` y `Toda la clínica | 1.320 h | 274,5 h | 20,8 %`) y `004/H3-E3` (la frase llana de ocupación, con «de lunes a viernes de 09:00 a 20:00» y «55 horas», visible bajo su `<h2>`)

### Implementación de la historia 3

- [ ] T031 [US3] Ampliar `calcularPanel` en src/dominio/analitica.js con `ocupacion: { profesionales: [{ profesional, semanas: [8 × { minutos, ocupacion }], periodo: { capacidad, minutos, ocupacion } }], clinica: { capacidad, minutos, ocupacion } }`, con `ocupacion = { numerador: minutos, denominador: capacidad }`, y comprobar que la suma de los minutos del periodo por profesional es igual a la de la clínica (invariante 3) (hace pasar T029)
- [ ] T032 [US3] Añadir a src/web/vistas/analitica.js la sección «Ocupación semanal por profesional», con su frase llana generada a partir de `APERTURA`, `CIERRE` y `horas(capacidadSemanal)`, un gráfico por profesional con una escala común calculada con `escalaPorcentaje` sobre las 27 cifras, y la tabla del periodo con columnas «Profesional», «Capacidad», «Horas completadas» y «Ocupación» (hace pasar T030)

**Punto de control**: las historias 1, 2, 3 y 5 funcionan juntas.

---

## Fase 7: Historia de usuario 4 - Ver la evolución de las últimas 8 semanas (Prioridad: P2)

**Objetivo**: ocupación, tasa e ingresos de la clínica semana a semana, con sus recuentos

**Prueba independiente**: los 8 puntos de cada serie coinciden con la tabla «Evolución de la clínica» de referencia

### Tests de la historia 4 (primero, deben fallar)

- [ ] T033 [P] [US4] Añadir a tests/unit/analitica.test.js tests de evolución: 8 semanas en orden cronológico, cada una con recuentos, tasa, ocupación de la clínica (minutos ÷ capacidad semanal × profesionales) y céntimos; `004/FR-013` la suma de los céntimos de las semanas es igual al total por servicio y, si no, `calcularPanel` lanza un error; `004/CL clínica con menos de 8 semanas de datos` las semanas vacías salen con 0 citas, 0 céntimos y tasa de denominador 0
- [ ] T034 [P] [US4] Añadir a tests/integracion/rutas-analitica.test.js tests `004/H4-E1` (los tres gráficos «Ocupación de la clínica», «Tasa de no asistencia de la clínica» e «Ingresos de la clínica» tienen 8 filas, de «Semana del 07/09/2026» a «Semana del 26/10/2026», en orden), `004/H4-E2` (filas `07/09/2026 | 42 | 8 | 7` y `26/10/2026 | 42 | 7 | 6` de la tabla de recuentos, y 1.975,00 € y 1.620,00 € en el gráfico de ingresos; y las ocho tasas, ocupaciones e ingresos de la tabla de referencia), `004/H4-E3` («Total de las 8 semanas: 15.380,00 €» y fila `Total | 380 | 46 | 37`) y `004/H4-E4` (no aparece «Semana del 02/11/2026» con el reloj en el 04/11)

### Implementación de la historia 4

- [ ] T035 [US4] Ampliar `calcularPanel` en src/dominio/analitica.js con `evolucion: [8 × { semana, completadas, noAsistidas, canceladas, tasa, ocupacion, centimos }]` y completar los tres invariantes de data-model.md con las sumas por semana (hace pasar T033)
- [ ] T036 [US4] Añadir a src/web/vistas/analitica.js la sección «Evolución de las últimas 8 semanas», con su frase llana, los tres gráficos (escala de porcentaje para los dos primeros, de importe para el tercero), «Total de las 8 semanas: …» bajo el de ingresos y la tabla de recuentos con columnas «Semana», «Completadas», «No asistidas» y «Canceladas» y la fila «Total» (hace pasar T034)

**Punto de control**: las cinco historias están completas.

---

## Fase 8: Cierre y aspectos transversales

**Propósito**: cifras completas, instante único, rendimiento, otras fechas, interfaz y entrega

- [ ] T037 [P] Añadir a tests/integracion/rutas-analitica.test.js el test `004/SC-001`: cada cifra de las cuatro tablas de [Cifras de referencia](spec.md#cifras-de-referencia), escritas como literales en el test, aparece en el texto visible de la página en su fila
- [ ] T038 [P] Añadir a tests/integracion/rutas-analitica.test.js el test `004/CL citas sin cerrar dentro del periodo`: con `momentoFijado: '2026-11-11T12:00'`, periodo «Del 14/09/2026 al 08/11/2026», aviso con 31, y la semana del 02/11/2026 con 0 completadas, 0,00 € y «Sin datos» de no asistencia
- [ ] T039 [P] Añadir a tests/integracion/rutas-analitica.test.js los tests `004/SC-005` y `004/FR-017`: con `panelDeSemilla({ lunes: '2027-01-04', momentoFijado: '2027-01-06T12:00' })` y con `panelDeSemilla({ lunes: '2027-04-05', momentoFijado: '2027-04-07T12:00' })`, las cifras de la página son las mismas que con la semilla por defecto una vez quitadas las fechas, y el periodo es «Del 09/11/2026 al 03/01/2027» y «Del 08/02/2027 al 04/04/2027», respectivamente; el segundo contiene el cambio de hora del 28/03/2027
- [ ] T040 [P] Añadir a tests/integracion/rutas-analitica.test.js los tests `004/FR-016` y `004/CL límite de semana`: sin `momentoFijado` y con `ahora: relojFijo('2026-11-08T23:30:00Z')` (lunes 09/11 a las 00:30 peninsulares y domingo 08/11 a las 23:30 en Canarias), el panel de «Clínica Norte» (Madrid) dice «Del 14/09/2026 al 08/11/2026» y el de «Clínica Sur» (Canarias), «Del 07/09/2026 al 01/11/2026»; y una cita de la clínica de Canarias del lunes 02/11/2026 a las 09:00 no cuenta en el periodo de esta última
- [ ] T041 [P] Escribir tests/concurrencia/trabajador-cerrar.js, proceso hijo con su propia conexión `abrirBd(ruta)`, que recibe identificadores de citas por mensaje y las completa una a una con `cambiarEstado(bd, id, 'completada')` de src/datos/citas.js, avisando con `process.send` tras cada una, y termina con un mensaje vacío, como tests/concurrencia/trabajador.js
- [ ] T042 Escribir tests/concurrencia/analitica.test.js con el test `004/SC-002` y `004/FR-015`: semilla en un archivo temporal, servidor con `momentoFijado: '2026-11-11T12:00'`, el proceso de T041 completando las 31 citas sin cerrar mientras el principal abre `/analitica` al menos 200 veces; en cada apertura, «Total del periodo» es igual a la suma de los servicios y a la suma de las semanas, y completadas + no asistidas + canceladas + sin cerrar es siempre el mismo número. Al final, sin aviso y con las 31 sumadas (depende de T041)
- [ ] T043 [P] Escribir tests/integracion/analitica-rendimiento.test.js con el test `004/SC-004`: con `panelDeSemilla()`, `GET /analitica` responde 200 en menos de 1 segundo, medido con `performance.now()` como tests/integracion/rendimiento.test.js
- [ ] T044 [P] Añadir a tests/integracion/rutas-analitica.test.js el test `004/FR-022` de textos: el texto visible de `/analitica` no contiene `no_asistida`, `reservada` ni `completada` en singular, `undefined`, `null`, `NaN` ni `[object`, con la misma expresión que tests/integracion/textos.test.js
- [ ] T045 Escribir tests/e2e/analitica.spec.js, con `entrar` y `auditarPantalla` de tests/e2e/ayudas.js, en los proyectos `movil` (360 píxeles) y `portatil`: `004/H5-E7` y `004/SC-007` sin desplazamiento horizontal, texto a 4,5:1 y controles de 44 × 44; `004/FR-020` cada `.grafico__barra` visible tiene contraste de al menos 3:1 con el fondo de su fila y cada fila de gráfico tiene su etiqueta en texto; `004/FR-019` cada cifra está en el texto de la página sin pasar el ratón y las barras tienen `aria-hidden="true"`; `004/FR-021` toda escala empieza en «0 %» o «0,00 €»; `004/H5-E1` en el navegador se llega a «Analítica» desde el menú de la agenda. El servidor e2e de tests/e2e/servidor-e2e.js tiene el reloj en el 04/11/2026 a las 10:00, así que el periodo es el de las cifras de referencia
- [ ] T046 Ejecutar `npm run test:e2e` completo y comprobar que las pruebas de accesibilidad de la 001 siguen en verde con la nueva entrada del menú en todas las pantallas; si la cabecera desborda a 360 píxeles, ajustar src/web/estaticos/estilos.css sin quitar ninguna entrada
- [ ] T047 Crear specs/004-panel-analitica/checklists/entrega.md con el protocolo manual de `SC-006` (justificación del principio VI escrita en la spec; al menos 10 personas sin formación; semilla con el lunes de la semana en curso y `npm start`; tareas literales «¿Cuánto ha ingresado la clínica por la consulta de nutrición en estas 8 semanas?» y «¿Qué tasa de no asistencia tiene Lucía?»; cronómetro, éxito si responden en menos de 1 minuto con lo que ven; resultado «al menos 9 de cada 10»), y las puertas de entrega: suite en verde, cifras de referencia reproducidas, spec aprobada y FR-039 de la 001 antes de usar datos reales (hace pasar la última parte de T005)
- [ ] T048 Ejecutar `npm test` y `npm run test:e2e`: todo en verde, incluidos tests/unit/trazabilidad.test.js de la 001 sin cambios y tests/unit/trazabilidad-004.test.js sin pendientes
- [ ] T049 Validar a mano los escenarios 2 a 6 de [quickstart.md](quickstart.md) con `npm run semilla` y `CITACLARA_AHORA`, y anotar el resultado en specs/004-panel-analitica/checklists/entrega.md

---

## Dependencias y orden de ejecución

### Entre fases

- **Fase 1** (preparación): sin dependencias.
- **Fase 2** (base): depende de la fase 1. **Bloquea todas las historias.**
- **Fases 3 a 7** (historias): dependen de la fase 2. Entre sí solo comparten src/dominio/analitica.js, src/web/vistas/analitica.js y tests/integracion/rutas-analitica.test.js, así que en paralelo hay que coordinar esos tres archivos; en secuencia, el orden es de prioridad: US1 → US2 → US5 → US3 → US4.
- **US5** (fase 5) no añade código propio: comprueba lo que construyen la base y las historias anteriores, y conviene hacerla tras US1 y US2 para que T026 revise una página con cifras.
- **US4** (fase 7) completa los invariantes con las sumas por semana, así que su T035 cierra lo que empiezan T016, T020 y T031.
- **Fase 8**: T037, T038, T039, T042 y T045 necesitan las cinco historias. T041, T043 y T044 pueden empezar tras la fase 2.

### Dentro de cada historia

- Los tests primero, y deben fallar.
- Dominio (`calcularPanel`) antes de la vista.
- Cada historia termina en verde antes de pasar a la siguiente.

### Oportunidades en paralelo

- Fase 2: T003, T004 y T005 a la vez; luego T007, T012 y T013 a la vez, mientras se hacen T008 a T010.
- En cada historia, sus dos tareas de test [P] a la vez (T014 y T015; T018 y T019; T029 y T030; T033 y T034).
- Fase 5: T022 a T027 a la vez, porque son tests independientes; si van al mismo archivo, en bloques `describe` separados.
- Fase 8: T037 a T041, T043 y T044 a la vez.

## Ejemplos en paralelo

```text
# Historia 1: tests a la vez
T014 tests RA5 en tests/unit/analitica.test.js
T015 tests 004/H1-E1 a 004/H1-E4 en tests/integracion/rutas-analitica.test.js

# Historia 5: comprobaciones a la vez
T022 acceso, T023 dos clínicas, T024 volcado tras 100 aperturas,
T025 escrituras rechazadas, T026 sin pacientes, T027 test estático

# Cierre
T041 trabajador de concurrencia, T043 rendimiento, T044 textos
```

---

## Estrategia de implementación

### Primero el MVP

1. Completar las fases 1 y 2.
2. Completar la fase 3 (US1): ingresos por servicio.
3. **Parar y validar**: con `CITACLARA_AHORA=2026-11-04T12:00 npm start`, el panel enseña los cuatro servicios y 15.380,00 €.
4. Completar US2 y US5: las tres historias P1 son lo mínimo para la conversación de renovación (tasa e ingresos, con la garantía de que el panel no toca nada).

### Entrega incremental

1. Base → página con periodo y aviso.
2. US1 → ingresos.
3. US2 → no asistencia.
4. US5 → acceso y solo lectura demostrados.
5. US3 → ocupación.
6. US4 → evolución.
7. Fase 8 → cifras completas, concurrencia, otras fechas, accesibilidad y entrega. Se integra en `master` solo con todo en verde.

---

## Notas

- Comprobar que cada test falla antes de implementar.
- Hacer commit tras cada tarea o grupo lógico.
- Ningún test se desactiva ni se relaja. Si deja de ser válido, primero se corrige la spec (principio VI).
- Si una cifra no coincide con la de referencia, el defecto está en la implementación (principio V): las cifras se comprobaron contra la semilla de `master` el 11/11/2026.
- Si un invariante de cuadre falla, la página no se muestra con cifras que no cuadran (principio II).
- Ninguna tarea modifica el esquema, la semilla ni src/datos/bd.js (FR-018).
