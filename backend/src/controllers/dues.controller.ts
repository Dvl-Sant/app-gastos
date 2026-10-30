import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { ExpensesService } from '../services/expenses.service';
import type { PaymentSource } from '../models/Payment';

export class DuesController {
    static async pay(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const { amount, source_kind, source_account_id } = req.body;
            const source: PaymentSource =
                source_kind === 'savings' ? { kind: 'savings' } : { kind: 'account', account_id: Number(source_account_id) };
            const result = await ExpensesService.payDue(
                req.user!.id,
                Number(req.params.id),
                amount === undefined ? undefined : Number(amount),
                source
            );
            res.json(result);
        } catch (error) {
            next(error);
        }
    }
}
