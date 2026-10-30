-- ============================================
-- Migration 003: liquidación automática de ingresos
-- Registra qué ocurrencias de ingresos ya se acreditaron a la cuenta
-- de efectivo, para que al pasar su fecha se sumen una sola vez.
-- ============================================

CREATE TABLE income_settlements (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    income_id INTEGER NOT NULL REFERENCES incomes(id) ON DELETE CASCADE,
    settled_date DATE NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (income_id, settled_date)
);

CREATE INDEX idx_income_settlements_user ON income_settlements(user_id);
