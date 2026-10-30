# Arquitectura y Diagramas de Flujo - AppGastos

Este documento ilustra la arquitectura técnica y los flujos de datos operativos dentro del ecosistema de **AppGastos** (v2: cuentas, tarjetas de crédito, MSI y estados de cuenta), basándose en las regulaciones de la carpeta `.agent/skills/`.

## 1. Diagrama de Arquitectura de Alto Nivel

El sistema sigue una arquitectura estricta Cliente-Servidor. El cliente (SPA React) envía peticiones REST JSON al Backend (Express.js, rutas bajo `/api`), el cual procesa esa petición a través de enrutadores, controladores y luego la pasa a la capa de servicios para interactuar con la Base de Datos.

```mermaid
graph TD
    %% Nodos Frontend
    subgraph Frontend["Frontend SPA (React + Vite + antd)"]
        UI[Páginas: Login / Panel / Cuentas / Flujo / Historial]
        Hooks[Hooks + api client tipado]
        Nginx[Nginx - proxy /api]
    end

    %% Nodos Backend
    subgraph Backend["Backend (Node.js + Express + TS)"]
        Routes[Routes Express /api]
        Middleware[Auth Middleware JWT + Rate Limit]
        Ctrl[Controllers - HTTP Req/Res]
        Serv[Services - Lógica de Negocio]
        Dates[utils/dates - cortes y ciclos]
        DB_Config[DB Connector - pg]
    end

    %% Nodo Database
    subgraph Database["PostgreSQL"]
        DB[(Tablas de AppGastos)]
    end

    %% Relaciones
    UI -->|Evento UI| Hooks
    Hooks -->|fetch /api/*| Nginx
    Nginx -->|proxy| Routes
    Routes -->|Verificación Token + usuario existente| Middleware
    Middleware -->|Aprobado| Ctrl
    Ctrl -->|Delegación de Lógica| Serv
    Serv -->|Queries Asíncronas SQL| Dates
    Serv -->|Queries Asíncronas SQL| DB_Config
    DB_Config <-->|Conexión| DB

    %% Retornos
    Serv -.->|Return JSON/Entities| Ctrl
    Ctrl -.->|HTTP 200/400/401/404| UI
```

## 2. Modelo de Datos (Esquema v2)

Migraciones en `backend/src/db/migrations/` (`001` a `004`), aplicadas automáticamente al crear el volumen de Docker.

```mermaid
erDiagram
    users ||--o| user_savings : "ahorros"
    users ||--o{ accounts : "posee"
    users ||--o{ expenses : "declara"
    users ||--o{ incomes : "declara"
    users ||--o{ payments : "realiza"
    users ||--o{ savings_movements : "traspasa"
    accounts ||--o{ expenses : "carga"
    accounts ||--o{ dues : "vence"
    expenses ||--o{ dues : "genera"
    incomes ||--o{ income_settlements : "liquida"
    dues |o--o{ payments : "se paga con"

    users {
        int id PK
        string username
        string password_hash
    }
    accounts {
        int id PK
        int user_id FK
        string name
        string type "efectivo|debito|credito"
        int cut_off_day "día de corte (crédito)"
        int payment_due_day "límite de pago (crédito)"
        decimal balance "saldo / deuda derivada"
    }
    expenses {
        int id PK
        int account_id FK
        string expense_type "recurrente|unico|msi"
        decimal monthly_payment
        decimal total_amount
        int installments "N para MSI"
        int due_day "recurrente"
        date purchase_date
        bool is_paid
    }
    dues {
        int id PK
        int expense_id FK
        int account_id FK
        date due_date "fecha límite de pago"
        date cut_date "ciclo de corte al que pertenece"
        decimal amount
        decimal paid_amount
        bool is_paid
    }
    incomes {
        int id PK
        string income_type "frecuente|unico"
        string frequency "semanal|quincenal|mensual"
        int next_pay_day
        date received_at
    }
    income_settlements {
        int income_id FK
        date settled_date "único por (income_id, fecha)"
        decimal amount
    }
    user_savings {
        int user_id FK "único"
        decimal total_amount
    }
    savings_movements {
        decimal amount
        int source_account_id FK
        string kind "traspaso"
    }
    payments {
        int account_id FK "cuenta que recibe el pago"
        int source_account_id FK "origen del dinero (nunca la misma)"
        int due_id FK "mensualidad pagada (opcional)"
        decimal amount
    }
```

