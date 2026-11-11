# Contrato: correo de recordatorio

**Feature**: [spec.md](../spec.md) (FR-007 a FR-010, HU1-E1, HU1-E10, HU3-E3, HU3-E5) | **Decisiones**: [research.md §6](../research.md#6-formato-del-correo-fr-007-a-fr-010-hu3-e3-hu3-e5)

Mensaje RFC 5322 en texto plano, con líneas terminadas en CRLF. Lo genera una función pura, `componerRecordatorio({ clinica, paciente, cita, profesional, servicio, ahora, enlace })`, en `src/dominio/recordatorio.js`.

## Ejemplo

La cita de Paula Gómez de la semilla por defecto, con `CITACLARA_AHORA=2026-11-02T08:00` y la dirección por defecto:

```text
From: =?UTF-8?B?Q2zDrW5pY2EgRWxldmE=?= <recordatorios@citaclara.invalid>
To: paula.gomez@example.com
Subject: =?UTF-8?B?…?=
Date: Mon, 02 Nov 2026 08:00:00 +0100
MIME-Version: 1.0
Content-Type: text/plain; charset=UTF-8
Content-Transfer-Encoding: 8bit

Hola, Paula Gómez:

Te recordamos tu cita en Clínica Eleva.

Día: martes 03/11/2026
Hora: 12:00
Profesional: María
Servicio: Sesión de fisioterapia
Horas en hora peninsular.

Si no vas a poder venir, cancela la cita en este enlace y el hueco quedará libre para otra persona:
http://localhost:3000/e/<token>

Al abrir el enlace verás la cita y tendrás que confirmar la cancelación.
```

El asunto, ya descodificado: «Recordatorio de tu cita del martes 03/11/2026 a las 12:00».

## Plantilla

| Pieza | Valor | Requisito |
|-------|-------|-----------|
| `From` | `{nombre de la clínica} <recordatorios@citaclara.invalid>` | Solo modo simulado ([research.md §6](../research.md#6-formato-del-correo-fr-007-a-fr-010-hu3-e3-hu3-e5)) |
| `To` | Solo la dirección de la ficha en el momento del envío, sin el nombre | RR2, FR-010 |
| `Subject` | `Recordatorio de tu cita del {día} {dd/mm/aaaa} a las {HH:MM}` | FR-007, FR-008 |
| `Date` | «Ahora» de la ejecución, con el desfase de la zona de la clínica | HU3-E5 |
| Saludo | `Hola, {nombre del paciente}:` | FR-007 |
| Día | `{día de la semana en minúscula} {dd/mm/aaaa}` | FR-007, FR-008 |
| Hora | `{HH:MM}`, el inicio | FR-007, FR-008 |
| Zona | `etiquetaZona(zona)` de la 001 y un punto: «Horas en hora peninsular.» o «Horas en hora de Canarias.» | FR-008, HU1-E10 |
| Enlace | `{CITACLARA_DIRECCION}/e/{token}`, solo en su línea, para que los programas de correo lo conviertan en enlace | FR-007, RR6 |

## Lo que nunca lleva (FR-010, D3)

- El teléfono o el correo del paciente en el asunto o el cuerpo. El correo solo va en `To`.
- El enlace personal del portal ni ningún otro dato de la ficha.
- El precio del servicio.
- `Message-ID` ni ninguna otra cabecera que cambie entre dos ejecuciones con los mismos datos y el mismo momento (HU3-E5). Solo cambian el token y el nombre del fichero.
