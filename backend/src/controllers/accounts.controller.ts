import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { AccountsService } from '../services/accounts.service';

export class AccountsController {
    static async list(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            res.json(await AccountsService.list(req.user!.id));
        } catch (error) {
            next(error);
        }
    }

    static async create(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const account = await AccountsService.create(req.user!.id, req.body);
            res.status(201).json(account);
        } catch (error) {
            next(error);
        }
    }

    static async update(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const account = await AccountsService.update(Number(req.params.id), req.user!.id, req.body);
            if (!account) return res.status(404).json({ status: 'error', message: 'Cuenta no encontrada' });
            res.json(account);
        } catch (error) {
            next(error);
        }
    }

    static async remove(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const deleted = await AccountsService.remove(Number(req.params.id), req.user!.id);
            if (!deleted) return res.status(404).json({ status: 'error', message: 'Cuenta no encontrada' });
            res.status(204).send();
        } catch (error) {
            next(error);
        }
    }

    static async statement(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            res.json(await AccountsService.getStatement(req.user!.id, Number(req.params.id)));
        } catch (error) {
            next(error);
        }
    }

    static async pay(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const { amount, source_kind, source_account_id } = req.body;
            const source =
                source_kind === 'savings' ? { kind: 'savings' as const } : { kind: 'account' as const, account_id: Number(source_account_id) };
            const result = await AccountsService.payStatement(
                req.user!.id,
                Number(req.params.id),
                amount === 'full' ? 'full' : Number(amount),
                source
            );
            res.json(result);
        } catch (error) {
            next(error);
        }
    }
}
