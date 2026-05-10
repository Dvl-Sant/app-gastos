import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { DashboardService } from '../services/dashboard.service';

export class DashboardController {
    static async getSummary(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const summary = await DashboardService.getSummary(req.user!.id);
            res.json(summary);
        } catch (error) {
            next(error);
        }
    }
}
