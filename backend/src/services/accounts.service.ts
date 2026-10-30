import pool, { getClient } from '../db/pool';
import { HttpError } from '../utils/errors';
import { cycleWindow, monthWindow, nextCutDate, todayISO, toNum } from '../utils/dates';
import { Account, CreateAccountDTO, UpdateAccountDTO } from '../models/Account';
import { Due } from '../models/Expense';
import type { PaymentSource } from '../models/Payment';

const ACCOUNT_SELECT = `
    SELECT a.*,
           CASE WHEN a.type = 'credito' THEN COALESCE((
               SELECT SUM(d.amount - d.paid_amount) FROM dues d WHERE d.account_id = a.id AND d.is_paid = false
           ), 0) ELSE 0 END AS pending_debt
    FROM accounts a
`;

export class AccountsService {
    static async list(userId: number): Promise<Account[]> {
        const { rows } = await pool.query(`${ACCOUNT_SELECT} WHERE a.user_id = $1 ORDER BY a.created_at ASC`, [userId]);
        return rows;
    }

    static async getById(id: number, userId: number): Promise<Account | null> {
        const { rows } = await pool.query(`${ACCOUNT_SELECT} WHERE a.id = $1 AND a.user_id = $2`, [id, userId]);
        return rows[0] || null;
    }

    static async create(userId: number, data: CreateAccountDTO): Promise<Account> {
        const { name, type, cut_off_day, payment_due_day, balance, color } = data;
        if (type === 'credito') {
            if (!cut_off_day) throw new HttpError(400, 'Las tarjetas de crédito requieren día de corte');
        } else {
            if (cut_off_day || payment_due_day) {
                throw new HttpError(400, 'Solo las tarjetas de crédito tienen día de corte / límite de pago');
            }
        }
        const { rows } = await pool.query(
            `INSERT INTO accounts (user_id, name, type, cut_off_day, payment_due_day, balance, color)
             VALUES ($1, $2, $3, $4, $5, COALESCE($6, 0), $7) RETURNING *`,
            [userId, name, type, cut_off_day ?? null, payment_due_day ?? null, balance ?? 0, color ?? null]
        );
        return rows[0];
    }

    static async update(id: number, userId: number, data: UpdateAccountDTO): Promise<Account | null> {
        const existing = await this.getById(id, userId);
        if (!existing) return null;

        const fields: string[] = [];
        const values: unknown[] = [];
        let idx = 1;
        for (const key of ['name', 'cut_off_day', 'payment_due_day', 'balance', 'color'] as const) {
            const value = (data as Record<string, unknown>)[key];
            if (value !== undefined) {
                if (key === 'cut_off_day' && existing.type !== 'credito') {
                    throw new HttpError(400, 'Solo las tarjetas de crédito tienen día de corte');
                }
                fields.push(`${key} = $${idx}`);
                values.push(value);
                idx++;
            }
        }
        if (fields.length === 0) return existing;

        values.push(id, userId);
        const { rows } = await pool.query(
            `UPDATE accounts SET ${fields.join(', ')} WHERE id = $${idx} AND user_id = $${idx + 1} RETURNING *`,
            values
        );
        return rows[0];
    }

    static async remove(id: number, userId: number): Promise<boolean> {
        const { rowCount } = await pool.query('DELETE FROM accounts WHERE id = $1 AND user_id = $2', [id, userId]);
        return (rowCount ?? 0) > 0;
    }

    /**
     * Ventana del ciclo en curso de una cuenta.
     * En tarjetas de crédito el ciclo es (corte anterior, próximo corte] y las
     * mensualidades se agrupan por cut_date (la fecha de vencimiento de cada
     * una es la fecha límite de pago del ciclo). En efectivo/débito es el mes
     * natural por fecha de vencimiento.
     */
    static cycleFilter(account: Account): { cutDate: string | null; from: string; to: string } {
        const reference = todayISO();
        if (account.type === 'credito' && account.cut_off_day) {
            const window = cycleWindow(reference, account.cut_off_day);
            return { cutDate: nextCutDate(reference, account.cut_off_day), from: window.from, to: window.to };
        }
        const window = monthWindow(reference);
        return { cutDate: null, from: window.from, to: window.to };
    }

    static async getStatement(userId: number, accountId: number) {
        const account = await this.getById(accountId, userId);
        if (!account) throw new HttpError(404, 'Cuenta no encontrada');

        const { cutDate, from, to } = this.cycleFilter(account);

        const { rows: dues } = await pool.query(
            `SELECT d.*, e.name AS expense_name, e.category, e.expense_type
             FROM dues d JOIN expenses e ON e.id = d.expense_id
             WHERE d.user_id = $1 AND d.account_id = $2
               AND ($3::date IS NOT NULL AND d.cut_date = $3::date
                    OR $3::date IS NULL AND d.due_date BETWEEN $4 AND $5)
             ORDER BY d.due_date ASC, d.id ASC`,
            [userId, accountId, cutDate, from, to]
        );

        const total = dues.reduce((acc, d) => acc + toNum(d.amount), 0);
        const paid = dues.reduce((acc, d) => acc + toNum(d.paid_amount), 0);

        return {
            account,
            window: { from, to },
            dues: dues as Due[],
            totals: {
                total,
                paid,
                pending: Math.max(0, total - paid),
            },
        };
    }

