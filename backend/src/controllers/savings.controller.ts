import { Request, Response, NextFunction } from 'express';
import { SavingsService } from '../services/savings.service';

export class SavingsController {
    static async get(req: Request, res: Response, next: NextFunction) {
        try {
            const saving = await SavingsService.get();
            res.json(saving || { total_amount: 0, currency: 'USD' });
        } catch (error) {
            next(error);
        }
    }

    static async update(req: Request, res: Response, next: NextFunction) {
        try {
            const { total_amount, currency } = req.body;
            const saving = await SavingsService.update(total_amount, currency);
            res.json(saving);
        } catch (error) {
            next(error);
        }
    }
}
