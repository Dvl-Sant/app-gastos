import pool from '../db/pool';
import { UserSaving } from '../models/UserSaving';

export class SavingsService {
    static async get(userId: number): Promise<UserSaving | null> {
        const { rows } = await pool.query(
            'SELECT * FROM user_savings WHERE user_id = $1 LIMIT 1',
            [userId]
        );
        return rows[0] || null;
    }

    static async update(userId: number, amount: number, currency: string): Promise<UserSaving> {
        const { rows } = await pool.query(
            `UPDATE user_savings
             SET total_amount = $1, currency = $2, updated_at = NOW()
             WHERE user_id = $3
             RETURNING *`,
            [amount, currency, userId]
        );

        if (rows.length === 0) {
            const { rows: inserted } = await pool.query(
                `INSERT INTO user_savings (user_id, total_amount, currency)
                 VALUES ($1, $2, $3)
                 RETURNING *`,
                [userId, amount, currency]
            );
            return inserted[0];
        }

        return rows[0];
    }
}
