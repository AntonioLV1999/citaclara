# Investigación: Portal del paciente

**Feature**: [spec.md](spec.md) | **Fecha**: 11/11/2026 | **Plan**: [plan.md](plan.md)

Punto de partida: el código de `master` (`f965be1`), que ya implementa los dos cambios aprobados de la 001: la operación única de cancelar (`cancelarCita`, FR-038), el plazo de RN8, el origen y el momento de la cancelación (FR-036), `sinCerrar` (FR-040), `etiquetaCita` (FR-027), la tabla `sesion_paciente` (FR-037), el teléfono de la clínica y los enlaces de demostración de la semilla (FR-029), y el momento de referencia `CITACLARA_AHORA` (FR-043). La rama `002-portal-paciente` todavía no los tiene: hay que rebasarla antes de implementar (ver [plan.md](plan.md#requisito-previo-rebase-sobre-master)).

Entorno comprobado: Node 26 y SQLite 3.54.0 dentro de `node:sqlite`.

## 1. Reparto del modelo común entre la 002 y la 003 (RP6, RP7)

- **Decisión**: la 002 implementa todo el modelo común de acceso del paciente, también la parte que afecta al enlace de cancelación: la tabla `enlace_cancelacion`, la ruta única que abre los dos tipos de enlace, la respuesta uniforme, el límite de intentos, las sesiones con alcance de ficha o de una sola cita, y la anulación en cascada de RP7. La 003 genera los enlaces de cancelación con cada recordatorio (inserta filas en esa tabla) y construye la pantalla de cancelación del correo (003/FR-011 y 003/FR-014). Su contrato está en [modelo-acceso.md](contracts/modelo-acceso.md).
- **Razón**: la spec hace a la 002 propietaria del modelo común (RP6), y varios escenarios suyos solo se pueden probar con enlaces de cancelación: H1-E3, H1-E4, H1-E6, H1-E8 y SC-004. Es el mismo criterio que siguió la 001 con `sesion_paciente` (research de la 001, §11): la tabla está donde lo exige la regla, y los tests insertan las filas directamente hasta que llegue la feature que las crea.
- **Vigencia del enlace de cancelación**: la fija RR6 de la 003 (decisión D5): vale hasta la hora de inicio de la cita. La 002 aplica esa regla en su resolución de enlaces, porque FR-003 le pide responder igual a un enlace «caducado», y no se puede probar sin ella. La regla sigue siendo de la 003: la 002 la cita y no la redefine. Si la 003 cambia RR6, cambia esa función.
- **Alternativas descartadas**:
  - Que la 003 cree la tabla: la 002 no podría probar RP7 ni la respuesta uniforme hasta que la 003 estuviera en `master`, y dos features tendrían que coordinar el orden de sus merges.
  - Un mecanismo de extensión para que cada feature registre su tipo de enlace: es preparación para un futuro que ninguna spec pide (principio IV). Hay exactamente dos tipos, y la spec los nombra.

## 2. Forma del enlace, ruta única y dirección pública (FR-025, FR-026, FR-042)

- **Token**: 32 caracteres hexadecimales en minúscula, 128 bits (D7). Un solo generador para todos los enlaces reales, el de SQLite: `lower(hex(randomblob(16)))`. `randomblob` usa el generador de SQLite, sembrado con entropía del sistema operativo. Comprobado en `node:sqlite` 3.54.0. Los enlaces de demostración siguen la derivación de FR-029 de la 001 y ya los escribe la semilla.
- **Enlace completo**: `<dirección pública>/e/<token>`. Es lo que copia recepción y lo que construirá la 003. **El mismo patrón sirve para los dos tipos**, y un enlace no válido no revela su tipo ni por la forma ni por la ruta (FR-003).
- **Resolución**: `GET /e/:token` busca primero el token entre los enlaces personales vigentes, y después entre los enlaces de cancelación vigentes. Cualquier otra cosa, incluido un token mal formado, da la respuesta uniforme.
- **El token sale de la barra de direcciones**: tras abrir la sesión, la respuesta es una redirección 303 a `/portal` (o a la pantalla de la 003). Así el token no se queda en la página que el paciente puede compartir o capturar. Las respuestas del portal llevan `Referrer-Policy: no-referrer`.
- **Dirección pública (FR-042)**: la 002 es la primera feature que construye enlaces, así que crea el ajuste, tal como prevé [configuracion.md de la 001](../001-nucleo-agenda/contracts/configuracion.md). Variable de entorno `CITACLARA_DIRECCION`, con forma `http://…` o `https://…`, sin barra final. Sin valor, `http://localhost:<PORT>`. Con un valor mal escrito, el servidor no arranca, igual que con `CITACLARA_AHORA`. La implementación añade el ajuste a ese contrato de la 001, como el propio contrato pide.
- **«Portal por clínica»** (supuesto de la spec): el portal de cada clínica cuelga de la dirección pública, y el token ya determina la ficha y, con ella, la clínica. Por eso la ruta no lleva un segmento de clínica.
  - **Alternativa descartada**: `/<clínica>/e/<token>`. No añade nada a la seguridad, porque el token ya es único en todo el producto, y un identificador de clínica en la ruta deja probar qué clínicas existen.
- **Alternativa descartada**: guardar solo el hash del enlace personal. FR-002 pide que recepción pueda copiarlo en cualquier momento, así que el enlace personal se guarda tal cual (como ya hace la semilla). El enlace de cancelación sí se guarda como hash SHA-256, porque nadie necesita volver a verlo después del envío.

## 3. Sesiones de paciente (FR-004, FR-005, FR-037 de la 001)

- **Decisión**: se amplía la tabla `sesion_paciente` de la 001 con dos columnas: `cita_id`, que vale `NULL` para una sesión abierta con el enlace personal (alcance de ficha) y la cita para una sesión abierta con un enlace de cancelación (alcance de una cita); y `ultima_actividad`, en milisegundos de tiempo real. El token de la sesión es aleatorio y solo su hash se guarda, igual que en recepción.
- **Cookie**: `sesion_paciente`, `HttpOnly`, `SameSite=Lax`, `Path=/`, sin `Max-Age`.
  - **Por qué `Lax` y no `Strict`**: el paciente abre el enlace desde WhatsApp, un SMS o el correo, es decir, desde otro sitio. Con `Strict`, el navegador no envía la cookie en la redirección que sigue a esa navegación, y el paciente vería «tu sesión ha terminado» nada más entrar. `Lax` la envía en las navegaciones `GET` de primer nivel y no en los `POST` desde otros sitios, de modo que cancelar sigue protegido contra envíos cruzados.
  - La cookie de recepción sigue siendo `Strict`, y no cambia.
- **Inactividad de 30 minutos**: se mide con un reloj de tiempo real inyectable, `relojReal()` (por defecto `Date.now`), nunca con `ahoraLocal`, como pide el apartado «Esperas» de FR-043 de la 001. Cada petición con sesión válida actualiza `ultima_actividad`. Una sesión caducada se borra al detectarse.
- **Salir**: `POST /portal/salir` borra la sesión de paciente y su cookie. No toca la de recepción, ni al revés.
- **Separación de recepción**: el servidor de la 001 solo lee la cookie `sesion` y la tabla `sesion`. Las rutas del portal solo leen `sesion_paciente`. Una sesión de recepción no abre nada del portal (FR-005).
- **Alternativa descartada**: guardar la actividad en memoria. Una sesión válida sobreviviría a un reinicio sin actividad registrada, y el almacén ya tiene la sesión.

## 4. Límite de intentos con enlaces no válidos (FR-004)

- **Decisión**: un contador en memoria por dirección IP de origen. **10 enlaces no válidos en 10 minutos bloquean esa dirección durante 15 minutos.** Los dos tipos cuentan juntos, porque comparten la ruta. Se mide con `relojReal()`.
- **Durante el bloqueo se rechaza cualquier enlace**, también uno válido. Si los válidos pasaran, el mensaje de bloqueo seguiría distinguiendo los enlaces buenos de los malos, y el límite no protegería nada.
- **Mensaje**: dice qué ha pasado y qué hacer (esperar, o pedir el enlace a la clínica), y es el mismo sea cual sea el enlace (ver [portal-web.md](contracts/portal-web.md#mensajes)).
- **Valores**: la spec no los fija. 10 intentos dejan margen a quien copia mal su enlace varias veces, y frente a 2¹²⁸ tokens posibles cualquier límite razonable hace inútil adivinar. Se definen como constantes en un solo módulo.
- **Por qué en memoria**: hay un solo servidor (research de la 001, riesgos), y perder los contadores en un reinicio solo regala, como mucho, otros 10 intentos.
- **Alternativa descartada**: guardarlo en SQLite. Añade escrituras en cada enlace no válido, que es justo lo que generaría un ataque, sin ventaja con un solo servidor.
- **Riesgo conocido**: los pacientes que comparten salida a internet (la wifi de la clínica, por ejemplo) comparten contador. Con 10 intentos fallidos en 10 minutos, no es un caso realista.

## 5. Tres clases de ruta (FR-001 de la 001, FR-026)

- **Decisión**: cada ruta declara una de tres clases. Las de recepción, como hasta ahora, exigen la sesión de clínica. Las públicas (`publica: true`) no exigen nada: `GET /acceso`, `POST /acceso` y, desde esta feature, `GET /e/:token`. Las de paciente (`paciente: true`, que implica `publica`) no exigen la clave, pero sí una sesión de paciente válida, con su alcance.
- **Por qué `paciente` implica `publica`**: el filtro de recepción no debe tocarlas, y los tests de la 001 que recorren `servidor.rutasRegistradas` filtrando por `!publica` (H4-E3, H4-E5 y SC-012) siguen siendo correctos sin cambios.
- **Test «FR-001 solo la pantalla de acceso es pública»**: FR-001 de la 001 dice que se ampliará con las rutas públicas del modelo de acceso, y solo con ellas, en el mismo cambio que las cree. Se amplía con `GET /e/:token` y las rutas de paciente del contrato. Un test nuevo, `002/FR-026`, comprueba que cada ruta de paciente rechaza la falta de sesión, la sesión de recepción y la sesión de alcance equivocado.

## 6. Enlace personal de cada ficha y anulación (FR-001, FR-002, RP7)

- **Toda ficha tiene enlace**: la columna `paciente.enlace` pasa a ser `NOT NULL DEFAULT (lower(hex(randomblob(16))))`. Así lo tiene cualquier ficha, la cree el alta, la semilla o un test, sin que nadie dé de alta nada. `crearPaciente` deja de pasar `NULL` cuando no recibe enlace.
- **Esquema versión 3**: el cambio de columna y la tabla nueva no se pueden aplicar con `CREATE TABLE IF NOT EXISTS` sobre un archivo existente. Se sigue la política de la 001 (research de la 001, §16): `VERSION_ESQUEMA` pasa a 3, y un archivo de otra versión se rechaza con el mensaje que pide regenerarlo con `npm run semilla`.
- **Anular** (RP7): una sola transacción `BEGIN IMMEDIATE` que sustituye `paciente.enlace` por un token nuevo, borra los enlaces de cancelación de todas las citas de esa ficha y borra todas sus sesiones de paciente, de los dos alcances. Si algo falla, no cambia nada. En ese mismo instante, el enlace anterior y los de cancelación dan la respuesta uniforme, y las citas no cambian.
- **Copiar**: cada cita de la agenda lleva «Enlace del paciente», que abre `GET /citas/:id/enlace`, con el enlace completo en un campo de solo lectura y un botón «Copiar enlace». Es el mismo patrón que el correo de la ficha de la 001 (FR-041), y FR-013 de la 001 lo admite como excepción.
  - El botón usa `navigator.clipboard`. El navegador solo lo permite en `https` o en `localhost`, así que, si falla, el script selecciona el texto y avisa de que basta con pulsar Ctrl+C. Sin JavaScript, el campo se puede seleccionar a mano.
  - Anular pide confirmación en una página propia, que avisa de que el enlace anterior y los de los recordatorios dejarán de funcionar.

## 7. Qué ve el paciente (RP2, FR-007 a FR-013)

Todo se calcula con las funciones de la 001, sin redefinir nada:

- **Futura**: `estado === 'reservada' && !sinCerrar(cita, ahora)`. Todo lo demás va al historial (RP2).
- **Cancelable**: futura y `dentroDePlazo(cita.inicio, ahora)` (RN8). Si es futura y no cancelable, se muestra «Se podía cancelar hasta el {día} {dd/mm/aaaa} a las {HH:MM}», con `limiteCancelacion(cita.inicio)`, y el teléfono.
- **Etiqueta**: `sinCerrar(cita, ahora)` da «Pendiente de confirmar por la clínica» (D6), y en los demás casos se usa `etiquetaCita(cita)`, la misma de la agenda.
- **«Ahora»**: `ahoraLocal(contexto, clinica.zona_horaria)` (FR-043). Se calcula al cargar la página y otra vez dentro de `cancelarCita`, que es lo que decide (caso límite «El plazo vence con la página abierta»).
- **Sin importes** (FR-008): la consulta del portal no lee `precio_centimos`.
- **Formato**: «lun 09/11/2026, 18:00–18:45». Hace falta el nombre corto del día, que se añade a `src/dominio/formato.js` junto a `nombreDia`.
- **Teléfono**: enlace `tel:` con los dígitos y el `+` del teléfono de la clínica, sin espacios (FR-011).

## 8. Cancelar desde el portal (RP1, RP4, FR-014 a FR-017)

- **Decisión**: `GET /portal/citas/:id/cancelar` muestra la confirmación, y `POST /portal/citas/:id/cancelar` comprueba RP1 y llama a `cancelarCita(contexto, id, 'portal')`. El portal no escribe nada más.
- **RP1 antes de cancelar**: se lee la cita en la clínica de la ficha, y si no existe o su `paciente_id` no es el de la sesión, se responde «no encontrada», igual en los dos casos (H2-E7). Leer la cita fuera de la transacción de `cancelarCita` es seguro, porque `cita_rn4` impide cambiar el paciente de una cita: la comprobación no puede quedarse vieja.
- **Mensajes** según el resultado de FR-038, con los textos de [portal-web.md](contracts/portal-web.md#mensajes):

  | Resultado de `cancelarCita` | Lo que ve el paciente |
  |-----------------------------|-----------------------|
  | `cancelada_ahora` | Confirmación de FR-016, con el teléfono |
  | `ya_cancelada` con origen `portal` o `correo` | La misma confirmación, sin error (doble pulsación, H3-E7) |
  | `ya_cancelada` con origen `recepcion` | «Ya está cancelada», sobre su página actualizada (H3-E6) |
  | `fuera_de_plazo` | El límite devuelto y el teléfono (H3-E4) |
  | `no_cancelable` | Su estado y qué puede hacer, en lenguaje llano |
  | `null` | «No encontrada», igual que una cita ajena |

- **Respuesta directa, no redirección**: tras el `POST` se pinta la página de resultado. Si el paciente la recarga y el navegador reenvía el formulario, FR-038 devuelve «ya estaba cancelada» con origen `portal`, y ve la misma confirmación.
- **Solape** (principio III): cancelar nunca añade ocupación, así que no puede crear un solape. Lo que sí hay que probar es la reserva del tramo liberado: va por el alta de la 001 y su disparador `cita_solape`. Las pruebas de SC-005 reutilizan los trabajadores con barrera de `tests/concurrencia/`.

## 9. Lista de huecos liberados (FR-019, FR-020)

- **Decisión**: una consulta, sin tabla nueva. Toma las citas canceladas con origen `portal` o `correo`, de cualquier profesional de la clínica, cuyo inicio sea posterior a «ahora», y descarta las que tengan alguna cita reservada o completada del mismo profesional que se cruce con su tramo. Ordena por inicio, y une las que tengan el mismo profesional, inicio y fin, para que una cita cancelada dos veces en el mismo tramo no salga repetida.
- **Dónde**: en la página de la agenda de la 001, encima de la agenda del día, para cualquier profesional y día. Cada hueco enlaza a `/agenda?profesional=…&dia=…`.
- **Sale de la lista** en cuanto se reserva parte de su tramo o llega su inicio, porque la consulta se evalúa en cada carga. No hay nada que limpiar.
- **El sistema no hace nada más** (FR-020): ni ocupa el hueco ni avisa a nadie.
- **Alternativa descartada**: una tabla de huecos liberados. Habría que mantenerla en cada reserva y cada cancelación, y podría desincronizarse de la agenda.

## 10. Interfaz móvil (FR-021 a FR-023)

- **Decisión**: un `layoutPortal` propio en `src/web/plantilla.js`, sin el menú de recepción, con el nombre de la clínica y su teléfono arriba, y una hoja de estilos compartida con la 001. Una sola columna a 360 píxeles. La primera tarjeta de «Próximas citas» lleva su botón «Cancelar», y entra en 360 × 640 sin desplazarse (FR-022).
- **Sin aviso de reloj fijado en el portal**: FR-043 de la 001 lo exige solo en las pantallas de recepción. Añadirlo al portal sería alcance que ninguna spec pide (principio IV).
- **HTML generado en el servidor y formularios con `POST`**, como en la 001. El portal funciona sin JavaScript. El único script nuevo es el de copiar el enlace, en la agenda.

## 11. Pruebas (FR-024, SC-010)

- **Convención** de FR-035 de la 001: `RP1` a `RP7` sin prefijo, y `002/FR-nnn`, `002/SC-nnn`, `002/Hx-Ey` y `002/CL` para lo demás. El test de forma de la 001 ya admite esos nombres.
- **Trazabilidad propia**: `tests/unit/trazabilidad-002.test.js` lee la spec de la 002 y exige un test que empiece por cada regla RP, cada uno de los 30 escenarios (8, 7, 7 y 8 por historia) y cada criterio, salvo SC-002, SC-003, SC-008 y SC-009, que se miden a mano (SC-010). Su protocolo manual va en `checklists/entrega.md` de esta feature.
- **Enlaces de los tests de FR-025**: generados fuera de la semilla, nunca los de demostración (FR-025).
- **Reloj**: los tests fijan «ahora» con `momentoFijado` (FR-043) en el 04/11/2026 a las 12:00, como la spec, y fijan el tiempo real con `relojReal` para probar los 30 minutos y el bloqueo sin esperar.
- **Interfaz**: Playwright, con el proyecto `movil` de 360 píxeles y una ventana de 360 × 640 para FR-022. Para SC-007, el mismo recorrido con `timezoneId` de `Europe/Madrid`, `Atlantic/Canary` y `America/New_York`, comparando las horas mostradas.
