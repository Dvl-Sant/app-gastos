import { useEffect, useState } from 'react';
import { Form, Input, InputNumber, Modal, Select } from 'antd';
import type { Account, AccountType } from '../types';

export interface AccountFormValues {
    name: string;
    type: AccountType;
    cut_off_day?: number;
    payment_due_day?: number;
    balance?: number;
    color?: string;
}

interface Props {
    open: boolean;
    editing: Account | null;
    onCancel: () => void;
    onSubmit: (payload: Record<string, unknown>, editingId: number | null) => Promise<void>;
}

const typeLabels: Record<AccountType, string> = {
    efectivo: 'Efectivo',
    debito: 'Débito',
    credito: 'Crédito',
};

export default function AccountModal({ open, editing, onCancel, onSubmit }: Props) {
    const [form] = Form.useForm<AccountFormValues>();
    const [type, setType] = useState<AccountType>('credito');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!open) return;
        if (editing) {
            form.setFieldsValue({
                name: editing.name,
                type: editing.type,
                cut_off_day: editing.cut_off_day ?? undefined,
                payment_due_day: editing.payment_due_day ?? undefined,
                balance: Number(editing.balance),
                color: editing.color ?? undefined,
            });
            setType(editing.type);
        } else {
            form.resetFields();
            setType('credito');
        }
    }, [open, editing, form]);

    const handleOk = async () => {
        const values = await form.validateFields();
        setSaving(true);
        try {
            const payload: Record<string, unknown> = {
                name: values.name,
                type,
                color: values.color ?? null,
            };
            if (type === 'credito') {
                Object.assign(payload, {
                    cut_off_day: values.cut_off_day,
                    payment_due_day: values.payment_due_day ?? null,
                });
            } else {
                Object.assign(payload, { balance: values.balance ?? 0 });
            }
            await onSubmit(payload, editing?.id ?? null);
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
            title={editing ? 'Editar Cuenta' : 'Nueva Cuenta / Tarjeta'}
            okText="Guardar"
            cancelText="Cancelar"
            centered
            destroyOnClose
        >
            <Form form={form} layout="vertical" className="mt-4" requiredMark={false}>
                <Form.Item label="Tipo de cuenta" className="mb-4">
                    <Select
                        value={type}
                        onChange={(v: AccountType) => setType(v)}
                        disabled={Boolean(editing)}
                        options={(Object.keys(typeLabels) as AccountType[]).map((t) => ({
                            value: t,
                            label: typeLabels[t],
                        }))}
                    />
                </Form.Item>

                <Form.Item
                    name="name"
                    label="Nombre (Ej. Banco Plata)"
                    rules={[{ required: true, message: 'Ingresa el nombre' }]}
                >
                    <Input placeholder="Ej. Tarjeta Plata" />
                </Form.Item>

                {type === 'credito' ? (
                    <div className="grid grid-cols-2 gap-4">
                        <Form.Item
                            name="cut_off_day"
                            label="Día de Corte"
                            rules={[{ required: true, message: 'Día 1-28' }]}
                            extra="Cierra el estado de cuenta este día"
                        >
                            <InputNumber min={1} max={28} className="!w-full" placeholder="1-28" />
                        </Form.Item>
                        <Form.Item
                            name="payment_due_day"
                            label="Día Límite de Pago"
                            rules={[{ required: true, message: 'Día 1-28' }]}
                            extra="Las mensualidades vencen este día"
                        >
                            <InputNumber min={1} max={28} className="!w-full" placeholder="1-28" />
                        </Form.Item>
                    </div>
                ) : (
                    <Form.Item name="balance" label="Saldo Actual" extra="Dinero disponible en esta cuenta">
                        <InputNumber min={0} step={0.01} className="!w-full" placeholder="0.00" />
                    </Form.Item>
                )}

                <Form.Item name="color" label="Color (opcional)">
                    <Input type="color" className="!w-20" />
                </Form.Item>
            </Form>
        </Modal>
    );
}
