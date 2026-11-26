import { Router } from 'express';
import { BanksController } from '../controllers/banks.controller';
import { validateBody } from '../middleware/validation.middleware';

const router = Router();

router.get('/', BanksController.list);
router.post('/', validateBody(['name', 'color'], ['name']), BanksController.create);
router.put('/:id', validateBody(['name'], ['name']), BanksController.update);
router.delete('/:id', BanksController.remove);

export default router;
