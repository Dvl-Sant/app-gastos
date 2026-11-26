import { useEffect, useState } from 'react';
import { Alert, Form, Input, InputNumber, Modal, Select } from 'antd';
import type { Account } from '../types';
import { formatCurrency } from '../utils/format';

export interface TransferFormValues {
    from_account_id: number;
    to_account_id: number;
    amount: number;
    note?: string;
}

interface Props {
    open: boolean;
    accounts: Account[];
    onCancel: () => void;
    onSubmit: (values: { from_account_id: number; to_account_id: number; amount: number; note?: string }) => Promise<void>;
}

/** Traspaso libre entre dos cuentas propias. */
export default function TransferBetweenAccountsModal({ open, accounts, onCancel, onSubmit }: Props) {
    const [form] = Form.useForm<{ from_account_id: number; to_account_id: number; amount: number; note?: string }>();
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const options = accounts.map((a) => ({
        value: a.id,
        label: `${a.name} (${a.type === 'credito' ? 'crédito' : a.type === 'debito' ? 'débito' : 'efectivo'}) — ${formatCurrency(a.balance)}`,
    }));

    useEffect(() => {
        if (!open) return;
        setError(null);
        form.setFieldsValue({
            from_account_id: accounts.find((a) => a.type === 'efectivo')?.id,
            to_account_id: undefined,
            amount: undefined,
            note: undefined,
        });
    }, [open, accounts, form]);

    const handleOk = async () => {
        const values = await form.validateFields();
        if (values.from_account_id === values.to_account_id) {
            setError('El origen y el destino no pueden ser la misma cuenta');
            return;
        }
        setSaving(true);
        setError(null);
        try {
            await onSubmit(values);
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
            title="Traspaso entre cuentas"
            okText="Traspasar"
            cancelText="Cancelar"
            centered
            destroyOnClose
        >
            <Form form={form} layout="vertical" className="mt-4" requiredMark={false}>
                <Form.Item
                    name="from_account_id"
                    label="Sacar de"
                    rules={[{ required: true, message: 'Selecciona la cuenta de origen' }]}
                >
                    <Select options={options} placeholder="Cuenta de origen" />
                </Form.Item>
                <Form.Item
                    name="to_account_id"
                    label="Entrar a"
                    rules={[{ required: true, message: 'Selecciona la cuenta de destino' }]}
                >
                    <Select options={options} placeholder="Cuenta de destino" />
                </Form.Item>
                <Form.Item
                    name="amount"
                    label="Monto"
                    rules={[{ required: true, message: 'Ingresa el monto' }]}
                >
                    <InputNumber min={0.01} step={0.01} className="!w-full !font-semibold" placeholder="0.00" />
                </Form.Item>
                <Form.Item name="note" label="Nota (opcional)">
                    <Input placeholder="Ej. pasé el ingreso a mi débito" />
                </Form.Item>
                {error && <Alert type="error" showIcon message={error} />}
            </Form>
        </Modal>
    );
}
