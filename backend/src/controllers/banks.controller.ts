import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { BanksService } from '../services/banks.service';

export class BanksController {
    static async list(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            res.json(await BanksService.list(req.user!.id));
        } catch (error) {
            next(error);
        }
    }

    static async create(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const bank = await BanksService.create(req.user!.id, req.body.name, req.body.color);
            res.status(201).json(bank);
        } catch (error) {
            next(error);
        }
    }

    static async update(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const bank = await BanksService.update(req.user!.id, Number(req.params.id), req.body.name);
            if (!bank) return res.status(404).json({ status: 'error', message: 'Banco no encontrado' });
            res.json(bank);
        } catch (error) {
            next(error);
        }
    }

    static async remove(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const deleted = await BanksService.remove(req.user!.id, Number(req.params.id));
            if (!deleted) return res.status(404).json({ status: 'error', message: 'Banco no encontrado' });
            res.status(204).send();
        } catch (error) {
            next(error);
        }
    }
}
