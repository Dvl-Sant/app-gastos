import { Router } from 'express';
import { IncomesController } from '../controllers/incomes.controller';
import { validateBody } from '../middleware/validation.middleware';
import { INCOME_FIELDS } from '../models/Income';

const router = Router();

router.get('/', IncomesController.getAll);
router.post('/', validateBody(INCOME_FIELDS, ['name', 'amount', 'income_type']), IncomesController.create);
router.put('/:id', validateBody(INCOME_FIELDS), IncomesController.update);
router.delete('/:id', IncomesController.remove);

export default router;
