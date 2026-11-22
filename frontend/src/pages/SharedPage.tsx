import { useState } from 'react';
import { Alert, App as AntApp, Button, Drawer, Popconfirm, Skeleton, Tag } from 'antd';
import { motion } from 'framer-motion';
import { Banknote, Pencil, Plus, Trash2, Users } from 'lucide-react';
import AppHeader from '../components/AppHeader';
import SharedGroupModal from '../components/SharedGroupModal';
import SharedMemberModal from '../components/SharedMemberModal';
import SharedPayModal from '../components/SharedPayModal';
import { api, useFetch } from '../hooks/useFetch';
import type { SharedGroup, SharedMemberRow } from '../types';
import { formatCurrency } from '../utils/format';

const statusMeta: Record<string, { label: string; color: string }> = {
    pagado: { label: 'Pagado', color: 'green' },
    por_vencer: { label: 'Por vencer', color: 'orange' },
    pendiente: { label: 'Pendiente', color: 'red' },
    adelantado: { label: 'Adelantado', color: 'blue' },
};

export default function SharedPage() {
    const { message, modal } = AntApp.useApp();
    const alerts = useFetch(api.shared.summary);

    const [detailId, setDetailId] = useState<number | null>(null);
    const detail = useFetch(
        () => (detailId ? api.shared.groups.detail(detailId) : Promise.resolve(null)),
        [detailId]
    );

    const [groupModalOpen, setGroupModalOpen] = useState(false);
    const [editingGroup, setEditingGroup] = useState<SharedGroup | null>(null);
    const [memberModalOpen, setMemberModalOpen] = useState(false);
    const [editingMember, setEditingMember] = useState<SharedMemberRow | null>(null);
    const [payMember, setPayMember] = useState<SharedMemberRow | null>(null);

    const refresh = async () => {
        await alerts.reload();
        await detail.reload();
    };

    const handleError = (e: unknown) => message.error(e instanceof Error ? e.message : 'Error inesperado');

    const submitGroup = async (payload: Record<string, unknown>, editingId: number | null) => {
        try {
            if (editingId) {
                await api.shared.groups.update(editingId, payload);
                message.success('Grupo actualizado');
            } else {
                await api.shared.groups.create(payload);
                message.success('Grupo creado');
            }
            setGroupModalOpen(false);
            setEditingGroup(null);
            await refresh();
        } catch (e) {
            handleError(e);
        }
    };

    const deleteGroup = (group: SharedGroup) => {
        modal.confirm({
            title: `¿Eliminar "${group.name}"?`,
            content: 'Se eliminan sus miembros y el registro de sus pagos. Esta acción no se puede deshacer.',
            okText: 'Sí, eliminar',
            cancelText: 'Cancelar',
            okButtonProps: { danger: true },
            onOk: async () => {
                try {
                    await api.shared.groups.remove(group.id);
                    message.success('Grupo eliminado');
                    if (detailId === group.id) setDetailId(null);
                    await alerts.reload();
                } catch (e) {
                    handleError(e);
                }
            },
        });
    };

    const submitMember = async (values: { name: string; note?: string }) => {
        if (!detailId) return;
        try {
            if (editingMember) {
                await api.shared.members.update(editingMember.id, values);
                message.success('Miembro actualizado');
            } else {
                await api.shared.members.create(detailId, values);
                message.success('Miembro agregado');
            }
            setMemberModalOpen(false);
            setEditingMember(null);
            await refresh();
        } catch (e) {
            handleError(e);
        }
    };

    const deleteMember = (member: SharedMemberRow) => {
        modal.confirm({
            title: `¿Eliminar a "${member.name}"?`,
            content: 'Se elimina junto con el registro de sus pagos en este grupo.',
            okText: 'Sí, eliminar',
            cancelText: 'Cancelar',
            okButtonProps: { danger: true },
            onOk: async () => {
                try {
                    await api.shared.members.remove(member.id);
                    message.success('Miembro eliminado');
                    await refresh();
                } catch (e) {
                    handleError(e);
                }
            },
        });
    };

    const submitPay = async (values: { months: number; amount?: number; note?: string }) => {
        if (!payMember) return;
        try {
            const result = await api.shared.pay(payMember.id, values);
            message.success(`Pago registrado: ${formatCurrency(result.total)} acreditados a Efectivo`);
            setPayMember(null);
            await refresh();
        } catch (e) {
            handleError(e);
        }
    };

    const deletePayment = (paymentId: number) => {
        modal.confirm({
            title: '¿Eliminar este pago registrado?',
            content: 'Se revierte el abono que se hizo a tu cuenta Efectivo.',
            okText: 'Sí, eliminar',
            cancelText: 'Cancelar',
            okButtonProps: { danger: true },
            onOk: async () => {
                try {
                    await api.shared.removePayment(paymentId);
                    message.success('Pago eliminado');
                    await refresh();
                } catch (e) {
                    handleError(e);
                }
            },
        });
    };

    const detailData = detail.data;
    const statusTag = (status: string, advanceUntil: string | null) => {
        const meta = statusMeta[status] ?? { label: status, color: 'default' };
        return (
            <Tag color={meta.color} className="!m-0 !text-[11px] !font-bold">
                {status === 'adelantado' && advanceUntil ? `Adelantado hasta ${advanceUntil}` : meta.label}
            </Tag>
        );
    };

    return (
        <div className="flex flex-col min-h-screen bg-background-light">
            <AppHeader icon={<Users className="text-primary w-5 h-5" />} subtitle="Suscripciones" title="Gastos Compartidos" />

            <main className="flex-1 px-4 py-6 space-y-6 max-w-5xl w-full mx-auto">
                {alerts.error && <Alert type="error" showIcon message={alerts.error} />}

                <div className="flex items-center justify-between flex-wrap gap-3">
                    <p className="text-sm text-slate-500">
                        Registra a quien te paga una parte de tus suscripciones y lleva el control mensual (incluso pagos adelantados).
                    </p>
                    <Button
                        type="primary"
                        icon={<Plus className="w-4 h-4" />}
                        onClick={() => {
                            setEditingGroup(null);
                            setGroupModalOpen(true);
                        }}
                        className="!rounded-full !font-bold"
                    >
                        Nuevo Grupo
                    </Button>
                </div>

                {alerts.loading ? (
                    <Skeleton active paragraph={{ rows: 4 }} />
                ) : (alerts.data ?? []).length === 0 ? (
                    <Alert type="info" showIcon message="Aún no tienes grupos compartidos." description="Crea uno para llevar el control de cuánto te pagan tus familiares o amigos." />
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {(alerts.data ?? []).map((group, i) => {
                            const allPaid = group.pending.length === 0 && group.active_members > 0;
                            return (
                                <motion.div
                                    key={group.id}
                                    initial={{ opacity: 0, y: 12 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.05, duration: 0.3 }}
                                    whileHover={{ scale: 1.02 }}
                                    className="bg-white rounded-xl border border-border-subtle shadow-sm p-4 cursor-pointer"
                                    onClick={() => setDetailId(group.id)}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="font-bold text-slate-900 flex items-center gap-2">
                                            <Users className="w-4 h-4 text-primary" />
                                            {group.name}
                                        </span>
                                        <Tag color={allPaid ? 'green' : 'red'} className="!m-0 !text-[11px] !font-bold">
                                            {group.paid_count}/{group.active_members} pagaron
                                        </Tag>
                                    </div>
                                    <div className="mt-3 text-xs space-y-1">
                                        <p className="text-slate-500">
                                            Cuota: <b className="text-success">{formatCurrency(group.member_cuota)}</b>
                                            {group.due_day ? ` • cobra día ${group.due_day}` : ''}
                                            {group.total_cost ? ` • tu costo: ${formatCurrency(group.total_cost)}` : ''}
                                        </p>
                                        <p>
                                            Recibido este mes:{' '}
                                            <b className={group.collected >= group.expected ? 'text-success' : 'text-danger'}>
                                                {formatCurrency(group.collected)}
                                            </b>
                                            {group.expected > 0 && <span className="text-slate-400"> / {formatCurrency(group.expected)}</span>}
                                        </p>
                                        {group.pending.length > 0 && (
                                            <p className="text-danger font-semibold">
                                                Deben: {group.pending.map((p) => p.name).join(', ')}
                                            </p>
                                        )}
                                        {group.advance.length > 0 && (
                                            <p className="text-blue-500 font-semibold">
                                                Adelantados: {group.advance.map((a) => `${a.name} (hasta ${a.until})`).join(', ')}
                                            </p>
                                        )}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </main>

            {/* Detalle del grupo */}
            <Drawer
                title={detailData ? `Grupo — ${detailData.group.name}` : 'Grupo'}
                placement="right"
                width={620}
                open={detailId !== null}
                onClose={() => setDetailId(null)}
                destroyOnClose
                extra={
                    detailData && (
                        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                            <Button
                                size="small"
                                type="text"
                                icon={<Pencil className="w-3.5 h-3.5" />}
                                onClick={() => {
                                    setEditingGroup(detailData.group);
                                    setGroupModalOpen(true);
                                }}
                            />
                            <Popconfirm
                                title="¿Eliminar grupo?"
                                description="Se eliminan miembros y sus pagos registrados."
                                okText="Eliminar"
                                cancelText="Cancelar"
                                okButtonProps={{ danger: true }}
                                onConfirm={() => deleteGroup(detailData.group)}
                            >
                                <Button size="small" type="text" danger icon={<Trash2 className="w-3.5 h-3.5" />} />
                            </Popconfirm>
                        </div>
                    )
                }
            >
                {detail.loading ? (
                    <Skeleton active paragraph={{ rows: 8 }} />
                ) : detailData ? (
                    <div className="space-y-5">
                        <div className="flex items-center justify-between">
                            <p className="text-xs text-slate-500 font-semibold">
                                Cuota: {formatCurrency(detailData.group.member_cuota)} • Miembros activos:{' '}
                                {detailData.members.filter((m) => m.active).length}
                            </p>
                            <Button
                                size="small"
                                icon={<Plus className="w-3.5 h-3.5" />}
                                onClick={() => {
                                    setEditingMember(null);
                                    setMemberModalOpen(true);
                                }}
                            >
                                Miembro
                            </Button>
                        </div>

                        <div className="space-y-2">
                            {detailData.members.map((member) => (
                                <div key={member.id} className="flex items-center justify-between bg-white border border-border-subtle rounded-xl px-4 py-3">
                                    <div className="min-w-0">
                                        <p className="font-bold text-slate-900">{member.name}</p>
                                        <p className="text-[11px] text-slate-400">
                                            Total aportado: {formatCurrency(member.total_paid)}
                                            {member.last_payment_at
                                                ? ` • último: ${new Date(member.last_payment_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}`
                                                : ''}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                        {statusTag(member.status, member.advance_until)}
                                        <button
                                            onClick={() => setPayMember(member)}
                                            className="text-success mx-1 hover:opacity-70"
                                            title="Registrar pago"
                                        >
                                            <Banknote className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => {
                                                setEditingMember(member);
                                                setMemberModalOpen(true);
                                            }}
                                            className="text-primary mx-1 hover:opacity-70"
                                            title="Editar miembro"
                                        >
                                            <Pencil className="w-4 h-4" />
                                        </button>
                                        <Popconfirm
                                            title={`¿Eliminar a "${member.name}"?`}
                                            okText="Eliminar"
                                            cancelText="Cancelar"
                                            okButtonProps={{ danger: true }}
                                            onConfirm={() => deleteMember(member)}
                                        >
                                            <button className="text-danger mx-1 hover:opacity-70" title="Eliminar miembro">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </Popconfirm>
                                    </div>
                                </div>
                            ))}
                            {detailData.members.length === 0 && (
                                <p className="text-slate-500 italic text-center py-4">Sin miembros todavía.</p>
                            )}
                        </div>

                        <div>
                            <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-3">Pagos recientes</h4>
                            <div className="space-y-2">
                                {detailData.recent_payments.length === 0 ? (
                                    <p className="text-slate-500 italic text-center py-2">Sin pagos registrados.</p>
                                ) : (
                                    detailData.recent_payments.map((p) => (
                                        <div key={p.id} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2 text-sm">
                                            <div>
                                                <span className="font-bold text-slate-900">{p.member_name}</span>
                                                <span className="text-slate-400 text-xs ml-2">periodo {p.period}</span>
                                                {p.note && <span className="text-slate-400 text-xs ml-2">• {p.note}</span>}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-success font-bold">+{formatCurrency(p.amount)}</span>
                                                <button onClick={() => deletePayment(p.id)} className="text-danger hover:opacity-70" title="Eliminar pago">
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <Alert type="info" message="Selecciona un grupo" />
                )}
            </Drawer>

            <SharedGroupModal
                open={groupModalOpen}
                editing={editingGroup}
                onCancel={() => {
                    setGroupModalOpen(false);
                    setEditingGroup(null);
                }}
                onSubmit={submitGroup}
            />
            <SharedMemberModal
                open={memberModalOpen}
                editing={editingMember}
                onCancel={() => {
                    setMemberModalOpen(false);
                    setEditingMember(null);
                }}
                onSubmit={submitMember}
            />
            <SharedPayModal
                open={payMember !== null}
                member={payMember}
                group={detailData?.group ?? null}
                onCancel={() => setPayMember(null)}
                onSubmit={submitPay}
            />
        </div>
    );
}
