export interface Expense {
    id: number;
    user_id: number;
    name: string;
    billing_date: number;
    due_date: number;
    monthly_payment: number;
    total_debt: number;
    category: string;
    is_paid: boolean;
    created_at: Date;
}

export type CreateExpenseDTO = Omit<Expense, 'id' | 'created_at' | 'user_id'>;
export type UpdateExpenseDTO = Partial<CreateExpenseDTO>;

export const EXPENSE_FIELDS = ['name', 'billing_date', 'due_date', 'monthly_payment', 'total_debt', 'category', 'is_paid'] as const;
