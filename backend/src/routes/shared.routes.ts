import { Router } from 'express';
import { SharedController } from '../controllers/shared.controller';
import { validateBody } from '../middleware/validation.middleware';
import { SHARED_GROUP_FIELDS, SHARED_MEMBER_FIELDS } from '../models/Shared';

const router = Router();

// Grupos
router.get('/summary', SharedController.summary);
router.get('/groups', SharedController.listGroups);
router.post('/groups', validateBody(SHARED_GROUP_FIELDS, ['name']), SharedController.createGroup);
router.put('/groups/:id', validateBody(SHARED_GROUP_FIELDS), SharedController.updateGroup);
router.delete('/groups/:id', SharedController.deleteGroup);
router.get('/groups/:id', SharedController.groupDetail);

// Miembros
router.post('/groups/:id/members', validateBody(SHARED_MEMBER_FIELDS, ['name']), SharedController.addMember);
router.put('/members/:id', validateBody(SHARED_MEMBER_FIELDS), SharedController.updateMember);
router.delete('/members/:id', SharedController.deleteMember);

// Pagos de miembros (periodos mensuales, incluso adelantados)
router.post('/members/:id/pay', validateBody(['months', 'start_period', 'amount', 'note'], ['months']), SharedController.registerPayment);
router.delete('/payments/:id', SharedController.deletePayment);

export default router;
