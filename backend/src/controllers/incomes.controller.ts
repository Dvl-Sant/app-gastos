import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { IncomesService } from '../services/incomes.service';

export class IncomesController {
    static async getAll(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            res.json(await IncomesService.getAll(req.user!.id));
        } catch (error) {
            next(error);
        }
    }

    static async create(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const income = await IncomesService.create(req.user!.id, req.body);
            res.status(201).json(income);
        } catch (error) {
            next(error);
        }
    }

    static async update(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const income = await IncomesService.update(Number(req.params.id), req.user!.id, req.body);
            if (!income) return res.status(404).json({ status: 'error', message: 'Ingreso no encontrado' });
            res.json(income);
        } catch (error) {
            next(error);
        }
    }

    static async remove(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const deleted = await IncomesService.remove(Number(req.params.id), req.user!.id);
            if (!deleted) return res.status(404).json({ status: 'error', message: 'Ingreso no encontrado' });
            res.status(204).send();
        } catch (error) {
            next(error);
        }
    }
}