    /**
     * Pago flexible del estado de cuenta: monto 'full' (todo el pendiente del
     * ciclo), un monto arbitrario (se aplica FIFO a las mensualidades más
     * antiguas), o mensualidad por mensualidad vía payDue.
     * El dinero sale de otra cuenta/tarjeta (nunca la misma) o de los ahorros.
     */
    static async payStatement(
        userId: number,
        accountId: number,
        amount: number | 'full',
        source: PaymentSource
    ) {
        const client = await getClient();
        try {
            await client.query('BEGIN');

            const { rows: accountRows } = await client.query(
                'SELECT * FROM accounts WHERE id = $1 AND user_id = $2 FOR UPDATE',
                [accountId, userId]
            );
            const account: Account | undefined = accountRows[0];
            if (!account) throw new HttpError(404, 'Cuenta no encontrada');

            // Valida la fuente de dinero sin descontar todavía:
            // la deducción se hace al final, por el monto realmente pagado.
            let sourceAccountId: number | null = null;
            if (source.kind === 'account') {
                if (!source.account_id) throw new HttpError(400, 'Falta la cuenta de origen');
                if (source.account_id === accountId) {
                    throw new HttpError(400, 'No puedes pagar una tarjeta con ella misma');
                }
                const { rows: sourceRows } = await client.query(
                    'SELECT id FROM accounts WHERE id = $1 AND user_id = $2 FOR UPDATE',
                    [source.account_id, userId]
                );
                if (!sourceRows[0]) throw new HttpError(404, 'Cuenta de origen no encontrada');
                sourceAccountId = source.account_id;
            }

            const { cutDate, from, to } = this.cycleFilter(account);

            const { rows: unpaid } = await client.query(
                `SELECT d.*, e.name AS expense_name
                 FROM dues d JOIN expenses e ON e.id = d.expense_id
                 WHERE d.user_id = $1 AND d.account_id = $2
                   AND d.is_paid = false
                   AND ($3::date IS NOT NULL AND d.cut_date = $3::date
                        OR $3::date IS NULL AND d.due_date BETWEEN $4 AND $5)
                 ORDER BY d.due_date ASC, d.id ASC FOR UPDATE`,
                [userId, accountId, cutDate, from, to]
            );

            const pendingTotal = unpaid.reduce((acc, d) => acc + (toNum(d.amount) - toNum(d.paid_amount)), 0);
            const toPay = amount === 'full' ? pendingTotal : Math.min(amount, pendingTotal);
            if (toPay <= 0) throw new HttpError(400, 'No hay nada pendiente en este periodo');

            let remaining = toPay;
            const applied: { due_id: number; amount: number }[] = [];
            for (const due of unpaid) {
                if (remaining <= 0) break;
                const duePending = toNum(due.amount) - toNum(due.paid_amount);
                const appliedAmount = Math.min(duePending, remaining);
                const newPaid = toNum(due.paid_amount) + appliedAmount;
                await client.query(
                    'UPDATE dues SET paid_amount = $1, is_paid = $2 WHERE id = $3',
                    [newPaid, newPaid >= toNum(due.amount) - 0.001, due.id]
                );
                applied.push({ due_id: due.id, amount: appliedAmount });
                remaining -= appliedAmount;
            }

            // Deduce del origen: ahorros o cuenta/tarjeta (nunca la misma tarjeta)
            if (source.kind === 'savings') {
                await client.query(
                    `INSERT INTO user_savings (user_id, total_amount, currency)
                     VALUES ($1, 0 - $2::numeric, 'USD')
                     ON CONFLICT (user_id) DO UPDATE
                     SET total_amount = user_savings.total_amount - $2::numeric, updated_at = NOW()`,
                    [userId, toPay]
                );
            } else if (sourceAccountId !== null) {
                await client.query('UPDATE accounts SET balance = balance - $1::numeric WHERE id = $2', [toPay, sourceAccountId]);
            }

            const { rows: paymentRows } = await client.query(
                `INSERT INTO payments (user_id, account_id, source_account_id, amount, note)
                 VALUES ($1, $2, $3, $4, $5) RETURNING *`,
                [userId, accountId, sourceAccountId, toPay, `Pago a ${account.name}`]
            );

            await client.query('COMMIT');
            return { payment: paymentRows[0], applied, amount_paid: toPay };
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }
}
