import pool from '../db/pool';
import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { HttpError } from '../utils/errors';

export class SettingsController {
    /** Cuenta donde se acreditan los ingresos liquidados. */
    static async getIncomeAccount(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const { rows } = await pool.query(
                `SELECT u.income_settlement_account_id, a.name AS account_name
                 FROM users u LEFT JOIN accounts a ON a.id = u.income_settlement_account_id
                 WHERE u.id = $1`,
                [req.user!.id]
            );
            res.json({
                account_id: rows[0].income_settlement_account_id ?? null,
                account_name: rows[0].account_name ?? null,
            });
        } catch (error) {
            next(error);
        }
    }

    static async setIncomeAccount(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const accountId = Number(req.body.account_id);
            const { rows } = await pool.query(
                `SELECT id, name FROM accounts WHERE id = $1 AND user_id = $2 AND type IN ('efectivo','debito')`,
                [accountId, req.user!.id]
            );
            if (!rows[0]) {
                throw new HttpError(400, 'Los ingresos solo pueden acreditarse en efectivo o débito');
            }
            await pool.query('UPDATE users SET income_settlement_account_id = $1 WHERE id = $2', [accountId, req.user!.id]);
            res.json({ account_id: accountId, account_name: rows[0].name });
        } catch (error) {
            next(error);
        }
    }
}
