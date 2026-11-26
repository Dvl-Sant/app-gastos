import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { LoansService, LoanWithStatus } from '../services/loans.service';

export class LoansController {
    static async list(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            res.json(await LoansService.list(req.user!.id));
        } catch (error) {
            next(error);
        }
    }

    static async create(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const loan = await LoansService.create(req.user!.id, req.body);
            res.status(201).json(loan);
        } catch (error) {
            next(error);
        }
    }

    static async update(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const updated = await LoansService.update(req.user!.id, Number(req.params.id), req.body);
            if (!updated) return res.status(404).json({ status: 'error', message: 'Préstamo no encontrado' });
            res.json({ status: 'success' });
        } catch (error) {
            next(error);
        }
    }

    static async remove(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const deleted = await LoansService.remove(req.user!.id, Number(req.params.id));
            if (!deleted) return res.status(404).json({ status: 'error', message: 'Préstamo no encontrado' });
            res.status(204).send();
        } catch (error) {
            next(error);
        }
    }

    static async addPayment(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const result = await LoansService.addPayment(req.user!.id, Number(req.params.id), req.body);
            res.status(201).json(result);
        } catch (error) {
            next(error);
        }
    }

    static async updatePayment(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            res.json(await LoansService.updatePayment(req.user!.id, Number(req.params.id), req.body));
        } catch (error) {
            next(error);
        }
    }

    static async removePayment(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            res.json(await LoansService.removePayment(req.user!.id, Number(req.params.id)));
        } catch (error) {
            next(error);
        }
    }
}

export type { LoanWithStatus };
