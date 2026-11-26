import pool, { getClient } from '../db/pool';
import { HttpError } from '../utils/errors';
import { addDays, addMonths, diffDays, toNum, todayISO } from '../utils/dates';
import { Loan, LoanPayment } from '../models/Loan';

export interface LoanWithStatus extends Loan {
    payments: { id: number; amount: string; account_name: string | null; paid_at: Date; note: string | null }[];
}

const FREQS = ['semanal', 'quincenal', 'mensual'] as const;
type Frequency = (typeof FREQS)[number];

/** Próximo abono esperado según frecuencia: último abono (o préstamo) + intervalo. */
function nextExpected(loan: {
    loan_date: string;
    payment_frequency: Frequency | null;
}, lastPaymentDate: string | null): { date: string | null; days: number | null } {
    if (!loan.payment_frequency) return { date: null, days: null };
    const base = lastPaymentDate ?? loan.loan_date;
    const step = loan.payment_frequency === 'semanal' ? 7 : loan.payment_frequency === 'quincenal' ? 15 : 0;
    const next = step > 0 ? addDays(base, step) : addMonths(base, 1);
    return { date: next, days: diffDays(todayISO(), next) };
}

export class LoansService {
    /** Lista con estado (abonado/pendiente), próximo abono esperado y pagos. */
    static async list(userId: number): Promise<LoanWithStatus[]> {
        const { rows: loans } = await pool.query(
            `SELECT l.*, a.name AS account_name,
                    COALESCE((SELECT SUM(lp.amount) FROM loan_payments lp WHERE lp.loan_id = l.id), 0) AS paid_amount
             FROM loans l
             LEFT JOIN accounts a ON a.id = l.account_id
             WHERE l.user_id = $1
             ORDER BY l.created_at DESC`,
            [userId]
        );
        const { rows: payments } = await pool.query(
            `SELECT lp.*, a.name AS account_name
             FROM loan_payments lp LEFT JOIN accounts a ON a.id = lp.account_id
             WHERE lp.user_id = $1 ORDER BY lp.paid_at DESC`,
            [userId]
        );

        return loans.map((l) => {
            const paid = toNum(l.paid_amount);
            const remaining = Math.max(0, toNum(l.amount) - paid);
            const loanPayments = payments
                .filter((p) => p.loan_id === l.id)
                .map((p) => ({
                    id: p.id,
                    amount: p.amount,
                    account_name: p.account_name,
                    paid_at: p.paid_at,
                    note: p.note,
                }));
            const lastPaid = loanPayments.length
                ? loanPayments
                      .map((p) => new Date(p.paid_at).toISOString().slice(0, 10))
                      .sort()
                      .slice(-1)[0]
                : null;
            const { date: nextDate, days: nextDays } = nextExpected(l, lastPaid);
            return {
                ...l,
                loan_date: typeof l.loan_date === 'string' ? l.loan_date : String(l.loan_date).slice(0, 10),
                paid_amount: paid,
                remaining: Math.round(remaining * 100) / 100,
                status: remaining <= 0 ? 'liquidado' : 'activo',
                next_expected_date: remaining <= 0 ? null : nextDate,
                days_until_next: remaining <= 0 ? null : nextDays,
                payments: loanPayments,
            } as LoanWithStatus;
        });
    }

