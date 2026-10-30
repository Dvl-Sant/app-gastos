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
            const totalAmount = Number(req.body.total_amount);
            const currency = (req.body.currency as string | undefined) || 'USD';
            const saving = await SavingsService.update(req.user!.id, totalAmount, currency);
            res.json(saving);
        } catch (error) {
            next(error);
        }
    }

    static async transfer(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const result = await SavingsService.transfer(
                req.user!.id,
                Number(req.body.amount),
                Number(req.body.source_account_id),
                req.body.note
            );
            res.json(result);
        } catch (error) {
            next(error);
        }
    }
}
