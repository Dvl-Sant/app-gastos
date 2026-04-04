import pool from '../db/pool';
import { UserSaving } from '../models/UserSaving';

export class SavingsService {
    static async get(): Promise<UserSaving | null> {
        const { rows } = await pool.query('SELECT * FROM user_savings LIMIT 1');
        return rows[0] || null;
    }

    static async update(amount: number, currency: string): Promise<UserSaving> {
        const { rows } = await pool.query(
            `UPDATE user_savings 
       SET total_amount = $1, currency = $2, updated_at = NOW() 
       WHERE id = 1 
       RETURNING *`,
            [amount, currency]
        );

        // If for some reason id=1 doesn't exist, insert it
        if (rows.length === 0) {
            const { rows: inserted } = await pool.query(
                `INSERT INTO user_savings (id, total_amount, currency) 
         VALUES (1, $1, $2) 
         RETURNING *`,
                [amount, currency]
            );
            return inserted[0];
        }

        return rows[0];
    }
}
