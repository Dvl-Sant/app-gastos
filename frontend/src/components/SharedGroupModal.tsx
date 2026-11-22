import { useEffect, useState } from 'react';
import { Form, Input, InputNumber, Modal } from 'antd';
import type { SharedGroup } from '../types';

export interface SharedGroupFormValues {
    name: string;
    member_cuota?: number;
    due_day?: number;
    total_cost?: number;
}

interface Props {
    open: boolean;
    editing: SharedGroup | null;
    onCancel: () => void;
    onSubmit: (payload: Record<string, unknown>, editingId: number | null) => Promise<void>;
}

/** Crear/editar un grupo compartido (ej. "Spotify Familiar"). */
export default function SharedGroupModal({ open, editing, onCancel, onSubmit }: Props) {
    const [form] = Form.useForm<SharedGroupFormValues>();
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!open) return;
        if (editing) {
            form.setFieldsValue({
                name: editing.name,
                member_cuota: Number(editing.member_cuota),
                due_day: editing.due_day ?? undefined,
                total_cost: editing.total_cost ? Number(editing.total_cost) : undefined,
            });
        } else {
            form.resetFields();
        }
    }, [open, editing, form]);

    const handleOk = async () => {
        const values = await form.validateFields();
        setSaving(true);
        try {
            await onSubmit(
                {
                    name: values.name,
                    member_cuota: values.member_cuota ?? 0,
                    due_day: values.due_day ?? null,
                    total_cost: values.total_cost ?? null,
                },
                editing?.id ?? null
            );
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
            title={editing ? 'Editar Grupo' : 'Nuevo Grupo Compartido'}
            okText="Guardar"
            cancelText="Cancelar"
            centered
            destroyOnClose
        >
            <Form form={form} layout="vertical" className="mt-4" requiredMark={false}>
                <Form.Item
                    name="name"
                    label="Nombre (Ej. Spotify Familiar)"
                    rules={[{ required: true, message: 'Ingresa el nombre' }]}
                >
                    <Input placeholder="Ej. Spotify Familiar" />
                </Form.Item>
                <div className="grid grid-cols-2 gap-4">
                    <Form.Item
                        name="member_cuota"
                        label="Cuota por miembro"
                        rules={[{ required: true, message: 'Ingresa la cuota' }]}
                    >
                        <InputNumber min={0} step={0.01} className="!w-full !text-success !font-semibold" placeholder="0.00" />
                    </Form.Item>
                    <Form.Item
                        name="due_day"
                        label="Día de cobro"
                        extra="Cuando se considera moroso"
                    >
                        <InputNumber min={1} max={28} className="!w-full" placeholder="1-28" />
                    </Form.Item>
                </div>
                <Form.Item
                    name="total_cost"
                    label="Costo total que pagas tú (opcional)"
                    extra="Para ver si recuperas el costo completo con las cuotas"
                >
                    <InputNumber min={0} step={0.01} className="!w-full" placeholder="0.00" />
                </Form.Item>
            </Form>
        </Modal>
    );
}
