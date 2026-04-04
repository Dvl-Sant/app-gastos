---
name: Estructura Base de Proyectos (Boilerplate)
description: Define la estructura estricta de carpetas y archivos para nuevos proyectos o refactorizaciones, asegurando una separación clara de responsabilidades en Frontend y Backend.
---

# Estructura Base de Proyectos (Boilerplate)

Esta habilidad debe invocarse **SIEMPRE** que se solicite crear un "nuevo proyecto", "nuevo módulo" o "refactorizar" una aplicación completa. Garantiza que la arquitectura sea escalable y fácil de mantener para cualquier componente del equipo.

## 1. Estructura Obligatoria para Backend (Node.js/Express)
Todos los proyectos de backend deben respetar la siguiente distribución de carpetas dentro de `src/`:

```text
src/
 ├── config/       # Variables de entorno validadas, config de Base de Datos y APIs externas.
 ├── controllers/  # Recepción de peticiones HTTP (req, res). NO llevan lógica de negocio.
 ├── services/     # Lógica pesada, cálculos (horas extras) e interacciones complejas con BD.
 ├── routes/       # Definición de endpoints y asociación con sus controllers.
 ├── middlewares/  # Guards de autenticación, validación de schemas (Zod/Joi) y control de errores.
 ├── utils/        # Funciones auxiliares pura y repetitivas (formateo de fechas, encriptación).
 └── index.ts      # Archivo de entrada (Entry point) que levanta el servidor Express.
```
*   **Regla de Oro:** Un Controller nunca debe hacer más de 10-15 líneas de código. Su única función es extraer parámetros de la Request, pasarlos al Service, y retornar la Response al cliente.

## 2. Estructura Obligatoria para Frontend (React)
Todos los proyectos frontend (vite, create-react-app, next) deben respetar la siguiente jerarquía bajo `src/`:

```text
src/
 ├── components/   # Componentes UI reutilizables y "tontos" (Botones, Modales, Inputs).
 ├── pages/        # Vistas principales atadas a una ruta (Dashboard, Login, Reportes).
 ├── hooks/        # Lógica reutilizable de React (Custom Hooks como useAuth, useFetch).
 ├── services/     # Promesas y llamadas a la API del backend mediante Axios o Fetch.
 ├── utils/        # Funciones auxiliares que no dependen de React.
 ├── assets/       # Imágenes, íconos y SVG estáticos.
 └── context/      # (Opcional) Archivos de estado global (Context API o setup de Zustand/Redux).
```
*   **Regla de Oro:** Los componentes dentro de `pages/` son los únicos encargados de obtener fetching de datos y pasarlos como *props* a los fragmentos UI de `components/`.
