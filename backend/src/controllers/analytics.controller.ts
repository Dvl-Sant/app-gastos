import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { AnalyticsService } from '../services/analytics.service';

export class AnalyticsController {
    static async getAnalytics(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const byCategory = await AnalyticsService.getByCategory(req.user!.id);
            const byDueDate = await AnalyticsService.getByDueDate(req.user!.id);

            res.json({
                byCategory,
                byDueDate
            });
        } catch (error) {
            next(error);
        }
    }
}
