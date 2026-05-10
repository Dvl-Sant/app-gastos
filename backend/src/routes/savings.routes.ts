import { Router } from 'express';
import { SavingsController } from '../controllers/savings.controller';
import { validateBody } from '../middleware/validation.middleware';
import { SAVINGS_FIELDS } from '../models/UserSaving';

const router = Router();

router.get('/', SavingsController.get);
router.put('/', validateBody(SAVINGS_FIELDS), SavingsController.update);

export default router;
