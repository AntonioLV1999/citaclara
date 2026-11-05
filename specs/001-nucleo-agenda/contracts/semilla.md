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

- Sustituye los datos de Clínica Eleva en una sola transacción: repetir el comando no duplica nada (FR-032). **Borra también las citas creadas a mano en esa clínica.**
- Escribe por las tablas normales, de modo que los disparadores de RN1, RN3 y RN7 la vigilan. RN4 no interviene: su disparador actúa al actualizar, y la historia se inserta ya en su estado definitivo (FR-033). Si alguno aborta, no queda nada escrito.
- Calendario: la historia ocupa las 8 semanas anteriores a `--lunes`, y las reservas futuras, las 2 semanas desde ese lunes, de lunes a viernes.
- Con el valor por defecto: historia del 07/09/2026 al 30/10/2026 y reservas del 02/11/2026 al 13/11/2026. La historia cruza el cambio de hora del 25/10/2026.
- La clave de demostración es `eleva-demo`. Es ficticia y pública; no debe usarse con datos reales.

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

El resumen de contenido cambia con el lunes. El resumen sin fechas no cambia: es la comprobación de que desplazar la semilla conserva la historia (FR-032, SC-005).

Las cifras reales se anotarán en la spec durante la implementación (FR-030).
