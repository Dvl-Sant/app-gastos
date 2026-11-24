import { Router } from 'express';
import { ExpenseCategoriesController } from '../controllers/expense-categories.controller';
import { validateBody } from '../middleware/validation.middleware';

const router = Router();

router.get('/', ExpenseCategoriesController.list);
router.post('/', validateBody(['name'], ['name']), ExpenseCategoriesController.create);
router.put('/:id', validateBody(['name'], ['name']), ExpenseCategoriesController.update);
router.delete('/:id', ExpenseCategoriesController.remove);

export default router;
