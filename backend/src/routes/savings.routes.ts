import { Router } from 'express';
import { SavingsController } from '../controllers/savings.controller';
import { validateBody } from '../middleware/validation.middleware';

const router = Router();

router.get('/', SavingsController.get);
router.put('/', validateBody(['total_amount', 'currency'], ['total_amount']), SavingsController.update);
router.post('/transfer', validateBody(['amount', 'source_account_id', 'note'], ['amount', 'source_account_id']), SavingsController.transfer);

export default router;
