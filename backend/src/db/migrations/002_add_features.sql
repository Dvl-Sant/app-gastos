CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert a default user 'admin' with password 'admin123' (hash generated via bcrypt)
-- Password 'admin123' -> $2b$10$C1.G2fC3xU9Q.Zq7TWeCGe5Vb8/h8b61QnF/EwHq2o.Z7sL2A1vR.
INSERT INTO users (username, password_hash)
VALUES ('admin', '$2b$10$C1.G2fC3xU9Q.Zq7TWeCGe5Vb8/h8b61QnF/EwHq2o.Z7sL2A1vR.')
ON CONFLICT (username) DO NOTHING;

CREATE TABLE IF NOT EXISTS incomes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    frequency VARCHAR(50) NOT NULL CHECK (frequency IN ('semanal', 'quincenal', 'mensual')),
    next_pay_date SMALLINT CHECK (next_pay_date BETWEEN 1 AND 31),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payment_history (
    id SERIAL PRIMARY KEY,
    expense_id INTEGER REFERENCES expenses(id) ON DELETE CASCADE,
    amount_paid DECIMAL(12,2) NOT NULL,
    payment_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    concept VARCHAR(255) NOT NULL
);
