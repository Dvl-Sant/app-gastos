import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, App as AntApp, Button, DatePicker, Skeleton, Statistic } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { motion } from 'framer-motion';
import { CalendarClock, CreditCard, DollarSign, Pencil, Plus, TrendingUp, User } from 'lucide-react';
import AppHeader from '../components/AppHeader';
import DuesTable from '../components/DuesTable';
import ExpensesList from '../components/ExpensesList';
import IncomesTable from '../components/IncomesTable';
import ExpenseModal from '../components/ExpenseModal';
import IncomeModal from '../components/IncomeModal';
import SavingsModal, { type SavingsFormValues, type TransferFormValues } from '../components/SavingsModal';
import PaymentModal from '../components/PaymentModal';
import type { PaymentSourceInput } from '../hooks/useFetch';
import { api, useFetch } from '../hooks/useFetch';
import type { Due, Expense, Income } from '../types';
import { formatCurrency } from '../utils/format';

const typeBadge: Record<string, string> = {
    credito: 'bg-purple-50 text-purple-600',
    debito: 'bg-blue-50 text-blue-600',
    efectivo: 'bg-green-50 text-green-600',
};

export default function DashboardPage() {
    const { message } = AntApp.useApp();
    const navigate = useNavigate();
    const dashboard = useFetch(api.dashboard.summary);
    const accounts = useFetch(api.accounts.list);
    const incomes = useFetch(api.incomes.list);
    const savings = useFetch(api.savings.get);

    const [expenseModalOpen, setExpenseModalOpen] = useState(false);
    const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
    const [incomeModalOpen, setIncomeModalOpen] = useState(false);
    const [editingIncome, setEditingIncome] = useState<Income | null>(null);
    const [savingsModalOpen, setSavingsModalOpen] = useState(false);
    const [payingDue, setPayingDue] = useState<Due | null>(null);
    const [viewMonth, setViewMonth] = useState<Dayjs>(dayjs());

    const expensesList = useFetch(api.expenses.list);

    const monthDues = useFetch(
        () =>
            api.expenses.calendar(
                viewMonth.startOf('month').format('YYYY-MM-DD'),
                viewMonth.endOf('month').format('YYYY-MM-DD')
            ),
        [viewMonth.format('YYYY-MM')]
    );

    const refreshAll = () => {
        void dashboard.reload();
        void accounts.reload();
        void incomes.reload();
        void savings.reload();
        void monthDues.reload();
        void expensesList.reload();
    };

    const handleError = (e: unknown) => message.error(e instanceof Error ? e.message : 'Error inesperado');

    const submitExpense = async (payload: Record<string, unknown>, editingId: number | null) => {
        try {
            if (editingId) {
                await api.expenses.update(editingId, payload);
                message.success('Gasto actualizado');
            } else {
                await api.expenses.create(payload);
                message.success('Gasto agregado');
            }
            setExpenseModalOpen(false);
            setEditingExpense(null);
            refreshAll();
        } catch (e) {
            handleError(e);
        }
    };

    const deleteExpense = async (expense: Expense) => {
        try {
            await api.expenses.remove(expense.id);
            message.success('Gasto eliminado');
            refreshAll();
        } catch (e) {
            handleError(e);
        }
    };

    const submitIncome = async (payload: Record<string, unknown>, editingId: number | null) => {
        try {
            if (editingId) {
                await api.incomes.update(editingId, payload);
                message.success('Ingreso actualizado');
            } else {
                await api.incomes.create(payload);
                message.success('Ingreso registrado');
            }
            setIncomeModalOpen(false);
            setEditingIncome(null);
            refreshAll();
        } catch (e) {
            handleError(e);
        }
    };

    const submitSavings = async (values: SavingsFormValues) => {
        try {
            await api.savings.update(values);
            message.success('Ahorros actualizados');
            setSavingsModalOpen(false);
            refreshAll();
        } catch (e) {
            handleError(e);
        }
    };

    const submitTransfer = async (values: TransferFormValues) => {
        try {
            await api.savings.transfer(values);
            message.success('Traspaso a ahorros registrado');
            setSavingsModalOpen(false);
            refreshAll();
        } catch (e) {
            handleError(e);
        }
    };

    const payDue = async (amount: number | 'full', source: PaymentSourceInput) => {
        if (!payingDue) return;
        try {
            await api.dues.pay(payingDue.id, {
                amount: amount === 'full' ? undefined : amount,
                ...source,
            });
            message.success('Pago registrado');
            setPayingDue(null);
            refreshAll();
        } catch (e) {
            handleError(e);
        }
    };

    const deleteIncome = async (income: Income) => {
        try {
            await api.incomes.remove(income.id);
            message.success('Ingreso eliminado');
            refreshAll();
        } catch (e) {
            handleError(e);
        }
    };

    const summary = dashboard.data;
    const month = summary?.month;

    return (
        <div className="flex flex-col min-h-screen bg-background-light">
            <AppHeader icon={<User className="text-primary w-5 h-5" />} subtitle="Panel" title="Mis Gastos" />

            <main className="flex-1 px-4 py-6 space-y-6 max-w-5xl w-full mx-auto">
                {dashboard.error && <Alert type="error" showIcon message={dashboard.error} />}

                {/* Ahorros + mes */}
                <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: 'easeOut' }}>
                    <div className="relative overflow-hidden rounded-xl bg-blue-50 border border-primary/10 p-6 shadow-sm">
                        <div className="absolute -right-4 -top-4 size-24 bg-primary/5 rounded-full" />
                        <div className="relative z-10 flex justify-between gap-4 flex-wrap">
                            <div>
                                <p className="text-sm font-semibold text-primary/80 uppercase tracking-tight">Ahorros</p>
                                {dashboard.loading ? (
                                    <Skeleton.Input active size="large" className="mt-2" />
                                ) : (
                                    <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-primary">
                                        {formatCurrency(summary?.savings)}
                                    </h2>
                                )}
                                <button
                                    onClick={() => setSavingsModalOpen(true)}
                                    className="text-primary text-xs font-semibold mt-2 inline-flex items-center gap-1 hover:underline"
                                >
                                    <Pencil className="w-3 h-3" /> Actualizar ahorros
                                </button>
                            </div>
                            <div className="grid grid-cols-3 gap-4 items-center">
                                <Statistic
                                    title={<span className="text-[10px] uppercase font-bold text-slate-500">Ingresos del mes</span>}
                                    value={month ? formatCurrency(month.incomes) : '—'}
                                    valueStyle={{ fontSize: '1.1rem', color: '#10b981' }}
                                    prefix={<TrendingUp className="w-4 h-4 inline" />}
                                />
                                <Statistic
                                    title={<span className="text-[10px] uppercase font-bold text-slate-500">Pagado</span>}
                                    value={month ? formatCurrency(month.dues_paid) : '—'}
                                    valueStyle={{ fontSize: '1.1rem', color: '#1772da' }}
                                />
                                <Statistic
                                    title={<span className="text-[10px] uppercase font-bold text-slate-500">Pendiente</span>}
                                    value={month ? formatCurrency(month.dues_pending) : '—'}
                                    valueStyle={{ fontSize: '1.1rem', color: '#ef4444' }}
                                />
                            </div>
                            <div className="flex flex-col gap-2 relative z-10">
                                <Button
                                    icon={<DollarSign className="w-4 h-4" />}
                                    onClick={() => {
                                        setEditingIncome(null);
                                        setIncomeModalOpen(true);
                                    }}
                                    className="!text-primary !bg-white !rounded-full !font-bold !text-sm !px-3 shadow-sm"
                                >
                                    Nuevo Ingreso
                                </Button>
                            </div>
                        </div>
                    </div>
                </motion.section>

                {/* Cuentas / tarjetas */}
                <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08, duration: 0.35, ease: 'easeOut' }}>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-slate-800">Mis Cuentas</h3>
                        <Button icon={<Plus className="w-4 h-4" />} onClick={() => navigate('/accounts')} className="!text-primary !bg-primary/5 !rounded-full !font-bold !text-sm !px-3">
                            Gestionar
                        </Button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {(accounts.data ?? []).map((account, i) => {
                            const cycle = summary?.accounts.find((a) => a.id === account.id);
                            return (
                                <motion.button
                                    key={account.id}
                                    initial={{ opacity: 0, y: 12 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.1 + i * 0.05, duration: 0.3 }}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => navigate('/accounts', { state: { openAccountId: account.id } })}
                                    className="text-left bg-white rounded-xl border border-border-subtle shadow-sm p-4"
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="font-bold text-slate-900 flex items-center gap-2">
                                            <CreditCard className="w-4 h-4 text-primary" />
                                            {account.name}
                                        </span>
                                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${typeBadge[account.type] ?? ''}`}>
                                            {account.type}
                                        </span>
                                    </div>
                                    {account.type === 'credito' ? (
                                        <div className="mt-3 flex items-baseline justify-between">
                                            <div>
                                                <p className="text-[10px] text-slate-500 font-bold uppercase">Deuda total</p>
                                                <p className="text-lg font-extrabold text-danger">{formatCurrency(cycle?.pending_debt ?? account.pending_debt ?? 0)}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] text-slate-500 font-bold uppercase">Este periodo</p>
                                                <p className="text-sm font-bold text-slate-900">{formatCurrency(cycle?.cycle_pending ?? 0)}</p>
                                                <p className="text-[10px] text-slate-400">
                                                    Corte día {account.cut_off_day}
                                                    {account.payment_due_day ? ` • Pago día ${account.payment_due_day}` : ''}
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="mt-3">
                                            <p className="text-[10px] text-slate-500 font-bold uppercase">Saldo</p>
                                            <p className="text-lg font-extrabold text-success">{formatCurrency(account.balance)}</p>
                                        </div>
                                    )}
                                </motion.button>
                            );
                        })}
                    </div>
                </motion.section>

                {/* Vencimientos del mes */}
                <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16, duration: 0.35, ease: 'easeOut' }}>
                    <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <CalendarClock className="w-5 h-5 text-primary" /> Vencimientos del mes
                        </h3>
                        <div className="flex items-center gap-2">
                            <DatePicker
                                picker="month"
                                value={viewMonth}
                                onChange={(d) => d && setViewMonth(d)}
                                format="MMMM YYYY"
                                allowClear={false}
                            />
                            <Button icon={<TrendingUp className="w-4 h-4" />} onClick={() => navigate('/flujo')} className="!text-primary !bg-primary/5 !rounded-full !font-bold !text-sm !px-3">
                                Flujo completo
                            </Button>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl border border-border-subtle overflow-hidden shadow-sm">
                        <DuesTable
                            dues={monthDues.data ?? []}
                            loading={monthDues.loading}
                            showAccount
                            onPay={(due) => setPayingDue(due)}
                            emptyText={`Nada vence en ${viewMonth.format('MMMM YYYY')}.`}
                        />
                    </div>
                </motion.section>

                {/* Gastos declarados */}
                <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.35, ease: 'easeOut' }}>
                    <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                        <h3 className="text-lg font-bold text-slate-800">Gastos declarados</h3>
                        <Button
                            icon={<Plus className="w-4 h-4" />}
                            onClick={() => {
                                setEditingExpense(null);
                                setExpenseModalOpen(true);
                            }}
                            className="!text-primary !bg-primary/5 !rounded-full !font-bold !text-sm !px-3"
                        >
                            Agregar
                        </Button>
                    </div>
                    <div className="bg-white rounded-xl border border-border-subtle overflow-hidden shadow-sm">
                        <ExpensesList
                            expenses={expensesList.data ?? []}
                            loading={expensesList.loading}
                            onEdit={(expense) => {
                                setEditingExpense(expense);
                                setExpenseModalOpen(true);
                            }}
                            onDelete={deleteExpense}
                        />
                    </div>
                </motion.section>

                {/* Ingresos */}
                <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28, duration: 0.35, ease: 'easeOut' }}>
                    <h3 className="text-lg font-bold mb-4 text-slate-800">Mis Ingresos</h3>
                    <div className="bg-white rounded-xl border border-border-subtle overflow-hidden shadow-sm">
                        {incomes.loading ? (
                            <div className="p-6">
                                <Skeleton active paragraph={{ rows: 2 }} />
                            </div>
                        ) : (
                            <IncomesTable
                                incomes={incomes.data ?? []}
                                onEdit={(income) => {
                                    setEditingIncome(income);
                                    setIncomeModalOpen(true);
                                }}
                                onDelete={deleteIncome}
                            />
                        )}
                    </div>
                </motion.section>
            </main>

            <nav className="sticky bottom-0 bg-white border-t border-border-subtle px-6 py-3 flex items-center justify-center pb-8 z-10">
                <motion.button
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.94 }}
                    onClick={() => setExpenseModalOpen(true)}
                    className="relative -top-6 size-14 bg-primary text-white rounded-full flex items-center justify-center shadow-lg shadow-primary/40 ring-4 ring-background-light"
                    title="Agregar gasto"
                >
                    <Plus className="w-8 h-8" />
                </motion.button>
            </nav>

            <ExpenseModal
                open={expenseModalOpen}
                accounts={accounts.data ?? []}
                editing={editingExpense}
                onCancel={() => {
                    setExpenseModalOpen(false);
                    setEditingExpense(null);
                }}
                onSubmit={submitExpense}
            />
            <IncomeModal
                open={incomeModalOpen}
                editing={editingIncome}
                onCancel={() => {
                    setIncomeModalOpen(false);
                    setEditingIncome(null);
                }}
                onSubmit={submitIncome}
            />
            <SavingsModal
                open={savingsModalOpen}
                current={savings.data}
                accounts={accounts.data ?? []}
                onCancel={() => setSavingsModalOpen(false)}
                onSetTotal={submitSavings}
                onTransfer={submitTransfer}
            />
            <PaymentModal
                open={payingDue !== null}
                due={payingDue}
                statementPending={null}
                targetAccountId={payingDue?.account_id ?? null}
                accounts={accounts.data ?? []}
                savingsTotal={savings.data ? Number(savings.data.total_amount) : null}
                onCancel={() => setPayingDue(null)}
                onSubmit={payDue}
            />
        </div>
    );
}
