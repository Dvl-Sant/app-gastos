import { Router } from 'express';
import { ExpensesController } from '../controllers/expenses.controller';
import { validateBody } from '../middleware/validation.middleware';
import { EXPENSE_FIELDS } from '../models/Expense';

const router = Router();

router.get('/', ExpensesController.getAll);
router.get('/:id', ExpensesController.getById);
router.post('/', validateBody(EXPENSE_FIELDS), ExpensesController.create);
router.put('/:id', validateBody(EXPENSE_FIELDS), ExpensesController.update);
router.delete('/:id', ExpensesController.remove);

export default router;
