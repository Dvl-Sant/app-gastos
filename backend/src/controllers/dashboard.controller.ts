import { Request, Response, NextFunction } from 'express';
import { DashboardService } from '../services/dashboard.service';

export class DashboardController {
    static async getSummary(req: Request, res: Response, next: NextFunction) {
        try {
            const summary = await DashboardService.getSummary();
            res.json(summary);
        } catch (error) {
            next(error);
        }
    }
}
