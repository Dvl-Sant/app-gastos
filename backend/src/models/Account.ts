export type AccountType = 'efectivo' | 'debito' | 'credito';

export interface Account {
    id: number;
    user_id: number;
    name: string;
    type: AccountType;
    cut_off_day: number | null;
    payment_due_day: number | null;
    balance: string;
    color: string | null;
    bank_id: number | null;
    credit_limit: string | null;
    linked_to_savings: boolean;
    created_at: Date;
    // Computados
    pending_debt?: string;
    bank_name?: string | null;
    usage?: number | null;
    next_cut_date?: string | null;
    next_payment_date?: string | null;
    days_until_cut?: number | null;
    days_until_payment?: number | null;
}

export type CreateAccountDTO = Omit<Account, 'id' | 'user_id' | 'created_at' | 'pending_debt' | 'bank_name'>;
export type UpdateAccountDTO = Partial<CreateAccountDTO>;

export const ACCOUNT_FIELDS = [
    'name', 'type', 'cut_off_day', 'payment_due_day', 'balance', 'color',
    'bank_id', 'credit_limit', 'linked_to_savings',
] as const;
