import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { SharedService } from '../services/shared.service';

export class SharedController {
    static async listGroups(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            res.json(await SharedService.listGroups(req.user!.id));
        } catch (error) {
            next(error);
        }
    }

    static async createGroup(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            res.status(201).json(await SharedService.createGroup(req.user!.id, req.body));
        } catch (error) {
            next(error);
        }
    }

    static async updateGroup(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const group = await SharedService.updateGroup(req.user!.id, Number(req.params.id), req.body);
            if (!group) return res.status(404).json({ status: 'error', message: 'Grupo no encontrado' });
            res.json(group);
        } catch (error) {
            next(error);
        }
    }

    static async deleteGroup(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const deleted = await SharedService.deleteGroup(req.user!.id, Number(req.params.id));
            if (!deleted) return res.status(404).json({ status: 'error', message: 'Grupo no encontrado' });
            res.status(204).send();
        } catch (error) {
            next(error);
        }
    }

    static async groupDetail(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            res.json(await SharedService.getGroupDetail(req.user!.id, Number(req.params.id)));
        } catch (error) {
            next(error);
        }
    }

    static async addMember(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            res.status(201).json(await SharedService.addMember(req.user!.id, Number(req.params.id), req.body));
        } catch (error) {
            next(error);
        }
    }

    static async updateMember(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const member = await SharedService.updateMember(req.user!.id, Number(req.params.id), req.body);
            if (!member) return res.status(404).json({ status: 'error', message: 'Miembro no encontrado' });
            res.json(member);
        } catch (error) {
            next(error);
        }
    }

    static async deleteMember(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const deleted = await SharedService.deleteMember(req.user!.id, Number(req.params.id));
            if (!deleted) return res.status(404).json({ status: 'error', message: 'Miembro no encontrado' });
            res.status(204).send();
        } catch (error) {
            next(error);
        }
    }

    static async registerPayment(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const result = await SharedService.registerPayment(req.user!.id, Number(req.params.id), req.body);
            res.status(201).json(result);
        } catch (error) {
            next(error);
        }
    }

    static async deletePayment(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            res.json(await SharedService.deletePayment(req.user!.id, Number(req.params.id)));
        } catch (error) {
            next(error);
        }
    }

    static async summary(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            res.json(await SharedService.getAlerts(req.user!.id));
        } catch (error) {
            next(error);
        }
    }
}
