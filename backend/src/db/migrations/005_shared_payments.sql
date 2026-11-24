-- ============================================
-- Migration 005: gastos compartidos (idempotente)
-- Grupos periódicos donde el usuario paga y los miembros le reembolsan
-- su parte, mensual o varios meses por adelantado.
-- period = 'YYYY-MM' (un registro por miembro y mes cubierto).
-- ============================================

CREATE TABLE IF NOT EXISTS shared_groups (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    member_cuota DECIMAL(12,2) NOT NULL DEFAULT 0,
    due_day SMALLINT CHECK (due_day IS NULL OR due_day BETWEEN 1 AND 28),
    total_cost DECIMAL(12,2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shared_members (
    id SERIAL PRIMARY KEY,
    group_id INTEGER NOT NULL REFERENCES shared_groups(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    note VARCHAR(255),
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (group_id, name)
);

CREATE TABLE IF NOT EXISTS shared_payments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    group_id INTEGER NOT NULL REFERENCES shared_groups(id) ON DELETE CASCADE,
    member_id INTEGER NOT NULL REFERENCES shared_members(id) ON DELETE CASCADE,
    period CHAR(7) NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    paid_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    note VARCHAR(255),
    UNIQUE (member_id, period)
);

CREATE INDEX IF NOT EXISTS idx_shared_groups_user ON shared_groups(user_id);
CREATE INDEX IF NOT EXISTS idx_shared_members_group ON shared_members(group_id);
CREATE INDEX IF NOT EXISTS idx_shared_payments_member ON shared_payments(member_id);
CREATE INDEX IF NOT EXISTS idx_shared_payments_group_period ON shared_payments(group_id, period);
