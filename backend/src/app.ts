import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import savingsRoutes from './routes/savings.routes';
import expensesRoutes from './routes/expenses.routes';
import dashboardRoutes from './routes/dashboard.routes';
import analyticsRoutes from './routes/analytics.routes';
import authRoutes from './routes/auth.routes';
import incomesRoutes from './routes/incomes.routes';
import historyRoutes from './routes/history.routes';
import accountsRoutes from './routes/accounts.routes';
import duesRoutes from './routes/dues.routes';
import cashflowRoutes from './routes/cashflow.routes';
import { authenticateToken } from './middleware/auth.middleware';
import { config } from './config';
import { HttpError } from './utils/errors';

const app = express();

// Detrás de nginx (docker) hay 1 salto de proxy: necesario para que
// express-rate-limit lea la IP real del cliente desde X-Forwarded-For.
app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({
    // '*' (local) permite cualquier origen; en producción CORS_ORIGIN es una lista separada por comas
    origin: config.corsOrigin === '*' ? true : config.corsOrigin.split(',').map((o) => o.trim()),
}));
app.use(express.json());

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { status: 'error', message: 'Demasiados intentos. Espera 15 minutos y vuelve a intentarlo.' },
});

// API (protegida por JWT salvo /api/auth)
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/savings', authenticateToken, savingsRoutes);
app.use('/api/expenses', authenticateToken, expensesRoutes);
app.use('/api/incomes', authenticateToken, incomesRoutes);
app.use('/api/history', authenticateToken, historyRoutes);
app.use('/api/dashboard', authenticateToken, dashboardRoutes);
app.use('/api/analytics', authenticateToken, analyticsRoutes);
app.use('/api/accounts', authenticateToken, accountsRoutes);
app.use('/api/dues', authenticateToken, duesRoutes);
app.use('/api/cashflow', authenticateToken, cashflowRoutes);

app.use((_req: Request, res: Response) => {
    res.status(404).json({ status: 'error', message: 'Ruta no encontrada' });
});

// Global Error Handler
app.use((err: Error & { type?: string }, req: Request, res: Response, next: NextFunction) => {
    if (err.type === 'entity.parse.failed') {
        return res.status(400).json({ status: 'error', message: 'JSON inválido en el cuerpo de la petición' });
    }
    if (err instanceof HttpError) {
        return res.status(err.status).json({ status: 'error', message: err.message });
    }
    console.error('[App] Error no controlado:', err.stack);
    // No se expone err.message al cliente: puede filtrar detalles internos
    res.status(500).json({ status: 'error', message: 'Error interno del servidor' });
});

export default app;
