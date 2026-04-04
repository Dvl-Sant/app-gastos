import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { AuthService } from '../services/auth.service';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret_appgastos_key_123';

export class AuthController {
    static async login(req: Request, res: Response, next: NextFunction) {
        try {
            const { username, password } = req.body;

            const user = await AuthService.getUserByUsername(username);
            if (!user) {
                return res.status(401).json({ error: 'Credenciales inválidas' });
            }

            const isValid = await bcrypt.compare(password, user.password_hash);
            if (!isValid) {
                return res.status(401).json({ error: 'Credenciales inválidas' });
            }

            const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, {
                expiresIn: '24h'
            });

            res.json({ token, user: { id: user.id, username: user.username } });
        } catch (error) {
            next(error);
        }
    }
}
