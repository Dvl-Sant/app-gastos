---
name: Documentación de Código y Estándares de Log
description: Reglas para mantener una base de código legible, trazable y autoexplicativa en equipos multidisciplinarios. Obliga al uso bilingüe de código/comentarios y la estructuración de JSDocs.
---

# Reglas de Documentación y Logs para ChecadorObras

Aplica estas reglas SIEMPRE que crees o modifiques archivos, especialmente en los servicios del backend (`*.service.ts`) o módulos complejos del frontend.

## 1. Regla Bilingüe (Inglés/Español)
- **El código se escribe en Inglés**: Variables, nombres de funciones, clases, interfaces e IDs de HTML/CSS siempre deben nombrarse en inglés (ej: `calculateOvertime()`, `employeeName`, `CheckinService`).
- **La documentación se escribe en Español**: Comentarios en línea, JSDocs, explicaciones de algoritmos y descripciones de Pull Requests deben estar en español para facilitar la lectura del equipo.

## 2. JSDoc Obligatorio en Lógica Compleja
- Toda función alojada dentro de la carpeta `services/` o `utils/` (tanto en frontend como en backend) debe tener un bloque de comentario JSDoc.
- El JSDoc debe explicar brevemente **qué hace la función**, cuáles son sus **parámetros de entrada** (`@param`) y qué **retorna** (`@returns`).

Ejemplo:
```typescript
/**
 * Calcula las horas extras basadas en el turno del empleado y los registros (check-ins).
 * @param employeeId ID interno del empleado.
 * @param dateRange Rango de fechas a evaluar.
 * @returns Objeto con el total de horas normales y horas extras generadas.
 */
async function calculateOvertime(employeeId: string, dateRange: Date[]): Promise<OvertimeTotals> { ... }
```

## 3. Trazabilidad y Logs Estructurados
- Nunca uses un `console.log()` o `console.error()` genérico o vacío en producción, especialmente dentro de hooks asíncronos o controladores web.
- Todos los logs importantes (notificaciones push, fallos de API externa, errores del lector biométrico) deben llevar prefijos descriptivos entre corchetes `[Módulo]`.
- En caso de un `catch`, el console error debe mostrar el mensaje real del fallo o la data.

Ejemplos:
* ✅ `console.log('[LabsMobile] SMS enviado exitosamente a 5255...');`
* ✅ `console.error('[Hikvision Connector] Imposible conectar al dispositivo IP 192.168.1.5:', error.message);`
* ❌ `console.log('enviado');`
* ❌ `console.error('falló:', error);`
