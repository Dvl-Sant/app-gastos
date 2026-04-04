import { Router } from 'express';
import { ExpensesController } from '../controllers/expenses.controller';

const router = Router();

router.get('/', ExpensesController.getAll);
router.get('/:id', ExpensesController.getById);
router.post('/', ExpensesController.create);
router.put('/:id', ExpensesController.update);
router.delete('/:id', ExpensesController.remove);

export default router;
