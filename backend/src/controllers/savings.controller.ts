import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { SavingsService } from '../services/savings.service';

export class SavingsController {
    static async get(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const saving = await SavingsService.get(req.user!.id);
            res.json(saving || { total_amount: 0, currency: 'USD' });
        } catch (error) {
            next(error);
        }
    }

    static async update(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const { total_amount, currency } = req.body;
            const saving = await SavingsService.update(req.user!.id, total_amount, currency);
            res.json(saving);
        } catch (error) {
            next(error);
        }
    }
}
