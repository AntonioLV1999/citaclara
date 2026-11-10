# Contrato: interfaz web de recepción

**Feature**: [spec.md](../spec.md)

Páginas HTML generadas en el servidor. Salvo `/acceso` y los estáticos, toda ruta exige sesión; sin ella, las páginas redirigen a `/acceso` y los POST devuelven 401 sin efecto (FR-001). Toda consulta se limita a la clínica de la sesión; un identificador de otra clínica responde 404 (FR-004).

## Sesiones y cookies (FR-037)

| Cookie | Sesión | Almacén | Quién la abre |
|--------|--------|---------|---------------|
| `sesion` | Recepción | Tabla `sesion` | `POST /acceso`, con la clave de la clínica |
| `sesion_paciente` | Paciente | Tabla `sesion_paciente` | El modelo de acceso de la 002; ninguna ruta de la 001 |

Las dos son `HttpOnly`, `SameSite=Strict` y sin `Max-Age`. Las rutas de recepción solo leen `sesion` y solo buscan en la tabla `sesion`. Una sesión de paciente válida, en su cookie o puesta en la de recepción, se trata igual que la ausencia de sesión. `POST /salir` solo cierra la de recepción.

## Rutas

| Método y ruta | Propósito | Respuestas |
|---------------|-----------|------------|
| `GET /acceso` | Formulario de clave | 200 |
| `POST /acceso` | Entrar con `clave` | 303 a `/agenda`; 401 con mensaje |
| `POST /salir` | Cerrar la sesión | 303 a `/acceso` |
| `GET /agenda?profesional=&dia=` | Agenda del día; sin `dia`, hoy; sin `profesional`, el primero. `dia` admite `dd/mm/aaaa` y `AAAA-MM-DD` | 200; 404 con mensaje si el día no es válido |
| `GET /citas/nueva?profesional=&dia=&hora=` | Formulario de alta, opcionalmente rellenado desde un hueco | 200 |
| `POST /citas/nueva` | Repintar el formulario al cambiar de profesional, conservando lo escrito (FR-019). No escribe nada, y es POST para que los datos del paciente no pasen por la URL | 200 |
| `POST /citas` | Crear la cita, y la ficha si el paciente es nuevo | 303 a la agenda del día; 409 o 422 con el formulario |
| `GET /pacientes/buscar?q=` | Fragmento HTML con coincidencias por nombre o teléfono, sin distinguir acentos ni mayúsculas | 200 |
| `GET /citas/:id/confirmar?accion=` | Página de confirmación; `accion` es `completar`, `cancelar` o `no-asistio` | 200; 404 |
| `POST /citas/:id/estado` | Aplicar `accion`. `cancelar` pasa por la operación única de [operacion-cancelar.md](operacion-cancelar.md) con el canal `recepcion` | 303 a la agenda; 409 con mensaje |
| `GET /citas/:id/correo` | Formulario con el correo actual de la ficha del paciente de esa cita (FR-041) | 200; 404 |
| `POST /citas/:id/correo` | Guardar `email`; vacío lo quita. Solo cambia el correo de la ficha, y no envía nada | 303 a la agenda del día de la cita; 422 con el formulario; 404 |

## Campos de `POST /citas`

`profesional`, `servicio`, `dia` (`dd/mm/aaaa`; también admite `AAAA-MM-DD`), `hora` (`HH:MM`), y uno de estos dos: `paciente` (identificador) o `paciente_nombre` y `paciente_telefono`, con `paciente_email` opcional.

Paciente nuevo y cita se escriben en una misma transacción (FR-013). Con 409 o 422, la página conserva lo escrito y muestra los huecos actuales de ese día (FR-019).

## Mensajes

Los textos son literales y deben cumplir FR-027. Ningún mensaje expone errores internos.

