import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { ExpensesService } from '../services/expenses.service';

export class DuesController {
    static async pay(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const { amount, source_account_id } = req.body;
            const result = await ExpensesService.payDue(
                req.user!.id,
                Number(req.params.id),
                amount === undefined ? undefined : Number(amount),
                Number(source_account_id)
            );
            res.json(result);
        } catch (error) {
            next(error);
        }
    }
}
