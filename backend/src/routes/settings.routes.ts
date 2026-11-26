import { Router } from 'express';
import { SettingsController } from '../controllers/settings.controller';
import { validateBody } from '../middleware/validation.middleware';

const router = Router();

router.get('/income-account', SettingsController.getIncomeAccount);
router.put('/income-account', validateBody(['account_id'], ['account_id']), SettingsController.setIncomeAccount);

export default router;
