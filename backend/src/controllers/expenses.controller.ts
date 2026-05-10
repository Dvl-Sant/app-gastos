import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { ExpensesService } from '../services/expenses.service';

export class ExpensesController {
    static async getAll(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const expenses = await ExpensesService.getAll(req.user!.id);
            res.json(expenses);
        } catch (error) {
            next(error);
        }
    }

    static async getById(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const expense = await ExpensesService.getById(Number(req.params.id), req.user!.id);
            if (!expense) return res.status(404).json({ status: 'error', message: 'Gasto no encontrado' });
            res.json(expense);
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
