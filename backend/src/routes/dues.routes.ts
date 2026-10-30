import { Router } from 'express';
import { DuesController } from '../controllers/dues.controller';
import { validateBody } from '../middleware/validation.middleware';

const router = Router();

// Pagar una mensualidad individual (completa o parcial) desde una cuenta
// distinta o desde los ahorros
router.post('/:id/pay', validateBody(['amount', 'source_kind', 'source_account_id'], ['source_kind']), DuesController.pay);

export default router;
