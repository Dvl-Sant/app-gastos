import { Request, Response, NextFunction } from 'express';
import { ExpensesService } from '../services/expenses.service';

export class ExpensesController {
    static async getAll(req: Request, res: Response, next: NextFunction) {
        try {
            const expenses = await ExpensesService.getAll();
            res.json(expenses);
        } catch (error) {
            next(error);
        }
    }

    static async getById(req: Request, res: Response, next: NextFunction) {
        try {
            const expense = await ExpensesService.getById(Number(req.params.id));
            if (!expense) return res.status(404).json({ error: 'Gasto no encontrado' });
            res.json(expense);
        } catch (error) {
            next(error);
        }
    }

    static async create(req: Request, res: Response, next: NextFunction) {
        try {
            const expense = await ExpensesService.create(req.body);
            res.status(201).json(expense);
        } catch (error) {
            next(error);
        }
    }

    static async update(req: Request, res: Response, next: NextFunction) {
        try {
            const expense = await ExpensesService.update(Number(req.params.id), req.body);
            if (!expense) return res.status(404).json({ error: 'Gasto no encontrado' });
            res.json(expense);
        } catch (error) {
            next(error);
        }
    }

    static async remove(req: Request, res: Response, next: NextFunction) {
        try {
            const deleted = await ExpensesService.remove(Number(req.params.id));
            if (!deleted) return res.status(404).json({ error: 'Gasto no encontrado' });
            res.status(204).send();
        } catch (error) {
            next(error);
        }
    }
}
