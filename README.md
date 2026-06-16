<div align="center">

# 💰 AppGastos

**Administrador de Finanzas Personales — Gestiona tus gastos, ingresos y ahorros en un solo lugar**

[![Status](https://img.shields.io/badge/Estado-Activo-success?style=for-the-badge)](./docs/architecture.md)
[![Node](https://img.shields.io/badge/Node.js-20%2B-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Express](https://img.shields.io/badge/Express-4.21-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white)](./docker-compose.yml)
[![License](https://img.shields.io/badge/Licencia-MIT-blue?style=for-the-badge)](#-licencia)

</div>

---

## 🧭 Tabla de Contenidos

| Sección | Descripción |
|---------|-------------|
| [✨ Características](#-características) | Qué hace AppGastos |
| [🧩 Tech Stack](#-tech-stack) | Tecnologías utilizadas |
| [🏗️ Arquitectura](#️-arquitectura) | Cómo está estructurado el sistema |
| [📡 API Endpoints](#-api-endpoints) | Documentación de rutas REST |
| [📂 Estructura del Proyecto](#-estructura-del-proyecto) | Organización de carpetas |
| [🚀 Inicio Rápido](#-inicio-rápido) | Cómo levantar el proyecto |
| [🐳 Docker](#-docker) | Despliegue con contenedores |
| [⚙️ Variables de Entorno](#️-variables-de-entorno) | Configuración |
| [🗺️ Roadmap](#️-roadmap) | Próximas mejoras |
| [📄 Licencia](#-licencia) | Información legal |

---

## ✨ Características

> Una solución completa para el control de tus finanzas personales, con autenticación segura y datos aislados por usuario.

- 🔐 **Autenticación Segura** — Registro y login con encriptación **Bcrypt** y sesiones **JWT**.
- 💸 **Gestión de Gastos** — Registra, edita y elimina tus gastos con categorización.
- 💵 **Control de Ingresos** — Lleva el seguimiento de tus fuentes de ingresos.
- 🐖 **Metas de Ahorro** — Define y actualiza tus objetivos de ahorro.
- 📊 **Dashboard Inteligente** — Resumen consolidado de tu situación financiera.
- 📈 **Analíticas** — Visualiza tendencias y estadísticas de tu comportamiento.
- 🕘 **Historial Completo** — Consulta el registro cronológico de tus movimientos.
- 👤 **Aislamiento por Usuario** — Cada usuario solo accede a su propia información.

---

## 🧩 Tech Stack

### 🔹 Backend

| Tecnología | Uso |
|------------|-----|
| ![Node.js](https://img.shields.io/badge/-Node.js-339933?logo=node.js&logoColor=white) | Entorno de ejecución del servidor |
| ![Express](https://img.shields.io/badge/-Express-000000?logo=express&logoColor=white) | Framework HTTP y enrutamiento |
| ![TypeScript](https://img.shields.io/badge/-TypeScript-3178C6?logo=typescript&logoColor=white) | Tipado estático y seguridad |
| ![PostgreSQL](https://img.shields.io/badge/-PostgreSQL-4169E1?logo=postgresql&logoColor=white) | Base de datos relacional (`pg`) |
| ![JWT](https://img.shields.io/badge/-JWT-000000?logo=jsonwebtokens&logoColor=white) | Autenticación por tokens |
| ![Bcrypt](https://img.shields.io/badge/-Bcrypt-003A70) | Hashing de contraseñas |

### 🔹 Frontend *(Estado actual)*

| Tecnología | Uso |
|------------|-----|
| ![HTML5](https://img.shields.io/badge/-HTML5-E34F26?logo=html5&logoColor=white) | Estructura de la interfaz |
| ![JavaScript](https://img.shields.io/badge/-JavaScript-F7DF1E?logo=javascript&logoColor=black) | Lógica del cliente (Vanilla) |
| ![Nginx](https://img.shields.io/badge/-Nginx-009639?logo=nginx&logoColor=white) | Servidor web estático (Docker) |

### 🔹 DevOps & Herramientas

![Docker](https://img.shields.io/badge/-Docker-2496ED?logo=docker&logoColor=white)
![Docker Compose](https://img.shields.io/badge/-Docker%20Compose-2496ED?logo=docker&logoColor=white)
![Nodemon](https://img.shields.io/badge/-Nodemon-76D04B?logo=nodemon&logoColor=white)
![ts-node](https://img.shields.io/badge/-ts--node-3178C6)

---

## 🏗️ Arquitectura

AppGastos sigue un patrón **Cliente-Servidor** con una arquitectura **MVC por capas** que separa claramente las responsabilidades y reduce el acoplamiento.

```mermaid
graph TD
    subgraph Frontend["🖥️ Frontend — HTML/JS + Nginx"]
        UI[ Interfaces Web ]
        Client[ app.js / Hooks ]
    end

    subgraph Backend["⚙️ Backend — Express + TypeScript"]
        Routes[ Routes ]
        MW[ Auth Middleware JWT ]
        Ctrl[ Controllers ]
        Serv[ Services ]
    end

    subgraph DB["🗄️ PostgreSQL"]
        Tables[( Tablas AppGastos )]
    end

    UI -->|Fetch| Client
    Client -->|HTTP REST| Routes
    Routes -->|Token| MW
    MW -->|Autoriza| Ctrl
    Ctrl -->|Delega| Serv
    Serv <-->|SQL| Tables
```

> 📖 **¿Quieres ver los diagramas de flujo de autenticación, manejo de errores y el modelo estructural?**
>
> 👉 [**Lee la documentación de arquitectura completa**](./docs/architecture.md)

**Principios clave del diseño:**

- ✅ **Controllers livianos** — Manejan el ciclo HTTP en menos de 15 líneas.
- ✅ **Services pesados** — Toda la lógica de negocio y consultas a BD.
- ✅ **Frontend pasivo** — Solo recibe y renderiza, sin cálculos complejos.

---

## 📡 API Endpoints

Todas las rutas —excepto `/auth`— requieren un **Bearer Token JWT** en el header `Authorization`.

### 🔓 Autenticación — Pública

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/auth/register` | Registrar un nuevo usuario |
| `POST` | `/auth/login` | Iniciar sesión y obtener token |

### 🔒 Recursos Protegidos

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/dashboard/summary` | Resumen financiero consolidado |
| `GET` | `/analytics` | Estadísticas y tendencias |
| `GET` | `/history` | Historial cronológico de movimientos |
| `GET` `POST` `PUT` `DELETE` | `/expenses` | CRUD completo de gastos |
| `GET` `POST` `PUT` `DELETE` | `/incomes` | CRUD completo de ingresos |
| `GET` `PUT` | `/savings` | Consulta y actualización de ahorros |

#### 📝 Formato de Respuesta Estandarizado

```json
// ✅ Éxito
{ "status": "success", "data": { ... } }

// ❌ Error
{ "status": "error", "message": "Token expirado." }
```

---

## 📂 Estructura del Proyecto

```
AppGastos/
├── 📂 backend/                  # API REST en Node.js + TypeScript
│   ├── 📂 src/
│   │   ├── 📂 controllers/      #   Entrada/Salida HTTP (req, res)
│   │   ├── 📂 services/         #   Lógica de negocio y BD
│   │   ├── 📂 routes/           #   Definición de endpoints
│   │   ├── 📂 models/           #   Modelos y validación de datos
│   │   ├── 📂 middleware/       #   Auth JWT y validaciones
│   │   ├── 📂 db/
│   │   │   ├── pool.ts          #     Conexión PostgreSQL
│   │   │   └── 📂 migrations/   #     Scripts SQL de esquema
│   │   ├── app.ts               #   Configuración de Express
│   │   └── server.ts            #   Punto de entrada
│   ├── Dockerfile
│   └── package.json
├── 📂 frontend/                 # Cliente web
│   ├── 📂 public/
│   │   ├── index.html           #   Dashboard principal
│   │   ├── login.html           #   Pantalla de acceso
│   │   ├── history.html         #   Historial de movimientos
│   │   └── app.js               #   Lógica del cliente
│   └── Dockerfile               #   Nginx
├── 📂 docs/
│   └── architecture.md          #   Diagramas y detalles técnicos
├── docker-compose.yml           #   Orquestación de servicios
├── .env.example                 #   Variables de entorno de ejemplo
└── README.md
```

---

## 🚀 Inicio Rápido

### 📋 Requisitos Previos

- **[Node.js](https://nodejs.org/)** v20 o superior
- **[PostgreSQL](https://www.postgresql.org/)** 16+ (local o vía Docker)
- **npm** (incluido con Node.js)

### 🔧 Instalación Local

```bash
# 1. Clona el repositorio
git clone <url-del-repo>
cd AppGastos

# 2. Configura tus variables de entorno
cp .env.example .env
#    ↳ Edita .env con tus credenciales

# 3. Instala y ejecuta el backend
cd backend
npm install
npm run dev      # Modo desarrollo (hot-reload)
# o
npm run build && npm start   # Modo producción
```

| Script | Descripción |
|--------|-------------|
| `npm run dev` | Servidor de desarrollo con recarga automática |
| `npm run build` | Compila TypeScript a `dist/` |
| `npm start` | Ejecuta la versión compilada |

La API estará disponible en **`http://localhost:3000`** 🎉

---

## 🐳 Docker

La forma más rápida de levantar todo el stack (API + Frontend + Base de Datos):

```bash
# Levanta todos los servicios en segundo plano
docker-compose up -d

# Ver los logs en vivo
docker-compose logs -f

# Detener todo
docker-compose down
```

### 🌐 Puertos de los Servicios

| Servicio | Puerto | URL |
|----------|--------|-----|
| 🟢 **API Backend** | `3000` | `http://localhost:3000` |
| 🔵 **Frontend Web** | `8080` | `http://localhost:8080` |
| 🟣 **PostgreSQL** | `5432` | `localhost:5432` |

---

## ⚙️ Variables de Entorno

Configura tu archivo `.env` basándote en [`.env.example`](./.env.example):

```env
PORT=3000
DB_HOST=db
DB_PORT=5432
DB_NAME=appgastos
DB_USER=postgres
DB_PASSWORD=postgres
JWT_SECRET=change_this_to_a_secure_random_string
```

> ⚠️ **Importante:** En producción, usa siempre una contraseña segura y un `JWT_SECRET` aleatorio robusto.

---

## 🗺️ Roadmap

- [x] Backend funcional con CRUD de gastos, ingresos y ahorros
- [x] Autenticación JWT + Bcrypt
- [x] Aislamiento de datos por usuario
- [x] Dashboard y analíticas
- [x] Despliegue con Docker Compose
- [ ] 🔄 Migración del frontend a **React**
- [ ] 🎨 Integración con **Ant Design** y **TailwindCSS**
- [ ] 📱 App móvil responsive
- [ ] 🔔 Notificaciones y recordatorios

---

## 📄 Licencia

Este proyecto está bajo la licencia **MIT**.

---

<div align="center">

<sub>🛠️ Proyecto construido siguiendo principios **SOLID** y clean architecture.</sub><br>
<sub>📄 Código en **Inglés** · 📚 Documentación en **Español**</sub>

**⭐ Si te resulta útil, ¡no dudes en dejar una estrella!**

</div>
