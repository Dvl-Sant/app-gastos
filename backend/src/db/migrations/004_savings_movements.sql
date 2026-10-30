-- ============================================
-- Migration 004: movimientos de ahorros
-- Registra traspasos de cuentas (efectivo/débito) hacia los ahorros.
-- ============================================

CREATE TABLE savings_movements (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(12,2) NOT NULL,
    kind VARCHAR(20) NOT NULL DEFAULT 'traspaso' CHECK (kind IN ('traspaso', 'ajuste')),
    source_account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
    note VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_savings_movements_user ON savings_movements(user_id);
