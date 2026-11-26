import { useState } from 'react';
import { Alert, App as AntApp, Button, Empty, Input, Modal, Popconfirm, Progress, Skeleton, Tag } from 'antd';
import { motion } from 'framer-motion';
import { Banknote, HandCoins, Pencil, Plus, Trash2 } from 'lucide-react';
import AppHeader from '../components/AppHeader';
import LoanModal from '../components/LoanModal';
import LoanPayModal from '../components/LoanPayModal';
import { api, useFetch } from '../hooks/useFetch';
import type { Loan } from '../types';
import { formatCurrency } from '../utils/format';

export default function LoansPage() {
    const { message, modal } = AntApp.useApp();
    const loans = useFetch(api.loans.list);
    const accounts = useFetch(api.accounts.list);

    const [createOpen, setCreateOpen] = useState(false);
    const [payLoan, setPayLoan] = useState<Loan | null>(null);
    const [editingLoan, setEditingLoan] = useState<Loan | null>(null);
    const [editOpen, setEditOpen] = useState(false);

    const handleError = (e: unknown) => message.error(e instanceof Error ? e.message : 'Error inesperado');

    const submitCreate = async (values: { person_name: string; concept: string; amount: number; account_id?: number | null; loan_date?: string; comments?: string }) => {
        try {
            await api.loans.create(values);
            message.success('Préstamo registrado');
            setCreateOpen(false);
            await loans.reload();
            await accounts.reload();
        } catch (e) {
            handleError(e);
        }
    };

    const submitPay = async (values: { amount: number; account_id?: number; note?: string; paid_at?: string }) => {
        if (!payLoan) return;
        try {
            const result = await api.loans.pay(payLoan.id, values);
            message.success(`Abono registrado — pendiente: ${formatCurrency(result.remaining)}`);
            setPayLoan(null);
            await loans.reload();
            await accounts.reload();
        } catch (e) {
            handleError(e);
        }
    };

    const deleteLoan = (loan: Loan) => {
        modal.confirm({
            title: `¿Eliminar el préstamo de ${loan.person_name}?`,
            content: 'Se elimina junto con sus abonos registrados. Los movimientos de dinero ya hechos no se revierten.',
            okText: 'Sí, eliminar',
            cancelText: 'Cancelar',
            okButtonProps: { danger: true },
            onOk: async () => {
                try {
                    await api.loans.remove(loan.id);
                    message.success('Préstamo eliminado');
                    await loans.reload();
                } catch (e) {
                    handleError(e);
                }
            },
        });
    };

    const submitEdit = async (values: { person_name?: string; concept?: string; comments?: string }) => {
        if (!editingLoan) return;
        try {
            await api.loans.update(editingLoan.id, values);
            message.success('Préstamo actualizado');
            setEditOpen(false);
            setEditingLoan(null);
            await loans.reload();
        } catch (e) {
            handleError(e);
        }
    };

    return (
        <div className="flex flex-col min-h-screen bg-background-light">
            <AppHeader icon={<HandCoins className="text-primary w-5 h-5" />} subtitle="Confianza" title="Préstamos" />

            <main className="flex-1 px-4 py-6 space-y-6 max-w-5xl w-full mx-auto">
                {loans.error && <Alert type="error" showIcon message={loans.error} />}

                <div className="flex items-center justify-between flex-wrap gap-3">
                    <p className="text-sm text-slate-500">Registra el dinero que prestas y controla los abonos que recibes de cada persona.</p>
                    <Button
                        type="primary"
                        icon={<Plus className="w-4 h-4" />}
                        onClick={() => setCreateOpen(true)}
                        className="!rounded-full !font-bold"
                    >
                        Nuevo Préstamo
                    </Button>
                </div>

                {loans.loading ? (
                    <Skeleton active paragraph={{ rows: 5 }} />
                ) : (loans.data ?? []).length === 0 ? (
                    <Empty description="No tienes préstamos registrados." />
                ) : (
                    <div className="space-y-4">
                        {(loans.data ?? []).map((loan, i) => {
                            const paid = Number(loan.paid_amount ?? 0);
                            const amount = Number(loan.amount);
                            const remaining = Number(loan.remaining ?? 0);
                            const pct = amount > 0 ? Math.min(100, Math.round((paid / amount) * 100)) : 0;
                            const liquidado = loan.status === 'liquidado';
                            return (
                                <motion.div
                                    key={loan.id}
                                    initial={{ opacity: 0, y: 12 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.05, duration: 0.3 }}
                                    className="bg-white rounded-xl border border-border-subtle shadow-sm p-4"
                                >
                                    <div className="flex items-start justify-between gap-3 flex-wrap">
                                        <div>
                                            <p className="font-bold text-slate-900">
                                                {loan.person_name} <span className="text-slate-400 font-medium">• {loan.concept}</span>
                                            </p>
                                            <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                                                {new Date(`${loan.loan_date}T12:00:00`).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                {loan.account_name ? ` • salió de ${loan.account_name}` : ''}
                                                {loan.comments ? ` • ${loan.comments}` : ''}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <Tag color={liquidado ? 'green' : 'red'} className="!m-0 !text-[11px] !font-bold">
                                                {liquidado ? 'Liquidado' : `Pendiente ${formatCurrency(remaining)}`}
                                            </Tag>
                                            <Button
                                                size="small"
                                                type="primary"
                                                ghost
                                                icon={<Banknote className="w-3.5 h-3.5" />}
                                                disabled={liquidado}
                                                onClick={() => setPayLoan(loan)}
                                            >
                                                Abono
                                            </Button>
                                            <Button
                                                size="small"
                                                type="text"
                                                icon={<Pencil className="w-3.5 h-3.5" />}
                                                onClick={() => {
                                                    setEditingLoan(loan);
                                                    setEditOpen(true);
                                                }}
                                            />
                                                <Popconfirm
                                                    title={`¿Eliminar préstamo de ${loan.person_name}?`}
                                                    description="Se borra con sus abonos registrados. Los movimientos de dinero ya hechos no se revierten."
                                                    okText="Eliminar"
                                                    cancelText="Cancelar"
                                                    okButtonProps={{ danger: true }}
                                                    onConfirm={() => deleteLoan(loan)}
                                                >
                                                <Button size="small" type="text" danger icon={<Trash2 className="w-3.5 h-3.5" />} />
                                            </Popconfirm>
                                        </div>
                                    </div>

                                    <div className="mt-3">
                                        <div className="flex items-center justify-between text-[11px] font-semibold mb-1">
                                            <span className="text-slate-500">
                                                Abonado {formatCurrency(paid)} de {formatCurrency(amount)}
                                            </span>
                                            <span className={liquidado ? 'text-success' : 'text-danger'}>{pct}%</span>
                                        </div>
                                        <Progress percent={pct} showInfo={false} strokeColor={liquidado ? '#10b981' : '#1772da'} size={['100%', 8]} />
                                    </div>

                                    {(loan.payments ?? []).length > 0 && (
                                        <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5">
                                            {(loan.payments ?? []).map((p) => (
                                                <div key={p.id} className="flex items-center justify-between text-xs">
                                                    <span className="text-slate-500">
                                                        {new Date(p.paid_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                                                        {p.note ? ` • ${p.note}` : ''}
                                                        {p.account_name ? ` • entró a ${p.account_name}` : ''}
                                                    </span>
                                                    <span className="flex items-center gap-2">
                                                        <span className="text-success font-bold">+{formatCurrency(p.amount)}</span>
                                                        <Popconfirm title="¿Eliminar abono?" description="Se revierte el dinero que había entrado a la cuenta." okText="Eliminar" cancelText="Cancelar" okButtonProps={{ danger: true }}
                                                            onConfirm={async () => {
                                                                try {
                                                                    await api.loans.removePayment(p.id);
                                                                    message.success('Abono eliminado');
                                                                    await loans.reload();
                                                                    await accounts.reload();
                                                                } catch (e) {
                                                                    handleError(e);
                                                                }
                                                            }}
                                                        >
                                                            <button className="text-danger hover:opacity-70"><Trash2 className="w-3 h-3" /></button>
                                                        </Popconfirm>
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </main>

            <LoanModal
                open={createOpen}
                accounts={accounts.data ?? []}
                onCancel={() => setCreateOpen(false)}
                onSubmit={submitCreate}
            />
            <LoanPayModal
                open={payLoan !== null}
                loan={payLoan}
                accounts={accounts.data ?? []}
                onCancel={() => setPayLoan(null)}
                onSubmit={submitPay}
            />
            <Modal
                open={editOpen}
                title={`Editar préstamo — ${editingLoan?.person_name ?? ''}`}
                okText="Guardar"
                cancelText="Cancelar"
                onCancel={() => {
                    setEditOpen(false);
                    setEditingLoan(null);
                }}
                onOk={async () => {
                    const form = document.getElementById('loan-edit-form') as HTMLFormElement | null;
                    if (!form || !editingLoan) return;
                    const fd = new FormData(form);
                    await submitEdit({
                        person_name: String(fd.get('person_name') ?? ''),
                        concept: String(fd.get('concept') ?? ''),
                        comments: String(fd.get('comments') ?? ''),
                    });
                    setEditOpen(false);
                    setEditingLoan(null);
                }}
                destroyOnClose
            >
                <form id="loan-edit-form" className="space-y-3 mt-4">
                    <div>
                        <label className="text-xs font-bold uppercase text-slate-500">Persona</label>
                        <Input name="person_name" defaultValue={editingLoan?.person_name} />
                    </div>
                    <div>
                        <label className="text-xs font-bold uppercase text-slate-500">Concepto</label>
                        <Input name="concept" defaultValue={editingLoan?.concept} />
                    </div>
                    <div>
                        <label className="text-xs font-bold uppercase text-slate-500">Comentarios</label>
                        <Input.TextArea name="comments" defaultValue={editingLoan?.comments ?? ''} rows={2} />
                    </div>
                    <p className="text-[11px] text-slate-400">El monto no se edita para no descuadrar los abonos registrados.</p>
                </form>
            </Modal>
        </div>
    );
}
