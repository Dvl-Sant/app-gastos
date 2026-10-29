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
    created_at: Date;
    // Computados
    pending_debt?: string;
}

export type CreateAccountDTO = Omit<Account, 'id' | 'user_id' | 'created_at' | 'pending_debt'>;
export type UpdateAccountDTO = Partial<CreateAccountDTO>;

export const ACCOUNT_FIELDS = ['name', 'type', 'cut_off_day', 'payment_due_day', 'balance', 'color'] as const;
