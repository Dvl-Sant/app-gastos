import { useState } from 'react';
import { Alert, App as AntApp, Button, Empty, Input, Modal, Popconfirm, Progress, Skeleton, Tag } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { motion } from 'framer-motion';
import { Banknote, HandCoins, Pencil, Plus, Trash2 } from 'lucide-react';
import AppHeader from '../components/AppHeader';
import LoanModal from '../components/LoanModal';
import LoanPayModal from '../components/LoanPayModal';
import { api, useFetch } from '../hooks/useFetch';
import type { Loan, LoanPaymentEntry } from '../types';
import { formatCurrency } from '../utils/format';

const freqLabels: Record<string, string> = {
    semanal: 'cada semana',
    quincenal: 'cada 15 días',
    mensual: 'cada mes',
};

export default function LoansPage() {
    const { message, modal } = AntApp.useApp();
    const loans = useFetch(api.loans.list);
    const accounts = useFetch(api.accounts.list);

    const [createOpen, setCreateOpen] = useState(false);
    const [payLoan, setPayLoan] = useState<Loan | null>(null);
    const [detailLoan, setDetailLoan] = useState<Loan | null>(null);
    const [editingPayment, setEditingPayment] = useState<LoanPaymentEntry | null>(null);
    const [editingLoan, setEditingLoan] = useState<Loan | null>(null);
    const [editAmount, setEditAmount] = useState<number | null>(null);
    const [editDate, setEditDate] = useState<Dayjs | null>(null);
    const [editNote, setEditNote] = useState<string | null>(null);

    const handleError = (e: unknown) => message.error(e instanceof Error ? e.message : 'Error inesperado');
    const refresh = async () => {
        await loans.reload();
        await accounts.reload();
    };

    const openDetail = (loanId: number) => {
        const loan = (loans.data ?? []).find((l) => l.id === loanId);
        setDetailLoan(loan ?? null);
    };

    const submitCreate = async (values: Record<string, unknown>) => {
        try {
            await api.loans.create(values as Parameters<typeof api.loans.create>[0]);
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

    const submitEditPayment = async (values: { amount: number; account_id?: number; note?: string; paid_at?: string }) => {
        if (!editingPayment) return;
        try {
            await api.loans.updatePayment(editingPayment.id, values);
            message.success('Abono actualizado');
            setEditingPayment(null);
            await refresh();
        } catch (e) {
            handleError(e);
        }
    };

    const deletePayment = async (p: LoanPaymentEntry) => {
        try {
            const r = await api.loans.removePayment(p.id);
            message.success(`Abono de ${formatCurrency(r.amount)} eliminado`);
            await refresh();
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
                    if (detailLoan?.id === loan.id) setDetailLoan(null);
                    await loans.reload();
                } catch (e) {
                    handleError(e);
                }
            },
        });
    };

    const submitEditLoan = async (values: { person_name?: string; concept?: string; comments?: string }) => {
        if (!detailLoan) return;
        try {
            await api.loans.update(detailLoan.id, values);
            message.success('Préstamo actualizado');
            await loans.reload();
        } catch (e) {
            handleError(e);
        }
    };

    const detail = detailLoan ? (loans.data ?? []).find((l) => l.id === detailLoan.id) ?? detailLoan : null;
    const nextBadge = (loan: Loan) => {
        if (!loan.payment_frequency || loan.status === 'liquidado' || !loan.next_expected_date) return null;
        const days = loan.days_until_next ?? 0;
        const dateStr = new Date(`${loan.next_expected_date}T12:00:00`).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
        return (
            <Tag color={days < 0 ? 'red' : days <= 3 ? 'orange' : 'blue'} className="!m-0 !text-[10px] !font-bold whitespace-nowrap">
                {days < 0
                    ? `Cobro vencido hace ${Math.abs(days)}d (${dateStr})`
                    : days === 0
                        ? `Cobrar hoy (${dateStr})`
                        : `Cobrar en ${days}d (${dateStr})`}
            </Tag>
        );
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
                                    whileHover={{ scale: 1.01 }}
                                    onClick={() => openDetail(loan.id)}
                                    className="bg-white rounded-xl border border-border-subtle shadow-sm p-4 cursor-pointer"
                                >
                                    <div className="flex items-start justify-between gap-3 flex-wrap">
                                        <div className="min-w-0">
                                            <p className="font-bold text-slate-900">
                                                {loan.person_name} <span className="text-slate-400 font-medium">• {loan.concept}</span>
                                            </p>
                                            <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                                                {new Date(`${loan.loan_date}T12:00:00`).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                {loan.account_name ? ` • salió de ${loan.account_name}` : ''}
                                                {loan.payment_frequency ? ` • abonos ${freqLabels[loan.payment_frequency]}` : ''}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                                            {nextBadge(loan)}
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
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </main>

            {/* Detalle del préstamo */}
            <Modal
                open={detailLoan !== null}
                onCancel={() => setDetailLoan(null)}
                footer={null}
                title={detail ? `Préstamo — ${detail.person_name}` : 'Préstamo'}
                centered
                width="min(560px, 100%)"
                destroyOnClose
            >
                {detail && (
                    <div className="space-y-5 mt-2">
                        <div>
                            <div className="flex items-center justify-between">
                                <Button size="small" icon={<Pencil className="w-3 h-3" />} onClick={() => setEditingLoan(detail)}>Editar datos</Button>
                            </div>
                            {editingLoan && (
                                <div className="space-y-2 my-2 bg-slate-50 rounded-lg p-3">
                                    <Input value={editingLoan.person_name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditingLoan({ ...editingLoan, person_name: e.target.value })} placeholder="Persona" />
                                    <Input value={editingLoan.concept} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditingLoan({ ...editingLoan, concept: e.target.value })} placeholder="Concepto" />
                                    <Input.TextArea value={editingLoan.comments ?? ''} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setEditingLoan({ ...editingLoan, comments: e.target.value })} placeholder="Comentarios" rows={2} />
                                    <Button size="small" type="primary" onClick={() => submitEditLoan({ person_name: editingLoan.person_name, concept: editingLoan.concept, comments: editingLoan.comments ?? undefined })}>Guardar cambios</Button>
                                </div>
                            )}
                            <p className="text-sm mt-2"><b>Concepto:</b> {detail.concept}</p>
                            <p className="text-sm"><b>Monto:</b> {formatCurrency(detail.amount)}</p>
                            <p className="text-sm">
                                <b>Fecha:</b>{' '}
                                {new Date(`${detail.loan_date}T12:00:00`).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                                {detail.account_name ? ` • salió de ${detail.account_name}` : ''}
                            </p>
                            {detail.comments && <p className="text-sm"><b>Comentarios:</b> {detail.comments}</p>}
                            {detail.payment_frequency && (
                                <p className="text-sm">
                                    <b>Abonos:</b> {freqLabels[detail.payment_frequency] ?? detail.payment_frequency}
                                </p>
                            )}
                        </div>

                        <div>
                            <div className="flex items-center justify-between text-[11px] font-semibold mb-1">
                                <span className="text-slate-500">
                                    Abonado {formatCurrency(Number(detail.paid_amount ?? 0))} de {formatCurrency(detail.amount)}
                                </span>
                                <span className={detail.status === 'liquidado' ? 'text-success' : 'text-danger'}>{pctOf(detail)}%</span>
                            </div>
                            <Progress percent={pctOf(detail)} showInfo={false} strokeColor={detail.status === 'liquidado' ? '#10b981' : '#1772da'} size={['100%', 8]} />
                            {detail.next_expected_date && (
                                <p className="mt-2">
                                    {nextBadge(detail)}
                                    <span className="text-[11px] text-slate-400 ml-2">próximo abono esperado</span>
                                </p>
                            )}
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <h4 className="text-sm font-bold uppercase tracking-wide text-slate-500">Abonos ({(detail.payments ?? []).length})</h4>
                                <Button
                                    size="small"
                                    type="primary"
                                    ghost
                                    icon={<Plus className="w-3 h-3" />}
                                    disabled={detail.status === 'liquidado'}
                                    onClick={() => setPayLoan(detail)}
                                >
                                    Registrar abono
                                </Button>
                            </div>
                            {(detail.payments ?? []).length === 0 ? (
                                <p className="text-slate-500 italic text-sm py-2">Sin abonos registrados.</p>
                            ) : (
                                <div className="space-y-1.5">
                                    {(detail.payments ?? []).map((p) => (
                                        <div key={p.id} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2 text-sm">
                                            <div className="min-w-0">
                                                <span className="font-bold text-slate-900">{formatCurrency(p.amount)}</span>
                                                <span className="text-slate-400 text-xs ml-2">
                                                    {new Date(p.paid_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                                                </span>
                                                {p.note && <span className="text-slate-400 text-xs ml-2">• {p.note}</span>}
                                                {p.account_name && <span className="text-slate-400 text-xs ml-2">• entró a {p.account_name}</span>}
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <button
                                                    onClick={() => setEditingPayment(p)}
                                                    className="text-primary hover:opacity-70"
                                                    title="Editar abono"
                                                >
                                                    <Pencil className="w-3.5 h-3.5" />
                                                </button>
                                                <Popconfirm
                                                    title="¿Eliminar abono?"
                                                    description="Se revierte el dinero que había entrado a la cuenta."
                                                    okText="Eliminar"
                                                    cancelText="Cancelar"
                                                    okButtonProps={{ danger: true }}
                                                    onConfirm={() => deletePayment(p)}
                                                >
                                                    <button className="text-danger hover:opacity-70" title="Eliminar abono">
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </Popconfirm>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </Modal>

            {/* Editar abono */}
            <Modal
                open={editingPayment !== null}
                title="Editar abono"
                okText="Guardar"
                cancelText="Cancelar"
                centered
                destroyOnClose
                onCancel={() => setEditingPayment(null)}
                onOk={() => {
                    if (!editingPayment) return;
                    return submitEditPayment({
                        amount: editAmount === null ? Number(editingPayment.amount) : editAmount,
                        paid_at: editDate ? editDate.format('YYYY-MM-DD') : undefined,
                        note: editNote ?? undefined,
                    });
                }}
            >
                <div className="space-y-3 mt-4">
                    <div>
                        <label className="text-xs font-bold uppercase text-slate-500">Monto</label>
                        <Input
                            type="number"
                            value={editAmount ?? undefined}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditAmount(e.target.value === '' ? null : Number(e.target.value))}
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold uppercase text-slate-500">Fecha del abono</label>
                        <Input type="date" value={editDate ? editDate.format('YYYY-MM-DD') : ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditDate(e.target.value ? dayjs(e.target.value) : null)} />
                    </div>
                    <div>
                        <label className="text-xs font-bold uppercase text-slate-500">Nota</label>
                        <Input value={editNote ?? ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditNote(e.target.value)} />
                    </div>
                    <p className="text-[11px] text-slate-400">Si el abono entró a una cuenta, el saldo se corrige automáticamente.</p>
                </div>
            </Modal>

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
        </div>
    );
}

function pctOf(loan: Loan): number {
    const amount = Number(loan.amount);
    if (amount <= 0) return 0;
    return Math.min(100, Math.round((Number(loan.paid_amount ?? 0) / amount) * 100));
}
