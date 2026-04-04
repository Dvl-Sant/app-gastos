# AppGastos - Administrador de Gastos Personales

Bienvenido a **AppGastos**, una aplicación enfocada en la gestión de gastos personales. Este proyecto está estructurado dividiendo de forma clara las responsabilidades entre el **Frontend** y el **Backend**, garantizando escalabilidad y un código limpio.

## Descripción General

El proyecto consta de una API construida en **Node.js** con **Express** y **TypeScript**, y un cliente Frontend que actualmente corre en **JavaScript / HTML** pero con planes de migrar íntegramente hacia **React**, **Ant Design** y **TailwindCSS** en el futuro para aplicar mejores estándares.

La finalidad principal del sistema es ofrecer autenticación segura, control de transacciones o finanzas personales y gestión de perfiles.

## 🛠️ Tecnologías Principales

### Backend
- **Node.js & Express**: Servidor principal HTTP.
- **TypeScript**: Tipado seguro y escalabilidad arquitectónica.
- **PostgreSQL (pg)**: Base de datos relacional para guardar información de usuarios y gastos.
- **JWT & Bcrypt**: Autenticación y encriptación de datos sensibles.

### Frontend
- **HTML5 & Vanilla JavaScript**: (Estado actual) Cliente ligero de la app `app.js` e `index.html`.
- **Target Stack (Planeado)**: React.js, Ant Design (antd) para componentes UI rápidos y Tailwind CSS para estilización modular.

## 📂 Archivos y Estructura

El repositorio sigue unos lineamientos estrictos para la separación de capas MVC en el Backend:

- `backend/src/controllers/`: Gestión de Entrada/Salida (Request & Response).
- `backend/src/services/`: Lógica de negocio dura, consultas en BD y cálculos.
- `backend/src/routes/`: Declaración de endpoints del servidor.
- `backend/src/models/` y `db/`: Conexión de base de datos y esquemas de tablas.
- `backend/src/utils/` y `middleware/`: Utilidades comunes y seguridad (ej. JWT Auth).

## 🚀 Empezar a utilizar
El entorno está preparado para ser levantado localmente u orquestado mediante `docker-compose.yml`.

### Requisitos Previos
- Node.js (v20+)
- PostgreSQL corriendo localmente o mediante Docker.

### Instalación de dependencias

```bash
# Para el backend
cd backend
npm install
npm run build 
npm run start
```

### Acceso a Documentación de Arquitectura Completa
Para ver detalladamente diagramas de flujo, la integración entre la base de datos y la arquitectura basada en micro-servicios / MVC, por favor revisa el archivo de arquitectura.

[👉 Ver Arquitectura y Diagramas de Flujo](./docs/architecture.md)

---
*Este documento ha sido generado siguiendo las **skills de documentación** del equipo, priorizando el uso bilingüe estándar (Código en Inglés, Docs en Español).*
