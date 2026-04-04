import { Router } from 'express';
import { SavingsController } from '../controllers/savings.controller';

const router = Router();

router.get('/', SavingsController.get);
router.put('/', SavingsController.update);

export default router;
