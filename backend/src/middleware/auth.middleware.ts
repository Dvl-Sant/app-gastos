import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JwtPayload } from '../models/User';
import { SECRET } from '../config/env';

export interface AuthRequest extends Request {
    user?: JwtPayload;
}

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ status: 'error', message: 'Acceso denegado, se requiere token' });
    }

    try {
        const decoded = jwt.verify(token, SECRET) as JwtPayload;
        (req as AuthRequest).user = decoded;
        next();
    } catch (error) {
        res.status(403).json({ status: 'error', message: 'Token inválido o expirado' });
    }
};
