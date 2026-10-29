import { useEffect, useState } from 'react';
import { DatePicker, Form, Input, InputNumber, Modal, Segmented, Select } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import type { Income, IncomeType } from '../types';

export interface IncomeFormValues {
    name: string;
    amount: number;
    income_type: IncomeType;
    frequency?: 'semanal' | 'quincenal' | 'mensual';
    next_pay_day?: number;
    received_at?: Dayjs;
}

interface Props {
    open: boolean;
    editing: Income | null;
    onCancel: () => void;
    onSubmit: (payload: Record<string, unknown>, editingId: number | null) => Promise<void>;
}

const typeLabels: Record<IncomeType, string> = {
    frecuente: 'Frecuente',
    unico: 'Único',
};

export default function IncomeModal({ open, editing, onCancel, onSubmit }: Props) {
    const [form] = Form.useForm<IncomeFormValues>();
    const [type, setType] = useState<IncomeType>('frecuente');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!open) return;
        if (editing) {
            form.setFieldsValue({
                name: editing.name,
                amount: Number(editing.amount),
                income_type: editing.income_type,
                frequency: editing.frequency ?? undefined,
                next_pay_day: editing.next_pay_day ?? undefined,
                received_at: editing.received_at ? dayjs(editing.received_at) : undefined,
            });
            setType(editing.income_type);
        } else {
            form.resetFields();
            setType('frecuente');
        }
    }, [open, editing, form]);

    const handleOk = async () => {
        const values = await form.validateFields();
        setSaving(true);
        try {
            const payload: Record<string, unknown> = {
                name: values.name,
                amount: values.amount,
                income_type: type,
            };
            if (type === 'frecuente') {
                Object.assign(payload, { frequency: values.frequency, next_pay_day: values.next_pay_day });
            } else {
                Object.assign(payload, {
                    received_at: values.received_at ? values.received_at.format('YYYY-MM-DD') : undefined,
                });
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
            title={editing ? 'Editar Ingreso' : 'Registrar Ingreso'}
            okText="Guardar Ingreso"
            cancelText="Cancelar"
            centered
            destroyOnClose
        >
            <Form form={form} layout="vertical" className="mt-4" requiredMark={false}>
                <Form.Item label="Tipo de ingreso" className="mb-4">
                    <Segmented
                        block
                        value={type}
                        onChange={(v) => setType(v as IncomeType)}
                        options={(Object.keys(typeLabels) as IncomeType[]).map((t) => ({
                            label: typeLabels[t],
                            value: t,
                        }))}
                    />
                </Form.Item>

                <Form.Item
                    name="name"
                    label="Nombre (Ej. Sueldo, Bono)"
                    rules={[{ required: true, message: 'Ingresa el nombre' }]}
                >
                    <Input placeholder="Ej. Sueldo" />
                </Form.Item>

                <Form.Item
                    name="amount"
                    label="Monto"
                    rules={[{ required: true, message: 'Ingresa el monto' }]}
                >
                    <InputNumber min={0.01} step={0.01} className="!w-full !text-success !font-semibold" placeholder="0.00" />
                </Form.Item>

                {type === 'frecuente' ? (
                    <div className="grid grid-cols-2 gap-4">
                        <Form.Item
                            name="frequency"
                            label="Frecuencia de Pago"
                            rules={[{ required: true, message: 'Selecciona' }]}
                        >
                            <Select
                                options={[
                                    { value: 'semanal', label: 'Semanal' },
                                    { value: 'quincenal', label: 'Quincenal' },
                                    { value: 'mensual', label: 'Mensual' },
                                ]}
                                placeholder="Selecciona"
                            />
                        </Form.Item>
                        <Form.Item
                            name="next_pay_day"
                            label="Día de Pago"
                            rules={[{ required: true, message: 'Día 1-28' }]}
                        >
                            <InputNumber min={1} max={28} className="!w-full" placeholder="1-28" />
                        </Form.Item>
                    </div>
                ) : (
                    <Form.Item
                        name="received_at"
                        label="Fecha en que se recibió"
                        rules={[{ required: true, message: 'Selecciona la fecha' }]}
                    >
                        <DatePicker className="!w-full" format="DD/MM/YYYY" />
                    </Form.Item>
                )}
            </Form>
        </Modal>
    );
}
