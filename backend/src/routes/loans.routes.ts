import { Router } from 'express';
import { LoansController } from '../controllers/loans.controller';
import { validateBody } from '../middleware/validation.middleware';

const router = Router();

router.get('/', LoansController.list);
router.post(
    '/',
    validateBody(['person_name', 'concept', 'amount', 'account_id', 'loan_date', 'comments', 'payment_frequency'], ['person_name', 'concept', 'amount']),
    LoansController.create
);
router.put('/:id', validateBody(['person_name', 'concept', 'comments']), LoansController.update);
router.delete('/:id', LoansController.remove);
router.post(
    '/:id/payments',
    validateBody(['amount', 'account_id', 'note'], ['amount']),
    LoansController.addPayment
);
router.put('/payments/:id', validateBody(['amount', 'account_id', 'note']), LoansController.updatePayment);
router.delete('/payments/:id', LoansController.removePayment);

export default router;
