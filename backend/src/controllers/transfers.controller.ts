import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { TransfersService } from '../services/transfers.service';

export class TransfersController {
    static async create(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const result = await TransfersService.create(req.user!.id, req.body);
            res.status(201).json(result);
        } catch (error) {
            next(error);
        }
    }
}
