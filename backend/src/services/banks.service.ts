import pool from '../db/pool';
import { HttpError } from '../utils/errors';
import { Bank } from '../models/Bank';

export class BanksService {
    static async list(userId: number): Promise<Bank[]> {
        const { rows } = await pool.query(
            `SELECT b.*, (SELECT COUNT(*)::int FROM accounts a WHERE a.bank_id = b.id) AS cards_count
             FROM banks b WHERE b.user_id = $1 ORDER BY b.name ASC`,
            [userId]
        );
        return rows;
    }

    static async create(userId: number, name: string, color?: string): Promise<Bank> {
        const clean = name?.trim();
        if (!clean) throw new HttpError(400, 'El nombre del banco es requerido');
        const { rows } = await pool.query(
            `INSERT INTO banks (user_id, name, color)
             VALUES ($1, $2, $3)
             ON CONFLICT (user_id, name) DO NOTHING
             RETURNING *`,
            [userId, clean, color ?? null]
        );
        if (rows.length === 0) throw new HttpError(400, `Ya tienes un banco llamado "${clean}"`);
        return rows[0];
    }

    static async update(userId: number, id: number, name: string): Promise<Bank | null> {
        const clean = name?.trim();
        if (!clean) throw new HttpError(400, 'El nombre del banco es requerido');
        const { rows } = await pool.query(
            `UPDATE banks SET name = $1 WHERE id = $2 AND user_id = $3 RETURNING *`,
            [clean, id, userId]
        );
        return rows[0] || null;
    }

    /** Elimina el banco; sus tarjetas quedan sin banco asignado (no se borran). */
    static async remove(userId: number, id: number): Promise<boolean> {
        const { rowCount } = await pool.query('DELETE FROM banks WHERE id = $1 AND user_id = $2', [id, userId]);
        return (rowCount ?? 0) > 0;
    }

    /** Verifica que el banco pertenezca al usuario. */
    static async ensureExists(userId: number, bankId: number): Promise<void> {
        const { rowCount } = await pool.query('SELECT 1 FROM banks WHERE id = $1 AND user_id = $2', [bankId, userId]);
        if ((rowCount ?? 0) === 0) throw new HttpError(400, 'El banco especificado no existe');
    }
}
