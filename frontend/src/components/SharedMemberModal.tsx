import { useEffect, useState } from 'react';
import { Form, Input, Modal } from 'antd';
import type { SharedMemberRow } from '../types';

export interface SharedMemberFormValues {
    name: string;
    note?: string;
}

interface Props {
    open: boolean;
    editing: SharedMemberRow | null;
    onCancel: () => void;
    onSubmit: (values: SharedMemberFormValues) => Promise<void>;
}

/** Registrar/editar un miembro o invitado del grupo. */
export default function SharedMemberModal({ open, editing, onCancel, onSubmit }: Props) {
    const [form] = Form.useForm<SharedMemberFormValues>();
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!open) return;
        if (editing) {
            form.setFieldsValue({ name: editing.name, note: editing.note ?? undefined });
        } else {
            form.resetFields();
        }
    }, [open, editing, form]);

    const handleOk = async () => {
        const values = await form.validateFields();
        setSaving(true);
        try {
            await onSubmit({ name: values.name, note: values.note });
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
            title={editing ? `Editar Miembro — ${editing.name}` : 'Nuevo Miembro'}
            okText="Guardar"
            cancelText="Cancelar"
            centered
            destroyOnClose
        >
            <Form form={form} layout="vertical" className="mt-4" requiredMark={false}>
                <Form.Item
                    name="name"
                    label="Nombre del miembro"
                    rules={[{ required: true, message: 'Ingresa el nombre' }]}
                >
                    <Input placeholder="Ej. Ana, Carlos, Primo Luis" />
                </Form.Item>
                <Form.Item name="note" label="Nota (opcional)">
                    <Input placeholder="Ej. contacto, teléfono" />
                </Form.Item>
            </Form>
        </Modal>
    );
}
