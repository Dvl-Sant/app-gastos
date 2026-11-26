import { Router } from 'express';
import { TransfersController } from '../controllers/transfers.controller';
import { validateBody } from '../middleware/validation.middleware';

const router = Router();

router.post(
    '/',
    validateBody(['from_account_id', 'to_account_id', 'amount', 'note'], ['from_account_id', 'to_account_id', 'amount']),
    TransfersController.create
);

export default router;