    /**
     * Registra un préstamo. Si se indica cuenta de salida (efectivo, débito
     * o crédito), el dinero se descuenta de ella al momento.
     */
    static async create(
        userId: number,
        data: {
            person_name: string;
            concept: string;
            amount: number;
            account_id?: number | null;
            loan_date?: string;
            comments?: string;
            payment_frequency?: Frequency | null;
        }
    ): Promise<LoanWithStatus> {
        const person = data.person_name?.trim();
        const concept = data.concept?.trim();
        if (!person) throw new HttpError(400, 'El nombre de la persona es requerido');
        if (!concept) throw new HttpError(400, 'El concepto del préstamo es requerido');
        const amount = toNum(data.amount);
        if (amount <= 0) throw new HttpError(400, 'El monto del préstamo debe ser mayor a 0');
        const loanDate = data.loan_date || todayISO();
        const frequency =
            data.payment_frequency && (FREQS as readonly string[]).includes(data.payment_frequency)
                ? (data.payment_frequency as Frequency)
                : null;

        const client = await getClient();
        try {
            await client.query('BEGIN');
            let accountId: number | null = null;
            if (data.account_id) {
                accountId = Number(data.account_id);
                const { rows } = await client.query(
                    'SELECT id FROM accounts WHERE id = $1 AND user_id = $2 FOR UPDATE',
                    [accountId, userId]
                );
                if (!rows[0]) throw new HttpError(404, 'La cuenta de salida no existe');
                await client.query('UPDATE accounts SET balance = balance - $1::numeric WHERE id = $2', [amount, accountId]);
            }

            const { rows } = await client.query(
                `INSERT INTO loans (user_id, person_name, concept, amount, account_id, loan_date, comments, payment_frequency)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
                [userId, person, concept, amount, accountId, loanDate, data.comments ?? null, frequency]
            );

            await client.query('COMMIT');
            const [loan] = await this.listForIds(userId, [rows[0].id]);
            return loan;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Registra un abono del prestamista: entra a la cuenta de destino
     * (opcional) y reduce lo pendiente del préstamo.
     */
    static async addPayment(
        userId: number,
        loanId: number,
        data: { amount: number; account_id?: number | null; note?: string }
    ) {
        const amount = toNum(data.amount);
        if (amount <= 0) throw new HttpError(400, 'El abono debe ser mayor a 0');

        const client = await getClient();
        try {
            await client.query('BEGIN');
            const { rows: loanRows } = await client.query(
                'SELECT * FROM loans WHERE id = $1 AND user_id = $2 FOR UPDATE',
                [loanId, userId]
            );
            const loan = loanRows[0];
            if (!loan) throw new HttpError(404, 'Préstamo no encontrado');

            // La fila del préstamo ya está bloqueada (FOR UPDATE arriba):
            // eso serializa los abonos concurrentes; el agregado va sin lock.
            const { rows: paidRows } = await client.query(
                'SELECT COALESCE(SUM(amount), 0) AS paid FROM loan_payments WHERE loan_id = $1',
                [loanId]
            );
            const remaining = toNum(loan.amount) - toNum(paidRows[0].paid);
            if (remaining <= 0) throw new HttpError(400, 'Este préstamo ya está liquidado');
            if (amount > remaining + 0.001) {
                throw new HttpError(400, `El abono excede lo pendiente (máximo ${remaining.toFixed(2)})`);
            }

            let accountId: number | null = null;
            if (data.account_id) {
                accountId = Number(data.account_id);
                const { rows } = await client.query(
                    "SELECT id FROM accounts WHERE id = $1 AND user_id = $2 AND type IN ('efectivo','debito') FOR UPDATE",
                    [accountId, userId]
                );
                if (!rows[0]) throw new HttpError(400, 'El abono solo puede entrar a efectivo o débito');
                await client.query('UPDATE accounts SET balance = balance + $1::numeric WHERE id = $2', [amount, accountId]);
            }

            const { rows: paymentRows } = await client.query(
                `INSERT INTO loan_payments (user_id, loan_id, amount, account_id, note)
                 VALUES ($1, $2, $3, $4, $5) RETURNING *`,
                [userId, loanId, amount, accountId, data.note ?? null]
            );

            await client.query('COMMIT');
            return { payment: paymentRows[0], remaining: Math.round((remaining - amount) * 100) / 100 };
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Edita un abono ya registrado (por captura errónea): ajusta monto,
     * fecha y nota, corrigiendo el saldo de la cuenta de destino.
     */
    static async updatePayment(
        userId: number,
        paymentId: number,
        data: { amount?: number; account_id?: number | null; paid_at?: string; note?: string }
    ): Promise<{ amount: number }> {
        const client = await getClient();
        try {
            await client.query('BEGIN');
            const { rows } = await client.query(
                `SELECT lp.*, l.amount AS loan_amount
                 FROM loan_payments lp JOIN loans l ON l.id = lp.loan_id
                 WHERE lp.id = $1 AND lp.user_id = $2 FOR UPDATE`,
                [paymentId, userId]
            );
            const payment = rows[0];
            if (!payment) throw new HttpError(404, 'Abono no encontrado');

            const newAmount = data.amount !== undefined ? toNum(data.amount) : toNum(payment.amount);
            if (newAmount <= 0) throw new HttpError(400, 'El abono debe ser mayor a 0');

            // Total del préstamo con este abono corregido no puede exceder el monto prestado
            const { rows: totals } = await client.query(
                'SELECT COALESCE(SUM(amount), 0) AS paid FROM loan_payments WHERE loan_id = $1 AND id <> $2',
                [payment.loan_id, paymentId]
            );
            if (toNum(totals[0].paid) + newAmount > toNum(payment.loan_amount) + 0.001) {
                throw new HttpError(400, 'La suma de abonos no puede exceder el monto del préstamo');
            }

            const delta = newAmount - toNum(payment.amount);
            let accountId = data.account_id !== undefined ? data.account_id : payment.account_id;

            if (delta !== 0 || (data.account_id !== undefined && data.account_id !== payment.account_id)) {
                // Revierte el efecto anterior en la cuenta original
                if (payment.account_id) {
                    await client.query('UPDATE accounts SET balance = balance - $1::numeric WHERE id = $2', [
                        toNum(payment.amount),
                        payment.account_id,
                    ]);
                }
                if (accountId) {
                    const { rows: targetRows } = await client.query(
                        "SELECT id FROM accounts WHERE id = $1 AND user_id = $2 AND type IN ('efectivo','debito')",
                        [accountId, userId]
                    );
                    if (!targetRows[0]) throw new HttpError(400, 'El abono solo puede entrar a efectivo o débito');
                    await client.query('UPDATE accounts SET balance = balance + $1::numeric WHERE id = $2', [newAmount, accountId]);
                }
            }

            await client.query(
                `UPDATE loan_payments
                 SET amount = $1, account_id = $2, note = $3, paid_at = COALESCE($4::timestamptz, paid_at)
                 WHERE id = $5`,
                [newAmount, accountId, data.note !== undefined ? data.note : payment.note, data.paid_at ?? null, paymentId]
            );

            await client.query('COMMIT');
            return { amount: newAmount };
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /** Elimina un abono y revierte el dinero que había entrado a la cuenta. */
    static async removePayment(userId: number, paymentId: number): Promise<{ amount: number }> {
        const client = await getClient();
        try {
            await client.query('BEGIN');
            const { rows } = await client.query(
                'SELECT * FROM loan_payments WHERE id = $1 AND user_id = $2 FOR UPDATE',
                [paymentId, userId]
            );
            const payment = rows[0];
            if (!payment) throw new HttpError(404, 'Abono no encontrado');
            const amount = toNum(payment.amount);
            if (payment.account_id) {
                await client.query('UPDATE accounts SET balance = balance - $1::numeric WHERE id = $2', [amount, payment.account_id]);
            }
            await client.query('DELETE FROM loan_payments WHERE id = $1', [paymentId]);
            await client.query('COMMIT');
            return { amount };
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    static async remove(userId: number, loanId: number): Promise<boolean> {
        const { rowCount } = await pool.query('DELETE FROM loans WHERE id = $1 AND user_id = $2', [loanId, userId]);
        return (rowCount ?? 0) > 0;
    }

    static async update(
        userId: number,
        id: number,
        data: { person_name?: string; concept?: string; comments?: string }
    ): Promise<boolean> {
        const fields: string[] = [];
        const values: unknown[] = [];
        let idx = 1;
        for (const key of ['person_name', 'concept', 'comments'] as const) {
            if (data[key] !== undefined) {
                fields.push(`${key} = $${idx}`);
                values.push(data[key]);
                idx++;
            }
        }
        if (fields.length === 0) return true;
        values.push(id, userId);
        const { rowCount } = await pool.query(
            `UPDATE loans SET ${fields.join(', ')} WHERE id = $${idx} AND user_id = $${idx + 1}`,
            values
        );
        return (rowCount ?? 0) > 0;
    }

    private static async listForIds(userId: number, ids: number[]): Promise<LoanWithStatus[]> {
        if (ids.length === 0) return [];
        const all = await this.list(userId);
        return all.filter((l) => ids.includes(l.id));
    }
}

export type { LoanPayment };
