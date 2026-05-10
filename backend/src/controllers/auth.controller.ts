import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { AuthService } from '../services/auth.service';
import { JwtPayload } from '../models/User';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret_appgastos_key_123';

export class AuthController {
    static async login(req: Request, res: Response, next: NextFunction) {
        try {
            const { username, password } = req.body;

            if (!username || !password) {
                return res.status(400).json({ status: 'error', message: 'Username y password son requeridos' });
            }

            const user = await AuthService.getUserByUsername(username);
            if (!user) {
                return res.status(401).json({ status: 'error', message: 'Credenciales inválidas' });
            }

            const isValid = await bcrypt.compare(password, user.password_hash);
            if (!isValid) {
                return res.status(401).json({ status: 'error', message: 'Credenciales inválidas' });
            }

            const payload: JwtPayload = { id: user.id, username: user.username };
            const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });

            res.json({ status: 'success', data: { token, user: { id: user.id, username: user.username } } });
        } catch (error) {
            next(error);
        }
    }

    static async register(req: Request, res: Response, next: NextFunction) {
        try {
            const { username, password } = req.body;

            if (!username || !password) {
                return res.status(400).json({ status: 'error', message: 'Username y password son requeridos' });
            }

            if (password.length < 6) {
                return res.status(400).json({ status: 'error', message: 'La contraseña debe tener al menos 6 caracteres' });
            }

            const existing = await AuthService.getUserByUsername(username);
            if (existing) {
                return res.status(409).json({ status: 'error', message: 'El nombre de usuario ya existe' });
            }

            const passwordHash = await bcrypt.hash(password, 10);
            const user = await AuthService.createUser(username, passwordHash);

            const payload: JwtPayload = { id: user.id, username: user.username };
            const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });

            res.status(201).json({ status: 'success', data: { token, user: { id: user.id, username: user.username } } });
        } catch (error) {
            next(error);
        }
    }
}
