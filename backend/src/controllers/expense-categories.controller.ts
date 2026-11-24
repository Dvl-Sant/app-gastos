import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { ExpenseCategoriesService } from '../services/expense-categories.service';

export class ExpenseCategoriesController {
    static async list(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            res.json(await ExpenseCategoriesService.list(req.user!.id));
        } catch (error) {
            next(error);
        }
    }

    static async create(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const category = await ExpenseCategoriesService.create(req.user!.id, req.body.name);
            res.status(201).json(category);
        } catch (error) {
            next(error);
        }
    }

    static async update(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const category = await ExpenseCategoriesService.update(req.user!.id, Number(req.params.id), req.body.name);
            if (!category) return res.status(404).json({ status: 'error', message: 'Categoría no encontrada' });
            res.json(category);
        } catch (error) {
            next(error);
        }
    }

    static async remove(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const deleted = await ExpenseCategoriesService.remove(req.user!.id, Number(req.params.id));
            if (!deleted) return res.status(404).json({ status: 'error', message: 'Categoría no encontrada' });
            res.status(204).send();
        } catch (error) {
            next(error);
        }
    }
}
