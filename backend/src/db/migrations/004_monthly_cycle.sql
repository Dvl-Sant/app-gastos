-- ============================================
-- Migration 004: Monthly Billing Cycle
-- Tracks which month each expense was paid
-- Enables automatic monthly reset
-- ============================================

ALTER TABLE expenses ADD COLUMN IF NOT EXISTS last_paid_month VARCHAR(7);

-- Set last_paid_month for expenses already marked as paid
UPDATE expenses SET last_paid_month = TO_CHAR(NOW(), 'YYYY-MM') WHERE is_paid = true AND last_paid_month IS NULL;

CREATE INDEX IF NOT EXISTS idx_expenses_last_paid_month ON expenses(last_paid_month);
