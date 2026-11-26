export interface Loan {
    id: number;
    user_id: number;
    person_name: string;
    concept: string;
    amount: string;
    account_id: number | null;
    loan_date: string;
    comments: string | null;
    payment_frequency: 'semanal' | 'quincenal' | 'mensual' | null;
    created_at: Date;
    // Computados
    paid_amount?: string;
    remaining?: string;
    status?: 'activo' | 'liquidado';
    account_name?: string | null;
    next_expected_date?: string | null;
    days_until_next?: number | null;
}

export interface LoanPayment {
    id: number;
    user_id: number;
    loan_id: number;
    amount: string;
    account_id: number | null;
    paid_at: Date;
    note: string | null;
    account_name?: string | null;
}
