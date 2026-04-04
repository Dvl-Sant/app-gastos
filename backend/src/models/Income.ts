export interface Income {
    id: number;
    user_id: number;
    name: string;
    amount: number;
    frequency: 'semanal' | 'quincenal' | 'mensual';
    next_pay_date: number;
    created_at: Date;
}

export type CreateIncomeDTO = Omit<Income, 'id' | 'created_at' | 'user_id'>;
export type UpdateIncomeDTO = Partial<CreateIncomeDTO>;
