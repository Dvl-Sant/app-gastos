-- ============================================
-- Migration 009: abonos periódicos en préstamos (idempotente)
-- payment_frequency = cada cuánto se espera un abono
-- (NULL = sin periodo fijo)
-- ============================================

ALTER TABLE loans ADD COLUMN IF NOT EXISTS payment_frequency VARCHAR(20);
