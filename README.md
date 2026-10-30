# AppGastos - Administrador de Gastos Personales

Bienvenido a **AppGastos**, una aplicación de finanzas personales enfocada en el manejo realista del dinero: ingresos frecuentes y únicos que se acreditan solos, gastos recurrentes, gastos únicos y **compras a meses (MSI) en tarjetas de crédito con estados de cuenta por ciclo de corte y fecha límite de pago**.

## Descripción General

- **Backend**: Node.js, Express y TypeScript, PostgreSQL, autenticación JWT + Bcrypt.
- **Frontend**: React 18 + Vite + TypeScript, Ant Design, TailwindCSS y Framer Motion.

## 🧠 Modelo de negocio

- **Cuentas**: efectivo, débito y **crédito**. Las tarjetas llevan **día de corte** y **día límite de pago** (ambos obligatorios). Cada usuario inicia con una cuenta "Efectivo".
- **Gastos** (declaraciones):
  - `recurrente` — cargo fijo cada mes el día que elijas (renta, suscripciones). Genera mensualidades rodantes por 12 meses, extendidas automáticamente al consultar.
  - `unico` — gasto de una sola vez; en tarjeta entra al estado de cuenta del próximo corte y **vence en la fecha límite de pago** de ese ciclo; en efectivo/débito se registra pagado.
  - `msi` — monto total diferido a N mensualidades (una por ciclo de corte) que **vencen en la fecha límite de pago** de la tarjeta, empezando en el corte siguiente a la compra. La última cuota absorbe el redondeo.
- **Mensualidades (`dues`)**: cada una con fecha real de vencimiento y el corte al que pertenece (`cut_date`). Se pagan completas, parciales, o junto con el estado de cuenta (FIFO: primero las más antiguas).
- **Estado de cuenta**: por tarjeta, ventana `(corte anterior, próximo corte]`: suma los gastos del periodo + las mensualidades del ciclo. Se paga **total, parcial o mensualidad por mensualidad**, sacando dinero de **ahorros, efectivo/débito u otra tarjeta** (nunca de la misma tarjeta).
- **Ingresos**:
  - `frecuente` — semanal (día, +7, +14, +21), **quincenal fija (días 15 y 28)** o mensual (día 1-28). Se proyectan en el calendario y **se acreditan automáticamente a la cuenta Efectivo cuando llega su fecha** (una sola vez por ocurrencia, idempotente).
  - `unico` — con fecha real; se acredita a Efectivo cuando llega el día.
- **Ahorros**: saldo independiente con **traspasos** desde cuentas de efectivo/débito (registrados en `savings_movements`), o definición manual del total. Los pagos pueden salir de los ahorros.
- **Flujo**: cualquier rango de fechas muestra vencimientos, ingresos proyectados y neto por mes. El Panel tiene un selector de mes para ver *todos* los vencimientos (incluye MSI lejanos).
- **Historial**: pagos agrupados por cuenta, con el número de mensualidad (`1/3`, `2/3`…) en gastos a meses.

## 🛠️ Tecnologías

- **Backend**: Express + TypeScript, PostgreSQL (`pg`), JWT, Bcrypt, Helmet, express-rate-limit. Rutas bajo `/api`.
- **Frontend**: React + Vite, antd (formularios/tablas/modales), Tailwind (layout), Framer Motion (animaciones), react-router-dom.

## 📂 Estructura

- `backend/src/services/` — lógica de negocio (cuentas/estados de cuenta, gastos/mensualidades, pagos, ingresos/liquidaciones, flujo, dashboard, historial).
- `backend/src/routes/` y `controllers/` — endpoints REST bajo `/api`.
- `backend/src/db/migrations/` — esquema completo (`001` a `004`).
- `backend/src/utils/dates.ts` — calendario: cortes, ciclos, fechas límite de pago (todo en `YYYY-MM-DD`).
- `backend/src/config.ts` — configuración central (JWT, BD, CORS).
- `frontend/src/pages/` — Panel, Cuentas (+ estado de cuenta), Flujo, Historial, Login.
- `frontend/src/components/` — tablas y modales (gasto 3 tipos, ingreso 2 tipos, cuenta, pagos flexibles, ahorros con traspaso).

## 🔌 Endpoints principales

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/auth/register` `/api/auth/login` | Registro (crea Efectivo + ahorros) y login |
| GET/POST/PUT/DELETE | `/api/accounts` | CRUD de cuentas y tarjetas |
| GET | `/api/accounts/:id/statement` | Estado de cuenta del ciclo en curso |
| POST | `/api/accounts/:id/pay` | Pagar estado de cuenta (full / parcial) |
| GET | `/api/expenses` `/api/expenses/calendar?from&to` | Gastos y calendario de vencimientos |
| POST/PUT/DELETE | `/api/expenses` | Crear (3 tipos), editar, eliminar |
| POST | `/api/dues/:id/pay` | Pagar una mensualidad (completa o parcial) |
| GET/POST/PUT/DELETE | `/api/incomes` | Ingresos frecuentes y únicos |
| GET | `/api/savings` PUT `/api/savings` | Consultar / definir total de ahorros |
| POST | `/api/savings/transfer` | Traspaso de cuenta → ahorros |
| GET | `/api/cashflow?from&to` | Flujo proyectado por rango de fechas |
| GET | `/api/dashboard/summary` | Resumen del panel |
| GET | `/api/history` | Historial de pagos |
| GET | `/api/analytics` | Gastos por categoría |

Todas protegidas por JWT salvo `/api/auth/*` (rate-limited).

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

Las migraciones (`001` a `004`) viven en `backend/src/db/migrations/` y PostgreSQL las aplica automáticamente al crear el volumen. Para partir de cero:

```bash
docker compose down -v && docker compose up --build
```

## 📖 Documentación

[👉 Arquitectura y Diagramas de Flujo](./docs/architecture.md)

---
*Generado siguiendo las **skills de documentación** del equipo (Código en Inglés, Docs en Español).*
