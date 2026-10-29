import { Router } from 'express';
import { AccountsController } from '../controllers/accounts.controller';
import { validateBody } from '../middleware/validation.middleware';
import { ACCOUNT_FIELDS } from '../models/Account';

const router = Router();

router.get('/', AccountsController.list);
router.post('/', validateBody(ACCOUNT_FIELDS, ['name', 'type']), AccountsController.create);
router.put('/:id', validateBody(ACCOUNT_FIELDS), AccountsController.update);
router.delete('/:id', AccountsController.remove);
router.get('/:id/statement', AccountsController.statement);
router.post('/:id/pay', validateBody(['amount', 'source_account_id'], ['source_account_id']), AccountsController.pay);

export default router;
