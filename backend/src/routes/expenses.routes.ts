import { Router } from 'express';
import { ExpensesController } from '../controllers/expenses.controller';
import { validateBody } from '../middleware/validation.middleware';
import { EXPENSE_FIELDS } from '../models/Expense';

const router = Router();

router.get('/', ExpensesController.getAll);
router.get('/calendar', ExpensesController.getCalendar);
router.get('/:id', ExpensesController.getById);
router.post('/', validateBody(EXPENSE_FIELDS, ['name', 'account_id']), ExpensesController.create);
router.put(
    '/:id',
    validateBody(['name', 'category', 'monthly_payment', 'total_amount', 'due_day', 'purchase_date', 'installments']),
    ExpensesController.update
);
router.delete('/:id', ExpensesController.remove);

export default router;
