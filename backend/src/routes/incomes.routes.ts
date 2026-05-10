import { Router } from 'express';
import { IncomesController } from '../controllers/incomes.controller';
import { validateBody } from '../middleware/validation.middleware';
import { INCOME_FIELDS } from '../models/Income';

const router = Router();

router.get('/', IncomesController.getAll);
router.get('/:id', IncomesController.getById);
router.post('/', validateBody(INCOME_FIELDS), IncomesController.create);
router.put('/:id', validateBody(INCOME_FIELDS), IncomesController.update);
router.delete('/:id', IncomesController.remove);

export default router;
