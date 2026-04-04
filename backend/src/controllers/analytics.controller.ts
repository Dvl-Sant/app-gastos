import { Request, Response, NextFunction } from 'express';
import { AnalyticsService } from '../services/analytics.service';

export class AnalyticsController {
    static async getAnalytics(req: Request, res: Response, next: NextFunction) {
        try {
            const byCategory = await AnalyticsService.getByCategory();
            const byDueDate = await AnalyticsService.getByDueDate();

            res.json({
                byCategory,
                byDueDate
            });
        } catch (error) {
            next(error);
        }
    }
}
