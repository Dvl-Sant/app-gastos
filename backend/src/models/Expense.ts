export type ExpenseType = 'recurrente' | 'unico' | 'msi';

export interface Expense {
    id: number;
    user_id: number;
    account_id: number;
    name: string;
    category: string | null;
    expense_type: ExpenseType;
    monthly_payment: string;
    total_amount: string;
    installments: number | null;
    due_day: number | null;
    purchase_date: string;
    is_paid: boolean;
    created_at: Date;
    // Computados
    account_name?: string;
    next_due_date?: string | null;
    pending_amount?: string;
}

export interface Due {
    id: number;
    user_id: number;
    expense_id: number;
    account_id: number;
    due_date: string;
    amount: string;
    paid_amount: string;
    is_paid: boolean;
    created_at: Date;
    // Computados (joins)
    expense_name?: string;
    category?: string | null;
    expense_type?: ExpenseType;
    account_name?: string;
}

/**
 * DTO de creación: los campos requeridos dependen de expense_type
 *  - recurrente: name, monthly_payment, due_day
 *  - unico:      name, total_amount, purchase_date (default hoy)
 *  - msi:        name, total_amount, installments, cuenta de crédito con corte
 * La validación específica vive en ExpensesService.create.
 */
export interface CreateExpenseDTO {
    account_id: number;
    name: string;
    category?: string;
    expense_type: ExpenseType;
    monthly_payment?: number;
    total_amount?: number;
    installments?: number;
    due_day?: number;
    purchase_date?: string;
    is_paid?: boolean;
}

export type UpdateExpenseDTO = Partial<
    Pick<Expense, 'name' | 'category' | 'monthly_payment' | 'total_amount' | 'due_day' | 'purchase_date' | 'installments'>
>;

export const EXPENSE_FIELDS = [
    'account_id',
    'name',
    'category',
    'expense_type',
    'monthly_payment',
    'total_amount',
    'installments',
    'due_day',
    'purchase_date',
    'is_paid',
] as const;
