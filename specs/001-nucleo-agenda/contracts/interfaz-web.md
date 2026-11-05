# Contrato: interfaz web de recepción

**Feature**: [spec.md](../spec.md)

Páginas HTML generadas en el servidor. Salvo `/acceso` y los estáticos, toda ruta exige sesión; sin ella, las páginas redirigen a `/acceso` y los POST devuelven 401 sin efecto (FR-001). Toda consulta se limita a la clínica de la sesión; un identificador de otra clínica responde 404 (FR-004).

## Rutas

| Método y ruta | Propósito | Respuestas |
|---------------|-----------|------------|
| `GET /acceso` | Formulario de clave | 200 |
| `POST /acceso` | Entrar con `clave` | 303 a `/agenda`; 401 con mensaje |
| `POST /salir` | Cerrar la sesión | 303 a `/acceso` |
| `GET /agenda?profesional=&dia=` | Agenda del día; sin `dia`, hoy; sin `profesional`, el primero | 200 |
| `GET /citas/nueva?profesional=&dia=&hora=` | Formulario de alta, opcionalmente rellenado desde un hueco | 200 |
| `POST /citas` | Crear la cita, y la ficha si el paciente es nuevo | 303 a la agenda del día; 409 o 422 con el formulario |
| `GET /pacientes/buscar?q=` | Fragmento HTML con coincidencias por nombre o teléfono, sin distinguir acentos ni mayúsculas | 200 |
| `GET /citas/:id/confirmar?accion=` | Página de confirmación; `accion` es `completar`, `cancelar` o `no-asistio` | 200; 404 |
| `POST /citas/:id/estado` | Aplicar `accion` | 303 a la agenda; 409 con mensaje |

## Campos de `POST /citas`

`profesional`, `servicio`, `dia` (`AAAA-MM-DD`), `hora` (`HH:MM`), y uno de estos dos: `paciente` (identificador) o `paciente_nombre` y `paciente_telefono`, con `paciente_email` opcional.

Paciente nuevo y cita se escriben en una misma transacción (FR-013). Con 409 o 422, la página conserva lo escrito y muestra los huecos actuales de ese día (FR-019).

## Mensajes

Los textos son de referencia y deben cumplir FR-027. Ningún mensaje expone errores internos.

| Caso | Código | Mensaje |
|------|--------|---------|
| Solape (RN1) | 409 | «{Profesional} ya tiene una cita de {inicio} a {fin} con {paciente}. Elige otra hora.» |
| Pasado (RN2) | 422 | «Esa hora ya ha pasado. Elige una hora a partir de ahora.» |
| Fuera de horario (FR-012) | 422 | «La clínica abre de lunes a viernes, de 09:00 a 20:00. Elige una hora dentro de ese horario.» |
| Hora no válida (FR-011) | 422 | «Las citas empiezan en punto, y cuarto, y media o menos cuarto.» |
| Servicio incompatible (RN7) | 422 | «{Profesional} no atiende ese servicio. Elige uno de {especialidad}.» |
| Cierre antes de hora (RN5) | 409 | «Esta cita todavía no ha empezado. Hasta entonces solo se puede cancelar.» |
| Estado definitivo (RN4) | 409 | «Esta cita ya está {estado} y no se puede cambiar.» |
| Clave incorrecta | 401 | «La clave no es correcta. Revísala e inténtalo de nuevo.» |
| Datos del paciente | 422 | «Escribe el nombre y un teléfono de al menos 9 dígitos.» |

## Presentación

- **Fechas y horas**: `dd/mm/aaaa` y 24 horas. La agenda indica «Horas en hora peninsular» o «Horas en hora de Canarias» (FR-023, FR-024).
- **Importes**: `40,00 €` (FR-026).
- **Estados**: «Reservada», «Completada», «Cancelada» y «No asistida», siempre con texto además de color (FR-017, FR-027).
- **Accesibilidad**: contraste de 4,5:1, controles de 44 × 44 píxeles y sin desplazamiento horizontal desde 360 píxeles (FR-028).
