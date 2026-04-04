---
name: Desarrollo Backend y Base de Datos (Prisma)
description: Convenciones de arquitectura para el backend en Node/Express y reglas seguras para manejar el esquema y migraciones de Prisma.
---

# Reglas de Desarrollo Backend y Prisma

## 1. Arquitectura de Servicios
- Mantener los Controladores (`.controller.ts`) lo más limpios posible. Su única responsabilidad es procesar la solicitud (Request) y devolver la respuesta (Response).
- La lógica de negocio real (cálculos, búsqueda compleja en base de datos) debe ir en los Servicios (`.service.ts`).
- Las Rutas (`.routes.ts`) solo deben hacer el ruteo hacia los controladores y aplicar middlewares (ej. autenticación).

## 2. Manejo de Prisma y Base de Datos
- **NUNCA borrar datos en producción**. Si se necesitan reestructurar IDs (como migrar `externalId` del biométrico), crea un script de migración seguro o una columna temporal.
- Las consultas a la base de datos deben ser asíncronas (`await prisma...`).
- Maneja siempre los errores al conectarte a Prisma usando bloques `try/catch` globales o en los controladores, para evitar que Node se cierre inesperadamente (Unhandled Promise Rejection).

## 3. Estándar de Respuestas API
- Las respuestas JSON del backend deben tener un formato consistente.
- Estructura preferida para éxito: `{ status: 'success', data: { ... } }`
- Estructura preferida para error: `{ status: 'error', message: 'Descripción clara' }`
- Utiliza códigos de estado HTTP semánticos (200 OK, 201 Created, 400 Bad Request, 404 Not Found, 500 Internal Error).

## 4. Procesamiento de Datos y Lógica de Negocio
- **TODA** la lógica de negocio, cálculos complejos (como horas extras, retardos) y estructuración de datos pesada deben realizarse en el Backend.
- No envíes listas "crudas" (raw) enormes asumiendo que el Frontend las agrupará. Utiliza las capacidades de Prisma (`groupBy`, `include`, `select`) para devolver estructuras de datos óptimas y listas para renderizar.