| Caso | Código | Mensaje |
|------|--------|---------|
| Solape (RN1) | 409 | «{Profesional} ya tiene una cita de {inicio} a {fin} con {paciente}. Elige otra hora.» |
| Pasado (RN2) | 422 | «Esa hora ya ha pasado. Elige una hora a partir de ahora.» |
| Fuera de horario (FR-012) | 422 | «La clínica abre de lunes a viernes, de 09:00 a 20:00. Elige una hora dentro de ese horario.» |
| Día no válido (FR-024) | 422; 404 en la agenda | «Ese día no es válido. Escribe la fecha como dd/mm/aaaa, por ejemplo 05/11/2026.» |
| Hora no válida (FR-011) | 422 | «Las citas empiezan en punto, y cuarto, y media o menos cuarto. Elige una de esas horas.» |
| Servicio incompatible (RN7) | 422 | «{Profesional} no atiende ese servicio. Elige uno de {especialidad}.» |
| Cierre antes de hora (RN5) | 409 | «Esta cita todavía no ha empezado. Hasta entonces solo se puede cancelar.» |
| Estado definitivo (RN4); al cancelar, resultados «ya estaba cancelada» y «no cancelable» de FR-038 (H3-E5) | 409 | «Esta cita ya está {estado} y no se puede cambiar.» |
| Clave incorrecta | 401 | «La clave no es correcta. Revísala e inténtalo de nuevo.» |
| Datos del paciente | 422 | «Escribe el nombre y un teléfono de al menos 9 dígitos.» |
| Correo del paciente, en el alta y en `POST /citas/:id/correo` | 422 | «Ese correo no parece válido. Revísalo o déjalo en blanco.» |
| Faltan datos del alta | 422 | «Falta algún dato de la cita. Elige profesional, servicio, día y hora.» |
| Sin sesión | 401 | «Para hacer esto hay que entrar con la clave de la clínica.» |
| No encontrado | 404 | «No encontramos lo que buscas. Vuelve a la agenda y elige de nuevo.» |
| Fallo interno | 500 | «Algo ha fallado y no se ha podido completar. Inténtalo de nuevo en unos minutos.» |

Avisos de la agenda, que no son rechazos: «La clínica no abre este día.» en sábado y domingo, y en los huecos sin botón de reservar, «Ya ha pasado» o «No cabe ningún servicio» (FR-006, FR-018).

Aviso del reloj fijado (FR-043, HU5-E5), en todas las pantallas de recepción, también en la de acceso, mientras exista el momento de referencia: «Reloj de demostración: la hora está fijada en el {día de la semana} {dd/mm/aaaa} a las {HH:MM} y no avanza.» Por ejemplo, «… en el miércoles 04/11/2026 a las 12:00 …».

## Correo de la ficha (FR-041)

- **En la agenda**: cada cita, sea cual sea su estado, lleva el enlace «Añadir correo» si la ficha no tiene correo, o «Cambiar correo» si lo tiene.
- **Página**: título «Correo de {paciente}», un campo «Correo electrónico» con el valor actual, la indicación «Déjalo en blanco para quitarlo. Guardarlo no envía ningún mensaje.», y los botones «Guardar correo» y «Volver a la agenda».
- **Nombre y teléfono** se muestran como texto, sin campo: no se editan.

## Presentación

- **Fechas y horas**: `dd/mm/aaaa` y 24 horas, también en los campos, que son de texto para no depender del idioma del navegador. Toda pantalla con horas de citas indica «Horas en hora peninsular» o «Horas en hora de Canarias» (FR-023, FR-024).
- **Validación**: los formularios llevan `novalidate`, para que los avisos sean siempre los de este contrato y no los del navegador (FR-027).
- **Importes**: `40,00 €` (FR-026).
- **Estados**: «Reservada», «Completada», «Cancelada» y «No asistida», siempre con texto además de color (FR-017, FR-027). Una cancelada con origen `portal` o `correo` se muestra como «Cancelada por el paciente el {dd/mm/aaaa} a las {HH:MM}», sin decir cuál de los dos canales; con origen `recepcion`, como «Cancelada», sin fecha. La cita sin cerrar (FR-040) se sigue mostrando como «Reservada». La agenda nunca muestra «Pendiente de confirmar por la clínica», que es solo de los canales del paciente.
- **Accesibilidad**: contraste de 4,5:1, controles de 44 × 44 píxeles y sin desplazamiento horizontal desde 360 píxeles (FR-028).
