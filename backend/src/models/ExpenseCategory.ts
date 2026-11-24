export interface ExpenseCategory {
    id: number;
    user_id: number;
    name: string;
    usage_count?: number;
}

export interface CreateExpenseCategoryDTO {
    name: string;
}

export type UpdateExpenseCategoryDTO = { name: string };

export const EXPENSE_CATEGORY_FIELDS = ['name'] as const;
