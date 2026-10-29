import { Router } from 'express';
import { CashflowController } from '../controllers/cashflow.controller';

const router = Router();

router.get('/', CashflowController.get);

export default router;
