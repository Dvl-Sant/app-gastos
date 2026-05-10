export interface UserSaving {
    id: number;
    user_id: number;
    total_amount: number;
    currency: string;
    updated_at: Date;
}

export const SAVINGS_FIELDS = ['total_amount', 'currency'] as const;
