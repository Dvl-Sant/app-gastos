-- ============================================
-- Migration 007: bancos, límite de crédito, débitos vinculados a ahorros
-- y destino configurable de ingresos (idempotente)
-- ============================================

CREATE TABLE IF NOT EXISTS banks (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(7),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, name)
);

ALTER TABLE accounts ADD COLUMN IF NOT EXISTS bank_id INTEGER REFERENCES banks(id) ON DELETE SET NULL;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS credit_limit DECIMAL(12,2);
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS linked_to_savings BOOLEAN NOT NULL DEFAULT false;

-- Auto-migración: un banco por cada tarjeta de crédito (usa su nombre actual).
-- El usuario puede renombrar/reorganizar desde la UI después.
INSERT INTO banks (user_id, name, color)
SELECT DISTINCT user_id, name, color FROM accounts WHERE type = 'credito'
ON CONFLICT (user_id, name) DO NOTHING;

UPDATE accounts a
SET bank_id = b.id
FROM banks b
WHERE b.user_id = a.user_id AND b.name = a.name AND a.type = 'credito' AND a.bank_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_accounts_bank ON accounts(bank_id);
CREATE INDEX IF NOT EXISTS idx_banks_user ON banks(user_id);

-- Ajuste por usuario: cuenta donde se acreditan los ingresos liquidados
-- (NULL = primera cuenta de efectivo)
ALTER TABLE users ADD COLUMN IF NOT EXISTS income_settlement_account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL;
