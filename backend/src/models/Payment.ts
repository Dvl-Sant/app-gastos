export interface Payment {
    id: number;
    user_id: number;
    account_id: number;
    source_account_id: number | null;
    due_id: number | null;
    amount: string;
    note: string | null;
    paid_at: Date;
    // Computados (joins)
    account_name?: string;
    source_account_name?: string | null;
    expense_name?: string | null;
}

/** De dónde sale el dinero de un pago: una cuenta/tarjeta o los ahorros. */
export interface PaymentSource {
    kind: 'account' | 'savings';
    account_id?: number;
}
