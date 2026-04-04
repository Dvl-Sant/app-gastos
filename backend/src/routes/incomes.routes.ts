import { Router } from 'express';
import { IncomesController } from '../controllers/incomes.controller';

const router = Router();

// These routes will be protected by authenticateToken in app.ts
router.get('/', IncomesController.getAll);
router.post('/', IncomesController.create);
router.delete('/:id', IncomesController.remove);

export default router;
