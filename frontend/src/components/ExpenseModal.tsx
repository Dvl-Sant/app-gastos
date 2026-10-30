import { useEffect, useMemo, useState } from 'react';
import { DatePicker, Form, Input, InputNumber, Modal, Segmented, Select } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import type { Account, Expense, ExpenseType } from '../types';

const CATEGORIES = [
    'Vivienda y Servicios',
    'Transporte',
    'Comida',
    'Entretenimiento',
    'Pago de Deudas',
    'Otro',
];

export interface ExpenseFormValues {
    account_id: number;
    name: string;
    category: string;
    expense_type: ExpenseType;
    monthly_payment?: number;
    total_amount?: number;
    installments?: number;
    due_day?: number;
    purchase_date?: Dayjs;
}

interface Props {
    open: boolean;
    accounts: Account[];
    editing: Expense | null;
    onCancel: () => void;
    onSubmit: (payload: Record<string, unknown>, editingId: number | null) => Promise<void>;
}

const typeLabels: Record<ExpenseType, string> = {
    recurrente: 'Recurrente',
    unico: 'Único',
    msi: 'A meses (MSI)',
};

export default function ExpenseModal({ open, accounts, editing, onCancel, onSubmit }: Props) {
    const [form] = Form.useForm<ExpenseFormValues>();
    const [type, setType] = useState<ExpenseType>('recurrente');
    const [saving, setSaving] = useState(false);
    const [accountId, setAccountId] = useState<number | undefined>();

    const selectedAccount = useMemo(
        () => accounts.find((a) => a.id === accountId),
        [accounts, accountId]
    );
    const creditAccounts = accounts.filter((a) => a.type === 'credito');

    useEffect(() => {
        if (!open) return;
        if (editing) {
            form.setFieldsValue({
                account_id: editing.account_id,
                name: editing.name,
                category: editing.category ?? undefined,
                expense_type: editing.expense_type,
                monthly_payment: Number(editing.monthly_payment),
                total_amount: Number(editing.total_amount),
                installments: editing.installments ?? undefined,
                due_day: editing.due_day ?? undefined,
                purchase_date: editing.purchase_date ? dayjs(editing.purchase_date) : undefined,
            });
            setType(editing.expense_type);
            setAccountId(editing.account_id);
        } else {
            form.resetFields();
            setType('recurrente');
            setAccountId(undefined);
        }
    }, [open, editing, form]);

    const handleOk = async () => {
        const values = await form.validateFields();
        setSaving(true);
        try {
            const base: Record<string, unknown> = {
                account_id: values.account_id,
                name: values.name,
                category: values.category,
                expense_type: type,
                purchase_date: values.purchase_date ? values.purchase_date.format('YYYY-MM-DD') : undefined,
            };
            if (type === 'recurrente') {
                Object.assign(base, { monthly_payment: values.monthly_payment, due_day: values.due_day });
            } else if (type === 'unico') {
                Object.assign(base, { total_amount: values.total_amount });
            } else {
                Object.assign(base, { total_amount: values.total_amount, installments: values.installments });
            }
            await onSubmit(base, editing?.id ?? null);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal
            open={open}
            onCancel={onCancel}
            onOk={handleOk}
            confirmLoading={saving}
            title={editing ? 'Editar Gasto' : 'Agregar Nuevo Gasto'}
            okText="Guardar"
            cancelText="Cancelar"
            centered
            destroyOnClose
        >
            {editing && (
                <p className="text-xs text-slate-500 bg-amber-50 rounded-lg p-3 mt-4">
                    Al guardar, las mensualidades <b>no pagadas</b> se regeneran con los nuevos valores; las pagadas y
                    su historial se conservan.
                </p>
            )}
            <Form form={form} layout="vertical" className="mt-4" requiredMark={false}>
                <Form.Item label="Tipo de gasto" className="mb-4">
                    <Segmented
                        block
                        value={type}
                        onChange={(v) => setType(v as ExpenseType)}
                        disabled={Boolean(editing)}
                        options={(Object.keys(typeLabels) as ExpenseType[]).map((t) => ({
                            label: typeLabels[t],
                            value: t,
                            disabled: !editing && t === 'msi' && creditAccounts.length === 0,
                        }))}
                    />
                </Form.Item>

                <Form.Item
                    name="account_id"
                    label="Cuenta / Tarjeta"
                    rules={[{ required: true, message: 'Selecciona la cuenta' }]}
                    extra={editing ? 'La cuenta no se puede cambiar al editar; elimina y vuelve a crear si lo necesitas.' : undefined}
                >
                    <Select
                        placeholder="¿Dónde se carga este gasto?"
                        onChange={(v: number) => setAccountId(v)}
                        disabled={Boolean(editing)}
                        options={accounts.map((a) => ({
                            value: a.id,
                            label: `${a.name} (${a.type === 'credito' ? `Crédito, corte día ${a.cut_off_day}` : a.type === 'debito' ? 'Débito' : 'Efectivo'})`,
                            disabled: !editing && type === 'msi' && a.type !== 'credito',
                        }))}
                    />
                </Form.Item>

                <Form.Item
                    name="name"
                    label="Nombre del concepto"
                    rules={[{ required: true, message: 'Ingresa el nombre del concepto' }]}
                >
                    <Input placeholder="Ej. Préstamo del auto" />
                </Form.Item>

                {type === 'recurrente' && (
                    <div className="grid grid-cols-2 gap-4">
                        <Form.Item
                            name="due_day"
                            label="Día de vencimiento"
                            rules={[{ required: true, message: 'Día 1-28' }]}
                        >
                            <InputNumber min={1} max={28} className="!w-full" placeholder="1-28" />
                        </Form.Item>
                        <Form.Item
                            name="monthly_payment"
                            label="Pago Mensual"
                            rules={[{ required: true, message: 'Ingresa el monto' }]}
                        >
                            <InputNumber min={0.01} step={0.01} className="!w-full !text-danger !font-semibold" placeholder="0.00" />
                        </Form.Item>
                    </div>
                )}

                {(type === 'unico' || type === 'msi') && (
                    <div className="grid grid-cols-2 gap-4">
                        <Form.Item
                            name="total_amount"
                            label="Monto Total"
                            rules={[{ required: true, message: 'Ingresa el monto' }]}
                        >
                            <InputNumber min={0.01} step={0.01} className="!w-full !text-danger !font-semibold" placeholder="0.00" />
                        </Form.Item>
                        {type === 'msi' ? (
                            <Form.Item
                                name="installments"
                                label="Mensualidades"
                                rules={[{ required: true, message: '¿A cuántos meses?' }]}
                            >
                                <InputNumber min={1} max={60} className="!w-full" placeholder="Ej. 3" />
                            </Form.Item>
                        ) : (
                            <Form.Item name="purchase_date" label="Fecha">
                                <DatePicker className="!w-full" format="DD/MM/YYYY" />
                            </Form.Item>
                        )}
                    </div>
                )}

                {type === 'msi' && (
                    <Form.Item name="purchase_date" label="Fecha de compra" rules={[{ required: true, message: 'Selecciona la fecha' }]}>
                        <DatePicker className="!w-full" format="DD/MM/YYYY" />
                    </Form.Item>
                )}

                <Form.Item
                    name="category"
                    label="Categoría"
                    rules={[{ required: true, message: 'Selecciona una categoría' }]}
                >
                    <Select options={CATEGORIES.map((c) => ({ value: c, label: c }))} placeholder="Selecciona" />
                </Form.Item>

                {type === 'unico' && selectedAccount?.type === 'credito' && (
                    <p className="text-xs text-slate-500 bg-blue-50 rounded-lg p-3">
                        En tarjeta: este gasto entra al estado de cuenta del corte día {selectedAccount.cut_off_day} y
                        vence el día límite de pago ({selectedAccount.payment_due_day ?? selectedAccount.cut_off_day}).
                    </p>
                )}
                {type === 'msi' && selectedAccount && (
                    <p className="text-xs text-slate-500 bg-blue-50 rounded-lg p-3">
                        Se generarán {form.getFieldValue('installments') ?? 'N'} mensualidades de aproximadamente{' '}
                        <b>{form.getFieldValue('total_amount') ? (Number(form.getFieldValue('total_amount') || 0) / (form.getFieldValue('installments') || 1)).toFixed(2) : '—'}</b>{' '}
                        venciendo el día límite de pago ({selectedAccount.payment_due_day ?? selectedAccount.cut_off_day})
                        de {selectedAccount.name}, una por cada ciclo de corte.
                    </p>
                )}
            </Form>
        </Modal>
    );
}
