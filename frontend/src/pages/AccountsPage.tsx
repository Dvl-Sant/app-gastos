import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Alert, App as AntApp, Button, Drawer, Popconfirm, Skeleton, Statistic, Tag } from 'antd';
import { motion } from 'framer-motion';
import { CreditCard, Pencil, Plus, Trash2, Wallet } from 'lucide-react';
import AppHeader from '../components/AppHeader';
import DuesTable from '../components/DuesTable';
import AccountModal from '../components/AccountModal';
import PaymentModal from '../components/PaymentModal';
import type { PaymentSourceInput } from '../hooks/useFetch';
import { api, useFetch } from '../hooks/useFetch';
import type { Account, Due } from '../types';
import { formatCurrency } from '../utils/format';

const typeMeta: Record<string, { label: string; badge: string }> = {
    credito: { label: 'Crédito', badge: 'bg-purple-50 text-purple-600' },
    debito: { label: 'Débito', badge: 'bg-blue-50 text-blue-600' },
    efectivo: { label: 'Efectivo', badge: 'bg-green-50 text-green-600' },
};

export default function AccountsPage() {
    const { message } = AntApp.useApp();
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

    const statementData = statement.data;

    return (
        <div className="flex flex-col min-h-screen bg-background-light">
            <AppHeader icon={<Wallet className="text-primary w-5 h-5" />} subtitle="Finanzas" title="Cuentas y Tarjetas" />

            <main className="flex-1 px-4 py-6 space-y-6 max-w-5xl w-full mx-auto">
                {accounts.error && <Alert type="error" showIcon message={accounts.error} />}

                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-800">Todas mis cuentas</h3>
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

                {accounts.loading ? (
                    <Skeleton active paragraph={{ rows: 4 }} />
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {(accounts.data ?? []).map((account, i) => (
                            <motion.div
                                key={account.id}
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05, duration: 0.3 }}
                                whileHover={{ scale: 1.02 }}
                                className="bg-white rounded-xl border border-border-subtle shadow-sm p-4 cursor-pointer"
                                onClick={() => setStatementAccountId(account.id)}
                            >
                                <div className="flex items-center justify-between">
                                    <span className="font-bold text-slate-900 flex items-center gap-2">
                                        <CreditCard className="w-4 h-4 text-primary" />
                                        {account.name}
                                    </span>
                                    <Tag color={account.type === 'credito' ? 'purple' : account.type === 'debito' ? 'blue' : 'green'} className="!m-0 uppercase !text-[10px] !font-bold">
                                        {typeMeta[account.type]?.label ?? account.type}
                                    </Tag>
                                </div>

                                {account.type === 'credito' ? (
                                    <>
                                        <div className="mt-3">
                                            <p className="text-[10px] text-slate-500 font-bold uppercase">Deuda pendiente total</p>
                                            <p className="text-xl font-extrabold text-danger">{formatCurrency(account.pending_debt ?? 0)}</p>
                                        </div>
                                        <p className="text-[11px] text-slate-400 mt-2 font-semibold">
                                            Corte día {account.cut_off_day}
                                            {account.payment_due_day ? ` • Pago límite día ${account.payment_due_day}` : ''}
                                        </p>
                                    </>
                                ) : (
                                    <div className="mt-3">
                                        <p className="text-[10px] text-slate-500 font-bold uppercase">Saldo</p>
                                        <p className="text-xl font-extrabold text-success">{formatCurrency(account.balance)}</p>
                                    </div>
                                )}

                                <div className="mt-3 flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                                    <Button
                                        size="small"
                                        type="text"
                                        icon={<Pencil className="w-3.5 h-3.5" />}
                                        onClick={() => {
                                            setEditingAccount(account);
                                            setAccountModalOpen(true);
                                        }}
                                    />
                                    <Popconfirm
                                        title="¿Eliminar cuenta?"
                                        description="Se borran también sus gastos y mensualidades."
                                        okText="Eliminar"
                                        cancelText="Cancelar"
                                        okButtonProps={{ danger: true }}
                                        onConfirm={() => deleteAccount(account)}
                                    >
                                        <Button size="small" type="text" danger icon={<Trash2 className="w-3.5 h-3.5" />} />
                                    </Popconfirm>
                                </div>
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
        </div>
    );
}
