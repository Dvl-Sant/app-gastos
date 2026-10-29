-- ============================================
-- Migration 002: cut_date en dues
-- Las mensualidades de tarjetas de crédito vencen en la fecha límite de
-- pago; cut_date guarda el ciclo de corte al que pertenecen para que el
-- estado de cuenta siga agrupando por corte.
-- Backfill: en el esquema previo las mensualidades vencían el día de corte,
-- por lo que due_date era a la vez el corte del ciclo.
-- ============================================

ALTER TABLE dues ADD COLUMN IF NOT EXISTS cut_date DATE;

UPDATE dues d
SET cut_date = d.due_date
FROM accounts a
WHERE d.account_id = a.id AND a.type = 'credito' AND d.cut_date IS NULL;

CREATE INDEX IF NOT EXISTS idx_dues_account_cut ON dues(account_id, cut_date);
