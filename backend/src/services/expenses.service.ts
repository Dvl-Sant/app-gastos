import pool from '../db/pool';
import { Expense, CreateExpenseDTO, UpdateExpenseDTO } from '../models/Expense';

export class ExpensesService {
    static async getAll(): Promise<Expense[]> {
        const { rows } = await pool.query('SELECT * FROM expenses ORDER BY created_at DESC');
        return rows;
    }

    static async getById(id: number): Promise<Expense | null> {
        const { rows } = await pool.query('SELECT * FROM expenses WHERE id = $1', [id]);
        return rows[0] || null;
    }

    static async create(data: CreateExpenseDTO): Promise<Expense> {
        const { name, billing_date, due_date, monthly_payment, total_debt, category, is_paid } = data;
        const { rows } = await pool.query(
            `INSERT INTO expenses (name, billing_date, due_date, monthly_payment, total_debt, category, is_paid)
       VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, false))
       RETURNING *`,
            [name, billing_date, due_date, monthly_payment, total_debt, category, is_paid]
        );
        return rows[0];
    }

    static async update(id: number, data: UpdateExpenseDTO): Promise<Expense | null> {
        const fields = [];
        const values = [];
        let idx = 1;

        for (const [key, value] of Object.entries(data)) {
            if (value !== undefined) {
                fields.push(`${key} = $${idx}`);
                values.push(value);
                idx++;
            }
        }

        if (fields.length === 0) return this.getById(id);

        // History Tracker Logic
        const existingExpense = await this.getById(id);
        if (existingExpense) {
            if (data.is_paid === true && existingExpense.is_paid === false) {
                await pool.query(`INSERT INTO payment_history (expense_id, amount_paid, concept) VALUES ($1, $2, $3)`,
                    [id, existingExpense.monthly_payment, existingExpense.name]);
            } else if (data.is_paid === false && existingExpense.is_paid === true) {
                await pool.query(`DELETE FROM payment_history WHERE expense_id = $1`, [id]);
            }
        }

        values.push(id);
        const query = `
      UPDATE expenses
      SET ${fields.join(', ')}
      WHERE id = $${idx}
      RETURNING *
    `;

        const { rows } = await pool.query(query, values);
        return rows[0] || null;
    }

    static async remove(id: number): Promise<boolean> {
        const { rowCount } = await pool.query('DELETE FROM expenses WHERE id = $1', [id]);
        return (rowCount ?? 0) > 0;
    }
}