### Reglas de negocio clave

1. **Tarjetas de crédito**: `cut_off_day` cierra el estado de cuenta; `payment_due_day` es la fecha límite de pago. Ambos entre 1 y 28.
2. **Ciclo de un estado de cuenta**: ventana `(corte anterior, próximo corte]`. Las mensualidades se agrupan por `dues.cut_date`, no por su fecha de vencimiento.
3. **Fecha límite de pago de un ciclo**: si `payment_due_day > cut_off_day` cae en el mismo mes del corte; si es anterior o igual, al mes siguiente (ej.: corte 28, pago 10 → el ciclo que cierra 28/nov se paga el 10/dic). Implementado en `utils/dates.ts → paymentDateForCut()`.
4. **MSI**: N mensualidades, una por ciclo de corte desde el corte siguiente a la compra; cuota fija y la última absorbe el redondeo.
5. **Recurrentes**: generan 12 mensualidades rodantes (`ensureRecurringDues`, `ON CONFLICT DO NOTHING`), extendidas perezosamente al consultar calendario/flujo/panel.
6. **Deuda de tarjeta**: derivada, no almacenada: `SUM(amount - paid_amount)` de sus mensualidades no pagadas.
7. **Quincena fija**: los ingresos quincenales proyectan los días **15 y 28** de cada mes (febrero recorta al 28).
8. **Liquidación de ingresos** (`IncomesService.settleIncomes`): cada ocurrencia vencida se acredita **una sola vez** a la cuenta Efectivo; la idempotencia la garantiza `income_settlements (UNIQUE income_id + settled_date)`. Ninguna ocurrencia es anterior a la creación del ingreso.
9. **Fuentes de pago**: ahorros o cualquier cuenta/tarjeta **distinta** a la que recibe el pago. Pagar una tarjeta consigo misma devuelve 400.
10. **Ahorros**: independientes de las cuentas; se alimentan por traspaso (`savings_movements`) o se definen manualmente.

## 3. Flujo de Autenticación de Usuario (Login)

```mermaid
sequenceDiagram
    participant C as Cliente (Web)
    participant R as Routes (/api/auth)
    participant M as AuthMiddleware
    participant S as AuthService
    participant DB as PostgreSQL

    C->>R: POST /api/auth/login { username, password }
    R->>R: Rate limit (20 intentos / 15 min)
    R->>S: delegate login(username, password)
    S->>DB: Query: buscar usuario por username
    DB-->>S: UserRecord (hash password)

    alt Usuario No Existe o Contraseña Incorrecta
        S-->>R: Unauthorized (401)
        R-->>C: { status: 'error', message: 'Credenciales inválidas' }
    else Credenciales Correctas
        S->>S: bcrypt.compare(pass, hash)
        S->>S: generate JWT(user.id)
        S-->>R: { user, token }
        R-->>C: { status: 'success', data: { token, user } }
    end
```

> El registro crea además la fila de **ahorros** y la cuenta **Efectivo** del usuario.
> El middleware verifica que el usuario del JWT **exista** en cada petición: si fue
> eliminado (p. ej. tras un reset de BD) responde 401 y el frontend cierra sesión.

## 4. Flujo: Compra a meses (MSI) y Estado de Cuenta

```mermaid
sequenceDiagram
    participant C as Cliente
    participant E as ExpensesService
    participant DB as PostgreSQL

    C->>E: POST /api/expenses { tipo: msi, total: 3000, meses: 3, tarjeta: "Plata" (corte 28, pago 10) }
    E->>DB: INSERT expenses (monthly_payment=1000, installments=3)
    E->>E: firstCut = próximo corte >= compra (28/nov)
    loop i = 0..N-1
        E->>E: cycleCut = firstCut + i meses
        E->>E: dueDate = paymentDateForCut(cycleCut) -> 10/dic, 10/ene, 10/feb
        E->>DB: INSERT dues (due_date, cut_date=cycleCut, amount)
    end
    E-->>C: Gasto creado con calendario de mensualidades

    Note over C,DB: El estado de cuenta del ciclo (29/oct -> 28/nov) incluye<br/>la mensualidad 1 + los gastos únicos declarados en el periodo
    C->>E: GET /api/accounts/:id/statement
    E->>DB: SELECT dues WHERE cut_date = 28/nov
    E-->>C: { dues, totals: { total, pagado, pendiente } }
```

