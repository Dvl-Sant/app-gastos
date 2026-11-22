import { useEffect, useState } from 'react';
import { Form, Input, InputNumber, Modal, Alert } from 'antd';
import type { SharedMemberRow, SharedGroup } from '../types';
import { formatCurrency } from '../utils/format';

export interface SharedPayFormValues {
    months: number;
    amount?: number;
    note?: string;
}

interface Props {
    open: boolean;
    member: SharedMemberRow | null;
    group: SharedGroup | null;
    onCancel: () => void;
    onSubmit: (values: { months: number; amount?: number; note?: string }) => Promise<void>;
}

/**
 * Registrar el pago de un miembro cubriendo N meses (incluye adelantados).
 * Cada mes cubierto queda registrado por separado y el total acredita a Efectivo.
 */
export default function SharedPayModal({ open, member, group, onCancel, onSubmit }: Props) {
    const [form] = Form.useForm<SharedPayFormValues>();
    const [months, setMonths] = useState(1);
    const [amount, setAmount] = useState<number | undefined>();
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const defaultCuota = group ? Number(group.member_cuota) : 0;
    const perMonth = amount ?? defaultCuota;

    useEffect(() => {
        if (!open) return;
        setError(null);
        setMonths(1);
        setAmount(group && Number(group.member_cuota) > 0 ? Number(group.member_cuota) : undefined);
        form.setFieldsValue({ months: 1, amount: defaultCuota || undefined, note: undefined });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, member, group]);

    const handleOk = async () => {
        const values = await form.validateFields();
        setSaving(true);
        setError(null);
        try {
            await onSubmit({ months: values.months, amount: values.amount, note: values.note });
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
            title={`Registrar pago — ${member?.name ?? ''}`}
            okText="Registrar Pago"
            cancelText="Cancelar"
            centered
            destroyOnClose
        >
            <Form form={form} layout="vertical" className="mt-4" requiredMark={false}>
                <Form.Item
                    name="months"
                    label="Meses a cubrir"
                    rules={[{ required: true, message: '¿Cuántos meses paga?' }]}
                    extra="Desde su primer periodo pendiente; los meses pagados por adelantado no se duplican"
                >
                    <InputNumber min={1} max={12} className="!w-full" onChange={(v) => setMonths(v ?? 1)} />
                </Form.Item>
                <Form.Item
                    name="amount"
                    label="Monto por mes"
                    rules={[{ required: true, message: 'Ingresa el monto por mes' }]}
                >
                    <InputNumber min={0.01} step={0.01} className="!w-full !text-success !font-semibold" onChange={(v) => setAmount(v ?? undefined)} />
                </Form.Item>
                <Form.Item name="note" label="Nota (opcional)">
                    <Input placeholder="Ej. pagó por OXXO" />
                </Form.Item>
                <Alert
                    type="info"
                    showIcon
                    message={`Cubre ${months} ${months === 1 ? 'mes' : 'meses'} desde su primer periodo pendiente`}
                    description={`Total a registrar: ${formatCurrency(perMonth * months)} — se acreditará a tu cuenta Efectivo.`}
                />
                {error && <Alert className="mt-3" type="error" showIcon message={error} />}
            </Form>
        </Modal>
    );
}
