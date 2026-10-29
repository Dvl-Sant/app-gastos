import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { ExpensesService } from '../services/expenses.service';

export class ExpensesController {
    static async getAll(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            res.json(await ExpensesService.list(req.user!.id));
        } catch (error) {
            next(error);
        }
    }

    static async getCalendar(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const from = String(req.query.from || '');
            const to = String(req.query.to || '');
            if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
                return res.status(400).json({ status: 'error', message: 'from y to deben tener formato YYYY-MM-DD' });
            }
            res.json(await ExpensesService.getCalendar(req.user!.id, from, to));
        } catch (error) {
            next(error);
        }
    }

    static async create(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const expense = await ExpensesService.create(req.user!.id, req.body);
            res.status(201).json(expense);
        } catch (error) {
            next(error);
        }
    }

    static async update(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const expense = await ExpensesService.update(Number(req.params.id), req.user!.id, req.body);
            if (!expense) return res.status(404).json({ status: 'error', message: 'Gasto no encontrado' });
            res.json(expense);
        } catch (error) {
            next(error);
        }
    }

    static async remove(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const deleted = await ExpensesService.remove(Number(req.params.id), req.user!.id);
            if (!deleted) return res.status(404).json({ status: 'error', message: 'Gasto no encontrado' });
            res.status(204).send();
        } catch (error) {
            next(error);
        }
    }
}
