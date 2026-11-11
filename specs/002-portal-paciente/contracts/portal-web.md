# Contrato: interfaz web del portal y añadidos de recepción

**Feature**: [spec.md](../spec.md) | **Modelo común**: [modelo-acceso.md](modelo-acceso.md) | **Base**: [interfaz web de la 001](../../001-nucleo-agenda/contracts/interfaz-web.md)

Páginas HTML generadas en el servidor, como en la 001. Todas llevan `cache-control: no-store`, y las del portal, además, `referrer-policy: no-referrer`.

## Clases de ruta

| Clase | Qué exige | Rutas de esta feature |
|-------|-----------|-----------------------|
| Pública | Nada | `GET /e/:token` |
| Paciente | Sesión de paciente válida, con el alcance que declara la ruta. Nunca la clave de clínica (FR-005, FR-026) | Las de `/portal` |
| Recepción | Sesión de clínica, como en la 001 | `/citas/:id/enlace` y la lista de huecos de `/agenda` |

En una ruta de paciente, la falta de sesión, una sesión caducada, una sesión de recepción o una sesión de otro alcance dan siempre la misma respuesta: 401 con la página «Tu sesión ha terminado».

## Rutas del paciente

| Método y ruta | Alcance | Propósito | Respuestas |
|---------------|---------|-----------|------------|
| `GET /e/:token` | — | Abre una sesión con el enlace ([modelo-acceso.md](modelo-acceso.md#resolución-de-un-enlace)) | 303 a `/portal` (enlace personal) o a la pantalla de la 003 (enlace de cancelación); 404 con la respuesta uniforme; 429 con el bloqueo |
| `GET /portal` | Ficha | Página del paciente: próximas citas e historial (FR-007) | 200 |
| `GET /portal/citas/:id/cancelar` | Ficha | Confirmación (FR-014). Si la cita ya no es cancelable, muestra el motivo en vez del botón | 200; 404 |
| `POST /portal/citas/:id/cancelar` | Ficha | Cancela con `cancelarCita(…, 'portal')` y muestra el resultado (FR-015 a FR-017) | 200 con la confirmación; 409 con el mensaje; 404 |
| `POST /portal/salir` | Ficha o cita | Cierra la sesión de paciente y borra su cookie. No toca la de recepción | 200 con la página «Has salido» |

`:id` de otro paciente, de otra clínica o inexistente responde igual: 404 con «No encontramos esa cita» (RP1, H2-E7).

## Añadidos a recepción

| Método y ruta | Propósito | Respuestas |
|---------------|-----------|------------|
| `GET /agenda` | Igual que en la 001, y además la lista «Huecos liberados por pacientes» encima de la agenda del día (FR-019) | Las de la 001 |
| `GET /citas/:id/enlace` | Enlace personal de la ficha del paciente de esa cita, para copiarlo (FR-002) | 200; 404 |
| `GET /citas/:id/enlace/anular` | Confirmación de la anulación | 200; 404 |
| `POST /citas/:id/enlace/anular` | Anula el enlace y crea uno nuevo (RP7) | 303 a `/citas/:id/enlace?nuevo=1`; 404 |

El test de FR-001 de la 001 («solo la pantalla de acceso es pública») se amplía con `GET /e/:token` y las cuatro rutas de `/portal`, y con nada más.

## Presentación del portal

- **Cabecera**: nombre de la clínica y su teléfono como enlace `tel:` («Llamar a la clínica: 000 200 000»). Sin el menú de recepción. Botón «Salir».
- **Orden**: título «Tus citas», el nombre del paciente, «Horas en hora peninsular» (o «de Canarias»), «Próximas citas» y después «Historial» (FR-007, FR-010).
- **Cada cita**: «lun 09/11/2026, 18:00–18:45», en la línea siguiente «Sesión de fisioterapia con María», y su etiqueta. Nunca el precio (FR-008).
- **Etiquetas** (FR-009): «Reservada», «Completada», «No asistida», «Cancelada», «Cancelada por el paciente el 04/11/2026 a las 12:00» y «Pendiente de confirmar por la clínica». Siempre en texto, además del color.
- **Próxima cita cancelable**: botón «Cancelar» que lleva a la confirmación. **Próxima no cancelable**: «Ya no se puede cancelar desde aquí: se podía hasta el lun 09/11/2026 a las 16:00. Si no puedes venir, llama a la clínica.», con el enlace de llamada (FR-013).
- **Sin próximas citas**: «No tienes citas próximas. Para pedir una, llama a la clínica.», con el enlace de llamada (FR-012).
- **Confirmación**: título «¿Cancelar esta cita?», la cita completa, «Si la cancelas, no se puede deshacer.», y los botones «Sí, cancelar la cita» y «No, volver a mis citas» (FR-014).
- **Accesibilidad** (FR-021, FR-022): una columna desde 360 píxeles, sin desplazamiento horizontal, contraste de al menos 4,5:1, controles de al menos 44 × 44 píxeles. En 360 × 640, la primera próxima cita y su botón «Cancelar» se ven sin desplazarse.

## Presentación de los añadidos de recepción

- **En cada cita de la agenda**, junto a «Añadir correo» o «Cambiar correo» de la 001: el enlace «Enlace del paciente».
- **Página del enlace**: título «Enlace de {paciente}», el enlace completo en un campo de solo lectura, el botón «Copiar enlace» y el texto «Dáselo al paciente por el medio que uses con él. CitaClara no lo envía.». Debajo, «Anular este enlace». Tras anular, el aviso «El enlace anterior ya no funciona. Este es el nuevo.».
- **Copiar**: si el navegador no deja copiar, el texto queda seleccionado y se avisa: «Pulsa Ctrl+C para copiarlo.».
- **Confirmación de anular**: «¿Anular el enlace de {paciente}?», «El enlace actual y los de cancelación de los recordatorios ya enviados dejarán de funcionar. Las citas no cambian. Después tendrás que darle el nuevo enlace.», y los botones «Sí, anular y crear uno nuevo» y «No, volver».
- **Lista de huecos liberados**: título «Huecos liberados por pacientes». Cada hueco, «mié 11/11/2026, 11:15–12:00, Lucía», es un enlace a la agenda de ese profesional y día. Sin huecos: «Ningún paciente ha liberado huecos próximos.».

## Mensajes

Literales. Cumplen FR-023: dicen qué ha pasado y qué puede hacer el paciente, sin jerga. Ninguno revela si existe un paciente, una cita ni de qué tipo era un enlace.

| Caso | Código | Mensaje |
|------|--------|---------|
| Enlace inventado, anulado, caducado o mal formado, de cualquier tipo (FR-003) | 404 | Título «Este enlace no funciona». «Puede que esté incompleto o que ya no sea válido. Pide a tu clínica que te dé el enlace de nuevo.» |
| Demasiados enlaces no válidos (FR-004) | 429 | Título «Demasiados intentos». «Se han probado demasiados enlaces que no funcionan. Espera 15 minutos y vuelve a abrir tu enlace, o pide a tu clínica que te lo dé de nuevo.» |
| Sin sesión de paciente o caducada | 401 | Título «Tu sesión ha terminado». «Por seguridad, la sesión se cierra tras 30 minutos sin uso. Vuelve a abrir tu enlace para ver tus citas.» |
| Has salido | 200 | Título «Has salido». «Para volver a ver tus citas, abre otra vez tu enlace.» |
| Cita ajena o inexistente | 404 | Título «No encontramos esa cita». «Vuelve a tus citas y elige una de la lista.» |
| Cancelada ahora, o ya cancelada por el paciente (FR-016, FR-017) | 200 | Título «Cita cancelada». «Tu cita del {lun 09/11/2026} a las {18:00} con {María} está cancelada. Si quieres pedir otra, llama a la clínica.» |
| Ya cancelada por recepción (FR-017) | 409 | Sobre la página «Tus citas»: «Esta cita ya está cancelada. No tienes que hacer nada más.» |
| Fuera de plazo (FR-017) | 409 | Título «Ya no se puede cancelar desde aquí». «Se podía cancelar hasta el {lun 09/11/2026} a las {16:00}. Si no puedes venir, llama a la clínica.» |
| No cancelable (FR-017) | 409 | Título «Esta cita ya no se puede cancelar». «Consta como {completada | no asistida}. Si crees que es un error, llama a la clínica.» |
| Fallo interno | 500 | El de la 001 |

Todos los mensajes del portal que dicen «llama a la clínica» llevan el enlace de llamada con el teléfono (FR-011).
