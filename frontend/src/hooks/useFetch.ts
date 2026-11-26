import { useCallback, useEffect, useState, type DependencyList } from 'react';
import { apiFetch } from '../api/client';
import type { Account, Bank, Cashflow, Due, Expense, ExpenseCategory, HistoryResponse, Income, Loan, Statement } from '../types';

interface UseFetchResult<T> {
    data: T | null;
    loading: boolean;
    error: string | null;
    reload: () => Promise<void>;
}

export function useFetch<T>(fetcher: () => Promise<T>, deps: DependencyList = []): UseFetchResult<T> {
    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const reload = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            setData(await fetcher());
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Error desconocido');
        } finally {
            setLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps);

    useEffect(() => {
        void reload();
    }, [reload]);

    return { data, loading, error, reload };
}

// --- Endpoints ---

export interface PaymentSourceInput {
    source_kind: 'account' | 'savings';
    source_account_id?: number;
}

export const api = {
    banks: {
        list: () => apiFetch<Bank[]>('/banks'),
        create: (body: { name: string; color?: string }) =>
            apiFetch<Bank>('/banks', { method: 'POST', body: JSON.stringify(body) }),
        update: (id: number, name: string) =>
            apiFetch<Bank>(`/banks/${id}`, { method: 'PUT', body: JSON.stringify({ name }) }),
        remove: (id: number) => apiFetch<void>(`/banks/${id}`, { method: 'DELETE' }),
    },
    settings: {
        getIncomeAccount: () =>
            apiFetch<{ account_id: number | null; account_name: string | null }>('/settings/income-account'),
        setIncomeAccount: (account_id: number) =>
            apiFetch<{ account_id: number; account_name: string }>('/settings/income-account', {
                method: 'PUT',
                body: JSON.stringify({ account_id }),
            }),
    },
    accounts: {
        list: () => apiFetch<Account[]>('/accounts'),
        create: (body: unknown) => apiFetch<Account>('/accounts', { method: 'POST', body: JSON.stringify(body) }),
        update: (id: number, body: unknown) =>
            apiFetch<Account>(`/accounts/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
        remove: (id: number) => apiFetch<void>(`/accounts/${id}`, { method: 'DELETE' }),
        statement: (id: number) => apiFetch<Statement>(`/accounts/${id}/statement`),
        pay: (id: number, body: { amount: number | 'full' } & PaymentSourceInput) =>
            apiFetch<unknown>(`/accounts/${id}/pay`, { method: 'POST', body: JSON.stringify(body) }),
    },
    expenses: {
        list: () => apiFetch<Expense[]>('/expenses'),
        getById: (id: number) => apiFetch<Expense>(`/expenses/${id}`),
        calendar: (from: string, to: string) =>
            apiFetch<Due[]>(`/expenses/calendar?from=${from}&to=${to}`),
        create: (body: unknown) =>
            apiFetch<Expense>('/expenses', { method: 'POST', body: JSON.stringify(body) }),
        update: (id: number, body: unknown) =>
            apiFetch<Expense>(`/expenses/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
        remove: (id: number) => apiFetch<void>(`/expenses/${id}`, { method: 'DELETE' }),
    },
    expenseCategories: {
        list: () => apiFetch<ExpenseCategory[]>('/expense-categories'),
        create: (name: string) =>
            apiFetch<ExpenseCategory>('/expense-categories', { method: 'POST', body: JSON.stringify({ name }) }),
        update: (id: number, name: string) =>
            apiFetch<ExpenseCategory>(`/expense-categories/${id}`, { method: 'PUT', body: JSON.stringify({ name }) }),
        remove: (id: number) => apiFetch<void>(`/expense-categories/${id}`, { method: 'DELETE' }),
    },
    dues: {
        pay: (id: number, body: { amount?: number } & PaymentSourceInput) =>
            apiFetch<unknown>(`/dues/${id}/pay`, { method: 'POST', body: JSON.stringify(body) }),
    },
    incomes: {
        list: () => apiFetch<Income[]>('/incomes'),
        create: (body: unknown) =>
            apiFetch<Income>('/incomes', { method: 'POST', body: JSON.stringify(body) }),
        update: (id: number, body: unknown) =>
            apiFetch<Income>(`/incomes/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
        remove: (id: number) => apiFetch<void>(`/incomes/${id}`, { method: 'DELETE' }),
    },
    savings: {
        get: () => apiFetch<{ total_amount: string; currency: string }>('/savings'),
        update: (body: unknown) =>
            apiFetch<{ total_amount: string; currency: string }>('/savings', { method: 'PUT', body: JSON.stringify(body) }),
        transfer: (body: { amount: number; source_account_id: number; note?: string }) =>
            apiFetch<{ savings: { total_amount: string }; source_balance: number }>('/savings/transfer', {
                method: 'POST',
                body: JSON.stringify(body),
            }),
    },
    dashboard: {
        summary: () => apiFetch<import('../types').DashboardSummary>('/dashboard/summary'),
    },
    cashflow: (from: string, to: string) => apiFetch<Cashflow>(`/cashflow?from=${from}&to=${to}`),
    history: (from?: string, to?: string) =>
        apiFetch<HistoryResponse>(`/history${from && to ? `?from=${from}&to=${to}` : ''}`),
    loans: {
        list: () => apiFetch<Loan[]>('/loans'),
        create: (body: { person_name: string; concept: string; amount: number; account_id?: number | null; loan_date?: string; comments?: string }) =>
            apiFetch<Loan>('/loans', { method: 'POST', body: JSON.stringify(body) }),
        update: (id: number, body: { person_name?: string; concept?: string; comments?: string }) =>
            apiFetch<unknown>(`/loans/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
        remove: (id: number) => apiFetch<void>(`/loans/${id}`, { method: 'DELETE' }),
        pay: (id: number, body: { amount: number; account_id?: number | null; note?: string }) =>
            apiFetch<{ remaining: number }>(`/loans/${id}/payments`, { method: 'POST', body: JSON.stringify(body) }),
        removePayment: (id: number) => apiFetch<{ amount: number }>(`/loans/payments/${id}`, { method: 'DELETE' }),
    },
    transfers: {
        create: (body: { from_account_id: number; to_account_id: number; amount: number; note?: string }) =>
            apiFetch<unknown>('/transfers', { method: 'POST', body: JSON.stringify(body) }),
    },
    shared: {
        summary: () => apiFetch<import('../types').SharedAlert[]>('/shared/summary'),
        groups: {
            list: () => apiFetch<import('../types').SharedGroup[]>('/shared/groups'),
            create: (body: unknown) =>
                apiFetch<import('../types').SharedGroup>('/shared/groups', { method: 'POST', body: JSON.stringify(body) }),
            update: (id: number, body: unknown) =>
                apiFetch<import('../types').SharedGroup>(`/shared/groups/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
            remove: (id: number) => apiFetch<void>(`/shared/groups/${id}`, { method: 'DELETE' }),
            detail: (id: number) => apiFetch<import('../types').SharedGroupDetail>(`/shared/groups/${id}`),
        },
        members: {
            create: (groupId: number, body: unknown) =>
                apiFetch<unknown>(`/shared/groups/${groupId}/members`, { method: 'POST', body: JSON.stringify(body) }),
            update: (id: number, body: unknown) =>
                apiFetch<unknown>(`/shared/members/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
            remove: (id: number) => apiFetch<void>(`/shared/members/${id}`, { method: 'DELETE' }),
        },
        pay: (memberId: number, body: { months: number; amount?: number; note?: string }) =>
            apiFetch<{ periods: string[]; total: number; credited: number }>(`/shared/members/${memberId}/pay`, {
                method: 'POST',
                body: JSON.stringify(body),
            }),
        removePayment: (id: number) => apiFetch<{ amount: number }>(`/shared/payments/${id}`, { method: 'DELETE' }),
    },
};
