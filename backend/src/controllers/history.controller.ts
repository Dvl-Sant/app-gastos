import { Response, NextFunction } from 'express';
import { HistoryService } from '../services/history.service';
import { AuthRequest } from '../middleware/auth.middleware';

export class HistoryController {
    static async getHistory(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const history = await HistoryService.getRecentHistory();
            res.json(history);
        } catch (error) { next(error); }
    }
}
