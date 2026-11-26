import pool, { getClient } from '../db/pool';
import { HttpError } from '../utils/errors';
import { toNum, todayISO } from '../utils/dates';
import { Loan, LoanPayment } from '../models/Loan';

export interface LoanWithStatus extends Loan {
    payments: { id: number; amount: string; account_name: string | null; paid_at: Date; note: string | null }[];
}

export class LoansService {
    /** Lista con estado (abonado/pendiente) y pagos por préstamo. */
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
            return {
                ...l,
                loan_date: typeof l.loan_date === 'string' ? l.loan_date : String(l.loan_date).slice(0, 10),
                paid_amount: paid,
                remaining: Math.round(remaining * 100) / 100,
                status: remaining <= 0 ? 'liquidado' : 'activo',
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
        }
    ): Promise<LoanWithStatus> {
        const person = data.person_name?.trim();
        const concept = data.concept?.trim();
        if (!person) throw new HttpError(400, 'El nombre de la persona es requerido');
        if (!concept) throw new HttpError(400, 'El concepto del préstamo es requerido');
        const amount = toNum(data.amount);
        if (amount <= 0) throw new HttpError(400, 'El monto del préstamo debe ser mayor a 0');
        const loanDate = data.loan_date || todayISO();

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
                `INSERT INTO loans (user_id, person_name, concept, amount, account_id, loan_date, comments)
                 VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
                [userId, person, concept, amount, accountId, loanDate, data.comments ?? null]
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
