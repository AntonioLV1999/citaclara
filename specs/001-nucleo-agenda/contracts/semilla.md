# Contrato: comando de semilla

**Feature**: [spec.md](../spec.md)

```text
npm run semilla [-- --lunes AAAA-MM-DD]
```

| Parámetro | Por defecto | Reglas |
|-----------|-------------|--------|
| `--lunes` | `2026-11-02` | Debe ser lunes; si no, el comando falla con un mensaje claro y no escribe nada |

La semilla numérica es fija en el código. Cambiarla es un cambio de datos sujeto al principio V.

## Comportamiento

- Sustituye los datos de Clínica Eleva en una sola transacción: repetir el comando no duplica nada (FR-032). **Borra también las citas y las fichas creadas a mano en esa clínica, y cierra sus sesiones abiertas, de recepción y de paciente.**
- Escribe por las tablas normales, de modo que los disparadores de RN1, RN3 y RN7 y la restricción de origen y momento de FR-036 la vigilan. RN4 no interviene: su disparador actúa al actualizar, y la historia se inserta ya en su estado definitivo (FR-033), con el origen y el momento de las canceladas en el mismo `INSERT`. Si algo aborta, no queda nada escrito.
- Si el archivo de datos es de una versión anterior del esquema, no escribe nada y explica que hay que borrarlo ([research.md §16](../research.md#16-cambio-de-esquema-sobre-un-archivo-existente)).
- Calendario: la historia ocupa las 8 semanas anteriores a `--lunes`, y las reservas futuras, las 2 semanas desde ese lunes, de lunes a viernes.
- Con el valor por defecto: historia del 07/09/2026 al 30/10/2026 y reservas del 02/11/2026 al 13/11/2026. La historia cruza el cambio de hora del 25/10/2026.
- La clave de demostración es `eleva-demo`. Es ficticia y pública; no debe usarse con datos reales.
- **Datos para las features del paciente** (FR-029):
  - Teléfono de la clínica: `000 200 000`.
  - Un enlace personal de demostración por paciente: solo el token, de 32 caracteres hexadecimales en minúscula, derivado como dice FR-029. El del primer paciente, David Gil, es `c73f5e835397826416bda7b3e5323d02`. Son ficticios y públicos, como la clave.
  - Las 37 canceladas de la historia, con origen `recepcion` y con su inicio como momento de la cancelación, así que se muestran como «Cancelada».

## Salida

Imprime en español el resumen que permite verificar y citar los números:

```text
Clínica Eleva · lunes de referencia 02/11/2026
Pacientes: {n} · Citas de historia: {n}
  Completadas: {n} ({p} %) · No asistidas: {n} ({p} %) · Canceladas: {n} ({p} %)
Reservas futuras: {n}
Resumen de contenido: {sha256}
Resumen sin fechas: {sha256}
```

El resumen de contenido cambia con el lunes. El resumen sin fechas no cambia: es la comprobación de que desplazar la semilla conserva la historia (FR-032, SC-005). Quita `inicio`, `fin` y `momento_cancelacion`.

Con el lunes por defecto, las cifras y los dos resúmenes deben coincidir con los de FR-030 de la 001, que es su única fuente: este contrato no los copia. Si no coinciden, el defecto está en la implementación (historial, D4).
