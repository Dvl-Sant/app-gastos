import pool from '../db/pool';
import { Savings } from '../models/Savings';

export class SavingsService {
    static async get(userId: number): Promise<Savings | null> {
        const { rows } = await pool.query('SELECT * FROM user_savings WHERE user_id = $1 LIMIT 1', [userId]);
        return rows[0] || null;
    }

    static async update(userId: number, amount: number, currency: string): Promise<Savings> {
        const { rows } = await pool.query(
            `INSERT INTO user_savings (user_id, total_amount, currency, updated_at)
             VALUES ($1, $2, $3, NOW())
             ON CONFLICT (user_id) DO UPDATE
             SET total_amount = $2, currency = $3, updated_at = NOW()
             RETURNING *`,
            [userId, amount, currency]
        );
        return rows[0];
    }
}
