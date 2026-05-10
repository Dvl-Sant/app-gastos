import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { HistoryService } from '../services/history.service';

export class HistoryController {
    static async getHistory(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const history = await HistoryService.getRecentHistory(req.user!.id);
            res.json(history);
        } catch (error) { next(error); }
    }
}
