import pool from '../db/pool';
import { Income, CreateIncomeDTO, UpdateIncomeDTO, INCOME_FIELDS } from '../models/Income';

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

    static async update(id: number, userId: number, data: UpdateIncomeDTO): Promise<Income | null> {
        const fields = [];
        const values = [];
        let idx = 1;

        for (const key of INCOME_FIELDS) {
            if ((data as any)[key] !== undefined) {
                fields.push(`${key} = $${idx}`);
                values.push((data as any)[key]);
                idx++;
            }
        }

        if (fields.length === 0) return this.getById(id, userId);

        values.push(id, userId);
        const query = `
            UPDATE incomes
            SET ${fields.join(', ')}
            WHERE id = $${idx} AND user_id = $${idx + 1}
            RETURNING *
        `;

        const { rows } = await pool.query(query, values);
        return rows[0] || null;
    }
}
