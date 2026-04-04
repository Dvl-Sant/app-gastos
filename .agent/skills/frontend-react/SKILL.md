---
name: Desarrollo Frontend (React, Ant Design + TailwindCSS)
description: Estándares de codificación, uso de la librería UI Ant Design y estructura UX/UI de componentes para React.
---

# Reglas de Desarrollo Frontend (React)

## 1. Arquitectura de Componentes
- Utiliza siempre **Componentes Funcionales** y **Hooks** de React. No usar componentes de clase.
- Extrae la lógica compleja a Custom Hooks (`useFetchData`, `useOvertime`, etc.) para mantener los componentes limpios y enfocados en la UI.
- Los componentes compartidos (botones, modales, tablas) deben ir en una carpeta `components/` y ser reutilizables.

## 2. Framework UI y Estilos (Ant Design + TailwindCSS)
- El proyecto utiliza **Ant Design (antd)** como librería principal de componentes (Tablas, Modales, Fechas, Formularios). Úsalos y adáptalos siempre antes de construir componentes desde cero.
- El proyecto utiliza TailwindCSS para complementar áreas de layout, grids y márgenes. Evita crear archivos CSS normales o usar estilos en línea (`style={{...}}`).
- Sigue la paleta de colores institucional y customiza el theme de `antd` cuando el diseño lo requiera para mantener la consistencia (ej. Reportes y Horas Extras).
- Prioriza una experiencia de usuario intuitiva: agrega estados de carga con Spinners/Skeletons de `antd`. Para notificaciones de éxito/error, usa los componentes `message` o `notification` nativos de Ant Design en lugar de alertas comunes.

## 3. Tipado Estricto (TypeScript)
- Evita por completo el uso de `any`.
- Define y usa Interfaces (ej. `IEmployee`, `IOvertimeRecord`) para mapear con exactitud los datos que devuelve el backend.
- Tipar explícitamente las props de cada componente de React.

## 4. Estructura de Filtros (Dashboard)
- Para módulos complejos como **Horas Extras** o Reportes, implementa filtros jerárquicos estructurados (Ej: Obra -> Área -> Empleado) para facilitar la búsqueda en grandes bases de datos.

## 5. Separación de Responsabilidades (Lógica en el Backend)
- **NUNCA** realices cálculos pesados, agrupaciones complejas de datos (ej. `reduce` gigantes) o lógica de negocio (como el cálculo de nómina) en el frontend.
- El frontend debe limitarse a recibir datos listos para renderizar y manejar exclusivamente el estado y las interacciones de la UI.
- Si un componente necesita los datos estructurados de cierta forma, solicita o modifica el endpoint del backend para que los envíe ya con esa estructura.
