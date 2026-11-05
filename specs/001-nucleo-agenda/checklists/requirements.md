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

- [ ] No quedan marcadores [NEEDS CLARIFICATION]
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

- Quedan 3 marcadores abiertos: FR-012 (horario), FR-013 (alta de pacientes) y FR-032 (fechas de la semilla). Al resolverlos hay que repetir la validación.
- Los encabezados de la plantilla están traducidos por el principio VIII; ningún script los lee.
- Antes de aprobar la spec hay que crear `specs/MAPA.md` con su propietario (principio I).
- Los elementos sin marcar requieren actualizar la spec antes de `/speckit-clarify` o `/speckit-plan`.
