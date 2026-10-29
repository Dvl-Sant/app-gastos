# AppGastos - Administrador de Gastos Personales

Bienvenido a **AppGastos**, una aplicación de finanzas personales enfocada en el manejo realista del dinero mexicano: ingresos frecuentes y únicos, gastos recurrentes, gastos únicos y **compras a meses (MSI) en tarjetas de crédito con estados de cuenta por ciclo de corte**.

## Descripción General

- **Backend**: Node.js, Express y TypeScript, PostgreSQL, autenticación JWT + Bcrypt.
- **Frontend**: React 18 + Vite + TypeScript, Ant Design, TailwindCSS y Framer Motion.

## 🧠 Modelo de negocio

- **Cuentas**: efectivo, débito y **crédito** (las tarjetas llevan **día de corte** y **día límite de pago**). Cada usuario inicia con una cuenta "Efectivo".
- **Gastos** (declaraciones):
  - `recurrente` — cargo fijo cada mes el día que elijas (renta, suscripciones). Genera mensualidades rodantes.
  - `unico` — gasto de una sola vez; en tarjeta entra al estado de cuenta del próximo corte y vence en la fecha límite de pago de ese ciclo; en efectivo/débito se registra pagado.
  - `msi` — monto total diferido a N mensualidades (una por ciclo de corte) que **vencen en la fecha límite de pago** de la tarjeta, empezando en el corte siguiente a la compra.
- **Mensualidades (`dues`)**: cada mensualidad es una fila con fecha real, monto, pagado y pendiente — se pueden pagar completas, parciales o por estado de cuenta (FIFO).
- **Estado de cuenta**: por tarjeta, ventana `(corte anterior, próximo corte]`: suma los gastos del periodo + las mensualidades que vencen en él. Se puede pagar todo, un monto arbitrario o mensualidad por mensualidad.
- **Ingresos**: `frecuente` (semanal/quincenal/mensual con día de pago, se proyectan en el calendario) o `unico` (con fecha real).
- **Ahorros**: saldo independiente que actualizas manualmente (no se mezcla con las cuentas).
- **Flujo**: cualquier rango de fechas muestra vencimientos + ingresos proyectados + neto por mes.

## 🛠️ Tecnologías

- **Backend**: Express + TypeScript, PostgreSQL (`pg`), JWT, Bcrypt, Helmet, express-rate-limit. Rutas bajo `/api`.
- **Frontend**: React + Vite, antd (formularios/tablas/modales), Tailwind (layout), Framer Motion (animaciones), react-router-dom.

## 📂 Estructura

- `backend/src/services/` — lógica de negocio (cuentas/estados de cuenta, gastos/mensualidades, pagos, ingresos, flujo, dashboard).
- `backend/src/routes/` y `controllers/` — endpoints REST bajo `/api`.
- `backend/src/db/migrations/001_init.sql` — esquema completo (v2).
- `backend/src/utils/dates.ts` — calendario: cortes, ciclos, meses (todo en `YYYY-MM-DD`).
- `frontend/src/pages/` — Panel, Cuentas (+ estado de cuenta), Flujo, Historial, Login.
- `frontend/src/components/` — tablas, modales (gasto 3 tipos, ingreso 2 tipos, cuenta, pagos flexibles).

## 🚀 Empezar

### Docker (recomendado)

```bash
cp .env.example .env   # ajusta valores
docker compose up --build
```

- Frontend: http://localhost:8082 (nginx + proxy `/api`)
- API: http://localhost:3002
- PostgreSQL (host): puerto 5435

> Puertos elegidos para no chocar con otros proyectos Docker del equipo (3000/3001/5433/6379/8080/8081). Configurables en `.env` y `docker-compose.yml`.

### Desarrollo local

```bash
# Backend (puerto 3002)
cd backend && npm install && npm run dev

# Frontend (puerto 5173, proxy /api -> localhost:3002)
cd frontend && npm install && npm run dev
```

> ⚠️ No hay usuario por defecto: crea tu cuenta desde el registro. Al registrarte se crean tu saldo de ahorros y la cuenta "Efectivo".

### Base de datos

El esquema vive en una sola migración (`backend/src/db/migrations/001_init.sql`) que PostgreSQL aplica al crear el volumen. Para partir de cero:

```bash
docker compose down -v && docker compose up --build
```

## 📖 Documentación

[👉 Arquitectura y Diagramas de Flujo](./docs/architecture.md)

---
*Generado siguiendo las **skills de documentación** del equipo (Código en Inglés, Docs en Español).*
