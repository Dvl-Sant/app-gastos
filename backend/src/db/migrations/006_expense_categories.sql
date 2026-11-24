-- ============================================
-- Migration 006: categorías de gastos personalizadas por usuario
-- (idempotente: segura de re-aplicar)
-- ============================================

CREATE TABLE IF NOT EXISTS expense_categories (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, name)
);

CREATE INDEX IF NOT EXISTS idx_expense_categories_user ON expense_categories(user_id);

-- Semilla para usuarios existentes (nuevos usuarios la reciben en el registro)
INSERT INTO expense_categories (user_id, name)
SELECT u.id, c.name
FROM users u
CROSS JOIN (VALUES
    ('Vivienda y Servicios'),
    ('Transporte'),
    ('Comida'),
    ('Entretenimiento'),
    ('Pago de Deudas'),
    ('Otro')
) AS c(name)
WHERE NOT EXISTS (
    SELECT 1 FROM expense_categories e WHERE e.user_id = u.id AND e.name = c.name
);
