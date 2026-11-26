import { useEffect, useState } from 'react';
import { DatePicker, Form, Input, InputNumber, Modal, Select } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import type { Account } from '../types';
import { formatCurrency } from '../utils/format';

export interface LoanFormValues {
    person_name: string;
    concept: string;
    amount: number;
    account_id?: number;
    loan_date?: Dayjs;
    payment_frequency?: string;
    comments?: string;
}

interface Props {
    open: boolean;
    accounts: Account[];
    onCancel: () => void;
    onSubmit: (values: { person_name: string; concept: string; amount: number; account_id?: number | null; loan_date?: string; comments?: string; payment_frequency?: string | null }) => Promise<void>;
}

/** Crear préstamo: persona, concepto, monto, cuenta de salida, fecha, frecuencia de abonos y notas. */
export default function LoanModal({ open, accounts, onCancel, onSubmit }: Props) {
    const [form] = Form.useForm<{ person_name: string; concept: string; amount: number; account_id?: number; loan_date?: Dayjs; payment_frequency?: string; comments?: string }>();
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!open) return;
        form.resetFields();
        form.setFieldsValue({ loan_date: dayjs(), account_id: undefined, payment_frequency: undefined });
    }, [open, form]);

    const handleOk = async () => {
        const values = await form.validateFields();
        setSaving(true);
        try {
            await onSubmit(
                {
                    person_name: values.person_name,
                    concept: values.concept,
                    amount: values.amount,
                    account_id: values.account_id ?? null,
                    loan_date: values.loan_date ? values.loan_date.format('YYYY-MM-DD') : undefined,
                    comments: values.comments,
                    payment_frequency: values.payment_frequency ?? null,
                },
            );
        } finally {
            setSaving(false);
        }
    };

    const outAccounts = accounts.filter((a) => a.type !== 'efectivo' || true);

    return (
        <Modal
            open={open}
            onCancel={onCancel}
            onOk={handleOk}
            confirmLoading={saving}
            title="Nuevo Préstamo"
            okText="Registrar Préstamo"
            cancelText="Cancelar"
            centered
            destroyOnClose
        >
            <Form form={form} layout="vertical" className="mt-4" requiredMark={false}>
                <div className="grid grid-cols-2 gap-4">
                    <Form.Item
                        name="person_name"
                        label="Persona"
                        rules={[{ required: true, message: '¿A quién le prestaste?' }]}
                    >
                        <Input placeholder="Ej. Ana" />
                    </Form.Item>
                    <Form.Item
                        name="concept"
                        label="Concepto"
                        rules={[{ required: true, message: '¿Para qué fue?' }]}
                    >
                        <Input placeholder="Ej. Emergencia médico" />
                    </Form.Item>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <Form.Item
                        name="amount"
                        label="Cantidad"
                        rules={[{ required: true, message: 'Ingresa el monto' }]}
                    >
                        <InputNumber min={0.01} step={0.01} className="!w-full !text-danger !font-semibold" placeholder="0.00" />
                    </Form.Item>
                    <Form.Item name="loan_date" label="Cuándo se hizo">
                        <DatePicker className="!w-full" format="DD/MM/YYYY" />
                    </Form.Item>
                </div>
                <Form.Item
                    name="account_id"
                    label="Salió de alguna cuenta? (opcional)"
                    extra="Si la eliges, el dinero se descuenta de esa tarjeta al registrar"
                >
                    <Select
                        allowClear
                        placeholder="Efectivo / Débito / Crédito"
                        options={outAccounts.map((a) => ({
                            value: a.id,
                            label: `${a.name} (${a.type === 'credito' ? 'crédito' : a.type === 'debito' ? 'débito' : 'efectivo'}) — saldo ${formatCurrency(a.balance)}`,
                        }))}
                    />
                </Form.Item>
                <Form.Item
                    name="payment_frequency"
                    label="Abonos periódicos (opcional)"
                    extra="Con indicador de cuántos días faltan para cobrar"
                >
                    <Select
                        allowClear
                        placeholder="Sin periodo fijo"
                        options={[
                            { value: 'semanal', label: 'Semanal (cada 7 días)' },
                            { value: 'quincenal', label: 'Quincenal (cada 15 días)' },
                            { value: 'mensual', label: 'Mensual' },
                        ]}
                    />
                </Form.Item>
                <Form.Item name="comments" label="Comentarios (opcional)">
                    <Input.TextArea rows={2} placeholder="Ej. me lo prometió pagar en enero" />
                </Form.Item>
            </Form>
        </Modal>
    );
}
