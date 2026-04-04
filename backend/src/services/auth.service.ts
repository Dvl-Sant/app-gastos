import pool from '../db/pool';
import { User } from '../models/User';

export class AuthService {
    static async getUserByUsername(username: string): Promise<User | null> {
        const { rows } = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        return rows[0] || null;
    }
}
