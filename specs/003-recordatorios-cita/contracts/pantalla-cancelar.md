# Contrato: pantalla de cancelación del correo

**Feature**: [spec.md](../spec.md) (RR4, RR6, FR-011 a FR-017, HU2) | **Decisiones**: [research.md §1 y §7](../research.md#7-pantalla-de-cancelación-fr-011-a-fr-017-hu2) | **Modelo de acceso**: [modelo-acceso.md de la 002](../../002-portal-paciente/contracts/modelo-acceso.md)

## Cómo se llega

1. El paciente abre `<CITACLARA_DIRECCION>/e/<token>` desde el correo.
2. La 002 resuelve el enlace: si está vigente (la cita aún no ha empezado, RR6), abre una sesión de paciente de alcance de esa cita y redirige con 303 a `/cancelar`. Si no, da su respuesta uniforme (002/FR-003). Este paso no cambia nada en la agenda (FR-015).

## Rutas

Las dos son rutas de paciente de alcance `cita`: sin la sesión de esa cita, la 002 responde como sin sesión. La clave de clínica no las abre (002/FR-005).

| Ruta | Qué hace |
|------|----------|
| `GET /cancelar` | Muestra la pantalla que corresponda a la cita y a «ahora». No escribe nada |
| `POST /cancelar` | Llama a `cancelarCita(contexto, cita.id, 'correo')` (FR-038 de la 001) y muestra el mensaje del resultado. Sin campos: la cita es la del alcance |

**Antes de cualquier otra cosa**, las dos comprueban `ahoraLocal(contexto, zona) < cita.inicio`. Si no se cumple, el enlace está caducado y responden con la respuesta uniforme de la 002, con su mismo código y su mismo texto (RR6, HU2-E5, caso límite «Pantalla abierta hasta el inicio»).

## Pantallas y mensajes

Literales. Tratan de tú, como el portal de la 002, y cumplen FR-027 de la 001: dicen qué ha pasado y qué puede hacer el paciente, sin jerga. Las fechas, como `martes 03/11/2026`; las horas, `12:00`, con la línea de zona «Horas en hora peninsular» o «Horas en hora de Canarias» (FR-008).

| Situación | Ruta | Código | Título | Texto |
|-----------|------|--------|--------|-------|
| Reservada y dentro de plazo (HU2-E1, FR-013) | `GET` | 200 | «Cancelar tu cita» | Clínica, profesional, servicio, día y hora. «Si la cancelas, el hueco quedará libre para otra persona. No se puede deshacer.» Botón «Sí, cancelar la cita» |
| Cancelada ahora (HU2-E2) | `POST` | 200 | «Cita cancelada» | «Tu cita del {martes 03/11/2026} a las {12:00} está cancelada, y el hueco ha quedado libre para otra persona. Gracias por avisar.» |
| Ya estaba cancelada (HU2-E4, doble pulsación) | `GET` y `POST` | 200 | «Esta cita ya está cancelada» | «No tienes que hacer nada más.» Sin botones |
| Fuera de plazo (HU2-E6) | `GET` | 200 | «Ya no se puede cancelar desde aquí» | «Se podía cancelar hasta el {martes 03/11/2026} a las {10:00}. Si no vas a poder venir, llama a la clínica: {teléfono}.» |
| Fuera de plazo al confirmar (caso límite «Pantalla abierta mientras vence el plazo») | `POST` | 409 | Igual que la anterior | Igual que la anterior |
| Caducado o `no_cancelable` (HU2-E5) | `GET` y `POST` | Los de la 002 | Respuesta uniforme de la 002 | — |

- **Límite mostrado**: el `limite` que devuelve `cancelarCita`, o `limiteCancelacion(cita.inicio)` en el `GET`. La pantalla no escribe la cifra de RN8.
- **Teléfono**: el de la clínica (FR-029 de la 001), como enlace `tel:` de al menos 44 × 44 píxeles. Si la clínica no tiene teléfono, el texto termina en «llama a la clínica.»
- **Lo que no muestra** (FR-012): el nombre, el teléfono o el correo del paciente, otras citas, el precio y el enlace personal.

## Requisitos de la pantalla (FR-017)

- La plantilla de las páginas del paciente de la 002, sin el menú de recepción ni el aviso del reloj fijado.
- A 360 píxeles de ancho, sin desplazamiento horizontal; contraste de al menos 4,5:1; controles táctiles de al menos 44 × 44 píxeles (FR-028 de la 001).
- Funciona sin JavaScript: el botón es un formulario `POST`.
- Respuestas con `Referrer-Policy: no-referrer`, como el resto de rutas de paciente de la 002.
