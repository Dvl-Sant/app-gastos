import pool from '../db/pool';
import { User } from '../models/User';

export class AuthService {
    static async getUserByUsername(username: string): Promise<User | null> {
        const { rows } = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        return rows[0] || null;
    }

    static async createUser(username: string, passwordHash: string): Promise<User> {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const { rows } = await client.query(
                'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING *',
                [username, passwordHash]
            );
            const newUser = rows[0];

            await client.query(
                'INSERT INTO user_savings (user_id, total_amount, currency) VALUES ($1, 0, $2)',
                [newUser.id, 'USD']
            );

            await client.query('COMMIT');
            return newUser;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }
}
