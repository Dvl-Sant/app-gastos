import pool, { getClient } from '../db/pool';
import { HttpError } from '../utils/errors';
import { toNum } from '../utils/dates';
import { Savings } from '../models/Savings';

export class SavingsService {
    static async get(userId: number): Promise<Savings | null> {
        const { rows } = await pool.query('SELECT * FROM user_savings WHERE user_id = $1 LIMIT 1', [userId]);
        return rows[0] || null;
    }

    static async update(userId: number, amount: number, currency: string): Promise<Savings> {
        const { rows } = await pool.query(
            `INSERT INTO user_savings (user_id, total_amount, currency)
             VALUES ($1, $2, $3)
             ON CONFLICT (user_id) DO UPDATE
             SET total_amount = $2, currency = $3, updated_at = NOW()
             RETURNING *`,
            [userId, amount, currency]
        );
        return rows[0];
    }

    /**
     * Traspaso de una cuenta (efectivo/débito) hacia los ahorros:
     * descuenta de la cuenta, suma al total y registra el movimiento.
     */
    static async transfer(userId: number, amount: number, sourceAccountId: number, note?: string) {
        if (!amount || amount <= 0) throw new HttpError(400, 'El monto del traspaso debe ser mayor a 0');

        const client = await getClient();
        try {
            await client.query('BEGIN');

            const { rows: sourceRows } = await client.query(
                "SELECT * FROM accounts WHERE id = $1 AND user_id = $2 AND type IN ('efectivo','debito') FOR UPDATE",
                [sourceAccountId, userId]
            );
            const source = sourceRows[0];
            if (!source) throw new HttpError(400, 'El traspaso debe salir de una cuenta de efectivo o débito');

            await client.query('UPDATE accounts SET balance = balance - $1 WHERE id = $2', [amount, sourceAccountId]);

            const { rows: savingsRows } = await client.query(
                `INSERT INTO user_savings (user_id, total_amount, currency)
                 VALUES ($1, $2::numeric, 'USD')
                 ON CONFLICT (user_id) DO UPDATE
                 SET total_amount = user_savings.total_amount + $2::numeric, updated_at = NOW()
                 RETURNING *`,
                [userId, amount]
            );

            await client.query(
                `INSERT INTO savings_movements (user_id, amount, kind, source_account_id, note)
                 VALUES ($1, $2, 'traspaso', $3, $4)`,
                [userId, amount, sourceAccountId, note ?? null]
            );

            await client.query('COMMIT');
            return { savings: savingsRows[0], source_balance: toNum(source.balance) - amount };
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }
}
