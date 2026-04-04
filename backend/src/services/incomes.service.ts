import pool from '../db/pool';
import { Income, CreateIncomeDTO, UpdateIncomeDTO } from '../models/Income';

export class IncomesService {
    static async getAll(userId: number): Promise<Income[]> {
        const { rows } = await pool.query('SELECT * FROM incomes WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
        return rows;
    }

    static async getById(id: number, userId: number): Promise<Income | null> {
        const { rows } = await pool.query('SELECT * FROM incomes WHERE id = $1 AND user_id = $2', [id, userId]);
        return rows[0] || null;
    }

    static async create(userId: number, data: CreateIncomeDTO): Promise<Income> {
        const { name, amount, frequency, next_pay_date } = data;
        const { rows } = await pool.query(
            `INSERT INTO incomes (user_id, name, amount, frequency, next_pay_date)
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [userId, name, amount, frequency, next_pay_date]
        );
        return rows[0];
    }

    static async remove(id: number, userId: number): Promise<boolean> {
        const { rowCount } = await pool.query('DELETE FROM incomes WHERE id = $1 AND user_id = $2', [id, userId]);
        return (rowCount ?? 0) > 0;
    }
}
