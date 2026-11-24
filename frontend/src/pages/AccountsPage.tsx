import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Alert, App as AntApp, Button, Drawer, Segmented, Skeleton, Statistic } from 'antd';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import cardsWallet from '../assets/cards-wallet.svg';
import AppHeader from '../components/AppHeader';
import CreditCardVisual from '../components/CreditCardVisual';
import DuesTable from '../components/DuesTable';
import AccountModal from '../components/AccountModal';
import ExpenseModal from '../components/ExpenseModal';
import PaymentModal from '../components/PaymentModal';
import type { PaymentSourceInput } from '../hooks/useFetch';
import { api, useFetch } from '../hooks/useFetch';
import type { Account, Due, Expense } from '../types';
import { formatCurrency } from '../utils/format';

export default function AccountsPage() {
    const { message, modal } = AntApp.useApp();
    const location = useLocation();
    const accounts = useFetch(api.accounts.list);

    const [accountModalOpen, setAccountModalOpen] = useState(false);
    const [editingAccount, setEditingAccount] = useState<Account | null>(null);
    const [statementAccountId, setStatementAccountId] = useState<number | null>(null);
    const statement = useFetch(
        () => (statementAccountId ? api.accounts.statement(statementAccountId) : Promise.resolve(null)),
        [statementAccountId]
    );
    const [payingDue, setPayingDue] = useState<Due | null>(null);
    const [payStatementOpen, setPayStatementOpen] = useState(false);
    const savings = useFetch(api.savings.get);
    const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
    const [expenseModalOpen, setExpenseModalOpen] = useState(false);
    const [sortMode, setSortMode] = useState<'pago' | 'creacion'>('pago');
    const categories = useFetch(api.expenseCategories.list);

    const sortedAccounts = useMemo(() => {
        const list = [...(accounts.data ?? [])];
        if (sortMode === 'pago') {
            // El backend ya ordena crédito por fecha límite de pago; replicamos
            // el criterio por si el toggle cambia o el orden llegase mezclado.
            list.sort((a, b) => {
                if (a.type === 'credito' && b.type === 'credito') {
                    return (a.days_until_payment ?? 9999) - (b.days_until_payment ?? 9999);
                }
                if (a.type === 'credito') return -1;
                if (b.type === 'credito') return 1;
                return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
            });
        } else {
            list.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        }
        return list;
    }, [accounts.data, sortMode]);

    // Abrir el drawer si se llegó desde el dashboard (state.openAccountId)
    useEffect(() => {
        const state = location.state as { openAccountId?: number } | null;
        if (state?.openAccountId) {
            setStatementAccountId(state.openAccountId);
            window.history.replaceState({}, '');
        }
    }, [location.state]);

    const handleError = (e: unknown) => message.error(e instanceof Error ? e.message : 'Error inesperado');

    const submitAccount = async (payload: Record<string, unknown>, editingId: number | null) => {
        try {
            if (editingId) {
                await api.accounts.update(editingId, payload);
                message.success('Cuenta actualizada');
            } else {
                await api.accounts.create(payload);
                message.success('Cuenta creada');
            }
            setAccountModalOpen(false);
            setEditingAccount(null);
            await accounts.reload();
        } catch (e) {
            handleError(e);
        }
    };

    const deleteAccount = async (account: Account) => {
        try {
            await api.accounts.remove(account.id);
            message.success('Cuenta eliminada');
            await accounts.reload();
        } catch (e) {
            handleError(e);
        }
    };

    const submitPayStatement = async (amount: number | 'full', source: PaymentSourceInput) => {
        if (!statementAccountId) return;
        try {
            await api.accounts.pay(statementAccountId, { amount, ...source });
            message.success('Pago registrado');
            setPayStatementOpen(false);
            await accounts.reload();
            await statement.reload();
            await savings.reload();
        } catch (e) {
            handleError(e);
        }
    };

    const submitPayDue = async (amount: number | 'full', source: PaymentSourceInput) => {
        if (!payingDue) return;
        try {
            await api.dues.pay(payingDue.id, {
                amount: amount === 'full' ? undefined : amount,
                ...source,
            });
            message.success('Pago registrado');
            setPayingDue(null);
            await accounts.reload();
            await statement.reload();
            await savings.reload();
        } catch (e) {
            handleError(e);
        }
    };

    /** Abre el modal de edición del gasto al que pertenece la mensualidad. */
    const editExpenseFromDue = async (due: Due) => {
        try {
            const expense = await api.expenses.getById(due.expense_id);
            setEditingExpense(expense);
            setExpenseModalOpen(true);
        } catch (e) {
            handleError(e);
        }
    };

    /** Confirmación en modal antes de eliminar el gasto. */
    const deleteExpenseFromDue = (due: Due) => {
        modal.confirm({
            title: `¿Eliminar "${due.expense_name}"?`,
            content:
                'Se eliminan también sus mensualidades pendientes. Los pagos ya hechos se conservan en el historial. Esta acción no se puede deshacer.',
            okText: 'Sí, eliminar',
            cancelText: 'Cancelar',
            okButtonProps: { danger: true },
            onOk: async () => {
                try {
                    await api.expenses.remove(due.expense_id);
                    message.success('Gasto eliminado');
                    await accounts.reload();
                    await statement.reload();
                } catch (e) {
                    handleError(e);
                }
            },
        });
    };

    const submitEditExpense = async (payload: Record<string, unknown>, editingId: number | null) => {
        if (!editingId) return;
        try {
            await api.expenses.update(editingId, payload);
            message.success('Gasto actualizado');
            setExpenseModalOpen(false);
            setEditingExpense(null);
            await accounts.reload();
            await statement.reload();
        } catch (e) {
            handleError(e);
        }
    };

    const statementData = statement.data;

    return (
        <div className="flex flex-col min-h-screen bg-background-light">
            <AppHeader icon={<img src={cardsWallet} alt="" className="w-6 h-6" />} subtitle="Finanzas" title="Cuentas y Tarjetas" />

            <main className="flex-1 px-4 py-6 space-y-6 max-w-5xl w-full mx-auto">
                {accounts.error && <Alert type="error" showIcon message={accounts.error} />}

                <div className="flex items-center justify-between flex-wrap gap-3">
                    <h3 className="text-lg font-bold text-slate-800">Todas mis cuentas</h3>
                    <div className="flex items-center gap-3">
                        <Segmented
                            value={sortMode}
                            onChange={(v) => setSortMode(v as 'pago' | 'creacion')}
                            options={[
                                { label: 'Por fecha de pago', value: 'pago' },
                                { label: 'Como las agregué', value: 'creacion' },
                            ]}
                        />
                        <Button
                            type="primary"
                            icon={<Plus className="w-4 h-4" />}
                            onClick={() => {
                                setEditingAccount(null);
                                setAccountModalOpen(true);
                            }}
                            className="!rounded-full !font-bold"
                        >
                            Nueva Cuenta
                        </Button>
                    </div>
                </div>

                {accounts.loading ? (
                    <Skeleton active paragraph={{ rows: 4 }} />
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {sortedAccounts.map((account, i) => (
                            <motion.div
                                key={account.id}
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05, duration: 0.3 }}
                            >
                                <CreditCardVisual
                                    account={account}
                                    onOpen={() => setStatementAccountId(account.id)}
                                    onEdit={() => {
                                        setEditingAccount(account);
                                        setAccountModalOpen(true);
                                    }}
                                    onDelete={() => deleteAccount(account)}
                                />
                            </motion.div>
                        ))}
                    </div>
                )}
            </main>

            {/* Estado de cuenta */}
            <Drawer
                title={statementData ? `Estado de Cuenta — ${statementData.account.name}` : 'Estado de Cuenta'}
                placement="right"
                width={560}
                open={statementAccountId !== null}
                onClose={() => setStatementAccountId(null)}
                destroyOnClose
            >
                {statement.loading ? (
                    <Skeleton active paragraph={{ rows: 8 }} />
                ) : statementData ? (
                    <div className="space-y-5">
                        <div className="grid grid-cols-3 gap-3">
                            <Statistic title="Total del periodo" value={formatCurrency(statementData.totals.total)} valueStyle={{ fontSize: '1.05rem' }} />
                            <Statistic title="Pagado" value={formatCurrency(statementData.totals.paid)} valueStyle={{ fontSize: '1.05rem', color: '#10b981' }} />
                            <Statistic title="Pendiente" value={formatCurrency(statementData.totals.pending)} valueStyle={{ fontSize: '1.05rem', color: '#ef4444' }} />
                        </div>
                        <p className="text-xs text-slate-500 font-semibold">
                            Periodo: {new Date(`${statementData.window.from}T12:00:00`).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} —{' '}
                            {new Date(`${statementData.window.to}T12:00:00`).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                            {statementData.account.payment_due_day
                                ? ` • Fecha límite de pago: día ${statementData.account.payment_due_day}`
                                : ''}
                        </p>

                        <Button
                            type="primary"
                            block
                            className="!font-bold"
                            disabled={statementData.totals.pending <= 0}
                            onClick={() => setPayStatementOpen(true)}
                        >
                            Pagar Estado de Cuenta
                        </Button>

                        <DuesTable
                            dues={statementData.dues}
                            showAccount={false}
                            onPay={(due) => setPayingDue(due)}
                            onEditExpense={editExpenseFromDue}
                            onDeleteExpense={deleteExpenseFromDue}
                            emptyText="Nada vence en este periodo."
                        />
                    </div>
                ) : (
                    <Alert type="info" message="Selecciona una cuenta" />
                )}
            </Drawer>

            <AccountModal
                open={accountModalOpen}
                editing={editingAccount}
                onCancel={() => {
                    setAccountModalOpen(false);
                    setEditingAccount(null);
                }}
                onSubmit={submitAccount}
            />
            <PaymentModal
                open={payingDue !== null || payStatementOpen}
                due={payingDue}
                statementPending={payStatementOpen ? (statementData?.totals.pending ?? null) : null}
                targetAccountId={payingDue ? payingDue.account_id : statementAccountId}
                accounts={accounts.data ?? []}
                savingsTotal={savings.data ? Number(savings.data.total_amount) : null}
                onCancel={() => {
                    setPayingDue(null);
                    setPayStatementOpen(false);
                }}
                onSubmit={payingDue ? submitPayDue : submitPayStatement}
            />
            <ExpenseModal
                open={expenseModalOpen}
                accounts={accounts.data ?? []}
                categories={categories.data ?? []}
                onCategoriesChanged={categories.reload}
                editing={editingExpense}
                onCancel={() => {
                    setExpenseModalOpen(false);
                    setEditingExpense(null);
                }}
                onSubmit={submitEditExpense}
            />
        </div>
    );
}