## 5. Flujo: Liquidación automática de ingresos

```mermaid
flowchart LR
    Load[Panel o Flujo se abre] --> Ensure[settleIncomes]
    Ensure --> Proj[Proyectar ocurrencias hasta hoy:<br/>semanal día+7n, quincenal 15/28, mensual día, únicos]
    Proj --> New{¿Ocurrencia nueva?<br/>UNIQUE income_id + fecha}
    New -->|Sí| Credit[Efectivo.balance += monto<br/>INSERT income_settlements]
    New -->|Ya liquidada| Skip[Ignorar]
    Credit --> Done[Saldo actualizado una sola vez]
```

## 6. Flujo: Pago flexible

```mermaid
flowchart TD
    Pay[Pagar mensualidad o estado de cuenta] --> Amount{Monto}
    Amount -->|Completa / Todo| FIFO[Aplicar al total pendiente]
    Amount -->|Parcial| FIFO2[Aplicar monto; las mensualidades<br/>quedan parcialmente pagadas]
    FIFO --> Source{¿De dónde sale el dinero?}
    FIFO2 --> Source
    Source -->|Ahorros| Sav[user_savings.total_amount -= monto]
    Source -->|Cuenta/Tarjeta| Acc[Validar origen != cuenta destino<br/>accounts.balance -= monto]
    Sav --> Record[INSERT payments con origen y mensualidad]
    Acc --> Record
    Record --> Done[Pago visible en Historial con n/N si es MSI]
```

## 7. Modelo Estructural (Boilerplate Rules)

Acorde a las Skills del agente (`estructura-proyectos` y `frontend-react`), la organización del sistema respeta los principios `SOLID` reduciendo el acomplamiento:

*   **Controllers Livianos**: El controlador maneja el ciclo HTTP `(req, res)` y delega; la validación de cuerpo vive en `validation.middleware` y la específica por tipo en los servicios (`HttpError` → 400/404 limpios).
*   **Servicios Pesados**: Los `.service.ts` manejan transacciones (`BEGIN/COMMIT/ROLLBACK` con `SELECT ... FOR UPDATE`), generación de calendarios y agregaciones antes de devolver data estructurada.
*   **Fechas de calendario**: toda la lógica de fechas usa strings `YYYY-MM-DD` sin zonas horarias (`utils/dates.ts`); `pg` está configurado para devolver `DATE` como texto.
*   **Gestión Eficiente**: El frontend nunca hace cálculos de negocio ni agrupaciones complejas: recibe datos listos (calendario, estados de cuenta, flujo por mes) y solo renderiza.

## 8. Tipado y Manejo de Errores

Respuesta estandarizada hacia el frontend:

```typescript
// ✅ Caso de Éxito
{ status: 'success', data: { token, user } }

// ❌ Caso de Error
{ status: 'error', message: 'No puedes pagar una tarjeta con ella misma' }
```

```mermaid
flowchart LR
    Err[HttpError o error controlado] --> Handler[Global Error Handler]
    Handler --> Known[HttpError -> status + message]
    Handler --> Json[JSON inválido -> 400]
    Handler --> Unknown[Error interno -> 500 sin filtrar detalles]
    Known --> F[Frontend: antd message + redirección 401/403]
    Json --> F
    Unknown --> F
```

*Seguridad*: Helmet, CORS configurable (`CORS_ORIGIN`), rate-limit en `/api/auth`, JWT con secreto obligatorio en producción (falla el arranque si falta), verificación de existencia de usuario por petición, y sin exposición de mensajes internos en errores 500.
