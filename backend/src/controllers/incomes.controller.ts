import { Request, Response, NextFunction } from 'express';
import { IncomesService } from '../services/incomes.service';
import { AuthRequest } from '../middleware/auth.middleware';

export class IncomesController {
    static async getAll(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user.id;
            const incomes = await IncomesService.getAll(userId);
            res.json(incomes);
        } catch (error) { next(error); }
    }

    static async create(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user.id;
            const income = await IncomesService.create(userId, req.body);
            res.status(201).json(income);
        } catch (error) { next(error); }
    }

    static async remove(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user.id;
            const id = parseInt(req.params.id);
            const success = await IncomesService.remove(id, userId);
            if (!success) { return res.status(404).json({ error: 'Ingreso no encontrado' }); }
            res.status(204).send();
        } catch (error) { next(error); }
    }
}
