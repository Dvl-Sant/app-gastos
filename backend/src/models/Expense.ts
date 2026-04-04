export interface Expense {
    id: number;
    name: string;
    billing_date: number;
    due_date: number;
    monthly_payment: number;
    total_debt: number;
    category: string;
    is_paid: boolean;
    created_at: Date;
}

export type CreateExpenseDTO = Omit<Expense, 'id' | 'created_at'>;
export type UpdateExpenseDTO = Partial<CreateExpenseDTO>;
