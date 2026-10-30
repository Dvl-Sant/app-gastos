import { useCallback, useEffect, useState, type DependencyList } from 'react';
import { apiFetch } from '../api/client';
import type { Account, Cashflow, Due, Expense, HistoryGroup, Income, Statement } from '../types';

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
    history: () => apiFetch<HistoryGroup[]>('/history'),
};
