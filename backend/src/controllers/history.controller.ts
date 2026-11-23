import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { HistoryService } from '../services/history.service';

export class HistoryController {
    static async getHistory(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const from = req.query.from ? String(req.query.from) : undefined;
            const to = req.query.to ? String(req.query.to) : undefined;
            if ((from && !/^\d{4}-\d{2}-\d{2}$/.test(from)) || (to && !/^\d{4}-\d{2}-\d{2}$/.test(to))) {
                return res.status(400).json({ status: 'error', message: 'from y to deben tener formato YYYY-MM-DD' });
            }
            res.json(await HistoryService.getHistory(req.user!.id, from, to));
        } catch (error) {
            next(error);
        }
    }
}
