export interface User {
    id: number;
    username: string;
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
    pending_debt?: string;
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

export interface DashboardSummary {
    savings: number;
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
}

export interface PaymentEntry {
    id: number;
    amount: string;
    note: string | null;
    paid_at: string;
    account_name: string;
    source_account_name: string | null;
    expense_name: string | null;
}

export interface HistoryGroup {
    account_id: number;
    account_name: string;
    total: number;
    payments: PaymentEntry[];
}
