-- ============================================
-- AppGastos Schema v2 (clean slate)
-- Modelo: cuentas/tarjetas, gastos (recurrente/unico/msi),
-- mensualidades materializadas (dues), ingresos (frecuente/unico),
-- pagos flexibles y ahorros como concepto separado.
-- ============================================

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ahorros: concepto separado de las cuentas de gasto/giro
CREATE TABLE user_savings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Cuentas y tarjetas. Las de crédito llevan día de corte y día límite de pago;
-- su deuda es derivada (sumatoria de mensualidades no pagadas).
CREATE TABLE accounts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('efectivo', 'debito', 'credito')),
    cut_off_day SMALLINT CHECK (cut_off_day IS NULL OR cut_off_day BETWEEN 1 AND 28),
    payment_due_day SMALLINT CHECK (payment_due_day IS NULL OR payment_due_day BETWEEN 1 AND 28),
    balance DECIMAL(12,2) NOT NULL DEFAULT 0,
    color VARCHAR(7),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Declaraciones de gasto:
--  - recurrente: cargo cada mes el día due_day (suscripciones, rentas)
--  - unico: gasto de una sola vez; en tarjeta se difiere al corte
--  - msi: diferido a N mensualidades que vencen el día de corte de la tarjeta
CREATE TABLE expenses (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    expense_type VARCHAR(20) NOT NULL DEFAULT 'recurrente'
        CHECK (expense_type IN ('recurrente', 'unico', 'msi')),
    monthly_payment DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    installments SMALLINT CHECK (installments IS NULL OR installments >= 1),
    due_day SMALLINT CHECK (due_day IS NULL OR due_day BETWEEN 1 AND 28),
    purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
    is_paid BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Mensualidades materializadas: una fila por mes (MSI y únicos) y por mes en
-- curso+siguientes (recurrentes, se extienden perezosamente con ensureRecurringDues).
-- due_date = fecha límite de pago; cut_date = ciclo de corte al que pertenece
-- (solo cuentas de crédito; NULL en efectivo/débito).
CREATE TABLE dues (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expense_id INTEGER NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
    account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    due_date DATE NOT NULL,
    cut_date DATE,
    amount DECIMAL(12,2) NOT NULL,
    paid_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    is_paid BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (expense_id, due_date)
);

-- Ingresos: frecuentes (se proyectan en el calendario) o únicos (con fecha real)
CREATE TABLE incomes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    income_type VARCHAR(20) NOT NULL DEFAULT 'frecuente'
        CHECK (income_type IN ('frecuente', 'unico')),
    frequency VARCHAR(50) CHECK (frequency IS NULL OR frequency IN ('semanal', 'quincenal', 'mensual')),
    next_pay_day SMALLINT CHECK (next_pay_day IS NULL OR next_pay_day BETWEEN 1 AND 28),
    received_at DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (
        (income_type = 'frecuente' AND frequency IS NOT NULL AND next_pay_day IS NOT NULL)
        OR (income_type = 'unico' AND received_at IS NOT NULL)
    )
);

-- Pagos: contra una mensualidad o contra el estado de cuenta completo/parcial.
-- El dinero sale de source_account_id (efectivo/débito).
CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    source_account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
    due_id INTEGER REFERENCES dues(id) ON DELETE SET NULL,
    amount DECIMAL(12,2) NOT NULL,
    note VARCHAR(255),
    paid_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_accounts_user ON accounts(user_id);
CREATE INDEX idx_expenses_user ON expenses(user_id);
CREATE INDEX idx_expenses_account ON expenses(account_id);
CREATE INDEX idx_dues_user_date ON dues(user_id, due_date);
CREATE INDEX idx_dues_expense ON dues(expense_id);
CREATE INDEX idx_dues_account_date ON dues(account_id, due_date);
CREATE INDEX idx_dues_account_cut ON dues(account_id, cut_date);
CREATE INDEX idx_incomes_user ON incomes(user_id);
CREATE INDEX idx_payments_user ON payments(user_id);
