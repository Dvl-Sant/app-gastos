-- ============================================
-- Migration 008: préstamos (dinero prestado a personas)
-- + traspasos libres entre cuentas (idempotente)
-- ============================================

CREATE TABLE IF NOT EXISTS loans (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    person_name VARCHAR(100) NOT NULL,
    concept VARCHAR(255) NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
    loan_date DATE NOT NULL DEFAULT CURRENT_DATE,
    comments TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS loan_payments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    loan_id INTEGER NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
    amount DECIMAL(12,2) NOT NULL,
    account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
    paid_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    note VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS account_transfers (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    from_account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
    to_account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
    amount DECIMAL(12,2) NOT NULL,
    note VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_loans_user ON loans(user_id);
CREATE INDEX IF NOT EXISTS idx_loan_payments_loan ON loan_payments(loan_id);
CREATE INDEX IF NOT EXISTS idx_account_transfers_user ON account_transfers(user_id);
