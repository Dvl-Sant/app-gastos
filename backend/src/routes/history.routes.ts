import { Router } from 'express';
import { HistoryController } from '../controllers/history.controller';

const router = Router();

// Protected by authenticateToken in app.ts
router.get('/', HistoryController.getHistory);

export default router;
