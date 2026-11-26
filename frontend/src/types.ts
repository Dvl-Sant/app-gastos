export interface User {
    id: number;
    username: string;
}

export interface Bank {
    id: number;
    name: string;
    color: string | null;
    cards_count?: number;
}

export type AccountType = 'efectivo' | 'debito' | 'credito';

export interface Account {
    id: number;
    name: string;
    type: AccountType;
    cut_off_day: number | null;
    payment_due_day: number | null;
    balance: string;
    color: string | null;
    bank_id: number | null;
    bank_name?: string | null;
    credit_limit: string | null;
    linked_to_savings: boolean;
    pending_debt?: string;
    usage?: number | null;
    next_cut_date?: string | null;
    next_payment_date?: string | null;
    days_until_cut?: number | null;
    days_until_payment?: number | null;
    created_at: string;
}

export interface AccountCycle {
    id: number;
    name: string;
    type: AccountType;
    cut_off_day: number | null;
    balance: string;
    pending_debt: number;
    cycle_total: number;
    cycle_paid: number;
    cycle_pending: number;
}

export type ExpenseType = 'recurrente' | 'unico' | 'msi';

// pg serializa DECIMAL como string
export interface ExpenseCategory {
    id: number;
    name: string;
    usage_count?: number;
}

export interface Expense {
    id: number;
    user_id: number;
    account_id: number;
    name: string;
    category: string | null;
    expense_type: ExpenseType;
    monthly_payment: string;
    total_amount: string;
    installments: number | null;
    due_day: number | null;
    purchase_date: string;
    is_paid: boolean;
    account_name?: string;
    next_due_date?: string | null;
    next_due_id?: number | null;
    next_due_amount?: string | null;
    pending_amount?: string;
}

export interface Due {
    id: number;
    expense_id: number;
    account_id: number;
    due_date: string;
    amount: string;
    paid_amount: string;
    is_paid: boolean;
    expense_name?: string;
    category?: string | null;
    expense_type?: ExpenseType;
    account_name?: string;
}

export type IncomeType = 'frecuente' | 'unico';

export interface Income {
    id: number;
    name: string;
    amount: string;
    income_type: IncomeType;
    frequency: 'semanal' | 'quincenal' | 'mensual' | null;
    next_pay_day: number | null;
    received_at: string | null;
    created_at: string;
}

export interface Statement {
    account: Account;
    window: { from: string; to: string };
    dues: Due[];
    totals: { total: number; paid: number; pending: number };
}

export interface CashflowMonth {
    month: string;
    incomes: number;
    dues: number;
    dues_paid: number;
    net: number;
}

export interface IncomeOccurrence {
    date: string;
    income_id: number;
    name: string;
    amount: number;
    income_type: IncomeType;
}

export interface Cashflow {
    from: string;
    to: string;
    months: CashflowMonth[];
    totals: { incomes: number; dues: number; dues_paid: number; dues_pending: number };
    dues: Due[];
    income_occurrences: IncomeOccurrence[];
}

export type CardTipEntry = {
    id: number;
    name: string;
    cut_off_day: number | null;
    next_cut_date: string;
    next_payment_date: string;
    days_until_cut: number;
    days_until_payment: number;
    pending_debt: number;
    credit_limit: number | null;
    usage_percent: number | null;
};

export interface DashboardSummary {
    savings: number;
    savings_base: number;
    savings_linked: { id: number; name: string; balance: string }[];
    currency: string;
    month: {
        from: string;
        to: string;
        incomes: number;
        dues_total: number;
        dues_paid: number;
        dues_pending: number;
    };
    accounts: AccountCycle[];
    upcoming: Due[];
    shared: SharedAlert[];
    card_tip: {
        best: CardTipEntry | null;
        caution: CardTipEntry | null;
        cards: CardTipEntry[];
    } | null;
}

export interface PaymentEntry {
    id: number;
    amount: string;
    note: string | null;
    paid_at: string;
    account_name: string;
    source_account_name: string | null;
    expense_name: string | null;
    installments: number | null;
    installment_no: number | null;
}

export interface HistoryGroup {
    account_id: number;
    account_name: string;
    kind: 'pagos' | 'traspasos';
    total: number;
    payments: PaymentEntry[];
}

export interface InflowEntry {
    id: string;
    kind: 'ingreso' | 'compartido' | 'abono';
    name: string;
    detail: string;
    amount: string;
    date: string;
    note: string | null;
}

export interface LoanGiven {
    id: number;
    amount: string;
    loan_date: string;
    person_name: string;
    concept: string;
    account_name: string | null;
}

export interface HistoryResponse {
    groups: HistoryGroup[];
    inflows: InflowEntry[];
    loans_given: LoanGiven[];
}

// --- Préstamos ---

export interface LoanPaymentEntry {
    id: number;
    amount: string;
    account_name: string | null;
    paid_at: string;
    note: string | null;
}

export interface Loan {
    id: number;
    person_name: string;
    concept: string;
    amount: string;
    account_id: number | null;
    loan_date: string;
    comments: string | null;
    account_name?: string | null;
    paid_amount?: string;
    remaining?: string;
    status?: 'activo' | 'liquidado';
    payments?: LoanPaymentEntry[];
}

// --- Gastos compartidos (suscripciones familiares) ---

export interface SharedGroup {
    id: number;
    name: string;
    member_cuota: string;
    due_day: number | null;
    total_cost: string | null;
    members_count?: number;
}

export type SharedMemberStatus = 'pagado' | 'pendiente' | 'por_vencer' | 'adelantado';

export interface SharedMemberRow {
    id: number;
    name: string;
    note: string | null;
    active: boolean;
    status: SharedMemberStatus;
    advance_until: string | null;
    last_payment_at: string | null;
    total_paid: number;
    paid_current: boolean;
}

export interface SharedPaymentEntry {
    id: number;
    member_id: number;
    period: string;
    amount: string;
    paid_at: string;
    note: string | null;
    member_name?: string;
}

export interface SharedGroupDetail {
    group: SharedGroup;
    members: SharedMemberRow[];
    recent_payments: SharedPaymentEntry[];
}

export interface SharedAlert {
    id: number;
    name: string;
    due_day: number | null;
    member_cuota: number;
    total_cost: number | null;
    active_members: number;
    paid_count: number;
    pending: { id: number; name: string }[];
    advance: { name: string; until: string }[];
    collected: number;
    expected: number;
}
