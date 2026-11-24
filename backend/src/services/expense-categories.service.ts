import pool from '../db/pool';
import type { PoolClient } from 'pg';
import { HttpError } from '../utils/errors';
import { ExpenseCategory } from '../models/ExpenseCategory';

const DEFAULT_CATEGORIES = [
    'Vivienda y Servicios',
    'Transporte',
    'Comida',
    'Entretenimiento',
    'Pago de Deudas',
    'Otro',
];

export class ExpenseCategoriesService {
    /** Lista alfabética con cuántos gastos usan cada categoría. */
    static async list(userId: number): Promise<ExpenseCategory[]> {
        const { rows } = await pool.query(
            `SELECT c.id, c.user_id, c.name,
                    (SELECT COUNT(*)::int FROM expenses e
                     WHERE e.user_id = c.user_id AND LOWER(e.category) = LOWER(c.name)) AS usage_count
             FROM expense_categories c
             WHERE c.user_id = $1
             ORDER BY c.name ASC`,
            [userId]
        );
        return rows;
    }

    static async create(userId: number, name: string): Promise<ExpenseCategory> {
        const clean = name?.trim();
        if (!clean) throw new HttpError(400, 'El nombre de la categoría es requerido');
        if (clean.length > 100) throw new HttpError(400, 'El nombre no puede exceder 100 caracteres');

        const { rows } = await pool.query(
            `INSERT INTO expense_categories (user_id, name)
             VALUES ($1, $2)
             ON CONFLICT (user_id, name) DO NOTHING
             RETURNING *`,
            [userId, clean]
        );
        if (rows.length === 0) {
            throw new HttpError(400, `Ya tienes una categoría llamada "${clean}"`);
        }
        return rows[0];
    }

    /**
     * Renombra la categoría y propaga el cambio a los gastos que la usan,
     * para que las analíticas históricas queden bajo el nuevo nombre.
     */
    static async update(userId: number, id: number, name: string): Promise<ExpenseCategory | null> {
        const clean = name?.trim();
        if (!clean) throw new HttpError(400, 'El nombre de la categoría es requerido');
        if (clean.length > 100) throw new HttpError(400, 'El nombre no puede exceder 100 caracteres');

        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const { rows: existing } = await client.query(
                'SELECT id, name FROM expense_categories WHERE id = $1 AND user_id = $2 FOR UPDATE',
                [id, userId]
            );
            if (!existing[0]) {
                await client.query('ROLLBACK');
                return null;
            }
            const oldName: string = existing[0].name;

            const { rows: dup } = await client.query(
                'SELECT id FROM expense_categories WHERE user_id = $1 AND LOWER(name) = LOWER($2) AND id <> $3',
                [userId, clean, id]
            );
            if (dup.length > 0) {
                await client.query('ROLLBACK');
                throw new HttpError(400, `Ya tienes una categoría llamada "${clean}"`);
            }

            await client.query('UPDATE expense_categories SET name = $1 WHERE id = $2', [clean, id]);
            await client.query(
                'UPDATE expenses SET category = $1 WHERE user_id = $2 AND LOWER(category) = LOWER($3)',
                [clean, userId, oldName]
            );

            await client.query('COMMIT');
            const { rows } = await client.query('SELECT * FROM expense_categories WHERE id = $1', [id]);
            return rows[0];
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /** Elimina la categoría si ningún gasto la está usando. */
    static async remove(userId: number, id: number): Promise<boolean> {
        const { rows } = await pool.query(
            'SELECT id, name FROM expense_categories WHERE id = $1 AND user_id = $2',
            [id, userId]
        );
        if (!rows[0]) return false;

        const { rowCount: inUse } = await pool.query(
            'SELECT 1 FROM expenses WHERE user_id = $1 AND LOWER(category) = LOWER($2) LIMIT 1',
            [userId, rows[0].name]
        );
        if ((inUse ?? 0) > 0) {
            throw new HttpError(
                400,
                `No se puede eliminar "${rows[0].name}": hay gastos que la usan. Edítalos y cambia su categoría primero.`
            );
        }

        await pool.query('DELETE FROM expense_categories WHERE id = $1 AND user_id = $2', [id, userId]);
        return true;
    }

    /** Verifica que una categoría pertenezca al usuario (para gastos). */
    static async ensureExists(userId: number, name: string): Promise<void> {
        const { rowCount } = await pool.query(
            'SELECT 1 FROM expense_categories WHERE user_id = $1 AND LOWER(name) = LOWER($2)',
            [userId, name]
        );
        if ((rowCount ?? 0) === 0) {
            throw new HttpError(400, `La categoría "${name}" no existe. Créala desde el administrador de categorías.`);
        }
    }

    /** Semilla para usuarios nuevos (dentro de la transacción del registro). */
    static async seedDefaults(userId: number, client: PoolClient): Promise<void> {
        await client.query(
            `INSERT INTO expense_categories (user_id, name)
             SELECT $1, c.name
             FROM (VALUES ${DEFAULT_CATEGORIES.map((_, i) => `($${i + 2})`).join(',')}) AS c(name)
             WHERE NOT EXISTS (SELECT 1 FROM expense_categories e WHERE e.user_id = $1 AND e.name = c.name)`,
            [userId, ...DEFAULT_CATEGORIES]
        );
    }
}
