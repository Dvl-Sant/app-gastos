import { useEffect } from 'react';
import { Form, Input, InputNumber, Modal } from 'antd';

export interface SavingsFormValues {
    total_amount: number;
    currency: string;
}

interface Props {
    open: boolean;
    current: { total_amount: string; currency: string } | null;
    onCancel: () => void;
    onSubmit: (values: SavingsFormValues) => Promise<void>;
}

export default function SavingsModal({ open, current, onCancel, onSubmit }: Props) {
    const [form] = Form.useForm<SavingsFormValues>();

    useEffect(() => {
        if (!open) return;
        form.setFieldsValue({
            total_amount: current ? Number(current.total_amount) : 0,
            currency: current?.currency ?? 'USD',
        });
    }, [open, current, form]);

    const handleOk = async () => {
        const values = await form.validateFields();
        await onSubmit({ ...values, currency: values.currency || 'USD' });
        form.resetFields();
    };

    return (
        <Modal
            open={open}
            onCancel={onCancel}
            onOk={handleOk}
            okText="Guardar Ahorros"
            cancelText="Cancelar"
            title="Actualizar Ahorros"
            centered
            destroyOnClose
        >
            <Form form={form} layout="vertical" className="mt-4" requiredMark={false}>
                <Form.Item
                    name="total_amount"
                    label="Monto Total"
                    rules={[{ required: true, message: 'Ingresa el monto' }]}
                >
                    <InputNumber min={0} step={0.01} className="!w-full" placeholder="0.00" />
                </Form.Item>
                <Form.Item name="currency" label="Moneda">
                    <Input maxLength={3} placeholder="USD" />
                </Form.Item>
            </Form>
        </Modal>
    );
}
