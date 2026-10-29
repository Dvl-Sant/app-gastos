import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { CashflowService } from '../services/cashflow.service';

export class CashflowController {
    static async get(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const from = String(req.query.from || '');
            const to = String(req.query.to || '');
            if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
                return res.status(400).json({ status: 'error', message: 'from y to deben tener formato YYYY-MM-DD' });
            }
            res.json(await CashflowService.getCashflow(req.user!.id, from, to));
        } catch (error) {
            next(error);
        }
    }
}
