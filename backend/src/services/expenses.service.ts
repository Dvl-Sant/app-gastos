import pool, { getClient } from '../db/pool';
import { Expense, CreateExpenseDTO, UpdateExpenseDTO, EXPENSE_FIELDS } from '../models/Expense';

export class ExpensesService {
    static async getAll(userId: number): Promise<Expense[]> {
        const { rows } = await pool.query(
            'SELECT * FROM expenses WHERE user_id = $1 ORDER BY created_at DESC',
            [userId]
        );
        return rows;
    }

    static async getById(id: number, userId: number): Promise<Expense | null> {
        const { rows } = await pool.query(
            'SELECT * FROM expenses WHERE id = $1 AND user_id = $2',
            [id, userId]
        );
        return rows[0] || null;
    }

    static async create(userId: number, data: CreateExpenseDTO): Promise<Expense> {
        const { name, billing_date, due_date, monthly_payment, total_debt, category, is_paid } = data;
        const { rows } = await pool.query(
            `INSERT INTO expenses (user_id, name, billing_date, due_date, monthly_payment, total_debt, category, is_paid)
       VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8, false))
       RETURNING *`,
            [userId, name, billing_date, due_date, monthly_payment, total_debt, category, is_paid]
        );
        return rows[0];
    }

    static async update(id: number, userId: number, data: UpdateExpenseDTO): Promise<Expense | null> {
        const existingExpense = await this.getById(id, userId);
        if (!existingExpense) return null;

        const needsTransaction = (
            (data.is_paid === true && existingExpense.is_paid === false) ||
            (data.is_paid === false && existingExpense.is_paid === true)
        );

        if (needsTransaction) {
            return this.updateWithTransaction(id, userId, existingExpense, data);
        }

        return this.applyUpdate(id, userId, data);
    }

    private static async updateWithTransaction(
        id: number,
        userId: number,
        existing: Expense,
        data: UpdateExpenseDTO
    ): Promise<Expense | null> {
        const client = await getClient();
        try {
            await client.query('BEGIN');

            if (data.is_paid === true && existing.is_paid === false) {
                await client.query(
                    `INSERT INTO payment_history (expense_id, amount_paid, concept, user_id) VALUES ($1, $2, $3, $4)`,
                    [id, existing.monthly_payment, existing.name, userId]
                );

                await client.query(
                    `UPDATE user_savings SET total_amount = total_amount - $1 WHERE user_id = $2`,
                    [existing.monthly_payment, userId]
                );

                if (data.total_debt === undefined) {
                    const newDebt = parseFloat(existing.total_debt as any) - parseFloat(existing.monthly_payment as any);
                    data.total_debt = newDebt < 0 ? 0 : newDebt;
                }
            } else if (data.is_paid === false && existing.is_paid === true) {
                await client.query(
                    `DELETE FROM payment_history WHERE expense_id = $1 AND user_id = $2
                     AND ctid IN (SELECT ctid FROM payment_history WHERE expense_id = $1 AND user_id = $2 ORDER BY payment_date DESC LIMIT 1)`,
                    [id, userId]
                );

                await client.query(
                    `UPDATE user_savings SET total_amount = total_amount + $1 WHERE user_id = $2`,
                    [existing.monthly_payment, userId]
                );

                if (data.total_debt === undefined) {
                    data.total_debt = parseFloat(existing.total_debt as any) + parseFloat(existing.monthly_payment as any);
                }
            }

            const fields = [];
            const values = [];
            let idx = 1;

            for (const key of EXPENSE_FIELDS) {
                if ((data as any)[key] !== undefined) {
                    fields.push(`${key} = $${idx}`);
                    values.push((data as any)[key]);
                    idx++;
                }
            }

            if (fields.length === 0) {
                await client.query('COMMIT');
                return existing;
            }

            values.push(id, userId);
            const query = `
                UPDATE expenses
                SET ${fields.join(', ')}
                WHERE id = $${idx} AND user_id = $${idx + 1}
                RETURNING *
            `;

            const { rows } = await client.query(query, values);
            await client.query('COMMIT');
            return rows[0] || null;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    private static async applyUpdate(id: number, userId: number, data: UpdateExpenseDTO): Promise<Expense | null> {
        const fields = [];
        const values = [];
        let idx = 1;

        for (const key of EXPENSE_FIELDS) {
            if ((data as any)[key] !== undefined) {
                fields.push(`${key} = $${idx}`);
                values.push((data as any)[key]);
                idx++;
            }
        }

        if (fields.length === 0) return this.getById(id, userId);

        values.push(id, userId);
        const query = `
            UPDATE expenses
            SET ${fields.join(', ')}
            WHERE id = $${idx} AND user_id = $${idx + 1}
            RETURNING *
        `;

        const { rows } = await pool.query(query, values);
        return rows[0] || null;
    }

    static async remove(id: number, userId: number): Promise<boolean> {
        const { rowCount } = await pool.query(
            'DELETE FROM expenses WHERE id = $1 AND user_id = $2',
            [id, userId]
        );
        return (rowCount ?? 0) > 0;
    }
}
