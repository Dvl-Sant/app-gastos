export type IncomeType = 'frecuente' | 'unico';

export interface Income {
    id: number;
    user_id: number;
    name: string;
    amount: string;
    income_type: IncomeType;
    frequency: 'semanal' | 'quincenal' | 'mensual' | null;
    next_pay_day: number | null;
    received_at: string | null;
    created_at: Date;
}

export interface CreateIncomeDTO {
    name: string;
    amount: number;
    income_type: IncomeType;
    frequency?: 'semanal' | 'quincenal' | 'mensual';
    next_pay_day?: number;
    received_at?: string;
}

export type UpdateIncomeDTO = Partial<CreateIncomeDTO>;

export const INCOME_FIELDS = ['name', 'amount', 'income_type', 'frequency', 'next_pay_day', 'received_at'] as const;
