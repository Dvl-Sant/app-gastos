import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import pool from '../db/pool';
import { JwtPayload } from '../models/User';

export interface AuthRequest extends Request {
    user?: JwtPayload;
}

export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ status: 'error', message: 'Acceso denegado, se requiere token' });
    }

    try {
        const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;
        // Un JWT válido puede referirse a un usuario eliminado (p.ej. tras un
        // reset de BD): verificar existencia devuelve 401 limpio en ese caso.
        const { rowCount } = await pool.query('SELECT 1 FROM users WHERE id = $1', [decoded.id]);
        if ((rowCount ?? 0) === 0) {
            return res.status(401).json({ status: 'error', message: 'Tu sesión ya no es válida. Inicia sesión de nuevo.' });
        }
        (req as AuthRequest).user = decoded;
        next();
    } catch (error) {
        res.status(403).json({ status: 'error', message: 'Token inválido o expirado' });
    }
};
