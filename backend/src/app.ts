import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';

import savingsRoutes from './routes/savings.routes';
import expensesRoutes from './routes/expenses.routes';
import dashboardRoutes from './routes/dashboard.routes';
import analyticsRoutes from './routes/analytics.routes';
import authRoutes from './routes/auth.routes';
import incomesRoutes from './routes/incomes.routes';
import historyRoutes from './routes/history.routes';
import { authenticateToken } from './middleware/auth.middleware';

const app = express();

app.use(cors());
app.use(express.json());

// Auth
app.use('/auth', authRoutes);

// Protected API Routes
app.use('/savings', authenticateToken, savingsRoutes);
app.use('/expenses', authenticateToken, expensesRoutes);
app.use('/incomes', authenticateToken, incomesRoutes);
app.use('/history', authenticateToken, historyRoutes);
app.use('/dashboard', authenticateToken, dashboardRoutes);
app.use('/analytics', authenticateToken, analyticsRoutes);



// Global Error Handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Error Interno del Servidor', message: err.message });
});

export default app;
