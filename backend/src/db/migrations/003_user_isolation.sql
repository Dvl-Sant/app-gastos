-- ============================================
-- Migration 003: User Isolation
-- Adds user_id to expenses, user_savings, payment_history
-- Assigns existing data to admin (user_id = 1)
-- ============================================

-- 1. Add user_id to expenses
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS user_id INTEGER;

UPDATE expenses SET user_id = 1 WHERE user_id IS NULL;

ALTER TABLE expenses ALTER COLUMN user_id SET NOT NULL;

ALTER TABLE expenses ADD CONSTRAINT fk_expenses_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- 2. Add user_id to user_savings
ALTER TABLE user_savings ADD COLUMN IF NOT EXISTS user_id INTEGER;

UPDATE user_savings SET user_id = 1 WHERE user_id IS NULL;

ALTER TABLE user_savings ALTER COLUMN user_id SET NOT NULL;

ALTER TABLE user_savings ADD CONSTRAINT fk_savings_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Drop single-row constraint: allow multiple savings rows (one per user)
ALTER TABLE user_savings DROP CONSTRAINT IF EXISTS user_savings_pkey;
ALTER TABLE user_savings ADD PRIMARY KEY (id);

-- 3. Add user_id to payment_history via expenses relationship
-- (payment_history already references expenses, which now has user_id)
-- Add a direct user_id for faster queries
ALTER TABLE payment_history ADD COLUMN IF NOT EXISTS user_id INTEGER;

UPDATE payment_history SET user_id = 1 WHERE user_id IS NULL;

ALTER TABLE payment_history ALTER COLUMN user_id SET NOT NULL;

ALTER TABLE payment_history ADD CONSTRAINT fk_history_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- 4. Create user_savings row for admin if missing
INSERT INTO user_savings (user_id, total_amount, currency)
SELECT 1, COALESCE((SELECT total_amount FROM user_savings WHERE user_id = 1 LIMIT 1), 0), 'USD'
WHERE NOT EXISTS (SELECT 1 FROM user_savings WHERE user_id = 1);

-- 5. Add index for performance
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_savings_user_id ON user_savings(user_id);
CREATE INDEX IF NOT EXISTS idx_history_user_id ON payment_history(user_id);
CREATE INDEX IF NOT EXISTS idx_incomes_user_id ON incomes(user_id);

-- 6. Reset sequences to avoid duplicate key errors
SELECT setval('user_savings_id_seq', (SELECT COALESCE(MAX(id), 1) FROM user_savings));
SELECT setval('expenses_id_seq', (SELECT COALESCE(MAX(id), 1) FROM expenses));
SELECT setval('payment_history_id_seq', (SELECT COALESCE(MAX(id), 1) FROM payment_history));
SELECT setval('users_id_seq', (SELECT COALESCE(MAX(id), 1) FROM users));
SELECT setval('incomes_id_seq', (SELECT COALESCE(MAX(id), 1) FROM incomes));
