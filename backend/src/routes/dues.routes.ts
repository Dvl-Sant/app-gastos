import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { DuesController } from '../controllers/dues.controller';

import { Router } from 'express';

const router = Router();

// Pagar una mensualidad individual (completa o parcial)
router.post('/:id/pay', DuesController.pay);

export default router;
