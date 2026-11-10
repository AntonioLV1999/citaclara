# Lista de calidad de la especificación: Núcleo de agenda

**Propósito**: validar que la especificación está completa y tiene calidad antes de pasar a la planificación
**Creada**: 05/11/2026
**Feature**: [spec.md](../spec.md)

## Calidad del contenido

- [x] Sin detalles de implementación (lenguajes, frameworks, API)
- [x] Centrada en el valor para la persona usuaria y en las necesidades del negocio
- [x] Redactada para personas no técnicas
- [x] Todas las secciones obligatorias completadas

## Completitud de los requisitos

- [x] No quedan marcadores [NEEDS CLARIFICATION] (cambio del 10/11/2026: los dos resúmenes de FR-030 se calcularon con D4)
- [x] Los requisitos se pueden probar y no son ambiguos
- [x] Los criterios de éxito son medibles
- [x] Los criterios de éxito no dependen de la tecnología
- [x] Todos los escenarios de aceptación están definidos
- [x] Los casos límite están identificados
- [x] El alcance está claramente delimitado
- [x] Las dependencias y los supuestos están identificados

## Preparación de la feature

- [x] Todos los requisitos funcionales tienen criterios de aceptación claros
- [x] Los escenarios de usuario cubren los flujos principales
- [x] La feature cumple los resultados medibles de los criterios de éxito
- [x] Ningún detalle de implementación se filtra en la especificación

## Notas

- Los 3 marcadores se resolvieron el 05/11/2026 (ver «Aclaraciones» en la spec) y la validación se repitió sin incidencias.
- Los encabezados de la plantilla están traducidos por el principio VIII; ningún script los lee.
- Propietario registrado en `specs/MAPA.md`; aprobada por ese propietario el 06/11/2026.

### Revalidación del 10/11/2026 (cambio pendiente de aprobación: S-01 a S-04, D1 y D2)

- Pasan todos los puntos salvo uno: quedan 2 marcadores [NEEDS CLARIFICATION] en FR-030. Son la misma pregunta: el valor de los dos resúmenes de contenido, que solo se obtiene generando la semilla nueva. No se inventan. Decisión (opción A): se calculan al implementar y se escriben en FR-030 en el mismo commit, antes de aprobar.
- FR-037 nombra un almacén y una cookie propios para la sesión de paciente. Es un detalle técnico que se mantiene a propósito, porque lo pide la resolución de S-04 y sin él la separación de sesiones no se puede comprobar.
- Requisitos nuevos o cambiados: RN5, RN8, FR-001, FR-027, FR-029, FR-030, FR-036, FR-037; HU4-E5, HU5-E4, HU6-E1 a E8; SC-008, SC-010 a SC-012; entidades Clínica, Paciente, Cita y Sesión.

### Revalidación del 10/11/2026 (mismo cambio pendiente: S-05 y S-08)

- Pasan todos los puntos salvo el mismo: siguen quedando solo los 2 marcadores de FR-030. El responsable de FR-039 es AntonioLV1999, y su fecha es la de la comprobación de la puerta, que se escribirá cuando ocurra. No es un marcador: mientras falte, la puerta no se cumple.
- FR-038 define los cuatro resultados de la operación de cancelar sin fijar ningún texto: el mensaje lo elige cada canal (HU3-E5, 002/FR-017 y 003/FR-014), así que la spec sigue sin detalles de interfaz de otras features.
- FR-039 nombra la conexión cifrada y la cookie limitada a ella. Es un detalle técnico que se mantiene a propósito, porque ya estaba en el supuesto de conexión sin cifrar y sin él la puerta no se puede comprobar.
- Requisitos nuevos o cambiados: FR-020, FR-038, FR-039; HU3-E5, HU6-E9; SC-013; caso límite «Dos acciones de estado a la vez»; supuestos «Conexión sin cifrar (deuda consciente)» y «Fuera de alcance de la 001».

### Revalidación del 10/11/2026 (mismo cambio pendiente: S-18, decisión D4)

- Pasan todos los puntos. Los dos resúmenes de FR-030 se calcularon en un worktree desechable (D4), con las cifras de citas sin cambios y con el mismo resultado en dos ejecuciones. Ya no queda ningún marcador [NEEDS CLARIFICATION] en la spec.
- El historial fija lo que la implementación debe reproducir: los campos y su orden, y la forma del enlace de demostración. Es un detalle técnico que se mantiene a propósito, porque sin él los resúmenes no se pueden reproducir.
